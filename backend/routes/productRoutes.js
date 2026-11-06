const express = require("express");
const router = express.Router();

const {
  addProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.use(protect);

router.post("/", authorizeRoles("admin", "salesperson"), addProduct);

router.get("/", authorizeRoles("admin", "salesperson"), getProducts);

router.get("/:id", authorizeRoles("admin", "salesperson"), getProductById);

router.put("/:id", authorizeRoles("admin"), updateProduct);

router.delete("/:id", authorizeRoles("admin"), deleteProduct);

module.exports = router;
