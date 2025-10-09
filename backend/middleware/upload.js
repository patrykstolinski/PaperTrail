import multer from "multer";

// Allowed file types
const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF, PNG, and JPG are allowed."), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 16MB limit for Mongo
  fileFilter
});

export default upload;
