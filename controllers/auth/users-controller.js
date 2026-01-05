const User = require("../../models/auth/Users");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendOTPEmail, sendPasswordResetEmail } = require("../../helpers/email");

// Register new user (Admin can create both admin and trainer, Trainer cannot create users)
const registerUser = async (req, res) => {
  try {
    const {
      userName,
      fullName,
      email,
      phoneNumber,
      password,
      role,
      adminEmail,
    } = req.body;
    const currentUser = req.user; // From auth middleware

    // Validate required fields
    if (
      !userName ||
      !fullName ||
      !email ||
      !phoneNumber ||
      !password ||
      !role
    ) {
      return res.status(400).json({
        success: false,
        error: "All fields are required",
      });
    }

    // Role-based validation
    if (role === "admin") {
      // Only existing admin can create new admin
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({
          success: false,
          error: "Only admins can create admin accounts",
        });
      }
    } else if (role === "trainer") {
      // Admin can create trainer, trainer cannot create anything
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({
          success: false,
          error: "Only admins can create trainer accounts",
        });
      }
      if (!adminEmail) {
        return res.status(400).json({
          success: false,
          error: "Admin email is required for trainer accounts",
        });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { userName }, { phoneNumber }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "User with this email, username, or phone number already exists",
      });
    }

    // Validate admin email for trainer
    if (role === "trainer") {
      const adminExists = await User.findOne({
        email: adminEmail.toLowerCase(),
        role: "admin",
      });
      if (!adminExists) {
        return res.status(400).json({
          success: false,
          error: "Admin with provided email does not exist",
        });
      }
    }

    // Create new user
    const newUser = new User({
      userName,
      fullName,
      email: email.toLowerCase(),
      phoneNumber,
      password,
      role,
      adminEmail: role === "trainer" ? adminEmail.toLowerCase() : null,
      createdBy: currentUser ? currentUser.id : null,
    });

    const savedUser = await newUser.save();

    // Remove password from response
    const userResponse = savedUser.toObject();
    delete userResponse.password;
    delete userResponse.resetPasswordToken;
    delete userResponse.otpCode;

    res.status(201).json({
      success: true,
      message: `${
        role.charAt(0).toUpperCase() + role.slice(1)
      } created successfully`,
      user: userResponse,
    });
  } catch (error) {
    console.error("Register User Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server error during registration",
    });
  }
};

// Login user
const loginUser = async (req, res) => {
  try {
    const { emailOrPhone, password, role } = req.body;

    console.log("🔐 Login attempt:", { emailOrPhone, role });

    // Validate input
    if (!emailOrPhone || !password) {
      return res.status(400).json({
        success: false,
        error: "Email/Phone and password are required",
      });
    }

    // Find user by email or phone number
    const user = await User.findOne({
      $or: [
        { email: emailOrPhone.toLowerCase() },
        { phoneNumber: emailOrPhone },
      ],
    });

    console.log(
      "👤 User found:",
      user ? `${user.email} (${user.role})` : "None"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      console.log("❌ User is not active");
      return res.status(403).json({
        success: false,
        error: "Your account is not active. Please contact administrator.",
      });
    }

    // Validate role if provided
    if (role && user.role !== role) {
      console.log(`❌ Role mismatch: expected ${role}, got ${user.role}`);
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Compare password
    console.log("🔍 Comparing passwords...");
    const isPasswordValid = await user.comparePassword(password);
    console.log("🔐 Password valid:", isPasswordValid);

    if (!isPasswordValid) {
      console.log("❌ Invalid password");
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        userName: user.userName,
        role: user.role,
        fullName: user.fullName,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // Store session data in express-session
    req.session.userId = user._id.toString();
    req.session.token = token;
    req.session.userEmail = user.email;
    req.session.userRole = user.role;

    console.log("🔐 Session created:", {
      sessionID: req.sessionID,
      userId: user._id.toString(),
      role: user.role,
    });

    // Remove sensitive data from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.resetPasswordToken;
    delete userResponse.otpCode;

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error("Login User Error:", error);
    res.status(500).json({
      success: false,
      error: "Server error during login",
    });
  }
};

// Forget password - Request OTP
const forgetPassword = async (req, res) => {
  try {
    const { emailOrPhone, role } = req.body;

    if (!emailOrPhone || !role) {
      return res.status(400).json({
        success: false,
        error: "Email/Phone and role are required",
      });
    }

    // Find user
    const user = await User.findOne({
      $and: [
        {
          $or: [
            { email: emailOrPhone.toLowerCase() },
            { phoneNumber: emailOrPhone },
          ],
        },
        { role: role },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found with provided credentials",
      });
    }

    // Generate OTP
    const otp = user.generateOTP();
    await user.save();

    // For admin: send to admin's email
    // For trainer: send to admin's email (not trainer's)
    let recipientEmail;
    let recipientName;

    if (role === "admin") {
      recipientEmail = user.email;
      recipientName = user.fullName;
    } else if (role === "trainer") {
      // Find admin to send OTP
      const admin = await User.findOne({
        email: user.adminEmail,
        role: "admin",
      });

      if (!admin) {
        return res.status(400).json({
          success: false,
          error: "Admin not found for this trainer",
        });
      }

      recipientEmail = admin.email;
      recipientName = admin.fullName;
    }

    try {
      await sendOTPEmail(recipientEmail, otp, recipientName);
      console.log(`✅ Password reset OTP sent to: ${recipientEmail}`);
    } catch (emailError) {
      console.error("❌ Failed to send OTP email:", emailError);
      // Continue anyway - OTP is saved in database
    }

    console.log("\n==================== OTP GENERATED ====================");
    console.log(`Role: ${role}`);
    console.log(`User: ${user.fullName} (${user.email})`);
    console.log(`OTP sent to: ${recipientEmail}`);
    console.log(`Expires in: 10 minutes`);
    console.log("======================================================\n");

    res.status(200).json({
      success: true,
      message:
        role === "admin"
          ? "OTP has been sent to your email. Please check your inbox."
          : "OTP has been sent to admin's email. Please contact admin for the OTP.",
      userId: user._id,
      recipientEmail: role === "trainer" ? recipientEmail : undefined,
    });
  } catch (error) {
    console.error("Forget Password Error:", error);
    res.status(500).json({
      success: false,
      error: "Server error during password reset request",
    });
  }
};

// Reset password with OTP
const resetPassword = async (req, res) => {
  try {
    const { userId, otp, newPassword } = req.body;

    if (!userId || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "User ID, OTP, and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long",
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Verify OTP
    if (!user.verifyOTP(otp)) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired OTP",
      });
    }

    // Update password
    user.password = newPassword;
    user.clearOTP();
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({
      success: false,
      error: "Server error during password reset",
    });
  }
};

// Get all users (Admin only)
const getAllUsers = async (req, res) => {
  try {
    const currentUser = req.user;

    // Only admin can view all users
    if (currentUser.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Access denied. Admin only.",
      });
    }

    const users = await User.find()
      .select("-password -resetPasswordToken -otpCode")
      .populate("createdBy", "fullName email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Get All Users Error:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching users",
    });
  }
};

// Delete user (Admin only)
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user;

    // Only admin can delete users
    if (currentUser.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Access denied. Admin only.",
      });
    }

    // Cannot delete self
    if (userId === currentUser.id) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete your own account",
      });
    }

    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete User Error:", error);
    res.status(500).json({
      success: false,
      error: "Server error while deleting user",
    });
  }
};

// Update user status (Admin only)
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    const currentUser = req.user;

    // Only admin can update user status
    if (currentUser.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Access denied. Admin only.",
      });
    }

    // Cannot deactivate self
    if (userId === currentUser.id) {
      return res.status(400).json({
        success: false,
        error: "Cannot modify your own account status",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true, runValidators: true }
    ).select("-password -resetPasswordToken -otpCode");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update User Status Error:", error);
    res.status(500).json({
      success: false,
      error: "Server error while updating user status",
    });
  }
};

// Verify token
const verifyToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -resetPasswordToken -otpCode"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: "Your account is not active",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Verify Token Error:", error);
    res.status(500).json({
      success: false,
      error: "Server error during token verification",
    });
  }
};

// Logout user - Clear session
const logoutUser = async (req, res) => {
  try {
    // Destroy express-session
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error:", err);
        return res.status(500).json({
          success: false,
          error: "Failed to logout",
        });
      }

      // Clear session cookie
      res.clearCookie("connect.sid"); // Default session cookie name

      res.status(200).json({
        success: true,
        message: "Logout successful",
      });
    });
  } catch (error) {
    console.error("Logout User Error:", error);
    res.status(500).json({
      success: false,
      error: "Server error during logout",
    });
  }
};

// Logout from all devices - Clear all user sessions
const logoutAllDevices = async (req, res) => {
  try {
    // Note: Express-session doesn't easily support clearing all sessions for a user
    // For now, just logout from current device
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error:", err);
        return res.status(500).json({
          success: false,
          error: "Failed to logout",
        });
      }

      res.clearCookie("connect.sid");

      res.status(200).json({
        success: true,
        message: "Logged out from current device successfully",
      });
    });
  } catch (error) {
    console.error("Logout All Devices Error:", error);
    res.status(500).json({
      success: false,
      error: "Server error during logout from all devices",
    });
  }
};

// Get current session info
const getCurrentSession = async (req, res) => {
  try {
    const user = req.user;
    const sessionId = req.sessionID; // Express-session provides sessionID

    res.status(200).json({
      success: true,
      session: {
        sessionId,
        user: {
          id: user.id,
          userName: user.userName,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
        },
      },
    });
  } catch (error) {
    console.error("Get Current Session Error:", error);
    res.status(500).json({
      success: false,
      error: "Server error getting session info",
    });
  }
};

// Trainer Registration (Public - no auth required)
const trainerRegistration = async (req, res) => {
  try {
    const { fullName, userName, email, phoneNumber, password } = req.body;

    // Validate required fields
    if (!fullName || !email || !phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        error: "All fields are required",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phoneNumber }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "User with this email or phone number already exists",
      });
    }

    // Find an admin to get admin email
    const admin = await User.findOne({ role: "admin" });
    if (!admin) {
      return res.status(500).json({
        success: false,
        error: "No admin found in system",
      });
    }

    // Create new trainer (inactive by default)
    const newTrainer = new User({
      userName: userName || email.split("@")[0],
      fullName,
      email: email.toLowerCase(),
      phoneNumber,
      password,
      role: "trainer",
      adminEmail: admin.email,
      isActive: false, // Requires admin approval
      isPendingApproval: true,
    });

    // Generate OTP for admin verification
    const otp = newTrainer.generateOTP();
    const savedTrainer = await newTrainer.save();

    // Send OTP to admin's email (not trainer's email)
    try {
      await sendOTPEmail(admin.email, otp, admin.fullName);
      console.log(`✅ OTP sent to admin email: ${admin.email}`);
    } catch (emailError) {
      console.error("❌ Failed to send OTP email:", emailError);
      // Continue anyway - OTP is saved in database
    }

    console.log("\n=============== TRAINER REGISTRATION ===============");
    console.log(`Trainer: ${fullName} (${email})`);
    console.log(`OTP sent to admin: ${admin.email}`);
    console.log(`Expires in: 10 minutes`);
    console.log("===================================================\n");

    res.status(201).json({
      success: true,
      message:
        "Registration successful! Admin will receive an OTP to approve your account.",
      userId: savedTrainer._id,
      adminEmail: admin.email,
    });
  } catch (error) {
    console.error("Trainer Registration Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server error during trainer registration",
    });
  }
};

// Verify OTP for trainer registration
const verifyTrainerOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        error: "User ID and OTP are required",
      });
    }

    // Find trainer
    const trainer = await User.findById(userId);
    if (!trainer || trainer.role !== "trainer") {
      return res.status(404).json({
        success: false,
        error: "Trainer not found",
      });
    }

    // Verify OTP
    if (!trainer.verifyOTP(otp)) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired OTP",
      });
    }

    // Activate trainer account
    trainer.isActive = true;
    trainer.isPendingApproval = false;
    trainer.clearOTP();
    await trainer.save();

    // TODO: Send confirmation email when nodemailer is configured
    console.log("\n============= TRAINER APPROVED ==============");
    console.log(`Trainer: ${trainer.fullName} (${trainer.email})`);
    console.log(`Status: Active and approved`);
    console.log("============================================\n");

    res.status(200).json({
      success: true,
      message: "Trainer registration completed successfully!",
      trainer: {
        fullName: trainer.fullName,
        email: trainer.email,
        role: trainer.role,
      },
    });
  } catch (error) {
    console.error("Verify Trainer OTP Error:", error);
    res.status(500).json({
      success: false,
      error: "Server error during OTP verification",
    });
  }
};

// Resend OTP for trainer registration
const resendTrainerOTP = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
      });
    }

    // Find trainer
    const trainer = await User.findById(userId);
    if (!trainer || trainer.role !== "trainer" || !trainer.isPendingApproval) {
      return res.status(404).json({
        success: false,
        error: "Trainer not found or already approved",
      });
    }

    // Find admin
    const admin = await User.findOne({
      email: trainer.adminEmail,
      role: "admin",
    });
    if (!admin) {
      return res.status(500).json({
        success: false,
        error: "Admin not found",
      });
    }

    // Generate new OTP
    const otp = trainer.generateOTP();
    await trainer.save();

    // Resend OTP to admin
    const emailSubject = "Trainer Registration OTP - Resent";
    const emailBody = `
      <h2>Trainer Registration OTP (Resent)</h2>
      <p>Dear Admin,</p>
      <p>A new OTP has been generated for trainer registration:</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3>Trainer Details:</h3>
        <ul>
          <li><strong>Name:</strong> ${trainer.fullName}</li>
          <li><strong>Email:</strong> ${trainer.email}</li>
          <li><strong>Phone:</strong> ${trainer.phoneNumber}</li>
        </ul>
      </div>

      <p>New OTP for verification:</p>
      <div style="background: #e3f2fd; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; border-radius: 5px;">
        ${otp}
      </div>
      <p>This OTP will expire in 10 minutes.</p>
    `;

    // Send OTP to admin's email (not trainer's)
    try {
      await sendOTPEmail(admin.email, otp, admin.fullName);
      console.log(`✅ New OTP sent to admin email: ${admin.email}`);
    } catch (emailError) {
      console.error("❌ Failed to send OTP email:", emailError);
    }

    console.log("\n============== TRAINER OTP RESENT ==============");
    console.log(`Trainer: ${trainer.fullName} (${trainer.email})`);
    console.log(`New OTP sent to admin: ${admin.email}`);
    console.log(`Expires in: 10 minutes`);
    console.log("===============================================\n");

    res.status(200).json({
      success: true,
      message: "New OTP has been sent to admin's email",
      adminEmail: admin.email,
    });
  } catch (error) {
    console.error("Resend Trainer OTP Error:", error);
    res.status(500).json({
      success: false,
      error: "Server error during OTP resend",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  logoutAllDevices,
  getCurrentSession,
  forgetPassword,
  resetPassword,
  trainerRegistration,
  verifyTrainerOTP,
  resendTrainerOTP,
  getAllUsers,
  deleteUser,
  updateUserStatus,
  verifyToken,
};
