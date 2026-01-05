const express = require("express");
const router = express.Router();
const dashboardController = require("../../controllers/admin/dashboard-controller");
const { authMiddleware, requireAdmin } = require("../../middleware/auth");

// Apply authentication to all routes
router.use(authMiddleware);

// Get dashboard statistics (admin only) - payment totals
router.get("/stats", requireAdmin, dashboardController.getDashboardStatistics);

module.exports = router;
