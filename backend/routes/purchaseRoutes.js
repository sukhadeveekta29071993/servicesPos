const express = require("express");
const router = express.Router();

const {
  addPurchase,
  getPurchases,
  getPurchaseById,
  updatePurchase,
  deletePurchase,
} = require("../controllers/purchaseController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// All routes require authentication
router.use(protect);

// Create Purchase
router.post("/", authorizeRoles("admin", "salesperson"), addPurchase);

// Get All Purchases
router.get("/", authorizeRoles("admin", "salesperson"), getPurchases);

// Get Purchase By ID
router.get("/:id", authorizeRoles("admin", "salesperson"), getPurchaseById);

// Update Purchase
router.put("/:id", authorizeRoles("admin"), updatePurchase);

// Cancel Purchase (Soft Delete)
router.delete("/:id", authorizeRoles("admin"), deletePurchase);

module.exports = router;
