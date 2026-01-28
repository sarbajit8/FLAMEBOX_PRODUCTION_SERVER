const Members = require("../../models/admin/Members");
const Leads = require("../../models/admin/Leads");

// ============================================
// MEMBER TASKS - BIRTHDAYS
// ============================================
const getMemberBirthdays = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      dateFilter = "today", // today, this_week, this_month, upcoming
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate, endDate;

    switch (dateFilter) {
      case "today":
        startDate = new Date(today);
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 1);
        break;
      case "this_week":
        startDate = new Date(today);
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 7);
        break;
      case "this_month":
        startDate = new Date(today);
        endDate = new Date(today);
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case "upcoming":
        startDate = new Date(today);
        endDate = new Date(today);
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      default:
        startDate = new Date(today);
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 1);
    }

    // Build search query
    const searchQuery = search
      ? {
          $or: [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { phoneNumber: { $regex: search, $options: "i" } },
            { registrationNumber: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // Get all members with birthdays
    const allMembers = await Members.find({
      ...searchQuery,
      dateOfBirth: { $ne: null, $exists: true },
      status: "Active",
    });

    // Filter by birthday (day and month only)
    const filteredMembers = allMembers.filter((member) => {
      const dob = new Date(member.dateOfBirth);
      const currentYear = today.getFullYear();

      // Create birthday date for current year
      const birthdayThisYear = new Date(
        currentYear,
        dob.getMonth(),
        dob.getDate(),
      );

      return birthdayThisYear >= startDate && birthdayThisYear < endDate;
    });

    // Sort by upcoming birthday
    filteredMembers.sort((a, b) => {
      const dobA = new Date(a.dateOfBirth);
      const dobB = new Date(b.dateOfBirth);
      const currentYear = today.getFullYear();

      const birthdayA = new Date(currentYear, dobA.getMonth(), dobA.getDate());
      const birthdayB = new Date(currentYear, dobB.getMonth(), dobB.getDate());

      return birthdayA - birthdayB;
    });

    // Paginate
    const paginatedMembers = filteredMembers.slice(
      skip,
      skip + parseInt(limit),
    );

    // Calculate age and days until birthday
    const membersWithDetails = paginatedMembers.map((member) => {
      const dob = new Date(member.dateOfBirth);
      const currentYear = today.getFullYear();
      const birthdayThisYear = new Date(
        currentYear,
        dob.getMonth(),
        dob.getDate(),
      );

      const age = currentYear - dob.getFullYear();
      const daysUntil = Math.ceil(
        (birthdayThisYear - today) / (1000 * 60 * 60 * 24),
      );

      return {
        _id: member._id,
        fullName: member.fullName,
        email: member.email,
        phoneNumber: member.phoneNumber,
        registrationNumber: member.registrationNumber,
        dateOfBirth: member.dateOfBirth,
        age: age,
        daysUntilBirthday: daysUntil,
        isToday: daysUntil === 0,
        photo: member.photo,
      };
    });

    res.status(200).json({
      success: true,
      data: membersWithDetails,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(filteredMembers.length / parseInt(limit)),
        totalItems: filteredMembers.length,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching member birthdays:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch member birthdays",
      error: error.message,
    });
  }
};

// ============================================
// MEMBER TASKS - PACKAGE RENEWALS
// ============================================
const getMemberRenewals = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "all", // all, expiring_soon, expired, renewed
      daysRange = 7, // Days to look ahead for expiring soon
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build search query
    const searchQuery = search
      ? {
          $or: [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { phoneNumber: { $regex: search, $options: "i" } },
            { registrationNumber: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // Build status query
    let statusQuery = {};
    if (status === "expired") {
      statusQuery = { dueDate: { $lt: today } };
    } else if (status === "expiring_soon") {
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + parseInt(daysRange));
      statusQuery = {
        dueDate: { $gte: today, $lte: futureDate },
      };
    } else if (status === "renewed") {
      statusQuery = { dueDate: { $gte: today } };
    }

    const query = {
      ...searchQuery,
      ...statusQuery,
      dueDate: { $ne: null, $exists: true },
      status: "Active",
    };

    const totalItems = await Members.countDocuments(query);

    const members = await Members.find(query)
      .populate("packages.packageId", "packageName duration price")
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const membersWithDetails = members.map((member) => {
      const dueDate = new Date(member.dueDate);
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

      let renewalStatus = "Active";
      if (daysUntilDue < 0) {
        renewalStatus = "Expired";
      } else if (daysUntilDue <= parseInt(daysRange)) {
        renewalStatus = "Expiring Soon";
      }

      return {
        _id: member._id,
        fullName: member.fullName,
        email: member.email,
        phoneNumber: member.phoneNumber,
        registrationNumber: member.registrationNumber,
        dueDate: member.dueDate,
        joiningDate: member.joiningDate,
        daysUntilDue: daysUntilDue,
        renewalStatus: renewalStatus,
        packages: member.packages,
        photo: member.photo,
        totalPaymentsMade: member.paymentsMade || 0,
      };
    });

    // Get summary counts
    const expiredCount = await Members.countDocuments({
      dueDate: { $lt: today, $ne: null, $exists: true },
      status: "Active",
    });

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + parseInt(daysRange));
    const expiringSoonCount = await Members.countDocuments({
      dueDate: { $gte: today, $lte: futureDate, $ne: null, $exists: true },
      status: "Active",
    });

    res.status(200).json({
      success: true,
      data: membersWithDetails,
      summary: {
        expired: expiredCount,
        expiringSoon: expiringSoonCount,
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalItems / parseInt(limit)),
        totalItems: totalItems,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching member renewals:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch member renewals",
      error: error.message,
    });
  }
};

// ============================================
// MEMBER TASKS - PAYMENT DUE
// ============================================
const getMemberPaymentsDue = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      amountFilter = "all", // all, pending, overdue
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build search query
    const searchQuery = search
      ? {
          $or: [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { phoneNumber: { $regex: search, $options: "i" } },
            { registrationNumber: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const query = {
      ...searchQuery,
      status: "Active",
      $expr: {
        $gt: [{ $subtract: ["$totalFees", "$paymentsMade"] }, 0],
      },
    };

    const totalItems = await Members.countDocuments(query);

    const members = await Members.find(query)
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const membersWithDetails = members.map((member) => {
      const pendingAmount =
        (member.totalFees || 0) - (member.paymentsMade || 0);
      const dueDate = member.dueDate ? new Date(member.dueDate) : null;
      const isOverdue = dueDate && dueDate < today;

      return {
        _id: member._id,
        fullName: member.fullName,
        email: member.email,
        phoneNumber: member.phoneNumber,
        registrationNumber: member.registrationNumber,
        totalFees: member.totalFees || 0,
        paymentsMade: member.paymentsMade || 0,
        pendingAmount: pendingAmount,
        dueDate: member.dueDate,
        isOverdue: isOverdue,
        photo: member.photo,
        joiningDate: member.joiningDate,
      };
    });

    // Filter based on amountFilter
    let filteredMembers = membersWithDetails;
    if (amountFilter === "overdue") {
      filteredMembers = membersWithDetails.filter((m) => m.isOverdue);
    }

    res.status(200).json({
      success: true,
      data: filteredMembers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalItems / parseInt(limit)),
        totalItems: totalItems,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching member payments due:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch member payments due",
      error: error.message,
    });
  }
};

// ============================================
// LEAD TASKS - FOLLOW-UPS
// ============================================
const getLeadFollowUps = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      dateFilter = "today", // today, this_week, overdue, upcoming
      statusFilter = "all", // all, new, contacted, qualified, hot, warm, cold
      priorityFilter = "all", // all, low, medium, high, urgent
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build search query
    const searchQuery = search
      ? {
          $or: [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { phoneNumber: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // Build status filter
    const statusQuery =
      statusFilter !== "all"
        ? { leadStatus: { $regex: new RegExp(`^${statusFilter}$`, "i") } }
        : {};

    // Build priority filter
    const priorityQuery =
      priorityFilter !== "all"
        ? { leadPriority: { $regex: new RegExp(`^${priorityFilter}$`, "i") } }
        : {};

    // Date filter for next follow-up
    let dateQuery = {};
    if (dateFilter === "today") {
      const endOfToday = new Date(today);
      endOfToday.setDate(endOfToday.getDate() + 1);
      dateQuery = {
        nextFollowUpDate: {
          $gte: today,
          $lt: endOfToday,
        },
      };
    } else if (dateFilter === "this_week") {
      const endOfWeek = new Date(today);
      endOfWeek.setDate(endOfWeek.getDate() + 7);
      dateQuery = {
        nextFollowUpDate: {
          $gte: today,
          $lte: endOfWeek,
        },
      };
    } else if (dateFilter === "overdue") {
      dateQuery = {
        nextFollowUpDate: {
          $lt: today,
          $ne: null,
        },
      };
    } else if (dateFilter === "upcoming") {
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + 30);
      dateQuery = {
        nextFollowUpDate: {
          $gte: today,
          $lte: futureDate,
        },
      };
    }

    const query = {
      ...searchQuery,
      ...statusQuery,
      ...priorityQuery,
      ...dateQuery,
      leadStatus: { $nin: ["Converted", "Lost"] },
    };

    const totalItems = await Leads.countDocuments(query);

    const leads = await Leads.find(query)
      .sort({ nextFollowUpDate: 1, leadPriority: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const leadsWithDetails = leads.map((lead) => {
      const nextFollowUpDate = lead.nextFollowUpDate
        ? new Date(lead.nextFollowUpDate)
        : null;
      const daysUntilFollowUp = nextFollowUpDate
        ? Math.ceil((nextFollowUpDate - today) / (1000 * 60 * 60 * 24))
        : null;

      let followUpStatus = "Scheduled";
      if (daysUntilFollowUp !== null) {
        if (daysUntilFollowUp < 0) {
          followUpStatus = "Overdue";
        } else if (daysUntilFollowUp === 0) {
          followUpStatus = "Today";
        }
      }

      return {
        _id: lead._id,
        fullName: lead.fullName,
        email: lead.email,
        phoneNumber: lead.phoneNumber,
        leadStatus: lead.leadStatus,
        leadPriority: lead.leadPriority,
        leadScore: lead.leadScore,
        nextFollowUpDate: lead.nextFollowUpDate,
        daysUntilFollowUp: daysUntilFollowUp,
        followUpStatus: followUpStatus,
        leadSource: lead.leadSource,
        interestedPackage: lead.interestedPackage,
        lastContactDate: lead.lastContactDate,
        followUpCount: lead.followUps ? lead.followUps.length : 0,
        notes: lead.notes,
      };
    });

    // Get summary counts
    const todayEndDate = new Date(today);
    todayEndDate.setDate(todayEndDate.getDate() + 1);

    const todayCount = await Leads.countDocuments({
      nextFollowUpDate: { $gte: today, $lt: todayEndDate },
      leadStatus: { $nin: ["Converted", "Lost"] },
    });

    const overdueCount = await Leads.countDocuments({
      nextFollowUpDate: { $lt: today, $ne: null },
      leadStatus: { $nin: ["Converted", "Lost"] },
    });

    const weekEndDate = new Date(today);
    weekEndDate.setDate(weekEndDate.getDate() + 7);
    const thisWeekCount = await Leads.countDocuments({
      nextFollowUpDate: { $gte: today, $lte: weekEndDate },
      leadStatus: { $nin: ["Converted", "Lost"] },
    });

    res.status(200).json({
      success: true,
      data: leadsWithDetails,
      summary: {
        today: todayCount,
        overdue: overdueCount,
        thisWeek: thisWeekCount,
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalItems / parseInt(limit)),
        totalItems: totalItems,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching lead follow-ups:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch lead follow-ups",
      error: error.message,
    });
  }
};

// ============================================
// LEAD TASKS - NEW LEADS
// ============================================
const getNewLeads = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      daysRange = 7, // Days to look back for new leads
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - parseInt(daysRange));

    // Build search query
    const searchQuery = search
      ? {
          $or: [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { phoneNumber: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const query = {
      ...searchQuery,
      leadStatus: "New",
      createdAt: { $gte: startDate },
    };

    const totalItems = await Leads.countDocuments(query);

    const leads = await Leads.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const leadsWithDetails = leads.map((lead) => {
      const createdDate = new Date(lead.createdAt);
      const daysOld = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));

      return {
        _id: lead._id,
        fullName: lead.fullName,
        email: lead.email,
        phoneNumber: lead.phoneNumber,
        leadStatus: lead.leadStatus,
        leadPriority: lead.leadPriority,
        leadSource: lead.leadSource,
        interestedPackage: lead.interestedPackage,
        createdAt: lead.createdAt,
        daysOld: daysOld,
        contactMethod: lead.contactMethod,
      };
    });

    res.status(200).json({
      success: true,
      data: leadsWithDetails,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalItems / parseInt(limit)),
        totalItems: totalItems,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching new leads:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch new leads",
      error: error.message,
    });
  }
};

// ============================================
// DASHBOARD SUMMARY
// ============================================
const getTasksSummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today's birthdays
    const allMembers = await Members.find({
      dateOfBirth: { $ne: null, $exists: true },
      status: "Active",
    });

    const todayBirthdays = allMembers.filter((member) => {
      const dob = new Date(member.dateOfBirth);
      return (
        dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate()
      );
    }).length;

    // Expired packages
    const expiredPackages = await Members.countDocuments({
      dueDate: { $lt: today, $ne: null, $exists: true },
      status: "Active",
    });

    // Expiring soon (next 7 days)
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 7);
    const expiringSoon = await Members.countDocuments({
      dueDate: { $gte: today, $lte: futureDate, $ne: null, $exists: true },
      status: "Active",
    });

    // Today's follow-ups
    const todayEndDate = new Date(today);
    todayEndDate.setDate(todayEndDate.getDate() + 1);
    const todayFollowUps = await Leads.countDocuments({
      nextFollowUpDate: { $gte: today, $lt: todayEndDate },
      leadStatus: { $nin: ["Converted", "Lost"] },
    });

    // Overdue follow-ups
    const overdueFollowUps = await Leads.countDocuments({
      nextFollowUpDate: { $lt: today, $ne: null },
      leadStatus: { $nin: ["Converted", "Lost"] },
    });

    // New leads (last 7 days)
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newLeads = await Leads.countDocuments({
      leadStatus: "New",
      createdAt: { $gte: weekAgo },
    });

    // Pending payments
    const pendingPayments = await Members.countDocuments({
      status: "Active",
      $expr: {
        $gt: [{ $subtract: ["$totalFees", "$paymentsMade"] }, 0],
      },
    });

    res.status(200).json({
      success: true,
      data: {
        members: {
          todayBirthdays,
          expiredPackages,
          expiringSoon,
          pendingPayments,
        },
        leads: {
          todayFollowUps,
          overdueFollowUps,
          newLeads,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching tasks summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tasks summary",
      error: error.message,
    });
  }
};

module.exports = {
  getMemberBirthdays,
  getMemberRenewals,
  getMemberPaymentsDue,
  getLeadFollowUps,
  getNewLeads,
  getTasksSummary,
};
