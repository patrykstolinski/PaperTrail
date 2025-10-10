import express from "express";

// import functions to do stuff to the document
import { createDocument, getAllDocuments, getDocumentById, updateDocument, deleteDocument, downloadDocumentFile } from "../controllers/documentController.js";


//------------------ Import Middleware
import upload from "../middleware/upload.js";
import { validateObjectId } from "../middleware/validateObjectId.js";
import { validateRequiredFields } from "../middleware/validateRequiredFields.js";
import auth from "../middleware/auth.js";

const router = express.Router();

//POST /api/documents

router.post(
	"/",
	auth,
	upload.single("file"),
	validateRequiredFields(["title"]), // userId is set from req.user
	createDocument
);

//GET /api/documents
router.get("/", auth, getAllDocuments);

//GET /api/documents/:id
router.get("/:id", auth, validateObjectId, getDocumentById);

//GET /api/documents/:id/download
router.get("/:id/download", auth, validateObjectId, downloadDocumentFile);

//PUT /api/documents/:id
router.put("/:id", auth, validateObjectId, updateDocument);

//DELETE /api/documents/:id
router.delete("/:id", auth, validateObjectId, deleteDocument);

export default router;