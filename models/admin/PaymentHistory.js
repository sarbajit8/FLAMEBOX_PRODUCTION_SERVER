const mongoose = require("mongoose");

// ============================================
// PAYMENT HISTORY SCHEMA
// ============================================
const paymentHistorySchema = new mongoose.Schema(
  {
    // ============================================
    // MEMBER REFERENCE
    // ============================================
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      index: true,
      required: false, // Made optional for Excel import
    },
    memberName: {
      type: String,
      trim: true,
      required: false, // Made optional for Excel import
    },
    memberEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    memberPhone: {
      type: String,
      trim: true,
      required: false, // Made optional for Excel import
    },

    // ============================================
    // PACKAGE INFORMATION
    // ============================================
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      index: true,
    },
    packageName: {
      type: String,
      trim: true,
      required: false, // Made optional for Excel import
    },
    packageType: {
      type: String,
      enum: ["Monthly", "Quarterly", "Half Yearly", "Yearly", "Custom"],
      default: "Monthly",
    },
    packageDuration: {
      value: { type: Number },
      unit: {
        type: String,
        enum: ["Days", "Months", "Years"],
      },
      text: { type: String, trim: true }, // e.g., "12 months," from Excel
    },

    // ============================================
    // PAYMENT DETAILS
    // ============================================
    transactionType: {
      type: String,
      enum: [
        "New Membership",
        "Renewal",
        "Upgrade",
        "Partial Payment",
        "Other",
      ],
      default: "New Membership",
    },
    amount: {
      type: Number,
      min: [0, "Amount cannot be negative"],
      required: false, // Made optional for Excel import
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },
    finalAmount: {
      type: Number,
      min: [0, "Final amount cannot be negative"],
      required: false, // Made optional for Excel import
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Pending", "Failed", "Refunded"],
      default: "Paid",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: [
        "Cash",
        "Card",
        "UPI",
        "Net Banking",
        "Cheque",
        "upi",
        "cash",
        "card",
        "net banking",
        "cheque",
        "other",
        "Other",
      ],
      default: "cash",
    },
    paymentMode: {
      type: String,
      trim: true,
      // Additional field for Excel import compatibility
    },
    paymentDate: {
      type: Date,
      index: true,
      required: false, // Made optional for Excel import
    },
    purchaseDate: {
      type: Date,
      index: true,
      // From Excel: Purchase Date
    },
    transactionId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      trim: true,
      index: true,
      // From Excel: Invoice Number
    },

    // ============================================
    // MEMBERSHIP PERIOD
    // ============================================
    membershipStartDate: {
      type: Date,
    },
    membershipEndDate: {
      type: Date,
    },
    activationDate: {
      type: Date,
      index: true,
      // From Excel: Activation Date
    },
    expiryDate: {
      type: Date,
      index: true,
      // From Excel: Expiry Date
    },

    // ============================================
    // SALES & CUSTOMER INFORMATION (From Excel)
    // ============================================
    salesRep: {
      type: String,
      trim: true,
      // From Excel: Sales Rep
    },
    customerRep: {
      type: String,
      trim: true,
      // From Excel: Customer Rep (e.g., "koushik mandal")
    },

    // ============================================
    // ADDITIONAL INFORMATION
    // ============================================
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
    receiptNumber: {
      type: String,
      trim: true,
      index: true,
    },
    collectedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      userName: {
        type: String,
        trim: true,
      },
      role: {
        type: String,
        enum: ["admin", "trainer", "staff"],
      },
    },

    // ============================================
    // METADATA
    // ============================================
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================
// INDEXES
// ============================================
paymentHistorySchema.index({ memberId: 1, paymentDate: -1 });
paymentHistorySchema.index({ paymentStatus: 1, paymentDate: -1 });
paymentHistorySchema.index({ transactionType: 1, paymentDate: -1 });
paymentHistorySchema.index({ createdAt: -1 });

// ============================================
// VIRTUALS
// ============================================
// Calculate discount percentage
paymentHistorySchema.virtual("discountPercentage").get(function () {
  if (this.amount > 0) {
    return ((this.discount / this.amount) * 100).toFixed(2);
  }
  return 0;
});

// ============================================
// METHODS
// ============================================
// Method to generate receipt number
paymentHistorySchema.methods.generateReceiptNumber = async function () {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");

  // Count documents for this month to get sequence
  const count = await this.constructor.countDocuments({
    createdAt: {
      $gte: new Date(date.getFullYear(), date.getMonth(), 1),
      $lt: new Date(date.getFullYear(), date.getMonth() + 1, 1),
    },
  });

  const sequence = (count + 1).toString().padStart(4, "0");
  return `RCP${year}${month}${sequence}`;
};

// ============================================
// STATICS
// ============================================
// Get payment statistics
paymentHistorySchema.statics.getPaymentStatistics = async function (
  filters = {}
) {
  const matchStage = { isDeleted: false, ...filters };

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$finalAmount" },
        totalDiscount: { $sum: "$discount" },
        totalTransactions: { $sum: 1 },
        paidTransactions: {
          $sum: { $cond: [{ $eq: ["$paymentStatus", "Paid"] }, 1, 0] },
        },
        pendingTransactions: {
          $sum: { $cond: [{ $eq: ["$paymentStatus", "Pending"] }, 1, 0] },
        },
        failedTransactions: {
          $sum: { $cond: [{ $eq: ["$paymentStatus", "Failed"] }, 1, 0] },
        },
        averageTransaction: { $avg: "$finalAmount" },
      },
    },
  ]);

  return (
    stats[0] || {
      totalRevenue: 0,
      totalDiscount: 0,
      totalTransactions: 0,
      paidTransactions: 0,
      pendingTransactions: 0,
      failedTransactions: 0,
      averageTransaction: 0,
    }
  );
};

// Get revenue by date range
paymentHistorySchema.statics.getRevenueByDateRange = async function (
  startDate,
  endDate
) {
  return await this.aggregate([
    {
      $match: {
        isDeleted: false,
        paymentDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$paymentDate" },
        },
        dailyRevenue: { $sum: "$finalAmount" },
        transactionCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

// ============================================
// MIDDLEWARE
// ============================================
// Auto-generate receipt number before saving
paymentHistorySchema.pre("save", async function () {
  if (this.isNew && !this.receiptNumber) {
    this.receiptNumber = await this.generateReceiptNumber();
  }
});

// Prevent actual deletion - soft delete only
paymentHistorySchema.pre("remove", async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  await this.save();
});

// ============================================
// MODEL EXPORT
// ============================================
const PaymentHistory = mongoose.model("PaymentHistory", paymentHistorySchema);

module.exports = PaymentHistory;
