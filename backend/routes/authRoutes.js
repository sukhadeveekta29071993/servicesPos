const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  register,
  login,
  getMe,
  logout,
  refreshToken,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    detail: "Too many login attempts. Please try again later.",
  },
});

router.post("/register", register);
router.post("/login", loginLimiter, login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.get("/me", protect, getMe);

module.exports = router;
