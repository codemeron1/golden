import { useState } from 'react';
import { FolderOpen, Clock, CheckSquare, Edit2, Trash2, MoreVertical } from 'lucide-react';

import ProjectCard from './ProjectList/ProjectCard.jsx';

function ProjectList({ projects, onProjectSelect, onRefresh }) {
  const [selectedProject, setSelectedProject] = useState(null);

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
              onProjectSelect={onProjectSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ProjectList;
