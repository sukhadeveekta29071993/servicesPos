const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const {
  getSalespersonDashboard,
} = require("../controllers/salespersonController");

router.get(
  "/dashboard",
  protect,
  authorizeRoles("salesperson", "admin"),
  getSalespersonDashboard,
);

module.exports = router;
