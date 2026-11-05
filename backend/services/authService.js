const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === "production";

  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };

  res.cookie("access_token", accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refresh_token", refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearAuthCookies = (res) => {
  const isProduction = process.env.NODE_ENV === "production";

  const options = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };

  res.clearCookie("access_token", options);
  res.clearCookie("refresh_token", options);
};

const sanitizeUser = (user) => ({
  id: user._id.toString(),
  name: user.name || "",
  email: user.email || "",
  phone: user.phone || "",
  role: user.role || "customer",
  customer_type: user.customer_type || "retail",
  approved: user.approved ?? true,
  business_name: user.business_name || "",
  gstin: user.gstin || "",
  salesperson_id: user.salesperson_id || "",
});

module.exports = {
  setAuthCookies,
  clearAuthCookies,
  sanitizeUser,
};
