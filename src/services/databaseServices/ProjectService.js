class ProjectService  {
    constructor(db) {
    this.db = db;
  }

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
}

module.exports = ProjectService;
