import jwt from "jsonwebtoken";

//  JWT auth middleware with a developer fallback.
// - In production: requires Authorization: Bearer <token> and JWT_SECRET env var.
// - In development: if DEV_AUTH=true you can set X-Dev-User-Id/DEV_CURRENT_USER_ID header to simulate a user.
const auth = (req, res, next) => {
  const devAuth = process.env.DEV_AUTH === "true" || process.env.NODE_ENV === "development";

  if (devAuth) {
    // Priority: X-Dev-User-Id header -> DEV_CURRENT_USER_ID env var
    const devUserHeader = req.get("X-Dev-User-Id");
    if (devUserHeader) {
      req.user = { id: devUserHeader };
      return next();
    }

    const envDevUser = process.env.DEV_CURRENT_USER_ID;
    if (envDevUser) {
      req.user = { id: envDevUser };
      return next();
    }

    // no dev user provided
    return res.status(401).json({ success: false, error: "DEV_AUTH enabled but no dev user configured" });
  }

  const authHeader = req.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Missing or invalid Authorization header,Brahhhhhh" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET not configured");
      return res.status(500).json({ success: false, error: "Server not configured for authentication" });
    }
    const decoded = jwt.verify(token, secret);
    const userId = decoded && (decoded.sub || decoded.userId || decoded.id);
    if (!userId) return res.status(401).json({ success: false, error: "Invalid token payload" });
    req.user = { id: userId };
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, error: "Invalid token" });
  }
};

export default auth;
