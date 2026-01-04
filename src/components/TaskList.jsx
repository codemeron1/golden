import { useState } from 'react';
import { CheckSquare} from 'lucide-react';
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import TaskCard from './TaskList/TaskCard';

function TaskList({ tasks, project, onTaskSelect, onRefresh }) {
  const [showMenu, setShowMenu] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', status: 'active' });

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
  const extractSubTasks = (taskDescription) => {
    const removeValues = ['<ol>', '<li>', '</ol>'];
    const regex = new RegExp(removeValues.join('|'), 'g');
    let taskArray = taskDescription.replace(regex, "").split("</li>");
    let taskArrayRemovedBlank = taskArray.filter((task) => task !== '');

    return taskArrayRemovedBlank;
  };

  return (
    <div className="space-y-6  border-t-8 bg-white"
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
                  className="rounded-lg shadow-md hover:shadow-lg transition-shadow"
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
                    <TaskCard task={task} subTasks={subTasks} />
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
