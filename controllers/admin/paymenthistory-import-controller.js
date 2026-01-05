const PaymentHistory = require("../../models/admin/PaymentHistory");
const Member = require("../../models/admin/Members");

// ============================================
// BULK IMPORT PAYMENT HISTORY FROM EXCEL
// ============================================
const bulkImportPaymentHistory = async (req, res) => {
  try {
    const { payments } = req.body;

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of payment records",
      });
    }

    console.log(`📥 Importing ${payments.length} payment records...`);

    // Helper function to parse various date formats
    const parseDate = (dateValue) => {
      if (!dateValue) return null;

      // If it's already a valid date object
      if (dateValue instanceof Date) return dateValue;

      // Excel serial date (number like 44136)
      if (typeof dateValue === "number") {
        return new Date((dateValue - 25569) * 86400 * 1000);
      }

      // String date - try multiple formats
      const dateStr = String(dateValue).trim();

      // Try standard Date parsing first
      let date = new Date(dateStr);
      if (!isNaN(date.getTime())) return date;

      // Try "30th Oct 2020" format
      const monthMap = {
        jan: 0,
        feb: 1,
        mar: 2,
        apr: 3,
        may: 4,
        jun: 5,
        jul: 6,
        aug: 7,
        sep: 8,
        oct: 9,
        nov: 10,
        dec: 11,
      };

      const match = dateStr.match(/(\d+)(?:st|nd|rd|th)?\s+(\w+)\s+(\d{4})/i);
      if (match) {
        const [, day, month, year] = match;
        const monthIndex = monthMap[month.toLowerCase().substr(0, 3)];
        if (monthIndex !== undefined) {
          return new Date(year, monthIndex, parseInt(day));
        }
      }

      return null;
    };

    const results = {
      success: [],
      failed: [],
      total: payments.length,
    };

    for (let i = 0; i < payments.length; i++) {
      const payment = payments[i];

      try {
        // Clean amount value (remove commas)
        const cleanAmount = (value) => {
          if (!value) return 0;
          const cleaned = String(value).replace(/,/g, "");
          return parseFloat(cleaned) || 0;
        };

        // Map Excel columns to schema fields
        const paymentData = {
          // Member Information
          memberName: payment.Name || payment.memberName,
          memberPhone:
            payment["Mobile Number"] ||
            payment.mobileNumber ||
            payment.memberPhone,
          memberEmail: payment.Email || payment.email || payment.memberEmail,

          // Package Information
          packageName:
            payment.Packages || payment.packageName || "Standard Package",
          packageDuration: {
            text:
              payment["Package Duration"] ||
              payment.packageDuration ||
              "12 months,",
          },

          // Payment Details
          amount: cleanAmount(
            payment.Amount || payment.amount || payment.finalAmount
          ),
          finalAmount: cleanAmount(
            payment.Amount || payment.finalAmount || payment.amount
          ),
          paymentMode: payment["Payment Mode"] || payment.paymentMode || "upi",
          paymentMethod:
            payment["Payment Mode"] || payment.paymentMethod || "UPI",

          // Dates - using improved date parsing
          purchaseDate:
            parseDate(payment["Purchase Date"]) ||
            parseDate(payment.purchaseDate) ||
            new Date(),
          paymentDate:
            parseDate(payment["Purchase Date"]) ||
            parseDate(payment.paymentDate) ||
            new Date(),
          activationDate:
            parseDate(payment["Activation Date"]) ||
            parseDate(payment.activationDate),
          expiryDate:
            parseDate(payment["Expiry Date"]) || parseDate(payment.expiryDate),
          membershipStartDate:
            parseDate(payment["Activation Date"]) ||
            parseDate(payment.activationDate),
          membershipEndDate:
            parseDate(payment["Expiry Date"]) || parseDate(payment.expiryDate),

          // Invoice & Transaction
          invoiceNumber:
            payment["Invoice Number"] ||
            payment.invoiceNumber ||
            payment.transactionId,
          transactionId: payment.transactionId || payment["Invoice Number"],

          // Sales & Customer Rep
          salesRep: payment["Sales Rep"] || payment.salesRep,
          customerRep: payment["Customer Rep"] || payment.customerRep,

          // Status
          paymentStatus: "Paid",
          transactionType: "New Membership",

          // Notes
          notes:
            payment.notes ||
            `Imported from Excel on ${new Date().toLocaleDateString()}`,
        };

        // Try to find matching member by phone
        if (paymentData.memberPhone) {
          const existingMember = await Member.findOne({
            phoneNumber: paymentData.memberPhone,
            isDeleted: false,
          });

          if (existingMember) {
            paymentData.memberId = existingMember._id;
            paymentData.memberName = existingMember.fullName;
            paymentData.memberEmail = existingMember.email;
          }
        }

        // Create payment record
        const newPayment = await PaymentHistory.create(paymentData);

        results.success.push({
          index: i + 1,
          name: paymentData.memberName,
          phone: paymentData.memberPhone,
          receiptNumber: newPayment.receiptNumber,
        });

        console.log(
          `✅ Imported: ${paymentData.memberName} - ${newPayment.receiptNumber}`
        );
      } catch (error) {
        results.failed.push({
          index: i + 1,
          name: payment.Name || payment.memberName,
          error: error.message,
        });

        console.error(
          `❌ Failed to import record ${i + 1}:`,
          payment.Name,
          error.message
        );
        console.error(`   Record data:`, JSON.stringify(payment, null, 2));
      }
    }

    console.log(
      `\n📊 Import Complete: ${results.success.length} success, ${results.failed.length} failed`
    );

    return res.status(200).json({
      success: true,
      message: `Successfully imported ${results.success.length} out of ${results.total} payment records`,
      results,
    });
  } catch (error) {
    console.error("❌ Error in bulk import:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to import payment history",
      error: error.message,
    });
  }
};

// ============================================
// VALIDATE EXCEL DATA BEFORE IMPORT
// ============================================
const validateExcelData = async (req, res) => {
  try {
    const { payments } = req.body;

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of payment records",
      });
    }

    const validationResults = {
      valid: [],
      invalid: [],
      warnings: [],
      total: payments.length,
    };

    for (let i = 0; i < payments.length; i++) {
      const payment = payments[i];
      const issues = [];
      const warnings = [];

      // Helper function to parse various date formats
      const parseDate = (dateValue) => {
        if (!dateValue) return null;

        // If it's already a valid date object
        if (dateValue instanceof Date) return dateValue;

        // Excel serial date (number like 44136)
        if (typeof dateValue === "number") {
          return new Date((dateValue - 25569) * 86400 * 1000);
        }

        // String date - try multiple formats
        const dateStr = String(dateValue).trim();

        // Try standard Date parsing first
        let date = new Date(dateStr);
        if (!isNaN(date.getTime())) return date;

        // Try "30th Oct 2020" format
        const monthMap = {
          jan: 0,
          feb: 1,
          mar: 2,
          apr: 3,
          may: 4,
          jun: 5,
          jul: 6,
          aug: 7,
          sep: 8,
          oct: 9,
          nov: 10,
          dec: 11,
        };

        const match = dateStr.match(/(\d+)(?:st|nd|rd|th)?\s+(\w+)\s+(\d{4})/i);
        if (match) {
          const [, day, month, year] = match;
          const monthIndex = monthMap[month.toLowerCase().substr(0, 3)];
          if (monthIndex !== undefined) {
            return new Date(year, monthIndex, parseInt(day));
          }
        }

        return null;
      };

      // Required field checks
      if (!payment.Name && !payment.memberName) {
        issues.push("Missing member name");
      }

      if (!payment["Mobile Number"] && !payment.mobileNumber) {
        issues.push("Missing mobile number");
      }

      // Amount validation - handle numbers with commas
      const amountValue =
        payment.Amount || payment.amount || payment.finalAmount;
      if (!amountValue) {
        issues.push("Missing amount");
      } else {
        const cleanAmount = String(amountValue).replace(/,/g, "");
        const parsedAmount = parseFloat(cleanAmount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          issues.push("Invalid amount value");
        }
      }

      // Date validation
      if (payment["Purchase Date"]) {
        const date = parseDate(payment["Purchase Date"]);
        if (!date || isNaN(date.getTime())) {
          issues.push(`Invalid purchase date: ${payment["Purchase Date"]}`);
        }
      } else {
        warnings.push("Missing purchase date");
      }

      if (payment["Activation Date"]) {
        const date = parseDate(payment["Activation Date"]);
        if (!date || isNaN(date.getTime())) {
          issues.push(`Invalid activation date: ${payment["Activation Date"]}`);
        }
      }

      if (payment["Expiry Date"]) {
        const date = parseDate(payment["Expiry Date"]);
        if (!date || isNaN(date.getTime())) {
          issues.push(`Invalid expiry date: ${payment["Expiry Date"]}`);
        }
      }

      // Check if member exists
      const phone =
        payment["Mobile Number"] || payment.mobileNumber || payment.memberPhone;
      if (phone) {
        const existingMember = await Member.findOne({
          phoneNumber: phone,
          isDeleted: false,
        });
        if (!existingMember) {
          warnings.push(
            "Member not found in database (will create new record)"
          );
        }
      }

      const record = {
        index: i + 1,
        name: payment.Name || payment.memberName,
        phone: phone,
        issues,
        warnings,
      };

      if (issues.length > 0) {
        validationResults.invalid.push(record);
      } else {
        validationResults.valid.push(record);
        if (warnings.length > 0) {
          validationResults.warnings.push(record);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Validation complete: ${validationResults.valid.length} valid, ${validationResults.invalid.length} invalid`,
      validationResults,
    });
  } catch (error) {
    console.error("❌ Error validating data:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to validate data",
      error: error.message,
    });
  }
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
  bulkImportPaymentHistory,
  validateExcelData,
};
