import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

function CreateTaskModal({ project, onClose, onTaskCreated }) {
  const subTaskQuillRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subTasks: '',
    status: 'todo',
    category: 'Development',
    billable: true,
    due_date: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const taskData = {
        projectId: project.id,
        name: formData.name.trim(),
        description: formData.description.trim(),
        subTasks: formData.subTasks.trim(),
        status: formData.status,
        category: formData.category,
        billable: formData.billable,
        due_date: formData.due_date || null
      }
      await window.electronAPI.db.createTask({ taskData: taskData });
      onTaskCreated();
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  const taskStatusOptions = [
    { value: 'todo', label: 'Todo' },
    { value: 'ongoing', label: 'Ongoing' },
    { value: 'completed', label: 'Completed' },
    { value: 'paused', label: 'Paused' },
    { value: 'archived', label: 'Archived' }
  ];
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (subTaskQuillRef.current) {
      const quill = subTaskQuillRef.current.getEditor();
      // Activate ordered list
      quill.format("list", "ordered");
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className='flex flex-row'>
            <h2 className="text-xl font-semibold text-gray-900">Create New Task</h2>
            <p className="pl-2 text-sm text-emerald-600 mt-1">
              for <span className="font-medium">{project.name}</span>
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
              Task Title <span className="text-red-500">*</span>
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
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Enter task description"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-golden-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sub Tasks
            </label>
            <ReactQuill
              ref={subTaskQuillRef}
              theme="snow"
              value={formData.subTasks}
              onChange={(value) => handleChange('subTasks', value)}
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
                  <option key={`status-option-${option.value}`} value={option.value}>{option.label}</option>
                ))
              }
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-golden-500 focus:border-transparent"
              >
                <option value="Development">Development</option>
                <option value="Design">Design</option>
                <option value="Meeting">Meeting</option>
                <option value="Planning">Planning</option>
                <option value="Admin">Admin</option>
                <option value="Marketing">Marketing</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => handleChange('due_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-golden-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="billable"
              checked={formData.billable}
              onChange={(e) => handleChange('billable', e.target.checked)}
              className="h-4 w-4 text-golden-500 focus:ring-golden-500 border-gray-300 rounded"
            />
            <label htmlFor="billable" className="ml-2 block text-sm text-gray-900 font-medium">
              Billable Task (Client Work)
            </label>
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
              className="px-6 py-2 bg-golden-500 hover:bg-golden-600 disabled:bg-gray-400
                disabled:cursor-not-allowed text-white rounded-md transition-colors"
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
