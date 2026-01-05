const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      match: [/^[0-9]{10,15}$/, "Please enter a valid phone number"],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      required: true,
      enum: ["admin", "trainer"],
      default: "trainer",
    },
    adminEmail: {
      type: String,
      required: function () {
        return this.role === "trainer";
      },
      trim: true,
      lowercase: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPendingApproval: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    otpCode: {
      type: String,
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate OTP method
UserSchema.methods.generateOTP = function () {
  const otpLength = parseInt(process.env.OTP_LENGTH) || 6;
  const min = Math.pow(10, otpLength - 1);
  const max = Math.pow(10, otpLength) - 1;
  const otp = Math.floor(min + Math.random() * (max - min)).toString();

  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
  this.otpCode = otp;
  this.otpExpires = new Date(Date.now() + expiryMinutes * 60 * 1000);
  return otp;
};

// Verify OTP method
UserSchema.methods.verifyOTP = function (otp) {
  return this.otpCode === otp && this.otpExpires > new Date();
};

// Clear OTP method
UserSchema.methods.clearOTP = function () {
  this.otpCode = null;
  this.otpExpires = null;
};

const User = mongoose.model("User", UserSchema);
module.exports = User;
