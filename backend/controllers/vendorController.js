const mongoose = require("mongoose");
const Vendor = require("../models/Vendor");

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const handleError = (res, error) => {
  console.error("Vendor Controller Error:", error);

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];

    return res.status(409).json({
      success: false,
      message: `${field || "Vendor field"} already exists`,
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

// ADD VENDOR
const addVendor = async (req, res) => {
  try {
    const {
      vendorCode,
      name,
      companyName,
      mobile,
      alternateMobile,
      email,
      gstin,
      address,
      city,
      state,
      pincode,
      paymentTerms,
      creditDays,
      creditLimit,
      openingBalance,
      notes,
    } = req.body;

    if (!vendorCode || !name || !mobile) {
      return res.status(400).json({
        success: false,
        message: "Vendor code, name and mobile are required",
      });
    }

    const normalizedCode = String(vendorCode).trim().toUpperCase();

    const existingVendor = await Vendor.findOne({
      vendorCode: normalizedCode,
    });

    if (existingVendor) {
      return res.status(409).json({
        success: false,
        message: "Vendor code already exists",
      });
    }

    const vendor = await Vendor.create({
      vendorCode: normalizedCode,
      name,
      companyName,
      mobile,
      alternateMobile,
      email,
      gstin,
      address,
      city,
      state,
      pincode,
      paymentTerms,
      creditDays,
      creditLimit,
      openingBalance,
      notes,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      data: vendor,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET ALL VENDORS
const getVendors = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100,
    );

    const skip = (page - 1) * limit;
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.paymentTerms) {
      filter.paymentTerms = req.query.paymentTerms;
    }

    if (req.query.search) {
      const search = escapeRegex(req.query.search.trim());
      const searchRegex = { $regex: search, $options: "i" };

      filter.$or = [
        { vendorCode: searchRegex },
        { name: searchRegex },
        { companyName: searchRegex },
        { mobile: searchRegex },
        { email: searchRegex },
        { gstin: searchRegex },
      ];
    }

    const [vendors, total] = await Promise.all([
      Vendor.find(filter)
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Vendor.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: vendors,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET VENDOR BY ID
const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID",
      });
    }

    const vendor = await Vendor.findById(id).populate(
      "createdBy",
      "name email",
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// UPDATE VENDOR
const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID",
      });
    }

    const allowedFields = [
      "vendorCode",
      "name",
      "companyName",
      "mobile",
      "alternateMobile",
      "email",
      "gstin",
      "address",
      "city",
      "state",
      "pincode",
      "paymentTerms",
      "creditDays",
      "creditLimit",
      "notes",
    ];

    const updateData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (updateData.vendorCode !== undefined) {
      updateData.vendorCode = String(updateData.vendorCode)
        .trim()
        .toUpperCase();

      const duplicate = await Vendor.findOne({
        vendorCode: updateData.vendorCode,
        _id: { $ne: id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Vendor code already exists",
        });
      }
    }

    if (updateData.email !== undefined) {
      updateData.email = String(updateData.email).trim().toLowerCase();
    }

    if (updateData.gstin !== undefined) {
      updateData.gstin = String(updateData.gstin).trim().toUpperCase();
    }

    const vendor = await Vendor.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("createdBy", "name email");

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vendor updated successfully",
      data: vendor,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// DELETE VENDOR (SOFT DELETE)
const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID",
      });
    }

    const vendor = await Vendor.findByIdAndUpdate(
      id,
      { status: "inactive" },
      { new: true, runValidators: true },
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vendor deactivated successfully",
      data: vendor,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  addVendor,
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
};
