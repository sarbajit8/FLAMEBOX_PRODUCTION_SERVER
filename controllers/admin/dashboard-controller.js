const Member = require("../../models/admin/Members");

// ============================================
// GET DASHBOARD STATISTICS
// ============================================
const getDashboardStatistics = async (req, res) => {
  try {
    console.log("📊 Fetching dashboard statistics...");

    // Get total members count
    const totalMembers = await Member.countDocuments({ isDeleted: false });

    // Get payment statistics
    const paymentStats = await Member.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: "$totalPaid" },
          totalPending: { $sum: "$totalPending" },
        },
      },
    ]);

    const totalPaid = paymentStats.length > 0 ? paymentStats[0].totalPaid : 0;
    const totalPending =
      paymentStats.length > 0 ? paymentStats[0].totalPending : 0;

    console.log("✅ Dashboard statistics calculated:", {
      totalMembers,
      totalPaid,
      totalPending,
    });

    return res.status(200).json({
      success: true,
      statistics: {
        totalMembers,
        totalPaid,
        totalPending,
        totalRevenue: totalPaid + totalPending,
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

module.exports = {
  getDashboardStatistics,
};
