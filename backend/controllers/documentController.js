import Document from "../models/Document.js";
import Folder from "../models/Folder.js";
import { computeFileHash, computeTitleHmac } from "../utils/hashHelpers.js";
import mongoose from "mongoose";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { gridFSBucket } from "../../server.js";
import { convert } from "pdf-poppler";
import fs from "fs";
import path from "path";
import os from "os";

// CREATE a new Document 

export const createDocument = async (req, res) => {
    try {
        // Get metadata from req.body and file(s) from req.files
        let { title, fileType, originalFileName, extractedFields, tags } = req.body;
        
        // When requests come from multipart/form-data, some fields may be JSON strings.
        if (typeof extractedFields === 'string') {
            try { extractedFields = JSON.parse(extractedFields); } catch (e) { /* leave as string - validation will catch */ }
        }
        if (typeof tags === 'string') {
            try { tags = JSON.parse(tags); } catch (e) { tags = tags.split(',').map(t => t.trim()).filter(Boolean); }
        }
        
        // multer.any() always puts files in req.files array (regardless of field name)
        const files = req.files || [];
        
        if (files.length === 0) {
            return res.status(400).json({ success: false, error: "No file uploaded." });
        }

        // enforce ownership from authenticated user
        const ownerId = req.user && req.user.id;
        if (!ownerId) return res.status(401).json({ success: false, error: "Missing authenticated user" });

        // If a folderId was provided, validate it belongs to the owner
        let folderIdVal = req.body && req.body.folderId;
        if (folderIdVal) {
            if (!mongoose.Types.ObjectId.isValid(folderIdVal)) return res.status(400).json({ success: false, error: "Invalid folderId" });
            const folderDoc = await Folder.findById(folderIdVal);
            if (!folderDoc) return res.status(400).json({ success: false, error: "Folder not found" });
            if (folderDoc.userId.toString() !== ownerId.toString()) return res.status(403).json({ success: false, error: "Folder not owned by you" });
        }

        // For multiple images: combine them into a single document
        // For single PDF: process as multi-page document
        // For single image: process as single-page document
        let combinedBuffer;
        let finalMimeType;
        let finalOriginalName;
        
        if (files.length === 1) {
            // Single file (PDF or image)
            combinedBuffer = files[0].buffer;
            finalMimeType = files[0].mimetype;
            finalOriginalName = files[0].originalname;
            
            console.log('File details:', {
                originalSize: files[0].size,
                bufferSize: files[0].buffer.length,
                mimetype: files[0].mimetype,
                originalName: files[0].originalname
            });
        } else {
            // Multiple images: treat as multi-page document
            // All files must be images
            const allImages = files.every(f => f.mimetype === 'image/png' || f.mimetype === 'image/jpeg');
            if (!allImages) {
                return res.status(400).json({ 
                    success: false, 
                    error: "Multiple file upload only supported for images. Mix of file types not allowed." 
                });
            }
            
            // Store first file as main binary (for backward compatibility)
            // We'll generate pages from all files
            combinedBuffer = files[0].buffer;
            finalMimeType = 'image/jpeg'; // Mark as multi-image document
            finalOriginalName = `${files.length} images`;
            
            console.log(`Processing ${files.length} images as multi-page document`);
        }

        const fileHash = computeFileHash(combinedBuffer, ownerId);
        const titleHash = computeTitleHmac(title);

        // Generate thumbnails and page metadata based on file type(s)
        const pages = await generatePageThumbnails(files);

        const doc = new Document({
            userId: ownerId,
            title,
            titleHash,
            fileHash,
            fileType: finalMimeType || fileType,
            originalFileName: finalOriginalName || originalFileName,
            fileBinaryData: combinedBuffer,
            fileSize: files.reduce((sum, f) => sum + f.size, 0),
            extractedFields: extractedFields || {},
            tags: tags || [],
            folderId: folderIdVal || null,
            pages: pages,
        });
        await doc.save();
        
        console.log(`Document created with ${pages.length} page(s) and thumbnails`);
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

// GET pages metadata for a document
export const getDocumentPages = async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await Document.findById(id).select('pages userId');
        if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
        
        // Verify ownership
        const ownerId = req.user && req.user.id;
        if (!ownerId) return res.status(401).json({ success: false, error: 'Missing authenticated user' });
        if (doc.userId && doc.userId.toString() !== ownerId.toString()) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        // Return pages array with metadata (no binary data)
        res.json({ 
            success: true, 
            data: {
                pages: doc.pages || [],
                totalPages: doc.pages ? doc.pages.length : 0
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// GET thumbnail for a specific page
export const getPageThumbnail = async (req, res) => {
    try {
        const { id, pageNum } = req.params;
        const pageNumber = parseInt(pageNum);
        
        if (isNaN(pageNumber) || pageNumber < 1) {
            return res.status(400).json({ success: false, error: 'Invalid page number' });
        }
        
        const doc = await Document.findById(id).select('pages userId');
        if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
        
        // Verify ownership
        const ownerId = req.user && req.user.id;
        if (!ownerId) return res.status(401).json({ success: false, error: 'Missing authenticated user' });
        if (doc.userId && doc.userId.toString() !== ownerId.toString()) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        // Find the requested page
        const page = doc.pages.find(p => p.pageNumber === pageNumber);
        if (!page) {
            return res.status(404).json({ success: false, error: 'Page not found' });
        }
        
        if (!page.thumbnailGridFS) {
            return res.status(404).json({ success: false, error: 'Thumbnail not available for this page' });
        }

        // Stream thumbnail from GridFS
        const downloadStream = gridFSBucket.openDownloadStream(page.thumbnailGridFS);
        
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        
        downloadStream.on('error', (err) => {
            console.error('GridFS download error:', err);
            res.status(404).json({ success: false, error: 'Thumbnail not found in storage' });
        });
        
        downloadStream.pipe(res);
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

/**
 * Generate thumbnails for all pages of a document
 * Handles: single PDF (multi-page), single image, multiple images
 * @param {Array} files - Array of multer file objects
 * @returns {Promise<Array>} Array of page metadata objects with thumbnailGridFS IDs
 */
async function generatePageThumbnails(files) {
    const pages = [];
    
    try {
        if (files.length === 1 && files[0].mimetype === 'application/pdf') {
            // Handle multi-page PDF
            const fileBuffer = files[0].buffer;
            const pdfDoc = await PDFDocument.load(fileBuffer);
            const pageCount = pdfDoc.getPageCount();
            
            console.log(`Processing ${pageCount}-page PDF...`);
            
            // Create temp directory for PDF conversion
            const tempDir = path.join(os.tmpdir(), `pdf-${Date.now()}`);
            fs.mkdirSync(tempDir, { recursive: true });
            
            try {
                // Write PDF to temp file
                const tempPdfPath = path.join(tempDir, 'input.pdf');
                fs.writeFileSync(tempPdfPath, fileBuffer);
                
                // Convert PDF pages to PNG images using pdf-poppler
                const opts = {
                    format: 'png',
                    out_dir: tempDir,
                    out_prefix: 'page',
                    page: null // Convert all pages
                };
                
                await convert(tempPdfPath, opts);
                
                // Process each converted page image
                for (let i = 0; i < pageCount; i++) {
                    try {
                        const pageImagePath = path.join(tempDir, `page-${i + 1}.png`);
                        
                        if (fs.existsSync(pageImagePath)) {
                            const pageImageBuffer = fs.readFileSync(pageImagePath);
                            
                            // Generate thumbnail from the PNG
                            const thumbnailBuffer = await sharp(pageImageBuffer)
                                .resize(300, 400, {
                                    fit: 'inside',
                                    withoutEnlargement: true,
                                })
                                .jpeg({ quality: 85 })
                                .toBuffer();
                            
                            // Store thumbnail in GridFS
                            const thumbnailId = await storeThumbnailInGridFS(thumbnailBuffer, `page-${i + 1}.jpg`);
                            
                            pages.push({
                                pageNumber: i + 1,
                                thumbnailGridFS: thumbnailId,
                                extractedFields: {},
                                ocrText: '',
                            });
                            
                            console.log(`Generated thumbnail for PDF page ${i + 1}/${pageCount}`);
                        } else {
                            console.error(`Page image not found: ${pageImagePath}`);
                            pages.push({
                                pageNumber: i + 1,
                                thumbnailGridFS: null,
                                extractedFields: {},
                                ocrText: '',
                            });
                        }
                    } catch (pageErr) {
                        console.error(`Failed to generate thumbnail for page ${i + 1}:`, pageErr.message);
                        pages.push({
                            pageNumber: i + 1,
                            thumbnailGridFS: null,
                            extractedFields: {},
                            ocrText: '',
                        });
                    }
                }
            } finally {
                // Clean up temp directory
                try {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                } catch (cleanupErr) {
                    console.error('Failed to cleanup temp directory:', cleanupErr.message);
                }
            }
        } else if (files.every(f => f.mimetype === 'image/png' || f.mimetype === 'image/jpeg')) {
            // Handle single or multiple images
            console.log(`Processing ${files.length} image(s)...`);
            
            for (let i = 0; i < files.length; i++) {
                try {
                    const fileBuffer = files[i].buffer;
                    
                    // Generate thumbnail from image
                    const thumbnailBuffer = await sharp(fileBuffer)
                        .resize(300, 400, {
                            fit: 'inside',
                            withoutEnlargement: true,
                        })
                        .jpeg({ quality: 85 })
                        .toBuffer();
                    
                    // Store thumbnail in GridFS
                    const thumbnailId = await storeThumbnailInGridFS(thumbnailBuffer, `page-${i + 1}.jpg`);
                    
                    pages.push({
                        pageNumber: i + 1,
                        thumbnailGridFS: thumbnailId,
                        extractedFields: {},
                        ocrText: '',
                    });
                    
                    console.log(`Generated thumbnail for image ${i + 1}/${files.length}`);
                } catch (imgErr) {
                    console.error(`Failed to generate thumbnail for image ${i + 1}:`, imgErr.message);
                    pages.push({
                        pageNumber: i + 1,
                        thumbnailGridFS: null,
                        extractedFields: {},
                        ocrText: '',
                    });
                }
            }
        } else {
            console.warn(`Unsupported file type(s) for thumbnails`);
        }
    } catch (err) {
        console.error('Error generating page thumbnails:', err);
        // Return empty array if thumbnail generation fails completely
    }
    
    return pages;
}

/**
 * Store a thumbnail in GridFS
 * @param {Buffer} thumbnailBuffer - Thumbnail image data (JPEG)
 * @param {string} filename - Filename for the thumbnail
 * @returns {Promise<ObjectId>} GridFS file ID
 */
async function storeThumbnailInGridFS(thumbnailBuffer, filename) {
    return new Promise((resolve, reject) => {
        const uploadStream = gridFSBucket.openUploadStream(filename, {
            contentType: 'image/jpeg',
            metadata: { type: 'thumbnail' }
        });
        
        uploadStream.on('finish', () => {
            resolve(uploadStream.id);
        });
        
        uploadStream.on('error', (err) => {
            reject(err);
        });
        
        uploadStream.end(thumbnailBuffer);
    });
}
