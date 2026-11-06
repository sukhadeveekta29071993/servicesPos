const express = require("express");
const router = express.Router();

const {
  createVehicleSale,
  getVehicleSales,
  getVehicleSaleById,
  getSalesByCustomer,
  recordVehicleSalePayment,
  completeVehicleSale,
  cancelVehicleSale,
  updateVehicleDeliveryStatus,
} = require("../controllers/vehicleSaleController");

const { protect } = require("../middleware/authMiddleware");

// Vehicle Sales
router.post("/", protect, createVehicleSale);
router.get("/", protect, getVehicleSales);

// Customer-wise sales - keep before /:id
router.get("/customer/:customerId", protect, getSalesByCustomer);

// Payment
router.post("/:id/payments", protect, recordVehicleSalePayment);

// Complete / Cancel sale
router.patch("/:id/complete", protect, completeVehicleSale);
router.patch("/:id/cancel", protect, cancelVehicleSale);

// Delivery
router.patch("/:id/delivery", protect, updateVehicleDeliveryStatus);

// Single sale
router.get("/:id", protect, getVehicleSaleById);

module.exports = router;
