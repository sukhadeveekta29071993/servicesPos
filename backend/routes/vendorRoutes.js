const express = require("express");
const router = express.Router();

const {
  addVendor,
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
} = require("../controllers/vendorController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.use(protect);

router.post("/", authorizeRoles("admin", "salesperson"), addVendor);

router.get("/", authorizeRoles("admin", "salesperson"), getVendors);

router.get("/:id", authorizeRoles("admin", "salesperson"), getVendorById);

router.put("/:id", authorizeRoles("admin"), updateVendor);

router.delete("/:id", authorizeRoles("admin"), deleteVendor);

module.exports = router;
