import { useState, useEffect } from 'react';
import { GripVertical, Play, Clock, Square } from 'lucide-react';
import { formatTime, formatDuration } from '../../utils/timeUtils';
import { useTaskHistory } from '../../context/TaskHistoryContext';

const TaskCard = ({ task }) => {
  const { onOpenHistory, setTimeDuration } = useTaskHistory();
  const [trackTimeStatus, setTrackTimeStatus] = useState('play');
  const [timeSpent, setTimeSpent] = useState('00:00:00');
  const [activeStartTime, setActiveStartTime] = useState(null);
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(0)

  const handleDragStart = (e) => {
    e.dataTransfer.setData('taskId', task.id.toString());
  };
  const handleToggleTimer = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (trackTimeStatus === 'play') {
      // Start Tracking
      const now = Date.now();
      setTrackTimeStatus('stop');
      setActiveStartTime(now);
      await window.electronAPI.db.saveTimeEntry(task);
    } else {
      // Stop Tracking
      setTrackTimeStatus('play');
      await window.electronAPI.db.updateTimeEntry(task);

      // Sync accumulated time from DB records to ensure precision after stopping
      const updatedEntries = await window.electronAPI.db.getSpecificTaskTimeEntries(task.id);
      if (updatedEntries) {
        let total = 0;
        updatedEntries.forEach(entry => {
          if (entry.duration) total += entry.duration;
        });
        setAccumulatedSeconds(total);
        setTimeSpent(formatDuration(total));
      }
      setActiveStartTime(null);
    }
  };
  const renderTrackTimeStatusButton = () => {
    switch (trackTimeStatus) {
      case 'play':
        return <Play className="w-3 h-3 mr-1 fill-current" />
      case 'stop':
        return <Square className="w-3 h-3 mr-1 fill-current text-red-500" />
    }
  }
  const handleCardClick = (e) => {
    if (!e.target.closest('#btnTrackTime')) {
      onOpenHistory(task);
    }
  };
  useEffect(() => {
    // Load initial state and check for active running sessions
    const timeEntries = task.timeEntries || [];
    let total = 0;
    let runningEntry = null;

    timeEntries.forEach(entry => {
      if (entry.duration) {
        total += entry.duration;
      } else if (entry.started_at && !entry.ended_at) {
        runningEntry = entry;
      }
    });

    setAccumulatedSeconds(total);
    if (runningEntry) {
      setTrackTimeStatus('stop');
      setActiveStartTime(new Date(runningEntry.started_at).getTime());
    } else {
      setTimeSpent(formatDuration(total));
    }
  }, [task.id, task.timeEntries]);
  useEffect(() => {
    let interval;
    if (trackTimeStatus === 'stop' && activeStartTime) {
      interval = setInterval(() => {
        const elapsedSinceStart = Math.floor((Date.now() - activeStartTime) / 1000);
        setTimeSpent(formatDuration(accumulatedSeconds + elapsedSinceStart));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [trackTimeStatus, activeStartTime, accumulatedSeconds]);
  useEffect(() => {
    setTimeDuration(timeSpent);
  }, [timeSpent]);

  return (
    <div
      draggable={true}
      onDragStart={handleDragStart}
      onClick={handleCardClick}
      className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-sm hover:bg-gray-100 transition-shadow duration-200 cursor-pointer active:cursor-grabbing flex flex-col"
      title='Click to show task history log. Drag to move to specific status.'
    >
      {/* 1. Context Badge: If it's a connected/related task from another project */}
      {!task.is_primary && (
        <span 
          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border mb-1.5 self-start"
          style={{
            borderColor: task.primary_project_color || '#f59e0b',
            backgroundColor: `${task.primary_project_color || '#f59e0b'}1A`,
            color: task.primary_project_color || '#d97706'
          }}
        >
          📁 From: {task.primary_project_name}
        </span>
      )}

      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
        <div className='flex flex-col flex-1 min-w-0'>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-800 mb-1 truncate">{task.name}</h4>
            {task.description && (
              <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>
            )}
          </div>

          <div className="flex items-center justify-between mt-2.5 w-full">
            <div className="flex items-center text-[10px] text-gray-400">
              <Clock className="h-3 w-3 mr-1" />
              <span>{formatTime(task.created_at)}</span>
            </div>
            {
              task.status === 'in-progress' && (
                <button
                  id='btnTrackTime'
                  className={`flex items-center px-2.5 py-1 text-xs font-medium
                    ${trackTimeStatus === 'play'
                      ? 'text-golden-600 bg-blue-50 hover:bg-red-100'
                      : 'text-red-600 bg-red-50 hover:bg-golden-100'
                    } rounded-md transition-colors cursor-pointer`}
                  onClick={handleToggleTimer}
                >
                  {renderTrackTimeStatusButton()}
                  <p>{timeSpent}</p>
                </button>
              )
            }
          </div>
        </div>
      </div>
    </div>
  );

}

export default TaskCard;