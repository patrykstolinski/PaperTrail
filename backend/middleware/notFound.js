// Catch-all 404 middleware for Express
export default function notFound(req, res, next) {
  const err = new Error(`Not Found: ${req.originalUrl}`);
  err.status = 404;
  next(err);
}
