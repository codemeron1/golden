const { extractSubTasks } = require("../utils/golden");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");
const TaskService = require("./databaseServices/TaskService");
const ProjectService = require("./databaseServices/ProjectService");
const { DEVELOPMENT_MODE } = require("../constants/constants.js");

class DatabaseService {
  constructor() {
    try {
      let dbDir, dbPath;
      // production mode
      const userDataPath = app.getPath("userData");
      dbDir = path.join(userDataPath, "database");
      dbPath = path.join(dbDir, "timetracker.db");
      if (DEVELOPMENT_MODE == "development") {
        // development mode: database is in the project directory (src/database/timetracker.db)
        dbDir = path.join(__dirname, "../database");
        dbPath = path.join(dbDir, "timetracker.db");
      }

      // Ensure database directory exists
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      // Initialize database connection
      this.db = new Database(dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('busy_timeout = 3000');
      this.ProjectService = new ProjectService(this.db);
      this.TaskService = new TaskService(this.db);
      // Initialize tables
      this.initializeTables();
    } catch (error) {
      console.error("Error initializing database:", error);
      throw error;
    }
  }
  initializeTables() {
    // Create projects table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#f59e0b',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Create tasks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'todo',
        started_at DATETIME,
        ended_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )
    `);
    // create task_time_entries table
    this.db.exec(`
        CREATE TABLE IF NOT EXISTS task_time_entries (
          id INTEGER PRIMARY KEY,
          task_id INTEGER NOT NULL,
          started_at DATETIME NOT NULL,
          ended_at DATETIME,
          duration INTEGER, 
          notes TEXT,
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );
    `);
    // create tasks_connected_projects
    this.db.exec(`
        CREATE TABLE IF NOT EXISTS tasks_connected_projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            project_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            UNIQUE(task_id, project_id)
        );
    `);

    // migration or updates for tables
    // table task_time_entries: add status column sa task_time_entries: stopped; running; interrupted
    const columns = this.db
      .prepare("PRAGMA table_info(task_time_entries);")
      .all();
    if (!columns.find((col) => col.name === "status")) {
      this.db.exec(
        `ALTER TABLE task_time_entries ADD COLUMN status TEXT DEFAULT 'running';`,
      );
    }

    // drop unused tables
    this.db.exec(`
      DROP TABLE IF EXISTS sub_tasks;  
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks (project_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON time_entries (task_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON time_entries (start_time);
    `);
  }

  // Time entry methods
  startTimeEntry(taskId, description = "") {
    // End any running time entries for this task
    this.endRunningTimeEntries(taskId);

    const currentDateTime = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO time_entries (task_id, start_time, description)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(taskId, currentDateTime, description);
    return this.getTimeEntry(result.lastInsertRowid);
  }
  endTimeEntry(id) {
    const currentDateTime = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE time_entries 
      SET end_time = ?,
          duration = (strftime('%s', ?) - strftime('%s', start_time))
      WHERE id = ? AND end_time IS NULL
    `);
    stmt.run(currentDateTime, currentDateTime, id);
    return this.getTimeEntry(id);
  }
  //ends all time entries na walang data ang ended_at field
  endRunningTimeEntries() {
    try {
      const stmt = this.db.prepare(`
        UPDATE task_time_entries
        SET ended_at = ?, status = 'interrupted'
        WHERE ended_at IS NULL
      `);
      stmt.run(new Date().toISOString());
    } catch (error) {
      console.error("Error ending running time entries:", error);
    }
  }
  getTimeEntries(taskId = null, limit = 100) {
    let query = `
      SELECT te.*, t.name as task_name, p.name as project_name, p.color as project_color
      FROM time_entries te
      JOIN tasks t ON te.task_id = t.id
      JOIN projects p ON t.project_id = p.id
    `;

    if (taskId) {
      query += " WHERE te.task_id = ?";
    }

    query += " ORDER BY te.start_time DESC LIMIT ?";

    const stmt = this.db.prepare(query);
    return taskId ? stmt.all(taskId, limit) : stmt.all(limit);
  }
  getTimeEntry(id) {
    const stmt = this.db.prepare(`
      SELECT te.*, t.name as task_name, p.name as project_name, p.color as project_color
      FROM time_entries te
      JOIN tasks t ON te.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      WHERE te.id = ?
    `);
    return stmt.get(id);
  }
  getRunningTimeEntry() {
    const stmt = this.db.prepare(`
      SELECT te.*, t.name as task_name, p.name as project_name, p.color as project_color
      FROM time_entries te
      JOIN tasks t ON te.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      WHERE te.end_time IS NULL
      ORDER BY te.start_time DESC
      LIMIT 1
    `);
    return stmt.get();
  }
  updateTimeEntry(id, updates) {
    const fields = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = Object.values(updates);
    const stmt = this.db.prepare(`
      UPDATE time_entries 
      SET ${fields}
      WHERE id = ?
    `);
    stmt.run(...values, id);
    return this.getTimeEntry(id);
  }
  deleteTimeEntry(id) {
    const stmt = this.db.prepare("DELETE FROM time_entries WHERE id = ?");
    return stmt.run(id);
  }

  // Statistics methods
  getProjectStats(projectId, startDate = null, endDate = null) {
    let query = `
      SELECT 
        COUNT(DISTINCT t.id) as task_count,
        COUNT(te.id) as time_entry_count,
        COALESCE(SUM(te.duration), 0) as total_time,
        AVG(te.duration) as avg_time_per_entry
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      LEFT JOIN time_entries te ON t.id = te.task_id
      WHERE p.id = ?
    `;

    const params = [projectId];

    if (startDate) {
      query += " AND te.start_time >= ?";
      params.push(startDate);
    }

    if (endDate) {
      query += " AND te.start_time <= ?";
      params.push(endDate);
    }

    const stmt = this.db.prepare(query);
    return stmt.get(...params);
  }

  close() {
    this.db.close();
  }
}

module.exports = DatabaseService;
