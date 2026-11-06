const VehicleModel = require("../models/VehicleModel");

const handleError = (res, error) => {
  console.error("Vehicle Model Error:", error);

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Vehicle model code already exists",
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

// CREATE VEHICLE MODEL
exports.createVehicleModel = async (req, res) => {
  try {
    const vehicleModel = await VehicleModel.create({
      ...req.body,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Vehicle model created successfully",
      data: vehicleModel,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET ALL VEHICLE MODELS
exports.getVehicleModels = async (req, res) => {
  try {
    const { status, search } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { modelCode: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
        { modelName: { $regex: search, $options: "i" } },
      ];
    }

    const vehicleModels = await VehicleModel.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: vehicleModels.length,
      data: vehicleModels,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET SINGLE VEHICLE MODEL
exports.getVehicleModelById = async (req, res) => {
  try {
    const vehicleModel = await VehicleModel.findById(req.params.id).populate(
      "createdBy",
      "name email",
    );

    if (!vehicleModel) {
      return res.status(404).json({
        success: false,
        message: "Vehicle model not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: vehicleModel,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// UPDATE VEHICLE MODEL
exports.updateVehicleModel = async (req, res) => {
  try {
    const updates = { ...req.body };

    // Do not allow changing system-managed fields
    delete updates.createdBy;
    delete updates._id;
    delete updates.__v;

    const vehicleModel = await VehicleModel.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!vehicleModel) {
      return res.status(404).json({
        success: false,
        message: "Vehicle model not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vehicle model updated successfully",
      data: vehicleModel,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// DEACTIVATE VEHICLE MODEL
exports.deleteVehicleModel = async (req, res) => {
  try {
    const vehicleModel = await VehicleModel.findByIdAndUpdate(
      req.params.id,
      { status: "inactive" },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!vehicleModel) {
      return res.status(404).json({
        success: false,
        message: "Vehicle model not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vehicle model deactivated successfully",
      data: vehicleModel,
    });
  } catch (error) {
    return handleError(res, error);
  }
};
