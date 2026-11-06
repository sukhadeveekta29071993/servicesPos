const express = require("express");
const router = express.Router();

const {
  createVehicleUnit,
  getVehicleUnits,
  getVehicleUnitById,
  getUnitsByVehicleModel,
  updateVehicleUnit,
  updateVehicleUnitStatus,
} = require("../controllers/vehicleUnitController");

const { protect } = require("../middleware/authMiddleware");

// Vehicle Unit / Stock
router.post("/", protect, createVehicleUnit);
router.get("/", protect, getVehicleUnits);

// Specific model units - keep this before /:id
router.get("/model/:modelId", protect, getUnitsByVehicleModel);

router.get("/:id", protect, getVehicleUnitById);
router.put("/:id", protect, updateVehicleUnit);
router.patch("/:id/status", protect, updateVehicleUnitStatus);

module.exports = router;
