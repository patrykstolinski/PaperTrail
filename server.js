// Load environment variables from .env
import "dotenv/config";

import express from "express";
import mongoose from "mongoose";
import cors from "cors";

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Get MongoDB connection info from .env
const { MONGO_USER, MONGO_PASS, MONGO_DB, MONGO_PORT, MONGO_HOST, PORT } = process.env;

// Connect to MongoDB
const mongoURI = `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`;

mongoose
  .connect(mongoURI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ------------------ Schema & Model 

const documentSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  tags: [String],
  createdAt: { type: Date, default: Date.now },
});

const Document = mongoose.model("Document", documentSchema);

// ------------------ Routes 

// --------- Health check ---------
// --------- GET ---------
app.get("/health", (req, res) => {
  res.send("PaperTrail API running");
});
// --------- List all documents ---------
app.get("/documents", async (req, res) => {
  try {
    const docs = await Document.find().sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// --------- POST ---------
// Create a dummy document
app.post("/documents", async (req, res) => {
  try {
    const doc = new Document({
      filename: "demo.pdf",
      originalName: "demo.pdf",
      tags: ["test"],
    });
    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: "Failed to save document" });
  }
});

// --------- Start server ---------
const serverPort = PORT;
app.listen(serverPort, () => {
  console.log(`Server: Healthcheck: http://localhost:${serverPort}/health`);
  console.log(`Server running on port ${serverPort}, fucking finally`);
  console.log(`Database Dashboard: http://localhost:8081/`);
}
);
