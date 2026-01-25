const mongoose = require("mongoose");

// ============================================
// GROUP SCHEMA
// ============================================
const groupSchema = new mongoose.Schema(
  {
    // ============================================
    // GROUP INFORMATION
    // ============================================
    groupName: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
    },
    groupImage: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },

    // ============================================
    // MEMBERS
    // ============================================
    members: [
      {
        memberId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Member",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ============================================
    // METADATA
    // ============================================
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// ============================================
// INDEXES
// ============================================
groupSchema.index({ groupName: 1 });
groupSchema.index({ isDeleted: 1 });
groupSchema.index({ "members.memberId": 1 });

// ============================================
// VIRTUALS
// ============================================
groupSchema.virtual("memberCount").get(function () {
  return this.members ? this.members.length : 0;
});

// Ensure virtuals are included in JSON output
groupSchema.set("toJSON", { virtuals: true });
groupSchema.set("toObject", { virtuals: true });

const Group = mongoose.model("Group", groupSchema);

module.exports = Group;
