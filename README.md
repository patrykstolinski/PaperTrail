# PaperTrail
a browser-first platform that lets people aggregate, organize, and manage all life paperwork and admin (insurance letters, credit contracts, warranties, etc.) in one place. It allows scanning or photo upload of documents, highlighter-based surgical OCR for field extraction. 

# To start
1. Create a .env file with:

MONGO_USER=papertrailAdmin
MONGO_PASS=papertrailPass
MONGO_DB=papertrail
MONGO_PORT=27017
MONGO_HOST=host.docker.internal
PORT=4000

2. npm install
3. docker compose up -d
4. npm run dev
