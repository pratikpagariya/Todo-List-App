import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// In-memory data store.
// Simple on purpose so the app runs with zero setup (no database needed).
// Data resets when the backend restarts.
// ---------------------------------------------------------------------------
let tasks = [
  { id: 1, title: "Learn how the frontend talks to the backend", done: true },
  { id: 2, title: "Add your own task below", done: false },
];
let nextId = 3;

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// List tasks
app.get("/api/tasks", (_req, res) => {
  res.json(tasks);
});

// Create a task
app.post("/api/tasks", (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "title is required" });
  }
  const task = { id: nextId++, title: title.trim(), done: false };
  tasks.push(task);
  res.status(201).json(task);
});

// Update a task (toggle done / rename)
app.put("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const task = tasks.find((t) => t.id === id);
  if (!task) return res.status(404).json({ error: "task not found" });
  if (typeof req.body.done === "boolean") task.done = req.body.done;
  if (typeof req.body.title === "string") task.title = req.body.title.trim();
  res.json(task);
});

// Delete a task
app.delete("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  tasks = tasks.filter((t) => t.id !== id);
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`✅ Backend API running at http://localhost:${PORT}`);
});
