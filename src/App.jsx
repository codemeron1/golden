import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ProjectList from './components/ProjectList';
import TaskList from './components/TaskList';
import TimeTracker from './components/TimeTracker';
import CreateProjectModal from './components/CreateProjectModal';
import CreateTaskModal from './components/TaskList/CreateTaskModal';
import ProjectTimeReport from './components/Reports/ProjectTimeReport';
import { Clock, FolderOpen, CheckSquare, Plus, BarChart2, Palette } from 'lucide-react';
import { Toaster, toast } from 'sonner';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [runningEntry, setRunningEntry] = useState(null);
  const [activeTheme, setActiveTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [previewTheme, setPreviewTheme] = useState(null);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const THEME_OPTIONS = [
    { id: 'light', name: 'Light Mode', desc: 'Standard bright interface' },
    { id: 'trueblack', name: 'True Black', desc: 'OLED-friendly pure black' },
    { id: 'darkgray', name: 'Dark Gray', desc: 'Neutral dark gray background' },
    { id: 'bluishdark', name: 'Bluish Dark', desc: 'Navy blue-tinted dark surfaces' },
    { id: 'gradientdark', name: 'Gradient Dark', desc: 'Layered gradient blue to black' },
    { id: 'surfaceelevation', name: 'Surface Elevation', desc: 'Dark theme with lighter layers' },
    { id: 'semantictokens', name: 'Semantic Tokens', desc: 'High contrast accessible green' }
  ];

  useEffect(() => {
    localStorage.setItem('theme', activeTheme);
  }, [activeTheme]);

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

  const handleViewReport = (project) => {
    setSelectedProject(project);
    setCurrentView('report');
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
        <header className="flex items-center space-x-6">
          <h1 className="text-2xl font-bold text-golden-800 flex items-center gap-2">
            <Clock className="h-8 w-8" />
            Time Tracker
          </h1>

          <div className="flex space-x-4">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${currentView === 'dashboard'
                ? 'bg-golden-100 text-golden-800'
                : 'text-gray-600 hover:text-golden-700'
                }`}
            >
              <Clock className="h-4 w-4" />
              Dashboard
            </button>

            <button
              onClick={() => setCurrentView('projects')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${currentView === 'projects'
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
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${currentView === 'tasks'
                  ? 'bg-golden-100 text-golden-800'
                  : 'text-gray-600 hover:text-golden-700'
                  }`}
              >
                <CheckSquare className="h-4 w-4" />
                {selectedProject.name} Tasks
              </button>
            )}

            {selectedProject && (
              <button
                onClick={() => setCurrentView('report')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${currentView === 'report'
                  ? 'bg-golden-100 text-golden-800'
                  : 'text-gray-600 hover:text-golden-700'
                  }`}
              >
                <BarChart2 className="h-4 w-4" />
                Report
              </button>
            )}
          </div>
        </header>

        <div className="flex items-center space-x-3">
          {/* Theme Selector */}
          <div className="relative">
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors cursor-pointer"
              title="Change Display Mode"
            >
              <Palette className="h-4 w-4 text-amber-500" />
              <span>Theme: {THEME_OPTIONS.find(t => t.id === activeTheme)?.name || 'Light'}</span>
            </button>

            {showThemeMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => {
                    setShowThemeMenu(false);
                    setPreviewTheme(null);
                  }} 
                />
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-1 space-y-0.5">
                  <div className="px-3 py-1.5 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Choose Theme (Hover to Preview)
                  </div>
                  {THEME_OPTIONS.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => {
                        setActiveTheme(theme.id);
                        setPreviewTheme(null);
                        setShowThemeMenu(false);
                        toast.success(`Theme switched to ${theme.name}`);
                      }}
                      onMouseEnter={() => setPreviewTheme(theme.id)}
                      onMouseLeave={() => setPreviewTheme(null)}
                      className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 flex flex-col transition-colors cursor-pointer ${
                        activeTheme === theme.id ? 'bg-amber-50 text-amber-900 border-l-2 border-amber-500' : 'text-gray-700'
                      }`}
                    >
                      <span className="text-xs font-bold">{theme.name}</span>
                      <span className="text-[10px] text-gray-400 mt-0.5">{theme.desc}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
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
            onViewReport={handleViewReport}
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
      case 'report':
        return (
          <ProjectTimeReport
            project={selectedProject}
            onBack={() => {
              setCurrentView('projects');
            }}
          />
        );
      default:
        return <Dashboard projects={projects} runningEntry={runningEntry} />;
    }
  };

  return (
    <div className={`min-h-screen theme-container theme-${previewTheme || activeTheme}`}>
      <Toaster />

      {renderNavigation()}

      <main className="mx-auto p-2 bg-golden-100 h-[calc(100vh-4rem)] overflow-hidden">
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
          onSave={handleTaskCreated}
        />
      )}
    </div>
  );
}

export default App;
