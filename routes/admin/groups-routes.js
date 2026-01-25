const express = require("express");
const router = express.Router();
const groupsController = require("../../controllers/admin/groups-controller");
const { authMiddleware, requireAdmin } = require("../../middleware/auth");

// Apply authentication to all routes
router.use(authMiddleware);

// ============================================
// GROUP ROUTES
// ============================================

// Search members for adding to group (Admin only)
router.get(
  "/search-members",
  requireAdmin,
  groupsController.searchMembersForGroup,
);

// Get all groups (with pagination) - Admin only
router.get("/", requireAdmin, groupsController.getAllGroups);

// Get single group by ID - Admin only
router.get("/:id", requireAdmin, groupsController.getGroupById);

// Create new group - Admin only
router.post("/", requireAdmin, groupsController.createGroup);

// Update group - Admin only
router.put("/:id", requireAdmin, groupsController.updateGroup);

// Delete group (soft delete) - Admin only
router.delete("/:id", requireAdmin, groupsController.deleteGroup);

// Add member to group - Admin only
router.post("/:id/members", requireAdmin, groupsController.addMemberToGroup);

// Remove member from group - Admin only
router.delete(
  "/:id/members/:memberId",
  requireAdmin,
  groupsController.removeMemberFromGroup,
);

module.exports = router;
