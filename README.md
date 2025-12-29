## Golden

A time-tracking desktop app inspired by features from paid tools like ClickUp and Monday.com.

### Features
- Create projects and tasks
- Start / pause / stop time tracking per task
- Edit and delete time entries
- Local SQLite database

### Tech
- Electron
- React.js
- Tailwind CSS
- SQLite

### Prerequisites
- Node.js (recommended v18+)
- On Windows: Visual Studio Build Tools with Desktop development with C++

### Development Notes
1. Change `main.js: line 4: const isDev = "development";` to `production` kapag magbuild ng installer.

### CLI Commands
1. Install dependencies:
  ```powershell
  npm install
  ```
2. Run the Vite dev server and launch Electron together:
  ```powershell
  npm run start
  ```

### License
MIT
