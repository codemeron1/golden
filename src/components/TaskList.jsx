import { useState } from 'react';
import { CheckSquare } from 'lucide-react';
import "react-quill/dist/quill.snow.css";
import TaskStatusColumn from './TaskList/TaskStatusColumn';
import CreateTaskModal from './TaskList/CreateTaskModal';
import TaskHistorySidebar from './TaskList/TaskHistorySidebar';
import { TaskHistoryProvider, useTaskHistory } from '../context/TaskHistoryContext';

function TaskListBody({ tasks, project, onTaskSelect, onRefresh }) {
  const [showMenu, setShowMenu] = useState(null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskStatusToAdd, setTaskStatusToAdd] = useState('');
  const { selectedTask, onCloseHistory } = useTaskHistory();

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
  const handleTaskDrop = async (taskId, newStatus) => {
    try {
      await window.electronAPI.db.updateTask(parseInt(taskId), { status: newStatus });
      onRefresh();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
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
  const handleEditTask = (task) => {
    setEditingTask(task);
  };
  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task? This will delete all associated time entries.')) {
      try {
        await window.electronAPI.db.deleteTask(taskId);
        if (selectedTask && selectedTask.id === taskId) {
          onCloseHistory();
        }
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  return (
    <div className="space-y-6  border-t-8 bg-white"
      style={{ borderColor: project.color }}>
        
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
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
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
        (showCreateTaskModal || editingTask) &&
        <CreateTaskModal
          project={editingTask ? { id: editingTask.project_id, name: editingTask.primary_project_name, color: editingTask.primary_project_color } : project}
          taskToEdit={editingTask}
          onClose={() => {
            setShowCreateTaskModal(false);
            setEditingTask(null);
          }}
          onSave={() => {
            setShowCreateTaskModal(false);
            setEditingTask(null);
            if (onRefresh) onRefresh();
          }}
          taskStatusToAdd={taskStatusToAdd}
        />
      }

      {selectedTask && <TaskHistorySidebar task={selectedTask} onClose={onCloseHistory} onRefresh={onRefresh} />}

    </div >
  );
}

export default function TaskList(props) {
  return (
    <TaskHistoryProvider>
      <TaskListBody {...props} />
    </TaskHistoryProvider>
  );
}
