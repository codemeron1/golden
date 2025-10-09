# Golden

**Watch where you waste your time.**

A lightweight, open-source time-tracking desktop app inspired by features from paid tools like ClickUp and Monday.com.

## Features
- Create projects and tasks
- Start / pause / stop time tracking per task
- Edit and delete time entries
- Local SQLite database for persistence

## Tech
- Electron (main process) and Vite (renderer)
- React 18 with hooks
- Tailwind CSS for styling
- SQLite (better-sqlite3 / sqlite3) for local storage
- electron-builder for packaging and installers

## Prerequisites
- Node.js (recommended v18+)
- npm
- On Windows: if native modules must be compiled, install Visual Studio Build Tools with "Desktop development with C++" workload

## Installation

Install dependencies:

```powershell
npm install
```

## Development

Run the Vite dev server and launch Electron together:

```powershell
npm run start
```

## Contributing
PRs and issues are welcome. Keep changes focused and document any native dependency updates.

## License
MIT
