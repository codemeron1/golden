class SubTaskService {
  constructor(db) {
    this.db = db;
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("busy_timeout = 2000");
  }

  createSubTask(subTaskData) {
    try {
      const { taskId, name } = subTaskData;
      const stmt = this.db.prepare(`
        INSERT INTO sub_tasks (task_id, name)
        VALUES (?, ?)
      `);
      const result = stmt.run(taskId, name);
      return result.lastInsertRowid;
    } catch (error) {
      console.error("Error creating sub-task:", error);
      return null;
    }
  }
  updateSubTask({ id, startTime, pausedAt, status, pauseDuration }) {
    try {
      const updateSubtaskTransaction = this.db.transaction(() => {
        const updateAt = new Date().toISOString();
        let stmt = null;
        switch (status) {
          case "running":
            console.log("is running...");
            console.log("pauseDuration: ", pauseDuration);
            if (pauseDuration === null) {
              console.log("first run....");
              stmt = this.db.prepare(`
                  UPDATE sub_tasks
                  SET started_at = ?,
                      updated_at = ?,
                      status = ?
                  WHERE id = ?
                `);
              return stmt.run(startTime, updateAt, status, id);
            } else {
              // continue
              console.log("contiue running..");
              stmt = this.db.prepare(`
                  UPDATE sub_tasks
                  SET updated_at = ?,
                      pause_started_at  = null,
                      status = ?,
                      total_paused_ms = ?
                  WHERE id = ?
                `);
              return stmt.run(updateAt, status, pauseDuration, id);
            }

          case "paused":
            stmt = this.db.prepare(`
                  UPDATE sub_tasks
                  SET pause_started_at = ?,
                      updated_at = ?,
                      status = ?
                  WHERE id = ?
                `);
            return stmt.run(pausedAt, updateAt, status, id);
        }
      });
      return updateSubtaskTransaction();
    } catch (error) {
      console.error("Error updating sub-task:", error);
      return null;
    }
  }
  subTaskMarkAsDone({ id, endedAt, pauseAt, pauseDuration, status }) {
    const now = new Date().toISOString();
    const markAsDoneTransaction = this.db.transaction(() => {
      const stmt = this.db.prepare(`
          UPDATE sub_tasks SET ended_at = ?, pause_started_at = ?, 
            total_paused_ms = ?, status = ?, updated_at = ?
          WHERE id = ?
        `);
      return stmt.run(endedAt, pauseAt, pauseDuration, status, now, id);
    });

    return markAsDoneTransaction();
  }
  getSubTask({ subTaskId }) {
    try {
      const stmt = this.db.prepare("SELECT * FROM sub_tasks WHERE id = ?");
      return stmt.get(subTaskId);
    } catch (error) {
      console.error("Error fetching sub-task:", error);
      return null;
    }
  }
  getSubTasks(taskId) {
    try {
      const stmt = this.db.prepare("SELECT * FROM sub_tasks WHERE task_id = ?");
      return stmt.all(taskId);
    } catch (error) {
      console.log("app error: ", error);
      return [];
    }
  }
  deleteSubTask(id) {
    try {
      const stmt = this.db.prepare("DELETE FROM sub_tasks WHERE id = ?");
      return stmt.run(id);
    } catch (error) {
      console.error("Error deleting sub-task:", error);
      return null;
    }
  }
}

module.exports = SubTaskService;
