const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const Package = require("../models/admin/Packages");
const User = require("../models/auth/Users");
const mongoose = require("mongoose");

// MongoDB Connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/flamebox";

async function generateDemoMembersTemplate() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Fetch packages and trainers
    const packages = await Package.find({ isActive: true, status: "Active" })
      .select("packageName duration originalPrice discountedPrice")
      .limit(5);

    const trainers = await User.find({ role: "trainer", isActive: true })
      .select("_id fullName")
      .limit(3);

    const packageNames = packages.map((p) => p.packageName);
    const trainerIds = trainers.map((t) => t._id.toString());
    const trainerNames = trainers.map((t) => t.fullName);

    // Demo data with new format
    const demoMembers = [
      {
        "Registration Number": "FLM1436",
        "Member Joining Date": "2025-11-18",
        "Full Name": "Soumen Kundu",
        Phone: "9123789345",
        Package: packageNames[0] || "FB Fantasia Half-Yearly 2023",
        "package start date": "2025-11-18",
        trainer: trainerIds[0] || "",
        "last update date": "2025-11-18",
        status: "Active",
      },
      {
        "Registration Number": "FLM1443",
        "Member Joining Date": "2025-12-22",
        "Full Name": "Amit Kumar Bhandari",
        Phone: "6289849231",
        Package: packageNames[1] || "FB FitStart Monthly",
        "package start date": "2025-12-22",
        trainer: trainerIds[1] || "",
        "last update date": "2025-12-22",
        status: "Active",
      },
      {
        "Registration Number": "",
        "Member Joining Date": "2025-11-05",
        "Full Name": "Roina Sultana",
        Phone: "9123325221",
        Package: packageNames[0] || "FB FitStart Monthly",
        "package start date": "2025-12-05",
        trainer: trainerIds[0] || "",
        "last update date": "2025-12-05",
        status: "Active",
      },
      {
        "Registration Number": "",
        "Member Joining Date": "",
        "Full Name": "Mijanur Rahaman Molla",
        Phone: "8910828516",
        Package: packageNames[2] || "FB Fitness Fantasia 2024 Yearly",
        "package start date": "2025-12-05",
        trainer: "",
        "last update date": "2025-12-05",
        status: "Active",
      },
      {
        "Registration Number": "",
        "Member Joining Date": "2025-12-05",
        "Full Name": "Rwik Kayal",
        Phone: "9123766619",
        Package: packageNames[2] || "FB Fitness Fantasia 2024 Yearly",
        "package start date": "2025-12-05",
        trainer: trainerIds[2] || "",
        "last update date": "2025-12-05",
        status: "Active",
      },
      {
        "Registration Number": "",
        "Member Joining Date": "2025-12-04",
        "Full Name": "Sucharita Sardar",
        Phone: "9330145738",
        Package: packageNames[1] || "FB FitStart Monthly",
        "package start date": "2025-12-04",
        trainer: trainerIds[1] || "",
        "last update date": "2025-12-04",
        status: "Active",
      },
      {
        "Registration Number": "",
        "Member Joining Date": "",
        "Full Name": "Srinjoy Hazra",
        Phone: "9874971164",
        Package: packageNames[2] || "FB Fitness Fantasia 2024 Yearly",
        "package start date": "2025-12-01",
        trainer: "",
        "last update date": "2025-12-01",
        status: "Active",
      },
      {
        "Registration Number": "",
        "Member Joining Date": "2025-11-19",
        "Full Name": "Tuhin Das",
        Phone: "8250238235",
        Package: packageNames[1] || "FB FitStart Monthly",
        "package start date": "2025-12-19",
        trainer: trainerIds[0] || "",
        "last update date": "2025-12-19",
        status: "Inactive",
      },
      {
        "Registration Number": "",
        "Member Joining Date": "2025-11-19",
        "Full Name": "Faruk Ahamed Molla",
        Phone: "9903369566",
        Package: packageNames[1] || "FB FitStart Monthly",
        "package start date": "2025-12-19",
        trainer: trainerIds[2] || "",
        "last update date": "2025-12-19",
        status: "Inactive",
      },
      {
        "Registration Number": "",
        "Member Joining Date": "2025-11-06",
        "Full Name": "Deep Mondal",
        Phone: "6289616403",
        Package: packageNames[2] || "FB Fitness Fantasia 2024 Yearly",
        "package start date": "2025-12-06",
        trainer: trainerIds[1] || "",
        "last update date": "2025-12-06",
        status: "Active",
      },
    ];

    // Instructions sheet data
    const instructionsData = [
      {
        Column: "Registration Number",
        Description: "Optional. Auto-generated if empty",
        Example: "FLM1436 or leave empty",
        Notes: "Format: FLM1001, FLM1002, etc. Must be unique if provided",
      },
      {
        Column: "Member Joining Date",
        Description: "Optional. Defaults to package start date",
        Example: "2025-01-15 or 15/01/2025",
        Notes: "Format: YYYY-MM-DD or DD/MM/YYYY",
      },
      {
        Column: "Full Name",
        Description: "Required. Member's full name",
        Example: "John Doe",
        Notes: "Must not be empty",
      },
      {
        Column: "Phone",
        Description: "Required. Member's phone number",
        Example: "9876543210",
        Notes:
          "Must be unique. If exists, package will be added to existing member",
      },
      {
        Column: "Package",
        Description: "Required. Exact package name",
        Example: packageNames.join(", "),
        Notes: "Must match existing package name exactly (case-insensitive)",
      },
      {
        Column: "package start date",
        Description: "Required. Package start date",
        Example: "2025-01-15 or 15/01/2025",
        Notes: "End date calculated automatically based on package duration",
      },
      {
        Column: "trainer",
        Description: "Optional. Trainer ID (not name)",
        Example:
          trainerIds.length > 0
            ? `${trainerIds[0]} (${trainerNames[0]})`
            : "Leave empty or use trainer ID",
        Notes:
          "Use Trainer ID from database. Available IDs: " +
          trainerIds.join(", "),
      },
      {
        Column: "last update date",
        Description: "Optional. Defaults to current date",
        Example: "2025-01-15 or 15/01/2025",
        Notes: "Format: YYYY-MM-DD",
      },
      {
        Column: "status",
        Description: "Required. Member status",
        Example: "Active or Inactive",
        Notes: "Only two options: Active or Inactive (case-insensitive)",
      },
    ];

    // Notes sheet data
    const notesData = [
      {
        "Important Notes":
          "💡 PAYMENT: Full package amount will be automatically marked as PAID in CASH",
      },
      {
        "Important Notes":
          "💡 PACKAGE END DATE: Automatically calculated based on package duration",
      },
      {
        "Important Notes":
          "💡 REGISTRATION NUMBER: Auto-generated if not provided (FLM1001, FLM1002, etc.)",
      },
      {
        "Important Notes":
          "💡 EXISTING MEMBERS: If phone number exists, new package will be added to that member",
      },
      {
        "Important Notes":
          "💡 TRAINER: Provide only the Trainer ID (MongoDB ObjectId), not the name",
      },
      {
        "Important Notes": `💡 AVAILABLE TRAINERS: ${trainers
          .map((t) => `${t._id} = ${t.fullName}`)
          .join(", ")}`,
      },
      {
        "Important Notes": `💡 AVAILABLE PACKAGES: ${packageNames.join(", ")}`,
      },
      {
        "Important Notes":
          "💡 VALIDATION: Use the 'Validate Data' button in UI before importing",
      },
      {
        "Important Notes":
          "💡 LARGE FILES: System can handle 1500+ rows at once",
      },
      {
        "Important Notes":
          "💡 DATE FORMAT: Use YYYY-MM-DD or DD/MM/YYYY format for all dates",
      },
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Add Members sheet
    const membersSheet = XLSX.utils.json_to_sheet(demoMembers);
    XLSX.utils.book_append_sheet(workbook, membersSheet, "Members");

    // Add Instructions sheet
    const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

    // Add Notes sheet
    const notesSheet = XLSX.utils.json_to_sheet(notesData);
    XLSX.utils.book_append_sheet(workbook, notesSheet, "Notes");

    // Save to public/templates folder
    const publicPath = path.join(__dirname, "../public/templates");
    const filePath = path.join(publicPath, "Member_Import_Demo_Template.xlsx");

    // Ensure public/templates directory exists
    if (!fs.existsSync(publicPath)) {
      fs.mkdirSync(publicPath, { recursive: true });
    }

    XLSX.writeFile(workbook, filePath);

    console.log(`✅ Demo template generated successfully at: ${filePath}`);
    console.log(`📦 Total demo members: ${demoMembers.length}`);
    console.log(`📋 Columns: ${Object.keys(demoMembers[0]).join(", ")}`);
    console.log(`👥 Available trainers: ${trainers.length}`);
    console.log(`📦 Available packages: ${packages.length}`);

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error generating demo template:", error);
    process.exit(1);
  }
}

// Run the function
generateDemoMembersTemplate();
generateDemoMembersTemplate();
