import Folder from "../models/Folder.js";
import Document from "../models/Document.js";
import mongoose from "mongoose";

// CREATE a new folder
export const createFolder = async (req, res) => {
  try {
    const ownerId = req.user && req.user.id;
    if (!ownerId) return res.status(401).json({ success: false, error: "Missing authenticated user" });

      const { name, slug, description, color, parentId, metadata } = req.body;
      if (!name) return res.status(400).json({ success: false, error: "Folder name is required" });

      // Ensure case-insensitive name uniqueness per-user using nameLower
      const nameLower = String(name).toLowerCase().trim();
      const existingByNameLower = await Folder.findOne({ userId: ownerId, nameLower });
      if (existingByNameLower) return res.status(409).json({ success: false, error: "You already have a folder with that name" });

    // If parentId provided, ensure it's a valid ObjectId and belongs to the same user
    if (parentId) {
      if (!mongoose.Types.ObjectId.isValid(parentId)) return res.status(400).json({ success: false, error: "Invalid parentId" });
      const parent = await Folder.findById(parentId);
      if (!parent) return res.status(400).json({ success: false, error: "Parent folder not found" });
      if (parent.userId.toString() !== ownerId.toString()) return res.status(403).json({ success: false, error: "Parent folder not owned by you, brah" });
    }

    const folder = new Folder({
      userId: ownerId,
      name,
      slug,
      description,
      color,
      parentId: parentId || null,
      metadata: metadata || {},
    });

    await folder.save();
    res.status(201).json({ success: true, data: folder });
  } catch (err) {
    if (err.code === 11000) {
      // Determine which unique constraint failed if possible
      const msg = err.message || "Duplicate key";
      if (msg.includes('unique_folder_name_per_user')) return res.status(409).json({ success: false, error: "Folder name already exists for this user" });
      if (msg.includes('unique_folder_slug_per_user')) return res.status(409).json({ success: false, error: "Folder slug already exists for this user" });
      return res.status(409).json({ success: false, error: "Folder conflict: duplicate value" });
    }
    console.error("Error creating folder", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// LIST folders (optionally filter by parentId)
export const listFolders = async (req, res) => {
  try {
    const ownerId = req.user && req.user.id;
    if (!ownerId) return res.status(401).json({ success: false, error: "Missing authenticated user" });

    const { parentId, minimal } = req.query;
    const filter = { userId: ownerId };
    if (parentId) filter.parentId = parentId;

    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize || req.query.limit) || null;

    if (minimal && String(minimal) === 'true') {
      // Return lightweight folder list for frontend dropdowns
        // If pagination requested, use DB-level skip/limit and compute counts for the page only
        if (pageSize) {
          const totalCount = await Folder.countDocuments(filter);
          const pageFolders = await Folder.find(filter).select('name slug color parentId').sort({ name: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean();
          const ids = pageFolders.map(f => f._id);
          const counts = await Document.aggregate([
            { $match: { folderId: { $in: ids } } },
            { $group: { _id: '$folderId', count: { $sum: 1 } } }
          ]);
          const countsMap = new Map(counts.map(c => [String(c._id), c.count]));
          const minimalWithCounts = pageFolders.map(f => ({ ...f, documentCount: countsMap.get(String(f._id)) || 0 }));
          return res.json({ success: true, data: minimalWithCounts, meta: { totalCount, page, pageSize } });
        }

        // No pagination: return all minimal folders with counts
        const folders = await Folder.find(filter).select('name slug color parentId').sort({ name: 1 }).lean();
        const ids = folders.map(f => f._id);
        const counts = await Document.aggregate([
          { $match: { folderId: { $in: ids } } },
          { $group: { _id: '$folderId', count: { $sum: 1 } } }
        ]);
        const countsMap = new Map(counts.map(c => [String(c._id), c.count]));
        const minimalWithCounts = folders.map(f => ({ ...f, documentCount: countsMap.get(String(f._id)) || 0 }));
        return res.json({ success: true, data: minimalWithCounts });
    }

    // Default: return full folder objects with an added document count
  // Default: return full folder objects with an added document count
    if (pageSize) {
      const totalCount = await Folder.countDocuments(filter);
      const pageFolders = await Folder.find(filter).sort({ name: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean();
      const ids = pageFolders.map(f => f._id);
      const counts = await Document.aggregate([
        { $match: { folderId: { $in: ids } } },
        { $group: { _id: '$folderId', count: { $sum: 1 } } }
      ]);
      const countsMap = new Map(counts.map(c => [String(c._id), c.count]));
      const enriched = pageFolders.map(f => ({ ...f, documentCount: countsMap.get(String(f._id)) || 0 }));
      return res.json({ success: true, data: enriched, meta: { totalCount, page, pageSize } });
    }

    const folders = await Folder.find(filter).sort({ name: 1 }).lean();
    const ids = folders.map(f => f._id);
    const counts = await Document.aggregate([
      { $match: { folderId: { $in: ids } } },
      { $group: { _id: '$folderId', count: { $sum: 1 } } }
    ]);
    const countsMap = new Map(counts.map(c => [String(c._id), c.count]));
    const enriched = folders.map(f => ({ ...f, documentCount: countsMap.get(String(f._id)) || 0 }));
    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET folder by slug for the authenticated user
export const getFolderBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const ownerId = req.user && req.user.id;
    if (!ownerId) return res.status(401).json({ success: false, error: 'Missing authenticated user' });
    const folder = await Folder.findOne({ userId: ownerId, slug });
    if (!folder) return res.status(404).json({ success: false, error: 'Folder not found' });
    res.json({ success: true, data: folder });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET documents in folder (shorthand)
export const getDocumentsInFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user && req.user.id;
    if (!ownerId) return res.status(401).json({ success: false, error: 'Missing authenticated user' });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, error: 'Invalid folder id' });
    const folder = await Folder.findById(id);
    if (!folder) return res.status(404).json({ success: false, error: 'Folder not found' });
    if (folder.userId.toString() !== ownerId.toString()) return res.status(403).json({ success: false, error: 'Forbidden' });

    // proxy to Document listing by folderId
    // pagination support
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize || req.query.limit) || null;
    if (pageSize) {
      const totalCount = await Document.countDocuments({ userId: ownerId, folderId: id });
      const skip = (page - 1) * pageSize;
      const docs = await Document.find({ userId: ownerId, folderId: id }).select('-fileBinaryData').sort({ createdAt: -1 }).skip(skip).limit(pageSize);
      return res.json({ success: true, data: docs, meta: { totalCount, page, pageSize } });
    }

    const docs = await Document.find({ userId: ownerId, folderId: id }).select('-fileBinaryData').sort({ createdAt: -1 });
    res.json({ success: true, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Bulk move documents into this folder
export const bulkMoveDocuments = async (req, res) => {
  try {
    const { id } = req.params; // destination folder id
    const { documentIds } = req.body;
    const ownerId = req.user && req.user.id;
    if (!ownerId) return res.status(401).json({ success: false, error: 'Missing authenticated user' });
    if (!Array.isArray(documentIds) || documentIds.length === 0) return res.status(400).json({ success: false, error: 'documentIds must be a non-empty array' });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, error: 'Invalid destination folder id' });

    const folder = await Folder.findById(id);
    if (!folder) return res.status(404).json({ success: false, error: 'Destination folder not found' });
    if (folder.userId.toString() !== ownerId.toString()) return res.status(403).json({ success: false, error: 'Destination folder not owned by you' });

    // Validate ownership of documents, then update
    const objectIds = documentIds.filter(d => mongoose.Types.ObjectId.isValid(d)).map(d => mongoose.Types.ObjectId(d));
    const docs = await Document.find({ _id: { $in: objectIds } });
    // ensure all documents belong to owner
    for (const doc of docs) {
      if (doc.userId.toString() !== ownerId.toString()) return res.status(403).json({ success: false, error: `Document ${doc._id} not owned by you` });
    }

    await Document.updateMany({ _id: { $in: objectIds } }, { $set: { folderId: folder._id } });
    res.json({ success: true, data: { moved: docs.length, folderId: folder._id } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET folder by ID
export const getFolderById = async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await Folder.findById(id);
    if (!folder) return res.status(404).json({ success: false, error: "Folder not found, tsk tsk tsk" });
    const ownerId = req.user && req.user.id;
    if (!ownerId) return res.status(401).json({ success: false, error: "Missing authenticated user" });
    if (folder.userId && folder.userId.toString() !== ownerId.toString()) return res.status(403).json({ success: false, error: "Forbidden" });

    res.json({ success: true, data: folder });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// UPDATE folder
export const updateFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await Folder.findById(id);
    if (!folder) return res.status(404).json({ success: false, error: "Folder not found" });
    const ownerId = req.user && req.user.id;
    if (!ownerId) return res.status(401).json({ success: false, error: "Missing authenticated user" });
    if (folder.userId && folder.userId.toString() !== ownerId.toString()) return res.status(403).json({ success: false, error: "Forbidden" });

    const allowed = { ...req.body };
    delete allowed.userId;

    // Prevent setting parent to self
    if (allowed.parentId && allowed.parentId.toString() === id.toString()) return res.status(400).json({ success: false, error: "Folder cannot be its own parent" });
    // If name is changing, ensure case-insensitive uniqueness for this user
    if (allowed.name && allowed.name !== folder.name) {
      const newNameLower = String(allowed.name).toLowerCase().trim();
      const exists = await Folder.findOne({ userId: ownerId, nameLower: newNameLower });
      if (exists) return res.status(409).json({ success: false, error: "Folder name already exists for this user" });
    }

    Object.assign(folder, allowed);
    await folder.save();
    res.json({ success: true, data: folder });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: "Folder slug already exists for this user, bruhh" });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE folder
export const deleteFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await Folder.findById(id);
    if (!folder) return res.status(404).json({ success: false, error: "Folder not found" });
    const ownerId = req.user && req.user.id;
    if (!ownerId) return res.status(401).json({ success: false, error: "Missing authenticated user" });
    if (folder.userId && folder.userId.toString() !== ownerId.toString()) return res.status(403).json({ success: false, error: "Forbidden" });
    // Default policy: refuse to delete if folder has children; also check for documents
    const childCount = await Folder.countDocuments({ parentId: folder._id });
    const docCount = await Document.countDocuments({ folderId: folder._id });
    const force = req.query && String(req.query.force) === 'true';

    if (!force) {
      if (childCount > 0) return res.status(400).json({ success: false, error: "Folder has child folders; remove or move them first" });
      if (docCount > 0) return res.status(400).json({ success: false, error: "Folder contains documents; use ?force=true to delete them" });
    }

    // If force, delete documents and child folders recursively
    if (force) {
      // recursively delete child folders and their documents (including this folder)
      const stack = [folder._id];
      while (stack.length) {
        const current = stack.pop();
        const children = await Folder.find({ parentId: current }).select('_id');
        for (const c of children) {
          stack.push(c._id);
        }
        await Document.deleteMany({ folderId: current });
        await Folder.deleteMany({ _id: current });
      }
      return res.json({ success: true, data: `Folder ${id} and its contents deleted.` });
    }

    // If not force and no children/docs, safe to delete
    await folder.deleteOne();
    res.json({ success: true, data: `Folder ${id} deleted successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
