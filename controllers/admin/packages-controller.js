const Package = require("../../models/admin/Packages");

// ============================================
// CREATE PACKAGE
// ============================================
const createPackage = async (req, res) => {
  try {
    console.log("=== CREATE PACKAGE START ===");
    console.log("Body:", req.body);

    const {
      packageName,
      packageType,
      category,
      description,
      duration,
      originalPrice,
      discountedPrice,
      discountType,
      freezable,
      sessions,
      sessionCount,
      features,
      amenities,
      status,
      isActive,
      isFeatured,
      badge,
      popularity,
      displayOrder,
    } = req.body;

    // Calculate savings and final discounted price based on discount type
    let savings;
    let finalDiscountedPrice;

    if (discountType === "percentage") {
      // discountedPrice contains percentage value (e.g., 50 for 50%)
      savings = (originalPrice * discountedPrice) / 100;
      finalDiscountedPrice = originalPrice - savings;
    } else {
      // discountType is "flat" - discountedPrice is the savings amount
      savings = discountedPrice;
      finalDiscountedPrice = originalPrice - savings;
    }

    // Ensure prices are non-negative
    if (finalDiscountedPrice < 0) finalDiscountedPrice = 0;
    if (savings < 0) savings = 0;

    // Create package object
    const packageData = {
      packageName,
      packageType,
      category,
      description,
      duration,
      originalPrice,
      discountedPrice: finalDiscountedPrice,
      discountType: discountType || "flat",
      freezable: freezable !== undefined ? freezable : false,
      savings,
      sessions: sessions || "Unlimited",
      sessionCount: sessionCount || null,
      features: features || [],
      amenities: amenities || {
        gymAccess: true,
        lockerRoom: true,
        basicEquipment: true,
        premiumEquipment: false,
        groupClasses: false,
        personalTrainer: false,
        nutritionPlan: false,
        sauna: false,
        steamRoom: false,
        swimmingPool: false,
        spa: false,
        dietConsultation: false,
        guestPass: false,
      },
      status: status || "Active",
      isActive: isActive !== undefined ? isActive : true,
      isFeatured: isFeatured || false,
      badge: badge || "",
      popularity: popularity || 0,
      displayOrder: displayOrder || 0,
    };

    console.log("Creating package with data:", packageData);

    const newPackage = await Package.create(packageData);

    console.log("✅ Package created:", newPackage._id);

    return res.status(201).json({
      success: true,
      message: "Package created successfully",
      package: newPackage,
    });
  } catch (error) {
    console.error("❌ Error in createPackage:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create package",
    });
  }
};

// ============================================
// GET ALL PACKAGES
// ============================================
const getAllPackages = async (req, res) => {
  try {
    console.log("📦 Fetching all packages");

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.packageType) filter.packageType = req.query.packageType;
    if (req.query.isActive !== undefined)
      filter.isActive = req.query.isActive === "true";

    const packages = await Package.find(filter).sort({
      displayOrder: 1,
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: packages.length,
      packages,
    });
  } catch (error) {
    console.error("❌ Error in getAllPackages:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch packages",
    });
  }
};

// ============================================
// GET PACKAGE BY ID
// ============================================
const getPackageById = async (req, res) => {
  try {
    const { id } = req.params;
    const package = await Package.findById(id);

    if (!package) {
      return res.status(404).json({
        success: false,
        error: "Package not found",
      });
    }

    return res.status(200).json({
      success: true,
      package,
    });
  } catch (error) {
    console.error("❌ Error in getPackageById:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch package",
    });
  }
};

// ============================================
// GET ACTIVE PACKAGES
// ============================================
const getActivePackages = async (req, res) => {
  try {
    const packages = await Package.find({
      isActive: true,
      status: "Active",
    }).sort({ displayOrder: 1, popularity: -1 });

    return res.status(200).json({
      success: true,
      count: packages.length,
      packages,
    });
  } catch (error) {
    console.error("❌ Error in getActivePackages:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch active packages",
    });
  }
};

// ============================================
// GET FEATURED PACKAGES
// ============================================
const getFeaturedPackages = async (req, res) => {
  try {
    const packages = await Package.find({
      isActive: true,
      status: "Active",
      isFeatured: true,
    }).sort({ displayOrder: 1, popularity: -1 });

    return res.status(200).json({
      success: true,
      count: packages.length,
      packages,
    });
  } catch (error) {
    console.error("❌ Error in getFeaturedPackages:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch featured packages",
    });
  }
};

// ============================================
// GET PACKAGES BY CATEGORY
// ============================================
const getPackagesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const packages = await Package.find({
      category,
      isActive: true,
      status: "Active",
    }).sort({ displayOrder: 1, popularity: -1 });

    return res.status(200).json({
      success: true,
      count: packages.length,
      category,
      packages,
    });
  } catch (error) {
    console.error("❌ Error in getPackagesByCategory:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch packages by category",
    });
  }
};

// ============================================
// GET PACKAGE STATISTICS
// ============================================
const getPackageStatistics = async (req, res) => {
  try {
    const total = await Package.countDocuments();
    const active = await Package.countDocuments({
      isActive: true,
      status: "Active",
    });
    const inactive = await Package.countDocuments({
      $or: [{ isActive: false }, { status: "Inactive" }],
    });
    const featured = await Package.countDocuments({ isFeatured: true });

    const statistics = {
      total,
      active,
      inactive,
      featured,
    };

    return res.status(200).json({
      success: true,
      statistics,
    });
  } catch (error) {
    console.error("❌ Error in getPackageStatistics:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch statistics",
    });
  }
};

// ============================================
// UPDATE PACKAGE
// ============================================
const updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Recalculate savings and final discounted price if prices are updated
    if (updateData.originalPrice && updateData.discountedPrice) {
      let savings;
      let finalDiscountedPrice;

      if (updateData.discountType === "percentage") {
        // discountedPrice contains percentage value (e.g., 50 for 50%)
        savings = (updateData.originalPrice * updateData.discountedPrice) / 100;
        finalDiscountedPrice = updateData.originalPrice - savings;
      } else {
        // discountType is "flat" - discountedPrice is the savings amount
        savings = updateData.discountedPrice;
        finalDiscountedPrice = updateData.originalPrice - savings;
      }

      // Ensure prices are non-negative
      if (finalDiscountedPrice < 0) finalDiscountedPrice = 0;
      if (savings < 0) savings = 0;

      updateData.discountedPrice = finalDiscountedPrice;
      updateData.savings = savings;
    }

    const updatedPackage = await Package.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedPackage) {
      return res.status(404).json({
        success: false,
        error: "Package not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Package updated successfully",
      package: updatedPackage,
    });
  } catch (error) {
    console.error("❌ Error in updatePackage:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to update package",
    });
  }
};

// ============================================
// TOGGLE PACKAGE STATUS
// ============================================
const togglePackageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const package = await Package.findById(id);

    if (!package) {
      return res.status(404).json({
        success: false,
        error: "Package not found",
      });
    }

    package.isActive = !package.isActive;
    package.status = package.isActive ? "Active" : "Inactive";
    await package.save();

    return res.status(200).json({
      success: true,
      message: `Package ${package.status.toLowerCase()} successfully`,
      package,
    });
  } catch (error) {
    console.error("❌ Error in togglePackageStatus:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to toggle package status",
    });
  }
};

// ============================================
// DELETE PACKAGE
// ============================================
const deletePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPackage = await Package.findByIdAndDelete(id);

    if (!deletedPackage) {
      return res.status(404).json({
        success: false,
        error: "Package not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Package deleted successfully",
      package: deletedPackage,
    });
  } catch (error) {
    console.error("❌ Error in deletePackage:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to delete package",
    });
  }
};

// ============================================
// BULK DELETE PACKAGES
// ============================================
const bulkDeletePackages = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Please provide an array of package IDs",
      });
    }

    const result = await Package.deleteMany({ _id: { $in: ids } });

    return res.status(200).json({
      success: true,
      message: `${result.deletedCount} packages deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("❌ Error in bulkDeletePackages:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to delete packages",
    });
  }
};

// ============================================
// DUPLICATE PACKAGE
// ============================================
const duplicatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const originalPackage = await Package.findById(id);

    if (!originalPackage) {
      return res.status(404).json({
        success: false,
        error: "Package not found",
      });
    }

    const packageCopy = originalPackage.toObject();
    delete packageCopy._id;
    delete packageCopy.createdAt;
    delete packageCopy.updatedAt;
    delete packageCopy.__v;

    packageCopy.packageName = `${packageCopy.packageName} (Copy)`;
    packageCopy.isActive = false;
    packageCopy.status = "Inactive";

    const duplicatedPackage = await Package.create(packageCopy);

    return res.status(201).json({
      success: true,
      message: "Package duplicated successfully",
      package: duplicatedPackage,
    });
  } catch (error) {
    console.error("❌ Error in duplicatePackage:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to duplicate package",
    });
  }
};

// ============================================
// UPDATE DISPLAY ORDER
// ============================================
const updateDisplayOrder = async (req, res) => {
  try {
    const { packages } = req.body;

    if (!packages || !Array.isArray(packages)) {
      return res.status(400).json({
        success: false,
        error: "Please provide an array of packages with id and displayOrder",
      });
    }

    const updatePromises = packages.map((pkg) =>
      Package.findByIdAndUpdate(
        pkg.id,
        { displayOrder: pkg.displayOrder },
        { new: true }
      )
    );

    await Promise.all(updatePromises);

    return res.status(200).json({
      success: true,
      message: "Display order updated successfully",
    });
  } catch (error) {
    console.error("❌ Error in updateDisplayOrder:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to update display order",
    });
  }
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
  createPackage,
  getAllPackages,
  getPackageById,
  getActivePackages,
  getFeaturedPackages,
  getPackagesByCategory,
  getPackageStatistics,
  updatePackage,
  togglePackageStatus,
  deletePackage,
  bulkDeletePackages,
  duplicatePackage,
  updateDisplayOrder,
};
