const getCustomerProfile = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Customer profile fetched successfully",
      data: {
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone,
          role: req.user.role,
          customer_type: req.user.customer_type,
          business_name: req.user.business_name,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch customer profile",
    });
  }
};

module.exports = {
  getCustomerProfile,
};
