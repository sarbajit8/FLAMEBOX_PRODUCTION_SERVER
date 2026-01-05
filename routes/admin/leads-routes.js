const express = require("express");
const router = express.Router();
const leadsController = require("../../controllers/admin/leads-controller");

// ============================================
// BASIC CRUD OPERATIONS
// ============================================

// Create new lead
router.post("/create", leadsController.createLead);

// Get all leads with filters and pagination
router.get("/", leadsController.getAllLeads);

// Get lead by ID
router.get("/:id", leadsController.getLeadById);

// Update lead
router.put("/:id", leadsController.updateLead);

// Delete lead (soft delete)
router.delete("/:id", leadsController.deleteLead);

// ============================================
// STATUS MANAGEMENT
// ============================================

// Update lead status
router.patch("/:id/status", leadsController.updateLeadStatus);

// Bulk update lead status
router.patch("/bulk/status", leadsController.bulkUpdateLeadStatus);

// ============================================
// FOLLOW-UP MANAGEMENT
// ============================================

// Add follow-up to lead
router.post("/:id/follow-up", leadsController.addFollowUp);

// Get today's follow-ups
router.get("/follow-ups/today", leadsController.getTodaysFollowUps);

// Get overdue follow-ups
router.get("/follow-ups/overdue", leadsController.getOverdueFollowUps);

// ============================================
// LEAD ASSIGNMENT
// ============================================

// Assign lead to employee
router.patch("/:id/assign", leadsController.assignLead);

// Get unassigned leads
router.get("/filter/unassigned", leadsController.getUnassignedLeads);

// ============================================
// DEMO MANAGEMENT
// ============================================

// Schedule demo for lead
router.post("/:id/schedule-demo", leadsController.scheduleDemo);

// ============================================
// CONVERSION
// ============================================

// Convert lead to member
router.post("/:id/convert", leadsController.convertLeadToMember);

// Get converted leads
router.get("/filter/converted", leadsController.getConvertedLeads);

// ============================================
// ANALYTICS & STATISTICS
// ============================================

// Get lead statistics
router.get("/analytics/statistics", leadsController.getLeadStatistics);

// Get hot leads
router.get("/filter/hot-leads", leadsController.getHotLeads);

// Get leads by source
router.get("/filter/source/:source", leadsController.getLeadsBySource);

// ============================================
// BULK OPERATIONS
// ============================================

// Bulk delete leads
router.post("/bulk/delete", leadsController.bulkDeleteLeads);

// ============================================
// EXPORT ROUTER
// ============================================
module.exports = router;