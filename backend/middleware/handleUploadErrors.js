import multer from "multer";
import { MAX_FILE_SIZE, ALLOWED_TYPES } from "./upload.js";

// Handle all upload-related errors with consistent messaging
const handleUploadErrors = (err, req, res, next) => {
  // Handle Multer-specific errors
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          code: 'FILE_TOO_LARGE'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: "Unexpected field name. Use 'file' as the field name for uploads.",
          code: 'INVALID_FIELD_NAME'
        });
      default:
        return res.status(400).json({
          success: false,
          error: `Upload error: ${err.message}`,
          code: 'UPLOAD_ERROR'
        });
    }
  }

  // Handle file validation errors (from fileFilter)
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}`,
      code: 'INVALID_FILE_TYPE'
    });
  }

  // Pass other errors to the global error handler
  next(err);
};

export default handleUploadErrors;