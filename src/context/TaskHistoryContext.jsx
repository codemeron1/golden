import { createContext, useContext, useState } from 'react';

const TaskHistoryContext = createContext(null);

export function TaskHistoryProvider({ children }) {
  const [selectedTask, setSelectedTask] = useState(null);
  const [timeDuration, setTimeDuration] = useState("00:00:00");

  const onOpenHistory = (task) => setSelectedTask(task);
  const onCloseHistory = () => setSelectedTask(null);

  return (
    <TaskHistoryContext.Provider value={{ selectedTask, onOpenHistory, onCloseHistory, timeDuration, setTimeDuration }}>
      {children}
    </TaskHistoryContext.Provider>
  );
}

export function useTaskHistory() {
  const ctx = useContext(TaskHistoryContext);
  if (!ctx) throw new Error('useTaskHistory must be used within a TaskHistoryProvider');
  return ctx;
}
