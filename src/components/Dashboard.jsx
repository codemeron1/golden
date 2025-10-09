import { useState, useEffect } from 'react';
import { Clock, FolderOpen, CheckSquare, Play, Pause } from 'lucide-react';
import { formatDuration, formatDurationShort, formatTime } from '../utils/timeUtils';

function Dashboard({ projects, runningEntry, onProjectSelect, onRefresh }) {
  const [timeEntries, setTimeEntries] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadRecentTimeEntries();
    
    // Update current time every second for running timer display
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const loadRecentTimeEntries = async () => {
    try {
      const entries = await window.electronAPI.db.getTimeEntries(null, 10);
      setTimeEntries(entries);
    } catch (error) {
      console.error('Error loading time entries:', error);
    }
  };

  const calculateRunningTime = () => {
    if (!runningEntry || !runningEntry.start_time) return 0;
    const startTime = new Date(runningEntry.start_time);
    return Math.floor((currentTime - startTime) / 1000);
  };

  const totalProjectTime = projects.reduce((sum, project) => sum + (project.total_time || 0), 0);
  const totalTasks = projects.reduce((sum, project) => sum + (project.task_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
            </div>
            <FolderOpen className="h-8 w-8 text-golden-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{totalTasks}</p>
            </div>
            <CheckSquare className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Time</p>
              <p className="text-2xl font-bold text-gray-900">{formatDurationShort(totalProjectTime)}</p>
            </div>
            <Clock className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {runningEntry ? 'Currently Tracking' : 'Status'}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {runningEntry ? formatDuration(calculateRunningTime()) : 'Idle'}
              </p>
            </div>
            {runningEntry ? (
              <Play className="h-8 w-8 text-red-500 animate-pulse" />
            ) : (
              <Pause className="h-8 w-8 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Currently Running Task */}
      {runningEntry && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-red-800">Currently Tracking</h3>
              <p className="text-red-700">
                <span className="font-medium">{runningEntry.project_name}</span> →{' '}
                <span className="font-medium">{runningEntry.task_name}</span>
              </p>
              <p className="text-sm text-red-600 mt-1">
                Started {formatTime(runningEntry.start_time)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-red-800">
                {formatDuration(calculateRunningTime())}
              </p>
              <Play className="h-6 w-6 text-red-500 animate-pulse mx-auto mt-2" />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects Overview */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
            <button
              onClick={onRefresh}
              className="text-golden-600 hover:text-golden-700 text-sm"
            >
              Refresh
            </button>
          </div>
          
          <div className="space-y-3">
            {projects.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No projects yet. Create your first project to get started!
              </p>
            ) : (
              projects.slice(0, 5).map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onProjectSelect(project)}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <div>
                      <p className="font-medium text-gray-900">{project.name}</p>
                      <p className="text-sm text-gray-500">{project.task_count} tasks</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatDurationShort(project.total_time)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Time Entries */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          
          <div className="space-y-3">
            {timeEntries.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No time entries yet. Start tracking time on your tasks!
              </p>
            ) : (
              timeEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry.project_color }}
                    />
                    <div>
                      <p className="font-medium text-gray-900">{entry.task_name}</p>
                      <p className="text-sm text-gray-500">
                        {entry.project_name} • {formatTime(entry.start_time)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {entry.end_time ? formatDurationShort(entry.duration) : 'Running...'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
