const mongoose = require("mongoose");
const Vehicle = require("../models/Vehicle");
const Customer = require("../models/Customer");

// Allowed fields for vehicle creation/update
const allowedFields = [
  "registrationNumber",
  "company",
  "model",
  "variant",
  "fuelType",
  "chassisNumber",
  "engineNumber",
  "color",
  "purchaseDate",
  "currentKM",
  "insuranceExpiry",
  "status",
  "notes",
];

// Normalize optional unique fields
const normalizeVehicleData = (data) => {
  const normalized = { ...data };

  if (normalized.registrationNumber !== undefined) {
    normalized.registrationNumber = normalized.registrationNumber
      .trim()
      .toUpperCase();
  }

  if (normalized.chassisNumber !== undefined) {
    normalized.chassisNumber =
      normalized.chassisNumber.trim().toUpperCase() || undefined;
  }

  if (normalized.engineNumber !== undefined) {
    normalized.engineNumber =
      normalized.engineNumber.trim().toUpperCase() || undefined;
  }

  return normalized;
};

// Escape special regex characters
const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Handle duplicate key errors
const handleError = (res, error) => {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];

    return res.status(409).json({
      success: false,
      message: `${field || "Vehicle field"} already exists`,
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID or field value",
    });
  }

  console.error("Vehicle Controller Error:", error);

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

// ======================================
// ADD VEHICLE
// POST /api/vehicles
// ======================================

const addVehicle = async (req, res) => {
  try {
    const { customer } = req.body;

    if (!customer || !mongoose.isValidObjectId(customer)) {
      return res.status(400).json({
        success: false,
        message: "Valid customer ID is required",
      });
    }

    const customerExists = await Customer.findOne({
      _id: customer,
      status: "active",
    });

    if (!customerExists) {
      return res.status(404).json({
        success: false,
        message: "Active customer not found",
      });
    }

    const vehicleData = normalizeVehicleData(req.body);

    const payload = {};

    allowedFields.forEach((field) => {
      if (vehicleData[field] !== undefined) {
        payload[field] = vehicleData[field];
      }
    });

    payload.customer = customer;
    payload.createdBy = req.user._id;

    const vehicle = await Vehicle.create(payload);

    const populatedVehicle = await Vehicle.findById(vehicle._id)
      .populate("customer")
      .populate("createdBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Vehicle added successfully",
      data: populatedVehicle,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// ======================================
// GET ALL VEHICLES
// GET /api/vehicles
// ======================================

const getVehicles = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100,
    );

    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.status) {
      if (!["active", "inactive"].includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status filter",
        });
      }

      filter.status = req.query.status;
    }

    if (req.query.customer) {
      if (!mongoose.isValidObjectId(req.query.customer)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID",
        });
      }

      filter.customer = req.query.customer;
    }

    if (req.query.fuelType) {
      filter.fuelType = req.query.fuelType.toLowerCase();
    }

    if (req.query.company) {
      filter.company = {
        $regex: escapeRegex(req.query.company.trim()),
        $options: "i",
      };
    }

    if (req.query.search) {
      const search = escapeRegex(req.query.search.trim());

      filter.$or = [
        { registrationNumber: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
        { chassisNumber: { $regex: search, $options: "i" } },
        { engineNumber: { $regex: search, $options: "i" } },
      ];
    }

    const [vehicles, total] = await Promise.all([
      Vehicle.find(filter)
        .populate("customer", "customerCode name mobile")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Vehicle.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: vehicles,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// ======================================
// GET VEHICLE BY ID
// GET /api/vehicles/:id
// ======================================

const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID",
      });
    }

    const vehicle = await Vehicle.findById(id)
      .populate("customer")
      .populate("createdBy", "name email");

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// ======================================
// UPDATE VEHICLE
// PUT /api/vehicles/:id
// ======================================

const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID",
      });
    }

    const vehicle = await Vehicle.findById(id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    if (vehicle.status === "inactive") {
      return res.status(400).json({
        success: false,
        message: "Inactive vehicle cannot be updated",
      });
    }

    const updateData = normalizeVehicleData(req.body);

    const payload = {};

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        payload[field] = updateData[field];
      }
    });

    // Validate customer if it is being changed
    if (req.body.customer !== undefined) {
      if (!mongoose.isValidObjectId(req.body.customer)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID",
        });
      }

      const customerExists = await Customer.findOne({
        _id: req.body.customer,
        status: "active",
      });

      if (!customerExists) {
        return res.status(404).json({
          success: false,
          message: "Active customer not found",
        });
      }

      payload.customer = req.body.customer;
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      id,
      { $set: payload },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate("customer")
      .populate("createdBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Vehicle updated successfully",
      data: updatedVehicle,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// ======================================
// DEACTIVATE VEHICLE
// DELETE /api/vehicles/:id
// ======================================

const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID",
      });
    }

    const vehicle = await Vehicle.findById(id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    if (vehicle.status === "inactive") {
      return res.status(400).json({
        success: false,
        message: "Vehicle is already inactive",
      });
    }

    vehicle.status = "inactive";
    await vehicle.save();

    return res.status(200).json({
      success: true,
      message: "Vehicle deactivated successfully",
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// ======================================
// GET VEHICLES BY CUSTOMER
// GET /api/vehicles/customer/:customerId
// ======================================

const getVehiclesByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!mongoose.isValidObjectId(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const vehicles = await Vehicle.find({
      customer: customerId,
      status: "active",
    })
      .populate("customer", "customerCode name mobile")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      total: vehicles.length,
      customer: {
        _id: customer._id,
        customerCode: customer.customerCode,
        name: customer.name,
        mobile: customer.mobile,
      },
      data: vehicles,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  addVehicle,
  getVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  getVehiclesByCustomer,
};
