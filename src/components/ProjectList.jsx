import { useState } from 'react';
import { FolderOpen, Clock, CheckSquare, Edit2, Trash2, MoreVertical } from 'lucide-react';

import ProjectCard from './ProjectList/ProjectCard.jsx';

function ProjectList({ projects, onProjectSelect, onRefresh }) {
  const [selectedProject, setSelectedProject] = useState(null);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
        <p className="text-gray-600">{projects.length} projects</p>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-500 mb-6">
            Create your first project to start tracking time on your tasks.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard 
              key={`project-cards-${project.id}`}
              project={project}
            />
          ))}
        </div>
      )}
      
      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(null)}
        />
      )}
    </div>
  );
}

export default ProjectList;
