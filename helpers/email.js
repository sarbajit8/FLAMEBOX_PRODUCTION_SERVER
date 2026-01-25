const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const twilio = require("twilio");

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Initialize Twilio client
let twilioClient = null;
if (process.env.ENABLE_SMS_NOTIFICATIONS === "true") {
  try {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
    console.log("✅ Twilio SMS client initialized");
  } catch (error) {
    console.error("❌ Failed to initialize Twilio client:", error.message);
  }
}

// Send OTP email
const sendOTPEmail = async (email, otp, userName) => {
  try {
    const mailOptions = {
      from: {
        name: "FLAMEBOX",
        address: process.env.EMAIL_FROM_ADDRESS,
      },
      to: email,
      subject: "FLAMEBOX - Your OTP Code",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background-color: #ffffff;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 32px;
              font-weight: bold;
            }
            .content {
              padding: 40px 30px;
              text-align: center;
            }
            .content h2 {
              color: #333;
              margin-bottom: 20px;
            }
            .otp-box {
              background-color: #f8f8f8;
              border: 2px dashed #dc2626;
              border-radius: 8px;
              padding: 20px;
              margin: 30px 0;
              display: inline-block;
            }
            .otp-code {
              font-size: 36px;
              font-weight: bold;
              color: #dc2626;
              letter-spacing: 8px;
              font-family: 'Courier New', monospace;
            }
            .message {
              color: #666;
              line-height: 1.6;
              margin: 20px 0;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              text-align: left;
            }
            .footer {
              background-color: #f8f8f8;
              padding: 20px;
              text-align: center;
              color: #888;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔥 FLAMEBOX</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName || "User"}!</h2>
              <p class="message">
                You requested an OTP code for your FLAMEBOX account. 
                Use the code below to complete your verification:
              </p>
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
              </div>
              <p class="message">
                This OTP is valid for <strong>10 minutes</strong>.
              </p>
              <div class="warning">
                <strong>⚠️ Security Note:</strong> Never share this OTP with anyone. 
                FLAMEBOX staff will never ask for your OTP.
              </div>
            </div>
            <div class="footer">
              <p>&copy; 2025 FLAMEBOX. All rights reserved.</p>
              <p>If you didn't request this OTP, please ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ OTP email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending OTP email:", error);
    throw error;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, userName) => {
  try {
    const resetLink = `${
      process.env.CLIENT_URL || "http://localhost:5173"
    }/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: {
        name: "FLAMEBOX",
        address: "sarbaarun@gmail.com",
      },
      to: email,
      subject: "FLAMEBOX - Password Reset Request",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background-color: #ffffff;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 32px;
              font-weight: bold;
            }
            .content {
              padding: 40px 30px;
            }
            .content h2 {
              color: #333;
              margin-bottom: 20px;
            }
            .message {
              color: #666;
              line-height: 1.6;
              margin: 20px 0;
            }
            .reset-button {
              display: inline-block;
              background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
              color: white;
              padding: 15px 40px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
            }
            .reset-button:hover {
              background: linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%);
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
            }
            .footer {
              background-color: #f8f8f8;
              padding: 20px;
              text-align: center;
              color: #888;
              font-size: 12px;
            }
            .code-box {
              background-color: #f8f8f8;
              border: 1px solid #ddd;
              border-radius: 5px;
              padding: 15px;
              margin: 20px 0;
              font-family: 'Courier New', monospace;
              word-break: break-all;
              font-size: 12px;
              color: #333;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔥 FLAMEBOX</h1>
            </div>
            <div class="content">
              <h2>Password Reset Request</h2>
              <p class="message">
                Hello ${userName || "User"},
              </p>
              <p class="message">
                We received a request to reset your FLAMEBOX account password. 
                Click the button below to reset your password:
              </p>
              <center>
                <a href="${resetLink}" class="reset-button">Reset Password</a>
              </center>
              <p class="message">
                Or copy and paste this link into your browser:
              </p>
              <div class="code-box">${resetLink}</div>
              <p class="message">
                This link will expire in <strong>1 hour</strong>.
              </p>
              <div class="warning">
                <strong>⚠️ Security Note:</strong> If you didn't request a password reset, 
                please ignore this email. Your password will remain unchanged.
              </div>
            </div>
            <div class="footer">
              <p>&copy; 2025 FLAMEBOX. All rights reserved.</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Password reset email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending password reset email:", error);
    throw error;
  }
};

// Send welcome email for new trainers
const sendWelcomeEmail = async (email, userName, tempPassword) => {
  try {
    const mailOptions = {
      from: {
        name: "FLAMEBOX",
        address: "sarbaarun@gmail.com",
      },
      to: email,
      subject: "Welcome to FLAMEBOX - Your Account Details",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background-color: #ffffff;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 32px;
              font-weight: bold;
            }
            .content {
              padding: 40px 30px;
            }
            .content h2 {
              color: #333;
              margin-bottom: 20px;
            }
            .message {
              color: #666;
              line-height: 1.6;
              margin: 20px 0;
            }
            .credentials-box {
              background-color: #f8f8f8;
              border: 2px solid #dc2626;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .credential-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #ddd;
            }
            .credential-row:last-child {
              border-bottom: none;
            }
            .credential-label {
              font-weight: bold;
              color: #333;
            }
            .credential-value {
              color: #dc2626;
              font-family: 'Courier New', monospace;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
            }
            .footer {
              background-color: #f8f8f8;
              padding: 20px;
              text-align: center;
              color: #888;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔥 FLAMEBOX</h1>
            </div>
            <div class="content">
              <h2>Welcome to FLAMEBOX!</h2>
              <p class="message">
                Hello ${userName},
              </p>
              <p class="message">
                Your FLAMEBOX account has been created successfully. 
                Here are your login credentials:
              </p>
              <div class="credentials-box">
                <div class="credential-row">
                  <span class="credential-label">Email:</span>
                  <span class="credential-value">${email}</span>
                </div>
                <div class="credential-row">
                  <span class="credential-label">Temporary Password:</span>
                  <span class="credential-value">${tempPassword}</span>
                </div>
              </div>
              <div class="warning">
                <strong>⚠️ Important:</strong> Please change your password after your first login 
                for security purposes.
              </div>
              <p class="message">
                You can now log in to your FLAMEBOX account and start managing your fitness journey!
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2025 FLAMEBOX. All rights reserved.</p>
              <p>If you have any questions, please contact your administrator.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Welcome email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending welcome email:", error);
    throw error;
  }
};

// Generate PDF Invoice
const generateInvoicePDF = (paymentDetails) => {
  return new Promise((resolve, reject) => {
    try {
      const {
        fullName,
        registrationNumber,
        amountPaid,
        totalPaid,
        totalPending,
        paymentStatus,
        paymentDate,
        packageName,
      } = paymentDetails;

      const doc = new PDFDocument({ margin: 50 });
      const fileName = `invoice_${registrationNumber}_${Date.now()}.pdf`;
      const filePath = path.join(__dirname, "../temp", fileName);

      // Ensure temp directory exists
      const tempDir = path.join(__dirname, "../temp");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header with Logo/Title
      doc
        .fontSize(28)
        .fillColor("#dc2626")
        .text("🔥 FLAMEBOX", 50, 50, { align: "left" })
        .fontSize(10)
        .fillColor("#666666")
        .text("Your Fitness Journey Partner", 50, 85);

      // Invoice Title
      doc
        .fontSize(24)
        .fillColor("#000000")
        .text("PAYMENT INVOICE", 50, 120, { align: "center" });

      // Horizontal line
      doc
        .moveTo(50, 155)
        .lineTo(545, 155)
        .strokeColor("#dc2626")
        .lineWidth(2)
        .stroke();

      // Invoice Details Section
      doc.fontSize(10).fillColor("#666666");
      const startY = 180;

      doc.text("Invoice Date:", 50, startY);
      doc.fillColor("#000000").text(paymentDate, 150, startY);

      doc.fillColor("#666666").text("Member ID:", 50, startY + 20);
      doc.fillColor("#000000").text(registrationNumber, 150, startY + 20);

      doc.fillColor("#666666").text("Member Name:", 50, startY + 40);
      doc.fillColor("#000000").text(fullName, 150, startY + 40);

      doc.fillColor("#666666").text("Package:", 50, startY + 60);
      doc.fillColor("#000000").text(packageName, 150, startY + 60);

      // Payment Status Badge
      const statusColor =
        paymentStatus === "Paid"
          ? "#28a745"
          : paymentStatus === "Pending"
            ? "#ffc107"
            : "#17a2b8";
      doc
        .rect(50, startY + 85, 100, 25)
        .fillAndStroke(statusColor, statusColor);
      doc
        .fontSize(12)
        .fillColor("#ffffff")
        .text(paymentStatus.toUpperCase(), 55, startY + 92);

      // Payment Summary Box
      doc.rect(50, startY + 130, 495, 120).fillAndStroke("#f8f9fa", "#dee2e6");

      doc
        .fontSize(14)
        .fillColor("#dc2626")
        .text("PAYMENT SUMMARY", 60, startY + 145);

      // Amount Paid (Large)
      doc
        .fontSize(12)
        .fillColor("#666666")
        .text("Amount Paid:", 60, startY + 175);
      doc
        .fontSize(24)
        .fillColor("#28a745")
        .text(`₹${amountPaid.toLocaleString("en-IN")}`, 350, startY + 170, {
          align: "right",
        });

      // Total Paid
      doc
        .fontSize(12)
        .fillColor("#666666")
        .text("Total Paid:", 60, startY + 210);
      doc
        .fontSize(14)
        .fillColor("#000000")
        .text(`₹${totalPaid.toLocaleString("en-IN")}`, 350, startY + 210, {
          align: "right",
        });

      // Balance Due
      doc
        .fontSize(12)
        .fillColor("#666666")
        .text("Balance Due:", 60, startY + 230);
      doc
        .fontSize(14)
        .fillColor(totalPending > 0 ? "#ffc107" : "#28a745")
        .text(`₹${totalPending.toLocaleString("en-IN")}`, 350, startY + 230, {
          align: "right",
        });

      // Note section
      const isFullyPaid = paymentDetails.isFullyPaid || totalPending === 0;

      if (isFullyPaid) {
        doc.rect(50, startY + 270, 495, 50).fillAndStroke("#d4edda", "#28a745");
        doc
          .fontSize(10)
          .fillColor("#155724")
          .text(
            `🎉 Congratulations! Your payment is complete with no outstanding balance. Thank you for being a valued member of FLAMEBOX!`,
            60,
            startY + 285,
            { width: 475, align: "left" },
          );
      } else if (totalPending > 0) {
        doc.rect(50, startY + 270, 495, 50).fillAndStroke("#fff3cd", "#ffc107");
        doc
          .fontSize(10)
          .fillColor("#856404")
          .text(
            `Note: You have a remaining balance of ₹${totalPending.toLocaleString(
              "en-IN",
            )}. Please clear your dues at the earliest.`,
            60,
            startY + 285,
            { width: 475, align: "left" },
          );
      }

      // Footer
      const footerY = 680;
      doc
        .moveTo(50, footerY)
        .lineTo(545, footerY)
        .strokeColor("#dee2e6")
        .lineWidth(1)
        .stroke();

      doc
        .fontSize(12)
        .fillColor("#dc2626")
        .text("FLAMEBOX FITNESS CENTER", 50, footerY + 15, { align: "center" });
      doc
        .fontSize(9)
        .fillColor("#666666")
        .text("📧 Email: sarbaarun@gmail.com", 50, footerY + 35, {
          align: "center",
        });
      doc.text("🔥 Stay Fit, Stay Strong!", 50, footerY + 50, {
        align: "center",
      });
      doc
        .fontSize(8)
        .fillColor("#999999")
        .text(
          "This is a computer-generated invoice and does not require a signature.",
          50,
          footerY + 70,
          { align: "center" },
        );

      doc.end();

      stream.on("finish", () => {
        resolve(filePath);
      });

      stream.on("error", (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Send Payment Receipt Email
const sendPaymentReceiptEmail = async (email, paymentDetails) => {
  try {
    const {
      fullName,
      registrationNumber,
      amountPaid,
      totalPaid,
      totalPending,
      paymentStatus,
      paymentDate,
      packageName,
    } = paymentDetails;

    // Generate PDF Invoice
    const pdfPath = await generateInvoicePDF(paymentDetails);

    // Determine if member is fully paid
    const isFullyPaid = paymentDetails.isFullyPaid || totalPending === 0;

    const mailOptions = {
      from: {
        name: "FLAMEBOX",
        address: "sarbaarun@gmail.com",
      },
      to: email,
      subject: isFullyPaid
        ? "🎉 FLAMEBOX - Congratulations! Payment Completed"
        : "FLAMEBOX - Payment Receipt & Bill",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f5f5f5;
              margin: 0;
              padding: 0;
              line-height: 1.6;
            }
            .container {
              max-width: 650px;
              margin: 30px auto;
              background-color: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
            }
            .header {
              background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 36px;
              font-weight: bold;
              text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
            }
            .header p {
              margin: 10px 0 0 0;
              font-size: 16px;
              opacity: 0.95;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 18px;
              color: #333;
              margin-bottom: 20px;
            }
            .receipt-box {
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
              border-radius: 10px;
              padding: 25px;
              margin: 25px 0;
              border: 2px solid #dee2e6;
            }
            .receipt-title {
              font-size: 20px;
              font-weight: bold;
              color: #dc2626;
              margin-bottom: 20px;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .receipt-row {
              display: flex;
              justify-content: space-between;
              padding: 12px 0;
              border-bottom: 1px solid #dee2e6;
            }
            .receipt-row:last-child {
              border-bottom: none;
            }
            .receipt-label {
              font-weight: 600;
              color: #495057;
              font-size: 14px;
            }
            .receipt-value {
              color: #212529;
              font-weight: 500;
              font-size: 14px;
            }
            .amount-highlight {
              background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
              color: white;
              padding: 20px;
              border-radius: 8px;
              margin: 25px 0;
              text-align: center;
            }
            .amount-label {
              font-size: 14px;
              opacity: 0.9;
              margin-bottom: 8px;
            }
            .amount-value {
              font-size: 36px;
              font-weight: bold;
              letter-spacing: 1px;
            }
            .status-badge {
              display: inline-block;
              padding: 6px 16px;
              border-radius: 20px;
              font-size: 13px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .status-paid {
              background-color: #d4edda;
              color: #155724;
              border: 2px solid #c3e6cb;
            }
            .status-pending {
              background-color: #fff3cd;
              color: #856404;
              border: 2px solid #ffeaa7;
            }
            .status-partial {
              background-color: #d1ecf1;
              color: #0c5460;
              border: 2px solid #bee5eb;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin: 25px 0;
            }
            .summary-card {
              background: #f8f9fa;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              border: 2px solid #e9ecef;
            }
            .summary-label {
              font-size: 13px;
              color: #6c757d;
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .summary-value {
              font-size: 28px;
              font-weight: bold;
              color: #212529;
            }
            .summary-value.paid {
              color: #28a745;
            }
            .summary-value.pending {
              color: #ffc107;
            }
            .info-box {
              background-color: #e7f3ff;
              border-left: 4px solid #2196F3;
              padding: 20px;
              margin: 25px 0;
              border-radius: 4px;
            }
            .info-box p {
              margin: 5px 0;
              color: #0c5460;
              font-size: 14px;
            }
            .footer {
              background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .footer-title {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 15px;
            }
            .footer-info {
              font-size: 13px;
              opacity: 0.9;
              margin: 5px 0;
            }
            .divider {
              height: 2px;
              background: linear-gradient(to right, transparent, #dc2626, transparent);
              margin: 30px 0;
            }
            .thank-you {
              text-align: center;
              font-size: 18px;
              color: #495057;
              margin: 30px 0;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔥 FLAMEBOX</h1>
              <p>Your Fitness Journey Partner</p>
            </div>
            
            <div class="content">
              <div class="greeting">
                Dear <strong>${fullName}</strong>,
              </div>
              
              ${
                isFullyPaid
                  ? `
              <p style="color: #495057; font-size: 15px;">
                🎉 <strong>Congratulations!</strong> We are thrilled to inform you that your payment has been successfully completed! 
                Thank you for your commitment to your fitness journey with FLAMEBOX.
              </p>
              `
                  : `
              <p style="color: #495057; font-size: 15px;">
                Thank you for your payment! This email serves as your official payment receipt and billing statement.
              </p>
              `
              }

              <div class="receipt-box">
                <div class="receipt-title">Payment Receipt</div>
                
                <div class="receipt-row">
                  <span class="receipt-label">Receipt Date:</span>
                  <span class="receipt-value">${paymentDate}</span>
                </div>
                
                <div class="receipt-row">
                  <span class="receipt-label">Member ID:</span>
                  <span class="receipt-value">${registrationNumber}</span>
                </div>
                
                <div class="receipt-row">
                  <span class="receipt-label">Member Name:</span>
                  <span class="receipt-value">${fullName}</span>
                </div>
                
                <div class="receipt-row">
                  <span class="receipt-label">Package:</span>
                  <span class="receipt-value">${packageName}</span>
                </div>
                
                <div class="receipt-row">
                  <span class="receipt-label">Payment Status:</span>
                  <span class="receipt-value">
                    <span class="status-badge status-${paymentStatus.toLowerCase()}">
                      ${paymentStatus}
                    </span>
                  </span>
                </div>
              </div>

              <div class="amount-highlight">
                <div class="amount-label">Amount Paid</div>
                <div class="amount-value">₹${amountPaid.toLocaleString(
                  "en-IN",
                )}</div>
              </div>

              <div class="divider"></div>

              <div class="summary-grid">
                <div class="summary-card">
                  <div class="summary-label">Total Paid</div>
                  <div class="summary-value paid">₹${totalPaid.toLocaleString(
                    "en-IN",
                  )}</div>
                </div>
                
                <div class="summary-card">
                  <div class="summary-label">Balance Due</div>
                  <div class="summary-value pending">₹${totalPending.toLocaleString(
                    "en-IN",
                  )}</div>
                </div>
              </div>

              ${
                totalPending > 0
                  ? `
              <div class="info-box">
                <p><strong>📌 Note:</strong> You have a remaining balance of <strong>₹${totalPending.toLocaleString(
                  "en-IN",
                )}</strong>.</p>
                <p>Please clear your dues at the earliest to continue enjoying our services without interruption.</p>
              </div>
              `
                  : `
              <div class="info-box">
                <p><strong>✅ Congratulations!</strong> Your payment is complete with no outstanding balance.</p>
                <p>Thank you for being a valued member of FLAMEBOX!</p>
              </div>
              `
              }

              <div class="thank-you">
                Thank you for choosing FLAMEBOX! 💪
              </div>
            </div>

            <div class="footer">
              <div class="footer-title">FLAMEBOX FITNESS CENTER</div>
              <div class="footer-info">📧 Email: sarbaarun@gmail.com</div>
              <div class="footer-info">🔥 Stay Fit, Stay Strong!</div>
              <div class="footer-info" style="margin-top: 15px; opacity: 0.7;">
                This is an automated email. Please do not reply to this email.
              </div>
              <div class="footer-info" style="margin-top: 10px; opacity: 0.7;">
                &copy; 2025 FLAMEBOX. All rights reserved.
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `FLAMEBOX_Invoice_${registrationNumber}.pdf`,
          path: pdfPath,
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Payment receipt email sent with PDF:", info.messageId);

    // Delete the temporary PDF file after sending
    try {
      fs.unlinkSync(pdfPath);
      console.log("✅ Temporary PDF file deleted");
    } catch (unlinkError) {
      console.error("⚠️ Error deleting temp PDF:", unlinkError);
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending payment receipt email:", error);
    throw error;
  }
};

// Send Event Reminder Email
const sendEventReminderEmail = async (email, eventDetails) => {
  try {
    const {
      memberName,
      eventDate,
      reason,
      open,
      is24Hours,
      startTime,
      endTime,
      eventType,
      customizedMsg,
    } = eventDetails;

    // Determine status message
    let statusMessage = "";
    let statusColor = "#dc2626"; // red

    if (open) {
      if (is24Hours) {
        statusMessage = "Open 24 Hours";
        statusColor = "#16a34a"; // green
      } else {
        statusMessage = `Open from ${startTime} to ${endTime}`;
        statusColor = "#16a34a"; // green
      }
    } else {
      statusMessage = "Gym will be CLOSED";
      statusColor = "#dc2626"; // red
    }

    const mailOptions = {
      from: {
        name: "FLAMEBOX",
        address: "sarbaarun@gmail.com",
      },
      to: email,
      subject: `🔔 Reminder: ${reason} - ${eventDate}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background-color: #ffffff;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 32px;
              letter-spacing: 2px;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 18px;
              color: #333;
              margin-bottom: 20px;
            }
            .event-box {
              background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
              border-left: 4px solid #dc2626;
              padding: 20px;
              margin: 20px 0;
              border-radius: 8px;
            }
            .event-title {
              font-size: 24px;
              font-weight: bold;
              color: #dc2626;
              margin-bottom: 10px;
            }
            .event-date {
              font-size: 18px;
              color: #555;
              margin-bottom: 15px;
              font-weight: 600;
            }
            .status-badge {
              display: inline-block;
              padding: 10px 20px;
              background-color: ${statusColor};
              color: white;
              border-radius: 25px;
              font-size: 16px;
              font-weight: bold;
              margin: 15px 0;
            }
            .info-section {
              background-color: #fef3c7;
              border: 1px solid #fbbf24;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
            }
            .info-title {
              font-weight: bold;
              color: #92400e;
              margin-bottom: 10px;
              font-size: 16px;
            }
            .info-text {
              color: #78350f;
              line-height: 1.6;
            }
            .footer {
              background-color: #1f2937;
              color: #9ca3af;
              padding: 20px;
              text-align: center;
              font-size: 14px;
            }
            .footer a {
              color: #dc2626;
              text-decoration: none;
            }
            .icon {
              font-size: 48px;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="icon">🔔</div>
              <h1>FLAMEBOX</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Event Reminder</p>
            </div>
            
            <div class="content">
              <div class="greeting">
                Hello ${memberName},
              </div>
              

              <p style="color: #555; line-height: 1.6;">
                This is a friendly reminder about an upcoming event at FLAMEBOX.
              </p>
              ${
                {
                  true: `<div class="info-section" style="background-color: #e0f2fe; border: 1px solid #38bdf8; color: #0369a1; margin-bottom: 18px;">
                  <div class="info-title" style="color: #0369a1;">Custom Message from Admin</div>
                  <div class="info-text">${customizedMsg}</div>
                </div>`,
                  false: "",
                }[!!customizedMsg && customizedMsg.trim() !== ""]
              }
              
              <div class="event-box">
                <div class="event-title">${reason}</div>
                <div class="event-date">📅 ${eventDate}</div>
                <div class="status-badge">${statusMessage}</div>
              </div>
              
              ${
                !open
                  ? `
                <div class="info-section">
                  <div class="info-title">⚠️ Important Notice</div>
                  <div class="info-text">
                    The gym will be closed on this day. Please plan your workout schedule accordingly.
                  </div>
                </div>
              `
                  : is24Hours
                    ? `
                <div class="info-section">
                  <div class="info-title">🎉 Special Hours</div>
                  <div class="info-text">
                    Great news! The gym will be open 24 hours on this day.
                  </div>
                </div>
              `
                    : `
                <div class="info-section">
                  <div class="info-title">🕐 Modified Hours</div>
                  <div class="info-text">
                    Please note the special operating hours for this day:<br>
                    <strong>Opening Time:</strong> ${startTime}<br>
                    <strong>Closing Time:</strong> ${endTime}
                  </div>
                </div>
              `
              }
              
              <p style="color: #555; line-height: 1.6; margin-top: 20px;">
                Thank you for being a valued member of FLAMEBOX. We appreciate your understanding and look forward to seeing you!
              </p>
              
              <p style="color: #999; font-size: 14px; margin-top: 30px; font-style: italic;">
                This is an automated reminder. Please contact us if you have any questions.
              </p>
            </div>
            
            <div class="footer">
              <p style="margin: 0 0 10px 0;">FLAMEBOX - Your Fitness Partner</p>
              <p style="margin: 0;">
                📧 <a href="mailto:sarbaarun@gmail.com">sarbaarun@gmail.com</a>
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px;">
                © 2024 FLAMEBOX. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `✅ Event reminder email sent to ${email} (Message ID: ${info.messageId})`,
    );
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending event reminder email:", error);
    throw error;
  }
};

// Send event reminder SMS
const sendEventReminderSMS = async (
  phoneNumber,
  memberName,
  date,
  reason,
  open,
  is24Hours,
  startTime,
  endTime,
) => {
  try {
    if (!twilioClient) {
      console.log("❌ Twilio client not initialized. SMS disabled.");
      return { success: false, error: "SMS service not enabled" };
    }

    if (!phoneNumber) {
      console.log("❌ No phone number provided");
      return { success: false, error: "No phone number" };
    }

    // Format date
    const eventDate = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Build SMS message
    let message = `🔥 FLAMEBOX Event Reminder\n\nHi ${memberName}!\n\n`;
    message += `📅 ${eventDate}\n${reason}\n\n`;

    if (!open) {
      message += `⚠️ The gym will be CLOSED on this day. Please plan accordingly.\n\n`;
    } else if (is24Hours) {
      message += `🎉 Great news! The gym will be open 24 HOURS on this day.\n\n`;
    } else {
      message += `🕐 Modified Hours:\nOpen: ${startTime}\nClose: ${endTime}\n\n`;
    }

    message += `Thank you for being a valued member!\n- FLAMEBOX Team`;

    // Ensure phone number is in E.164 format (starts with +)
    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith("+")) {
      // Assume Indian phone number if no country code
      formattedPhone = `+91${formattedPhone}`;
    }

    const smsResult = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });

    console.log(
      `✅ Event reminder SMS sent to ${formattedPhone} (SID: ${smsResult.sid})`,
    );
    return { success: true, sid: smsResult.sid };
  } catch (error) {
    console.error("❌ Error sending event reminder SMS:", error);
    return { success: false, error: error.message };
  }
};

// Send package expiry reminder email
const sendPackageExpiryEmail = async (
  email,
  { memberName, packageName, endDate, daysLeft },
) => {
  try {
    const expiryDate = new Date(endDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let urgencyColor, urgencyMessage, urgencyIcon;
    if (daysLeft === 1) {
      urgencyColor = "#dc2626";
      urgencyMessage = "TOMORROW";
      urgencyIcon = "🚨";
    } else if (daysLeft === 3) {
      urgencyColor = "#f59e0b";
      urgencyMessage = "in 3 days";
      urgencyIcon = "⚠️";
    } else {
      urgencyColor = "#3b82f6";
      urgencyMessage = "in 7 days";
      urgencyIcon = "📢";
    }

    const mailOptions = {
      from: {
        name: "FLAMEBOX",
        address: "sarbaarun@gmail.com",
      },
      to: email,
      subject: `${urgencyIcon} Your ${packageName} Package Expires ${urgencyMessage}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background-color: #ffffff;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: bold;
            }
            .content {
              padding: 40px 30px;
            }
            .urgency-badge {
              background-color: ${urgencyColor};
              color: white;
              padding: 15px 25px;
              border-radius: 8px;
              text-align: center;
              font-size: 24px;
              font-weight: bold;
              margin: 20px 0;
            }
            .package-box {
              background-color: #f8f9fa;
              border-left: 4px solid #dc2626;
              padding: 20px;
              margin: 20px 0;
              border-radius: 5px;
            }
            .package-detail {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .package-detail:last-child {
              border-bottom: none;
            }
            .label {
              font-weight: bold;
              color: #374151;
            }
            .value {
              color: #6b7280;
            }
            .cta-button {
              display: inline-block;
              background-color: #dc2626;
              color: white;
              padding: 15px 40px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
            }
            .footer {
              background-color: #f8f8f8;
              padding: 20px;
              text-align: center;
              color: #888;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔥 FLAMEBOX</h1>
            </div>
            <div class="content">
              <h2 style="color: #333; margin-bottom: 10px;">Hi ${memberName}!</h2>
              
              <div class="urgency-badge">
                ${urgencyIcon} Package Expires ${urgencyMessage.toUpperCase()}
              </div>
              
              <p style="color: #555; line-height: 1.6; font-size: 16px;">
                This is a friendly reminder that your gym membership package is about to expire.
              </p>
              
              <div class="package-box">
                <div class="package-detail">
                  <span class="label">📦 Package:</span>
                  <span class="value">${packageName}</span>
                </div>
                <div class="package-detail">
                  <span class="label">📅 Expiry Date:</span>
                  <span class="value">${expiryDate}</span>
                </div>
                <div class="package-detail">
                  <span class="label">⏰ Days Left:</span>
                  <span class="value" style="color: ${urgencyColor}; font-weight: bold;">${daysLeft} ${
                    daysLeft === 1 ? "day" : "days"
                  }</span>
                </div>
              </div>
              
              <p style="color: #555; line-height: 1.6; margin: 20px 0;">
                <strong>Don't let your fitness journey stop!</strong> Renew your package today to continue enjoying all our facilities without any interruption.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="#" class="cta-button">💪 RENEW NOW</a>
              </div>
              
              <p style="color: #999; font-size: 14px; font-style: italic; margin-top: 30px;">
                Need help? Contact us at sarbaarun@gmail.com or visit the gym reception.
              </p>
            </div>
            
            <div class="footer">
              <p style="margin: 0 0 10px 0;">FLAMEBOX - Your Fitness Partner</p>
              <p style="margin: 0;">📧 sarbaarun@gmail.com</p>
              <p style="margin: 10px 0 0 0; font-size: 12px;">© 2024 FLAMEBOX. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `✅ Package expiry email sent to ${email} (Message ID: ${info.messageId})`,
    );
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending package expiry email:", error);
    throw error;
  }
};

// Send package expiry reminder SMS
const sendPackageExpirySMS = async (
  phoneNumber,
  memberName,
  packageName,
  endDate,
  daysLeft,
) => {
  try {
    if (!twilioClient) {
      console.log("❌ Twilio client not initialized. SMS disabled.");
      return { success: false, error: "SMS service not enabled" };
    }

    if (!phoneNumber) {
      console.log("❌ No phone number provided");
      return { success: false, error: "No phone number" };
    }

    const expiryDate = new Date(endDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    let urgencyIcon;
    if (daysLeft === 1) {
      urgencyIcon = "🚨";
    } else if (daysLeft === 3) {
      urgencyIcon = "⚠️";
    } else {
      urgencyIcon = "📢";
    }

    const message = `${urgencyIcon} FLAMEBOX Package Expiry Alert\n\nHi ${memberName}!\n\nYour "${packageName}" package expires in ${daysLeft} ${
      daysLeft === 1 ? "day" : "days"
    } on ${expiryDate}.\n\nRenew now to continue your fitness journey without interruption!\n\nContact us or visit the gym.\n\n- FLAMEBOX Team`;

    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = `+91${formattedPhone}`;
    }

    const smsResult = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });

    console.log(
      `✅ Package expiry SMS sent to ${formattedPhone} (SID: ${smsResult.sid})`,
    );
    return { success: true, sid: smsResult.sid };
  } catch (error) {
    console.error("❌ Error sending package expiry SMS:", error);
    return { success: false, error: error.message };
  }
};

// Send Package Renewal Email
const sendPackageRenewalEmail = async (email, renewalDetails) => {
  try {
    const {
      memberName,
      registrationNumber,
      packageName,
      startDate,
      endDate,
      amount,
      amountPaid,
      paymentStatus,
      paymentDate,
    } = renewalDetails;

    const mailOptions = {
      from: {
        name: "FLAMEBOX",
        address: "sarbaarun@gmail.com",
      },
      to: email,
      subject: `🔄 Package Renewal Confirmation - ${packageName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background-color: #ffffff;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 32px;
              letter-spacing: 2px;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 18px;
              color: #333;
              margin-bottom: 20px;
            }
            .renewal-box {
              background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
              border-left: 4px solid #16a34a;
              padding: 20px;
              margin: 20px 0;
              border-radius: 8px;
            }
            .renewal-title {
              font-size: 24px;
              font-weight: bold;
              color: #16a34a;
              margin-bottom: 15px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 10px 0;
              padding: 8px 0;
              border-bottom: 1px solid #d1fae5;
            }
            .info-label {
              font-weight: bold;
              color: #166534;
            }
            .info-value {
              color: #15803d;
            }
            .status-badge {
              display: inline-block;
              padding: 8px 16px;
              background-color: #16a34a;
              color: white;
              border-radius: 20px;
              font-size: 14px;
              font-weight: bold;
              margin: 10px 0;
            }
            .footer {
              background-color: #1f2937;
              color: #9ca3af;
              padding: 20px;
              text-align: center;
              font-size: 14px;
            }
            .footer a {
              color: #dc2626;
              text-decoration: none;
            }
            .icon {
              font-size: 48px;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="icon">🔄</div>
              <h1>FLAMEBOX</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Package Renewal Confirmation</p>
            </div>
            
            <div class="content">
              <div class="greeting">
                Hello ${memberName},
              </div>
              
              <p style="color: #555; line-height: 1.6;">
                Great news! Your package has been successfully renewed. Here are the details:
              </p>
              
              <div class="renewal-box">
                <div class="renewal-title">${packageName}</div>
                <div class="status-badge">✅ Renewed</div>
                
                <div class="info-row">
                  <span class="info-label">Registration Number:</span>
                  <span class="info-value">${registrationNumber}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Start Date:</span>
                  <span class="info-value">${new Date(
                    startDate,
                  ).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">End Date:</span>
                  <span class="info-value">${new Date(
                    endDate,
                  ).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Package Amount:</span>
                  <span class="info-value">₹${parseFloat(amount).toFixed(
                    2,
                  )}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Amount Paid:</span>
                  <span class="info-value">₹${parseFloat(amountPaid).toFixed(
                    2,
                  )}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Payment Status:</span>
                  <span class="info-value">${paymentStatus}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Payment Date:</span>
                  <span class="info-value">${new Date(
                    paymentDate,
                  ).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}</span>
                </div>
              </div>
              
              <p style="color: #555; line-height: 1.6; margin-top: 20px;">
                Thank you for continuing your fitness journey with FLAMEBOX. We're here to support your goals!
              </p>
              
              <p style="color: #999; font-size: 14px; margin-top: 30px; font-style: italic;">
                This is an automated notification. If you have any questions, please contact us.
              </p>
            </div>
            
            <div class="footer">
              <p style="margin: 0 0 10px 0;">FLAMEBOX - Your Fitness Partner</p>
              <p style="margin: 0;">
                📧 <a href="mailto:sarbaarun@gmail.com">sarbaarun@gmail.com</a>
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px;">
                © 2024 FLAMEBOX. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `✅ Package renewal email sent to ${email} (Message ID: ${info.messageId})`,
    );
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending package renewal email:", error);
    return { success: false, error: error.message };
  }
};

// Send Package Extension Email
const sendPackageExtensionEmail = async (email, extensionDetails) => {
  try {
    const {
      memberName,
      registrationNumber,
      packageName,
      extensionDays,
      newEndDate,
      extraAmount,
      amountPaid,
    } = extensionDetails;

    const mailOptions = {
      from: {
        name: "FLAMEBOX",
        address: "sarbaarun@gmail.com",
      },
      to: email,
      subject: `⏰ Package Extended - ${packageName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background-color: #ffffff;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 32px;
              letter-spacing: 2px;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 18px;
              color: #333;
              margin-bottom: 20px;
            }
            .extension-box {
              background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
              border-left: 4px solid #2563eb;
              padding: 20px;
              margin: 20px 0;
              border-radius: 8px;
            }
            .extension-title {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 15px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 10px 0;
              padding: 8px 0;
              border-bottom: 1px solid #bfdbfe;
            }
            .info-label {
              font-weight: bold;
              color: #1e40af;
            }
            .info-value {
              color: #1e3a8a;
            }
            .highlight-box {
              background-color: #fef3c7;
              border: 2px solid #fbbf24;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
              text-align: center;
            }
            .highlight-text {
              font-size: 20px;
              font-weight: bold;
              color: #92400e;
            }
            .footer {
              background-color: #1f2937;
              color: #9ca3af;
              padding: 20px;
              text-align: center;
              font-size: 14px;
            }
            .footer a {
              color: #dc2626;
              text-decoration: none;
            }
            .icon {
              font-size: 48px;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="icon">⏰</div>
              <h1>FLAMEBOX</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Package Extension Confirmation</p>
            </div>
            
            <div class="content">
              <div class="greeting">
                Hello ${memberName},
              </div>
              
              <p style="color: #555; line-height: 1.6;">
                Good news! Your package has been extended. Here are the details:
              </p>
              
              <div class="highlight-box">
                <div class="highlight-text">+${extensionDays} Days Added!</div>
              </div>
              
              <div class="extension-box">
                <div class="extension-title">${packageName}</div>
                
                <div class="info-row">
                  <span class="info-label">Registration Number:</span>
                  <span class="info-value">${registrationNumber}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Extension Days:</span>
                  <span class="info-value">${extensionDays} days</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">New End Date:</span>
                  <span class="info-value">${new Date(
                    newEndDate,
                  ).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}</span>
                </div>
                
                ${
                  extraAmount && parseFloat(extraAmount) > 0
                    ? `
                <div class="info-row">
                  <span class="info-label">Extra Amount:</span>
                  <span class="info-value">₹${parseFloat(extraAmount).toFixed(
                    2,
                  )}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Amount Paid:</span>
                  <span class="info-value">₹${parseFloat(
                    amountPaid || 0,
                  ).toFixed(2)}</span>
                </div>
                `
                    : ""
                }
              </div>
              
              <p style="color: #555; line-height: 1.6; margin-top: 20px;">
                Your package validity has been extended. Continue your fitness journey without any interruptions!
              </p>
              
              <p style="color: #999; font-size: 14px; margin-top: 30px; font-style: italic;">
                This is an automated notification. If you have any questions, please contact us.
              </p>
            </div>
            
            <div class="footer">
              <p style="margin: 0 0 10px 0;">FLAMEBOX - Your Fitness Partner</p>
              <p style="margin: 0;">
                📧 <a href="mailto:sarbaarun@gmail.com">sarbaarun@gmail.com</a>
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px;">
                © 2024 FLAMEBOX. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `✅ Package extension email sent to ${email} (Message ID: ${info.messageId})`,
    );
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending package extension email:", error);
    return { success: false, error: error.message };
  }
};

// Send Package Freeze Email
const sendPackageFreezeEmail = async (email, freezeDetails) => {
  try {
    const {
      memberName,
      registrationNumber,
      packageName,
      freezeDays,
      newEndDate,
    } = freezeDetails;

    const mailOptions = {
      from: {
        name: "FLAMEBOX",
        address: "sarbaarun@gmail.com",
      },
      to: email,
      subject: `❄️ Package Frozen - ${packageName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background-color: #ffffff;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 32px;
              letter-spacing: 2px;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 18px;
              color: #333;
              margin-bottom: 20px;
            }
            .freeze-box {
              background: linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%);
              border-left: 4px solid #06b6d4;
              padding: 20px;
              margin: 20px 0;
              border-radius: 8px;
            }
            .freeze-title {
              font-size: 24px;
              font-weight: bold;
              color: #06b6d4;
              margin-bottom: 15px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 10px 0;
              padding: 8px 0;
              border-bottom: 1px solid #a5f3fc;
            }
            .info-label {
              font-weight: bold;
              color: #0891b2;
            }
            .info-value {
              color: #0e7490;
            }
            .info-section {
              background-color: #e0f2fe;
              border: 1px solid #38bdf8;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
            }
            .info-title {
              font-weight: bold;
              color: #0369a1;
              margin-bottom: 10px;
              font-size: 16px;
            }
            .info-text {
              color: #075985;
              line-height: 1.6;
            }
            .footer {
              background-color: #1f2937;
              color: #9ca3af;
              padding: 20px;
              text-align: center;
              font-size: 14px;
            }
            .footer a {
              color: #dc2626;
              text-decoration: none;
            }
            .icon {
              font-size: 48px;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="icon">❄️</div>
              <h1>FLAMEBOX</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Package Freeze Confirmation</p>
            </div>
            
            <div class="content">
              <div class="greeting">
                Hello ${memberName},
              </div>
              
              <p style="color: #555; line-height: 1.6;">
                Your package has been frozen as requested. Here are the details:
              </p>
              
              <div class="freeze-box">
                <div class="freeze-title">${packageName}</div>
                
                <div class="info-row">
                  <span class="info-label">Registration Number:</span>
                  <span class="info-value">${registrationNumber}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Freeze Days:</span>
                  <span class="info-value">${freezeDays} days</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">New End Date:</span>
                  <span class="info-value">${new Date(
                    newEndDate,
                  ).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}</span>
                </div>
              </div>
              
              <div class="info-section">
                <div class="info-title">ℹ️ What This Means</div>
                <div class="info-text">
                  Your package validity has been extended by ${freezeDays} days to compensate for the freeze period. 
                  You can continue your fitness journey when you're ready!
                </div>
              </div>
              
              <p style="color: #555; line-height: 1.6; margin-top: 20px;">
                We understand that life happens. When you're ready to resume, we'll be here waiting for you!
              </p>
              
              <p style="color: #999; font-size: 14px; margin-top: 30px; font-style: italic;">
                This is an automated notification. If you have any questions, please contact us.
              </p>
            </div>
            
            <div class="footer">
              <p style="margin: 0 0 10px 0;">FLAMEBOX - Your Fitness Partner</p>
              <p style="margin: 0;">
                📧 <a href="mailto:sarbaarun@gmail.com">sarbaarun@gmail.com</a>
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px;">
                © 2024 FLAMEBOX. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `✅ Package freeze email sent to ${email} (Message ID: ${info.messageId})`,
    );
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending package freeze email:", error);
    return { success: false, error: error.message };
  }
};

// Send Birthday Greeting Email
const sendBirthdayEmail = async (email, memberName) => {
  try {
    const mailOptions = {
      from: {
        name: "FLAMEBOX",
        address: process.env.EMAIL_FROM_ADDRESS,
      },
      to: email,
      subject: "🎉 Happy Birthday! - FLAMEBOX",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background-color: #ffffff;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
              position: relative;
              overflow: hidden;
            }
            .header::before {
              content: "🎉 🎂 🎈";
              position: absolute;
              font-size: 48px;
              opacity: 0.2;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
            }
            .header-content {
              position: relative;
              z-index: 1;
            }
            .header h1 {
              margin: 0 0 10px 0;
              font-size: 36px;
              font-weight: bold;
            }
            .header p {
              margin: 0;
              font-size: 18px;
            }
            .content {
              padding: 40px 30px;
              text-align: center;
            }
            .birthday-message {
              font-size: 24px;
              font-weight: bold;
              color: #333;
              margin-bottom: 20px;
              line-height: 1.4;
            }
            .member-name {
              color: #dc2626;
              font-weight: bold;
            }
            .greeting-text {
              color: #666;
              font-size: 16px;
              line-height: 1.6;
              margin: 20px 0;
            }
            .special-offer {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 20px;
              border-radius: 5px;
              margin: 30px 0;
              text-align: left;
            }
            .special-offer h3 {
              margin-top: 0;
              color: #d97706;
            }
            .special-offer p {
              margin: 10px 0;
              color: #666;
            }
            .cta-button {
              display: inline-block;
              background-color: #dc2626;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
              font-size: 16px;
              transition: background-color 0.3s ease;
            }
            .cta-button:hover {
              background-color: #991b1b;
            }
            .footer {
              background-color: #f9fafb;
              padding: 20px 30px;
              text-align: center;
              border-top: 1px solid #e5e7eb;
              color: #999;
              font-size: 12px;
            }
            .emoji {
              font-size: 20px;
              margin: 0 5px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="header-content">
                <h1>Happy Birthday! <span class="emoji">🎉</span></h1>
                <p>Celebrate Your Special Day with FLAMEBOX</p>
              </div>
            </div>

            <div class="content">
              <div class="birthday-message">
                Dear <span class="member-name">${memberName}</span>,
                <br>
                🎂 Today is YOUR special day! 🎂
              </div>

              <p class="greeting-text">
                On this wonderful day, we want to extend our warmest wishes to you. Thank you for being a valued member of the FLAMEBOX community. Your dedication and commitment inspire us every day.
              </p>

              <div class="special-offer">
                <h3><span class="emoji">🎁</span> Special Birthday Offer!</h3>
                <p>As a token of our appreciation, enjoy <strong>a special surprise</strong> on your next visit to FLAMEBOX!</p>
                <p style="margin-bottom: 0; font-weight: bold; color: #d97706;">Contact our team for exclusive birthday benefits</p>
              </div>

              <p class="greeting-text">
                We wish you a year filled with health, happiness, and great achievements. May this year bring you new opportunities and countless memorable moments!
              </p>

              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                <span class="emoji">💪</span> Keep up the great fitness journey with us!
              </p>
            </div>

            <div class="footer">
              <p>
                This is an automated birthday greeting from FLAMEBOX. 
                <br>
                © 2026 FLAMEBOX. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `✅ Birthday email sent to ${email} for ${memberName} (Message ID: ${info.messageId})`,
    );
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending birthday email:", error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOTPEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendPaymentReceiptEmail,
  sendEventReminderEmail,
  sendEventReminderSMS,
  sendPackageExpiryEmail,
  sendPackageExpirySMS,
  sendPackageRenewalEmail,
  sendPackageExtensionEmail,
  sendPackageFreezeEmail,
  sendBirthdayEmail,
};
