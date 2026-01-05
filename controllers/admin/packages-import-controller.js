const Package = require("../../models/admin/Packages");
const { imageUploadUtil } = require("../../helpers/cloudinary");

// ============================================
// BULK IMPORT PACKAGES FROM EXCEL
// ============================================
const bulkImportPackages = async (req, res) => {
  try {
    const { packages } = req.body;

    if (!packages || !Array.isArray(packages) || packages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of package records",
      });
    }

    console.log(`📥 Importing ${packages.length} package records...`);

    const results = {
      success: [],
      failed: [],
      total: packages.length,
    };

    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];

      try {
        // Debug: Log the raw package data and keys
        if (i < 3) {
          console.log(`\n🔍 Row ${i + 1} - Raw package data:`, pkg);
          console.log(`🔑 Row ${i + 1} - Available keys:`, Object.keys(pkg));
          console.log(
            `🔑 Row ${i + 1} - Duration keys:`,
            Object.keys(pkg).filter((k) => k.toLowerCase().includes("duration"))
          );
        }

        // Clean and validate required fields
        const packageName = pkg["Package Name"] || pkg.packageName;
        let packageType =
          pkg["Package Type"] || pkg.packageType || "Membership";
        // Normalize package type (trim spaces)
        packageType = String(packageType).trim();
        const packageCategory =
          pkg["Package Category"] || pkg.category || "Basic";

        // Duration - Find keys dynamically to handle any variations
        const allKeys = Object.keys(pkg);
        const durationValueKey = allKeys.find((k) => {
          const normalized = k.toLowerCase().replace(/\s+/g, " ").trim();
          return (
            normalized === "duration value" ||
            normalized === "durationvalue" ||
            normalized === "duration_value"
          );
        });
        const durationUnitKey = allKeys.find((k) => {
          const normalized = k.toLowerCase().replace(/\s+/g, " ").trim();
          return (
            normalized === "duration unit" ||
            normalized === "durationunit" ||
            normalized === "duration_unit"
          );
        });

        const durationValueRaw = durationValueKey ? pkg[durationValueKey] : "";
        const durationUnitRaw = durationUnitKey ? pkg[durationUnitKey] : "";

        let durationValue = parseInt(durationValueRaw);
        let durationUnit = String(durationUnitRaw || "").trim();

        // Debug duration values for first few rows
        if (i < 3) {
          console.log(
            `📊 Row ${i + 1} - Found durationValueKey: "${durationValueKey}"`
          );
          console.log(
            `📊 Row ${i + 1} - Duration value raw:`,
            durationValueRaw
          );
          console.log(
            `📊 Row ${i + 1} - Duration value parsed:`,
            durationValue
          );
          console.log(
            `📊 Row ${i + 1} - Found durationUnitKey: "${durationUnitKey}"`
          );
          console.log(`📊 Row ${i + 1} - Duration unit raw:`, durationUnitRaw);
          console.log(`📊 Row ${i + 1} - Duration unit parsed:`, durationUnit);
        }

        // Apply defaults if duration is missing or invalid
        if (
          !durationValueRaw ||
          durationValueRaw === "" ||
          isNaN(durationValue) ||
          durationValue <= 0
        ) {
          durationValue = 1; // Default to 1
          console.log(`⚠️  Row ${i + 1}: Using default duration value: 1`);
        }
        if (
          !durationUnit ||
          durationUnit === "" ||
          !["Days", "Weeks", "Months", "Years"].includes(durationUnit)
        ) {
          durationUnit = "Months"; // Default to Months
          console.log(`⚠️  Row ${i + 1}: Using default duration unit: Months`);
        }

        const originalPrice = parseFloat(
          String(pkg["Original Price"] || pkg.originalPrice || 0).replace(
            /,/g,
            ""
          )
        );
        const discountType = (
          pkg["Discount Type"] ||
          pkg.discountType ||
          "flat"
        ).toLowerCase();
        const discountValue = parseFloat(
          String(pkg["Discount Value"] || pkg.discountValue || 0).replace(
            /,/g,
            ""
          )
        );
        const freezable =
          String(pkg.Freezable || pkg.freezable || "no").toLowerCase() ===
            "yes" ||
          pkg.freezable === true ||
          pkg.Freezable === true;

        // Validate required fields
        if (!packageName) {
          throw new Error("Package name is required");
        }
        if (!originalPrice || originalPrice <= 0) {
          throw new Error("Valid original price is required");
        }

        // Calculate discounted price and savings based on discount type
        let discountedPrice;
        let savings;

        if (discountType === "percentage") {
          // Discount value is a percentage
          savings = (originalPrice * discountValue) / 100;
          discountedPrice = originalPrice - savings;
        } else {
          // Discount type is "flat" - discount value is the final price or direct discount amount
          if (discountValue >= originalPrice) {
            // If discount value is close to original price, treat as final price
            discountedPrice = discountValue;
            savings = originalPrice - discountValue;
          } else {
            // Treat as discount amount to subtract
            savings = discountValue;
            discountedPrice = originalPrice - discountValue;
          }
        }

        // Ensure prices are non-negative
        if (discountedPrice < 0) discountedPrice = 0;
        if (savings < 0) savings = 0;

        // Parse status
        const packageStatus = pkg["Package Status"] || pkg.status || "Active";
        const isActive = packageStatus.toLowerCase() === "active";

        // Create package data object matching the schema
        const packageData = {
          packageName,
          packageType,
          category: packageCategory,
          description: pkg.Description || pkg.description || "",
          duration: {
            value: durationValue,
            unit: durationUnit,
          },
          originalPrice,
          discountedPrice,
          savings,
          discountType: discountType === "percentage" ? "percentage" : "flat",
          freezable,
          sessions: pkg.Sessions || pkg.sessions || "Unlimited",
          sessionCount: pkg["Session Count"] || pkg.sessionCount || null,
          features: [],
          amenities: {
            gymAccess: true,
            lockerRoom: true,
            basicEquipment: true,
            premiumEquipment: false,
            groupClasses: false,
            personalTrainer: false,
            nutritionPlan: false,
            sauna: false,
            steamRoom: false,
            swimmingPool: false,
            spa: false,
            dietConsultation: false,
            guestPass: false,
          },
          status: packageStatus,
          isActive,
          isFeatured: false,
          badge: pkg.Badge || pkg.badge || "",
          popularity: 0,
          displayOrder: 0,
        };

        // Check if package already exists by name
        const existingPackage = await Package.findOne({ packageName });

        if (existingPackage) {
          // Update existing package
          const updatedPackage = await Package.findByIdAndUpdate(
            existingPackage._id,
            packageData,
            { new: true, runValidators: true }
          );

          results.success.push({
            row: i + 1,
            packageName,
            action: "updated",
            id: updatedPackage._id,
          });

          console.log(
            `✅ Row ${i + 1}: Updated package "${packageName}" (ID: ${
              updatedPackage._id
            })`
          );
        } else {
          // Create new package
          const newPackage = await Package.create(packageData);

          results.success.push({
            row: i + 1,
            packageName,
            action: "created",
            id: newPackage._id,
          });

          console.log(
            `✅ Row ${i + 1}: Created package "${packageName}" (ID: ${
              newPackage._id
            })`
          );
        }
      } catch (error) {
        console.error(`❌ Row ${i + 1}: ${error.message}`);
        results.failed.push({
          row: i + 1,
          packageName: pkg["Package Name"] || pkg.packageName || "Unknown",
          error: error.message,
          data: pkg,
        });
      }
    }

    // Generate summary
    const summary = {
      total: results.total,
      successful: results.success.length,
      failed: results.failed.length,
      created: results.success.filter((r) => r.action === "created").length,
      updated: results.success.filter((r) => r.action === "updated").length,
    };

    console.log("\n📊 IMPORT SUMMARY:");
    console.log(`Total: ${summary.total}`);
    console.log(
      `✅ Successful: ${summary.successful} (${summary.created} created, ${summary.updated} updated)`
    );
    console.log(`❌ Failed: ${summary.failed}`);

    return res.status(200).json({
      success: true,
      message: `Import completed: ${summary.successful} successful, ${summary.failed} failed`,
      summary,
      results,
    });
  } catch (error) {
    console.error("❌ Error in bulkImportPackages:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to import packages",
    });
  }
};

// ============================================
// UPLOAD PACKAGE IMAGE
// ============================================
const uploadPackageImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Check file size (60MB = 60 * 1024 * 1024 bytes)
    const maxSize = 60 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: "File size exceeds 60MB limit",
      });
    }

    // Convert buffer to base64
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    // Upload to cloudinary
    const result = await imageUploadUtil(dataURI);

    console.log("✅ Image uploaded to Cloudinary:", result.secure_url);

    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error("❌ Error uploading image:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to upload image",
    });
  }
};

// ============================================
// GET IMPORT TEMPLATE
// ============================================
const getImportTemplate = async (req, res) => {
  try {
    const template = [
      {
        "Package Name": "Example Package",
        "Package Type": "Membership",
        "Package Category": "Basic",
        "Duration value": 1,
        "Duration unit": "Months",
        "Original Price": 5000,
        "Discount Type": "percentage",
        "Discount Value": 25,
        Freezable: "Yes",
        "Package Status": "Active",
        Description: "Sample package description",
        Sessions: "Unlimited",
        "Session Count": "",
        Badge: "Popular",
      },
    ];

    return res.status(200).json({
      success: true,
      template,
      instructions: {
        "Package Name": "Required - Unique name for the package",
        "Package Type":
          "Required - Options: Membership, Personal Training, Group Classes, Day Pass, Corporate, Special",
        "Package Category": "Required - Options: Basic, Premium, VIP, Custom",
        "Duration value": "Required - Number (e.g., 1, 3, 6, 12)",
        "Duration unit": "Required - Options: Days, Weeks, Months, Years",
        "Original Price": "Required - Number without commas (e.g., 5000)",
        "Discount Type": "Required - Options: flat, percentage",
        "Discount Value":
          "Required - If percentage: enter % value (e.g., 25 for 25%), If flat: enter discount amount",
        Freezable: "Required - Options: Yes, No",
        "Package Status": "Required - Options: Active, Inactive, Coming Soon",
        Description: "Optional - Package description",
        Sessions: "Optional - Default: Unlimited",
        "Session Count": "Optional - Number of sessions if not unlimited",
        Badge: "Optional - Badge text (e.g., Popular, Best Value)",
      },
    });
  } catch (error) {
    console.error("❌ Error getting template:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to get template",
    });
  }
};

module.exports = {
  bulkImportPackages,
  uploadPackageImage,
  getImportTemplate,
};
