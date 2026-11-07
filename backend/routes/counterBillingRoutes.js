const express = require("express");

const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  createCounterInvoice,
  getAllCounterInvoices,
  getCounterInvoiceById,
  addCounterPayment,
  getAllCounterPayments,
  getCounterPaymentsByInvoice,
  getCounterPaymentById,
} = require("../controllers/counterBillingController");

// Counter Invoice Routes

router.post("/invoices", protect, createCounterInvoice);

router.get("/invoices", protect, getAllCounterInvoices);

router.get("/invoices/:id", protect, getCounterInvoiceById);

// Counter Payment Routes

router.post("/payments", protect, addCounterPayment);

router.get("/payments", protect, getAllCounterPayments);

router.get(
  "/payments/invoice/:invoiceId",
  protect,
  getCounterPaymentsByInvoice,
);

router.get("/payments/:id", protect, getCounterPaymentById);

module.exports = router;
