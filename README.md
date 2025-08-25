# FastAPI ⚡ React Chat (Client)

A minimal React client for your FastAPI chat backend.

## Quickstart

```bash
# inside this folder
npm i
npm run dev
```

By default it talks to `http://localhost:8000`. To change endpoints, create `.env` in the project root:

```
VITE_API_BASE=http://localhost:8000
VITE_WS_BASE=ws://localhost:8000
```

## Features
- Register / Login
- JWT stored in localStorage
- List & send messages (REST)
- Live updates via WebSocket
- Room switching
