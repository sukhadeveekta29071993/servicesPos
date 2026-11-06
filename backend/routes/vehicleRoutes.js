const express = require("express");
const router = express.Router();

const {
  addVehicle,
  getVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  getVehiclesByCustomer,
} = require("../controllers/vehicleController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// All vehicle routes require authentication
router.use(protect);

// Add Vehicle
router.post("/", authorizeRoles("admin", "salesperson"), addVehicle);

// Get All Vehicles
router.get("/", authorizeRoles("admin", "salesperson"), getVehicles);

// Get Vehicles By Customer
router.get(
  "/customer/:customerId",
  authorizeRoles("admin", "salesperson"),
  getVehiclesByCustomer,
);

// Get Vehicle By ID
router.get("/:id", authorizeRoles("admin", "salesperson"), getVehicleById);

// Update Vehicle
router.put("/:id", authorizeRoles("admin", "salesperson"), updateVehicle);

// Deactivate Vehicle - Admin Only
router.delete("/:id", authorizeRoles("admin"), deleteVehicle);

module.exports = router;
