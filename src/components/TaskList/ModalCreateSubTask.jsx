import { useState } from 'react';
import { X } from 'lucide-react';

function ModalCreateSubTask({ task, onClose, onSubTaskCreated }) {
  const [subTask, setSubTask] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!subTask.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const subTaskData = {
        taskId: task.id,
        name: subTask
      }
      await window.electronAPI.db.createSubTask(subTaskData);
      onSubTaskCreated();
    } catch (error) {
      console.error('Error creating task:', error);
      alert("Failed to add new sub task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className='flex flex-row'>
            <h2 className="text-xl font-semibold text-gray-900">Create New Sub Task</h2>
           
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
              Sub Task <span className="text-red-500">*</span>
            </label>
            <textarea
              type="text"
              value={subTask}
              onChange={ (e) => setSubTask(e.target.value) }
              placeholder="Enter sub task"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-golden-500 focus:border-transparent"
              required
              autoFocus
            />
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
              disabled={isSubmitting}
              className="px-6 py-2 bg-golden-500 hover:bg-golden-600 disabled:bg-gray-400
                disabled:cursor-not-allowed text-white rounded-md transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Sub Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalCreateSubTask;
 