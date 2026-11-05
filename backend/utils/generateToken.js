const jwt = require("jsonwebtoken");

const getSecretKey = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing in .env");
  }

  return process.env.JWT_SECRET;
};

// Access Token - 15 minutes
const generateToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      type: "access",
    },
    getSecretKey(),
    { expiresIn: "15m" },
  );
};

// Refresh Token - 7 days
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      type: "refresh",
    },
    getSecretKey(),
    { expiresIn: "7d" },
  );
};

module.exports = {
  generateToken,
  generateRefreshToken,
};
