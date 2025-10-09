import express from "express";

// import functions to do stuff to the document
import { createDocument, getAllDocuments, getDocumentById, updateDocument, deleteDocument } from "../controllers/documentController.js";


//------------------ Import Middleware
import upload from "../middleware/upload.js";
import { validateObjectId } from "../middleware/validateObjectId.js";
import { validateRequiredFields } from "../middleware/validateRequiredFields.js";

const router = express.Router();

//POST /api/documents

router.post(
	"/",
	upload.single("file"),
	validateRequiredFields(["userId", "title"]),
	createDocument
);

//GET /api/documents
router.get("/", getAllDocuments);

//GET /api/documents/:id
router.get("/:id", validateObjectId, getDocumentById);

//PUT /api/documents/:id
router.put("/:id", validateObjectId, updateDocument);

//DELETE /api/documents/:id
router.delete("/:id", validateObjectId, deleteDocument);

export default router;