# PaperTrail
A browser-first platform that lets people aggregate, organize, and manage all life paperwork and admin (insurance letters, credit contracts, warranties, etc.) in one place. It allows scanning or photo upload of documents, highlighter-based surgical OCR for field extraction.

## Inhaltsverzeichnis
- [To start](#to-start)
- [Testing Method](#testing-method)
- [PaperTrail - Document Schema](#papertrail---document-schema)
- [Uebersicht](#uebersicht)
- [Feldübersicht](#felduebersicht)
- [Indizes](#indizes)
- [Beispiel-Dokument](#beispiel-dokument)
- [PaperTrail - Docker Setup](#papertrail---docker-setup)
- [Services](#services)
- [MongoDB](#mongodb)
- [Beschreibung](#beschreibung)
- [Mongo Express (Web-GUI)](#mongo-express-web-gui)
- [Volumes](#volumes)
- [Verwendung](#verwendung)
- [Zusammenfassung - Verwendung](#zusammenfassung---verwendung)
- [Environment - Variablen](#environment---variablen)
- [Erklärung der Variablen](#erklaerung-der-variablen)
- [Nutzung](#nutzung)
- [Zusammenfassung - Nutzung](#zusammenfassung---nutzung)
- [Abhängigkeiten (Dependencies)](#abhaengigkeiten-dependencies)
- [Hinweise zur Nutzung](#hinweise-zur-nutzung)

---

### To start
**1. Create a .env file with:**
- MONGO_USER=papertrailAdmin
- MONGO_PASS=papertrailPass
- MONGO_DB=papertrail
- MONGO_PORT=27017
- MONGO_HOST=host.docker.internal
- PORT=4000

```bash
**2. npm install**  
**3. docker compose up -d**  
**4. npm run dev**
```
---

### Testing Method
--------- POST ---------  
Endpoint: http://localhost:4000/documents

**To send a test document, go into the main folder of the project and run:**

```bash
node backend/tests/DocumentUploadDownload/testDocumentModel.js
```
### Test Dokument Schema

```javascript
const testDoc = new Document({
  userId: "Hier kommt die user ID", //Pflichtfeld
  originalFileName: "Hier kommt der Originalname der Datei", // optional ✅
  fileType: "Hier kommt der Dateityp (Pflichtfeld) ⚠️",     // Pflichtfeld
  title: "Hier kommt der sichtbare Titel auf dem Dashboard (Pflichtfeld) ⚠️", // Pflichtfeld
  extractedFields: "Hier kommen theoretische Extrafelder, z.B. Kundennummer, Rechnungsbeträge usw.", // optional ✅
  tags: "" // optional ✅
  fileBinaryData: "Binäre Präsentation der Dateien" //Pflichtfeld 
});
```
### Upload Test

- Prüft, ob ein neues Dokument erfolgreich in die MongoDB gespeichert werden kann – inklusive aller zugehörigen Daten wie Titel, Dateityp, extrahierte Felder, Tags und der Binärdatei (fileBinaryData).
Nach dem Speichern wird überprüft, ob das Dokument anhand eines bestimmten Wertes (z. B. „Gesamtsumme“) in den extrahierten Feldern wiedergefunden werden kann.



### Download Test

- Prüft, ob ein zuvor gespeichertes Dokument anhand seines Titels in der Datenbank gefunden werden kann.
Wenn das Dokument existiert, wird die darin gespeicherte Binärdatei (fileBinaryData) ausgelesen und als echte Datei auf das lokale Dateisystem zurückgeschrieben — um sicherzustellen, dass der Upload korrekt und die Daten vollständig abrufbar sind.


```bash
node backend/tests/DocumentUploadDownload/testDownload.js
```

### PaperTrail - Document Schema

- Dieses Dokument beschreibt das Mongoose-Schema für Document in der PaperTrail-App.

### Uebersicht

- MongoDB collection: documents

- Mongoose model: Document

- timestamps: true → automatisch createdAt und updatedAt

- strict: false → erlaubt Felder, die nicht explizit definiert sind

### Felduebersicht

| Feldname           | Typ      | Pflichtfeld | Beschreibung                                                                                                         |
| ------------------ | -------- | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| `originalFileName` | String   | ⚠️ Pflicht  | Originalname der hochgeladenen Datei                                                                                 |
| `fileType`         | String   | ⚠️ Pflicht  | Dateityp, z. B. PDF, PNG, DOCX                                                                                       |
| `title`            | String   | optional    | Sichtbarer Titel auf dem Dashboard                                                                                   |
| `uploadDate`       | Date     | optional    | Datum des Uploads, Standard: jetzt                                                                                   |
| `ocrDate`          | Date     | optional    | Datum der OCR-Verarbeitung                                                                                           |
| `extractedFields`  | Object   | optional    | Dynamische Felder aus OCR oder manuell, z. B. Kundennummer, Rechnungsbetrag                                          |
| `tags`             | [Array]  | optional    | Schlagwörter für das Dokument                                                                                        |
| `userId`           | ObjectId | optional    | Referenz auf den User, der das Dokument besitzt                                                                      |
| `status`           | String   | optional    | Workflow-Status: `"uploaded"`, `"processing"`, `"review"`, `"completed"`, `"archived"`. Standard: `"uploaded"`       |
| `fileBinaryData`   | Buffer   | optional    | Enthält die Binärdaten der hochgeladenen Datei                                                                       |
| `archived`         | Boolean  | optional    | Gibt an, ob das Dokument archiviert ist. Standard: `false`                                                           |
| `reminders`        | [Array]  | optional    | Liste von Erinnerungen mit Datum, Nachricht und Sendestatus. Nur zukünftige Daten erlaubt (automatische Validierung) |


### Indizes

- Textindizes: title, tags, originalFileName → für Volltextsuche

- Sortierindizes: uploadDate (absteigend), ocrDate (absteigend), fileType, status, userId, fileBinaryData

### Beispiel-Dokument

```javascript
const testDoc = new Document({
  originalFileName: "rechnung_2025.pdf", // ⚠️ Pflichtfeld
  fileType: "PDF",                        // ⚠️ Pflichtfeld
  title: "Rechnung August 2025",
  uploadDate: new Date(),
  ocrDate: new Date(),
  extractedFields: {
    kundennummer: "12345",
    rechnungsbetrag: 499.99
  },
  tags: ["rechnung", "kunden123"],
  userId: someUserId,
  status: "uploaded"
});

```


### PaperTrail - Docker Setup

- Dieses Docker-Setup startet MongoDB und die Mongo Express GUI für PaperTrail.
- Es verwendet docker-compose zur einfachen Orchestrierung der Services.
# Services
### MongoDB

```yaml
mongo:
  image: mongo:8
  container_name: mongo-pt
  restart: always
  ports:
    - "27017:27017"
  environment:
    MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
    MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASS}
  volumes:
    - mongo-pt-data:/data/db
```
#### Beschreibung
- Persistentes Volume: mongo-pt-data:/data/db

- Container startet automatisch: restart: always

### Mongo Express Web-GUI
```javascript 
mongo-pt-express:
  image: mongo-express:1.0.2
  container_name: mongo-pt-express
  restart: always
  ports:
    - "8081:8081"
  environment:
    ME_CONFIG_MONGODB_ADMINUSERNAME: ${MONGO_USER}
    ME_CONFIG_MONGODB_ADMINPASSWORD: ${MONGO_PASS}
    ME_CONFIG_MONGODB_SERVER: mongo
    ME_CONFIG_MONGODB_ENABLE_ADMIN: "true"
  depends_on:
    - mongo
```
**Beschreibung des UI der Datenbank:**

- Image: mongo-express:1.0.2

- Container Name: mongo-pt-express

- Ports: Host 8081 → Container 8081 (Web-GUI)

- Umgebungsvariablen:

| Variable                          | Beschreibung                        |
| --------------------------------- | ----------------------------------- |
| `ME_CONFIG_MONGODB_ADMINUSERNAME` | Admin-Benutzername                  |
| `ME_CONFIG_MONGODB_ADMINPASSWORD` | Admin-Passwort                      |
| `ME_CONFIG_MONGODB_SERVER`        | Name des MongoDB-Services (`mongo`) |
| `ME_CONFIG_MONGODB_ENABLE_ADMIN`  | Admin-Zugang aktivieren (`true`)    |

- Depends On: MongoDB-Service → sicherstellen, dass MongoDB zuerst gestartet wird

- Restart Policy: always


### Volumes
```javascript
volumes:
  mongo-pt-data:
```
### Verwendung

- Environment-Datei erstellen (.env)

Docker Compose starten: 
```bash
docker-compose up -d
```
Zugriff auf Mongo Express: http://localhost:8081

### Zusammenfassung - Verwendung

- MongoDB läuft persistent

- Mongo Express Web-GUI verfügbar

- Setup ist wiederholbar

### Environment - Variablen
```javascript
- MONGO_USER=papertrailAdmin
- MONGO_PASS=papertrailPass
- MONGO_DB=papertrail
- MONGO_PORT=27017
- MONGO_HOST=host.docker.internal
- PORT=4000
```

### Developer auth & quick-testing

- DEV_AUTH=true enables a developer authentication mode that bypasses full login flows. When enabled the server will accept a developer user from one of two sources (priority order):
  1. `X-Dev-User-Id` request header (per-request impersonation)
  2. `DEV_CURRENT_USER_ID` environment variable (global dev user)

Examples (.env):
```
DEV_AUTH=true
DEV_CURRENT_USER_ID=650000000000000000000001
```

Notes:
- Use header `X-Dev-User-Id` in Postman to act as different users without restarting the server.
- If no header is present and `DEV_CURRENT_USER_ID` is set, the server treats requests as coming from that user.
- Do NOT enable `DEV_AUTH` in production.

### Hashing, indexes and file handling (MVP changes)

We made a few schema and controller changes to make duplicate-detection reliable and avoid indexing raw binary data:

- `fileHash` (SHA-256 hex) is stored for each uploaded file and used for per-user duplicate-file detection.
- `titleHash` (HMAC-SHA256) is stored for each title and used for per-user duplicate-title detection. Set `HMAC_SECRET` in `.env` for stable hashes:
```
HMAC_SECRET=some_long_secret_value
```
- The schema no longer indexes the raw `fileBinaryData` Buffer. Instead we use compound unique indexes:
  - `{ userId: 1, fileHash: 1 }` (unique)
  - `{ userId: 1, titleHash: 1 }` (unique)

- `GET /api/documents` returns metadata only (it excludes `fileBinaryData` to save bandwidth/memory). Use `GET /api/documents/:id/download` to download the file bytes (the route checks ownership and streams a small Buffer; for large files switch to GridFS/S3).

### Recommended env vars for production / staging
- `HMAC_SECRET` — deterministic HMAC key for title hashing (do not change once data exists)
- `JWT_SECRET` — used for signing/verifying production JWTs
- `DEV_AUTH` / `DEV_CURRENT_USER_ID` — dev-only helpers; keep disabled in prod

### Notes
- We consolidated schema index definitions using `DocumentSchema.index(...)` so all indexes are declared in one place (avoids duplicate index warnings from Mongoose).
- If you change hashing secrets after uploading data you may encounter uniqueness collisions; keep `HMAC_SECRET` stable across deployments or re-hash/migrate data.


### Erklaerung der Variablen
| Variable     | Beschreibung                                               |
| ------------ | ---------------------------------------------------------- |
| `MONGO_USER` | MongoDB Root-Benutzername                                  |
| `MONGO_PASS` | MongoDB Root-Passwort                                      |
| `MONGO_DB`   | Name der Datenbank für PaperTrail                          |
| `MONGO_PORT` | Port, auf dem MongoDB läuft                                |
| `MONGO_HOST` | Hostname für die Verbindung (z. B. `host.docker.internal`) |
| `PORT`       | Port, auf dem der PaperTrail-Backend-Service läuft         |

### Nutzung

Docker Compose starten: 
```bash
docker compose up -d
```
Backend starten:
```bash
npm install && npm run dev
```
Zugriff auf Mongo Express: http://localhost:8081

### Zusammenfassung - Nutzung

- MongoDB läuft mit persistenter Speicherung und Admin-Benutzer

- Mongo Express bietet Web-GUI für Datenbank-Management

- Environment-Variablen konfigurieren DB-Zugang und Backend-Port

- Docker-Setup ist einfach startklar und wiederholbar


### Abhaengigkeiten Dependencies

Das PaperTrail-Projekt verwendet folgende Node.js-Pakete:

| Paket       | Version      | Beschreibung |
|------------|-------------|-------------|
| `express`  | ^5.1.0      | Web-Framework für den Backend-Server, Routing und Middleware |
| `mongoose` | ^8.19.0     | ODM für MongoDB, zum Modellieren von Dokumenten und Verwaltung der DB-Verbindungen |
| `cors`     | ^2.8.5      | Aktiviert Cross-Origin Resource Sharing, um API-Zugriffe von anderen Domains zu erlauben |
| `dotenv`   | ^17.2.3     | Lädt Umgebungsvariablen aus einer `.env`-Datei |
| `multer`   | ^2.0.2      | Middleware für den Umgang mit Datei-Uploads in Express |


- Alle Abhängigkeiten installieren: npm install

- Backend starten: npm run dev

- Ports und DB-Zugang über .env konfigurieren

### Hinweise zur Nutzung

**1.Installation aller Abhängigkeiten**

```bash
npm install
```


**2.Start des Backend-Servers**
```bash
npm run dev
```

- Der Server läuft auf dem in der .env Datei definierten PORT (z. B. 4000).

- MongoDB-Verbindung erfolgt über die in .env definierten Variablen (MONGO_USER, MONGO_PASS, MONGO_DB, MONGO_HOST, MONGO_PORT).

