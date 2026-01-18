const mongoose = require("mongoose");

// ============================================
// LEADS SCHEMA
// ============================================
const leadSchema = new mongoose.Schema(
  {
    // ============================================
    // BASIC INFORMATION
    // ============================================
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
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

    // ============================================
    // LEAD SOURCE & CONTACT
    // ============================================
    leadSource: {
      type: String,
      enum: [
        "Instagram",
        "Facebook",
        "Twitter",
        "LinkedIn",
        "Google Ads",
        "Walk-in",
        "Referral",
        "Website",
        "Phone Call",
        "Email",
        "WhatsApp",
        "Events",
        "Flyer",
        "Billboard",
        "Other",
      ],
      required: [true, "Lead source is required"],
      default: "Walk-in",
    },
    contactMethod: {
      type: String,
      enum: ["Phone", "Email", "WhatsApp", "SMS", "In-Person", "Social Media"],
      default: "Phone",
    },
    referredBy: {
      type: String,
      default: "",
      trim: true,
    },
    referralCode: {
      type: String,
      default: "",
      trim: true,
    },

    // ============================================
    // INTEREST & PREFERENCES
    // ============================================
    interestedPackage: {
      type: String,
      enum: ["Basic", "Standard", "Premium", "VIP", "Custom", "Not Decided"],
      default: "Not Decided",
    },
    interestedServices: {
      type: [String],
      default: [],
      // Example: ["Gym", "Yoga", "Zumba", "Personal Training", "Diet Consultation"]
    },
    preferredTimings: {
      type: String,
      enum: ["Morning", "Afternoon", "Evening", "Night", "Flexible"],
      default: "Flexible",
    },
    fitnessGoals: {
      type: [String],
      default: [],
      // Example: ["Weight Loss", "Muscle Gain", "Fitness", "Flexibility", "Health"]
    },

    // ============================================
    // BUDGET & PRICING
    // ============================================
    budgetRange: {
      type: String,
      enum: [
        "Under 500",
        "500-800",
        "800-1000",
        "1000-1500",
        "1500-2000",
        "2000+",
        "Not Disclosed",
      ],
      default: "Not Disclosed",
    },
    expectedJoiningDate: {
      type: Date,
      default: null,
    },

    // ============================================
    // LEAD STATUS & PRIORITY
    // ============================================
    leadStatus: {
      type: String,
      enum: [
        "New", // Just added
        "Contacted", // Initial contact made
        "Qualified", // Interested and qualified
        "Hot", // Very interested, ready to join
        "Warm", // Interested but needs follow-up
        "Cold", // Not interested currently
        "Converted", // Successfully converted to member
        "Lost", // Lead lost to competitor or not interested
        "Unresponsive", // Not responding to follow-ups
        "Follow-up", // Scheduled for follow-up
      ],
      default: "New",
      required: true,
    },
    leadPriority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    leadScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // ============================================
    // FOLLOW-UP INFORMATION
    // ============================================
    followUps: [
      {
        date: {
          type: Date,
          required: true,
        },
        method: {
          type: String,
          enum: [
            "Phone",
            "Email",
            "WhatsApp",
            "SMS",
            "In-Person",
            "Video Call",
          ],
          required: true,
        },
        notes: {
          type: String,
          default: "",
        },
        outcome: {
          type: String,
          enum: [
            "Interested",
            "Not Interested",
            "Callback",
            "Converted",
            "No Response",
            "Rescheduled",
          ],
          default: "No Response",
        },
        nextFollowUpDate: {
          type: Date,
          default: null,
        },
        followedUpBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Employee",
          default: null,
        },
        followedUpByName: {
          type: String,
          default: "",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    nextFollowUpDate: {
      type: Date,
      default: null,
    },
    totalFollowUps: {
      type: Number,
      default: 0,
    },
    lastFollowUpDate: {
      type: Date,
      default: null,
    },

    // ============================================
    // CONVERSION INFORMATION
    // ============================================
    isConverted: {
      type: Boolean,
      default: false,
    },
    convertedToMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },
    conversionDate: {
      type: Date,
      default: null,
    },
    conversionNotes: {
      type: String,
      default: "",
    },

    // ============================================
    // ADDITIONAL INFORMATION
    // ============================================
    notes: {
      type: String,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    leadQuality: {
      type: String,
      enum: ["Excellent", "Good", "Average", "Poor"],
      default: "Average",
    },
    competitorInformation: {
      currentGym: { type: String, default: "" },
      currentPrice: { type: Number, default: 0 },
      switchingReason: { type: String, default: "" },
    },

    // ============================================
    // DEMO & TRIAL
    // ============================================
    demoScheduled: {
      type: Boolean,
      default: false,
    },
    demoDate: {
      type: Date,
      default: null,
    },
    demoAttended: {
      type: Boolean,
      default: false,
    },
    demoFeedback: {
      type: String,
      default: "",
    },
    trialOffered: {
      type: Boolean,
      default: false,
    },
    trialStartDate: {
      type: Date,
      default: null,
    },
    trialEndDate: {
      type: Date,
      default: null,
    },

    // ============================================
    // ASSIGNMENT & OWNERSHIP
    // ============================================
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    assignedToName: {
      type: String,
      default: "",
    },
    assignedDate: {
      type: Date,
      default: null,
    },

    // ============================================
    // SYSTEM FIELDS
    // ============================================
    addedDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    lastContactedDate: {
      type: Date,
      default: null,
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
    isActive: {
      type: Boolean,
      default: true,
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
  },
);

// ============================================
// INDEXES
// ============================================
leadSchema.index({ email: 1 });
leadSchema.index({ phoneNumber: 1 });
leadSchema.index({ leadStatus: 1 });
leadSchema.index({ leadSource: 1 });
leadSchema.index({ nextFollowUpDate: 1 });
leadSchema.index({ addedDate: -1 });
leadSchema.index({ isConverted: 1 });
leadSchema.index({ assignedTo: 1 });

// ============================================
// VIRTUAL FIELDS
// ============================================

// Days since lead added
leadSchema.virtual("daysOld").get(function () {
  const today = new Date();
  const addedDate = new Date(this.addedDate);
  const diffTime = today - addedDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Check if follow-up is overdue
leadSchema.virtual("isFollowUpOverdue").get(function () {
  if (this.nextFollowUpDate) {
    return new Date() > new Date(this.nextFollowUpDate);
  }
  return false;
});

// Days until next follow-up
leadSchema.virtual("daysUntilFollowUp").get(function () {
  if (this.nextFollowUpDate) {
    const today = new Date();
    const followUpDate = new Date(this.nextFollowUpDate);
    const diffTime = followUpDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  return null;
});

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================
leadSchema.pre("save", function () {
  // Update lastUpdatedDate
  this.lastUpdatedDate = new Date();

  // Update total follow-ups count
  this.totalFollowUps = this.followUps.length;

  // Update last follow-up date
  if (this.followUps.length > 0) {
    const sortedFollowUps = this.followUps.sort((a, b) => b.date - a.date);
    this.lastFollowUpDate = sortedFollowUps[0].date;
  }

  // Auto-calculate lead score based on various factors
  let score = 0;

  // Source scoring
  if (this.leadSource === "Referral") score += 30;
  else if (
    ["Walk-in", "Website", "Instagram", "Facebook"].includes(this.leadSource)
  )
    score += 20;
  else score += 10;

  // Status scoring
  if (this.leadStatus === "Hot") score += 30;
  else if (this.leadStatus === "Warm") score += 20;
  else if (this.leadStatus === "Qualified") score += 15;
  else if (this.leadStatus === "Cold") score += 5;

  // Budget scoring
  if (this.budgetRange === "$2000+") score += 20;
  else if (this.budgetRange === "$1500-$2000") score += 15;
  else if (this.budgetRange === "$1000-$1500") score += 10;
  else score += 5;

  // Follow-up scoring
  if (this.totalFollowUps >= 3) score += 15;
  else if (this.totalFollowUps >= 2) score += 10;
  else if (this.totalFollowUps >= 1) score += 5;

  // Demo scoring
  if (this.demoAttended) score += 15;
  else if (this.demoScheduled) score += 10;

  this.leadScore = Math.min(score, 100); // Cap at 100
});

// ============================================
// METHODS
// ============================================

// Add follow-up
leadSchema.methods.addFollowUp = async function (followUpData) {
  this.followUps.push(followUpData);

  if (followUpData.nextFollowUpDate) {
    this.nextFollowUpDate = followUpData.nextFollowUpDate;
  }

  this.lastContactedDate = new Date();

  await this.save();
  return this;
};

// Convert lead to member
leadSchema.methods.convertToMember = async function (memberId) {
  this.isConverted = true;
  this.convertedToMemberId = memberId;
  this.conversionDate = new Date();
  this.leadStatus = "Converted";

  await this.save();
  return this;
};

// Update lead status
leadSchema.methods.updateStatus = async function (status) {
  this.leadStatus = status;
  this.lastUpdatedDate = new Date();

  await this.save();
  return this;
};

// Assign lead to employee
leadSchema.methods.assignTo = async function (employeeId, employeeName) {
  this.assignedTo = employeeId;
  this.assignedToName = employeeName;
  this.assignedDate = new Date();

  await this.save();
  return this;
};

// Schedule demo
leadSchema.methods.scheduleDemo = async function (demoDate) {
  this.demoScheduled = true;
  this.demoDate = demoDate;

  await this.save();
  return this;
};

// ============================================
// STATIC METHODS
// ============================================

// Get hot leads
leadSchema.statics.getHotLeads = function () {
  return this.find({
    leadStatus: "Hot",
    isDeleted: false,
    isConverted: false,
  }).sort({ leadScore: -1 });
};

// Get leads requiring follow-up today
leadSchema.statics.getTodaysFollowUps = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.find({
    nextFollowUpDate: {
      $gte: today,
      $lt: tomorrow,
    },
    isDeleted: false,
    isConverted: false,
  });
};

// Get overdue follow-ups
leadSchema.statics.getOverdueFollowUps = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return this.find({
    nextFollowUpDate: { $lt: today },
    isDeleted: false,
    isConverted: false,
  });
};

// Get leads by source
leadSchema.statics.getLeadsBySource = function (source) {
  return this.find({ leadSource: source, isDeleted: false });
};

// Get converted leads
leadSchema.statics.getConvertedLeads = function (startDate, endDate) {
  const query = { isConverted: true, isDeleted: false };

  if (startDate && endDate) {
    query.conversionDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  return this.find(query);
};

// Get leads by status
leadSchema.statics.getLeadsByStatus = function (status) {
  return this.find({ leadStatus: status, isDeleted: false });
};

// Get unassigned leads
leadSchema.statics.getUnassignedLeads = function () {
  return this.find({
    assignedTo: null,
    isDeleted: false,
    isConverted: false,
  }).sort({ addedDate: -1 });
};

// Get lead statistics
leadSchema.statics.getStatistics = async function () {
  const totalLeads = await this.countDocuments({ isDeleted: false });
  const convertedLeads = await this.countDocuments({
    isConverted: true,
    isDeleted: false,
  });
  const hotLeads = await this.countDocuments({
    leadStatus: "Hot",
    isDeleted: false,
  });
  const warmLeads = await this.countDocuments({
    leadStatus: "Warm",
    isDeleted: false,
  });
  const coldLeads = await this.countDocuments({
    leadStatus: "Cold",
    isDeleted: false,
  });
  const newLeads = await this.countDocuments({
    leadStatus: "New",
    isDeleted: false,
  });

  const conversionRate =
    totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(2) : 0;

  return {
    totalLeads,
    convertedLeads,
    hotLeads,
    warmLeads,
    coldLeads,
    newLeads,
    conversionRate,
  };
};

// ============================================
// EXPORT MODEL
// ============================================
const Lead = mongoose.model("Lead", leadSchema);

module.exports = Lead;
