import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ProjectList from './components/ProjectList';
import TaskList from './components/TaskList';
import TimeTracker from './components/TimeTracker';
import CreateProjectModal from './components/CreateProjectModal';
import CreateTaskModal from './components/CreateTaskModal';
import { Clock, FolderOpen, CheckSquare, Plus } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [runningEntry, setRunningEntry] = useState(null);

  // Load initial data
  useEffect(() => {
    loadProjects();
    loadRunningEntry();
  }, []);

  const loadProjects = async () => {
    try {
      const projectData = await window.electronAPI.db.getProjects();
      setProjects(projectData);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadTasks = async (projectId = null) => {
    try {
      const taskData = await window.electronAPI.db.getTasks(projectId);
      setTasks(taskData);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadRunningEntry = async () => {
    try {
      const entry = await window.electronAPI.db.getRunningTimeEntry();
      setRunningEntry(entry);
    } catch (error) {
      console.error('Error loading running entry:', error);
    }
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    setSelectedTask(null);
    setCurrentView('tasks');
    loadTasks(project.id);
  };

  const handleTaskSelect = (task) => {
    setSelectedTask(task);
    setCurrentView('tracker');
  };

  const handleProjectCreated = () => {
    loadProjects();
    setShowCreateProject(false);
  };

  const handleTaskCreated = () => {
    loadTasks(selectedProject?.id);
    setShowCreateTask(false);
  };

  const renderNavigation = () => (
    <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <h1 className="text-2xl font-bold text-golden-800 flex items-center gap-2">
            <Clock className="h-8 w-8" />
            Time Tracker
          </h1>
          
          <div className="flex space-x-4">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                currentView === 'dashboard'
                  ? 'bg-golden-100 text-golden-800'
                  : 'text-gray-600 hover:text-golden-700'
              }`}
            >
              <Clock className="h-4 w-4" />
              Dashboard
            </button>
            
            <button
              onClick={() => setCurrentView('projects')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                currentView === 'projects'
                  ? 'bg-golden-100 text-golden-800'
                  : 'text-gray-600 hover:text-golden-700'
              }`}
            >
              <FolderOpen className="h-4 w-4" />
              Projects
            </button>
            
            {selectedProject && (
              <button
                onClick={() => {
                  setCurrentView('tasks');
                  loadTasks(selectedProject.id);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  currentView === 'tasks'
                    ? 'bg-golden-100 text-golden-800'
                    : 'text-gray-600 hover:text-golden-700'
                }`}
              >
                <CheckSquare className="h-4 w-4" />
                {selectedProject.name} Tasks
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {currentView === 'projects' && (
            <button
              onClick={() => setShowCreateProject(true)}
              className="flex items-center gap-2 bg-golden-500 hover:bg-golden-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Project
            </button>
          )}
          
          {currentView === 'tasks' && selectedProject && (
            <button
              onClick={() => setShowCreateTask(true)}
              className="flex items-center gap-2 bg-golden-500 hover:bg-golden-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Task
            </button>
          )}
        </div>
      </div>
      
      {/* Breadcrumb */}
      {(selectedProject || selectedTask) && (
        <div className="mt-2 text-sm text-gray-500">
          <button
            onClick={() => setCurrentView('projects')}
            className="hover:text-golden-600"
          >
            Projects
          </button>
          {selectedProject && (
            <>
              <span className="mx-2">/</span>
              <button
                onClick={() => {
                  setCurrentView('tasks');
                  loadTasks(selectedProject.id);
                }}
                className="hover:text-golden-600"
              >
                {selectedProject.name}
              </button>
            </>
          )}
          {selectedTask && (
            <>
              <span className="mx-2">/</span>
              <span className="text-golden-600">{selectedTask.name}</span>
            </>
          )}
        </div>
      )}
    </nav>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            projects={projects}
            runningEntry={runningEntry}
            onProjectSelect={handleProjectSelect}
            onRefresh={loadProjects}
          />
        );
      case 'projects':
        return (
          <ProjectList
            projects={projects}
            onProjectSelect={handleProjectSelect}
            onRefresh={loadProjects}
          />
        );
      case 'tasks':
        return (
          <TaskList
            tasks={tasks}
            project={selectedProject}
            onTaskSelect={handleTaskSelect}
            onRefresh={() => loadTasks(selectedProject?.id)}
          />
        );
      case 'tracker':
        return (
          <TimeTracker
            task={selectedTask}
            runningEntry={runningEntry}
            onEntryUpdate={() => {
              loadRunningEntry();
              loadTasks(selectedProject?.id);
            }}
          />
        );
      default:
        return <Dashboard projects={projects} runningEntry={runningEntry} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {renderNavigation()}
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {renderContent()}
      </main>
      
      {/* Modals */}
      {showCreateProject && (
        <CreateProjectModal
          onClose={() => setShowCreateProject(false)}
          onProjectCreated={handleProjectCreated}
        />
      )}
      
      {showCreateTask && selectedProject && (
        <CreateTaskModal
          project={selectedProject}
          onClose={() => setShowCreateTask(false)}
          onTaskCreated={handleTaskCreated}
        />
      )}
    </div>
  );
}

export default App;
