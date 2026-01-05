const PaymentHistory = require("../../models/admin/PaymentHistory");
const Member = require("../../models/admin/Members");

// ============================================
// GET ALL PAYMENT HISTORY WITH FILTERS & PAGINATION
// ============================================
const getAllPaymentHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      paymentStatus = "",
      transactionType = "",
      paymentMethod = "",
      startDate = "",
      endDate = "",
      sortBy = "paymentDate",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = { isDeleted: false };

    // Search filter
    if (search) {
      query.$or = [
        { memberName: { $regex: search, $options: "i" } },
        { memberPhone: { $regex: search, $options: "i" } },
        { memberEmail: { $regex: search, $options: "i" } },
        { receiptNumber: { $regex: search, $options: "i" } },
        { transactionId: { $regex: search, $options: "i" } },
      ];
    }

    // Status filter
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    // Transaction type filter
    if (transactionType) {
      query.transactionType = transactionType;
    }

    // Payment method filter
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    // Date range filter
    if (startDate && endDate) {
      query.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else if (startDate) {
      query.paymentDate = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.paymentDate = { $lte: new Date(endDate) };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Execute query
    const payments = await PaymentHistory.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("memberId", "fullName email phoneNumber membershipStatus")
      .populate("packageId", "packageName packageType price")
      .lean();

    // Get total count
    const totalPayments = await PaymentHistory.countDocuments(query);

    // Get statistics
    const statistics = await PaymentHistory.getPaymentStatistics(query);

    res.status(200).json({
      success: true,
      message: "Payment history fetched successfully",
      data: {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalPayments / parseInt(limit)),
          totalPayments,
          limit: parseInt(limit),
          hasNextPage: skip + payments.length < totalPayments,
          hasPrevPage: parseInt(page) > 1,
        },
        statistics,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching payment history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment history",
      error: error.message,
    });
  }
};

// ============================================
// GET PAYMENT BY ID
// ============================================
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await PaymentHistory.findOne({
      _id: id,
      isDeleted: false,
    })
      .populate(
        "memberId",
        "fullName email phoneNumber address membershipStatus"
      )
      .populate("packageId", "packageName packageType price duration")
      .populate("collectedBy.userId", "fullName email");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment details fetched successfully",
      data: payment,
    });
  } catch (error) {
    console.error("❌ Error fetching payment details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment details",
      error: error.message,
    });
  }
};

// ============================================
// GET PAYMENT HISTORY BY MEMBER ID
// ============================================
const getPaymentHistoryByMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Check if member exists
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const payments = await PaymentHistory.find({
      memberId,
      isDeleted: false,
    })
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("packageId", "packageName packageType price");

    const totalPayments = await PaymentHistory.countDocuments({
      memberId,
      isDeleted: false,
    });

    res.status(200).json({
      success: true,
      message: "Member payment history fetched successfully",
      data: {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalPayments / parseInt(limit)),
          totalPayments,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching member payment history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch member payment history",
      error: error.message,
    });
  }
};

// ============================================
// CREATE PAYMENT RECORD
// ============================================
const createPaymentRecord = async (req, res) => {
  try {
    const paymentData = req.body;

    // Validate member exists
    if (paymentData.memberId) {
      const member = await Member.findById(paymentData.memberId);
      if (!member) {
        return res.status(404).json({
          success: false,
          message: "Member not found",
        });
      }
    }

    // Create payment record
    const payment = new PaymentHistory(paymentData);
    await payment.save();

    res.status(201).json({
      success: true,
      message: "Payment record created successfully",
      data: payment,
    });
  } catch (error) {
    console.error("❌ Error creating payment record:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment record",
      error: error.message,
    });
  }
};

// ============================================
// UPDATE PAYMENT RECORD
// ============================================
const updatePaymentRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const payment = await PaymentHistory.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment record updated successfully",
      data: payment,
    });
  } catch (error) {
    console.error("❌ Error updating payment record:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update payment record",
      error: error.message,
    });
  }
};

// ============================================
// DELETE PAYMENT RECORD (SOFT DELETE)
// ============================================
const deletePaymentRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await PaymentHistory.findOneAndUpdate(
      { _id: id, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment record deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting payment record:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete payment record",
      error: error.message,
    });
  }
};

// ============================================
// GET PAYMENT STATISTICS
// ============================================
const getPaymentStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let filters = {};
    if (startDate && endDate) {
      filters.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const statistics = await PaymentHistory.getPaymentStatistics(filters);

    // Get revenue by payment method
    const revenueByMethod = await PaymentHistory.aggregate([
      { $match: { isDeleted: false, ...filters } },
      {
        $group: {
          _id: "$paymentMethod",
          totalAmount: { $sum: "$finalAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    // Get revenue by transaction type
    const revenueByType = await PaymentHistory.aggregate([
      { $match: { isDeleted: false, ...filters } },
      {
        $group: {
          _id: "$transactionType",
          totalAmount: { $sum: "$finalAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    res.status(200).json({
      success: true,
      message: "Payment statistics fetched successfully",
      data: {
        overall: statistics,
        byPaymentMethod: revenueByMethod,
        byTransactionType: revenueByType,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching payment statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment statistics",
      error: error.message,
    });
  }
};

// ============================================
// GET REVENUE BY DATE RANGE
// ============================================
const getRevenueByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    const revenueData = await PaymentHistory.getRevenueByDateRange(
      startDate,
      endDate
    );

    res.status(200).json({
      success: true,
      message: "Revenue data fetched successfully",
      data: revenueData,
    });
  } catch (error) {
    console.error("❌ Error fetching revenue data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch revenue data",
      error: error.message,
    });
  }
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
  getAllPaymentHistory,
  getPaymentById,
  getPaymentHistoryByMember,
  createPaymentRecord,
  updatePaymentRecord,
  deletePaymentRecord,
  getPaymentStatistics,
  getRevenueByDateRange,
};
