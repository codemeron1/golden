import { useState } from 'react';
import { CheckSquare } from 'lucide-react';
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import TaskCard from './TaskList/TaskCardOld';
import TaskStatusColumn from './TaskList/TaskStatusColumn';
import CreateTaskModal from './TaskList/CreateTaskModal';

function TaskList({ tasks, project, onTaskSelect, onRefresh }) {
  const [showMenu, setShowMenu] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', status: 'active' });
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [taskStatusToAdd, setTaskStatusToAdd] = useState('');

  const taskStatuses = [
    { label: "todo" },
    { label: "in-progress" },
    { label: "done" },
    { label: "terminated" },
  ]
  const handleAddTask = (taskStatus) => {
    setShowCreateTaskModal(true);
    setTaskStatusToAdd(taskStatus)
  }
  const handleOnCloseCreateTaskModal = () => {
    setShowCreateTaskModal(false);
  }
  const handleOnSaveTask = () => {
    setShowCreateTaskModal(false);
    
  }
  const handleTaskDrop = async (taskId, newStatus) => {
    try {
      await window.electronAPI.db.updateTask(parseInt(taskId), { status: newStatus });
      onRefresh();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };
  const handleSaveEdit = async () => {
    try {
      await window.electronAPI.db.updateTask(editingTask, editForm);
      setEditingTask(null);
      onRefresh();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };
  const handleCancelEdit = () => {
    setEditingTask(null);
    setEditForm({ name: '', description: '', status: 'active' });
  };
  const handleQuickStart = async (task) => {
    try {
      // End any running time entries first
      await window.electronAPI.db.endRunningTimeEntries();
      // Start new time entry for this task
      await window.electronAPI.db.startTimeEntry(task.id, '');
      onTaskSelect(task);
    } catch (error) {
      console.error('Error starting time entry:', error);
    }
  };
  const extractSubTasks = (taskDescription) => {
    const removeValues = ['<ol>', '<li>', '</ol>'];
    const regex = new RegExp(removeValues.join('|'), 'g');
    let taskArray = taskDescription.replace(regex, "").split("</li>");
    let taskArrayRemovedBlank = taskArray.filter((task) => task !== '');

    return taskArrayRemovedBlank;
  };

  return (
    <div className="space-y-6  border-t-8 bg-white"
      style={{ borderColor: project.color }}>

      <header className="flex items-center justify-between p-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {project?.name} Tasks
          </h2>
          <p className="text-gray-600">{tasks.length} tasks</p>
        </div>
      </header>

      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <CheckSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
          <p className="text-gray-500 mb-6">
            Create your first task to start tracking time.
          </p>
        </div>
      ) : (
        <div className="p-2 flex gap-x-2">
          {
            taskStatuses.map(statusData => {
              return (
                <TaskStatusColumn
                  key={statusData.label}
                  status={statusData.label}
                  tasks={tasks.filter(task => task.status === statusData.label)}
                  onAddTask={() => handleAddTask(statusData.label)}
                  onQuickStart={handleQuickStart}
                  onTaskDrop={handleTaskDrop}
                />
              )
            })
          }
        </div>
      )}
      {/* Click outside to close menu */}
      {
        showMenu && (
          <div
            className="fixed inset-0 z-0"
            onClick={() => setShowMenu(null)}
          />
        )
      }
      {
        showCreateTaskModal &&
        <CreateTaskModal
          project={project}
          onClose={handleOnCloseCreateTaskModal}
          onSave={handleOnSaveTask}
          taskStatusToAdd={taskStatusToAdd}
           />
      }
    </div >
  );
}

export default TaskList;
