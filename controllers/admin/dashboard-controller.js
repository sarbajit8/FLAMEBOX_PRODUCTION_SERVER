const Member = require("../../models/admin/Members");
const PaymentHistory = require("../../models/admin/PaymentHistory");
const Lead = require("../../models/admin/Leads");

// ============================================
// GET DASHBOARD STATISTICS
// ============================================
const getDashboardStatistics = async (req, res) => {
  try {
    console.log("📊 Fetching dashboard statistics...");
    const { start, end } = req.query;

    // Build date filter if dates are provided
    let dateFilter = { isDeleted: false };
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999); // Include entire end day

      dateFilter.joiningDate = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // Get total members count (Packages Sold)
    const totalMembers = await Member.countDocuments(dateFilter);

    // Get payment statistics from Members
    const paymentStats = await Member.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: "$totalPaid" },
          totalPending: { $sum: "$totalPending" },
        },
      },
    ]);

    const memberTotalPaid =
      paymentStats.length > 0 ? paymentStats[0].totalPaid : 0;
    const memberTotalPending =
      paymentStats.length > 0 ? paymentStats[0].totalPending : 0;

    // Build date filter for payment history
    let paymentHistoryDateFilter = { isDeleted: false };
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);

      paymentHistoryDateFilter.paymentDate = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // Get payment statistics from Payment History
    const paymentHistoryStats = await PaymentHistory.aggregate([
      { $match: paymentHistoryDateFilter },
      {
        $group: {
          _id: "$paymentStatus",
          totalAmount: { $sum: "$finalAmount" },
        },
      },
    ]);

    // Calculate totals from payment history
    const historyPaidAmount =
      paymentHistoryStats.find((s) => s._id === "Paid")?.totalAmount || 0;
    const historyPendingAmount =
      paymentHistoryStats.find((s) => s._id === "Pending")?.totalAmount || 0;

    // Combine Member and Payment History data
    const totalPaid = memberTotalPaid + historyPaidAmount;
    const totalPending = memberTotalPending + historyPendingAmount;
    const totalRevenue = totalPaid + totalPending;

    // Get total payment reports count
    const totalReports = await PaymentHistory.countDocuments(
      paymentHistoryDateFilter,
    );

    console.log("✅ Dashboard statistics calculated:", {
      totalMembers,
      memberTotalPaid,
      memberTotalPending,
      historyPaidAmount,
      historyPendingAmount,
      totalPaid,
      totalPending,
      totalRevenue,
      totalReports,
    });

    return res.status(200).json({
      success: true,
      statistics: {
        totalMembers,
        totalPaid,
        totalPending,
        totalRevenue,
        totalReports,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching dashboard statistics:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch dashboard statistics",
    });
  }
};

// ============================================
// GET ENGAGEMENT STATISTICS
// ============================================
const getEngagementStatistics = async (req, res) => {
  try {
    console.log("📊 Fetching engagement statistics...");
    const { start, end } = req.query;

    let dateFilter = { isDeleted: false };
    if (start && end) {
      dateFilter.joiningDate = {
        $gte: new Date(start),
        $lte: new Date(end),
      };
    }

    // Get new memberships in date range
    const newMemberships = await Member.countDocuments(dateFilter);

    // Get membership renewals (members with multiple packages)
    const renewals = await Member.countDocuments({
      isDeleted: false,
      "packages.1": { $exists: true }, // Has more than 1 package
    });

    // Get active members
    const activeMembers = await Member.countDocuments({
      isDeleted: false,
      memberStatus: "Active",
    });

    // Get inactive members
    const inactiveMembers = await Member.countDocuments({
      isDeleted: false,
      memberStatus: { $in: ["Inactive", "Expired", "Suspended"] },
    });

    // Get vaccination status counts
    const vaccinationStats = await Member.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: "$vaccinationStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    const vaccinated =
      vaccinationStats.find((s) => s._id === "Vaccinated")?.count || 0;
    const partiallyVaccinated =
      vaccinationStats.find((s) => s._id === "Partially Vaccinated")?.count ||
      0;
    const notVaccinated =
      vaccinationStats.find((s) => s._id === "Not Vaccinated")?.count || 0;
    const unknown =
      vaccinationStats.find((s) => s._id === "Unknown")?.count || 0;

    // Get attendance data for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const attendanceData = await Member.aggregate([
      { $match: { isDeleted: false } },
      { $unwind: "$attendanceHistory" },
      {
        $match: {
          "attendanceHistory.date": { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$attendanceHistory.date" },
            month: { $month: "$attendanceHistory.date" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    console.log("✅ Engagement statistics calculated");

    return res.status(200).json({
      success: true,
      statistics: {
        newMemberships,
        renewals,
        activeMembers,
        inactiveMembers,
        vaccination: {
          vaccinated,
          partiallyVaccinated,
          notVaccinated,
          unknown,
          total: vaccinated + partiallyVaccinated + notVaccinated + unknown,
        },
        attendanceData,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching engagement statistics:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch engagement statistics",
    });
  }
};

// ============================================
// GET ANALYTICS STATISTICS
// ============================================
const getAnalyticsStatistics = async (req, res) => {
  try {
    console.log("📊 Fetching analytics statistics...");
    const { start, end } = req.query;

    // Build date filter
    let dateFilter = { isDeleted: false };
    if (start && end) {
      const startDate = new Date(start);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.addedDate = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // ============================================
    // LEAD SOURCE ANALYTICS
    // ============================================
    const leadsBySource = await Lead.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$leadSource",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // ============================================
    // LEAD STATUS BREAKDOWN
    // ============================================
    const leadsByStatus = await Lead.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$leadStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    // ============================================
    // CONVERSION FUNNEL
    // ============================================
    const totalLeads = await Lead.countDocuments(dateFilter);
    const qualifiedLeads = await Lead.countDocuments({
      ...dateFilter,
      leadStatus: { $in: ["Qualified", "Hot", "Warm"] },
    });
    const convertedLeads = await Lead.countDocuments({
      ...dateFilter,
      leadStatus: "Converted",
    });

    const conversionFunnel = [
      { stage: "Total Leads", count: totalLeads, percentage: 100 },
      {
        stage: "Qualified",
        count: qualifiedLeads,
        percentage:
          totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(2) : 0,
      },
      {
        stage: "Converted",
        count: convertedLeads,
        percentage:
          totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(2) : 0,
      },
    ];

    // ============================================
    // MONTHLY TRENDS
    // ============================================
    const monthlyTrends = await Lead.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: "$addedDate" },
            month: { $month: "$addedDate" },
          },
          leads: { $sum: 1 },
          converted: {
            $sum: { $cond: [{ $eq: ["$leadStatus", "Converted"] }, 1, 0] },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $project: {
          _id: 0,
          month: {
            $dateFromParts: {
              year: "$_id.year",
              month: "$_id.month",
              day: 1,
            },
          },
          leads: 1,
          converted: 1,
        },
      },
    ]);

    // ============================================
    // TEAM PERFORMANCE (Mock data - can be enhanced with employee assignments)
    // ============================================
    const teamPerformance = [
      { name: "Developer Team", percentage: 85, leads: 42, converted: 36 },
      { name: "Design Team", percentage: 84, leads: 38, converted: 32 },
      { name: "Marketing Team", percentage: 28, leads: 25, converted: 7 },
      { name: "Management Team", percentage: 16, leads: 18, converted: 3 },
    ];

    console.log("✅ Analytics statistics calculated");

    return res.status(200).json({
      success: true,
      statistics: {
        leadsBySource,
        leadsByStatus,
        conversionFunnel,
        monthlyTrends,
        teamPerformance,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching analytics statistics:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch analytics statistics",
    });
  }
};

module.exports = {
  getDashboardStatistics,
  getEngagementStatistics,
  getAnalyticsStatistics,
};
