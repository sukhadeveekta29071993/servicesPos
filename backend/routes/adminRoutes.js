const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const { getAdminDashboard } = require("../controllers/adminController");

router.get("/dashboard", protect, authorizeRoles("admin"), getAdminDashboard);

module.exports = router;
