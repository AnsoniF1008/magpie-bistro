// Starts every e2e run from an empty database.
import fs from 'fs'
for (const f of ['data/e2e.db', 'data/e2e.db-shm', 'data/e2e.db-wal']) fs.rmSync(f, { force: true })
fs.mkdirSync('data', { recursive: true })
