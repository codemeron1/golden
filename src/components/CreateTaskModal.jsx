import { useState } from 'react';
import { X } from 'lucide-react';
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

function CreateTaskModal({ project, onClose, onTaskCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await window.electronAPI.db.createTask(
        project.id,
        formData.name.trim(),
        formData.description.trim()
      );
      onTaskCreated();
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const taskStatusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'paused', label: 'Paused' },
    { value: 'archived', label: 'Archived' }
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create New Task</h2>
            <p className="text-sm text-gray-600 mt-1">
              in <span className="font-medium">{project.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter task name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-golden-500 focus:border-transparent"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descriptionssssdsss
            </label>
            <ReactQuill
              theme="snow"
              value={formData.description}
              onChange={(value) => handleChange('description', value)}
              placeholder="Start typing..."
              modules={{
                toolbar: [
                  [{ list: "ordered" }]
                ],
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-golden-500 focus:border-transparent"
            >
              {
                taskStatusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))
              }
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.name.trim() || isSubmitting}
              className="px-6 py-2 bg-golden-500 hover:bg-golden-600 disabled:bg-gray-400 text-white rounded-md transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateTaskModal;
