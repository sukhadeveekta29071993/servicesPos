const express = require("express");
const router = express.Router();

const { getVendorLedger } = require("../controllers/vendorLedgerController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// All routes require authentication
router.use(protect);

// Get Vendor Ledger
router.get("/:vendorId", authorizeRoles("admin", "cashier"), getVendorLedger);

module.exports = router;
