import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  BarChart2, 
  Table, 
  Clock, 
  Layers, 
  TrendingUp, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { formatDurationShort, formatTime, toLocalISOString } from '../../utils/timeUtils';
import { 
  groupTimeEntriesByDay, 
  groupTimeEntriesByWeek, 
  groupTimeEntriesByMonth 
} from '../../utils/reportUtils';
import BarChart from './BarChart';

export default function ProjectTimeReport({ project, onBack }) {
  // Date Range state (Local timezone YYYY-MM-DDTHH:MM)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // View states
  const [groupMode, setGroupMode] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [viewMode, setViewMode] = useState('chart'); // 'chart' | 'table'
  
  // Data states
  const [rawEntries, setRawEntries] = useState([]);
  const [summary, setSummary] = useState({ task_count: 0, time_entry_count: 0, total_time: 0 });
  const [loading, setLoading] = useState(true);

  // Initialize date filters to current month (1st of month at 00:00 to current time)
  useEffect(() => {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    
    setStartDate(toLocalISOString(firstOfMonth).slice(0, 16));
    setEndDate(toLocalISOString(now).slice(0, 16));
  }, []);

  // Fetch report data when project or dates change
  useEffect(() => {
    if (!project || !startDate || !endDate) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Convert local filter dates to UTC ISO strings for database query
        const queryStart = new Date(startDate).toISOString();
        const queryEnd = new Date(endDate).toISOString();
        
        // Parallel queries to DB
        const [entries, stats] = await Promise.all([
          window.electronAPI.db.getProjectTimeReport(project.id, queryStart, queryEnd),
          window.electronAPI.db.getProjectTimeSummary(project.id, queryStart, queryEnd)
        ]);

        setRawEntries(entries || []);
        setSummary(stats || { task_count: 0, time_entry_count: 0, total_time: 0 });
      } catch (error) {
        console.error('Error fetching project report data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [project.id, startDate, endDate]);

  // Pre-set Ranges triggers
  const applyPreset = (preset) => {
    const now = new Date();
    let start;
    let end = new Date();

    switch (preset) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        break;
      case 'this_week':
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
        start = new Date(now.setDate(diff));
        start.setHours(0, 0, 0, 0);
        break;
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        break;
      case 'last_30_days':
        start = new Date();
        start.setDate(now.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        return;
    }

    setStartDate(toLocalISOString(start).slice(0, 16));
    setEndDate(toLocalISOString(end).slice(0, 16));
  };

  // Group the data client-side based on the selected mode
  const getGroupedData = () => {
    if (!startDate || !endDate) return [];
    
    // We pass raw filter bounds (converted to Date objects) to group utilities
    const startObj = new Date(startDate);
    const endObj = new Date(endDate);

    if (groupMode === 'weekly') {
      return groupTimeEntriesByWeek(rawEntries, startObj, endObj);
    }
    if (groupMode === 'monthly') {
      return groupTimeEntriesByMonth(rawEntries, startObj, endObj);
    }
    return groupTimeEntriesByDay(rawEntries, startObj, endObj);
  };

  const groupedData = getGroupedData();

  // Helper stats computed from summary
  const totalHours = (summary.total_time / 3600).toFixed(2);
  const avgEntryDuration = summary.time_entry_count > 0 
    ? formatDurationShort(Math.round(summary.total_time / summary.time_entry_count)) 
    : '0m';

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto px-6 py-6 space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
            title="Back to Projects"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span 
                className="w-3.5 h-3.5 rounded-full inline-block border border-black/10"
                style={{ backgroundColor: project.color || '#f59e0b' }}
              />
              <h1 className="text-2xl font-bold text-slate-800">
                {project.name} Report
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Project time breakdown and history log
            </p>
          </div>
        </div>

        {/* Preset filters */}
        <div className="flex flex-wrap gap-1.5 bg-slate-200/60 p-1 rounded-lg border border-slate-200 self-start md:self-auto">
          <button 
            onClick={() => applyPreset('today')}
            className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-md hover:bg-slate-300/40 transition-all cursor-pointer"
          >
            Today
          </button>
          <button 
            onClick={() => applyPreset('this_week')}
            className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-md hover:bg-slate-300/40 transition-all cursor-pointer"
          >
            This Week
          </button>
          <button 
            onClick={() => applyPreset('this_month')}
            className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-md hover:bg-slate-300/40 transition-all cursor-pointer"
          >
            This Month
          </button>
          <button 
            onClick={() => applyPreset('last_30_days')}
            className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-md hover:bg-slate-300/40 transition-all cursor-pointer"
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Date filter & View controls card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Date Filter Inputs */}
        <div className="lg:col-span-6 flex flex-wrap sm:flex-nowrap items-center gap-3">
          <div className="w-full relative">
            <span className="absolute left-3 top-2.5 text-slate-400">
              <Calendar className="h-4 w-4" />
            </span>
            <input 
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-golden-500 transition-all"
            />
          </div>
          <span className="text-slate-400 text-sm font-medium self-center">to</span>
          <div className="w-full relative">
            <span className="absolute left-3 top-2.5 text-slate-400">
              <Calendar className="h-4 w-4" />
            </span>
            <input 
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-golden-500 transition-all"
            />
          </div>
        </div>

        {/* Grouping modes (Daily/Weekly/Monthly) */}
        <div className="lg:col-span-3 flex justify-start lg:justify-center">
          <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {['daily', 'weekly', 'monthly'].map((mode) => (
              <button
                key={mode}
                onClick={() => setGroupMode(mode)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer capitalize ${
                  groupMode === mode 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* View toggles (Chart / Table) */}
        <div className="lg:col-span-3 flex justify-end">
          <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'chart' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart2 className="h-3.5 w-3.5" />
              Chart
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'table' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Table className="h-3.5 w-3.5" />
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total hours */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-500">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Time</p>
            <h3 className="text-lg md:text-xl font-bold text-slate-800 mt-0.5">{totalHours}h</h3>
          </div>
        </div>

        {/* Tasks Count */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 rounded-lg text-blue-500">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Tasks</p>
            <h3 className="text-lg md:text-xl font-bold text-slate-800 mt-0.5">{summary.task_count}</h3>
          </div>
        </div>

        {/* Entries count */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-500">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Time Entries</p>
            <h3 className="text-lg md:text-xl font-bold text-slate-800 mt-0.5">{summary.time_entry_count}</h3>
          </div>
        </div>

        {/* Avg duration */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-50 rounded-lg text-purple-500">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Avg Session</p>
            <h3 className="text-lg md:text-xl font-bold text-slate-800 mt-0.5">{avgEntryDuration}</h3>
          </div>
        </div>
      </div>

      {/* Main visualization / report card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-[350px]">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 space-y-3">
            <div className="h-8 w-8 border-4 border-slate-200 border-t-golden-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Loading report data...</p>
          </div>
        ) : viewMode === 'chart' ? (
          // CHART VIEW
          <div className="p-5 flex-1 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">
                Time Spent Trend ({groupMode})
              </h2>
              <span className="text-xs text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                Hover bars for details
              </span>
            </div>
            <div className="flex-1 min-h-[260px] h-[280px]">
              <BarChart data={groupedData} color={project.color || '#3b82f6'} />
            </div>
          </div>
        ) : (
          // TABLE VIEW
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-800">
                All Time Log Entries
              </h2>
            </div>
            <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[450px]">
              {rawEntries.length === 0 ? (
                <div className="py-16 text-center">
                  <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 font-medium">
                    No time entries found for the selected range.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3 px-5">Task Name</th>
                      <th className="py-3 px-5">Started At</th>
                      <th className="py-3 px-5">Ended At</th>
                      <th className="py-3 px-5 text-right">Duration</th>
                      <th className="py-3 px-5">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {rawEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-5 font-semibold text-slate-800">
                          {entry.task_name || 'Untitled Task'}
                        </td>
                        <td className="py-3.5 px-5 text-slate-500">
                          {formatTime(entry.started_at)}
                        </td>
                        <td className="py-3.5 px-5 text-slate-500">
                          {entry.ended_at ? formatTime(entry.ended_at) : (
                            <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 animate-pulse border border-blue-100">
                              Running
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-semibold text-slate-900">
                          {formatDurationShort(entry.duration || 0)}
                        </td>
                        <td className="py-3.5 px-5 text-slate-500 truncate max-w-xs" title={entry.notes}>
                          {entry.notes || <span className="text-slate-300 italic">No notes</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
