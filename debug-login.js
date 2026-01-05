const mongoose = require("mongoose");
const User = require("./models/auth/Users");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const debugLogin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/flamebox"
    );
    console.log("✅ MongoDB connected");

    // Check what users exist
    const allUsers = await User.find({});
    console.log("📊 Total users in database:", allUsers.length);

    allUsers.forEach((user, index) => {
      console.log(`\n👤 User ${index + 1}:`);
      console.log("   ID:", user._id);
      console.log("   Email:", user.email);
      console.log("   Username:", user.userName);
      console.log("   Phone:", user.phoneNumber);
      console.log("   Role:", user.role);
      console.log("   Active:", user.isActive);
      console.log("   Password Hash:", user.password.substring(0, 20) + "...");
    });

    // Test login with admin credentials
    console.log("\n🔍 Testing login with admin@flamebox.com...");
    const testUser = await User.findOne({
      $or: [
        { email: "admin@flamebox.com" },
        { phoneNumber: "admin@flamebox.com" },
      ],
    });

    if (!testUser) {
      console.log("❌ User not found with email admin@flamebox.com");
    } else {
      console.log("✅ User found:");
      console.log("   Email:", testUser.email);
      console.log("   Active:", testUser.isActive);

      // Test password
      const passwordTest = await testUser.comparePassword("admin123");
      console.log("   Password 'admin123' valid:", passwordTest);

      // Also test direct bcrypt comparison
      const directTest = await bcrypt.compare("admin123", testUser.password);
      console.log("   Direct bcrypt test:", directTest);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

debugLogin();
