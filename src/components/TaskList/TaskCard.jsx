import React from 'react';
import { GripVertical } from 'lucide-react';

const TaskCard = ({ task }) => {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('taskId', task.id.toString());
  };

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
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-800 mb-1 truncate">{task.name}</h4>
          {task.description && (
            <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default TaskCard;