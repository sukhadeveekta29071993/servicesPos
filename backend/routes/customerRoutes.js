const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const { getCustomerProfile } = require("../controllers/customerController");

router.get("/profile", protect, authorizeRoles("customer"), getCustomerProfile);

module.exports = router;
