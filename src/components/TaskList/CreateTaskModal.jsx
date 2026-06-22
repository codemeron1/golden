import { useState, useRef, useEffect } from 'react';
import { X, Check, ChevronDown } from 'lucide-react';

export default function CreateTaskModal({ project, onClose, onSave, taskStatusToAdd = 'todo' }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subTasks: '',
    status: taskStatusToAdd,
    connectedProjects: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allProjects, setAllProjects] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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
        connectedProjects: formData.connectedProjects
      }
      await window.electronAPI.db.createTask({ taskData: taskData });
      onSave();
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleProject = (projectId) => {
    setFormData(prev => {
      const isSelected = prev.connectedProjects.includes(projectId);
      const connected = isSelected
        ? prev.connectedProjects.filter(id => id !== projectId)
        : [...prev.connectedProjects, projectId];
      return { ...prev, connectedProjects: connected };
    });
  };

  // Load all available projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const list = await window.electronAPI.db.getProjects();
        // Exclude the current task's primary project from the selectable list
        setAllProjects(list.filter(p => p.id !== project.id));
      } catch (err) {
        console.error('Error fetching projects:', err);
      }
    };
    fetchProjects();
  }, [project.id]);

  // Close dropdown if clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
            />
          </div>

          {/* Related/Connected Projects Selection */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Related Projects
            </label>

            {/* Dropdown trigger Button */}
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-left flex justify-between items-center bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <span className="text-gray-500 text-sm truncate">
                {formData.connectedProjects.length === 0
                  ? "Select related projects..."
                  : `${formData.connectedProjects.length} project(s) selected`}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {allProjects.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500 text-center">No other projects found</div>
                ) : (
                  allProjects.map((p) => {
                    const isSelected = formData.connectedProjects.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleProject(p.id)}
                        className="w-full text-left px-4 py-2 hover:bg-amber-50 flex items-center justify-between text-sm transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: p.color || '#f59e0b' }}
                          />
                          <span className="text-gray-700">{p.name}</span>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-amber-600" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
            {/* Selected Projects Badges / Chips */}
            {formData.connectedProjects.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.connectedProjects.map(id => {
                  const proj = allProjects.find(p => p.id === id);
                  if (!proj) return null;
                  return (
                    <div
                      key={id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border text-gray-700 shadow-sm"
                      style={{
                        borderColor: proj.color || '#f59e0b',
                        backgroundColor: `${proj.color || '#f59e0b'}1A` // 10% opacity color
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: proj.color || '#f59e0b' }}
                      />
                      <span>{proj.name}</span>
                      <button
                        type="button"
                        onClick={() => toggleProject(id)}
                        className="text-gray-400 hover:text-gray-600 ml-1 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
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
              {isSubmitting ? 'Creating...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
