const Group = require("../../models/admin/Groups");
const Member = require("../../models/admin/Members");
const { imageUploadUtil } = require("../../helpers/cloudinary");

// ============================================
// CREATE GROUP
// ============================================
const createGroup = async (req, res) => {
  try {
    console.log("➕ Creating new group...");
    console.log("Request body:", req.body);

    const { groupName, groupImage, description, members } = req.body;

    // Validate required fields
    if (!groupName || groupName.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Group name is required",
      });
    }

    // Check if group name already exists
    const existingGroup = await Group.findOne({
      groupName: { $regex: new RegExp(`^${groupName.trim()}$`, "i") },
      isDeleted: false,
    });

    if (existingGroup) {
      return res.status(400).json({
        success: false,
        error: "Group with this name already exists",
      });
    }

    // Upload image to cloudinary if provided
    let uploadedImageUrl = "";
    if (groupImage && groupImage.startsWith("data:")) {
      try {
        const uploadResult = await imageUploadUtil(groupImage);
        uploadedImageUrl = uploadResult.secure_url;
        console.log("✅ Group image uploaded to Cloudinary:", uploadedImageUrl);
      } catch (uploadError) {
        console.error("❌ Error uploading image:", uploadError);
        return res.status(400).json({
          success: false,
          error: "Failed to upload group image",
        });
      }
    } else if (groupImage) {
      uploadedImageUrl = groupImage;
    }

    // Process members array
    const processedMembers = [];
    if (members && Array.isArray(members) && members.length > 0) {
      for (const memberId of members) {
        // Verify member exists
        const memberExists = await Member.findOne({
          _id: memberId,
          isDeleted: false,
        });

        if (memberExists) {
          processedMembers.push({
            memberId: memberId,
            addedAt: new Date(),
          });
        }
      }
    }

    // Create new group
    const newGroup = new Group({
      groupName: groupName.trim(),
      groupImage: uploadedImageUrl,
      description: description?.trim() || "",
      members: processedMembers,
      createdBy: req.user?.id || null,
    });

    await newGroup.save();

    // Populate member details for response
    const populatedGroup = await Group.findById(newGroup._id).populate({
      path: "members.memberId",
      select: "fullName email phoneNumber photo",
    });

    console.log("✅ Group created successfully:", populatedGroup._id);

    return res.status(201).json({
      success: true,
      message: "Group created successfully",
      group: populatedGroup,
    });
  } catch (error) {
    console.error("❌ Error creating group:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create group",
    });
  }
};

// ============================================
// GET ALL GROUPS (WITH PAGINATION)
// ============================================
const getAllGroups = async (req, res) => {
  try {
    console.log("📋 Fetching all groups...");

    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = { isDeleted: false };

    // Search by group name
    if (search) {
      query.groupName = { $regex: search, $options: "i" };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Get total count
    const totalCount = await Group.countDocuments(query);

    // Fetch groups with pagination
    const groups = await Group.find(query)
      .populate({
        path: "members.memberId",
        select: "fullName email phoneNumber photo",
      })
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(totalCount / limitNum);

    console.log(
      `✅ Found ${groups.length} groups (page ${pageNum}/${totalPages})`,
    );

    return res.status(200).json({
      success: true,
      groups,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching groups:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch groups",
    });
  }
};

// ============================================
// GET SINGLE GROUP BY ID
// ============================================
const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 Fetching group: ${id}`);

    const group = await Group.findOne({ _id: id, isDeleted: false }).populate({
      path: "members.memberId",
      select: "fullName email phoneNumber photo registrationNumber",
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        error: "Group not found",
      });
    }

    console.log(`✅ Group found: ${group.groupName}`);

    return res.status(200).json({
      success: true,
      group,
    });
  } catch (error) {
    console.error("❌ Error fetching group:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch group",
    });
  }
};

// ============================================
// UPDATE GROUP
// ============================================
const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { groupName, groupImage, description, members } = req.body;

    console.log(`✏️ Updating group: ${id}`);
    console.log("Update data:", req.body);

    // Find existing group
    const existingGroup = await Group.findOne({ _id: id, isDeleted: false });

    if (!existingGroup) {
      return res.status(404).json({
        success: false,
        error: "Group not found",
      });
    }

    // Check if new name conflicts with another group
    if (groupName && groupName.trim() !== existingGroup.groupName) {
      const nameConflict = await Group.findOne({
        groupName: { $regex: new RegExp(`^${groupName.trim()}$`, "i") },
        isDeleted: false,
        _id: { $ne: id },
      });

      if (nameConflict) {
        return res.status(400).json({
          success: false,
          error: "Group with this name already exists",
        });
      }
    }

    // Update fields
    if (groupName) {
      existingGroup.groupName = groupName.trim();
    }

    if (description !== undefined) {
      existingGroup.description = description.trim();
    }

    // Handle image update
    if (groupImage && groupImage.startsWith("data:")) {
      try {
        const uploadResult = await imageUploadUtil(groupImage);
        existingGroup.groupImage = uploadResult.secure_url;
        console.log("✅ Group image updated:", existingGroup.groupImage);
      } catch (uploadError) {
        console.error("❌ Error uploading image:", uploadError);
        return res.status(400).json({
          success: false,
          error: "Failed to upload group image",
        });
      }
    } else if (groupImage !== undefined) {
      existingGroup.groupImage = groupImage;
    }

    // Update members array
    if (members && Array.isArray(members)) {
      const processedMembers = [];
      for (const memberId of members) {
        // Verify member exists
        const memberExists = await Member.findOne({
          _id: memberId,
          isDeleted: false,
        });

        if (memberExists) {
          // Check if member was already in the group
          const existingMemberEntry = existingGroup.members.find(
            (m) => m.memberId.toString() === memberId.toString(),
          );

          processedMembers.push({
            memberId: memberId,
            addedAt: existingMemberEntry?.addedAt || new Date(),
          });
        }
      }
      existingGroup.members = processedMembers;
    }

    await existingGroup.save();

    // Populate member details for response
    const updatedGroup = await Group.findById(existingGroup._id).populate({
      path: "members.memberId",
      select: "fullName email phoneNumber photo",
    });

    console.log("✅ Group updated successfully:", updatedGroup._id);

    return res.status(200).json({
      success: true,
      message: "Group updated successfully",
      group: updatedGroup,
    });
  } catch (error) {
    console.error("❌ Error updating group:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to update group",
    });
  }
};

// ============================================
// DELETE GROUP (SOFT DELETE)
// ============================================
const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting group: ${id}`);

    const group = await Group.findOne({ _id: id, isDeleted: false });

    if (!group) {
      return res.status(404).json({
        success: false,
        error: "Group not found",
      });
    }

    // Soft delete
    group.isDeleted = true;
    await group.save();

    console.log("✅ Group deleted successfully:", group._id);

    return res.status(200).json({
      success: true,
      message: "Group deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting group:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to delete group",
    });
  }
};

// ============================================
// ADD MEMBER TO GROUP
// ============================================
const addMemberToGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { memberId } = req.body;

    console.log(`➕ Adding member ${memberId} to group ${id}`);

    const group = await Group.findOne({ _id: id, isDeleted: false });

    if (!group) {
      return res.status(404).json({
        success: false,
        error: "Group not found",
      });
    }

    // Check if member exists
    const member = await Member.findOne({ _id: memberId, isDeleted: false });
    if (!member) {
      return res.status(404).json({
        success: false,
        error: "Member not found",
      });
    }

    // Check if member is already in the group
    const alreadyInGroup = group.members.some(
      (m) => m.memberId.toString() === memberId.toString(),
    );

    if (alreadyInGroup) {
      return res.status(400).json({
        success: false,
        error: "Member is already in this group",
      });
    }

    // Add member
    group.members.push({
      memberId: memberId,
      addedAt: new Date(),
    });

    await group.save();

    // Populate for response
    const updatedGroup = await Group.findById(group._id).populate({
      path: "members.memberId",
      select: "fullName email phoneNumber photo",
    });

    console.log("✅ Member added to group successfully");

    return res.status(200).json({
      success: true,
      message: "Member added to group successfully",
      group: updatedGroup,
    });
  } catch (error) {
    console.error("❌ Error adding member to group:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to add member to group",
    });
  }
};

// ============================================
// REMOVE MEMBER FROM GROUP
// ============================================
const removeMemberFromGroup = async (req, res) => {
  try {
    const { id, memberId } = req.params;

    console.log(`➖ Removing member ${memberId} from group ${id}`);

    const group = await Group.findOne({ _id: id, isDeleted: false });

    if (!group) {
      return res.status(404).json({
        success: false,
        error: "Group not found",
      });
    }

    // Find member index
    const memberIndex = group.members.findIndex(
      (m) => m.memberId.toString() === memberId.toString(),
    );

    if (memberIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Member not found in this group",
      });
    }

    // Remove member
    group.members.splice(memberIndex, 1);
    await group.save();

    // Populate for response
    const updatedGroup = await Group.findById(group._id).populate({
      path: "members.memberId",
      select: "fullName email phoneNumber photo",
    });

    console.log("✅ Member removed from group successfully");

    return res.status(200).json({
      success: true,
      message: "Member removed from group successfully",
      group: updatedGroup,
    });
  } catch (error) {
    console.error("❌ Error removing member from group:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to remove member from group",
    });
  }
};

// ============================================
// SEARCH MEMBERS (FOR ADDING TO GROUP)
// ============================================
const searchMembersForGroup = async (req, res) => {
  try {
    const { search = "", excludeGroup = "" } = req.query;

    console.log(`🔍 Searching members: ${search}`);

    const query = { isDeleted: false };

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
        { registrationNumber: { $regex: search, $options: "i" } },
      ];
    }

    const members = await Member.find(query)
      .select("_id fullName email phoneNumber photo registrationNumber")
      .limit(20);

    // If excludeGroup is provided, filter out members already in that group
    let filteredMembers = members;
    if (excludeGroup) {
      const group = await Group.findOne({
        _id: excludeGroup,
        isDeleted: false,
      });

      if (group) {
        const groupMemberIds = group.members.map((m) => m.memberId.toString());
        filteredMembers = members.filter(
          (m) => !groupMemberIds.includes(m._id.toString()),
        );
      }
    }

    console.log(`✅ Found ${filteredMembers.length} members`);

    return res.status(200).json({
      success: true,
      members: filteredMembers,
    });
  } catch (error) {
    console.error("❌ Error searching members:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to search members",
    });
  }
};

module.exports = {
  createGroup,
  getAllGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addMemberToGroup,
  removeMemberFromGroup,
  searchMembersForGroup,
};
