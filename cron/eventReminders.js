const cron = require("node-cron");
const {
  sendEventReminders,
} = require("../controllers/admin/schedule-controller");

// Load environment variables
require("dotenv").config();

// Get cron schedule from environment or use default (2 PM daily)
const CRON_SCHEDULE = process.env.EVENT_REMINDER_CRON || "0 14 * * *";
const CRON_TIMEZONE = process.env.CRON_TIMEZONE || "Asia/Kolkata";
const ENABLE_EVENT_REMINDERS = process.env.ENABLE_EVENT_REMINDERS !== "false";

let cronJob = null;

// ============================================
// START EVENT REMINDER CRON JOB
// ============================================
const startEventReminderCron = () => {
  if (!ENABLE_EVENT_REMINDERS) {
    console.log("⏸️ Event reminder cron job is disabled");
    return;
  }

  if (cronJob) {
    console.log("⚠️ Event reminder cron job is already running");
    return;
  }

  console.log("🚀 Starting event reminder cron job...");
  console.log(`📅 Schedule: ${CRON_SCHEDULE}`);
  console.log(`🌍 Timezone: ${CRON_TIMEZONE}`);
  console.log(
    `🕐 Current Time: ${new Date().toLocaleString("en-US", {
      timeZone: CRON_TIMEZONE,
    })}`
  );
  console.log(`✅ Cron job is now active and waiting for scheduled time`);

  // Schedule the cron job
  cronJob = cron.schedule(
    CRON_SCHEDULE,
    async () => {
      try {
        console.log("\n" + "=".repeat(60));
        console.log(
          "⏰ EVENT REMINDER CRON JOB TRIGGERED at:",
          new Date().toLocaleString("en-US", { timeZone: CRON_TIMEZONE })
        );
        console.log("=".repeat(60));

        const result = await sendEventReminders();

        console.log(
          `✅ Event reminder cron completed - Sent: ${result.sent}, Skipped: ${result.skipped}`
        );
        console.log("=".repeat(60) + "\n");
      } catch (error) {
        console.error("❌ Error in event reminder cron job:", error);
      }
    },
    {
      scheduled: true,
      timezone: CRON_TIMEZONE,
    }
  );

  console.log("✅ Event reminder cron job started successfully");
  console.log("📧 Will send event reminders for events happening tomorrow");
};

// ============================================
// STOP EVENT REMINDER CRON JOB
// ============================================
const stopEventReminderCron = () => {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log("⏹️ Event reminder cron job stopped");
  } else {
    console.log("ℹ️ Event reminder cron job is not running");
  }
};

// ============================================
// GET CRON STATUS
// ============================================
const getCronStatus = () => {
  return {
    isRunning: cronJob !== null,
    schedule: CRON_SCHEDULE,
    timezone: CRON_TIMEZONE,
    enabled: ENABLE_EVENT_REMINDERS,
    nextRun: cronJob ? "Check cron schedule" : "Not scheduled",
  };
};

// ============================================
// MANUAL TRIGGER (For testing)
// ============================================
const triggerEventReminders = async () => {
  try {
    console.log("🔧 Manual trigger: Sending event reminders...");
    const result = await sendEventReminders();
    console.log(
      `✅ Manual trigger completed - Sent: ${result.sent}, Skipped: ${result.skipped}`
    );
    return result;
  } catch (error) {
    console.error("❌ Error in manual trigger:", error);
    throw error;
  }
};

module.exports = {
  startEventReminderCron,
  stopEventReminderCron,
  getCronStatus,
  triggerEventReminders,
};
