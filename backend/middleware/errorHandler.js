// Global error-handling middleware for Express
export default function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || "Internal Server Error, bruh"
  });
}
