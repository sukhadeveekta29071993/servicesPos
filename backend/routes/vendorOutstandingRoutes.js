const express = require("express");
const router = express.Router();

const {
  getVendorOutstanding,
  getVendorOutstandingById,
} = require("../controllers/vendorOutstandingController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// All routes require authentication
router.use(protect);

// Get All Vendor Outstanding
router.get("/", authorizeRoles("admin", "cashier"), getVendorOutstanding);

// Get Outstanding By Vendor ID
router.get(
  "/:vendorId",
  authorizeRoles("admin", "cashier"),
  getVendorOutstandingById,
);

module.exports = router;
