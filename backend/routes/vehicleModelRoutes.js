const express = require("express");
const router = express.Router();

const {
  createVehicleModel,
  getVehicleModels,
  getVehicleModelById,
  updateVehicleModel,
  deleteVehicleModel,
} = require("../controllers/vehicleModelController");

const { protect } = require("../middleware/authMiddleware");

// Vehicle Model CRUD
router.post("/", protect, createVehicleModel);
router.get("/", protect, getVehicleModels);
router.get("/:id", protect, getVehicleModelById);
router.put("/:id", protect, updateVehicleModel);
router.delete("/:id", protect, deleteVehicleModel);

module.exports = router;
