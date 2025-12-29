import { useState } from 'react';
import { Clock, CheckSquare, Edit2, Trash2, MoreVertical } from 'lucide-react';
import { formatDurationShort } from '@/utils/timeUtils';
export default function ProjectList({
  project
}) {
  const [editingProject, setEditingProject] = useState(null);
  const [showMenu, setShowMenu] = useState(null);

  return (
    <div
      key={project.id}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
    >
      {editingProject === project.id ? (
        // Edit form
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
        // Project card
        <>
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <h3 className="text-lg font-semibold text-gray-900">
                  {project.name}
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
              className="w-full bg-golden-500 hover:bg-golden-600 text-white py-2 px-4 rounded-md transition-colors"
            >
              View Tasks
            </button>
          </div>
        </>
      )}
    </div>
  )
}