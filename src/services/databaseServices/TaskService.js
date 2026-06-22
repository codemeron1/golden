const SubTaskService = require("./SubTaskService");
const { extractSubTasks } = require("../../utils/golden");

class TaskService {
  constructor(db) {
    this.db = db;
    this.SubTaskService = new SubTaskService(db);
    this.tables = {
      tasks: "tasks",
      task_time_entries: "task_time_entries",
    };
  }
  // Task methods
  createTask(taskData) {
    const { projectId, name, description, subTasks, status } = taskData;
    //create task
    const stmt = this.db.prepare(`
      INSERT INTO tasks (project_id, name, description, status)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(projectId, name, description, status);
    const taskId = result.lastInsertRowid;

    //create subTasks
    const subTaskList = extractSubTasks(subTasks);
    subTaskList.forEach((subTaskName) => {
      this.SubTaskService.createSubTask({
        taskId: taskId,
        name: subTaskName,
      });
    });

    return true;
  }
  getTasks(projectId = null) {
    //get all the tasks
    let queryTasks = "SELECT * FROM tasks WHERE project_id = ?";
    const stmtTasks = this.db.prepare(queryTasks);
    const stmtTasksResults = stmtTasks.all(projectId);
    if (stmtTasksResults.length === 0) {
      return [];
    }

    //get all the time entries for each task
    let queryTimeEntries = "SELECT * FROM task_time_entries WHERE task_id = ?";
    const stmtTimeEntries = this.db.prepare(queryTimeEntries);
    stmtTasksResults.forEach((task) => {
      const stmtTimeEntriesResult = stmtTimeEntries.all(task.id);
      task.timeEntries = stmtTimeEntriesResult;
    });

    return stmtTasksResults;
  }
  getSpecificTask(id) {
    if (id === null || !id) return [];

    const taskDetailsStmt = this.db.prepare(`SELECT * FROM tasks WHERE id = ?`);
    const taskDetailsResult = taskDetailsStmt.get(id);
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
        `SELECT * FROM ${this.tables.task_time_entries} WHERE task_id = ?`,
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
        `SELECT * FROM ${this.tables.task_time_entries} WHERE id = ?`,
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
}

module.exports = TaskService;
