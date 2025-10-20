import Folder from "../models/Folder.js";
import mongoose from "mongoose";

// CREATE a new folder
export const createFolder = async (req, res) => {
  try {
    const ownerId = req.user && req.user.id;
    if (!ownerId) return res.status(401).json({ success: false, error: "Missing authenticated user" });

    const { name, slug, description, color, parentId, metadata } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "Folder name is required, bruh, wth" });

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
      return res.status(409).json({ success: false, error: "Folder slug already exists for this user" });
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

    const { parentId } = req.query;
    const filter = { userId: ownerId };
    if (parentId) filter.parentId = parentId;

    const folders = await Folder.find(filter).sort({ name: 1 });
    res.json({ success: true, data: folders });
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

    // Default policy: refuse to delete if folder has children or documents. Frontend can request a force-delete.
    const childCount = await Folder.countDocuments({ parentId: folder._id });
    if (childCount > 0) return res.status(400).json({ success: false, error: "Folder has child folders; remove or move them first huehue" });

    // Note: documents check should be performed by caller or by enabling a force option; not implemented here.
    await folder.deleteOne();
    res.json({ success: true, data: `Folder ${id} deleted successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
