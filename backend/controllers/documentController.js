import Document from "../models/Document.js";
import { computeFileHash, computeTitleHmac } from "../utils/hashHelpers.js";
import mongoose from "mongoose";

// CREATE a new Document 

export const createDocument = async (req, res) => {
    try {
        // Get metadata from req.body and file from req.file
        const { title, fileType, originalFileName, extractedFields, tags } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ success: false, error: "No file uploaded." });
        }

        // Log file details before saving
        console.log('File details:', {
            originalSize: file.size,
            bufferSize: file.buffer.length,
            mimetype: file.mimetype,
            originalName: file.originalname
        });

        // enforce ownership from authenticated user
        const ownerId = req.user && req.user.id;
        if (!ownerId) return res.status(401).json({ success: false, error: "Missing authenticated user" });

    // Salt the file hash with ownerId so identical files uploaded by different users
    // won't collide in the global hash space. This preserves per-user dedupe behavior.
    const fileHash = computeFileHash(file.buffer, ownerId);
        const titleHash = computeTitleHmac(title);

        const doc = new Document({
            userId: ownerId,
            title,
            titleHash,
            fileHash,
            fileType: file.mimetype || fileType,
            originalFileName: file.originalname || originalFileName,
            fileBinaryData: file.buffer,
            fileSize: file.size,
            extractedFields: extractedFields || {},
            tags: tags || [],
        });
        await doc.save();
        res.status(201).json({ success: true, id: doc._id });
    } catch (err) {
        if (err.code === 11000) {
            if (err.message && err.message.includes('unique_title_per_user')) {
                res.status(400).json({ success: false, error: "Duplicate title: You have already uploaded a document with this title. Bruh." });
                return;
            }
            if (err.message && err.message.includes('unique_file_per_user')) {
                res.status(400).json({ success: false, error: "Duplicate file: You have already uploaded this file. Bruh." });
                return;
            }
        }
        console.error("Error creating the document", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// READ all documents
export const getAllDocuments = async (req, res) => {
    try {
        // scope to authenticated user only
        const ownerId = req.user && req.user.id;
        if (!ownerId) return res.status(401).json({ success: false, error: "Missing authenticated user, Bruhhhh" });

        // find documents for this user and sort by newest->oldest
        // exclude binary data from the listing response to save bandwidth/memory
        const docs = await Document.find({ userId: ownerId }).select('-fileBinaryData').sort({ uploadDate: -1 });
        res.json({ success: true, data: docs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
// READ document by ID
export const getDocumentById = async (req, res) => {
    try {
        // ID from parameters
        const { id } = req.params;
        // find document with that ID
        const doc = await Document.findById(id);
        // if not found, return 404
        if (!doc) return res.status(404).json({ success:false, error: "Document not found." });
        // verify ownership
        const ownerId = req.user && req.user.id;
        if (!ownerId) return res.status(401).json({ success: false, error: "Missing authenticated user, Bruh" });
        if (doc.userId && doc.userId.toString() !== ownerId.toString()) return res.status(403).json({ success: false, error: "Forbidden" });

                // if found and owned, deliver data (exclude binary by default)
                res.json({ success: true, data: doc });
    } catch (err) {
        res.status(500).json({ success:false, error: err.message });
    }
}

// DOWNLOAD file bytes for a document (auth + ownership verified)
export const downloadDocumentFile = async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await Document.findById(id);
        if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
        const ownerId = req.user && req.user.id;
        if (!ownerId) return res.status(401).json({ success: false, error: 'Missing authenticated user' });
        if (doc.userId && doc.userId.toString() !== ownerId.toString()) return res.status(403).json({ success: false, error: 'Forbidden' });

        res.setHeader('Content-Type', doc.fileType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${doc.originalFileName || 'file'}"`);
        // send buffer (okay for small files); for large files use GridFS or streaming
        res.send(doc.fileBinaryData);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// UPDATE a document by ID
export const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;

        // ensure document exists and is owned by requester
        const doc = await Document.findById(id);
        if (!doc) return res.status(404).json({ success: false, error: "Document not found, bruhhh" });
        const ownerId = req.user && req.user.id;
        if (!ownerId) return res.status(401).json({ success: false, error: "Missing authenticated user" });
        if (doc.userId && doc.userId.toString() !== ownerId.toString()) return res.status(403).json({ success: false, error: "Forbidden" });

        // apply updates (note: do not allow changing userId)
        const allowed = { ...req.body };
        delete allowed.userId;

        Object.assign(doc, allowed);
        await doc.save();
        res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE document by ID

export const deleteDocument = async (req,res) => {
    try {
        const { id } = req.params;
        // ensure exists and owned
        const doc = await Document.findById(id);
        if (!doc) return res.status(404).json({ success:false, error: "Document not found, bruh" });
        const ownerId = req.user && req.user.id;
        if (!ownerId) return res.status(401).json({ success: false, error: "Missing authenticated user" });
        if (doc.userId && doc.userId.toString() !== ownerId.toString()) return res.status(403).json({ success: false, error: "Forbidden" });

        await doc.deleteOne();
        res.json({ success: true, data: `Document ${id} deleted successfully.` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message});
    }
}
