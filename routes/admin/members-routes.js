const express = require("express");
const router = express.Router();
const membersController = require("../../controllers/admin/members-controller");
const membersImportController = require("../../controllers/admin/members-import-controller");
const {
  authMiddleware,
  requireAdmin,
  requireTrainerOrAdmin,
} = require("../../middleware/auth");

// ============================================
// TESTING ROUTES (NO AUTH)
// ============================================
// Manual trigger for package expiry reminders (testing)
router.post(
  "/trigger-package-reminders",
  membersController.triggerPackageRemindersManually
);

// Apply authentication to all routes below
router.use(authMiddleware);

// ============================================
// BULK IMPORT ROUTES (ADMIN ONLY)
// ============================================
// Validate bulk members data
router.post(
  "/import/validate",
  requireAdmin,
  membersImportController.validateBulkMembers
);

// Bulk import members from Excel
router.post(
  "/import/bulk",
  requireAdmin,
  membersImportController.bulkImportMembers
);

// Get import template
router.get(
  "/import/template",
  requireAdmin,
  membersImportController.generateImportTemplate
);

// ============================================
// MEMBER INFORMATION ROUTES
// ============================================

// Get active members (trainers see their assigned, admins see all)
router.get(
  "/active",
  requireTrainerOrAdmin,
  membersController.getActiveMembers
);

// Get expiring memberships
// Query param: ?days=7
router.get(
  "/expiring",
  requireTrainerOrAdmin,
  membersController.getExpiringMemberships
);

// Get member statistics (admin only)
router.get("/statistics", requireAdmin, membersController.getMemberStatistics);

// Get dashboard statistics (admin only) - payment totals
router.get(
  "/dashboard/stats",
  requireAdmin,
  membersController.getDashboardStatistics
);

// ============================================
// MEMBER CRUD OPERATIONS
// ============================================

// Get all members with filters, search, and pagination
// Query params: ?status=Active&vaccinationStatus=Vaccinated&search=John&page=1&limit=10&sortBy=createdAt&sortOrder=desc
// Trainers automatically see only their assigned members
router.get("/all", requireTrainerOrAdmin, membersController.getAllMembers);

// Get member by ID (trainers can only access their assigned members)
router.get("/:id", requireTrainerOrAdmin, membersController.getMemberById);

// Get member by registration number (trainers can only access their assigned members)
router.get(
  "/registration/:registrationNumber",
  requireTrainerOrAdmin,
  membersController.getMemberByRegistrationNumber
);

// Create new member (trainers auto-assigned as trainer, admins can assign any trainer)
router.post("/", requireTrainerOrAdmin, membersController.createMember);

// Update member payment details and send email receipt (MUST be before /:id route)
// Body: { amountPaid, paymentStatus, totalPaid, totalPending }
router.put(
  "/:id/payment",
  requireTrainerOrAdmin,
  membersController.updateMemberPayment
);

// Renew package (MUST be before /:id route)
// Body: { packageId, renewData: { startDate, endDate, amount, discount, totalPaid, totalPending, paymentDate, paymentStatus, paymentMethod, transactionId } }
router.post(
  "/:id/renew-package",
  requireTrainerOrAdmin,
  membersController.renewPackage
);

// Expire package for testing (MUST be before /:id route)
router.patch(
  "/:id/expire-package/:packageId",
  requireTrainerOrAdmin,
  membersController.expirePackage
);

// Upgrade package (MUST be before /:id route)
// Body: { oldPackageId, newPackageId, upgradeAction: "expire"|"delete", upgradeData: { startDate, endDate, amount, discount, totalPaid, totalPending, paymentDate, paymentStatus, paymentMethod, transactionId } }
router.post(
  "/:id/upgrade-package",
  requireTrainerOrAdmin,
  membersController.upgradePackage
);

// Freeze package (MUST be before /:id route)
// Body: { freezeDays: number }
router.patch(
  "/:id/freeze-package/:packageId",
  requireTrainerOrAdmin,
  membersController.freezePackage
);

// Extend package (MUST be before /:id route)
// Body: { extensionDays: number, addExtraAmount: boolean, extraAmount: number, amountPaid: number }
router.patch(
  "/:id/extend-package/:packageId",
  requireTrainerOrAdmin,
  membersController.extendPackage
);

// Update member (trainers can only update their assigned members)
router.put("/:id", requireTrainerOrAdmin, membersController.updateMember);

// Delete member (admin only)
router.delete("/:id", requireAdmin, membersController.deleteMember);

// Restore deleted member (admin only)
router.patch("/:id/restore", requireAdmin, membersController.restoreMember);

// Bulk delete members (admin only)
router.post("/bulk-delete", requireAdmin, membersController.bulkDeleteMembers);

// ============================================
// PACKAGE MANAGEMENT
// ============================================

// Add package to member (trainers can only add to their assigned members)
router.post(
  "/:id/packages",
  requireTrainerOrAdmin,
  membersController.addPackageToMember
);

// Update package status (trainers can only update their assigned members)
// Body: { status: "Active" | "Expired" | "Cancelled" | "Upcoming" }
router.patch(
  "/:id/packages/:packageId/status",
  requireTrainerOrAdmin,
  membersController.updatePackageStatus
);

// Update package start date (admin only)
// Body: { startDate: "YYYY-MM-DD" }
router.patch(
  "/:id/packages/:packageId/start-date",
  requireAdmin,
  membersController.updatePackageStartDate
);

// ============================================
// PAYMENT OPERATIONS
// ============================================

// Add payment to member (trainers can only add to their assigned members)
// Body: { date, amount, paymentMethod, transactionId, packageName, receiptNumber, status, notes }
router.post(
  "/:id/payments",
  requireTrainerOrAdmin,
  membersController.addPayment
);

// ============================================
// ATTENDANCE OPERATIONS
// ============================================

// Record attendance (trainers can only record for their assigned members)
// Body: { checkIn: Date, checkOut?: Date }
router.post(
  "/:id/attendance",
  requireTrainerOrAdmin,
  membersController.recordAttendance
);

module.exports = router;
