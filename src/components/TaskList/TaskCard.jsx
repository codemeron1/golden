
import { Clock, CheckSquare, Edit2, MoreVertical, Trash2, SquarePlus } from 'lucide-react';
import { formatDurationShort, formatTime } from '../../utils/timeUtils';
import SubTaskCard from './SubTaskCard';
import { useState } from 'react';
import ModalCreateSubTask from './ModalCreateSubTask';
import { toast } from 'sonner';

export default function TaskCard({
  task,
  subTasks
}) {
  const [showMenu, setShowMenu] = useState(null);
  const [showModalCreateSubTask, setShowModalCreateSubTask] = useState(false);
  const [listOfSubTasks, setListOfSubTasks] = useState(subTasks);

  const reloadSubTasks = async () => {
    try {
      console.log('reloading subtasks for task id: ', task.id);
      const subtasks = await window.electronAPI.db.getSubTasks(task.id);
      console.log('loaded subtasks: ', subtasks);
      setListOfSubTasks(subtasks);
    } catch (error) {
      console.log('app error: ', error);
      toast.error('Failed to reload sub tasks.');
    }

  }
  const handleEdit = (task) => {
    setEditingTask(task.id);
    setEditForm({
      name: task.name,
      description: task.description || '',
      status: task.status
    });
    setShowMenu(null);
  };
  const handleDelete = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task? This will also delete all associated time entries.')) {
      try {
        await window.electronAPI.db.deleteTask(taskId);
        onRefresh();
        setShowMenu(null);
      } catch (error) {
        console.error('Error deleting task:', error);
        toast.error('Failed to delete task.');
      }
    }
  };
  const handleDeleteSubTask = (subTaskId) => {
    const updatedSubTasks = listOfSubTasks.filter(subTask => subTask.id !== subTaskId);
    setListOfSubTasks(updatedSubTasks);
    toast.success("Sub task deleted.", { position: "top-center" });
  }
  const handleShowCreateSubTaskModal = async () => {
    setShowModalCreateSubTask(true);
  }
  const handleCloseCreateSubTaskModal = () => {
    setShowModalCreateSubTask(false);
  }
  const handleSubTaskCreated = () => {
    reloadSubTasks();
    setShowModalCreateSubTask(false);
    toast.success("New sub task added!", { position: "top-center" });
  }

  return (
    <>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center">
              <h3 className="text-gray-700 text-lg font-semibold ">
                {task.name}
              </h3>
            </div>

            {task?.description && (
              <p className='text-gray-500 text-md py-1 px-2'>{task?.description}</p>
            )}
            {listOfSubTasks?.length > 0 && (
              <div className='py-6 flex flex-col gap-2'>
                {
                  listOfSubTasks.map((subTask, index) => <SubTaskCard key={index} subTask={subTask} onDelete={handleDeleteSubTask} />)
                }
              </div>
            )}

            <div className='flex flex-row justify-center py-2'>
              <button
                onClick={handleShowCreateSubTaskModal}
                className="flex items-center gap-2 bg-golden-400 hover:bg-golden-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <SquarePlus />
                Add Sub task
              </button>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{formatDurationShort(task.total_time)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <CheckSquare className="h-4 w-4" />
                <span>{task.time_entry_count} entries</span>
              </div>
              <span>Created {formatTime(task.created_at)}</span>
            </div>

          </div>

          <div className="flex items-center space-x-2 ml-4">
            <div className="relative">
              <button
                onClick={() => setShowMenu(showMenu === task.id ? null : task.id)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <MoreVertical className="h-4 w-4 text-gray-500" />
              </button>

              {showMenu === task.id && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                  <button
                    onClick={() => handleEdit(task)}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>Edit Task</span>
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-left text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Task</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {
        showModalCreateSubTask &&
        <ModalCreateSubTask task={task} onClose={handleCloseCreateSubTaskModal} onSubTaskCreated={handleSubTaskCreated} />
      }
    </>
  );
}