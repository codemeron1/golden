import React from 'react';
import { Plus } from 'lucide-react';
import TaskCard from './TaskCard';


const STATUS_THEMES = {
  todo: {
    title: 'To Do',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    badge: 'bg-slate-200 text-slate-800',
    border: 'border-slate-300',
  },
  'in-progress': {
    title: 'In Progress',
    bg: 'bg-blue-50/50',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-800',
    border: 'border-blue-200',
  },
  done: {
    title: 'Done',
    bg: 'bg-emerald-50/50',
    text: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-800',
    border: 'border-emerald-200',
  },
  terminated: {
    title: 'Terminated',
    bg: 'bg-rose-50/50',
    text: 'text-rose-700',
    badge: 'bg-rose-100 text-rose-800',
    border: 'border-rose-200',
  },
};

export default function TaskStatusColumn({ status = 'todo', tasks = [], onAddTask, onTaskDrop }) {
  const theme = STATUS_THEMES[status] || STATUS_THEMES.todo;

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId && onTaskDrop) {
      onTaskDrop(taskId, status);
    }
  };

  return (
    <div onDragOver={handleDragOver} onDrop={handleDrop} className={`flex flex-col w-full rounded-xl p-4 border ${theme.bg} ${theme.border} shadow-sm transition-colors duration-200`}>
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-dashed border-gray-300/60">
        <div className="flex items-center gap-2">
          {/* Status Dot */}
          <span className={`h-2.5 w-2.5 rounded-full ${theme.badge.split(' ')[1]}`} />
          <h3 className={`font-semibold text-sm tracking-wide uppercase ${theme.text}`}>
            {theme.title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Task Counter */}
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${theme.badge}`}>
            {tasks.length}
          </span>
          {/* Plus Button */}
          <button
            onClick={() => onAddTask(status)}
            className="p-1 rounded-full hover:bg-white/50 transition-colors"
            title="Add task"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tasks Container */}
      <div className="flex flex-col gap-3 min-h-[150px] overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center flex-1 border-2 border-dashed border-gray-200 rounded-lg p-6">
            <p className="text-xs text-gray-400 italic">No tasks yet</p>
          </div>
        ) : (
          tasks.map((task) => <TaskCard key={`task-${task.id}`} task={task} />)
        )}
      </div>
    </div>
  );
}