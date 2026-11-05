const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { checkOwnership } = require("../middleware/checkOwnership");

const { getCustomerProfile } = require("../controllers/customerController");

router.get(
  "/:userId/profile",
  protect,
  checkOwnership("userId"),
  getCustomerProfile,
);

module.exports = router;
