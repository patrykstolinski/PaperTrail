import express from "express";

// import functions to do stuff to the document
import { 
    createDocument, 
    getAllDocuments, 
    getDocumentById, 
    updateDocument, 
    deleteDocument, 
    downloadDocumentFile,
    getDocumentPages,
    getPageThumbnail
} from "../controllers/documentController.js";


//------------------ Import Middleware
import upload, { flexibleUpload } from "../middleware/upload.js";
import { validateObjectId } from "../middleware/validateObjectId.js";
import { validateRequiredFields } from "../middleware/validateRequiredFields.js";
import auth from "../middleware/auth.js";

const router = express.Router();

//POST /api/documents

router.post(
	"/",
	auth,
	flexibleUpload, // Support both "file" (singular) and "files" (plural)
	validateRequiredFields(["title"]), // userId is set from req.user
	createDocument
);

//GET /api/documents
router.get("/", auth, getAllDocuments);

//GET /api/documents/:id
router.get("/:id", auth, validateObjectId, getDocumentById);

//GET /api/documents/:id/download
router.get("/:id/download", auth, validateObjectId, downloadDocumentFile);

//GET /api/documents/:id/pages
router.get("/:id/pages", auth, validateObjectId, getDocumentPages);

//GET /api/documents/:id/pages/:pageNum/thumbnail
router.get("/:id/pages/:pageNum/thumbnail", auth, validateObjectId, getPageThumbnail);

//PUT /api/documents/:id
router.put("/:id", auth, validateObjectId, updateDocument);

//DELETE /api/documents/:id
router.delete("/:id", auth, validateObjectId, deleteDocument);

export default router;