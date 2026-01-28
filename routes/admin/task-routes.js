const express = require("express");
const {
  getMemberBirthdays,
  getMemberRenewals,
  getMemberPaymentsDue,
  getLeadFollowUps,
  getNewLeads,
  getTasksSummary,
} = require("../../controllers/admin/task-controller");

const router = express.Router();

// Member Tasks Routes
router.get("/members/birthdays", getMemberBirthdays);
router.get("/members/renewals", getMemberRenewals);
router.get("/members/payments-due", getMemberPaymentsDue);

// Lead Tasks Routes
router.get("/leads/follow-ups", getLeadFollowUps);
router.get("/leads/new", getNewLeads);

// Summary Route
router.get("/summary", getTasksSummary);

module.exports = router;
