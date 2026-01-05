const mongoose = require("mongoose");

const packageFeatureSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Feature name is required"],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const PackageFeature = mongoose.model("PackageFeature", packageFeatureSchema);

module.exports = PackageFeature;
