const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to access this resource",
        });
      }
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
      next(error);
    }
  };
};

module.exports = { authorizeRoles };
