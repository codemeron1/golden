const SubTaskService = require("./SubTaskService");
const { extractSubTasks } = require("../../utils/golden");

class TaskService {
  constructor(db) {
    this.db = db;
    this.SubTaskService = new SubTaskService(db);
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
    let query = `
              SELECT
                t.*,
                p.name AS project_name,
                p.color AS project_color,

                COALESCE(SUM(te.duration), 0) AS total_time,
                COUNT(DISTINCT te.id) AS time_entry_count,

                COALESCE(
                  json_group_array(
                    DISTINCT json_object(
                      'id', st.id,
                      'task_id', st.task_id,
                      'name', st.name,
                      'status', st.status,
                      'duration', st.duration,
                      'started_at', st.started_at,
                      'pause_started_at', st.pause_started_at,
                      'total_paused_ms',  st.total_paused_ms,
                      'created_at', st.created_at,
                      'updated_at', st.updated_at
                    )
                  ),
                  '[]'
                ) AS sub_tasks

              FROM tasks t
              JOIN projects p ON t.project_id = p.id
              LEFT JOIN time_entries te ON t.id = te.task_id
              LEFT JOIN sub_tasks st ON t.id = st.task_id
            `;

    const params = [];

    if (projectId) {
      query += ` WHERE t.project_id = ?`;
      params.push(projectId);
    }

    query += `
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;

    const stmt = this.db.prepare(query);
    return projectId ? stmt.all(projectId) : stmt.all();
  }

  getTask(id) {
    const stmt = this.db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = ?
    `);
    return stmt.get(id);
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
    return this.getTask(id);
  }

  deleteTask(id) {
    const stmt = this.db.prepare("DELETE FROM tasks WHERE id = ?");
    return stmt.run(id);
  }
};

module.exports = TaskService;
