import React, { useState } from 'react';
import { GripVertical, Play, Clock, Pause, Square } from 'lucide-react';
import { formatTime } from '../../utils/timeUtils';

const TaskCard = ({ task }) => {
  const [trackTimeStatus, setTrackTimeStatus] = useState('play');
  const [timeSpent, setTimeSpent] = useState('00:00');


  const handleDragStart = (e) => {
    e.dataTransfer.setData('taskId', task.id.toString());
  };

  const handleToggleTimer = async (e) => {
    e.preventDefault();
    switch (trackTimeStatus) {
      case 'play':
        setTrackTimeStatus('stop');
        window.electronAPI.db.saveTimeEntry(task);
        break;
      case 'stop':
        setTrackTimeStatus('play');
        window.electronAPI.db.updateTimeEntry(task);
        // compute the total duration spent: 00:00:00
        //get all the time entries
        const timeEntries = await window.electronAPI.db.getSpecificTaskTimeEntries(task.id);
        if (timeEntries !== null) {
          // computer duration
          let totalDuration = 0;
          timeEntries.forEach(entry => {
            if (entry.duration) {
              totalDuration += entry.duration;
            }
          });
          //convert duration to: 00:00:00
          const hours = Math.floor(totalDuration / 3600);
          const minutes = Math.floor((totalDuration % 3600) / 60);
          const seconds = totalDuration % 60;
          const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          setTimeSpent(formattedTime);
        }

        break;
    }
  };

  const renderTrackTimeStatusButton = () => {
    switch (trackTimeStatus) {
      case 'play':
        return <Play className="w-3 h-3 mr-1 fill-current" />
      case 'stop':
        return <Square className="w-3 h-3 mr-1 fill-current" />
    }
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-sm 
      hover:bg-gray-100 transition-shadow duration-200 cursor-grab 
      active:cursor-grabbing"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
        <div className='flex flex-col flex-1 min-w-0'>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-800 mb-1 truncate">{task.name}</h4>
            {task.description && (
              <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center text-[10px] text-gray-400">
              <Clock className="h-3 w-3 mr-1" />
              <span>{formatTime(task.created_at)}</span>
            </div>
            <button
              id='btnTrackTime'
              className={`flex items-center px-2.5 py-1 text-xs font-medium text-golden-600 bg-blue-50 hover:bg-golden-100 rounded-md transition-colors cursor-pointer`}
              onClick={handleToggleTimer}
            >
              {renderTrackTimeStatusButton()}
              <p>{timeSpent}</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskCard;