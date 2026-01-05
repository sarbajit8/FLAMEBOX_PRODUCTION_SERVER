const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
  {
    packageName: {
      type: String,
      required: [true, "Package name is required"],
      trim: true,
    },
    packageType: {
      type: String,
      required: [true, "Package type is required"],
      enum: [
        "Membership",
        "Personal Training",
        "Group Classes",
        "Classes",
        "Day Pass",
        "Corporate",
        "Special",
      ],
      default: "Membership",
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: ["Basic", "Premium", "VIP", "Custom"],
      default: "Basic",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    duration: {
      value: {
        type: Number,
        required: [true, "Duration value is required"],
      },
      unit: {
        type: String,
        required: [true, "Duration unit is required"],
        enum: ["Days", "Weeks", "Months", "Years"],
        default: "Months",
      },
    },
    originalPrice: {
      type: Number,
      required: [true, "Original price is required"],
      min: [0, "Price cannot be negative"],
    },
    discountedPrice: {
      type: Number,
      min: [0, "Price cannot be negative"],
    },
    savings: {
      type: Number,
      default: 0,
    },
    discountType: {
      type: String,
      enum: ["flat", "percentage"],
      default: "flat",
    },
    freezable: {
      type: Boolean,
      default: false,
    },
    sessions: {
      type: String,
      default: "Unlimited",
    },
    sessionCount: {
      type: Number,
      default: null,
    },
    features: {
      type: [String],
      default: [],
    },
    amenities: {
      type: Map,
      of: Boolean,
      default: {},
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Coming Soon"],
      default: "Active",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    badge: {
      type: String,
      default: "",
    },
    popularity: {
      type: Number,
      default: 0,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// REMOVE ALL PRE/POST HOOKS - They might be causing the issue
// Don't use any middleware hooks for now

const Package = mongoose.model("Package", packageSchema);

module.exports = Package;
