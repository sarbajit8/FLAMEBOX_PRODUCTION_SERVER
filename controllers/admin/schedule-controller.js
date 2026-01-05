const Schedule = require("../../models/admin/Schedule");
const Member = require("../../models/admin/Members");
const {
  sendEventReminderEmail,
  sendEventReminderSMS,
} = require("../../helpers/email");

// ============================================
// GET SCHEDULE
// ============================================
const getSchedule = async (req, res) => {
  try {
    console.log("📅 Fetching gym schedule...");

    let schedule = await Schedule.findOne();

    // Create default schedule if doesn't exist
    if (!schedule) {
      schedule = await Schedule.create({
        weeklySchedule: [
          {
            day: "Monday",
            open: true,
            is24Hours: false,
            startTime: "06:00",
            endTime: "22:00",
            special: false,
          },
          {
            day: "Tuesday",
            open: true,
            is24Hours: false,
            startTime: "06:00",
            endTime: "22:00",
            special: false,
          },
          {
            day: "Wednesday",
            open: true,
            is24Hours: false,
            startTime: "06:00",
            endTime: "22:00",
            special: false,
          },
          {
            day: "Thursday",
            open: true,
            is24Hours: false,
            startTime: "06:00",
            endTime: "22:00",
            special: false,
          },
          {
            day: "Friday",
            open: true,
            is24Hours: false,
            startTime: "06:00",
            endTime: "22:00",
            special: false,
          },
          {
            day: "Saturday",
            open: true,
            is24Hours: false,
            startTime: "08:00",
            endTime: "20:00",
            special: false,
          },
          {
            day: "Sunday",
            open: false,
            is24Hours: false,
            startTime: "09:00",
            endTime: "18:00",
            special: false,
          },
        ],
        specialDates: [],
      });
      console.log("✅ Default schedule created");
    }

    return res.status(200).json({
      success: true,
      schedule,
    });
  } catch (error) {
    console.error("❌ Error fetching schedule:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch schedule",
    });
  }
};

// ============================================
// UPDATE SCHEDULE
// ============================================
const updateSchedule = async (req, res) => {
  try {
    console.log("💾 Updating gym schedule...");
    const { weeklySchedule, specialDates } = req.body;

    let schedule = await Schedule.findOne();

    if (!schedule) {
      // Create new if doesn't exist
      schedule = await Schedule.create({
        weeklySchedule: weeklySchedule || [],
        specialDates: specialDates || [],
        updatedBy: req.user?._id,
      });
    } else {
      // Update existing
      if (weeklySchedule) {
        schedule.weeklySchedule = weeklySchedule;
      }
      if (specialDates) {
        schedule.specialDates = specialDates;
      }
      schedule.lastUpdated = new Date();
      schedule.updatedBy = req.user?._id;
      await schedule.save();
    }

    console.log("✅ Schedule updated successfully");

    return res.status(200).json({
      success: true,
      message: "Schedule updated successfully",
      schedule,
    });
  } catch (error) {
    console.error("❌ Error updating schedule:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to update schedule",
    });
  }
};

// ============================================
// ADD SPECIAL DATE/HOLIDAY
// ============================================
const addSpecialDate = async (req, res) => {
  try {
    console.log("📅 Adding special date...");
    const {
      date,
      open,
      is24Hours,
      startTime,
      endTime,
      reason,
      eventType,
      customizedMsg,
    } = req.body;

    // Validation
    if (!date || !reason) {
      return res.status(400).json({
        success: false,
        error: "Date and reason are required",
      });
    }

    let schedule = await Schedule.findOne();

    if (!schedule) {
      // Create new schedule with the special date
      schedule = await Schedule.create({
        weeklySchedule: [],
        specialDates: [
          {
            date: new Date(date),
            open: open !== undefined ? open : false,
            is24Hours: is24Hours || false,
            startTime: startTime || "",
            endTime: endTime || "",
            reason,
            eventType: eventType || "holiday",
            customizedMsg: customizedMsg || "",
            createdBy: req.user?._id,
          },
        ],
      });
    } else {
      // Add to existing schedule
      schedule.specialDates.push({
        date: new Date(date),
        open: open !== undefined ? open : false,
        is24Hours: is24Hours || false,
        startTime: startTime || "",
        endTime: endTime || "",
        reason,
        eventType: eventType || "holiday",
        customizedMsg: customizedMsg || "",
        createdBy: req.user?._id,
      });

      schedule.lastUpdated = new Date();
      schedule.updatedBy = req.user?._id;
      await schedule.save();
    }

    console.log(`✅ Special date added: ${reason} on ${date}`);

    return res.status(200).json({
      success: true,
      message: "Special date added successfully",
      schedule,
    });
  } catch (error) {
    console.error("❌ Error adding special date:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to add special date",
    });
  }
};

// ============================================
// DELETE SPECIAL DATE
// ============================================
const deleteSpecialDate = async (req, res) => {
  try {
    console.log("🗑️ Deleting special date...");
    const { id } = req.params;

    const schedule = await Schedule.findOne();

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: "Schedule not found",
      });
    }

    // Remove the special date
    schedule.specialDates = schedule.specialDates.filter(
      (sd) => sd._id.toString() !== id
    );

    schedule.lastUpdated = new Date();
    schedule.updatedBy = req.user?._id;
    await schedule.save();

    console.log("✅ Special date deleted successfully");

    return res.status(200).json({
      success: true,
      message: "Special date deleted successfully",
      schedule,
    });
  } catch (error) {
    console.error("❌ Error deleting special date:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to delete special date",
    });
  }
};

// ============================================
// GET UPCOMING EVENTS (For notifications)
// ============================================
const getUpcomingEvents = async (req, res) => {
  try {
    console.log("📅 Fetching upcoming events...");

    const schedule = await Schedule.findOne();

    if (!schedule) {
      return res.status(200).json({
        success: true,
        upcomingEvents: [],
      });
    }

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get events in the next 7 days
    const upcomingEvents = schedule.specialDates
      .filter((sd) => {
        const eventDate = new Date(sd.date);
        return (
          eventDate >= now &&
          eventDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        );
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return res.status(200).json({
      success: true,
      upcomingEvents,
    });
  } catch (error) {
    console.error("❌ Error fetching upcoming events:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch upcoming events",
    });
  }
};

// ============================================
// SEND EVENT REMINDERS (For cron job)
// ============================================
const sendEventReminders = async () => {
  try {
    console.log("📧 Checking for event reminders to send...");
    console.log("🕐 Current time:", new Date().toLocaleString());

    const schedule = await Schedule.findOne();

    if (
      !schedule ||
      !schedule.specialDates ||
      schedule.specialDates.length === 0
    ) {
      console.log("ℹ️ No special dates found in database");
      return { sent: 0, skipped: 0 };
    }

    console.log(
      `📋 Total special dates in database: ${schedule.specialDates.length}`
    );

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    console.log(`📅 Looking for events on: ${tomorrow.toDateString()}`);
    console.log(
      `🔍 Tomorrow range: ${tomorrow.toLocaleString()} to ${tomorrowEnd.toLocaleString()}`
    );

    // Find events happening tomorrow (always send, ignore notificationSent flag)
    const eventsToNotify = schedule.specialDates.filter((sd) => {
      const eventDate = new Date(sd.date);
      console.log(
        `  - Event: ${sd.reason} on ${eventDate.toDateString()} (notified: ${
          sd.notificationSent
        })`
      );
      return (
        eventDate >= tomorrow && eventDate <= tomorrowEnd
        // Removed: && !sd.notificationSent - now sends every time
      );
    });

    console.log(`🎯 Events to notify: ${eventsToNotify.length}`);

    if (eventsToNotify.length === 0) {
      console.log("ℹ️ No events to notify about");
      return { sent: 0, skipped: 0 };
    }

    // Get all members with emails (not deleted)
    const members = await Member.find({
      email: { $exists: true, $ne: "" },
      isDeleted: { $ne: true },
    }).select("email fullName phoneNumber status");

    console.log(`📧 Found ${members.length} members with emails`);

    if (members.length > 0) {
      console.log(
        `📋 Member statuses: ${members
          .map((m) => `${m.fullName}(${m.status})`)
          .join(", ")}`
      );
    }

    console.log(
      `📧 Sending reminders to ${members.length} members for ${eventsToNotify.length} event(s)`
    );

    const smsEnabled = process.env.ENABLE_SMS_NOTIFICATIONS === "true";
    console.log(`📱 SMS notifications: ${smsEnabled ? "ENABLED" : "DISABLED"}`);

    let emailSentCount = 0;
    let emailSkippedCount = 0;
    let smsSentCount = 0;
    let smsSkippedCount = 0;

    // Send emails and SMS for each event
    for (const event of eventsToNotify) {
      const eventData = {
        memberName: null, // Will be set per member
        eventDate: new Date(event.date).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        reason: event.reason,
        open: event.open,
        is24Hours: event.is24Hours,
        startTime: event.startTime,
        endTime: event.endTime,
        eventType: event.eventType,
        customizedMsg: event.customizedMsg || "",
      };

      for (const member of members) {
        // Send Email
        try {
          await sendEventReminderEmail(member.email, {
            ...eventData,
            memberName: member.fullName,
          });
          emailSentCount++;
          console.log(`  ✅ Email sent to ${member.email}`);
        } catch (emailError) {
          console.error(
            `  ❌ Failed to send email to ${member.email}:`,
            emailError.message
          );
          emailSkippedCount++;
        }

        // Send SMS if enabled and phone number exists
        if (smsEnabled && member.phoneNumber) {
          const smsResult = await sendEventReminderSMS(
            member.phoneNumber,
            member.fullName,
            event.date,
            event.reason,
            event.open,
            event.is24Hours,
            event.startTime,
            event.endTime
          );

          if (smsResult.success) {
            smsSentCount++;
            console.log(`  ✅ SMS sent to ${member.phoneNumber}`);
          } else {
            smsSkippedCount++;
            console.error(
              `  ❌ Failed to send SMS to ${member.phoneNumber}: ${smsResult.error}`
            );
          }
        } else if (smsEnabled && !member.phoneNumber) {
          console.log(`  ⚠️ No phone number for ${member.fullName}`);
        }
      }

      // Mark event as notified
      event.notificationSent = true;
      event.notificationSentDate = new Date();
    }

    await schedule.save();

    console.log(
      `✅ Event reminders sent:\n` +
        `   📧 Email: ${emailSentCount} sent, ${emailSkippedCount} failed\n` +
        `   📱 SMS: ${smsSentCount} sent, ${smsSkippedCount} failed`
    );

    return {
      email: { sent: emailSentCount, skipped: emailSkippedCount },
      sms: { sent: smsSentCount, skipped: smsSkippedCount },
    };
  } catch (error) {
    console.error("❌ Error sending event reminders:", error);
    throw error;
  }
};

// ============================================
// MANUAL TRIGGER FOR REMINDERS (Testing)
// ============================================
const triggerRemindersManually = async (req, res) => {
  try {
    console.log("🔧 Manual trigger: Sending event reminders NOW...");

    const result = await sendEventReminders();

    return res.status(200).json({
      success: true,
      message: `Event reminders sent successfully`,
      email: result.email,
      sms: result.sms,
    });
  } catch (error) {
    console.error("❌ Error in manual trigger:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to send event reminders",
    });
  }
};

// ============================================
// RESET NOTIFICATION FLAGS (Testing)
// ============================================
const resetNotifications = async (req, res) => {
  try {
    console.log("🔄 Resetting notification flags...");

    const schedule = await Schedule.findOne();

    if (
      !schedule ||
      !schedule.specialDates ||
      schedule.specialDates.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message: "No special dates found",
      });
    }

    let resetCount = 0;
    schedule.specialDates.forEach((sd) => {
      if (sd.notificationSent) {
        sd.notificationSent = false;
        sd.notificationSentDate = null;
        resetCount++;
      }
    });

    await schedule.save();

    console.log(`✅ Reset ${resetCount} notification flags`);

    return res.status(200).json({
      success: true,
      message: `Reset ${resetCount} notification flags`,
      resetCount,
    });
  } catch (error) {
    console.error("❌ Error resetting notifications:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to reset notifications",
    });
  }
};

module.exports = {
  getSchedule,
  updateSchedule,
  addSpecialDate,
  deleteSpecialDate,
  getUpcomingEvents,
  sendEventReminders,
  triggerRemindersManually,
  resetNotifications,
};
