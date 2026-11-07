const express = require("express");
const router = express.Router();

const {
  addSupplierPayment,
  getSupplierPayments,
  getSupplierPaymentById,
  cancelSupplierPayment,
} = require("../controllers/supplierPaymentController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// All routes require authentication
router.use(protect);

// Create Supplier Payment
router.post("/", authorizeRoles("admin", "cashier"), addSupplierPayment);

// Get All Supplier Payments
router.get("/", authorizeRoles("admin", "cashier"), getSupplierPayments);

// Get Supplier Payment By ID
router.get("/:id", authorizeRoles("admin", "cashier"), getSupplierPaymentById);

// Cancel Supplier Payment
router.patch("/:id/cancel", authorizeRoles("admin"), cancelSupplierPayment);

module.exports = router;
