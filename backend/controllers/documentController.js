import Document from "../models/Document.js";
import mongoose from "mongoose";

// CREATE a new Document 
export const createDocument = async (req,res) => {

    try{
        // deconstruct the request body
        const { userId, title, fileType, originalFileName, extractedFields, tags, fileBinaryData } = req.body;  
        
        // Decode the bytes of the file into something usable 
        const fileBuffer = Buffer.from(fileBinaryData, "base64");
        // Assume required fields are validated by middleware
        
        const doc = new Document({
            userId,
            title,
            fileType,
            originalFileName,
            fileBinaryData: fileBuffer,
            extractedFields: extractedFields || {},
            tags: tags || [],
        });
        // save the file
        await doc.save();
        // return OK and saved file 
        res.status(201).json({ success: true, data:doc});
    } catch (err) {
        console.error("Error creating the document", err);
        res.status(500).json({ success: false, error: err.message});
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
