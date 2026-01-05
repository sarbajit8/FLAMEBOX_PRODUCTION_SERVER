const express = require("express");

const {
  trainerRegistration,
  verifyTrainerOTP,
  resendTrainerOTP,
} = require("../../controllers/auth/users-controller");

const router = express.Router();

// @desc    Trainer Registration (Public)
// @route   POST /api/auth/trainer/register
// @access  Public
router.post("/register", trainerRegistration);

// @desc    Verify OTP for trainer registration
// @route   POST /api/auth/trainer/verify-otp
// @access  Public
router.post("/verify-otp", verifyTrainerOTP);

// @desc    Resend OTP for trainer registration
// @route   POST /api/auth/trainer/resend-otp
// @access  Public
router.post("/resend-otp", resendTrainerOTP);

module.exports = router;
