const PackageFeature = require("../../models/admin/PackageFeatures");

// Get all package features
exports.getAllFeatures = async (req, res) => {
  try {
    const features = await PackageFeature.find({ isActive: true }).sort({
      name: 1,
    });

    res.status(200).json({
      success: true,
      message: "Features fetched successfully",
      data: features,
    });
  } catch (error) {
    console.error("Get Features Error:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching features",
    });
  }
};

// Create a new package feature
exports.createFeature = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Feature name is required",
      });
    }

    // Check if feature already exists
    const existingFeature = await PackageFeature.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingFeature) {
      return res.status(400).json({
        success: false,
        error: "Feature with this name already exists",
      });
    }

    const newFeature = new PackageFeature({
      name: name.trim(),
      description: description?.trim() || "",
    });

    const savedFeature = await newFeature.save();

    res.status(201).json({
      success: true,
      message: "Feature created successfully",
      data: savedFeature,
    });
  } catch (error) {
    console.error("Create Feature Error:", error);
    res.status(500).json({
      success: false,
      error: "Server error while creating feature",
    });
  }
};

// Update a package feature
exports.updateFeature = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const feature = await PackageFeature.findById(id);
    if (!feature) {
      return res.status(404).json({
        success: false,
        error: "Feature not found",
      });
    }

    // Check if name is being changed and if new name already exists
    if (name && name !== feature.name) {
      const existingFeature = await PackageFeature.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${name}$`, "i") },
      });

      if (existingFeature) {
        return res.status(400).json({
          success: false,
          error: "Feature with this name already exists",
        });
      }
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedFeature = await PackageFeature.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Feature updated successfully",
      data: updatedFeature,
    });
  } catch (error) {
    console.error("Update Feature Error:", error);
    res.status(500).json({
      success: false,
      error: "Server error while updating feature",
    });
  }
};

// Delete a package feature
exports.deleteFeature = async (req, res) => {
  try {
    const { id } = req.params;

    const feature = await PackageFeature.findById(id);
    if (!feature) {
      return res.status(404).json({
        success: false,
        error: "Feature not found",
      });
    }

    await PackageFeature.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Feature deleted successfully",
    });
  } catch (error) {
    console.error("Delete Feature Error:", error);
    res.status(500).json({
      success: false,
      error: "Server error while deleting feature",
    });
  }
};
