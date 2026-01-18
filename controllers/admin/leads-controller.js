const Lead = require("../../models/admin/Leads");
// ❌ Comment this out if Members model doesn't exist yet
// const Member = require("../../models/admin/Members");

// ============================================
// CREATE NEW LEAD
// ============================================
const createLead = async (req, res) => {
  try {
    console.log("🔍 Creating lead with data:", req.body);

    const leadData = req.body;

    // Validate required fields
    if (!leadData.fullName || !leadData.email || !leadData.phoneNumber) {
      console.log("❌ Validation failed: Missing required fields");
      return res.status(400).json({
        success: false,
        message: "Full name, email, and phone number are required",
      });
    }

    // Check if lead with same email or phone already exists
    const existingLead = await Lead.findOne({
      $or: [{ email: leadData.email }, { phoneNumber: leadData.phoneNumber }],
      isDeleted: false,
    });

    if (existingLead) {
      console.log("❌ Lead already exists:", existingLead.email);
      return res.status(400).json({
        success: false,
        message: "Lead with this email or phone number already exists",
      });
    }

    // ✅ Remove addedDate from client data and let MongoDB handle it
    const { addedDate, ...cleanLeadData } = leadData;

    // Create new lead - let the default Date.now handle the date
    console.log("✅ Creating new lead...");
    const newLead = new Lead(cleanLeadData);
    await newLead.save();

    console.log("✅ Lead created successfully:", newLead._id);

    res.status(201).json({
      success: true,
      message: "Lead created successfully",
      lead: newLead,
    });
  } catch (error) {
    console.error("❌ Create lead error:", error);
    console.error("❌ Error name:", error.name);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error stack:", error.stack);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
        error: error.message,
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Lead with this ${field} already exists`,
        error: error.message,
      });
    }

    // Handle cast errors (invalid ObjectId, Date, etc.)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: `Invalid ${error.path}: ${error.value}`,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create lead",
      error: error.message,
      details: error.stack,
    });
  }
};

// ============================================
// GET ALL LEADS WITH FILTERS AND PAGINATION
// ============================================
const getAllLeads = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      source = "",
      priority = "",
      assignedTo = "",
      interestedPackage = "",
      startDate = "",
      endDate = "",
      sortBy = "addedDate",
      sortOrder = "desc",
    } = req.query;

    console.log("🔍 getAllLeads called with:", {
      startDate,
      endDate,
      search,
      status,
      source,
    });

    // Build query
    const query = { isDeleted: false };

    // Search by name, email, or phone
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by status
    if (status) {
      query.leadStatus = status;
    }

    // Filter by source
    if (source) {
      query.leadSource = source;
    }

    // Filter by priority
    if (priority) {
      query.leadPriority = priority;
    }

    // Filter by assigned employee
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    // Filter by interested package
    if (interestedPackage) {
      query.interestedPackage = interestedPackage;
    }

    // Filter by date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0); // Start of day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // End of day

      query.addedDate = {
        $gte: start,
        $lte: end,
      };
      console.log(
        `📅 Date filter applied: ${start.toISOString()} to ${end.toISOString()}`,
      );
    } else if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      query.addedDate = { $gte: start };
      console.log(`📅 Start date filter applied: ${start.toISOString()}`);
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.addedDate = { $lte: end };
      console.log(`📅 End date filter applied: ${end.toISOString()}`);
    }

    console.log("📋 Query object:", JSON.stringify(query, null, 2));

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Execute query
    const leads = await Lead.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("assignedTo", "fullName email")
      .populate("convertedToMemberId", "fullName registrationNumber");

    const totalLeads = await Lead.countDocuments(query);
    const totalPages = Math.ceil(totalLeads / parseInt(limit));

    console.log(`✅ Query executed: Found ${totalLeads} leads`);

    res.status(200).json({
      success: true,
      leads,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalLeads,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("❌ Get all leads error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch leads",
      error: error.message,
    });
  }
};

// ============================================
// GET LEAD BY ID
// ============================================
const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findById(id)
      .populate("assignedTo", "fullName email phoneNumber")
      .populate(
        "convertedToMemberId",
        "fullName registrationNumber email phoneNumber",
      )
      .populate("followUps.followedUpBy", "fullName");

    if (!lead || lead.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.status(200).json({
      success: true,
      lead,
    });
  } catch (error) {
    console.error("❌ Get lead by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch lead",
      error: error.message,
    });
  }
};

// ============================================
// UPDATE LEAD
// ============================================
const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if lead exists
    const lead = await Lead.findById(id);
    if (!lead || lead.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // Check if email or phone is being changed and if it already exists
    if (updateData.email || updateData.phoneNumber) {
      const existingLead = await Lead.findOne({
        $or: [
          { email: updateData.email },
          { phoneNumber: updateData.phoneNumber },
        ],
        _id: { $ne: id },
        isDeleted: false,
      });

      if (existingLead) {
        return res.status(400).json({
          success: false,
          message: "Lead with this email or phone number already exists",
        });
      }
    }

    // Update lead
    const updatedLead = await Lead.findByIdAndUpdate(
      id,
      { ...updateData, lastUpdatedDate: new Date() },
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Lead updated successfully",
      lead: updatedLead,
    });
  } catch (error) {
    console.error("❌ Update lead error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update lead",
      error: error.message,
    });
  }
};

// ============================================
// DELETE LEAD (SOFT DELETE)
// ============================================
const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findById(id);
    if (!lead || lead.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // Soft delete
    lead.isDeleted = true;
    lead.deletedAt = new Date();
    await lead.save();

    res.status(200).json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete lead error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete lead",
      error: error.message,
    });
  }
};

// ============================================
// UPDATE LEAD STATUS
// ============================================
const updateLeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const lead = await Lead.findById(id);
    if (!lead || lead.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // Update status
    lead.leadStatus = status;
    lead.lastUpdatedDate = new Date();

    if (notes) {
      lead.notes = notes;
    }

    await lead.save();

    res.status(200).json({
      success: true,
      message: "Lead status updated successfully",
      lead,
    });
  } catch (error) {
    console.error("❌ Update lead status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update lead status",
      error: error.message,
    });
  }
};

// ============================================
// ADD FOLLOW-UP
// ============================================
const addFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const followUpData = req.body;

    const lead = await Lead.findById(id);
    if (!lead || lead.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // Add follow-up using the model method
    await lead.addFollowUp(followUpData);

    res.status(200).json({
      success: true,
      message: "Follow-up added successfully",
      lead,
    });
  } catch (error) {
    console.error("❌ Add follow-up error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add follow-up",
      error: error.message,
    });
  }
};

// ============================================
// ASSIGN LEAD TO EMPLOYEE
// ============================================
const assignLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeId, employeeName } = req.body;

    if (!employeeId || !employeeName) {
      return res.status(400).json({
        success: false,
        message: "Employee ID and name are required",
      });
    }

    const lead = await Lead.findById(id);
    if (!lead || lead.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // Assign lead using the model method
    await lead.assignTo(employeeId, employeeName);

    res.status(200).json({
      success: true,
      message: "Lead assigned successfully",
      lead,
    });
  } catch (error) {
    console.error("❌ Assign lead error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign lead",
      error: error.message,
    });
  }
};

// ============================================
// SCHEDULE DEMO
// ============================================
const scheduleDemo = async (req, res) => {
  try {
    const { id } = req.params;
    const { demoDate } = req.body;

    if (!demoDate) {
      return res.status(400).json({
        success: false,
        message: "Demo date is required",
      });
    }

    const lead = await Lead.findById(id);
    if (!lead || lead.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // Schedule demo using the model method
    await lead.scheduleDemo(demoDate);

    res.status(200).json({
      success: true,
      message: "Demo scheduled successfully",
      lead,
    });
  } catch (error) {
    console.error("❌ Schedule demo error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to schedule demo",
      error: error.message,
    });
  }
};

// ============================================
// CONVERT LEAD TO MEMBER
// ============================================
const convertLeadToMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { memberId, conversionNotes } = req.body;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: "Member ID is required",
      });
    }

    const lead = await Lead.findById(id);
    if (!lead || lead.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // ✅ Comment out member check if model doesn't exist
    // const member = await Member.findById(memberId);
    // if (!member) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "Member not found",
    //   });
    // }

    // Convert lead using the model method
    await lead.convertToMember(memberId);

    if (conversionNotes) {
      lead.conversionNotes = conversionNotes;
      await lead.save();
    }

    res.status(200).json({
      success: true,
      message: "Lead converted to member successfully",
      lead,
    });
  } catch (error) {
    console.error("❌ Convert lead error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to convert lead",
      error: error.message,
    });
  }
};

// ============================================
// GET LEAD STATISTICS
// ============================================
const getLeadStatistics = async (req, res) => {
  try {
    const statistics = await Lead.getStatistics();

    // Additional statistics
    const overdueFollowUps = await Lead.getOverdueFollowUps();
    const todaysFollowUps = await Lead.getTodaysFollowUps();
    const unassignedLeads = await Lead.getUnassignedLeads();

    res.status(200).json({
      success: true,
      statistics: {
        ...statistics,
        overdueFollowUps: overdueFollowUps.length,
        todaysFollowUps: todaysFollowUps.length,
        unassignedLeads: unassignedLeads.length,
      },
    });
  } catch (error) {
    console.error("❌ Get lead statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: error.message,
    });
  }
};

// ============================================
// GET HOT LEADS
// ============================================
const getHotLeads = async (req, res) => {
  try {
    const hotLeads = await Lead.getHotLeads();

    res.status(200).json({
      success: true,
      leads: hotLeads,
      count: hotLeads.length,
    });
  } catch (error) {
    console.error("❌ Get hot leads error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch hot leads",
      error: error.message,
    });
  }
};

// ============================================
// GET TODAY'S FOLLOW-UPS
// ============================================
const getTodaysFollowUps = async (req, res) => {
  try {
    const todaysFollowUps = await Lead.getTodaysFollowUps();

    res.status(200).json({
      success: true,
      leads: todaysFollowUps,
      count: todaysFollowUps.length,
    });
  } catch (error) {
    console.error("❌ Get today's follow-ups error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch today's follow-ups",
      error: error.message,
    });
  }
};

// ============================================
// GET OVERDUE FOLLOW-UPS
// ============================================
const getOverdueFollowUps = async (req, res) => {
  try {
    const overdueFollowUps = await Lead.getOverdueFollowUps();

    res.status(200).json({
      success: true,
      leads: overdueFollowUps,
      count: overdueFollowUps.length,
    });
  } catch (error) {
    console.error("❌ Get overdue follow-ups error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch overdue follow-ups",
      error: error.message,
    });
  }
};

// ============================================
// GET LEADS BY SOURCE
// ============================================
const getLeadsBySource = async (req, res) => {
  try {
    const { source } = req.params;

    const leads = await Lead.getLeadsBySource(source);

    res.status(200).json({
      success: true,
      leads,
      count: leads.length,
      source,
    });
  } catch (error) {
    console.error("❌ Get leads by source error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch leads by source",
      error: error.message,
    });
  }
};

// ============================================
// GET CONVERTED LEADS
// ============================================
const getConvertedLeads = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const leads = await Lead.getConvertedLeads(startDate, endDate);

    res.status(200).json({
      success: true,
      leads,
      count: leads.length,
    });
  } catch (error) {
    console.error("❌ Get converted leads error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch converted leads",
      error: error.message,
    });
  }
};

// ============================================
// GET UNASSIGNED LEADS
// ============================================
const getUnassignedLeads = async (req, res) => {
  try {
    const leads = await Lead.getUnassignedLeads();

    res.status(200).json({
      success: true,
      leads,
      count: leads.length,
    });
  } catch (error) {
    console.error("❌ Get unassigned leads error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unassigned leads",
      error: error.message,
    });
  }
};

// ============================================
// BULK DELETE LEADS
// ============================================
const bulkDeleteLeads = async (req, res) => {
  try {
    const { leadIds } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Lead IDs array is required",
      });
    }

    await Lead.updateMany(
      { _id: { $in: leadIds } },
      { isDeleted: true, deletedAt: new Date() },
    );

    res.status(200).json({
      success: true,
      message: `${leadIds.length} leads deleted successfully`,
    });
  } catch (error) {
    console.error("❌ Bulk delete leads error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete leads",
      error: error.message,
    });
  }
};

// ============================================
// BULK UPDATE LEAD STATUS
// ============================================
const bulkUpdateLeadStatus = async (req, res) => {
  try {
    const { leadIds, status } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Lead IDs array is required",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    await Lead.updateMany(
      { _id: { $in: leadIds } },
      { leadStatus: status, lastUpdatedDate: new Date() },
    );

    res.status(200).json({
      success: true,
      message: `${leadIds.length} leads updated successfully`,
    });
  } catch (error) {
    console.error("❌ Bulk update lead status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update leads",
      error: error.message,
    });
  }
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
  createLead,
  getAllLeads,
  getLeadById,
  updateLead,
  deleteLead,
  updateLeadStatus,
  addFollowUp,
  assignLead,
  scheduleDemo,
  convertLeadToMember,
  getLeadStatistics,
  getHotLeads,
  getTodaysFollowUps,
  getOverdueFollowUps,
  getLeadsBySource,
  getConvertedLeads,
  getUnassignedLeads,
  bulkDeleteLeads,
  bulkUpdateLeadStatus,
};
