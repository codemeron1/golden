> the initialization of the database: src/services/database.js

```js
// development mode: database is in the project directory (src/database/timetracker.db)
const dbDir = path.join(__dirname, "../database");
const dbPath = path.join(dbDir, "timetracker.db");

//production mode
const userDataPath = app.getPath("userData");
const dbDir = path.join(userDataPath, "database");
const dbPath = path.join(dbDir, "timetracker.db");
```
