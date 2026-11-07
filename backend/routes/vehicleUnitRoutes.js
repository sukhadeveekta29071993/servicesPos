const express = require("express");
const router = express.Router();

const {
  createVehicleUnit,
  getVehicleUnits,
  getVehicleUnitById,
  getUnitsByVehicleModel,
  updateVehicleUnit,
  updateVehicleUnitStatus,
  getVehicleUnitStockSummary,
} = require("../controllers/vehicleUnitController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// All routes require authentication
router.use(protect);

// View Vehicle Stock
router.get(
  "/",
  authorizeRoles("admin", "salesperson", "mechanic", "cashier"),
  getVehicleUnits,
);

// Get units by Vehicle Model
router.get(
  "/model/:modelId",
  authorizeRoles("admin", "salesperson", "mechanic", "cashier"),
  getUnitsByVehicleModel,
);

// Get single Vehicle Unit
router.get(
  "/:id",
  authorizeRoles("admin", "salesperson", "mechanic", "cashier"),
  getVehicleUnitById,
);

// Vehicle Stock Summary
router.get(
  "/summary",
  authorizeRoles("admin", "salesperson", "mechanic", "cashier"),
  getVehicleUnitStockSummary,
);
// Admin Only - Add Vehicle Unit
router.post("/", authorizeRoles("admin"), createVehicleUnit);

// Admin Only - Update Vehicle Unit Details
router.put("/:id", authorizeRoles("admin"), updateVehicleUnit);

// Admin and Salesperson - Update Stock Status
router.patch(
  "/:id/status",
  authorizeRoles("admin", "salesperson"),
  updateVehicleUnitStatus,
);

module.exports = router;
