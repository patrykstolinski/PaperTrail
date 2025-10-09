//------------------ Load environment variables from .env
import "dotenv/config";

//------------------ Imports
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

//------------------ import routes
import documentRoutes from "./backend/routes/documents.js";

//------------------ initialise Express App
const app = express();

//------------------ Middleware
app.use(cors());
app.use(express.json({limit: "50mb"}));

//------------------ Get MongoDB connection info from .env
const { MONGO_USER, MONGO_PASS, MONGO_DB, MONGO_PORT, MONGO_HOST, PORT } = process.env;

//------------------ Connect to MongoDB
const mongoURI = `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`;

try {
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB. Nice.");
    // ensure indexing
    await Document.init();
} catch (err) {
    console.error("Bruh, MongoDB connection error:", err);
    process.exit(1);
}
//------------------ helper Routes 
// healthcheck
app.get("/health", (req, res) => {
    res.send("PaperTrail API running. Good job bruh.");
});

//------------------ Main routes
app.use("/api/documents", documentRoutes);

// --------- Start server ---------
const serverPort = PORT || 4000;
app.listen(serverPort, () => {
  console.log("--------------------------------------------------");
  console.log(`Server running on port ${serverPort}`);
  console.log(`Healthcheck:   http://localhost:${serverPort}/health`);
  console.log(`Documents API: http://localhost:${serverPort}/api/documents`);
  console.log(`Mongo Express: http://localhost:8081/`);
  console.log("--------------------------------------------------");
});
