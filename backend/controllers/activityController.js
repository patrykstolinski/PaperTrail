import Activity from '../models/Activity.js';

/**
 * Log an activity (internal function, called from other controllers)
 */
export async function logActivity(userId, resourceType, resourceId, actionType, resourceName, metadata = {}) {
  try {
    const activity = new Activity({
      userId,
      resourceType,
      resourceId,
      actionType,
      resourceName,
      metadata,
    });

    await activity.save();
    console.log(`📝 Activity logged: ${actionType} ${resourceType} "${resourceName}"`);
    return activity;
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - activity logging shouldn't break the main operation
    return null;
  }
}

/**
 * Get recent activities for a user
 * GET /api/activities?limit=10&resourceType=document&actionType=created
 */
export async function getActivities(req, res, next) {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const resourceType = req.query.resourceType; // Optional filter: 'document' or 'folder'
    const actionType = req.query.actionType; // Optional filter: 'created', 'updated', 'deleted'

    const query = { userId };
    if (resourceType) query.resourceType = resourceType;
    if (actionType) query.actionType = actionType;

    const activities = await Activity.find(query)
      .sort({ createdAt: -1 }) // Newest first
      .limit(limit)
      .select('-__v'); // Exclude version key

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete old activities (cleanup)
 * DELETE /api/activities/cleanup?olderThan=90
 */
export async function cleanupActivities(req, res, next) {
  try {
    const userId = req.user.id;
    const olderThanDays = parseInt(req.query.olderThan) || 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await Activity.deleteMany({
      userId,
      createdAt: { $lt: cutoffDate },
    });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} activities older than ${olderThanDays} days`,
    });
  } catch (error) {
    next(error);
  }
}
