const checkOwnership = (paramName = "userId") => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const requestedUserId = req.params[paramName];

      const loggedInUserId = req.user._id.toString();

      const isOwner = requestedUserId === loggedInUserId;

      const isAdmin = req.user.role === "admin";

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "You can access only your own resources",
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { checkOwnership };
