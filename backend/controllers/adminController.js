const getAdminDashboard = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Admin Dashboard Data",
      data: {
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to load admin dashboard",
    });
  }
};

module.exports = {
  getAdminDashboard,
};
