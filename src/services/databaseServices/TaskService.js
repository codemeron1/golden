class TaskService {
  constructor(db) {
    this.db = db;
  }
  // Task methods
  createTask(taskData) {
    try {
      const { projectId, name, description, subTasks, status, connectedProjects } = taskData;
      //create task
      const stmt = this.db.prepare(`
      INSERT INTO tasks (project_id, name, description, status)
      VALUES (?, ?, ?, ?)
    `);
      const result = stmt.run(projectId, name, description, status);
      const taskId = result.lastInsertRowid;

      //insert connected projects into tasks_connected_projects
      if (connectedProjects && connectedProjects.length > 0) {
        const insertConnected = this.db.prepare(`
        INSERT OR IGNORE INTO tasks_connected_projects (task_id, project_id)
        VALUES (?, ?)
      `);
        const insertMany = this.db.transaction((taskId, projectIds) => {
          for (const pId of projectIds) {
            if (Number(pId) !== Number(projectId)) {
              insertConnected.run(taskId, pId);
            }
          }
        });
        insertMany(taskId, connectedProjects);
      }

      return true;
    } catch (error) {
      console.error("App Error creating task:", error);
      return false;
    }

  }
  getTasks(projectId = null) {
    let stmtTasksResults;

    if (projectId) {
      // Fetch tasks belonging to the project OR connected to it
      const queryTasks = `
        SELECT DISTINCT 
          t.*,
          p.name as primary_project_name,
          p.color as primary_project_color,
          CASE WHEN t.project_id = ? THEN 1 ELSE 0 END as is_primary
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        LEFT JOIN tasks_connected_projects tcp ON t.id = tcp.task_id
        WHERE t.project_id = ? OR tcp.project_id = ?
        ORDER BY t.created_at DESC
      `;
      const stmtTasks = this.db.prepare(queryTasks);
      stmtTasksResults = stmtTasks.all(projectId, projectId, projectId);
    } else {
      // Fallback: Fetch all tasks
      const queryTasks = `
        SELECT t.*, p.name as primary_project_name, p.color as primary_project_color, 1 as is_primary
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        ORDER BY t.created_at DESC
      `;
      const stmtTasks = this.db.prepare(queryTasks);
      stmtTasksResults = stmtTasks.all();
    }
    if (stmtTasksResults.length === 0) {
      return [];
    }
    // Prepare helper statements
    const stmtTimeEntries = this.db.prepare("SELECT * FROM task_time_entries WHERE task_id = ?");
    const stmtConnected = this.db.prepare(`
      SELECT p.* FROM projects p
      JOIN tasks_connected_projects tcp ON p.id = tcp.project_id
      WHERE tcp.task_id = ?
    `);
    // Populate child records for each task
    stmtTasksResults.forEach((task) => {
      task.timeEntries = stmtTimeEntries.all(task.id);
      task.connectedProjects = stmtConnected.all(task.id);
    });
    return stmtTasksResults;
  }
  getSpecificTask(id) {
    if (id === null || !id) return null;
    const queryTask = `
      SELECT t.*, p.name as primary_project_name, p.color as primary_project_color
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = ?
    `;
    const stmt = this.db.prepare(queryTask);
    const taskDetailsResult = stmt.get(id);
    if (taskDetailsResult) {
      // Get all connected projects
      const connectedProjectsStmt = this.db.prepare(`
        SELECT p.* FROM projects p
        JOIN tasks_connected_projects tcp ON p.id = tcp.project_id
        WHERE tcp.task_id = ?
      `);
      taskDetailsResult.connectedProjects = connectedProjectsStmt.all(id);
    }

    return taskDetailsResult;
  }
  updateTask(id, updates) {
    const fields = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = Object.values(updates);
    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET ${fields}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(...values, id);
    return this.getSpecificTask(id);
  }
  deleteTask(id) {
    const stmt = this.db.prepare("DELETE FROM tasks WHERE id = ?");
    return stmt.run(id);
  }
  // time entries
  getSpecificTaskTimeEntries(taskId) {
    try {
      const stmt = this.db.prepare(
        `SELECT *, notes AS description FROM task_time_entries WHERE task_id = ?`,
      );
      const result = stmt.all(taskId);
      return result;
    } catch (error) {
      console.error("Error fetching time entries for specific task:", error);
      return null;
    }
  }
  getSpecificTimeEntry(id) {
    try {
      const stmt = this.db.prepare(
        `SELECT * FROM task_time_entries WHERE id = ?`,
      );
      return stmt.get(id);
    } catch (error) {
      console.error("Error fetching time entry:", error);
      return null;
    }
  }
  saveTimeEntry(task) {
    try {
      const id = task.id;
      const startedAt = new Date().toISOString();
      const stmt = this.db.prepare(`
        INSERT INTO task_time_entries (task_id, started_at, status)
        VALUES (?, ?, ?)
      `);
      const result = stmt.run(id, startedAt, 'running');
      return this.getSpecificTimeEntry(result.lastInsertRowid);
    } catch (error) {
      console.error("Error saving time entry:", error);
      return null;
    }
  }
  updateTimeEntry(task) {
    try {
      const id = task.id;

      //get the record id and started_at of the entry that has no ended_at value
      const stmtGetRecord = this.db.prepare(`
        SELECT id, started_at FROM task_time_entries 
        WHERE task_id = ? AND ended_at IS NULL
        ORDER BY id DESC LIMIT 1
      `);
      const resultGetRecord = stmtGetRecord.get(id);

      if (!resultGetRecord) {
        console.warn("No running time entry found for task", id);
        return null;
      }

      const recordId = resultGetRecord.id;
      const startTime = resultGetRecord.started_at;
      const endTime = new Date().toISOString();

      const computeTimeInSeconds = (startTime, endTime) => {
        if (!startTime || !endTime) {
          console.warn("Missing startTime or endTime for duration calculation");
          return 0;
        }
        const start = new Date(startTime);
        const end = new Date(endTime);

        // Check if dates are valid
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          console.warn("Invalid date format:", { startTime, endTime });
          return 0;
        }

        const diff = end.getTime() - start.getTime();
        return Math.floor(diff / 1000);
      };

      let duration = computeTimeInSeconds(startTime, endTime);
      if (duration < 1) duration = 0;

      const stmt = this.db.prepare(`
        UPDATE task_time_entries 
        SET task_id = ?, ended_at = ?, duration = ?, status = 'stopped'
        WHERE id = ?
      `);
      stmt.run(id, endTime, duration, recordId);
      return this.getSpecificTimeEntry(recordId);

    } catch (error) {
      console.error("Error updating time entry:", error);
      return null;
    }
  }
  endRunningTimeEntries() {
    try {
      const stmt = this.db.prepare(`
        UPDATE task_time_entries
        SET ended_at = ?, status = 0
        WHERE status = 'running' OR ended_at IS NULL
      `);
      const currentTime = new Date().toISOString();
      return stmt.run(currentTime);
    } catch (error) {
      console.error("Error ending running time entries:", error);
    }
  }
  updateSpecificTimeEntry(id, updates) {
    try {
      const { started_at, ended_at, description } = updates;

      // Auto-compute duration in seconds if start and end times are provided
      let duration = null;
      if (started_at && ended_at) {
        const start = new Date(started_at).getTime();
        const end = new Date(ended_at).getTime();
        duration = Math.max(0, Math.floor((end - start) / 1000));
      }
      const stmt = this.db.prepare(`
        UPDATE task_time_entries
        SET started_at = ?, ended_at = ?, duration = ?, notes = ?
        WHERE id = ?
      `);
      stmt.run(started_at, ended_at, duration, description, id);
      return true;
    } catch (error) {
      console.error("Error updating specific task time entry:", error);
      return false;
    }
  }
  deleteSpecificTimeEntry(id) {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM task_time_entries WHERE id = ?
      `);
      stmt.run(id);
      return true;
    } catch (error) {
      console.error("Error deleting specific task time entry:", error);
      return false;
    }
  }
}

module.exports = TaskService;
