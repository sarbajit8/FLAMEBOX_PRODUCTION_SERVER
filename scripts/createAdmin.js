const mongoose = require("mongoose");
const User = require("../models/auth/Users");

/**
 * Script to create an admin account in FLAMEBOX
 * Run this script using: node scripts/createAdmin.js
 */

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    const MONGO_URI =
      process.env.MONGO_URI || "mongodb://localhost:27017/Flamebox";
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Admin credentials
    const adminData = {
      userName: "admin",
      fullName: "Admin User",
      email: "admin@flamebox.com",
      phoneNumber: "1234567890",
      password: "admin123", // Change this to a secure password
      role: "admin",
      isActive: true,
      isVerified: true,
    };

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      email: adminData.email,
    });

    if (existingAdmin) {
      console.log("⚠️  Admin account already exists!");
      console.log("Email:", existingAdmin.email);
      console.log(
        "\nTo reset password, delete the existing admin and run this script again."
      );

      // Ask if user wants to update password
      const readline = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      readline.question(
        "\nDo you want to update the admin password? (yes/no): ",
        async (answer) => {
          if (answer.toLowerCase() === "yes" || answer.toLowerCase() === "y") {
            existingAdmin.password = adminData.password;
            await existingAdmin.save();
            console.log("\n✅ Admin password updated successfully!");
            console.log("\n📧 Email:", adminData.email);
            console.log("🔑 Password:", adminData.password);
          }
          readline.close();
          mongoose.disconnect();
          process.exit(0);
        }
      );
      return;
    }

    // Create new admin
    const admin = new User(adminData);
    await admin.save();

    console.log("\n✅ Admin account created successfully!");
    console.log("\n=".repeat(50));
    console.log("ADMIN LOGIN CREDENTIALS");
    console.log("=".repeat(50));
    console.log("📧 Email:", adminData.email);
    console.log("🔑 Password:", adminData.password);
    console.log("👤 Username:", adminData.userName);
    console.log("📱 Phone:", adminData.phoneNumber);
    console.log("=".repeat(50));
    console.log("\n⚠️  IMPORTANT: Change the password after first login!");
    console.log("💾 Save these credentials in a secure location.\n");

    mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin:", error.message);
    mongoose.disconnect();
    process.exit(1);
  }
};

// Run the script
createAdmin();
