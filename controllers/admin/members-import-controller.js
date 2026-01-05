const Member = require("../../models/admin/Members");
const Package = require("../../models/admin/Packages");
const User = require("../../models/auth/Users");

// ============================================
// HELPER FUNCTION: PARSE DATE IN MULTIPLE FORMATS
// ============================================
const parseDate = (dateString) => {
  if (!dateString || dateString.trim() === "") {
    return null;
  }

  const dateStr = dateString.trim();

  // Try ISO format first (YYYY-MM-DD)
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Try DD/MM/YYYY format
  const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1; // Month is 0-indexed
    const year = parseInt(ddmmyyyyMatch[3], 10);
    date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Try MM/DD/YYYY format
  const mmddyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyyMatch) {
    const month = parseInt(mmddyyyyMatch[1], 10) - 1;
    const day = parseInt(mmddyyyyMatch[2], 10);
    const year = parseInt(mmddyyyyMatch[3], 10);
    date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Try DD-MM-YYYY format
  const ddmmyyyyDashMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyyDashMatch) {
    const day = parseInt(ddmmyyyyDashMatch[1], 10);
    const month = parseInt(ddmmyyyyDashMatch[2], 10) - 1;
    const year = parseInt(ddmmyyyyDashMatch[3], 10);
    date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
};

// ============================================
// HELPER FUNCTION: GENERATE REGISTRATION NUMBER
// ============================================
const generateRegistrationNumber = async (providedNumber) => {
  const cleanedNumber = providedNumber
    ? providedNumber.trim().toUpperCase()
    : "";

  // Check if it's a placeholder value that should be auto-generated
  const placeholderValues = ["NOT AVAILABLE", "N/A", "NA", ""];
  const shouldAutoGenerate =
    !cleanedNumber || placeholderValues.includes(cleanedNumber);

  // Special case: VISITOR should generate VIS prefix
  if (cleanedNumber === "VISITOR") {
    // Find the last VISITOR registration number
    const lastVisitor = await Member.findOne({
      registrationNumber: { $regex: /^VIS\d+$/i },
    }).sort({ registrationNumber: -1 });

    let visitorNumber = "VIS1001";
    if (lastVisitor && lastVisitor.registrationNumber) {
      const lastNumber = parseInt(
        lastVisitor.registrationNumber.replace(/\D/g, "")
      );
      if (!isNaN(lastNumber)) {
        visitorNumber = `VIS${lastNumber + 1}`;
      }
    }
    return visitorNumber;
  }

  // If valid registration number provided, check for duplicates
  if (!shouldAutoGenerate) {
    const existing = await Member.findOne({
      registrationNumber: cleanedNumber,
    });
    if (existing) {
      throw new Error(`Registration number ${cleanedNumber} already exists`);
    }
    return cleanedNumber;
  }

  // Auto-generate registration number with FLM prefix
  const lastMember = await Member.findOne({
    registrationNumber: { $regex: /^FLM\d+$/i },
  }).sort({ registrationNumber: -1 });

  let registrationNumber = "FLM1001";

  if (lastMember && lastMember.registrationNumber) {
    const lastNumber = parseInt(
      lastMember.registrationNumber.replace(/\D/g, "")
    );
    if (!isNaN(lastNumber)) {
      registrationNumber = `FLM${lastNumber + 1}`;
    }
  }

  return registrationNumber;
};

// ============================================
// HELPER FUNCTION: CALCULATE END DATE
// ============================================
const calculateEndDate = (startDate, durationValue, durationUnit) => {
  const endDate = new Date(startDate);

  switch (durationUnit) {
    case "Days":
      endDate.setDate(endDate.getDate() + durationValue);
      break;
    case "Weeks":
      endDate.setDate(endDate.getDate() + durationValue * 7);
      break;
    case "Months":
      endDate.setMonth(endDate.getMonth() + durationValue);
      break;
    case "Years":
      endDate.setFullYear(endDate.getFullYear() + durationValue);
      break;
    default:
      endDate.setMonth(endDate.getMonth() + durationValue);
  }

  return endDate;
};

// ============================================
// VALIDATE BULK MEMBERS DATA (NEW ENDPOINT)
// ============================================
const validateBulkMembers = async (req, res) => {
  try {
    const { members } = req.body;

    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of member records",
      });
    }

    console.log(`🔍 Validating ${members.length} member records...`);

    const validationResults = [];
    const validMembers = [];
    const invalidMembers = [];

    // Fetch all packages and trainers once
    const allPackages = await Package.find({}); // Fetch all packages, including inactive
    const allTrainers = await User.find({
      role: "trainer",
      isActive: true,
    }).select("_id fullName email phoneNumber");

    console.log(`📦 Found ${allPackages.length} total packages in database`);
    console.log(`👤 Found ${allTrainers.length} active trainers`);

    for (let i = 0; i < members.length; i++) {
      const memberData = members[i];
      const rowNumber = i + 2; // Excel row number (header is row 1)
      const errors = [];
      const warnings = [];

      try {
        // Extract fields
        const registrationNumber =
          memberData["Registration Number"] ||
          memberData["registrationNumber"] ||
          "";
        const memberJoiningDate =
          memberData["Member Joining Date"] ||
          memberData["memberJoiningDate"] ||
          "";
        const fullName =
          memberData["Full Name"] || memberData["fullName"] || "";
        const phone = memberData["Phone"] || memberData["phone"] || "";
        const packageName =
          memberData["Package"] || memberData["package"] || "";
        const packageStartDate =
          memberData["package start date"] ||
          memberData["packageStartDate"] ||
          "";
        const trainerId =
          memberData["trainer"] || memberData["trainerId"] || "";
        const lastUpdateDate =
          memberData["last update date"] || memberData["lastUpdateDate"] || "";
        const status = memberData["status"] || memberData["Status"] || "";

        // Validate required fields
        if (!fullName || fullName.trim() === "") {
          errors.push("Full Name is required");
        }
        if (!phone || phone.trim() === "") {
          errors.push("Phone is required");
        }
        if (!packageName || packageName.trim() === "") {
          errors.push("Package is required");
        }
        if (!packageStartDate) {
          errors.push("Package start date is required");
        }
        if (!status || status.trim() === "") {
          errors.push("Status is required");
        }

        // Validate registration number (if provided, check for duplicates)
        if (registrationNumber && registrationNumber.trim() !== "") {
          const existing = await Member.findOne({
            registrationNumber: registrationNumber.trim().toUpperCase(),
          });
          if (existing) {
            errors.push(
              `Registration number ${registrationNumber} already exists`
            );
          }
        } else {
          warnings.push("Registration number will be auto-generated");
        }

        // Validate package exists - more flexible matching
        let packageDoc = null;
        if (packageName) {
          const cleanPackageName = packageName.trim().replace(/\s+/g, " ");

          // Try exact match first (case-insensitive)
          packageDoc = allPackages.find(
            (p) =>
              p.packageName.trim().toLowerCase() ===
              cleanPackageName.toLowerCase()
          );

          // If not found, try matching without special characters
          if (!packageDoc) {
            const simplifiedName = cleanPackageName
              .replace(/[^\w\s]/g, "")
              .trim();
            packageDoc = allPackages.find((pkg) => {
              const pkgSimplified = pkg.packageName
                .replace(/[^\w\s]/g, "")
                .trim();
              return (
                pkgSimplified.toLowerCase() === simplifiedName.toLowerCase()
              );
            });
          }

          if (!packageDoc) {
            // Log for debugging
            console.log(
              `❌ Package not found: "${packageName}" (cleaned: "${cleanPackageName}")`
            );
            console.log(
              `Available packages: ${allPackages
                .map((p) => `"${p.packageName}"`)
                .join(", ")}`
            );

            const availableNames = allPackages
              .slice(0, 5)
              .map((p) => p.packageName)
              .join(", ");
            errors.push(
              `Package "${packageName}" not found. Check spelling/spacing. Available: ${availableNames}${
                allPackages.length > 5 ? "..." : ""
              }`
            );
          }
        }

        // Validate trainer (if provided)
        if (trainerId && trainerId.trim() !== "") {
          const trainer = allTrainers.find(
            (t) => t._id.toString() === trainerId.trim()
          );
          if (!trainer) {
            errors.push(`Trainer with ID "${trainerId}" not found`);
          }
        } else {
          warnings.push("No trainer assigned");
        }

        // Validate dates
        if (memberJoiningDate) {
          const joiningDate = parseDate(memberJoiningDate);
          if (!joiningDate) {
            errors.push(`Invalid Member Joining Date: ${memberJoiningDate}`);
          }
        }

        if (packageStartDate) {
          const startDate = parseDate(packageStartDate);
          if (!startDate) {
            errors.push(`Invalid Package start date: ${packageStartDate}`);
          }
        }

        // Validate status
        const validStatuses = ["active", "inactive"];
        if (status && !validStatuses.includes(status.toLowerCase())) {
          errors.push(
            `Invalid status: ${status}. Must be "Active" or "Inactive"`
          );
        }

        // Check if phone already exists
        if (phone && phone.trim() !== "") {
          const existingMember = await Member.findOne({
            phoneNumber: phone.trim(),
          });
          if (existingMember) {
            warnings.push(
              `Phone number already exists for member: ${existingMember.fullName} (Reg: ${existingMember.registrationNumber}). Package will be added to existing member.`
            );
          }
        }

        if (errors.length > 0) {
          invalidMembers.push({
            row: rowNumber,
            fullName: fullName || "Unknown",
            phone: phone || "N/A",
            errors,
            warnings,
            data: memberData,
          });
        } else {
          validMembers.push({
            row: rowNumber,
            fullName,
            phone,
            package: packageName,
            warnings,
            data: memberData,
          });
        }
      } catch (error) {
        invalidMembers.push({
          row: rowNumber,
          fullName: memberData["Full Name"] || "Unknown",
          errors: [error.message],
          warnings: [],
          data: memberData,
        });
      }
    }

    const summary = {
      total: members.length,
      valid: validMembers.length,
      invalid: invalidMembers.length,
    };

    console.log(`✅ Validation completed:`, summary);

    res.status(200).json({
      success: true,
      message: "Validation completed",
      summary,
      validMembers,
      invalidMembers,
    });
  } catch (error) {
    console.error("❌ Validation error:", error);
    res.status(500).json({
      success: false,
      message: "Error validating members",
      error: error.message,
    });
  }
};

// ============================================
// BULK IMPORT MEMBERS FROM EXCEL
// ============================================
const bulkImportMembers = async (req, res) => {
  try {
    const { members } = req.body;

    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of member records",
      });
    }

    console.log(`📥 Importing ${members.length} member records...`);

    const results = {
      success: [],
      failed: [],
      total: members.length,
    };

    // Fetch all trainers once for efficiency
    const allTrainers = await User.find({
      role: "trainer",
      isActive: true,
    }).select("_id fullName email phoneNumber");

    for (let i = 0; i < members.length; i++) {
      const memberData = members[i];

      try {
        // Extract fields with multiple possible field names
        const registrationNumber =
          memberData["Registration Number"] ||
          memberData["registrationNumber"] ||
          "";
        const memberJoiningDateRaw =
          memberData["Member Joining Date"] ||
          memberData["memberJoiningDate"] ||
          "";
        const fullName =
          memberData["Full Name"] || memberData["fullName"] || "";
        const phone = memberData["Phone"] || memberData["phone"] || "";
        const packageName =
          memberData["Package"] || memberData["package"] || "";
        const packageStartDateRaw =
          memberData["package start date"] ||
          memberData["packageStartDate"] ||
          "";
        const trainerId =
          memberData["trainer"] || memberData["trainerId"] || "";
        const lastUpdateDateRaw =
          memberData["last update date"] || memberData["lastUpdateDate"] || "";
        const status = (
          memberData["status"] ||
          memberData["Status"] ||
          "Active"
        ).trim();

        // Extract financial fields
        const emailId = memberData["Email Id"] || memberData["email"] || "";
        const paidAmountRaw =
          memberData["Paid Amount"] || memberData["paidAmount"] || "0";
        const discountRaw =
          memberData["Discount"] || memberData["discount"] || "0";
        const dueRaw = memberData["Due"] || memberData["due"] || "";
        const paymentMode = memberData["Mode"] || memberData["mode"] || "";
        const dueDateRaw =
          memberData["Due Date"] || memberData["dueDate"] || "";

        // Validate required fields
        if (!fullName || fullName.trim() === "") {
          throw new Error("Full Name is required");
        }
        if (!phone || phone.trim() === "") {
          throw new Error("Phone is required");
        }
        if (!packageName || packageName.trim() === "") {
          throw new Error("Package is required");
        }
        if (!packageStartDateRaw) {
          throw new Error("Package start date is required");
        }

        // Find the package by name - more flexible matching
        const cleanPackageName = packageName.trim().replace(/\s+/g, " ");

        // Try exact match first
        let packageDoc = await Package.findOne({
          packageName: {
            $regex: new RegExp(
              `^${cleanPackageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
              "i"
            ),
          },
        });

        // If not found, try matching without special characters
        if (!packageDoc) {
          const simplifiedName = cleanPackageName
            .replace(/[^\w\s]/g, "")
            .trim();
          const allPackages = await Package.find({ isActive: true });

          packageDoc = allPackages.find((pkg) => {
            const pkgSimplified = pkg.packageName
              .replace(/[^\w\s]/g, "")
              .trim();
            return pkgSimplified.toLowerCase() === simplifiedName.toLowerCase();
          });
        }

        if (!packageDoc) {
          // Get all available package names for better error message
          const availablePackages = await Package.find({ isActive: true })
            .select("packageName")
            .limit(5);
          const packageList = availablePackages
            .map((p) => p.packageName)
            .join(", ");
          throw new Error(
            `Package "${packageName}" not found. Available packages: ${packageList}${
              availablePackages.length >= 5 ? ", ..." : ""
            }`
          );
        }

        // Parse package start date
        const packageStartDate = parseDate(packageStartDateRaw);
        if (!packageStartDate) {
          throw new Error(`Invalid Package start date: ${packageStartDateRaw}`);
        }

        // Parse member joining date (use package start date if not provided)
        const memberJoiningDate = memberJoiningDateRaw
          ? parseDate(memberJoiningDateRaw)
          : packageStartDate;

        if (!memberJoiningDate) {
          throw new Error(
            `Invalid Member Joining Date: ${memberJoiningDateRaw}`
          );
        }

        // Calculate end date based on package duration and start date
        const packageEndDate = calculateEndDate(
          packageStartDate,
          packageDoc.duration.value,
          packageDoc.duration.unit
        );

        // Get original package price (not discounted price)
        const packagePrice = packageDoc.originalPrice;

        // Parse and calculate financial fields
        // Admin provides discount in flat amount in Excel
        // We need to store it in the format matching package's discount type
        let discountAmount = 0;
        let discountValue = 0; // This will be stored based on package's discount type
        let discountTypeToStore = packageDoc.discountType || "flat";

        const discountNumeric = parseFloat(discountRaw) || 0;

        if (discountNumeric > 0) {
          // Admin gives discount in flat amount (e.g., 2000)
          discountAmount = discountNumeric;

          // Convert to package's discount type
          if (discountTypeToStore === "percentage") {
            // Convert flat amount to percentage
            // e.g., 2000 discount on 9000 = (2000/9000) * 100 = 22.22%
            discountValue = (discountAmount / packagePrice) * 100;
          } else {
            // Keep as flat amount
            discountValue = discountAmount;
          }
        }

        // 2. Parse paid amount (amount received after discount)
        const paidAmount = parseFloat(paidAmountRaw) || 0;

        // 3. Calculate final amount and due amount
        // Final Amount = Original Price - Discount
        const finalAmount = packagePrice - discountAmount;

        // Due = Final Amount - Paid Amount
        let dueAmount = 0;
        if (dueRaw && !isNaN(parseFloat(dueRaw))) {
          // If due is explicitly provided, use it
          dueAmount = parseFloat(dueRaw);
        } else {
          // Calculate due amount
          dueAmount = Math.max(0, finalAmount - paidAmount);
        }

        // 4. Determine payment status
        const paymentStatus = dueAmount > 0 ? "Pending" : "Paid";

        // 5. Parse and validate due date (optional, even if due > 0)
        let dueDate = null;
        if (dueDateRaw && dueDateRaw.trim() !== "") {
          dueDate = parseDate(dueDateRaw);
          if (!dueDate) {
            throw new Error(
              `Invalid Due Date format: ${dueDateRaw}. Use YYYY-MM-DD or DD/MM/YYYY`
            );
          }
        }
        // Due date is optional - only used if provided, not required even if due > 0

        // 6. Determine payment method
        const paymentMethod =
          paymentMode && paymentMode.trim() !== ""
            ? paymentMode.trim()
            : "Cash";

        const totalPaid = paidAmount;
        const totalPending = dueAmount;

        // Generate or validate registration number
        const genRegistrationNumber = await generateRegistrationNumber(
          registrationNumber
        );

        // Find trainer details if trainer ID is provided
        let trainerDetails = null;
        if (trainerId && trainerId.trim() !== "") {
          trainerDetails = allTrainers.find(
            (t) => t._id.toString() === trainerId.trim()
          );
          if (!trainerDetails) {
            throw new Error(`Trainer with ID "${trainerId}" not found`);
          }
        }

        // Parse last update date (use current date if not provided)
        const lastUpdate = lastUpdateDateRaw
          ? parseDate(lastUpdateDateRaw)
          : new Date();

        // Validate and normalize status
        const memberStatus =
          status.toLowerCase() === "active" ? "Active" : "Inactive";

        // Check if member with this phone already exists
        const existingMember = await Member.findOne({
          phoneNumber: phone.trim(),
        });

        if (existingMember) {
          // Member exists, add package to existing member
          const newPackage = {
            packageId: packageDoc._id,
            packageName: packageDoc.packageName,
            packageType: packageDoc.packageType,
            startDate: packageStartDate,
            endDate: packageEndDate,
            amount: packagePrice,
            discount: discountValue,
            discountType: discountTypeToStore,
            finalAmount,
            totalPaid,
            totalPending,
            paymentStatus,
            paymentMethod,
            paymentDate: packageStartDate,
            packageStatus:
              packageStartDate <= new Date() ? "Active" : "Upcoming",
            isPrimary: existingMember.packages.length === 0,
            autoRenew: false,
            dueDate: dueDate || null,
          };

          existingMember.packages.push(newPackage);

          // Update email if provided and not already set
          if (emailId && emailId.trim() !== "" && !existingMember.email) {
            existingMember.email = emailId.trim().toLowerCase();
          }

          // Update trainer if provided
          if (trainerDetails) {
            existingMember.assignedTrainer = trainerDetails._id;
          }

          // Update payment summary
          existingMember.totalPaid =
            (existingMember.totalPaid || 0) + totalPaid;
          existingMember.totalPending =
            (existingMember.totalPending || 0) + totalPending;

          // Update status
          existingMember.status = memberStatus;

          await existingMember.save();

          results.success.push({
            row: i + 2,
            fullName,
            action: "package_added",
            registrationNumber: existingMember.registrationNumber,
            id: existingMember._id,
            message: `Added package to existing member (Reg: ${existingMember.registrationNumber})`,
          });

          console.log(
            `✅ Row ${
              i + 2
            }: Added package to existing member "${fullName}" (Reg: ${
              existingMember.registrationNumber
            })`
          );
        } else {
          // Create new member
          const newMemberData = {
            registrationNumber: genRegistrationNumber,
            fullName: fullName.trim(),
            email:
              emailId && emailId.trim() !== ""
                ? emailId.trim().toLowerCase()
                : undefined,
            phoneNumber: phone.trim(),
            alternatePhone: "",
            gender: "Prefer not to say",
            joiningDate: memberJoiningDate,
            dueDate: dueDate || null,
            status: memberStatus,
            packages: [
              {
                packageId: packageDoc._id,
                packageName: packageDoc.packageName,
                packageType: packageDoc.packageType,
                startDate: packageStartDate,
                endDate: packageEndDate,
                amount: packagePrice,
                discount: discountValue,
                discountType: discountTypeToStore,
                finalAmount,
                totalPaid,
                totalPending,
                paymentStatus,
                paymentMethod,
                paymentDate: packageStartDate,
                packageStatus:
                  packageStartDate <= new Date() ? "Active" : "Upcoming",
                isPrimary: true,
                autoRenew: false,
                dueDate: dueDate || null,
              },
            ],
            totalPaid,
            totalPending,
          };

          // Add trainer if provided
          if (trainerDetails) {
            newMemberData.assignedTrainer = trainerDetails._id;
          }

          const newMember = new Member(newMemberData);
          await newMember.save();

          results.success.push({
            row: i + 2,
            fullName,
            action: "created",
            registrationNumber: genRegistrationNumber,
            id: newMember._id,
            message: `Successfully created member (Reg: ${genRegistrationNumber})`,
          });

          console.log(
            `✅ Row ${
              i + 2
            }: Created member "${fullName}" (Reg: ${genRegistrationNumber})`
          );
        }
      } catch (error) {
        console.error(`❌ Row ${i + 2}: ${error.message}`);
        results.failed.push({
          row: i + 2,
          fullName: memberData["Full Name"] || memberData.fullName || "Unknown",
          error: error.message,
        });
      }
    }

    // Prepare summary
    const summary = {
      total: results.total,
      successful: results.success.length,
      failed: results.failed.length,
      created: results.success.filter((r) => r.action === "created").length,
      updated: results.success.filter((r) => r.action === "package_added")
        .length,
    };

    console.log(`\n📊 Import Summary:`, summary);

    res.status(200).json({
      success: true,
      message: `Import completed: ${summary.successful} successful, ${summary.failed} failed`,
      results: {
        successful: results.success,
        failed: results.failed,
      },
      summary,
    });
  } catch (error) {
    console.error("❌ Bulk import error:", error);
    res.status(500).json({
      success: false,
      message: "Error importing members",
      error: error.message,
    });
  }
};

// ============================================
// GENERATE IMPORT TEMPLATE
// ============================================
const generateImportTemplate = async (req, res) => {
  try {
    // Get all active packages and trainers
    const packages = await Package.find({ isActive: true, status: "Active" })
      .select("packageName duration originalPrice discountedPrice")
      .limit(10);

    const trainers = await User.find({ role: "trainer", isActive: true })
      .select("_id fullName")
      .limit(10);

    const packageNames = packages.map((p) => p.packageName).join(", ");
    const trainerInfo = trainers
      .map((t) => `${t._id} (${t.fullName})`)
      .join(", ");

    const template = [
      {
        "Registration Number": "",
        "Member Joining Date": "2025-01-01",
        "Full Name": "John Doe",
        Phone: "9876543210",
        "Email Id": "john@example.com",
        Package: "FB Fitness Fantasia 2024 Yearly",
        "package start date": "2025-01-01",
        "Paid Amount": "5000",
        Discount: "1000",
        Due: "",
        Mode: "Credit Card",
        "Due Date": "",
        trainer: "",
        "last update date": "2025-01-01",
        status: "Active",
      },
    ];

    const instructions = {
      "Registration Number":
        "Optional. Leave empty to auto-generate (format: FLM1001, FLM1002, etc.). If provided, must be unique.",
      "Member Joining Date":
        "Optional. Format: YYYY-MM-DD or DD/MM/YYYY. Defaults to package start date if not provided.",
      "Full Name": "Required. Member's full name.",
      Phone:
        "Required. Member's phone number (must be unique). If phone exists, package will be added to existing member.",
      "Email Id":
        "Optional. Member's email address. Skip field if not available.",
      Package: `Required. Exact package name. Available: ${
        packageNames || "Check your packages list"
      }`,
      "package start date":
        "Required. Format: YYYY-MM-DD or DD/MM/YYYY. Package end date will be calculated automatically based on package duration.",
      "Paid Amount":
        "Optional (default: 0). Amount received from member (in flat amount, not including discount). This is the actual payment made.",
      Discount:
        "Optional (default: 0). Discount amount (in flat amount). If Excel has percentage discount and package uses percentage, system will convert percentage to flat amount.",
      Due: "Optional. Due amount (in flat amount). If not provided, calculated as: Package Price - Discount - Paid Amount.",
      Mode: "Optional (default: 'Cash'). Payment method (e.g., 'Credit Card', 'UPI', 'Check'). Type any payment mode.",
      "Due Date":
        "Optional. Format: YYYY-MM-DD or DD/MM/YYYY. Payment deadline for remaining amount. If not provided, no due date will be set even if due amount > 0.",
      trainer: `Optional. Trainer ID (not name). Available trainer IDs: ${
        trainerInfo || "No trainers available"
      }`,
      "last update date":
        "Optional. Format: YYYY-MM-DD. Defaults to current date.",
      status: "Required. Either 'Active' or 'Inactive' (case-insensitive).",
    };

    const notes = [
      "💡 Payment Calculation: Due = Package Price - Discount - Paid Amount. Status = PAID if Due ≤ 0, PENDING if Due > 0",
      "💡 Discount Handling: If providing percentage discount and package has percentage discount, system auto-converts to flat amount. Otherwise treats as flat amount.",
      "💡 Due Date Validation: Optional. Only used if provided. Not required even if due amount > 0.",
      "💡 Payment Mode: Optional. Defaults to 'Cash' if not specified.",
      "💡 Package End Date: Automatically calculated based on package duration and start date",
      "💡 Registration Number: Auto-generated if not provided (FLM1001, FLM1002, etc.)",
      "💡 Existing Members: If phone number exists, new package will be added to that member",
      "💡 Trainer: Provide only the Trainer ID (MongoDB ObjectId), not the name",
      "💡 Validation: Use the 'Validate Data' button before importing",
      "💡 Large Files: System can handle 1500+ rows at once",
      "⚠️ Required Fields: Full Name, Phone, Package, Package Start Date, Status",
    ];

    res.status(200).json({
      success: true,
      template,
      instructions,
      notes,
      availablePackages: packageNames,
      availableTrainers: trainerInfo,
    });
  } catch (error) {
    console.error("Error generating template:", error);
    res.status(500).json({
      success: false,
      message: "Error generating template",
      error: error.message,
    });
  }
};

module.exports = {
  bulkImportMembers,
  generateImportTemplate,
  validateBulkMembers,
};
