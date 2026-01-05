const express = require("express");
const router = express.Router();
const packageFeaturesController = require("../../controllers/admin/packagefeatures-controller");

// Get all package features
router.get("/features", packageFeaturesController.getAllFeatures);

// Create a new package feature
router.post("/features", packageFeaturesController.createFeature);

// Update a package feature
router.put("/features/:id", packageFeaturesController.updateFeature);

// Delete a package feature
router.delete("/features/:id", packageFeaturesController.deleteFeature);

module.exports = router;
