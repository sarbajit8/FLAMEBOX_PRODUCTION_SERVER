const cron = require("node-cron");
const Member = require("../models/admin/Members");
const { sendBirthdayEmail } = require("../helpers/email");

// Load environment variables
require("dotenv").config();

// Get cron schedule from environment or use default (8 AM daily)
const CRON_SCHEDULE = process.env.BIRTHDAY_REMINDER_CRON || "0 8 * * *";
const CRON_TIMEZONE = process.env.CRON_TIMEZONE || "Asia/Kolkata";
const ENABLE_BIRTHDAY_REMINDERS =
  process.env.ENABLE_BIRTHDAY_REMINDERS !== "false";

let cronJob = null;

// ============================================
// SEND BIRTHDAY REMINDERS
// ============================================
const sendBirthdayReminders = async () => {
  try {
    console.log("🎂 Processing birthday reminders...");

    // Get today's date (month and day)
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // JavaScript months are 0-indexed
    const currentDate = today.getDate();

    console.log(
      `📅 Today's date: ${currentMonth}/${currentDate} (${today.toLocaleString(
        "en-US",
        {
          timeZone: CRON_TIMEZONE,
        },
      )})`,
    );

    // Find all members with today's birthday
    // We need to find members where month and day of DOB match today
    const members = await Member.find({
      dateOfBirth: { $ne: null },
      email: { $ne: null, $exists: true },
      isDeleted: false,
    }).select("_id fullName email dateOfBirth");

    console.log(`👥 Found ${members.length} members with DOB and email`);

    let sent = 0;
    let skipped = 0;
    let errors = 0;

    for (const member of members) {
      try {
        const dob = new Date(member.dateOfBirth);
        const dobMonth = dob.getMonth() + 1;
        const dobDate = dob.getDate();

        // Check if today is the member's birthday (ignoring year)
        if (dobMonth === currentMonth && dobDate === currentDate) {
          console.log(
            `🎉 Birthday found: ${member.fullName} (${member.email})`,
          );

          // Send birthday email
          const emailResult = await sendBirthdayEmail(
            member.email,
            member.fullName,
          );

          if (emailResult.success) {
            sent++;
            console.log(
              `✅ Birthday email sent to ${member.fullName} (${member.email})`,
            );
          } else {
            errors++;
            console.error(
              `❌ Failed to send birthday email to ${member.email}: ${emailResult.error}`,
            );
          }
        }
      } catch (error) {
        errors++;
        console.error(
          `❌ Error processing birthday for member ${member._id}:`,
          error.message,
        );
      }
    }

    skipped = members.length - sent - errors;

    console.log(
      `📊 Birthday reminder summary - Sent: ${sent}, Skipped: ${skipped}, Errors: ${errors}`,
    );

    return { sent, skipped, errors };
  } catch (error) {
    console.error("❌ Error in birthday reminder process:", error);
    throw error;
  }
};

// ============================================
// START BIRTHDAY REMINDER CRON JOB
// ============================================
const startBirthdayReminderCron = () => {
  if (!ENABLE_BIRTHDAY_REMINDERS) {
    console.log("⏸️ Birthday reminder cron job is disabled");
    return;
  }

  if (cronJob) {
    console.log("⚠️ Birthday reminder cron job is already running");
    return;
  }

  console.log("🚀 Starting birthday reminder cron job...");
  console.log(`📅 Schedule: ${CRON_SCHEDULE}`);
  console.log(`🌍 Timezone: ${CRON_TIMEZONE}`);
  console.log(
    `🕐 Current Time: ${new Date().toLocaleString("en-US", {
      timeZone: CRON_TIMEZONE,
    })}`,
  );
  console.log(`✅ Cron job is now active and waiting for scheduled time`);

  // Schedule the cron job
  cronJob = cron.schedule(
    CRON_SCHEDULE,
    async () => {
      try {
        console.log("\n" + "=".repeat(60));
        console.log(
          "⏰ BIRTHDAY REMINDER CRON JOB TRIGGERED at:",
          new Date().toLocaleString("en-US", { timeZone: CRON_TIMEZONE }),
        );
        console.log("=".repeat(60));

        const result = await sendBirthdayReminders();

        console.log(
          `✅ Birthday reminder cron completed - Sent: ${result.sent}, Skipped: ${result.skipped}, Errors: ${result.errors}`,
        );
        console.log("=".repeat(60) + "\n");
      } catch (error) {
        console.error("❌ Error in birthday reminder cron job:", error);
      }
    },
    {
      scheduled: true,
      timezone: CRON_TIMEZONE,
    },
  );

  console.log("✅ Birthday reminder cron job started successfully");
  console.log("🎂 Will send birthday greetings to members on their DOB");
};

// ============================================
// STOP BIRTHDAY REMINDER CRON JOB
// ============================================
const stopBirthdayReminderCron = () => {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log("⏹️ Birthday reminder cron job stopped");
  } else {
    console.log("⚠️ Birthday reminder cron job is not running");
  }
};

module.exports = {
  sendBirthdayReminders,
  startBirthdayReminderCron,
  stopBirthdayReminderCron,
};
