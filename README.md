## ICU Beds Monorepo

This repo is now split into two parts:

- `client/` – React + Vite frontend (MapLibre, Tailwind, Socket.IO client)
- `server/` – Express + MongoDB (Mongoose) API and Socket.IO server

### Run the frontend
```sh
cd client
npm install
npm run dev
```
Set frontend env in `client/.env` (Firebase keys, `VITE_API_URL`, etc.).

### Run the backend
```sh
cd server
npm install
npm start   # or npm run dev
```
Backend env lives in `server/.env` (`MONGO_URI`, `PORT`, `JWT_SECRET`, etc.).

### Notes
- If you previously installed deps at repo root, you can safely delete the old `node_modules` folder there (frontend dependencies now live under `client/`).
- Static assets and build output were moved under `client/public` and `client/dist`.
