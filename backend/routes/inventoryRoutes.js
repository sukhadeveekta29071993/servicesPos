const express = require("express");
const router = express.Router();

const {
  createInventory,
  getAllInventory,
  getInventoryById,
  getInventoryByProduct,
  getStockMovements,
  getStockMovementsByProduct,
  updateStock,
} = require("../controllers/inventoryController");

const { protect } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(protect);

// Inventory routes
router.post("/", createInventory);
router.get("/", getAllInventory);
router.get("/product/:productId", getInventoryByProduct);
router.get("/:id", getInventoryById);

// Stock movement routes
router.get("/movements/all", getStockMovements);
router.get("/movements/product/:productId", getStockMovementsByProduct);
router.post("/movements", updateStock);

module.exports = router;
