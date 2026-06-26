class ReportService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Retrieves all time entries for a project's tasks within a given date range.
   * @param {number} projectId 
   * @param {string} startDate ISO date string
   * @param {string} endDate ISO date string
   */
  getProjectTimeReport(projectId, startDate, endDate) {
    try {
      const stmt = this.db.prepare(`
        SELECT tte.*, t.name AS task_name, p.color AS project_color
        FROM task_time_entries tte
        JOIN tasks t ON tte.task_id = t.id
        JOIN projects p ON t.project_id = p.id
        WHERE t.project_id = ? 
          AND tte.started_at >= ? 
          AND tte.started_at <= ?
          AND tte.duration IS NOT NULL
        ORDER BY tte.started_at ASC
      `);
      return stmt.all(projectId, startDate, endDate);
    } catch (error) {
      console.error("Error in getProjectTimeReport:", error);
      return [];
    }
  }

  /**
   * Retrieves summary statistics (total hours, entries count, distinct task count) 
   * for a project within a given date range.
   * @param {number} projectId 
   * @param {string} startDate ISO date string
   * @param {string} endDate ISO date string
   */
  getProjectTimeSummary(projectId, startDate, endDate) {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          COUNT(DISTINCT t.id) as task_count,
          COUNT(tte.id) as time_entry_count,
          COALESCE(SUM(tte.duration), 0) as total_time
        FROM tasks t
        LEFT JOIN task_time_entries tte ON t.id = tte.task_id
          AND tte.started_at >= ? 
          AND tte.started_at <= ?
          AND tte.duration IS NOT NULL
        WHERE t.project_id = ?
      `);
      // Note the parameter order: startDate, endDate, projectId because of LEFT JOIN condition and WHERE clause
      const result = stmt.get(startDate, endDate, projectId);
      return result || { task_count: 0, time_entry_count: 0, total_time: 0 };
    } catch (error) {
      console.error("Error in getProjectTimeSummary:", error);
      return { task_count: 0, time_entry_count: 0, total_time: 0 };
    }
  }
}

module.exports = ReportService;
