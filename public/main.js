const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const isDev = "development";

// Import database service
const DatabaseService = require("../src/services/database.js");

function createWindow() {
  // Create the browser window
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js"),
    },
    show: false,
    icon: path.join(__dirname, "icon.png"), // Optional: add your app icon
  });

  // Load the app
 if (isDev === "development") {
    // Development: load from Vite dev server
    mainWindow.loadURL('http://localhost:5176/');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready to prevent visual flash
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Initialize database
let db;

// Ensure database directory exists
const dbDir = path.join(__dirname, "../database");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  try {
    // Initialize database
    console.log("Initializing database...");
    db = new DatabaseService();
    console.log("Database initialized successfully");

    // Setup IPC handlers
    setupIpcHandlers();

    createWindow();
  } catch (error) {
    console.error("Failed to initialize application:", error);
    // Show error dialog and quit
    const { dialog } = require("electron");
    dialog.showErrorBox(
      "Database Error",
      "Failed to initialize database. Please make sure you have proper permissions and try again.\n\nError: " +
        error.message
    );
    app.quit();
  }
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Prevent new window creation
app.on("web-contents-created", (event, contents) => {
  contents.on(
    "new-window",
    (
      navigationEvent,
      navigationURL,
      frameName,
      disposition,
      options,
      additionalFeatures
    ) => {
      event.preventDefault();
    }
  );
});

// Setup IPC handlers for database operations
function setupIpcHandlers() {
  // Project handlers
  ipcMain.handle(
    "db-create-project",
    async (event, name, description, color) => {
      return db.createProject(name, description, color);
    }
  );

  ipcMain.handle("db-get-projects", async (event) => {
    return db.getProjects();
  });

  ipcMain.handle("db-get-project", async (event, id) => {
    return db.getProject(id);
  });

  ipcMain.handle("db-update-project", async (event, id, updates) => {
    return db.updateProject(id, updates);
  });

  ipcMain.handle("db-delete-project", async (event, id) => {
    return db.deleteProject(id);
  });

  // Task handlers
  ipcMain.handle(
    "db-create-task",
    async (event, taskData) => {
      console.log("Creating task with data:", taskData);
      return db.createTask(taskData);
    }
  );

  ipcMain.handle("db-get-tasks", async (event, projectId) => {
    return db.getTasks(projectId);
  });

  ipcMain.handle("db-get-task", async (event, id) => {
    return db.getTask(id);
  });

  ipcMain.handle("db-update-task", async (event, id, updates) => {
    return db.updateTask(id, updates);
  });

  ipcMain.handle("db-delete-task", async (event, id) => {
    return db.deleteTask(id);
  });

  // Time entry handlers
  ipcMain.handle("db-start-time-entry", async (event, taskId, description) => {
    return db.startTimeEntry(taskId, description);
  });

  ipcMain.handle("db-end-time-entry", async (event, id) => {
    return db.endTimeEntry(id);
  });

  ipcMain.handle("db-end-running-time-entries", async (event, taskId) => {
    return db.endRunningTimeEntries(taskId);
  });

  ipcMain.handle("db-get-time-entries", async (event, taskId, limit) => {
    return db.getTimeEntries(taskId, limit);
  });

  ipcMain.handle("db-get-time-entry", async (event, id) => {
    return db.getTimeEntry(id);
  });

  ipcMain.handle("db-get-running-time-entry", async (event) => {
    return db.getRunningTimeEntry();
  });

  ipcMain.handle("db-update-time-entry", async (event, id, updates) => {
    return db.updateTimeEntry(id, updates);
  });

  ipcMain.handle("db-delete-time-entry", async (event, id) => {
    return db.deleteTimeEntry(id);
  });

  // Statistics handlers
  ipcMain.handle(
    "db-get-project-stats",
    async (event, projectId, startDate, endDate) => {
      return db.getProjectStats(projectId, startDate, endDate);
    }
  );
}

// Clean up database connection on app quit
app.on("before-quit", () => {
  if (db) {
    db.close();
  }
});
