const express = require("express");

const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  getDashboardSummary,
  getVehicleSalesReport,
  getCounterSalesReport,
  getServiceRevenueReport,
  getExpenseReport,
  getPurchaseReport,
  getPaymentReport,
  getInventoryReport,
  getGSTReport,
} = require("../controllers/reportController");

// Dashboard Summary
router.get("/dashboard", protect, getDashboardSummary);

router.get("/counter-sales", protect, getCounterSalesReport);

// Vehicle Sales Report
router.get("/vehicle-sales", protect, getVehicleSalesReport);

// Service Revenue Report
router.get("/service-revenue", protect, getServiceRevenueReport);

// Expense Report
router.get("/expenses", protect, getExpenseReport);

// Purchase Report
router.get("/purchases", protect, getPurchaseReport);
router.get("/payments", protect, getPaymentReport);
router.get("/inventory", protect, getInventoryReport);
router.get("/gst", protect, getGSTReport);

module.exports = router;
