const cron = require("node-cron");
const {
  sendPackageExpiryReminders,
} = require("../controllers/admin/members-controller");

// ============================================
// PACKAGE EXPIRY REMINDER CRON JOB
// ============================================
// This cron job checks for packages expiring in 1, 3, or 7 days
// and sends email and SMS reminders to members
// ============================================

const initPackageExpiryCron = () => {
  const isEnabled = process.env.ENABLE_PACKAGE_REMINDERS === "true";
  const cronSchedule = process.env.PACKAGE_REMINDER_CRON || "0 10 * * *";
  const timezone = process.env.CRON_TIMEZONE || "Asia/Kolkata";

  if (!isEnabled) {
    console.log("⚠️ Package expiry reminders are DISABLED in .env");
    return;
  }

  console.log("=".repeat(60));
  console.log("🔔 PACKAGE EXPIRY REMINDER CRON JOB INITIALIZED");
  console.log(`📅 Schedule: ${cronSchedule}`);
  console.log(`🌍 Timezone: ${timezone}`);
  console.log(`✅ Status: ENABLED`);
  console.log("=".repeat(60));

  // Schedule the cron job
  cron.schedule(
    cronSchedule,
    async () => {
      try {
        console.log("\n" + "=".repeat(60));
        console.log("🔔 Package Expiry Reminder Cron Job Started");
        console.log(`🕐 Time: ${new Date().toLocaleString()}`);
        console.log("=".repeat(60));

        const result = await sendPackageExpiryReminders();

        console.log("=".repeat(60));
        console.log(
          `✅ Package expiry cron completed - Email: ${result.email.sent}/${result.email.skipped}, SMS: ${result.sms.sent}/${result.sms.skipped}`
        );
        console.log("=".repeat(60) + "\n");
      } catch (error) {
        console.error("❌ Error in package expiry cron job:", error);
      }
    },
    {
      scheduled: true,
      timezone: timezone,
    }
  );

  console.log("✅ Package expiry reminder cron job is running...\n");
};

module.exports = { initPackageExpiryCron };
