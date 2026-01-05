const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  logoutUser,
  logoutAllDevices,
  getCurrentSession,
  forgetPassword,
  resetPassword,
  getAllUsers,
  deleteUser,
  updateUserStatus,
  verifyToken,
} = require("../../controllers/auth/users-controller");
const {
  authMiddleware,
  adminOnly,
  authorize,
  requireAdmin,
  requireTrainerOrAdmin,
} = require("../../middleware/auth");

// Public routes (no authentication required)
router.post("/login", loginUser);
router.post("/forgot-password", forgetPassword);
router.post("/reset-password", resetPassword);

// Protected routes (authentication required)
router.use(authMiddleware); // Apply auth middleware to all routes below

// Token verification
router.get("/verify", verifyToken);

// Session management routes (authenticated users)
router.post("/logout", logoutUser);
router.post("/logout-all", logoutAllDevices);
router.get("/session", getCurrentSession);

// Admin only routes
router.post("/register", adminOnly, registerUser);
router.get("/all", adminOnly, getAllUsers);
router.delete("/:userId", adminOnly, deleteUser);
router.patch("/:userId/status", adminOnly, updateUserStatus);

// Routes accessible by both admin and trainer
router.get("/profile", authorize("admin", "trainer"), (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

module.exports = router;
