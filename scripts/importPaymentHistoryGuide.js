// ============================================
// PAYMENT HISTORY EXCEL IMPORT GUIDE
// ============================================

/*
 * This guide will help you import your Excel payment history data into the database.
 *
 * Your Excel columns will be automatically mapped:
 * - "Name" → memberName
 * - "Purchase Date" → purchaseDate, paymentDate
 * - "Invoice Number" → invoiceNumber
 * - "Mobile Number" → memberPhone
 * - "Sales Rep" → salesRep
 * - "Payment Mode" → paymentMode, paymentMethod
 * - "Customer Rep" → customerRep
 * - "Packages" → packageName
 * - "Activation Date" → activationDate, membershipStartDate
 * - "Expiry Date" → expiryDate, membershipEndDate
 * - "Package Duration" → packageDuration.text
 * - "Amount" → amount, finalAmount
 */

// ============================================
// STEP 1: CONVERT EXCEL TO JSON
// ============================================

/*
 * Use an online tool or library to convert your Excel file to JSON format.
 * Each row should become an object with the column names as keys.
 *
 * Example JSON structure:
 */

const examplePaymentData = [
  {
    Name: "partha chatterjee",
    "Purchase Date": "30th Oct 2020",
    "Invoice Number": "2020-0000000001",
    "Mobile Number": "+91-6291701499",
    "Sales Rep": "N/A",
    "Payment Mode": "upi",
    "Customer Rep": "koushik mandal",
    Packages: "Basic Membership Plan Yearly",
    "Activation Date": "20th Nov 2020",
    "Expiry Date": "20th Nov 2021",
    "Package Duration": "12 months,",
    Amount: "5600",
  },
  {
    Name: "mohammad ayaat",
    "Purchase Date": "16th Oct 2020",
    "Invoice Number": "2020-0000000002",
    "Mobile Number": "+91-9804537431",
    "Sales Rep": "N/A",
    "Payment Mode": "upi",
    "Customer Rep": "koushik mandal",
    Packages: "Basic Membership Plan Yearly Group",
    "Activation Date": "27th Oct 2020",
    "Expiry Date": "27th Oct 2021",
    "Package Duration": "12 months,",
    Amount: "5000",
  },
];

// ============================================
// STEP 2: VALIDATE DATA (OPTIONAL BUT RECOMMENDED)
// ============================================

/*
 * API Endpoint: POST /api/admin/payment-history/validate-import
 *
 * Request Body:
 * {
 *   "payments": [ ...your array of payment records... ]
 * }
 *
 * This will check your data and return:
 * - Valid records
 * - Invalid records with issues
 * - Warnings (e.g., member not found in database)
 */

// ============================================
// STEP 3: BULK IMPORT
// ============================================

/*
 * API Endpoint: POST /api/admin/payment-history/bulk-import
 *
 * Request Body:
 * {
 *   "payments": [ ...your array of payment records... ]
 * }
 *
 * Response will include:
 * - success: array of successfully imported records
 * - failed: array of failed records with error messages
 * - total: total number of records processed
 */

// ============================================
// EXAMPLE USING FETCH (Frontend)
// ============================================

async function importPaymentHistory(paymentsArray) {
  try {
    // First, validate the data
    const validateResponse = await fetch(
      "http://localhost:3000/api/admin/payment-history/validate-import",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          payments: paymentsArray,
        }),
      }
    );

    const validationResult = await validateResponse.json();
    console.log("Validation Result:", validationResult);

    // If validation passes, proceed with import
    if (validationResult.validationResults.invalid.length === 0) {
      const importResponse = await fetch(
        "http://localhost:3000/api/admin/payment-history/bulk-import",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            payments: paymentsArray,
          }),
        }
      );

      const importResult = await importResponse.json();
      console.log("Import Result:", importResult);
      return importResult;
    } else {
      console.error(
        "Validation failed:",
        validationResult.validationResults.invalid
      );
      return validationResult;
    }
  } catch (error) {
    console.error("Import error:", error);
    throw error;
  }
}

// ============================================
// EXAMPLE USING AXIOS (Frontend)
// ============================================

async function importWithAxios(paymentsArray) {
  try {
    // Validate first
    const validateRes = await axios.post(
      "http://localhost:3000/api/admin/payment-history/validate-import",
      { payments: paymentsArray },
      { withCredentials: true }
    );

    console.log("Validation:", validateRes.data);

    // Import if valid
    if (validateRes.data.validationResults.invalid.length === 0) {
      const importRes = await axios.post(
        "http://localhost:3000/api/admin/payment-history/bulk-import",
        { payments: paymentsArray },
        { withCredentials: true }
      );

      console.log("Import Success:", importRes.data);
      return importRes.data;
    }
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
}

// ============================================
// DATE FORMAT HANDLING
// ============================================

/*
 * The import controller can handle various date formats:
 * - "30th Oct 2020"
 * - "2020-10-30"
 * - "10/30/2020"
 * - ISO date strings
 *
 * If your Excel has different date formats, the controller will try to parse them automatically.
 */

// ============================================
// MEMBER MATCHING
// ============================================

/*
 * The import will automatically try to match payment records with existing members
 * by phone number. If a match is found:
 * - memberId will be populated
 * - Member name and email will be updated from the member record
 *
 * If no match is found, the payment record will still be created with the data
 * from your Excel file.
 */

// ============================================
// FIELD MAPPING REFERENCE
// ============================================

const fieldMapping = {
  // Excel Column → Database Field(s)
  Name: "memberName",
  "Purchase Date": "purchaseDate, paymentDate",
  "Invoice Number": "invoiceNumber, transactionId",
  "Mobile Number": "memberPhone",
  "Sales Rep": "salesRep",
  "Payment Mode": "paymentMode, paymentMethod",
  "Customer Rep": "customerRep",
  Packages: "packageName",
  "Activation Date": "activationDate, membershipStartDate",
  "Expiry Date": "expiryDate, membershipEndDate",
  "Package Duration": "packageDuration.text",
  Amount: "amount, finalAmount",
};

module.exports = {
  examplePaymentData,
  importPaymentHistory,
  importWithAxios,
  fieldMapping,
};
