import { useState, useEffect } from 'react';
import { Clock, FolderOpen, CheckSquare, Play, Square, Calendar, Download, AlertTriangle, CheckCircle2, ChevronRight, PlusCircle, LayoutDashboard } from 'lucide-react';
import { formatDuration, formatDurationShort, formatTime } from '../utils/timeUtils';
import { toast } from 'sonner';

function Dashboard({ projects, runningEntry, onProjectSelect, onRefresh }) {
  const getInitialDates = () => {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 30);
    return {
      startDate: past.toISOString().slice(0, 10),
      endDate: today.toISOString().slice(0, 10)
    };
  };

  const initialDates = getInitialDates();
  const [startDate, setStartDate] = useState(initialDates.startDate);
  const [endDate, setEndDate] = useState(initialDates.endDate);
  const [trendMode, setTrendMode] = useState('daily');
  const [dbData, setDbData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeEntries, setTimeEntries] = useState([]);

  const loadRecentTimeEntries = async () => {
    try {
      const entries = await window.electronAPI.db.getTimeEntries(null, 10);
      setTimeEntries(entries);
    } catch (error) {
      console.error('Error loading time entries:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const startISO = new Date(startDate + "T00:00:00.000Z").toISOString();
      const endISO = new Date(endDate + "T23:59:59.999Z").toISOString();
      const data = await window.electronAPI.db.getDashboardData(startISO, endISO, trendMode);
      setDbData(data);
      loadRecentTimeEntries();
      setLoading(false);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard statistics.");
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate, trendMode]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const calculateRunningTime = (startTimeStr) => {
    if (!startTimeStr) return 0;
    const startTime = new Date(startTimeStr);
    return Math.floor((currentTime - startTime) / 1000);
  };

  const handleStopTimer = async (id) => {
    try {
      await window.electronAPI.db.endTimeEntry(id);
      toast.success("Timer stopped successfully");
      fetchDashboardData();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to stop timer");
    }
  };

  const handleExportCSV = async () => {
    try {
      const startISO = new Date(startDate + "T00:00:00.000Z").toISOString();
      const endISO = new Date(endDate + "T23:59:59.999Z").toISOString();
      const result = await window.electronAPI.db.exportTimeEntriesCSV(startISO, endISO);
      if (result && result.success) {
        toast.success(`Exported successfully to: ${result.filePath}`);
      } else if (result && result.message) {
        toast.info(result.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Export failed.");
    }
  };

  const setPresetRange = (preset) => {
    const today = new Date();
    let start = new Date();
    if (preset === 'today') {
      start = new Date(today);
    } else if (preset === 'week') {
      const day = today.getDay();
      start.setDate(today.getDate() - day);
    } else if (preset === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(today.toISOString().slice(0, 10));
  };

  const getDeadlineStyle = (dueDateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { badge: 'bg-rose-50 text-rose-700 border-rose-200', text: `Overdue (${Math.abs(diffDays)}d)` };
    } else if (diffDays === 0) {
      return { badge: 'bg-orange-50 text-orange-700 border-orange-200', text: 'Due Today' };
    } else if (diffDays === 1) {
      return { badge: 'bg-amber-50 text-amber-700 border-amber-200', text: 'Due Tomorrow' };
    } else {
      return { badge: 'bg-gray-50 text-gray-600 border-gray-200', text: `${diffDays} days left` };
    }
  };

  const CATEGORY_COLORS = {
    Development: 'bg-blue-500',
    Design: 'bg-purple-500',
    Meeting: 'bg-amber-500',
    Planning: 'bg-emerald-500',
    Admin: 'bg-red-500',
    Marketing: 'bg-pink-500'
  };

  const renderProductivityChart = (trends) => {
    if (!trends || trends.length === 0) {
      return (
        <div className="flex items-center justify-center h-48 text-gray-400 text-xs italic">
          No trends data in this period.
        </div>
      );
    }

    const width = 500;
    const height = 200;
    const paddingX = 40;
    const paddingY = 25;

    const maxVal = Math.max(...trends.map(t => t.hours), 0);
    const maxY = maxVal > 0 ? maxVal * 1.15 : 4;

    const points = trends.map((t, i) => {
      const x = paddingX + (trends.length > 1 ? (i / (trends.length - 1)) * (width - 2 * paddingX) : 0);
      const y = height - paddingY - (t.hours / maxY) * (height - 2 * paddingY);
      return { x, y, label: t.label, hours: t.hours };
    });

    let linePath = "";
    let areaPath = "";

    if (points.length > 0) {
      if (points.length === 1) {
        linePath = `M ${points[0].x - 15} ${points[0].y} L ${points[0].x + 15} ${points[0].y}`;
        areaPath = `M ${points[0].x - 15} ${height - paddingY} L ${points[0].x - 15} ${points[0].y} L ${points[0].x + 15} ${points[0].y} L ${points[0].x + 15} ${height - paddingY} Z`;
      } else {
        linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
        areaPath = `M ${points[0].x} ${height - paddingY} ` + points.map(p => `L ${p.x} ${p.y}`).join(" ") + ` L ${points[points.length - 1].x} ${height - paddingY} Z`;
      }
    }

    const gridLines = [];
    const divisions = 4;
    for (let i = 0; i <= divisions; i++) {
      const val = (maxY / divisions) * i;
      const y = height - paddingY - (val / maxY) * (height - 2 * paddingY);
      gridLines.push({ y, value: val.toFixed(1) });
    }

    return (
      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0"/>
            </linearGradient>
          </defs>

          {gridLines.map((line, i) => (
            <g key={`grid-${i}`}>
              <line 
                x1={paddingX} 
                y1={line.y} 
                x2={width - paddingX} 
                y2={line.y} 
                stroke="#f3f4f6" 
                strokeWidth="1"
              />
              <text 
                x={paddingX - 8} 
                y={line.y + 3} 
                textAnchor="end" 
                className="text-[9px] font-medium fill-gray-400 font-mono"
              >
                {line.value}h
              </text>
            </g>
          ))}

          {areaPath && (
            <path 
              d={areaPath} 
              fill="url(#chartAreaGradient)"
            />
          )}

          {linePath && (
            <path 
              d={linePath} 
              fill="none" 
              stroke="#f59e0b" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          )}

          {points.map((p, i) => (
            <g key={`point-${i}`} className="group cursor-pointer">
              <circle 
                cx={p.x} 
                cy={p.y} 
                r="4" 
                fill="#ffffff" 
                stroke="#f59e0b" 
                strokeWidth="2.5"
                className="hover:r-5 transition-all duration-150"
              />
              <title>{`${p.label}: ${p.hours} hours`}</title>
            </g>
          ))}

          {points.map((p, i) => {
            const skipFactor = Math.ceil(points.length / 10);
            if (i % skipFactor !== 0 && i !== points.length - 1) return null;
            return (
              <text
                key={`x-label-${i}`}
                x={p.x}
                y={height - 5}
                textAnchor="middle"
                className="text-[9px] font-medium fill-gray-400 font-mono"
              >
                {p.label}
              </text>
            );
          })}
        </svg>
      </div>
    );
  };

  const renderActiveTimers = () => {
    if (!dbData || !dbData.activeTimers || dbData.activeTimers.length === 0) {
      return (
        <div className="bg-white border border-gray-100 rounded-lg p-4 flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <p className="text-xs text-gray-500 font-medium">No timers running currently. Ready to start logging!</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {dbData.activeTimers.map((timer) => {
          const elapsed = calculateRunningTime(timer.started_at);
          return (
            <div 
              key={timer.id}
              className="bg-gradient-to-r from-red-50 to-red-100/50 border border-red-200/60 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-red-900">{timer.task_name}</h4>
                  <p className="text-xs text-red-700 font-medium">
                    {timer.project_name} • Started at {new Date(timer.started_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 ml-6 md:ml-0">
                <span className="text-2xl font-bold text-red-800 font-mono tracking-tight">
                  {formatDuration(elapsed)}
                </span>
                <button
                  onClick={() => handleStopTimer(timer.id)}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-md p-1.5 transition-colors flex items-center justify-center cursor-pointer"
                  title="Stop timer"
                >
                  <Square className="h-4 w-4 fill-white" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-4 overflow-y-auto px-4 py-2 bg-gray-50 rounded-lg">
      {/* 1. Top Bar: Active Timers */}
      <section className="space-y-1.5">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Timers</h2>
        {renderActiveTimers()}
      </section>

      {/* 2. Filters Row */}
      <section className="bg-white border border-gray-100 rounded-lg p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-amber-500" />
          <h1 className="text-base font-bold text-gray-955">Productivity Dashboard</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Quick Presets */}
          <div className="flex border border-gray-200 rounded overflow-hidden bg-white">
            <button onClick={() => setPresetRange('today')} className="px-2.5 py-1.5 hover:bg-gray-50 border-r border-gray-200 font-medium text-gray-600 cursor-pointer">Today</button>
            <button onClick={() => setPresetRange('week')} className="px-2.5 py-1.5 hover:bg-gray-50 border-r border-gray-200 font-medium text-gray-600 cursor-pointer">This Week</button>
            <button onClick={() => setPresetRange('month')} className="px-2.5 py-1.5 hover:bg-gray-50 font-medium text-gray-600 cursor-pointer">This Month</button>
          </div>

          {/* Date range picker */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded px-2.5 py-1 text-gray-700">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              className="bg-transparent outline-none border-none text-xs w-28 focus:ring-0" 
            />
            <span className="text-gray-400">→</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              className="bg-transparent outline-none border-none text-xs w-28 focus:ring-0" 
            />
          </div>

          {/* Group mode selector */}
          <select
            value={trendMode}
            onChange={e => setTrendMode(e.target.value)}
            className="border border-gray-200 rounded px-2 py-1.5 bg-white font-medium text-gray-700 focus:outline-none"
          >
            <option value="daily">Daily Trends</option>
            <option value="weekly">Weekly Trends</option>
            <option value="monthly">Monthly Trends</option>
          </select>
        </div>
      </section>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      ) : !dbData ? (
        <div className="text-center py-20 text-gray-400">Failed to aggregate dashboard metrics.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* MIDDLE SECTION - Left 3 columns */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Summary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg border border-gray-100 p-5 shadow-sm border-l-4 border-amber-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Projects</p>
                    <p className="text-2xl font-bold text-gray-905 mt-1">{dbData.summary.totalProjects}</p>
                  </div>
                  <FolderOpen className="h-8 w-8 text-amber-500 bg-amber-50 rounded-lg p-1.5" />
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-100 p-5 shadow-sm border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Tasks</p>
                    <p className="text-2xl font-bold text-gray-905 mt-1">{dbData.summary.totalTasks}</p>
                  </div>
                  <CheckSquare className="h-8 w-8 text-blue-500 bg-blue-50 rounded-lg p-1.5" />
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-100 p-5 shadow-sm border-l-4 border-emerald-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Logged Hours</p>
                    <p className="text-2xl font-bold text-gray-905 mt-1">{formatDurationShort(dbData.summary.totalTime)}</p>
                  </div>
                  <Clock className="h-8 w-8 text-emerald-500 bg-emerald-50 rounded-lg p-1.5" />
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Productivity Trends */}
              <div className="bg-white rounded-lg border border-gray-100 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Productivity Trends</h3>
                  <span className="text-[10px] bg-amber-50 text-amber-700 font-medium px-2 py-0.5 rounded border border-amber-100">
                    {trendMode === 'daily' ? 'Daily' : trendMode === 'weekly' ? 'Weekly' : 'Monthly'}
                  </span>
                </div>
                {renderProductivityChart(dbData.productivityTrends)}
              </div>

              {/* Task Breakdown */}
              <div className="bg-white rounded-lg border border-gray-100 p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Category Breakdown</h3>
                <div className="space-y-3.5">
                  {dbData.taskBreakdown.length === 0 || dbData.summary.totalTime === 0 ? (
                    <div className="text-center text-gray-400 text-xs italic py-12">No categorized logs.</div>
                  ) : (
                    dbData.taskBreakdown.map((item) => (
                      <div key={item.category} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-gray-700">{item.category}</span>
                          <span className="text-gray-400 font-mono">
                            {formatDurationShort(item.duration)} ({item.percentage}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${CATEGORY_COLORS[item.category] || 'bg-gray-400'}`} 
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Bottom: Projects and Recent Activity Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Projects */}
              <div className="bg-white rounded-lg border border-gray-100 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Projects Overview</h3>
                  <button onClick={onRefresh} className="text-xs text-amber-600 hover:text-amber-700 font-semibold cursor-pointer">Refresh</button>
                </div>
                <div className="space-y-2">
                  {projects.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-8 italic">No projects found.</p>
                  ) : (
                    projects.slice(0, 5).map((project) => {
                      const stats = dbData.topProjects.find(p => p.id === project.id);
                      const time = stats ? stats.duration : 0;
                      return (
                        <div
                          key={project.id}
                          onClick={() => onProjectSelect(project)}
                          className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50/50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: project.color }} />
                            <div>
                              <p className="text-xs font-semibold text-gray-900">{project.name}</p>
                              <p className="text-[10px] text-gray-400">{project.task_count || 0} tasks</p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-gray-700 font-mono bg-gray-50 border border-gray-100 px-2 py-0.5 rounded">
                            {formatDurationShort(time)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Recent Activities */}
              <div className="bg-white rounded-lg border border-gray-100 p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Recent Activity</h3>
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {timeEntries.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-8 italic">No entries registered yet.</p>
                  ) : (
                    timeEntries.map((entry) => (
                      <div
                        key={`act-${entry.id}`}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100"
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.project_color }} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-900 truncate">{entry.task_name}</p>
                            <p className="text-[9px] text-gray-405 font-medium truncate">
                              {entry.project_name} • {formatTime(entry.start_time)}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-gray-600 font-mono flex-shrink-0">
                          {entry.end_time ? formatDurationShort(entry.duration) : 'Running...'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* SIDEBAR - Right 1 column */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Idle Warning / Alert */}
            {dbData.idleAlert ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2.5 shadow-sm animate-pulse">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-red-900 uppercase tracking-wide">Idle Alert</h4>
                  <p className="text-[11px] text-red-700 mt-1 leading-relaxed font-medium">
                    No activity tracked in the last 2 hours. Start a timer to log your focus!
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex items-start gap-2.5 shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">Active Session</h4>
                  <p className="text-[11px] text-emerald-700 mt-1 leading-relaxed font-medium">
                    Tracking active! Keep going to maintain your streaks.
                  </p>
                </div>
              </div>
            )}

            {/* Billable vs Non-Billable Summary */}
            <div className="bg-white rounded-lg border border-gray-100 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Billability Ratio</h3>
              {dbData.summary.totalTime === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-6">No hours logged.</p>
              ) : (
                (() => {
                  const billableSec = dbData.billableSummary.billableTime;
                  const nonBillableSec = dbData.billableSummary.nonBillableTime;
                  const totalSec = billableSec + nonBillableSec;
                  const billablePercent = totalSec > 0 ? Math.round((billableSec / totalSec) * 100) : 0;
                  const nonBillablePercent = totalSec > 0 ? (100 - billablePercent) : 0;
                  return (
                    <div className="space-y-3.5">
                      <div className="h-3 w-full flex rounded-full overflow-hidden bg-gray-100">
                        {billablePercent > 0 && (
                          <div 
                            className="bg-emerald-500 h-full transition-all duration-300" 
                            style={{ width: `${billablePercent}%` }} 
                            title={`Billable: ${billablePercent}%`} 
                          />
                        )}
                        {nonBillablePercent > 0 && (
                          <div 
                            className="bg-gray-300 h-full transition-all duration-300" 
                            style={{ width: `${nonBillablePercent}%` }} 
                            title={`Non-Billable: ${nonBillablePercent}%`} 
                          />
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span className="font-semibold text-gray-600">Client Work</span>
                          </div>
                          <p className="text-gray-900 font-bold font-mono mt-0.5">{formatDurationShort(billableSec)} ({billablePercent}%)</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-gray-300" />
                            <span className="font-semibold text-gray-600">Internal/Admin</span>
                          </div>
                          <p className="text-gray-900 font-bold font-mono mt-0.5">{formatDurationShort(nonBillableSec)} ({nonBillablePercent}%)</p>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Upcoming Deadlines */}
            <div className="bg-white rounded-lg border border-gray-100 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Upcoming Deadlines</h3>
              <div className="space-y-3">
                {dbData.upcomingDeadlines.length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-6">No deadlines found.</p>
                ) : (
                  dbData.upcomingDeadlines.map((task) => {
                    const style = getDeadlineStyle(task.due_date);
                    return (
                      <div key={`dl-${task.id}`} className="space-y-1 pb-2 border-b border-gray-50 last:border-0 last:pb-0">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs font-semibold text-gray-900 line-clamp-1">{task.name}</h4>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${style.badge}`}>
                            {style.text}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium">
                          {task.project_name} • Due: {new Date(task.due_date).toLocaleDateString([], {month: 'short', day: 'numeric'})}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Exports & Reports Shortcuts */}
            <div className="bg-white rounded-lg border border-gray-100 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Shortcuts & Reports</h3>
              <button
                onClick={handleExportCSV}
                className="w-full flex items-center justify-between p-2.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-100 rounded-md transition-colors font-medium text-left cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Export Time Entries (CSV)
                </span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
