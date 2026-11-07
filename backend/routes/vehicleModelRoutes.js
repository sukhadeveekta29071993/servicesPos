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
const { authorizeRoles } = require("../middleware/roleMiddleware");

// All routes require authentication
router.use(protect);

// Read Vehicle Models
router.get(
  "/",
  authorizeRoles("admin", "salesperson", "mechanic", "cashier"),
  getVehicleModels,
);

router.get(
  "/:id",
  authorizeRoles("admin", "salesperson", "mechanic", "cashier"),
  getVehicleModelById,
);

// Admin Only - Create Vehicle Model
router.post("/", authorizeRoles("admin"), createVehicleModel);

// Admin Only - Update Vehicle Model
router.put("/:id", authorizeRoles("admin"), updateVehicleModel);

// Admin Only - Deactivate Vehicle Model
router.delete("/:id", authorizeRoles("admin"), deleteVehicleModel);

module.exports = router;
