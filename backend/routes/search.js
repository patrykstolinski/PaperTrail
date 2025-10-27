import express from "express";
import auth from "../middleware/auth.js";
import { unifiedSearch } from "../controllers/searchController.js";

const router = express.Router();

// Unified search across documents and folders
// GET /api/search?q=<query>&type=<all|documents|folders>&tags=<tags>&folderId=<id>&page=<n>&pageSize=<n>
router.get("/", auth, unifiedSearch);

export default router;
