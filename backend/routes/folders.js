import express from "express";
import auth from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validateObjectId.js";
import { createFolder, listFolders, getFolderById, updateFolder, deleteFolder, } from "../controllers/folderController.js";

const router = express.Router();

// All folder routes require authentication
router.use(auth);

// Create
router.post("/", createFolder);

// List (optional query parentId)
router.get("/", listFolders);

// Read, Update, Delete by ID
router.get("/:id", validateObjectId, getFolderById);
router.put("/:id", validateObjectId, updateFolder);
router.delete("/:id", validateObjectId, deleteFolder);

export default router;
