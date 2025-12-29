const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const { app } = require('electron');

class DatabaseService {
  constructor() {
    try {
      // For testing: Create database in the user data directory
      const dbDir = path.join(__dirname, '../database');
      const dbPath = path.join(dbDir, 'timetracker.db');

      //production
      // const userDataPath = app.getPath("userData");
      // const dbDir = path.join(userDataPath, "database");
      // const dbPath = path.join(dbDir, "timetracker.db");

      // Ensure database directory exists
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      console.log("Database path:", dbPath);
      this.db = new Database(dbPath);
      this.initializeTables();
      console.log("Database initialized successfully");
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
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )
    `);

    // Create time_entries table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        duration INTEGER DEFAULT 0,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks (project_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON time_entries (task_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON time_entries (start_time);
    `);
  }

  // Project methods
  createProject(name, description = "", color = "#f59e0b") {
    const stmt = this.db.prepare(`
      INSERT INTO projects (name, description, color)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(name, description, color);
    return this.getProject(result.lastInsertRowid);
  }

  getProjects() {
    const stmt = this.db.prepare(`
      SELECT p.*, 
             COUNT(t.id) as task_count,
             COALESCE(SUM(te.duration), 0) as total_time
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      LEFT JOIN time_entries te ON t.id = te.task_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    return stmt.all();
  }

  getProject(id) {
    const stmt = this.db.prepare("SELECT * FROM projects WHERE id = ?");
    return stmt.get(id);
  }

  updateProject(id, updates) {
    const fields = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = Object.values(updates);
    const stmt = this.db.prepare(`
      UPDATE projects 
      SET ${fields}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(...values, id);
    return this.getProject(id);
  }

  deleteProject(id) {
    const stmt = this.db.prepare("DELETE FROM projects WHERE id = ?");
    return stmt.run(id);
  }

  // Task methods
  createTask(projectId, name, description = "") {
    const stmt = this.db.prepare(`
      INSERT INTO tasks (project_id, name, description)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(projectId, name, description);
    return this.getTask(result.lastInsertRowid);
  }

  getTasks(projectId = null) {
    let query = `
      SELECT t.*, p.name as project_name, p.color as project_color,
             COALESCE(SUM(te.duration), 0) as total_time,
             COUNT(te.id) as time_entry_count
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN time_entries te ON t.id = te.task_id
    `;

    if (projectId) {
      query += " WHERE t.project_id = ?";
    }

    query += " GROUP BY t.id ORDER BY t.created_at DESC";

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

  endRunningTimeEntries(taskId = null) {
    const currentDateTime = new Date().toISOString();
    let query = `
      UPDATE time_entries 
      SET end_time = ?,
          duration = (strftime('%s', ?) - strftime('%s', start_time))
      WHERE end_time IS NULL
    `;

    if (taskId) {
      query += " AND task_id = ?";
      const stmt = this.db.prepare(query);
      return stmt.run(currentDateTime, currentDateTime, taskId);
    } else {
      const stmt = this.db.prepare(query);
      return stmt.run(currentDateTime, currentDateTime);
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
