const express = require("express");
const router = express.Router();
const {
  getAllPaymentHistory,
  getPaymentById,
  getPaymentHistoryByMember,
  createPaymentRecord,
  updatePaymentRecord,
  deletePaymentRecord,
  getPaymentStatistics,
  getRevenueByDateRange,
} = require("../../controllers/admin/paymenthistory-controller");
const {
  bulkImportPaymentHistory,
  validateExcelData,
} = require("../../controllers/admin/paymenthistory-import-controller");
const { authMiddleware } = require("../../middleware/auth");

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ============================================
// PAYMENT HISTORY ROUTES
// ============================================

// Bulk import from Excel
router.post(
  "/bulk-import",
  authMiddleware,
  asyncHandler(bulkImportPaymentHistory)
);

// Validate Excel data before import
router.post(
  "/validate-import",
  authMiddleware,
  asyncHandler(validateExcelData)
);

// Get all payment history with filters & pagination
router.get("/", authMiddleware, getAllPaymentHistory);

// Get payment statistics
router.get("/statistics", authMiddleware, getPaymentStatistics);

// Get revenue by date range
router.get("/revenue", authMiddleware, getRevenueByDateRange);

// Get payment by ID
router.get("/:id", authMiddleware, getPaymentById);

// Get payment history by member ID
router.get("/member/:memberId", authMiddleware, getPaymentHistoryByMember);

// Create payment record
router.post("/", authMiddleware, createPaymentRecord);

// Update payment record
router.put("/:id", authMiddleware, updatePaymentRecord);

// Delete payment record (soft delete)
router.delete("/:id", authMiddleware, deletePaymentRecord);

module.exports = router;
