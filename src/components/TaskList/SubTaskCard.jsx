
import { Clock, Play, CheckCircle2, Trash2, Pause } from 'lucide-react';
import { useState, useEffect } from 'react';
import Timer from "./Timer";
import { toast } from 'sonner';
import { startOfDay } from 'date-fns';

export default function SubTaskCard({ subTask, onDelete }) {
  const [isChecked, setIsChecked] = useState(false);
  const { id, task_id, name, status, duration, started_at, total_paused_ms, pause_started_at } = subTask || {};
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [startedAt, setStartedAt] = useState(started_at);
  const [pauseAt, setPauseAt] = useState(pause_started_at);
  const [totalDuration, setTotalDuration] = useState(null);
  const [totalPauseDuration, setTotalPauseDuration] = useState(total_paused_ms);
  const [currentStatus, setCurrentStatus] = useState(status);
  const isDone = (currentStatus == 'done');

  const formatDuration = (dateInMs) => {
    const totalMinutes = Math.floor(dateInMs / 60000); //1 sec = 1000 ms
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const finalMinute = String(minute).padStart(2, 0);
    let finalHour = String(hour).padStart(2, 0);

    if (hour > 24) {
      const day = Math.floor(hour / 24);
      const remainingHour = hour % 24;
      finalHour = String(remainingHour).padStart(2, 0);

      return `${day}d ${finalHour}h ${finalMinute}m`;
    }

    if (hour > 0) {
      return `${finalHour}h ${finalMinute}m`;
    } else {
      return `${finalMinute}m`;
    }

  }
  const computeTotalDuration = () => {
    const timeNowMs = Date.now();
    const startTimeMs = new Date(startedAt).getTime();
    const totalPauseDurationMs = total_paused_ms || 0;

    const totalLapsedMs = timeNowMs - startTimeMs;
    const totalDuration = totalLapsedMs - totalPauseDurationMs;

    return totalDuration;
  }
  const handleStartTimer = async () => {
    if (currentStatus == 'done') return;

    const now = new Date().toISOString();
    const isStarting = !isRunning;
    const newStatus = isRunning ? 'paused' : 'running';
    try {
      if (isStarting) {
        // running: show the 'pause' icon
        let pauseDuration = totalPauseDuration ?? 0;
        if (startedAt) {
          if (!pauseAt) {
            throw new Error("pauseAt is missing.");
          }

          pauseDuration += Date.now() - new Date(pauseAt).getTime();
          setTotalPauseDuration(pauseDuration);
        } else {
          setStartedAt(now);
        }

        await window.electronAPI.db.updateSubTask({
          id: id,
          startTime: startedAt ? null : now,
          pauseAt: null,
          status: newStatus, // running
          pauseDuration: startedAt ? pauseDuration : null
        });

        setIsRunning(true);
        setIsPaused(false);
      } else {
        // pause: show play icon with 'continue' as text
        await window.electronAPI.db.updateSubTask({
          id: id,
          startTime: null,
          pausedAt: now,
          status: newStatus //paused
        });

        setIsRunning(false);
        setIsPaused(true);
        setPauseAt(now);
      }

      setCurrentStatus(newStatus);
    } catch (error) {
      console.log('golden: error encountered: ', error);
      alert("Failed to update timer state.")
    }
  }
  const handleMarkAsDone = async () => {
    try {
      await window.electronAPI.db.subTaskMarkAsDone({
        id: id,
        endedAt: new Date().toISOString(),
        pauseAt: null,
        pauseDuration: null,
        status: 'done'
      });

      setIsChecked(!isChecked);
      setIsRunning(false);
      setIsPaused(false);
      setCurrentStatus('done');
    } catch (error) {
      console.error('app error: ', error);
      alert('Mark as done failed.');
    }
  }
  const handleDelete = async () => {
    const confirmDelete = window.confirm('Are you sure you want to delete this sub-task? This action cannot be undone.');
    if (!confirmDelete) return;

    try {
      await window.electronAPI.db.deleteSubTask(id);
      onDelete(id);
    } catch (error) {
      console.error('app error: ', error);
      toast.error('Failed to delete sub-task.');
    }
  }

  useEffect(() => {

    switch (status) {
      case 'running':
        setIsRunning(true);
        setIsPaused(false);
        break;
      case 'paused':
        setIsRunning(false);
        setIsPaused(true);
        break;
    }
    setTotalDuration(computeTotalDuration);
  }, [status]);

  return (
    <div className={`group flex items-center justify-between p-2 px-3 bg-white border rounded-lg transition-all duration-200 cursor-pointer hover:bg-golden-300 hover:bg-opacity-10
    ${isDone
        ? 'bg-gray-50 border-gray-200'
        : 'hover:border-green-100 border-gray-100 hover:shadow-sm'}`}>

      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {/* Checkbox */}
        <div className="relative">
          <input
            type="checkbox"
            id={`sub-task-${subTask?.id}`}
            checked={isDone}
            className="sr-only peer"
            readOnly
          />
          <label
            htmlFor={`sub-task-${subTask?.id}`}
            className="w-5 h-5 rounded-full border-2 border-golden-200 cursor-pointer flex items-center justify-center peer-checked:bg-golden-600 peer-checked:border-golden-600 transition-colors"
          >
            {isDone && (
              <CheckCircle2 className="w-3 h-3 text-white" />
            )}
          </label>
        </div>
        {/* Sub-task Title */}
        <div className="min-w-0 flex-1">
          <label
            htmlFor={`task-${subTask?.id}`}
            className={`text-sm font-medium cursor-pointer truncate transition-all duration-300
        ${isChecked ? 'text-gray-400' : 'text-gray-700'}`}
          >
            {subTask?.name}
          </label>
        </div>
      </div>

      <div className="flex items-center space-x-4 ml-4">
        {/* Duration - Now on the same row */}
        {
          isDone && totalDuration &&
          <div className="flex items-center text-gray-400 text-[11px] font-medium tracking-wider">
            <Clock className="w-3 h-3 mr-1" />
            {formatDuration(totalDuration)}
          </div>
        }

        {/* Live timer */}
        {
          isRunning &&
          <Timer startTime={startedAt} isRunning={isRunning} totalPauseDuration={totalPauseDuration} />
        }

        {/* start/continue/pause button */}
        <div className="flex items-center space-x-1.5">
          {!isDone && (
            <button
              className={`flex items-center px-2.5 py-1 text-xs font-medium text-golden-600 bg-blue-50 hover:bg-golden-100 rounded-md transition-colors cursor-pointer`}
              onClick={() => handleStartTimer()}>
              {
                isRunning ?
                  <>
                    <Pause className="w-3 h-3 mr-1 fill-current" />
                    Pause
                  </>
                  :
                  <>
                    <Play className="w-3 h-3 mr-1 fill-current" />
                    {
                      isPaused ? 'Continue' : 'Start'
                    }
                  </>
              }
            </button>
          )}

          <button
            onClick={handleMarkAsDone}
            className={`flex items-center px-2.5 py-1 text-xs font-medium rounded-md transition-all
          ${isChecked
                ? 'text-green-600 bg-green-50'
                : 'text-gray-500 bg-gray-50 hover:bg-green-50 hover:text-green-600'}`}
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {isDone ? 'Done' : 'Mark as Done'}
          </button>

          {
            !isDone &&
            <button
              onClick={handleDelete}
              className={`flex items-center px-2.5 py-1 text-xs font-medium rounded-md transition-all
             text-red-500 bg-gray-50 hover:bg-green-50 hover:text-red-600`}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete
            </button>
          }

        </div>
      </div>
    </div>
  );
}