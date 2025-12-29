import { useState } from 'react';
import { Clock, CheckSquare, Edit2, Trash2, MoreVertical } from 'lucide-react';
import { formatDurationShort, formatShortDate } from '@/utils/timeUtils';
export default function ProjectCard({
  project,
  onProjectSelect
}) {
  const [showMenu, setShowMenu] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', color: '#f59e0b' });

  const handleEdit = (project) => {
    setEditingProject(project.id);
    setEditForm({
      name: project.name,
      description: project.description || '',
      color: project.color || '#f59e0b',
      created_at: project.created_at,
      updated_at: project.updated_at
    });
    setShowMenu(null);
  };
  const handleSaveEdit = async () => {
    try {
      await window.electronAPI.db.updateProject(editingProject, editForm);
      setEditingProject(null);
      onRefresh();
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };
  const handleCancelEdit = () => {
    setEditingProject(null);
    setEditForm({ name: '', description: '', color: '#f59e0b' });
  };
  const handleDelete = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project? This will also delete all associated tasks and time entries.')) {
      try {
        await window.electronAPI.db.deleteProject(projectId);
        onRefresh();
        setShowMenu(null);
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  const colorOptions = [
    '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6',
    '#f97316', '#06b6d4', '#84cc16', '#ec4899', '#6b7280'
  ];

  return (<>

    <div
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
    >
      {editingProject === project.id ? (
        // edit form
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Name
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
              Description
            </label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-golden-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  onClick={() => setEditForm({ ...editForm, color })}
                  className={`w-8 h-8 rounded-full border-2 ${editForm.color === color
                    ? 'border-gray-800 ring-2 ring-offset-2 ring-gray-400'
                    : 'border-gray-300'
                    }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
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
        // project card
        <>
          <div className="relative p-6">
            <div
              className="absolute left-0 top-0 w-full h-4 rounded-t-lg opacity-60"
              style={{ backgroundColor: project.color }}
            />
            <div className=" flex items-start justify-between mb-4">
              <div className="flex flex-col justify-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-0 pb-0">
                  {project.name}
                </h3>
                <h3 className="text-sm font-normal text-gray-600 pt-0 mt-0">
                  Date Started: {formatShortDate(project.created_at)}
                </h3>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowMenu(showMenu === project.id ? null : project.id)}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <MoreVertical className="h-4 w-4 text-gray-500" />
                </button>

                {showMenu === project.id && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                    <button
                      onClick={() => handleEdit(project)}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50"
                    >
                      <Edit2 className="h-4 w-4" />
                      <span>Edit Project</span>
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-left text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Project</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {project.description && (
              <p className="text-gray-600 text-sm mb-4">{project.description}</p>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <CheckSquare className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {project.task_count} tasks
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {formatDurationShort(project.total_time)}
                </span>
              </div>
            </div>

            <button
              onClick={() => onProjectSelect(project)}
              className="w-full bg-golden-500 hover:bg-golden-600 text-white py-2 px-4 mt-5 mb-2 rounded-md transition-colors"
            >
              View Tasks
            </button>

            <span className='py-2 text-sm text-gray-500'>Last update: {formatShortDate(project.updated_at)}</span>
          </div>
        </>
      )}
    </div>

    {/* Click outside to close menu */}
    {showMenu && (
      <div
        className="fixed inset-0 z-0"
        onClick={() => setShowMenu(null)}
      />
    )}
  </>
  )
}