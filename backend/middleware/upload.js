import multer from "multer";

// Configuration constants
export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB in bytes
export const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];

// Create multer instance with support for multiple files
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: MAX_FILE_SIZE,
    files: 50 // Allow up to 50 files in one upload
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, PNG, and JPG are allowed."), false);
    }
  }
});

// Flexible upload middleware that accepts both "file" (singular) and "files" (plural)
// This uses multer.any() which accepts any field name, then we process it
export const flexibleUpload = (req, res, next) => {
  const anyUpload = upload.any();
  
  anyUpload(req, res, (err) => {
    if (err) {
      return next(err);
    }
    
    // multer.any() puts files in req.files array regardless of field name
    // We need to normalize this for our controller
    if (req.files && req.files.length > 0) {
      // Files were uploaded, keep them in req.files array
      console.log(`Received ${req.files.length} file(s) with field names: ${req.files.map(f => f.fieldname).join(', ')}`);
    } else {
      // No files uploaded
      console.log('No files received in upload');
    }
    
    next();
  });
};

export default upload;
