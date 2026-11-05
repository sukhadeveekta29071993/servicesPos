const getSalespersonDashboard = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Welcome to Salesperson Dashboard",
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
      message: "Unable to load salesperson dashboard",
    });
  }
};

module.exports = {
  getSalespersonDashboard,
};
