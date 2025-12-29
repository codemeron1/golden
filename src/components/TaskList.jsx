import { useState } from 'react';
import { CheckSquare, Clock, Play, Edit2, Trash2, MoreVertical, CheckCircle2, Square } from 'lucide-react';
import { formatDurationShort, formatTime } from '../utils/timeUtils';
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

function SubTaskCard({ subTask }) {
  const [isChecked, setIsChecked] = useState(false);
  const { id, task_id, name, status, duration } = subTask || {};
  const [timerStarted, setTimerStarted] = useState(false);

  const handleStartTimer = () => {
    setTimerStarted(!timerStarted);
  };

  return (
    <div className={`group flex items-center justify-between p-2 px-3 bg-white border rounded-lg transition-all duration-200 cursor-pointer hover:bg-golden-300 hover:bg-opacity-10
    ${isChecked
        ? 'bg-gray-50 border-gray-200'
        : 'hover:border-green-100 border-gray-100 hover:shadow-sm'}`}>

      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {/* Checkbox */}
        <div className="relative">
          <input
            type="checkbox"
            id={`sub-task-${subTask?.id}`}
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            className="sr-only peer"
          />
          <label
            htmlFor={`sub-task-${subTask?.id}`}
            className="w-5 h-5 rounded-full border-2 border-golden-200 cursor-pointer flex items-center justify-center peer-checked:bg-golden-600 peer-checked:border-golden-600 transition-colors"
          >
            {isChecked && (
              <CheckCircle2 className="w-3 h-3 text-white" />
            )}
          </label>
        </div>
        {/* Sub-task Title */}
        <div className="min-w-0 flex-1">
          <label
            htmlFor={`task-${subTask?.id}`}
            className={`text-sm font-medium cursor-pointer truncate transition-all duration-300
        ${isChecked ? 'text-gray-400' : 'text-gray-700'}`}
          >
            {subTask?.name}
          </label>
        </div>
      </div>

      <div className="flex items-center space-x-4 ml-4">
        {/* Duration - Now on the same row */}
        <div className="flex items-center text-gray-400 text-[11px] font-medium tracking-wider">
          <Clock className="w-3 h-3 mr-1" />
          {
            // TODO : show actual timer if started
            timerStarted ? (duration ? duration : '0m') : (duration ? duration : '15m')
          }
        </div>

        {/* Compact Action Buttons */}
        <div className="flex items-center space-x-1.5">
          {!isChecked && (
            <button className={`flex items-center px-2.5 py-1 text-xs font-medium text-golden-600 bg-blue-50 hover:bg-golden-100 rounded-md transition-colors`}
              onClick={handleStartTimer}>
              {
                timerStarted ?
                  <>
                    <Square className="w-3 h-3 mr-1 fill-current" />
                    Stop
                  </>
                  :
                  <>
                    <Play className="w-3 h-3 mr-1 fill-current" />
                    {
                      duration ? 'Continue' : 'Start'
                    }
                  </>
              }

            </button>
          )}

          <button
            onClick={() => setIsChecked(!isChecked)}
            className={`flex items-center px-2.5 py-1 text-xs font-medium rounded-md transition-all
          ${isChecked
                ? 'text-green-600 bg-green-50'
                : 'text-gray-500 bg-gray-50 hover:bg-green-50 hover:text-green-600'}`}
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {isChecked ? 'Done' : 'Mark as Done'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskList({ tasks, project, onTaskSelect, onRefresh }) {
  const [showMenu, setShowMenu] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', status: 'active' });
  const handleEdit = (task) => {
    setEditingTask(task.id);
    setEditForm({
      name: task.name,
      description: task.description || '',
      status: task.status
    });
    setShowMenu(null);
  };

  const handleSaveEdit = async () => {
    try {
      await window.electronAPI.db.updateTask(editingTask, editForm);
      setEditingTask(null);
      onRefresh();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    setEditForm({ name: '', description: '', status: 'active' });
  };

  const handleDelete = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task? This will also delete all associated time entries.')) {
      try {
        await window.electronAPI.db.deleteTask(taskId);
        onRefresh();
        setShowMenu(null);
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const handleQuickStart = async (task) => {
    try {
      // End any running time entries first
      await window.electronAPI.db.endRunningTimeEntries();
      // Start new time entry for this task
      await window.electronAPI.db.startTimeEntry(task.id, '');
      onTaskSelect(task);
    } catch (error) {
      console.error('Error starting time entry:', error);
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      paused: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${statusStyles[status] || statusStyles.active}`}>
        {status}
      </span>
    );
  };

  const extractSubTasks = (taskDescription) => {
    const removeValues = ['<ol>', '<li>', '</ol>'];
    const regex = new RegExp(removeValues.join('|'), 'g');
    let taskArray = taskDescription.replace(regex, "").split("</li>");
    let taskArrayRemovedBlank = taskArray.filter((task) => task !== '');

    return taskArrayRemovedBlank;
  };

  return (
    <div className="space-y-6  border-t-8"
      style={{ borderColor: project.color }}>

      <header className="flex items-center justify-between p-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {project?.name} Tasks
          </h2>
          <p className="text-gray-600">{tasks.length} tasks</p>
        </div>
      </header>

      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <CheckSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
          <p className="text-gray-500 mb-6">
            Create your first task to start tracking time.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {
            tasks.map((task) => {
              const subTasks = task.sub_tasks ? JSON.parse(task.sub_tasks) : [];
              return (
                <div
                  key={task.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                >
                  {editingTask === task.id ? (
                    // Edit form
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Task Name
                        </label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-golden-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sub-Tasks
                        </label>
                        <ReactQuill
                          theme="snow"
                          value={editForm.description}
                          onChange={(value) => setEditForm({ ...editForm, description: value })}
                          placeholder="Start typing..."
                          modules={{
                            toolbar: [
                              [{ list: "ordered" }]
                            ],
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-golden-500"
                        >
                          <option value="active">Active</option>
                          <option value="completed">Completed</option>
                          <option value="paused">Paused</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>

                      <div className="flex justify-end space-x-2 pt-2">
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
                    // Task card
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {task.name}
                            </h3>
                            {getStatusBadge(task.status)}
                          </div>

                          {task?.description && (
                            <p>{task?.description}</p>
                          )}
                          {subTasks?.length > 0 && (
                            <div className='py-4 flex flex-col gap-2'>
                              {
                                subTasks.map((subTask, index) => <SubTaskCard key={index} subTask={subTask} />)
                              }
                            </div>
                          )}

                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{formatDurationShort(task.total_time)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <CheckSquare className="h-4 w-4" />
                              <span>{task.time_entry_count} entries</span>
                            </div>
                            <span>Created {formatTime(task.created_at)}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleQuickStart(task)}
                            className="flex items-center space-x-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md transition-colors"
                            title="Quick Start Timer"
                          >
                            <Play className="h-4 w-4" />
                            <span>Start</span>
                          </button>

                          <button
                            onClick={() => onTaskSelect(task)}
                            className="bg-golden-500 hover:bg-golden-600 text-white px-4 py-2 rounded-md transition-colors"
                          >
                            Track Time
                          </button>

                          <div className="relative">
                            <button
                              onClick={() => setShowMenu(showMenu === task.id ? null : task.id)}
                              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                            >
                              <MoreVertical className="h-4 w-4 text-gray-500" />
                            </button>

                            {showMenu === task.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                                <button
                                  onClick={() => handleEdit(task)}
                                  className="flex items-center space-x-2 w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50"
                                >
                                  <Edit2 className="h-4 w-4" />
                                  <span>Edit Task</span>
                                </button>
                                <button
                                  onClick={() => handleDelete(task.id)}
                                  className="flex items-center space-x-2 w-full px-4 py-2 text-left text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span>Delete Task</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
      {/* Click outside to close menu */}
      {
        showMenu && (
          <div
            className="fixed inset-0 z-0"
            onClick={() => setShowMenu(null)}
          />
        )
      }
    </div >
  );
}

export default TaskList;
