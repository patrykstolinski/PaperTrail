import mongoose from 'mongoose';

const ActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      immutable: true,
      index: true,
    },
    resourceType: {
      type: String,
      required: true,
      enum: ['document', 'folder'],
      index: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    actionType: {
      type: String,
      required: true,
      enum: ['created', 'updated', 'deleted'],
      index: true,
    },
    resourceName: {
      type: String,
      required: true,
      trim: true,
    },
    // Optional metadata for additional context
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Compound indexes for efficient queries
ActivitySchema.index({ userId: 1, createdAt: -1 }); // Get user's activities sorted by date
ActivitySchema.index({ userId: 1, resourceType: 1, createdAt: -1 }); // Filter by resource type
ActivitySchema.index({ userId: 1, actionType: 1, createdAt: -1 }); // Filter by action type

const Activity = mongoose.model('Activity', ActivitySchema);

export default Activity;
