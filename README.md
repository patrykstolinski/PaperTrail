# PaperTrail Setup Guide

This guide covers everything a new user needs to install, start, and open PaperTrail locally.

## 1. Prerequisites

Install the following first:

- Node.js 18+ and npm
- Docker Desktop
- A terminal such as PowerShell, Git Bash, or Terminal

## 2. Clone both repositories

Make sure you have both folders available:

- PaperTrail
- PaperTrail_spa

## 3. Backend setup (PaperTrail)

Open a terminal in the PaperTrail folder.

### 3.1 Install dependencies

```bash
npm install
```

### 3.2 Start MongoDB

```bash
docker compose up -d
```

This starts:

- MongoDB on port 27017
- Mongo Express on port 8081

### 3.3 Create the backend environment file

Create a `.env` file in the PaperTrail root with content like this:

```env
MONGO_USER=papertrail
MONGO_PASS=papertrail
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DB=papertrail
PORT=4000
JWT_SECRET=change-me
HMAC_SECRET=change-me
NODE_ENV=development
DEV_AUTH=true
DEV_CURRENT_USER_ID=test-user
```

### 3.4 Start the backend

```bash
npm run dev
```

The backend should now be reachable at:

- http://localhost:4000/health
- http://localhost:8081/ (Mongo Express)

## 4. Frontend setup (PaperTrail_spa)

Open a second terminal in the PaperTrail_spa folder.

### 4.1 Install dependencies

```bash
npm install
```

### 4.2 Optional frontend environment file

The frontend usually works with the default backend URL, but you can set one explicitly if needed:

Create a `.env` file in PaperTrail_spa with:

```env
VITE_API_BASE=http://localhost:4000
```

### 4.3 Start the frontend

```bash
npm run dev
```

The frontend should open at:

- http://localhost:5173

## 5. Log in and use the app

The frontend uses a simple dev login flow. You can sign in with one of these usernames:

- patryk
- timo
- viktor

The password field is not validated in this dev mode, so any non-empty password will work.

## 6. Troubleshooting

- If the backend does not start, make sure Docker Desktop is running and MongoDB has been started with `docker compose up -d`.
- If the frontend cannot reach the backend, confirm that the backend is running on port 4000 and that `VITE_API_BASE` points to the correct URL.
- If the login page does not work, make sure the backend is running in dev mode and that the frontend is using the same local backend URL.

## 7. Optional backend tests

To run the backend test suite:

```bash
npm test
```
