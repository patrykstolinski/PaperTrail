
# Admin Quickstart — Postman-only (PaperTrail backend)

This short guide contains only what you need right now to test the backend via Postman: switching dev users, authenticating requests, and the restart requirement when changing the global dev user.

Prereqs
- Server running locally (npm run dev).
- `.env` contains at least:
   - `DEV_AUTH=true`
   - `DEV_CURRENT_USER_ID=<ObjectId-like-value>`

Switching users (Postman)

1) Per-request (recommended):
    - Add header `X-Dev-User-Id: 650000000000000000000002` to any Postman request. This impersonates that user for that single request.

2) Global dev user (less convenient for Postman):
    - Set `DEV_CURRENT_USER_ID` in `.env` and restart the server. NOTE: changing this env var requires restarting the server process — nodemon may not pick up `.env` changes automatically in all setups.

Essential Postman requests

- List documents (for the active dev user):
   - GET http://localhost:4000/api/documents
   - Header: `X-Dev-User-Id` (optional override)

- Upload document (multipart/form-data):
   - POST http://localhost:4000/api/documents
   - Body (form-data): `file` (File), `title` (Text)
   - Header: `X-Dev-User-Id` (optional override)

- Download file bytes:
   - GET http://localhost:4000/api/documents/:id/download
   - Header: `X-Dev-User-Id` (must match owner)

Quick notes
- Do NOT enable `DEV_AUTH` in production.
- Prefer `X-Dev-User-Id` in Postman so you don't need to restart the server.
- If you change `DEV_CURRENT_USER_ID` in `.env`, restart the server to apply it.
- Ownership is enforced: you can only see/download documents belonging to the impersonated user.

If you want, I can also add a tiny exported Postman collection (JSON) with these three example requests.
