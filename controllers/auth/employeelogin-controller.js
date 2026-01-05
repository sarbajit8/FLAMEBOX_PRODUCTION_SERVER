const Employee = require("../../models/admin/Employee");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendOTPEmail } = require("../../helpers/email");

// Employee Login
exports.employeeLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    // Find employee by email (case-insensitive)
    const employee = await Employee.findOne({
      email: email.toLowerCase(),
    });

    if (!employee) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // Check if employee is active
    if (employee.employmentStatus !== "Active") {
      return res.status(403).json({
        success: false,
        error: "Your account is not active. Please contact administrator.",
      });
    }

    // Compare password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, employee.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: employee._id,
        email: employee.email,
        userName: employee.userName,
        accessLevel: employee.accessLevel,
        role: employee.role,
      },
      process.env.JWT_SECRET || "your-secret-key-here",
      { expiresIn: "7d" }
    );

    // Remove password from response
    const employeeData = employee.toObject();
    delete employeeData.password;

    // Send success response
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: employeeData,
    });
  } catch (err) {
    console.error("Employee Login Error:", err);
    res.status(500).json({
      success: false,
      error: "Server error during login. Please try again later.",
    });
  }
};

// Verify Token (Optional - for protected routes)
exports.verifyToken = async (req, res) => {
  try {
    // Token is already verified by auth middleware
    // req.user is set by the middleware
    const employee = await Employee.findById(req.user.id).select("-password");

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: "Employee not found",
      });
    }

    if (employee.employmentStatus !== "Active") {
      return res.status(403).json({
        success: false,
        error: "Your account is not active",
      });
    }

    res.status(200).json({
      success: true,
      user: employee,
    });
  } catch (err) {
    console.error("Token Verification Error:", err);
    res.status(500).json({
      success: false,
      error: "Server error during token verification",
    });
  }
};

// Employee Logout (Optional - for token blacklisting or cleanup)
exports.employeeLogout = async (req, res) => {
  try {
    // In a stateless JWT system, logout is mainly handled client-side
    // You can implement token blacklisting here if needed

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (err) {
    console.error("Employee Logout Error:", err);
    res.status(500).json({
      success: false,
      error: "Server error during logout",
    });
  }
};

// Get Current Employee Profile
exports.getCurrentEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id).select("-password");

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: "Employee not found",
      });
    }

    res.status(200).json({
      success: true,
      user: employee,
    });
  } catch (err) {
    console.error("Get Current Employee Error:", err);
    res.status(500).json({
      success: false,
      error: "Server error while fetching employee data",
    });
  }
};

// Forgot Password - Generate OTP
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    // Find employee by email
    const employee = await Employee.findOne({
      email: email.toLowerCase(),
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: "No account found with this email",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to employee record
    employee.resetPasswordOTP = otp;
    employee.resetPasswordOTPExpiry = otpExpiry;
    await employee.save();

    // Send OTP email
    try {
      await sendOTPEmail(employee.email, otp, employee.fullName);
      console.log(`✅ Password reset OTP sent to: ${employee.email}`);
    } catch (emailError) {
      console.error("❌ Failed to send OTP email:", emailError);
      return res.status(500).json({
        success: false,
        error: "Failed to send OTP email. Please try again.",
      });
    }

    console.log("\n=============== ADMIN PASSWORD RESET ===============");
    console.log(`Admin: ${employee.fullName} (${employee.email})`);
    console.log(`OTP sent to: ${employee.email}`);
    console.log(`Expires in: 10 minutes`);
    console.log("===================================================\n");

    res.status(200).json({
      success: true,
      message: "OTP has been sent to your email. Please check your inbox.",
      employeeId: employee._id,
    });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({
      success: false,
      error: "Server error during password reset request",
    });
  }
};

// Reset Password with OTP
exports.resetPassword = async (req, res) => {
  try {
    const { employeeId, otp, newPassword } = req.body;

    if (!employeeId || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Employee ID, OTP, and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long",
      });
    }

    // Find employee
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: "Employee not found",
      });
    }

    // Verify OTP
    if (!employee.resetPasswordOTP || employee.resetPasswordOTP !== otp) {
      return res.status(400).json({
        success: false,
        error: "Invalid OTP",
      });
    }

    // Check OTP expiry
    if (new Date() > employee.resetPasswordOTPExpiry) {
      return res.status(400).json({
        success: false,
        error: "OTP has expired. Please request a new one.",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    employee.password = await bcrypt.hash(newPassword, salt);

    // Clear OTP fields
    employee.resetPasswordOTP = undefined;
    employee.resetPasswordOTPExpiry = undefined;

    await employee.save();

    console.log(`✅ Password reset successful for: ${employee.email}`);

    res.status(200).json({
      success: true,
      message:
        "Password reset successful. You can now login with your new password.",
    });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({
      success: false,
      error: "Server error during password reset",
    });
  }
};
