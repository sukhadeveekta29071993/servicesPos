const Customer = require("../models/Customer");

// Generate unique customer code
const generateCustomerCode = async () => {
  const lastCustomer = await Customer.findOne({
    customerCode: { $exists: true, $ne: "" },
  }).sort({ createdAt: -1 });

  let nextNumber = 1;

  if (lastCustomer && lastCustomer.customerCode) {
    const lastNumber = parseInt(
      lastCustomer.customerCode.replace("CUS", ""),
      10,
    );

    if (!Number.isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `CUS${String(nextNumber).padStart(5, "0")}`;
};

// Add Customer
const addCustomer = async (req, res) => {
  try {
    const {
      name,
      mobile,
      alternateMobile,
      email,
      gender,
      address,
      city,
      state,
      pincode,
      customerType,
      businessName,
      gstin,
      notes,
    } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({
        success: false,
        message: "Customer name and mobile are required",
      });
    }

    const existingCustomer = await Customer.findOne({ mobile });

    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: "Customer with this mobile number already exists",
      });
    }

    const customerCode = await generateCustomerCode();

    const customer = await Customer.create({
      customerCode,
      name,
      mobile,
      alternateMobile,
      email,
      gender,
      address,
      city,
      state,
      pincode,
      customerType,
      businessName,
      gstin,
      notes,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All Customers
const getCustomers = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10, status } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
        { customerCode: { $regex: search, $options: "i" } },
      ];
    }

    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.min(100, Math.max(1, Number(limit) || 10));

    const total = await Customer.countDocuments(filter);

    const customers = await Customer.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    return res.status(200).json({
      success: true,
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
      data: customers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Customer By ID
const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).populate(
      "createdBy",
      "name email",
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid customer ID",
    });
  }
};

// Update Customer
const updateCustomer = async (req, res) => {
  try {
    const allowedFields = [
      "name",
      "mobile",
      "alternateMobile",
      "email",
      "gender",
      "address",
      "city",
      "state",
      "pincode",
      "customerType",
      "businessName",
      "gstin",
      "notes",
      "status",
    ];

    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (updates.mobile) {
      const duplicate = await Customer.findOne({
        mobile: updates.mobile,
        _id: { $ne: req.params.id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Mobile number already belongs to another customer",
        });
      }
    }

    const customer = await Customer.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Soft Delete Customer
const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { status: "inactive" },
      { new: true, runValidators: true },
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Customer deactivated successfully",
      data: customer,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid customer ID",
    });
  }
};

module.exports = {
  addCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
};
