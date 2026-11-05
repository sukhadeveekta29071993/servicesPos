const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const {
  getCustomers,
  getCustomerById,
} = require("../controllers/customerController");

// All routes require authentication
router.use(protect);

// Get all customers
router.get("/customers", authorizeRoles("admin", "salesperson"), getCustomers);

// Get customer by ID
router.get(
  "/customers/:id",
  authorizeRoles("admin", "salesperson"),
  getCustomerById,
);

module.exports = router;
