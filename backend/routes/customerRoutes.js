const express = require("express");
const router = express.Router();

const {
  addCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} = require("../controllers/customerController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// All customer routes require authentication
router.use(protect);

// Add Customer
router.post("/customers", authorizeRoles("admin", "salesperson"), addCustomer);

// Get All Customers
router.get("/", authorizeRoles("admin", "salesperson"), getCustomers);

// Get Customer By ID
router.get("/:id", authorizeRoles("admin", "salesperson"), getCustomerById);

// Update Customer
router.put("/:id", authorizeRoles("admin", "salesperson"), updateCustomer);

// Deactivate Customer (Admin Only)
router.delete("/:id", authorizeRoles("admin"), deleteCustomer);

module.exports = router;
