//------------------ Load environment variables from .env
import "dotenv/config";

//------------------ Imports
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { GridFSBucket } from "mongodb";

//------------------ import routes
import documentRoutes from "./backend/routes/documents.js";
import folderRoutes from "./backend/routes/folders.js";
import searchRoutes from "./backend/routes/search.js";

//------------------ initialise Express App
const app = express();

//------------------ Import Middleware
// Logging middleware
import morgan from "morgan";
// global error handler
import errorHandler from "./backend/middleware/errorHandler.js";
// Not Found Middleware
import notFound from "./backend/middleware/notFound.js";
// upload error handling middleware
import handleUploadErrors from "./backend/middleware/handleUploadErrors.js";

// Enable CORS for frontend (optionally configure origin)
app.use(cors());

// Parse JSON bodies
app.use(express.json({limit: "50mb"}));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

//use logger middleware
app.use(morgan("dev"));



//------------------ Get MongoDB connection info from .env
const { MONGO_USER, MONGO_PASS, MONGO_DB, MONGO_PORT, MONGO_HOST, PORT } = process.env;

// Validate required Mongo environment variables early and fail fast with a clear message
const missing = [];
if (!MONGO_HOST) missing.push('MONGO_HOST');
if (!MONGO_PORT) missing.push('MONGO_PORT');
if (!MONGO_DB) missing.push('MONGO_DB');
if (!MONGO_USER) missing.push('MONGO_USER');
if (!MONGO_PASS) missing.push('MONGO_PASS');
if (missing.length) {
    console.error('Missing required Mongo environment variables:', missing.join(', '));
    console.error('Please set these in your .env or CI environment. Example keys: MONGO_HOST, MONGO_PORT, MONGO_DB, MONGO_USER, MONGO_PASS');
    process.exit(1);
}

//------------------ Connect to MongoDB
const mongoURI = `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`;

// GridFS bucket for storing thumbnails
let gridFSBucket;

try {
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB. Nice.");
    
    // Initialize GridFS bucket after connection
    gridFSBucket = new GridFSBucket(mongoose.connection.db, {
        bucketName: 'thumbnails'
    });
    console.log("GridFS bucket 'thumbnails' initialized.");
} catch (err) {
    console.error("Bruh, MongoDB connection error:", err);
    process.exit(1);
}

// Export gridFSBucket for use in controllers
export { gridFSBucket };
//------------------ helper Routes 
// healthcheck
app.get("/health", (req, res) => {
    res.send("PaperTrail API running. Good job bruh.");
});

//------------------ Main routes

app.use("/api/search", searchRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/folders", folderRoutes);

// Handle upload errors (Multer) - register after routes so it can catch errors
app.use(handleUploadErrors);

// Catch-all for unmatched routes (404)
app.use(notFound);

// Global error handler (must be after all routes)
app.use(errorHandler);

// --------- Start server ---------
const serverPort = PORT || 4000;
app.listen(serverPort, () => {
  console.log("--------------------------------------------------");
  console.log(`Server running on port ${serverPort}`);
  console.log(`Healthcheck:   http://localhost:${serverPort}/health`);
  console.log(`Search API:    http://localhost:${serverPort}/api/search`);
  console.log(`Documents API: http://localhost:${serverPort}/api/documents`);
  console.log(`Folders API:   http://localhost:${serverPort}/api/folders`);
  console.log(`Mongo Express: http://localhost:8081/`);
  console.log("--------------------------------------------------");
});
