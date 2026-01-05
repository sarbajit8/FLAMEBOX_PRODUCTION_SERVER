const express = require("express");
const router = express.Router();
const {
  employeeLogin,
  verifyToken,
  employeeLogout,
  getCurrentEmployee,
  forgotPassword,
  resetPassword,
} = require("../../controllers/auth/employeelogin-controller");
const { authMiddleware } = require("../../middleware/auth");

// ============================================
// PUBLIC ROUTES - No Authentication Required
// ============================================

// POST /api/employee/auth/login - Employee login with email and password
router.post("/login", employeeLogin);

// POST /api/employee/auth/forgot-password - Request password reset OTP
router.post("/forgot-password", forgotPassword);

// POST /api/employee/auth/reset-password - Reset password with OTP
router.post("/reset-password", resetPassword);

// ============================================
// PROTECTED ROUTES - Authentication Required
// ============================================

// GET /api/employee/auth/verify - Verify JWT token validity
router.get("/verify", authMiddleware, verifyToken);

// POST /api/employee/auth/logout - Employee logout
router.post("/logout", authMiddleware, employeeLogout);

// GET /api/employee/auth/me - Get current logged-in employee profile
router.get("/me", authMiddleware, getCurrentEmployee);

module.exports = router;
