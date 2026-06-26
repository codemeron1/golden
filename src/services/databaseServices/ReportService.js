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

  getDashboardData(startDate, endDate, trendMode = 'daily') {
    try {
      // 1. Fetch total counts
      const totalProjects = this.db.prepare("SELECT COUNT(*) AS count FROM projects").get().count;
      const totalTasks = this.db.prepare("SELECT COUNT(*) AS count FROM tasks").get().count;

      // 2. Fetch all completed time entries within the date range
      const entriesQuery = `
        SELECT tte.id, tte.duration, tte.started_at, tte.ended_at, tte.task_id, 
               t.name AS task_name, t.category, t.billable, t.project_id, 
               p.name AS project_name, p.color AS project_color
        FROM task_time_entries tte
        JOIN tasks t ON tte.task_id = t.id
        JOIN projects p ON t.project_id = p.id
        WHERE tte.started_at >= ? AND tte.started_at <= ? AND tte.duration IS NOT NULL
        ORDER BY tte.started_at ASC
      `;
      const entries = this.db.prepare(entriesQuery).all(startDate, endDate);

      // 3. Calculate basic metrics
      let totalTime = 0;
      const projectTimes = {};
      const categoryTimes = {
        Development: 0,
        Design: 0,
        Meeting: 0,
        Planning: 0,
        Admin: 0,
        Marketing: 0
      };
      let billableTime = 0;
      let nonBillableTime = 0;

      entries.forEach(entry => {
        const dur = entry.duration || 0;
        totalTime += dur;

        // Top Projects aggregation
        if (!projectTimes[entry.project_id]) {
          projectTimes[entry.project_id] = {
            id: entry.project_id,
            name: entry.project_name,
            color: entry.project_color,
            duration: 0
          };
        }
        projectTimes[entry.project_id].duration += dur;

        // Task Breakdown by Category aggregation
        const category = entry.category || 'Development';
        if (categoryTimes[category] !== undefined) {
          categoryTimes[category] += dur;
        } else {
          categoryTimes[category] = dur;
        }

        // Billable vs Non-Billable
        if (entry.billable === 1) {
          billableTime += dur;
        } else {
          nonBillableTime += dur;
        }
      });

      // Format Top Projects
      const topProjects = Object.values(projectTimes)
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5);

      // Format Task Breakdown
      const taskBreakdown = Object.entries(categoryTimes).map(([category, duration]) => ({
        category,
        duration,
        percentage: totalTime > 0 ? Math.round((duration / totalTime) * 100) : 0
      })).sort((a, b) => b.duration - a.duration);

      // 4. Calculate Productivity Trends
      const trends = this.calculateTrends(entries, startDate, endDate, trendMode);

      // 5. Fetch Upcoming Deadlines
      const upcomingDeadlines = this.db.prepare(`
        SELECT t.id, t.name, t.due_date, p.name AS project_name, p.color AS project_color
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.due_date IS NOT NULL AND t.status != 'done' AND t.status != 'terminated'
        ORDER BY t.due_date ASC
        LIMIT 5
      `).all();

      // 6. Fetch Active/Running Timers
      const activeTimers = this.db.prepare(`
        SELECT tte.id, tte.started_at, tte.task_id, t.name AS task_name, p.name AS project_name, p.color AS project_color
        FROM task_time_entries tte
        JOIN tasks t ON tte.task_id = t.id
        JOIN projects p ON t.project_id = p.id
        WHERE tte.ended_at IS NULL
      `).all();

      // 7. Calculate Idle Alert
      const lastEndedEntry = this.db.prepare(`
        SELECT ended_at FROM task_time_entries 
        WHERE ended_at IS NOT NULL 
        ORDER BY ended_at DESC 
        LIMIT 1
      `).get();

      let idleAlert = false;
      let lastActivityTime = null;
      if (lastEndedEntry && lastEndedEntry.ended_at && activeTimers.length === 0) {
        lastActivityTime = lastEndedEntry.ended_at;
        const diffMs = Date.now() - new Date(lastActivityTime).getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        if (diffHours >= 2) {
          idleAlert = true;
        }
      }

      return {
        summary: {
          totalProjects,
          totalTasks,
          totalTime
        },
        topProjects,
        taskBreakdown,
        productivityTrends: trends,
        billableSummary: {
          billableTime,
          nonBillableTime
        },
        upcomingDeadlines,
        activeTimers,
        idleAlert,
        lastActivityTime
      };

    } catch (error) {
      console.error("Error generating dashboard data:", error);
      throw error;
    }
  }

  calculateTrends(entries, startDateStr, endDateStr, trendMode) {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const trendsMap = {};
    const labelsList = [];

    const formatDateKey = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const getWeekKey = (date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day;
      const startOfWeek = new Date(d.setDate(diff));
      return formatDateKey(startOfWeek);
    };

    const getMonthKey = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    };

    if (trendMode === 'daily') {
      const curr = new Date(start);
      while (curr <= end) {
        const key = formatDateKey(curr);
        trendsMap[key] = 0;
        const label = curr.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        labelsList.push({ key, label });
        curr.setDate(curr.getDate() + 1);
      }
    } else if (trendMode === 'weekly') {
      const curr = new Date(start);
      curr.setDate(curr.getDate() - curr.getDay());
      while (curr <= end) {
        const key = formatDateKey(curr);
        trendsMap[key] = 0;
        const label = "W/C " + curr.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        labelsList.push({ key, label });
        curr.setDate(curr.getDate() + 7);
      }
    } else if (trendMode === 'monthly') {
      const curr = new Date(start.getFullYear(), start.getMonth(), 1);
      while (curr <= end) {
        const key = getMonthKey(curr);
        trendsMap[key] = 0;
        const label = curr.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        labelsList.push({ key, label });
        curr.setMonth(curr.getMonth() + 1);
      }
    }

    entries.forEach(entry => {
      const entryDate = new Date(entry.started_at);
      let key;
      if (trendMode === 'daily') {
        key = formatDateKey(entryDate);
      } else if (trendMode === 'weekly') {
        key = getWeekKey(entryDate);
      } else if (trendMode === 'monthly') {
        key = getMonthKey(entryDate);
      }

      if (trendsMap[key] !== undefined) {
        trendsMap[key] += entry.duration || 0;
      }
    });

    return labelsList.map(item => ({
      label: item.label,
      hours: Number(((trendsMap[item.key] || 0) / 3600).toFixed(2))
    }));
  }

  exportTimeEntriesCSV(startDate, endDate) {
    try {
      const entriesQuery = `
        SELECT tte.id, tte.started_at, tte.ended_at, tte.duration, tte.notes AS description, 
               t.name AS task_name, t.category, t.billable, p.name AS project_name
        FROM task_time_entries tte
        JOIN tasks t ON tte.task_id = t.id
        JOIN projects p ON t.project_id = p.id
        WHERE tte.started_at >= ? AND tte.started_at <= ? AND tte.duration IS NOT NULL
        ORDER BY tte.started_at ASC
      `;
      const entries = this.db.prepare(entriesQuery).all(startDate, endDate);

      const headers = ["ID", "Project", "Task", "Category", "Billable", "Start Time", "End Time", "Duration (sec)", "Duration (hours)", "Description"];
      const rows = entries.map(e => [
        e.id,
        `"${e.project_name.replace(/"/g, '""')}"`,
        `"${e.task_name.replace(/"/g, '""')}"`,
        `"${e.category.replace(/"/g, '""')}"`,
        e.billable === 1 ? "Yes" : "No",
        e.started_at,
        e.ended_at,
        e.duration,
        (e.duration / 3600).toFixed(2),
        `"${(e.description || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      return csvContent;
    } catch (error) {
      console.error("Error generating CSV:", error);
      throw error;
    }
  }
}

module.exports = ReportService;
