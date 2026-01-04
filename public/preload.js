const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // Window controls
  minimize: () => ipcRenderer.invoke("window-minimize"),
  maximize: () => ipcRenderer.invoke("window-maximize"),
  close: () => ipcRenderer.invoke("window-close"),

  // Database operations
  db: {
    // Projects
    createProject: (name, description, color) =>
      ipcRenderer.invoke("db-create-project", name, description, color),
    getProjects: () => ipcRenderer.invoke("db-get-projects"),
    getProject: (id) => ipcRenderer.invoke("db-get-project", id),
    updateProject: (id, updates) =>
      ipcRenderer.invoke("db-update-project", id, updates),
    deleteProject: (id) => ipcRenderer.invoke("db-delete-project", id),

    // Tasks
    createTask: ({ taskData }) =>
      ipcRenderer.invoke("db-create-task", taskData),
    getTasks: (projectId) => ipcRenderer.invoke("db-get-tasks", projectId),
    getTask: (id) => ipcRenderer.invoke("db-get-task", id),
    updateTask: (id, updates) =>
      ipcRenderer.invoke("db-update-task", id, updates),
    deleteTask: (id) => ipcRenderer.invoke("db-delete-task", id),

    // Sub-tasks
    createSubTask: (subTaskData) =>
      ipcRenderer.invoke("db-create-sub-task", subTaskData),
    updateSubTask: ({ id, startTime, pausedAt, status, pauseDuration }) =>
      ipcRenderer.invoke("db-update-sub-task", {
        id,
        startTime,
        pausedAt,
        status,
        pauseDuration,
      }),
    subTaskMarkAsDone: ({ id, endedAt, pauseAt, pauseDuration, status }) => {
      ipcRenderer.invoke("db-mark-as-done-sub-task", {
        id,
        endedAt,
        pauseAt,
        pauseDuration,
        status,
      });
    },
    getSubTask: ({ subTaskId }) =>
      ipcRenderer.invoke("db-get-sub-task", subTaskId),
    getSubTasks: (taskId) => ipcRenderer.invoke("db-get-sub-tasks", taskId),
    deleteSubTask: (id) => ipcRenderer.invoke("db-delete-sub-task", id),

    // Time entries
    startTimeEntry: (taskId, description) =>
      ipcRenderer.invoke("db-start-time-entry", taskId, description),
    endTimeEntry: (id) => ipcRenderer.invoke("db-end-time-entry", id),
    endRunningTimeEntries: (taskId) =>
      ipcRenderer.invoke("db-end-running-time-entries", taskId),
    getTimeEntries: (taskId, limit) =>
      ipcRenderer.invoke("db-get-time-entries", taskId, limit),
    getTimeEntry: (id) => ipcRenderer.invoke("db-get-time-entry", id),
    getRunningTimeEntry: () => ipcRenderer.invoke("db-get-running-time-entry"),
    updateTimeEntry: (id, updates) =>
      ipcRenderer.invoke("db-update-time-entry", id, updates),
    deleteTimeEntry: (id) => ipcRenderer.invoke("db-delete-time-entry", id),

    // Statistics
    getProjectStats: (projectId, startDate, endDate) =>
      ipcRenderer.invoke("db-get-project-stats", projectId, startDate, endDate),
  },
});
