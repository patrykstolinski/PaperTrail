import express from 'express';
import { getActivities, cleanupActivities } from '../controllers/activityController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Get recent activities for current user
router.get('/', getActivities);

// Cleanup old activities
router.delete('/cleanup', cleanupActivities);

export default router;
