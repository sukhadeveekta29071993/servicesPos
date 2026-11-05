const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const {
  setAuthCookies,
  clearAuthCookies,
  sanitizeUser,
} = require("../services/authService");

const {
  generateToken,
  generateRefreshToken,
} = require("../utils/generateToken");

// REGISTER
const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone = "",
      customer_type = "retail",
      business_name = "",
      gstin = "",
    } = req.body;

    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();
    const cleanPassword = String(password || "");

    if (!cleanName) {
      return res.status(400).json({
        detail: "Full name is required",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        detail: "Enter a valid email address",
      });
    }

    if (cleanPassword.length < 6) {
      return res.status(400).json({
        detail: "Password must be at least 6 characters",
      });
    }

    if (Buffer.byteLength(cleanPassword, "utf8") > 72) {
      return res.status(400).json({
        detail: "Password must not exceed 72 bytes",
      });
    }

    const existingUser = await User.findOne({
      email: cleanEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        detail: "An account with this email already exists. Try logging in.",
      });
    }

    const validCustomerType = ["retail", "wholesale"].includes(customer_type)
      ? customer_type
      : "retail";

    const passwordHash = await bcrypt.hash(cleanPassword, 12);

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password_hash: passwordHash,
      phone: String(phone || "").trim(),
      customer_type: validCustomerType,
      approved: validCustomerType !== "wholesale",
      business_name: String(business_name || "").trim(),
      gstin: String(gstin || "")
        .trim()
        .toUpperCase(),

      // Public registration must never create an admin.
      role: "customer",
    });

    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json(sanitizeUser(user));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        detail: "Email already registered",
      });
    }

    console.error("Register Error:", error.message);

    return res.status(500).json({
      detail: "Registration failed",
    });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        detail: "Email and password are required",
      });
    }

    const user = await User.findOne({ email }).select("+password_hash");

    if (!user) {
      return res.status(401).json({
        detail: "Incorrect email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        detail: "Incorrect email or password",
      });
    }

    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json(sanitizeUser(user));
  } catch (error) {
    console.error("Login Error:", error.message);

    return res.status(500).json({
      detail: "Login failed",
    });
  }
};

// CURRENT USER
const getMe = async (req, res) => {
  return res.status(200).json(sanitizeUser(req.user));
};

// LOGOUT
const logout = async (req, res) => {
  clearAuthCookies(res);

  return res.status(200).json({
    ok: true,
    message: "Logged out successfully",
  });
};

// REFRESH TOKEN
const refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refresh_token;

    if (!token) {
      return res.status(401).json({
        detail: "Refresh token not found",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== "refresh") {
      return res.status(401).json({
        detail: "Invalid refresh token",
      });
    }

    const user = await User.findById(decoded.sub);

    if (!user) {
      return res.status(401).json({
        detail: "User not found",
      });
    }

    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json(sanitizeUser(user));
  } catch (error) {
    clearAuthCookies(res);

    return res.status(401).json({
      detail: "Refresh token expired or invalid",
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  refreshToken,
};
