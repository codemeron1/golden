import React, { useState, useEffect } from 'react';
import { X, Clock, CalendarDays, Activity, Timer } from 'lucide-react';
import {
  formatDuration,
  formatTime,
  formatTimeShort,
  formatRelativeTime,
  calculateDuration
} from '../../utils/timeUtils';
import { useTaskHistory } from '../../context/TaskHistoryContext';
import TaskHistorySidebarTimeEntryItem from "./TaskHistorySidebar/TaskHistorySidebarTimeEntryItem";

const STATUS_STYLES = {
  todo: { label: 'To Do', dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700' },
  'in-progress': { label: 'In Progress', dot: 'bg-blue-400', badge: 'bg-blue-100 text-blue-700' },
  done: { label: 'Done', dot: 'bg-emerald-400', badge: 'bg-emerald-100 text-emerald-700' },
  terminated: { label: 'Terminated', dot: 'bg-rose-400', badge: 'bg-rose-100 text-rose-700' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.todo;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function MetricRow({ icon: Icon, label, value, valueClass = '' }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="flex items-center gap-1.5 text-xs text-gray-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className={`text-xs font-medium text-gray-800 ${valueClass}`}>{value}</span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3 mt-4">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
      <div className="h-16 bg-gray-200 rounded mt-4" />
      <div className="h-8 bg-gray-200 rounded" />
      <div className="h-8 bg-gray-200 rounded" />
    </div>
  );
}

export default function TaskHistorySidebar({ task, onClose }) {
  const [taskDetails, setTaskDetails] = useState(null);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const { timeDuration } = useTaskHistory();

  const loadTaskData = async () => {
    try {
      if (task?.id) {
        setLoading(true);
        setTaskDetails(task);
        // get the task details
        const taskDetails = await window.electronAPI.db.getTask(task.id);
        setTaskDetails(taskDetails);
        //get the time entries
        const timeEntries = await window.electronAPI.db.getSpecificTaskTimeEntries(task.id);
        setTimeEntries(timeEntries);
        setLoading(false);
      }
    } catch (error) {
      console.error('App Error:', error);
    }
  }

  useEffect(() => {
    loadTaskData();
  }, [task?.id]);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-stretch justify-end z-50 -top-6"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-96 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 text-gray-700">
            <Activity className="h-4 w-4 text-blue-500" />
            <span className="font-semibold text-sm">Task History</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="px-5"><Skeleton /></div>
          ) : !taskDetails ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
              <Clock className="h-8 w-8" />
              <p className="text-sm">Could not load task details.</p>
            </div>
          ) : (
            <>
              {/* Task Info */}
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug">
                    {taskDetails.name}
                  </h3>
                  <StatusBadge status={taskDetails.status} />
                </div>
                {taskDetails.description && (
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {taskDetails.description}
                  </p>
                )}
              </div>

              {/* Metrics */}
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Metrics</p>

                {/* Total time highlight */}
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 mb-3">
                  <Timer className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-blue-400 uppercase tracking-wide">Total Time Spent</p>
                    <p className="text-lg font-bold text-blue-700 font-mono leading-tight">{timeDuration}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-[10px] text-blue-400">Entries</p>
                    <p className="text-lg font-bold text-blue-700">{timeEntries?.length ?? 0}</p>
                  </div>
                </div>

                <div className="space-y-0">
                  <MetricRow icon={CalendarDays} label="Created" value={formatTime(taskDetails.created_at)} />
                  {taskDetails.updated_at && (
                    <MetricRow icon={CalendarDays} label="Last updated" value={formatRelativeTime(taskDetails.updated_at)} />
                  )}
                  {taskDetails.total_allotted && (
                    <MetricRow icon={Clock} label="Time allotted" value={formatDuration(taskDetails.total_allotted)} valueClass="text-amber-600" />
                  )}
                </div>
              </div>

              {/* Status History */}
              {taskDetails.statusHistory?.length > 0 && (
                <div className="px-5 py-4 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Status History</p>
                  <div className="relative pl-3 border-l-2 border-gray-200 space-y-3">
                    {taskDetails.statusHistory.map((entry, i) => {
                      const s = STATUS_STYLES[entry.status] || STATUS_STYLES.todo;
                      return (
                        <div key={i} className="relative">
                          <span className={`absolute -left-[13px] h-2.5 w-2.5 rounded-full border-2 border-white ${s.dot}`} />
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${s.badge}`}>{s.label}</span>
                            <span className="text-[10px] text-gray-400">{formatTime(entry.timestamp)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Time Entries */}
              <div className="px-5 py-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Time Entries</p>
                {timeEntries?.length > 0 ? (
                  <ul className="space-y-2">
                    {timeEntries.map((entry, i) => {
                      return <TaskHistorySidebarTimeEntryItem
                        key={`history-task-time-entry-${i}`}
                        entry={entry}
                        index={i}
                        onRefresh={loadTaskData} />
                    })}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-gray-200 rounded-lg gap-1">
                    <Clock className="h-5 w-5 text-gray-300" />
                    <p className="text-xs text-gray-400">No time entries recorded</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
