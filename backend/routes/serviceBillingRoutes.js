const express = require("express");

const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  createServiceInvoice,
  getAllServiceInvoices,
  getServiceInvoiceById,
  getInvoiceByJobCard,
  addPayment,
  getAllPayments,
  getPaymentsByInvoice,
  getPaymentById,
} = require("../controllers/serviceBillingController");

// Service Invoice Routes

router.post("/invoices", protect, createServiceInvoice);

router.get("/invoices", protect, getAllServiceInvoices);

router.get("/invoices/job-card/:jobCardId", protect, getInvoiceByJobCard);

router.get("/invoices/:id", protect, getServiceInvoiceById);

// Payment Routes

router.post("/payments", protect, addPayment);

router.get("/payments", protect, getAllPayments);

router.get("/payments/invoice/:invoiceId", protect, getPaymentsByInvoice);

router.get("/payments/:id", protect, getPaymentById);

module.exports = router;
