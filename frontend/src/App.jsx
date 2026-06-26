import { useEffect, useState } from "react";

const API = "/api";

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await fetch(`${API}/tasks`);
      if (!res.ok) throw new Error();
      setTasks(await res.json());
      setError("");
    } catch {
      setError("Cannot reach the backend API. Is it running on http://localhost:3000?");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addTask(e) {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch(`${API}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setTitle("");
    load();
  }

  async function toggle(task) {
    await fetch(`${API}/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
    load();
  }

  async function remove(id) {
    await fetch(`${API}/tasks/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="container">
      <h1>📋 Tasks</h1>
      <p className="sub">A tiny full-stack demo — React frontend + Express backend.</p>

      {error && <div className="error">{error}</div>}

      <form onSubmit={addTask} className="add">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task…"
          aria-label="New task"
        />
        <button type="submit">Add</button>
      </form>

      <ul className="list">
        {tasks.map((t) => (
          <li key={t.id} className={t.done ? "done" : ""}>
            <span className="text" onClick={() => toggle(t)}>
              {t.done ? "✅" : "⬜"} {t.title}
            </span>
            <button className="del" onClick={() => remove(t.id)} aria-label="Delete">
              ✕
            </button>
          </li>
        ))}
      </ul>

      {tasks.length === 0 && !error && <p className="empty">No tasks yet — add one above.</p>}
    </div>
  );
}
