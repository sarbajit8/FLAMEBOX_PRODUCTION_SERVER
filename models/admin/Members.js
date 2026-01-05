const mongoose = require("mongoose");

// ============================================
// MEMBER SCHEMA
// ============================================
const memberSchema = new mongoose.Schema(
  {
    // ============================================
    // PERSONAL INFORMATION
    // ============================================
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    alternatePhone: {
      type: String,
      trim: true,
      default: "",
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other", "Prefer not to say"],
      default: "Prefer not to say",
    },
    address: {
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      zipCode: { type: String, default: "" },
      country: { type: String, default: "India" },
    },
    emergencyContact: {
      name: { type: String, default: "" },
      relationship: { type: String, default: "" },
      phone: { type: String, default: "" },
    },
    photo: {
      type: String,
      default: "",
    },
    documents: [
      {
        name: { type: String },
        url: { type: String },
        uploadDate: { type: Date, default: Date.now },
      },
    ],

    // ============================================
    // REGISTRATION INFORMATION
    // ============================================
    registrationNumber: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
    },
    cprNumber: {
      type: String,
      trim: true,
      default: "",
    },
    joiningDate: {
      type: Date,
      required: [true, "Joining date is required"],
      default: Date.now,
    },
    dueDate: {
      type: Date,
      default: null,
    },

    // ============================================
    // PACKAGES INFORMATION (Multiple Packages Support)
    // ============================================
    packages: [
      {
        packageId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Package",
          required: true,
        },
        packageName: {
          type: String,
          required: true,
        },
        packageType: {
          type: String,
          required: true,
        },
        startDate: {
          type: Date,
          required: true,
        },
        endDate: {
          type: Date,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        discount: {
          type: Number,
          default: 0,
          min: 0,
        },
        discountType: {
          type: String,
          enum: ["flat", "percentage"],
          default: "flat",
        },
        finalAmount: {
          type: Number,
          required: true,
          min: 0,
        },
        totalPaid: {
          type: Number,
          default: 0,
          min: 0,
        },
        totalPending: {
          type: Number,
          default: 0,
          min: 0,
        },
        paymentStatus: {
          type: String,
          enum: ["Paid", "Pending", "Partial", "Overdue", "Cancelled"],
          default: "Pending",
        },
        paymentMethod: {
          type: String,
          enum: [
            "Cash",
            "Card",
            "UPI",
            "Upi",
            "Net Banking",
            "Cheque",
            "Other",
          ],
          default: "Cash",
        },
        paymentDate: {
          type: Date,
          default: Date.now,
        },
        transactionId: {
          type: String,
          default: "",
        },
        packageStatus: {
          type: String,
          enum: ["Active", "Expired", "Cancelled", "Upcoming"],
          default: "Active",
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
        autoRenew: {
          type: Boolean,
          default: false,
        },
        notes: {
          type: String,
          default: "",
        },
        addedDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ============================================
    // PAYMENT SUMMARY
    // ============================================
    totalPaid: {
      type: Number,
      default: 0,
    },
    totalPending: {
      type: Number,
      default: 0,
    },
    paymentDate: {
      type: Date,
      default: null,
    },

    // ============================================
    // CURRENT ACTIVE PACKAGE (Primary)
    // ============================================
    currentPackage: {
      packageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Package",
      },
      packageName: {
        type: String,
        default: "",
      },
      startDate: {
        type: Date,
      },
      endDate: {
        type: Date,
      },
    },

    // ============================================
    // HEALTH & VACCINATION
    // ============================================
    vaccinationStatus: {
      type: String,
      enum: ["Vaccinated", "Not Vaccinated", "Partially Vaccinated", "Unknown"],
      default: "Not Vaccinated",
    },
    vaccinationDetails: {
      vaccineName: { type: String, default: "" },
      doseCount: { type: Number, default: 0 },
      lastDoseDate: { type: Date, default: null },
      certificate: { type: String, default: "" },
    },
    medicalConditions: {
      type: [String],
      default: [],
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"],
      default: "Unknown",
    },
    height: {
      type: Number,
      default: null,
    },
    weight: {
      type: Number,
      default: null,
    },

    // ============================================
    // PAYMENT HISTORY
    // ============================================
    paymentHistory: [
      {
        date: {
          type: Date,
          default: Date.now,
        },
        amount: {
          type: Number,
          required: true,
        },
        paymentMethod: {
          type: String,
          enum: ["Cash", "Card", "UPI", "Net Banking", "Cheque", "Other"],
        },
        transactionId: {
          type: String,
          default: "",
        },
        packageName: {
          type: String,
        },
        receiptNumber: {
          type: String,
        },
        status: {
          type: String,
          enum: ["Success", "Pending", "Failed", "Refunded"],
          default: "Success",
        },
        notes: {
          type: String,
          default: "",
        },
      },
    ],

    // ============================================
    // ATTENDANCE & ACTIVITY
    // ============================================
    lastVisitDate: {
      type: Date,
      default: null,
    },
    totalVisits: {
      type: Number,
      default: 0,
    },
    attendanceHistory: [
      {
        date: {
          type: Date,
          default: Date.now,
        },
        checkIn: {
          type: Date,
        },
        checkOut: {
          type: Date,
        },
        duration: {
          type: Number,
          default: 0,
        },
      },
    ],

    // ============================================
    // ADDITIONAL INFORMATION
    // ============================================
    referredBy: {
      type: String,
      default: "",
    },
    salesRepresentative: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    assignedTrainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedTrainerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    // ============================================
    // SYSTEM FIELDS
    // ============================================
    memberStatus: {
      type: String,
      enum: ["Active", "Inactive", "Expired", "Suspended"],
      default: "Inactive",
    },
    lastUpdatedDate: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================
// Note: registrationNumber and email indexes are automatically created due to unique: true
memberSchema.index({ phoneNumber: 1 });
memberSchema.index({ memberStatus: 1 });
memberSchema.index({ joiningDate: -1 });
memberSchema.index({ "packages.endDate": 1 });

// ============================================
// PRE-SAVE MIDDLEWARE - Auto-update Last Updated Date and Generate Registration Number
// ============================================
memberSchema.pre("save", async function (next) {
  try {
    // Update lastUpdatedDate on every save (for new and existing documents)
    this.lastUpdatedDate = new Date();

    // Skip automatic status update if member is being deleted
    if (!this.isDeleted) {
      // Auto-update memberStatus based on active packages
      const now = new Date();
      const hasActivePackage =
        this.packages &&
        this.packages.some((pkg) => {
          // Check if package is active (not expired and status is Active)
          return (
            pkg.packageStatus === "Active" &&
            pkg.endDate &&
            new Date(pkg.endDate) >= now
          );
        });

      // Update member status
      if (hasActivePackage) {
        this.memberStatus = "Active";
      } else if (this.packages && this.packages.length > 0) {
        // Has packages but all are expired/inactive
        const hasExpiredPackage = this.packages.some((pkg) => {
          return pkg.endDate && new Date(pkg.endDate) < now;
        });
        this.memberStatus = hasExpiredPackage ? "Expired" : "Inactive";
      } else {
        // No packages at all
        this.memberStatus = "Inactive";
      }
    }

    // Only generate registration number for new documents
    if (this.isNew && !this.registrationNumber) {
      // Find the highest registration number
      const lastMember = await mongoose
        .model("Member")
        .findOne({}, { registrationNumber: 1 })
        .sort({ registrationNumber: -1 })
        .lean()
        .exec();

      let nextNumber = 1;

      if (lastMember && lastMember.registrationNumber) {
        // Extract number from FLM0001 -> 1
        const lastNumber = parseInt(
          lastMember.registrationNumber.replace("FLM", "")
        );
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }

      // Generate new registration number: FLM0001, FLM0002, etc.
      this.registrationNumber = `FLM${nextNumber.toString().padStart(4, "0")}`;
      console.log(
        `✅ Auto-generated registration number: ${this.registrationNumber}`
      );
    }

    // Update lastUpdatedDate
    this.lastUpdatedDate = new Date();

    // Update current package from packages array
    if (this.packages && this.packages.length > 0) {
      // Find the primary active package or the first active package
      const activePackage =
        this.packages.find(
          (pkg) => pkg.isPrimary && pkg.packageStatus === "Active"
        ) || this.packages.find((pkg) => pkg.packageStatus === "Active");

      if (activePackage) {
        this.currentPackage = {
          packageId: activePackage.packageId,
          packageName: activePackage.packageName,
          startDate: activePackage.startDate,
          endDate: activePackage.endDate,
        };
      }
    }

    // next();
  } catch (error) {
    console.error("❌ Error in pre-save middleware:", error);
    // next(error);
  }
});

// ============================================
// VIRTUAL FIELDS
// ============================================

// Check if membership is expired
memberSchema.virtual("isExpired").get(function () {
  if (this.currentPackage && this.currentPackage.endDate) {
    return new Date() > new Date(this.currentPackage.endDate);
  }
  return false;
});

// Days remaining in membership
memberSchema.virtual("daysRemaining").get(function () {
  if (this.currentPackage && this.currentPackage.endDate) {
    const today = new Date();
    const endDate = new Date(this.currentPackage.endDate);
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }
  return 0;
});

// Age calculation
memberSchema.virtual("age").get(function () {
  if (this.dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  }
  return null;
});

// ============================================
// METHODS
// ============================================

// Add a new package to member
memberSchema.methods.addPackage = async function (packageData) {
  this.packages.push(packageData);
  await this.save();
  return this;
};

// Update package status
memberSchema.methods.updatePackageStatus = async function (packageId, status) {
  const packageIndex = this.packages.findIndex(
    (pkg) => pkg.packageId.toString() === packageId.toString()
  );

  if (packageIndex !== -1) {
    this.packages[packageIndex].packageStatus = status;
    await this.save();
  }

  return this;
};

// Add payment
memberSchema.methods.addPayment = async function (paymentData) {
  this.paymentHistory.push(paymentData);
  await this.save();
  return this;
};

// Add attendance
memberSchema.methods.recordAttendance = async function (
  checkIn,
  checkOut = null
) {
  const attendance = {
    date: new Date(),
    checkIn: checkIn,
    checkOut: checkOut,
  };

  if (checkOut) {
    const duration = Math.floor(
      (new Date(checkOut) - new Date(checkIn)) / 60000
    );
    attendance.duration = duration;
  }

  this.attendanceHistory.push(attendance);
  this.lastVisitDate = new Date();
  this.totalVisits += 1;

  await this.save();
  return this;
};

// ============================================
// STATIC METHODS
// ============================================

// Get all active members
memberSchema.statics.getActiveMembers = function () {
  return this.find({ isDeleted: false });
};

// Get expiring memberships (within next 7 days)
memberSchema.statics.getExpiringMemberships = function (days = 7) {
  const today = new Date();
  const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

  return this.find({
    "currentPackage.endDate": {
      $gte: today,
      $lte: futureDate,
    },
    isDeleted: false,
  });
};

// Get members by vaccination status
memberSchema.statics.getMembersByVaccinationStatus = function (status) {
  return this.find({ vaccinationStatus: status, isDeleted: false });
};

// ============================================
// EXPORT MODEL
// ============================================
const Member = mongoose.model("Member", memberSchema);

module.exports = Member;
