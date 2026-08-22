import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, "scheduler.db");

const DUMMY_SCHEDULES = [
  {
    id: "task-1",
    title: "팀 스탠드업 미팅",
    color: "sky",
    hour: 9,
    min: 0,
    duration: 30,
    dayOffset: 0,
    urgency: 4,
    importance: 3,
    done: 0,
  },
  {
    id: "task-2",
    title: "기획서 초안 작성",
    color: "amber",
    hour: 13,
    min: 30,
    duration: 90,
    dayOffset: 1,
    urgency: 3,
    importance: 5,
    done: 0,
  },
  {
    id: "task-3",
    title: "클라이언트 리뷰 콜",
    color: "violet",
    hour: 16,
    min: 0,
    duration: 60,
    dayOffset: 2,
    urgency: 5,
    importance: 4,
    done: 0,
  },
];

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Failed to open scheduler.db:", err.message);
  }
});

function initDb() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS schedules (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        color TEXT NOT NULL,
        hour INTEGER NOT NULL,
        min INTEGER NOT NULL,
        duration INTEGER NOT NULL,
        dayOffset INTEGER NOT NULL,
        urgency INTEGER NOT NULL,
        importance INTEGER NOT NULL,
        done INTEGER NOT NULL DEFAULT 0
      )
    `);

    db.get("SELECT COUNT(*) AS count FROM schedules", (err, row) => {
      if (err) {
        console.error("Failed to check schedules table:", err.message);
        return;
      }
      if (row.count === 0) {
        const stmt = db.prepare(`
          INSERT INTO schedules (id, title, color, hour, min, duration, dayOffset, urgency, importance, done)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const s of DUMMY_SCHEDULES) {
          stmt.run(
            s.id,
            s.title,
            s.color,
            s.hour,
            s.min,
            s.duration,
            s.dayOffset,
            s.urgency,
            s.importance,
            s.done
          );
        }
        stmt.finalize(() => {
          console.log("scheduler.db seeded with 3 dummy schedules.");
        });
      }
    });
  });
}

initDb();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/schedules", (req, res) => {
  db.all(
    "SELECT * FROM schedules ORDER BY dayOffset ASC, hour ASC, min ASC",
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: "Failed to fetch schedules." });
        return;
      }
      const schedules = rows.map((row) => ({
        ...row,
        done: Boolean(row.done),
      }));
      res.json(schedules);
    }
  );
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
