import Document from "../models/Document.js";
import mongoose from "mongoose";

// CREATE a new Document 

export const createDocument = async (req, res) => {
    try {
        // Get metadata from req.body and file from req.file
        const { userId, title, fileType, originalFileName, extractedFields, tags } = req.body;
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

        const doc = new Document({
            userId,
            title,
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
        // find all documents and sort them from newest to oldest
        const docs = await Document.find().sort({ uploadDate: -1 });
        // deliver all documents
        res.json({ success: true, data: docs});
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
        // if found, deliver data
        res.json({ success: true, data: doc });
    } catch (err) {
        res.status(500).json({ success:false, error: err.message });
    }
}

// UPDATE a document by ID
export const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedDoc = await Document.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedDoc) return res.status(404).json({ success: false, error: "Document not found, bruhhh" });

    res.json({ success: true, data: updatedDoc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE document by ID

export const deleteDocument = async (req,res) => {
    try {
        const { id } = req.params;
        const deletedDoc = await Document.findByIdAndDelete(id);
        
        if(!deletedDoc) {
            return res.status(404).json({ success:false, error: "Document not found, bruh" });            
        }
        res.json({ success: true, data: `Document ${id} deleted successfully.` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message});
    }
}
