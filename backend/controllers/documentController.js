import Document from "../models/Document.js";
import Folder from "../models/Folder.js";
import { computeFileHash, computeTitleHmac } from "../utils/hashHelpers.js";
import mongoose from "mongoose";

// CREATE a new Document 

export const createDocument = async (req, res) => {
    try {
        // Get metadata from req.body and file from req.file
        let { title, fileType, originalFileName, extractedFields, tags } = req.body;
        // When requests come from multipart/form-data, some fields may be JSON strings.
        if (typeof extractedFields === 'string') {
            try { extractedFields = JSON.parse(extractedFields); } catch (e) { /* leave as string - validation will catch */ }
        }
        if (typeof tags === 'string') {
            try { tags = JSON.parse(tags); } catch (e) { tags = tags.split(',').map(t => t.trim()).filter(Boolean); }
        }
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
                // If a folderId was provided, validate it belongs to the owner and fetch name for legacy `folder` field.
                let resolvedFolderName = undefined;
                let folderIdVal = req.body && req.body.folderId;
                if (folderIdVal) {
                    if (!mongoose.Types.ObjectId.isValid(folderIdVal)) return res.status(400).json({ success: false, error: "Invalid folderId" });
                    const folderDoc = await Folder.findById(folderIdVal);
                    if (!folderDoc) return res.status(400).json({ success: false, error: "Folder not found" });
                    if (folderDoc.userId.toString() !== ownerId.toString()) return res.status(403).json({ success: false, error: "Folder not owned by you" });
                    resolvedFolderName = folderDoc.name;
                }

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
            folderId: folderIdVal || null,
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

                // Optional filter: folderId (only documents in that folder)
                const { folderId } = req.query;
                const filter = { userId: ownerId };
                // pagination params
                const page = parseInt(req.query.page) || 1;
                const pageSize = parseInt(req.query.pageSize || req.query.limit) || null;
                const skip = pageSize ? (page - 1) * pageSize : null;

                if (folderId) {
                    if (!mongoose.Types.ObjectId.isValid(folderId)) return res.status(400).json({ success: false, error: "Invalid folderId" });
                    // Ensure folder belongs to user
                    const folderDoc = await Folder.findById(folderId);
                    if (!folderDoc) return res.status(400).json({ success: false, error: "Folder not found" });
                    if (folderDoc.userId.toString() !== ownerId.toString()) return res.status(403).json({ success: false, error: "Folder not owned by you" });
                    filter.folderId = folderId;
                }

                // Apply pagination when requested
                if (pageSize) {
                    const totalCount = await Document.countDocuments(filter);
                    const docs = await Document.find(filter).select('-fileBinaryData').sort({ createdAt: -1 }).skip(skip).limit(pageSize);
                    return res.json({ success: true, data: docs, meta: { totalCount, page, pageSize } });
                }

                // Default: return full list (unpaginated)
                const docs = await Document.find(filter).select('-fileBinaryData').sort({ createdAt: -1 });
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
        // exclude binary data for metadata responses
        const doc = await Document.findById(id).select('-fileBinaryData');
        // if not found, return 404
        if (!doc) return res.status(404).json({ success:false, error: "Document not found." });
        // verify ownership
        const ownerId = req.user && req.user.id;
        if (!ownerId) return res.status(401).json({ success: false, error: "Missing authenticated user, Bruh" });
        if (doc.userId && doc.userId.toString() !== ownerId.toString()) return res.status(403).json({ success: false, error: "Forbidden" });

                // if found and owned, deliver data (binary excluded above)
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

                // If folderId is being set/changed, validate ownership
                if (allowed.folderId) {
                    const folderIdVal = allowed.folderId;
                    if (!mongoose.Types.ObjectId.isValid(folderIdVal)) return res.status(400).json({ success: false, error: "Invalid folderId" });
                    const folderDoc = await Folder.findById(folderIdVal);
                    if (!folderDoc) return res.status(400).json({ success: false, error: "Folder not found" });
                    if (folderDoc.userId.toString() !== ownerId.toString()) return res.status(403).json({ success: false, error: "Folder not owned by you" });
                }

                Object.assign(doc, allowed);
        await doc.save();
                        // avoid returning binary data in update response
                        const out = doc.toObject ? doc.toObject() : doc;
                        if (out.fileBinaryData) delete out.fileBinaryData;
                        res.json({ success: true, data: out });
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
