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
  const handleOnCloseCreateTaskModal = () => {
    setShowCreateTaskModal(false);
  }
  const handleOnSaveTask = () => {
    setShowCreateTaskModal(false);
    if (onRefresh) onRefresh();
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

      {selectedTask && <TaskHistorySidebar task={selectedTask} onClose={onCloseHistory} />}

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
