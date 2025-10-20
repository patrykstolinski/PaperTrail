import express from "express";
import auth from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validateObjectId.js";
import { createFolder, listFolders, getFolderById, getFolderBySlug, getDocumentsInFolder, bulkMoveDocuments, updateFolder, deleteFolder, } from "../controllers/folderController.js";
import { getDocumentsInFolderBySlug } from "../controllers/folderController.js";

const router = express.Router();

// All folder routes require authentication
router.use(auth);

// Minimal listing or full listing handled by GET /
// GET by slug (user-scoped)
router.get('/slug/:slug', getFolderBySlug);

// Documents in folder shorthand
router.get('/:id/documents', validateObjectId, getDocumentsInFolder);
// documents by folder slug (user-scoped)
router.get('/slug/:slug/documents', getDocumentsInFolderBySlug);

// Bulk-move documents into specified folder
router.post('/:id/move-documents', validateObjectId, bulkMoveDocuments);

// Create
router.post("/", createFolder);

// List (optional query parentId)
router.get("/", listFolders);

// Read, Update, Delete by ID
router.get("/:id", validateObjectId, getFolderById);
router.put("/:id", validateObjectId, updateFolder);
router.delete("/:id", validateObjectId, deleteFolder);

export default router;
