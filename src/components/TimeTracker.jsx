import { useState, useEffect } from 'react';
import { Play, Pause, Square, Clock, Plus, Edit2, Trash2 } from 'lucide-react';
import { formatDuration, formatDurationShort, formatTime, formatTimeShort } from '../utils/timeUtils';

function TimeTracker({ task, runningEntry, onEntryUpdate }) {
  const [currentEntry, setCurrentEntry] = useState(null);
  const [timeEntries, setTimeEntries] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [description, setDescription] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState({ description: '', start_time: '', end_time: '' });

  useEffect(() => {
    if (task) {
      loadTimeEntries();
      checkCurrentEntry();
    }
    
    // Update current time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [task]);

  useEffect(() => {
    checkCurrentEntry();
  }, [runningEntry]);

  const loadTimeEntries = async () => {
    if (!task) return;
    
    try {
      const entries = await window.electronAPI.db.getTimeEntries(task.id, 50);
      setTimeEntries(entries);
    } catch (error) {
      console.error('Error loading time entries:', error);
    }
  };

  const checkCurrentEntry = () => {
    if (runningEntry && runningEntry.task_id === task?.id) {
      setCurrentEntry(runningEntry);
    } else {
      setCurrentEntry(null);
    }
  };

  const handleStart = async () => {
    try {
      // End any running entries first
      await window.electronAPI.db.endRunningTimeEntries();
      
      // Start new entry
      const entry = await window.electronAPI.db.startTimeEntry(task.id, description);
      setCurrentEntry(entry);
      setDescription('');
      onEntryUpdate();
      loadTimeEntries();
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  };

  const handlePause = async () => {
    if (!currentEntry) return;
    
    try {
      await window.electronAPI.db.endTimeEntry(currentEntry.id);
      setCurrentEntry(null);
      onEntryUpdate();
      loadTimeEntries();
    } catch (error) {
      console.error('Error pausing timer:', error);
    }
  };

  const handleStop = async () => {
    if (!currentEntry) return;
    
    try {
      await window.electronAPI.db.endTimeEntry(currentEntry.id);
      setCurrentEntry(null);
      onEntryUpdate();
      loadTimeEntries();
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  };

  const calculateCurrentDuration = () => {
    if (!currentEntry || !currentEntry.start_time) return 0;
    
    // Parse the start time properly
    const startTime = new Date(currentEntry.start_time);
    
    // Make sure we have valid dates
    if (isNaN(startTime.getTime()) || isNaN(currentTime.getTime())) {
      return 0;
    }
    
    // Calculate duration in seconds
    const durationMs = currentTime.getTime() - startTime.getTime();
    const durationSeconds = Math.floor(durationMs / 1000);
    
    // Return 0 if negative (shouldn't happen but safety check)
    return Math.max(0, durationSeconds);
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry.id);
    setEditForm({
      description: entry.description || '',
      start_time: entry.start_time ? new Date(entry.start_time).toISOString().slice(0, 16) : '',
      end_time: entry.end_time ? new Date(entry.end_time).toISOString().slice(0, 16) : ''
    });
  };

  const handleSaveEdit = async () => {
    try {
      const updates = {
        description: editForm.description,
        start_time: new Date(editForm.start_time).toISOString(),
        end_time: editForm.end_time ? new Date(editForm.end_time).toISOString() : null
      };
      
      // Calculate duration if both start and end times are provided
      if (updates.start_time && updates.end_time) {
        const duration = Math.floor((new Date(updates.end_time) - new Date(updates.start_time)) / 1000);
        updates.duration = duration;
      }
      
      await window.electronAPI.db.updateTimeEntry(editingEntry, updates);
      setEditingEntry(null);
      loadTimeEntries();
      onEntryUpdate();
    } catch (error) {
      console.error('Error updating time entry:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setEditForm({ description: '', start_time: '', end_time: '' });
  };

  const handleDelete = async (entryId) => {
    if (window.confirm('Are you sure you want to delete this time entry?')) {
      try {
        await window.electronAPI.db.deleteTimeEntry(entryId);
        loadTimeEntries();
        onEntryUpdate();
      } catch (error) {
        console.error('Error deleting time entry:', error);
      }
    }
  };

  if (!task) {
    return (
      <div className="text-center py-12">
        <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No task selected</h3>
        <p className="text-gray-500">Select a task to start tracking time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Task Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-3 mb-2">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: task.project_color }}
          />
          <h1 className="text-2xl font-bold text-gray-900">{task.name}</h1>
        </div>
        <p className="text-gray-600">{task.project_name}</p>
        {task.description && (
          <p className="text-gray-500 mt-2">{task.description}</p>
        )}
      </div>

      {/* Timer Control */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-6">
          <div className="text-6xl font-mono font-bold text-gray-900 mb-4">
            {currentEntry ? formatDuration(calculateCurrentDuration()) : '00:00:00'}
          </div>
          
          {currentEntry && (
            <p className="text-gray-500">
              Started at {formatTimeShort(currentEntry.start_time)}
            </p>
          )}
        </div>

        {!currentEntry ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What are you working on?"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-golden-500"
              />
            </div>
            
            <button
              onClick={handleStart}
              className="w-full flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 text-white py-4 px-6 rounded-lg text-lg font-semibold transition-colors"
            >
              <Play className="h-6 w-6" />
              <span>Start Timer</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {currentEntry.description && (
              <div className="text-center">
                <p className="text-gray-600 italic">"{currentEntry.description}"</p>
              </div>
            )}
            
            <div className="flex space-x-4">
              <button
                onClick={handlePause}
                className="flex-1 flex items-center justify-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
              >
                <Pause className="h-5 w-5" />
                <span>Pause</span>
              </button>
              
              <button
                onClick={handleStop}
                className="flex-1 flex items-center justify-center space-x-2 bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
              >
                <Square className="h-5 w-5" />
                <span>Stop</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Time Entries History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Time Entries</h2>
        
        {timeEntries.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No time entries yet. Start the timer to create your first entry!
          </p>
        ) : (
          <div className="space-y-3">
            {timeEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                {editingEntry === entry.id ? (
                  // Edit form
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-golden-500"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Time
                        </label>
                        <input
                          type="datetime-local"
                          value={editForm.start_time}
                          onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-golden-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Time
                        </label>
                        <input
                          type="datetime-local"
                          value={editForm.end_time}
                          onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-golden-500"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="px-4 py-2 bg-golden-500 hover:bg-golden-600 text-white rounded-md transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  // Entry display
                  <>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <p className="font-medium text-gray-900">
                          {entry.description || 'No description'}
                        </p>
                        {!entry.end_time && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Running
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatTime(entry.start_time)}
                        {entry.end_time && ` - ${formatTime(entry.end_time)}`}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className="font-semibold text-gray-900">
                        {entry.end_time ? formatDurationShort(entry.duration) : 'Running...'}
                      </span>
                      
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="p-2 text-gray-400 hover:text-golden-600 transition-colors"
                          title="Edit entry"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TimeTracker;
