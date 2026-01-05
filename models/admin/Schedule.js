const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema(
  {
    // ============================================
    // WEEKLY SCHEDULE
    // ============================================
    weeklySchedule: [
      {
        day: {
          type: String,
          required: true,
          enum: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ],
        },
        open: {
          type: Boolean,
          default: true,
        },
        is24Hours: {
          type: Boolean,
          default: false,
        },
        startTime: {
          type: String,
          default: "06:00",
        },
        endTime: {
          type: String,
          default: "22:00",
        },
        special: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // ============================================
    // SPECIAL DATES & HOLIDAYS
    // ============================================
    specialDates: [
      {
        date: {
          type: Date,
          required: true,
        },
        open: {
          type: Boolean,
          default: false,
        },
        is24Hours: {
          type: Boolean,
          default: false,
        },
        startTime: {
          type: String,
          default: "",
        },
        endTime: {
          type: String,
          default: "",
        },
        reason: {
          type: String,
          required: true,
        },
        eventType: {
          type: String,
          enum: ["holiday", "special_hours", "closed", "event"],
          default: "holiday",
        },
        customizedMsg: {
          type: String,
          default: "",
        },
        notificationSent: {
          type: Boolean,
          default: false,
        },
        notificationSentDate: {
          type: Date,
          default: null,
        },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ============================================
    // METADATA
    // ============================================
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient date queries
scheduleSchema.index({ "specialDates.date": 1 });
scheduleSchema.index({ "specialDates.notificationSent": 1 });

const Schedule = mongoose.model("Schedule", scheduleSchema);

module.exports = Schedule;
