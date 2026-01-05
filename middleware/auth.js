const jwt = require("jsonwebtoken");
const Employee = require("../models/admin/Employee");
const User = require("../models/auth/Users");

// In-memory session store (for production, use Redis or similar)
const activeSessions = new Map();

/**
 * Session Management Functions
 */
const createSession = (userId, token) => {
  const sessionId = `${userId}_${Date.now()}`;
  const sessionData = {
    userId,
    token,
    createdAt: new Date(),
    lastActivity: new Date(),
  };
  activeSessions.set(sessionId, sessionData);
  console.log("🔧 Session created in store:", {
    sessionId,
    userId,
    totalSessions: activeSessions.size,
  });
  return sessionId;
};

const removeSession = (sessionId) => {
  return activeSessions.delete(sessionId);
};

const validateSession = (userId, token) => {
  for (const [sessionId, session] of activeSessions) {
    if (session.userId === userId && session.token === token) {
      session.lastActivity = new Date();
      return sessionId;
    }
  }
  return null;
};

const removeAllUserSessions = (userId) => {
  const removedSessions = [];
  for (const [sessionId, session] of activeSessions) {
    if (session.userId === userId) {
      activeSessions.delete(sessionId);
      removedSessions.push(sessionId);
    }
  }
  return removedSessions;
};

/**
 * Session-Based Authentication Middleware
 * Uses express-session instead of custom in-memory store
 */
const authMiddleware = async (req, res, next) => {
  try {
    console.log("🔍 Auth middleware - Checking session...");
    console.log("📋 Session exists:", !!req.session);
    console.log("🆔 Session ID:", req.sessionID);
    console.log("📦 Session data:", req.session);
    console.log("🍪 Cookies:", req.cookies);

    // Check if session exists and has user data
    if (!req.session || !req.session.userId || !req.session.token) {
      console.log("❌ No session or session data found");
      return res.status(401).json({
        success: false,
        error: "Access denied. No session found.",
      });
    }

    console.log("🔍 Session found:", {
      sessionID: req.sessionID,
      userId: req.session.userId,
      hasToken: !!req.session.token,
    });

    // Verify the token from session
    let decoded;
    try {
      decoded = jwt.verify(req.session.token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.log("❌ Token verification failed:", jwtError.message);
      return res.status(401).json({
        success: false,
        error: "Invalid session token. Please login again.",
      });
    }

    // Update session activity
    req.session.lastActivity = new Date();

    // Try to find user in both User and Employee models
    let user;
    try {
      user = await User.findById(decoded.id).select(
        "-password -resetPasswordToken -otpCode"
      );
      console.log("👤 User lookup result:", {
        found: !!user,
        userId: decoded.id,
      });
    } catch (userError) {
      console.log("❌ User lookup error:", userError.message);
      return res.status(500).json({
        success: false,
        error: "Database error during authentication",
      });
    }

    if (!user) {
      console.log("🔄 User not found, checking Employee model...");
      // Fallback to Employee model for backward compatibility
      try {
        user = await Employee.findById(decoded.id).select("-password");
        console.log("👤 Employee lookup result:", {
          found: !!user,
          userId: decoded.id,
        });
      } catch (empError) {
        console.log("❌ Employee lookup error:", empError.message);
      }

      if (user) {
        // Convert Employee to User-like format
        req.user = {
          id: user._id,
          email: user.email,
          userName: user.userName,
          role:
            user.accessLevel === "Admin" || user.accessLevel === "Full Access"
              ? "admin"
              : "trainer",
          fullName: user.fullName,
          isEmployee: true, // Flag to identify employee records
          accessLevel: user.accessLevel,
        };
      }
    } else {
      // User from new auth system
      req.user = {
        id: user._id,
        email: user.email,
        userName: user.userName,
        role: user.role,
        fullName: user.fullName,
        isEmployee: false,
      };
    }

    // Check if user was found
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "User not found. Token is invalid.",
      });
    }

    // Check if user is active (for new auth system)
    if (!req.user.isEmployee && user && !user.isActive) {
      return res.status(403).json({
        success: false,
        error: "Your account is not active.",
      });
    }

    // Add session info to request
    req.sessionId = req.sessionID;
    req.token = req.session.token;

    // Continue to next middleware/route handler
    next();
  } catch (error) {
    console.error("❌ Auth middleware error:", error);

    // Handle specific JWT errors
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Token has expired. Please login again.",
        expiredAt: error.expiredAt,
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        error: "Invalid token. Authorization denied.",
      });
    }

    if (error.name === "NotBeforeError") {
      return res.status(401).json({
        success: false,
        error: "Token not active yet.",
      });
    }

    // Log unexpected errors
    console.error("❌ Auth Middleware Error:", error);
    console.error("❌ Error Stack:", error.stack);
    console.error("❌ Error Details:", {
      name: error.name,
      message: error.message,
      sessionId,
      userId: req.user?.id,
    });

    return res.status(500).json({
      success: false,
      error: "Internal server error during authentication",
    });
  }
};

/**
 * Authorization Middleware
 * Checks if user has required access level
 * @param  {...string} allowedAccessLevels - Array of allowed access levels
 */
const authorize = (...allowedAccessLevels) => {
  return (req, res, next) => {
    // Check if user info exists (should be set by authMiddleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized. Please login first.",
      });
    }

    // Check if user's access level is in allowed list
    if (!allowedAccessLevels.includes(req.user.accessLevel)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required access level: ${allowedAccessLevels.join(
          " or "
        )}`,
        yourAccessLevel: req.user.accessLevel,
      });
    }

    // User has proper access level
    next();
  };
};

/**
 * Admin Only Middleware
 * Restricts access to admin and full access users only
 * Works with both old Employee-based auth (accessLevel) and new User-based auth (role)
 */
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized. Please login first.",
    });
  }

  console.log("🔐 Admin check - User:", {
    role: req.user.role,
    accessLevel: req.user.accessLevel,
    isEmployee: req.user.isEmployee,
  });

  // Check for new auth system (role-based)
  if (req.user.role === "admin") {
    console.log("✅ Admin access granted via role");
    return next();
  }

  // Check for old auth system (accessLevel-based)
  const adminAccessLevels = ["Admin", "Full Access"];
  if (
    req.user.accessLevel &&
    adminAccessLevels.includes(req.user.accessLevel)
  ) {
    console.log("✅ Admin access granted via accessLevel");
    return next();
  }

  console.log("❌ Admin access denied");
  return res.status(403).json({
    success: false,
    error: "Access denied. Admin privileges required.",
    yourRole: req.user.role,
    yourAccessLevel: req.user.accessLevel,
  });
};

/**
 * Optional Authentication Middleware
 * Attaches user info if token exists, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(); // No token, continue without user info
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key-here"
    );

    req.user = {
      id: decoded.id,
      email: decoded.email,
      userName: decoded.userName,
      accessLevel: decoded.accessLevel,
      role: decoded.role,
    };

    next();
  } catch (error) {
    // If token is invalid, just continue without user info
    next();
  }
};

/**
 * Role-based Access Control Middleware
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized. Please login first.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(" or ")}`,
        yourRole: req.user.role,
      });
    }

    next();
  };
};

/**
 * Admin Only Access (New Auth System)
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized. Please login first.",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Access denied. Admin privileges required.",
      yourRole: req.user.role,
    });
  }

  next();
};

/**
 * Trainer Access Control (Can only access assigned members)
 */
const requireTrainerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized. Please login first.",
    });
  }

  if (req.user.role !== "admin" && req.user.role !== "trainer") {
    return res.status(403).json({
      success: false,
      error: "Access denied. Admin or Trainer privileges required.",
      yourRole: req.user.role,
    });
  }

  next();
};

/**
 * Session Management Utilities
 */
const sessionUtils = {
  createSession,
  removeSession,
  validateSession,
  removeAllUserSessions,
  getActiveSessions: () => Array.from(activeSessions.entries()),
  clearAllSessions: () => activeSessions.clear(),
};

module.exports = {
  authMiddleware,
  authorize,
  adminOnly,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireTrainerOrAdmin,
  sessionUtils,
};
