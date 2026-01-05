const mongoose = require("mongoose");

const EmployeeSchema = new mongoose.Schema(
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
    },
    password: {
      type: String,
      required: true,
    },
    position: {
      type: String,
      required: true,
      enum: ["Trainer", "Front Desk", "Manager", "Maintenance", "Other"],
    },
    department: {
      type: String,
      required: true,
      enum: ["Fitness", "Administration", "Maintenance", "Sales", "Other"],
    },
    monthlySalary: {
      type: Number,
      required: true,
    },
    hireDate: {
      type: Date,
      required: true,
    },
    address: {
      type: String,
      default: null,
    },
    emergencyContact: {
      type: String,
      default: null,
    },
    accessLevel: {
      type: String,
      required: true,
      enum: [
        "Trainer",
        "Basic (Front Desk)",
        "Manager",
        "Admin",
        "Full Access",
      ],
      default: "Trainer",
    },
    employmentStatus: {
      type: String,
      required: true,
      enum: ["Active", "Inactive", "On Leave", "Terminated"],
      default: "Active",
    },
    role: {
      type: String,
      default: "employee",
    },
    imageName: {
      type: String,
      default: null,
    },
    // Password reset OTP fields
    resetPasswordOTP: {
      type: String,
      default: undefined,
    },
    resetPasswordOTPExpiry: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

// Note: email and userName indexes are automatically created due to unique: true

const Employee = mongoose.model("Employee", EmployeeSchema);
module.exports = Employee;
