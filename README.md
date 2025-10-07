# PaperTrail
a browser-first platform that lets people aggregate, organize, and manage all life paperwork and admin (insurance letters, credit contracts, warranties, etc.) in one place. It allows scanning or photo upload of documents, highlighter-based surgical OCR for field extraction. 

# PaperTrail
A browser-first platform that lets people aggregate, organize, and manage all life paperwork and admin (insurance letters, credit contracts, warranties, etc.) in one place. It allows scanning or photo upload of documents, highlighter-based surgical OCR for field extraction.

## Inhaltsverzeichnis
- [To start](#to-start)
- [Testing Method](#testing-method)
- [PaperTrail - Document Schema](#papertrail---document-schema)
- [Übersicht](#uebersicht)
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

# To start
**1. Create a .env file with:**
- MONGO_USER=papertrailAdmin
- MONGO_PASS=papertrailPass
- MONGO_DB=papertrail
- MONGO_PORT=27017
- MONGO_HOST=host.docker.internal
- PORT=4000

**2. npm install**  
**3. docker compose up -d**  
**4. npm run dev**

---

## Testing Method
--------- POST ---------  
Endpoint: http://localhost:4000/documents

**To send a test document, go into the main folder of the project and run:**

```javascript
node backend/tests/testDocumentModel.js

const testDoc = new Document({
  originalFileName: "Hier kommt der Originalname der Datei", // optional ✅
  fileType: "Hier kommt der Dateityp (Pflichtfeld) ⚠️",     // Pflichtfeld
  title: "Hier kommt der sichtbare Titel auf dem Dashboard (Pflichtfeld) ⚠️", // Pflichtfeld
  extractedFields: "Hier kommen theoretische Extrafelder, z.B. Kundennummer, Rechnungsbeträge usw.", // optional ✅
  tags: "" // optional ✅
});

PaperTrail - Document Schema

Dieses Dokument beschreibt das Mongoose-Schema für Document in der PaperTrail-App.

Übersicht

MongoDB collection: documents

Mongoose model: Document

timestamps: true → automatisch createdAt und updatedAt

strict: false → erlaubt Felder, die nicht explizit definiert sind

Feldübersicht
Feldname	Typ	Pflichtfeld	Beschreibung
originalFileName	String	⚠️ Pflicht	Originalname der hochgeladenen Datei
fileType	String	⚠️ Pflicht	Dateityp, z. B. PDF, PNG, DOCX
title	String	optional	Sichtbarer Titel auf dem Dashboard
uploadDate	Date	optional	Datum des Uploads, Standard: jetzt
ocrDate	Date	optional	Datum der OCR-Verarbeitung
extractedFields	Object	optional	Dynamische Felder aus OCR oder manuell
tags	[String]	optional	Schlagwörter für das Dokument
ownerId	ObjectId	optional	Referenz auf den User, der das Dokument besitzt
status	String	optional	Workflow-Status: "uploaded", "processing", "review", "completed", "archived"
Indizes

Textindizes: title, tags, originalFileName → für Volltextsuche

Sortierindizes: uploadDate (absteigend), ocrDate (absteigend), fileType, status, ownerId

Beispiel-Dokument

const testDoc = new Document({
  originalFileName: "rechnung_2025.pdf",
  fileType: "PDF",
  title: "Rechnung August 2025",
  uploadDate: new Date(),
  ocrDate: new Date(),
  extractedFields: { kundennummer: "12345", rechnungsbetrag: 499.99 },
  tags: ["rechnung", "kunden123"],
  ownerId: someUserId,
  status: "uploaded"
});

PaperTrail - Docker Setup

Dieses Docker-Setup startet MongoDB und die Mongo Express GUI für PaperTrail.
Es verwendet docker-compose zur einfachen Orchestrierung der Services.

Services
MongoDB

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
Beschreibung

Persistentes Volume: mongo-pt-data:/data/db

Container startet automatisch: restart: always

Mongo Express (Web-GUI)

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
Volumes
volumes:
  mongo-pt-data:

Verwendung

Environment-Datei erstellen (.env)

Docker Compose starten: docker-compose up -d

Zugriff auf Mongo Express: http://localhost:8081

Zusammenfassung - Verwendung

MongoDB läuft persistent

Mongo Express Web-GUI verfügbar

Setup ist wiederholbar

Environment - Variablen
MONGO_USER=papertrailAdmin
MONGO_PASS=papertrailPass
MONGO_DB=papertrail
MONGO_PORT=27017
MONGO_HOST=host.docker.internal
PORT=4000

Erklärung der Variablen
Variable	Beschreibung
MONGO_USER	MongoDB Root-Benutzername
MONGO_PASS	MongoDB Root-Passwort
MONGO_DB	Name der Datenbank
MONGO_PORT	Port für MongoDB
MONGO_HOST	Hostname für Verbindung
PORT	Backend-Port
Nutzung

Docker Compose starten: docker compose up -d

Backend starten: npm install && npm run dev

Zugriff auf Mongo Express: http://localhost:8081

Abhängigkeiten (Dependencies)
Paket	Version	Beschreibung
express	^5.1.0	Web-Framework
mongoose	^8.19.0	ODM für MongoDB
cors	^2.8.5	Cross-Origin Resource Sharing
dotenv	^17.2.3	Umgebungsvariablen
multer	^2.0.2	Middleware für Datei-Uploads
Hinweise zur Nutzung

Alle Abhängigkeiten installieren: npm install

Backend starten: npm run dev

Ports und DB-Zugang über .env konfigurieren