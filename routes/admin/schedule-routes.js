const express = require("express");
const router = express.Router();
const scheduleController = require("../../controllers/admin/schedule-controller");
const {
  authMiddleware,
  requireTrainerOrAdmin,
} = require("../../middleware/auth");

// Testing routes (NO AUTH - for development only)
router.post("/trigger-reminders", scheduleController.triggerRemindersManually);
router.post("/reset-notifications", scheduleController.resetNotifications);

// All other routes require authentication
router.use(authMiddleware);

// Get schedule
router.get("/", scheduleController.getSchedule);

// Update schedule
router.put("/", scheduleController.updateSchedule);

// Add special date
router.post("/special-date", scheduleController.addSpecialDate);

// Delete special date
router.delete("/special-date/:id", scheduleController.deleteSpecialDate);

// Get upcoming events
router.get("/upcoming-events", scheduleController.getUpcomingEvents);

module.exports = router;
