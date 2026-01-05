const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

// Sample package data based on the provided format
const samplePackages = [
  {
    "Package Name": "FB Fitness Fantasia Half Yearly",
    "Package Type": "Membership",
    "Package Category": "Basic",
    "Duration value": 6,
    "Duration unit": "Months",
    "Original Price": 4200,
    "Discount Type": "flat",
    "Discount Value": 0,
    Freezable: "Yes",
    "Package Status": "Active",
    Description:
      "Half yearly membership with full gym access and basic amenities",
    Sessions: "Unlimited",
    "Session Count": "",
    Badge: "Popular",
  },
  {
    "Package Name": "FB Fitness Fantasia Yearly",
    "Package Type": "Membership",
    "Package Category": "Basic",
    "Duration value": 12,
    "Duration unit": "Months",
    "Original Price": 7600,
    "Discount Type": "percentage",
    "Discount Value": 25,
    Freezable: "Yes",
    "Package Status": "Active",
    Description: "Yearly membership with 25% discount on original price",
    Sessions: "Unlimited",
    "Session Count": "",
    Badge: "Best Value",
  },
  {
    "Package Name": "FB Fitness Extremos Half Yearly",
    "Package Type": "Membership",
    "Package Category": "Premium",
    "Duration value": 6,
    "Duration unit": "Months",
    "Original Price": 6000,
    "Discount Type": "flat",
    "Discount Value": 0,
    Freezable: "Yes",
    "Package Status": "Active",
    Description:
      "Premium half yearly membership with advanced equipment access",
    Sessions: "Unlimited",
    "Session Count": "",
    Badge: "",
  },
  {
    "Package Name": "FB Fitness Extremos Yearly",
    "Package Type": "Membership",
    "Package Category": "Premium",
    "Duration value": 12,
    "Duration unit": "Months",
    "Original Price": 10000,
    "Discount Type": "percentage",
    "Discount Value": 25,
    Freezable: "Yes",
    "Package Status": "Active",
    Description: "Premium yearly membership with exclusive benefits",
    Sessions: "Unlimited",
    "Session Count": "",
    Badge: "Premium",
  },
  {
    "Package Name": "FB Zumba Delights Half Yearly",
    "Package Type": "Group Classes",
    "Package Category": "Basic",
    "Duration value": 6,
    "Duration unit": "Months",
    "Original Price": 4200,
    "Discount Type": "flat",
    "Discount Value": 2100,
    Freezable: "Yes",
    "Package Status": "Active",
    Description: "Half yearly Zumba classes package with unlimited sessions",
    Sessions: "Unlimited",
    "Session Count": "",
    Badge: "",
  },
  {
    "Package Name": "FB Zumba Delights Yearly",
    "Package Type": "Group Classes",
    "Package Category": "Basic",
    "Duration value": 12,
    "Duration unit": "Months",
    "Original Price": 6600,
    "Discount Type": "percentage",
    "Discount Value": 25,
    Freezable: "Yes",
    "Package Status": "Active",
    Description: "Yearly Zumba classes with 25% discount",
    Sessions: "Unlimited",
    "Session Count": "",
    Badge: "",
  },
  {
    "Package Name": "FB Visitors I",
    "Package Type": "Day Pass",
    "Package Category": "Basic",
    "Duration value": 1,
    "Duration unit": "Days",
    "Original Price": 700,
    "Discount Type": "flat",
    "Discount Value": 0,
    Freezable: "No",
    "Package Status": "Active",
    Description: "Single day visitor pass for gym access",
    Sessions: "1 Session",
    "Session Count": 1,
    Badge: "",
  },
  {
    "Package Name": "FB Visitors II",
    "Package Type": "Day Pass",
    "Package Category": "Basic",
    "Duration value": 2,
    "Duration unit": "Days",
    "Original Price": 1000,
    "Discount Type": "flat",
    "Discount Value": 0,
    Freezable: "No",
    "Package Status": "Active",
    Description: "Two days visitor pass for gym access",
    Sessions: "2 Sessions",
    "Session Count": 2,
    Badge: "",
  },
  {
    "Package Name": "FB Fitness Fantasia Half Yearly Group",
    "Package Type": "Membership",
    "Package Category": "Basic",
    "Duration value": 6,
    "Duration unit": "Months",
    "Original Price": 3600,
    "Discount Type": "flat",
    "Discount Value": 0,
    Freezable: "Yes",
    "Package Status": "Active",
    Description: "Group membership package for 2+ members with special pricing",
    Sessions: "Unlimited",
    "Session Count": "",
    Badge: "",
  },
  {
    "Package Name": "FB Fitness Fantasia Monthly Fees",
    "Package Type": "Membership",
    "Package Category": "Basic",
    "Duration value": 1,
    "Duration unit": "Months",
    "Original Price": 800,
    "Discount Type": "flat",
    "Discount Value": 0,
    Freezable: "No",
    "Package Status": "Active",
    Description: "Monthly membership with flexible payment option",
    Sessions: "Unlimited",
    "Session Count": "",
    Badge: "",
  },
  {
    "Package Name": "FlameBox 1:1",
    "Package Type": "Personal Training",
    "Package Category": "Premium",
    "Duration value": 1,
    "Duration unit": "Months",
    "Original Price": 2000,
    "Discount Type": "flat",
    "Discount Value": 1000,
    Freezable: "No",
    "Package Status": "Active",
    Description:
      "One-on-one personal training sessions with certified trainers",
    Sessions: "4 Sessions",
    "Session Count": 4,
    Badge: "Featured",
  },
  {
    "Package Name": "Lifetime Membership Registration",
    "Package Type": "Membership",
    "Package Category": "VIP",
    "Duration value": 1,
    "Duration unit": "Years",
    "Original Price": 500,
    "Discount Type": "flat",
    "Discount Value": 0,
    Freezable: "No",
    "Package Status": "Active",
    Description: "One-time lifetime registration fee",
    Sessions: "Unlimited",
    "Session Count": "",
    Badge: "",
  },
  {
    "Package Name": "FB Fantasia Monthly 2023",
    "Package Type": "Membership",
    "Package Category": "Basic",
    "Duration value": 1,
    "Duration unit": "Months",
    "Original Price": 1000,
    "Discount Type": "percentage",
    "Discount Value": 50,
    Freezable: "No",
    "Package Status": "Active",
    Description: "Special monthly offer with 50% discount",
    Sessions: "Unlimited",
    "Session Count": "",
    Badge: "Limited Offer",
  },
  {
    "Package Name": "FB Fantasia Quarterly 2023",
    "Package Type": "Membership",
    "Package Category": "Basic",
    "Duration value": 3,
    "Duration unit": "Months",
    "Original Price": 2800,
    "Discount Type": "percentage",
    "Discount Value": 50,
    Freezable: "No",
    "Package Status": "Active",
    Description: "Quarterly membership with special discount pricing",
    Sessions: "Unlimited",
    "Session Count": "",
    Badge: "",
  },
  {
    "Package Name": "FB Fantasia Half-Yearly 2023",
    "Package Type": "Membership",
    "Package Category": "Basic",
    "Duration value": 6,
    "Duration unit": "Months",
    "Original Price": 5000,
    "Discount Type": "percentage",
    "Discount Value": 50,
    Freezable: "Yes",
    "Package Status": "Active",
    Description: "Half-yearly membership special offer 2023",
    Sessions: "Unlimited",
    "Session Count": "",
    Badge: "Best Deal",
  },
  {
    "Package Name": "FB Fantasia Yearly 2023",
    "Package Type": "Membership",
    "Package Category": "Basic",
    "Duration value": 12,
    "Duration unit": "Months",
    "Original Price": 9000,
    "Discount Type": "percentage",
    "Discount Value": 50,
    Freezable: "Yes",
    "Package Status": "Active",
    Description: "Full year membership with maximum savings",
    Sessions: "Unlimited",
    "Session Count": "",
    Badge: "Most Popular",
  },
];

// Instructions data
const instructions = [
  {
    "Field Name": "Package Name",
    Description: "Unique name for the package",
    Example: "FB Fitness Fantasia Half Yearly",
    "Valid Options": "Any text (must be unique)",
    Required: "Yes",
  },
  {
    "Field Name": "Package Type",
    Description: "Type/category of the package",
    Example: "Membership",
    "Valid Options":
      "Membership, Personal Training, Group Classes, Day Pass, Corporate, Special",
    Required: "Yes",
  },
  {
    "Field Name": "Package Category",
    Description: "Package tier/category",
    Example: "Basic",
    "Valid Options": "Basic, Premium, VIP, Custom",
    Required: "Yes",
  },
  {
    "Field Name": "Duration value",
    Description: "Numeric duration value",
    Example: "6",
    "Valid Options": "Any positive number",
    Required: "Yes",
  },
  {
    "Field Name": "Duration unit",
    Description: "Time unit for duration",
    Example: "Months",
    "Valid Options": "Days, Weeks, Months, Years",
    Required: "Yes",
  },
  {
    "Field Name": "Original Price",
    Description: "Full price without discount (no commas)",
    Example: "4200",
    "Valid Options": "Any positive number",
    Required: "Yes",
  },
  {
    "Field Name": "Discount Type",
    Description: "Type of discount applied",
    Example: "flat",
    "Valid Options": "flat (fixed amount), percentage (% off)",
    Required: "Yes",
  },
  {
    "Field Name": "Discount Value",
    Description: "If percentage: % value, If flat: amount off",
    Example: "25 (for 25% off) or 1000 (for ₹1000 off)",
    "Valid Options": "Any positive number",
    Required: "Yes",
  },
  {
    "Field Name": "Freezable",
    Description: "Can membership be frozen/paused",
    Example: "Yes",
    "Valid Options": "Yes, No",
    Required: "Yes",
  },
  {
    "Field Name": "Package Status",
    Description: "Current availability status",
    Example: "Active",
    "Valid Options": "Active, Inactive, Coming Soon",
    Required: "Yes",
  },
  {
    "Field Name": "Description",
    Description: "Detailed package description",
    Example: "Half yearly membership with full gym access",
    "Valid Options": "Any text",
    Required: "No",
  },
  {
    "Field Name": "Sessions",
    Description: "Session information text",
    Example: "Unlimited or 12 Sessions",
    "Valid Options": "Any text",
    Required: "No",
  },
  {
    "Field Name": "Session Count",
    Description: "Number of sessions (if limited)",
    Example: "12",
    "Valid Options": "Any positive number or leave empty",
    Required: "No",
  },
  {
    "Field Name": "Badge",
    Description: "Display badge for the package",
    Example: "Popular, Best Value, Featured",
    "Valid Options": "Any text or leave empty",
    Required: "No",
  },
];

// Create workbook
const wb = XLSX.utils.book_new();

// Add sample packages sheet
const ws1 = XLSX.utils.json_to_sheet(samplePackages);

// Set column widths
ws1["!cols"] = [
  { wch: 35 }, // Package Name
  { wch: 18 }, // Package Type
  { wch: 18 }, // Package Category
  { wch: 15 }, // Duration value
  { wch: 15 }, // Duration unit
  { wch: 15 }, // Original Price
  { wch: 15 }, // Discount Type
  { wch: 15 }, // Discount Value
  { wch: 12 }, // Freezable
  { wch: 15 }, // Package Status
  { wch: 50 }, // Description
  { wch: 15 }, // Sessions
  { wch: 15 }, // Session Count
  { wch: 15 }, // Badge
];

XLSX.utils.book_append_sheet(wb, ws1, "Sample Packages");

// Add instructions sheet
const ws2 = XLSX.utils.json_to_sheet(instructions);

// Set column widths for instructions
ws2["!cols"] = [
  { wch: 20 }, // Field Name
  { wch: 40 }, // Description
  { wch: 40 }, // Example
  { wch: 50 }, // Valid Options
  { wch: 10 }, // Required
];

XLSX.utils.book_append_sheet(wb, ws2, "Instructions");

// Add blank template sheet
const ws3 = XLSX.utils.json_to_sheet([
  {
    "Package Name": "",
    "Package Type": "",
    "Package Category": "",
    "Duration value": "",
    "Duration unit": "",
    "Original Price": "",
    "Discount Type": "",
    "Discount Value": "",
    Freezable: "",
    "Package Status": "",
    Description: "",
    Sessions: "",
    "Session Count": "",
    Badge: "",
  },
]);

ws3["!cols"] = [
  { wch: 35 },
  { wch: 18 },
  { wch: 18 },
  { wch: 15 },
  { wch: 15 },
  { wch: 15 },
  { wch: 15 },
  { wch: 15 },
  { wch: 12 },
  { wch: 15 },
  { wch: 50 },
  { wch: 15 },
  { wch: 15 },
  { wch: 15 },
];

XLSX.utils.book_append_sheet(wb, ws3, "Blank Template");

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, "..", "public", "templates");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write file
const outputPath = path.join(outputDir, "Package_Import_Demo_Template.xlsx");
XLSX.writeFile(wb, outputPath);

console.log("✅ Demo Excel template created successfully!");
console.log(`📁 Location: ${outputPath}`);
console.log("\n📊 Template includes:");
console.log("  1. Sample Packages - 16 real examples from your data");
console.log("  2. Instructions - Detailed field descriptions");
console.log("  3. Blank Template - Ready to fill");
console.log(
  "\nUsers can download this from: /Package_Import_Demo_Template.xlsx"
);
