import multer from "multer";

// Configuration constants
export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB in bytes
export const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];

// Create multer instance
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, PNG, and JPG are allowed."), false);
    }
  }
});

export default upload;
