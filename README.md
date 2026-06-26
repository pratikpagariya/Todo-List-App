# Tasks — Full-Stack Demo App

A tiny full-stack application: a **React** frontend and a **Node.js / Express** backend REST API.
It's a simple task list (add / complete / delete tasks).

This repo is **just the application** — no Docker, Kubernetes, or CI/CD. It runs entirely on your
machine. (The DevOps/infrastructure to deploy it lives in a separate project.)

```
Project/
├── backend/      Node.js + Express REST API  (port 3000)
│   └── src/server.js
├── frontend/     React + Vite UI             (port 5173)
│   └── src/
└── README.md
```

## Prerequisites

- **Node.js 18 or newer** (includes `npm`). Check with:
  ```bash
  node -v
  ```

## How to run (local)

You need **two terminals** — one for the backend, one for the frontend.

### 1. Start the backend (terminal 1)

```bash
cd backend
npm install
npm start
```
You should see: `✅ Backend API running at http://localhost:3000`

(Use `npm run dev` instead of `npm start` to auto-restart on code changes.)

### 2. Start the frontend (terminal 2)

```bash
cd frontend
npm install
npm run dev
```
Vite prints a URL — open **http://localhost:5173** in your browser.

That's it. Add a task in the UI; it's saved by the backend and shown in the list.

## How it fits together

```
Browser ──> Frontend (Vite dev server, :5173)
                │  calls /api/...
                ▼  (Vite proxies /api → backend)
            Backend (Express, :3000)
                │
                ▼
        In-memory task list
```

- The frontend calls `/api/tasks`. The Vite dev server **proxies** `/api/*` to the backend on
  `:3000` (configured in `frontend/vite.config.js`), so you don't deal with CORS or URLs.
- The backend keeps tasks **in memory** — simple, zero-setup. Data resets when you restart the
  backend.

## API reference

| Method | Path             | Description        |
|--------|------------------|--------------------|
| GET    | `/api/health`    | Health check       |
| GET    | `/api/tasks`     | List tasks         |
| POST   | `/api/tasks`     | Create `{ title }` |
| PUT    | `/api/tasks/:id` | Update `{ done?, title? }` |
| DELETE | `/api/tasks/:id` | Delete a task      |

Quick test from the command line (backend running):
```bash
curl http://localhost:3000/api/tasks
curl -X POST http://localhost:3000/api/tasks -H "Content-Type: application/json" -d '{"title":"Hello"}'
```

## Build the frontend for production (optional)

```bash
cd frontend
npm run build      # outputs static files to frontend/dist/
npm run preview    # serve the built files locally to check them
```
The backend already serves the API; in a real deployment the built frontend would be served by a
web server and pointed at the backend's URL.

## Troubleshooting

- **UI shows "Cannot reach the backend API"** → the backend isn't running. Start it (step 1) and
  confirm `http://localhost:3000/api/health` returns `{"status":"ok"}`.
- **Port already in use** → change the backend port with `PORT=4000 npm start`, and update the
  proxy target in `frontend/vite.config.js` to match.
