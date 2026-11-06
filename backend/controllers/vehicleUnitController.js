const VehicleUnit = require("../models/VehicleUnit");
const VehicleModel = require("../models/VehicleModel");

const handleError = (res, error) => {
  console.error("Vehicle Unit Error:", error);

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];

    return res.status(409).json({
      success: false,
      message: `${field || "Vehicle"} already exists`,
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

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

// CREATE VEHICLE UNIT
exports.createVehicleUnit = async (req, res) => {
  try {
    const {
      vehicleModel,
      chassisNumber,
      engineNumber,
      color,
      manufacturingYear,
      purchaseDate,
      purchasePrice,
      location,
      notes,
    } = req.body;

    const model = await VehicleModel.findById(vehicleModel);

    if (!model || model.status !== "active") {
      return res.status(404).json({
        success: false,
        message: "Active vehicle model not found",
      });
    }

    const unit = await VehicleUnit.create({
      vehicleModel,
      chassisNumber,
      engineNumber,
      color,
      manufacturingYear,
      purchaseDate,
      purchasePrice,
      location,
      notes,
      createdBy: req.user._id,
    });

    await unit.populate("vehicleModel", "modelCode company modelName variant");

    return res.status(201).json({
      success: true,
      message: "Vehicle unit added to stock successfully",
      data: unit,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET ALL VEHICLE UNITS
exports.getVehicleUnits = async (req, res) => {
  try {
    const { status, vehicleModel, search } = req.query;

    const filter = {};

    if (status) {
      filter.stockStatus = status;
    }

    if (vehicleModel) {
      filter.vehicleModel = vehicleModel;
    }

    if (search) {
      filter.$or = [
        { chassisNumber: { $regex: search, $options: "i" } },
        { engineNumber: { $regex: search, $options: "i" } },
        { color: { $regex: search, $options: "i" } },
      ];
    }

    const units = await VehicleUnit.find(filter)
      .populate(
        "vehicleModel",
        "modelCode company modelName variant exShowroomPrice",
      )
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: units.length,
      data: units,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET SINGLE VEHICLE UNIT
exports.getVehicleUnitById = async (req, res) => {
  try {
    const unit = await VehicleUnit.findById(req.params.id)
      .populate(
        "vehicleModel",
        "modelCode company modelName variant exShowroomPrice",
      )
      .populate("createdBy", "name email");

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Vehicle unit not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: unit,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET UNITS BY VEHICLE MODEL
exports.getUnitsByVehicleModel = async (req, res) => {
  try {
    const units = await VehicleUnit.find({
      vehicleModel: req.params.modelId,
    })
      .populate(
        "vehicleModel",
        "modelCode company modelName variant exShowroomPrice",
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: units.length,
      data: units,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// UPDATE VEHICLE UNIT
exports.updateVehicleUnit = async (req, res) => {
  try {
    const updates = { ...req.body };

    delete updates.createdBy;
    delete updates._id;
    delete updates.__v;
    delete updates.stockStatus;
    delete updates.vehicleModel;

    const unit = await VehicleUnit.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate("vehicleModel", "modelCode company modelName variant");

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Vehicle unit not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vehicle unit updated successfully",
      data: unit,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// UPDATE VEHICLE UNIT STOCK STATUS
exports.updateVehicleUnitStatus = async (req, res) => {
  try {
    const allowedStatuses = ["available", "reserved", "damaged"];

    const { stockStatus } = req.body;

    if (!allowedStatuses.includes(stockStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid stock status. Allowed: available, reserved, damaged",
      });
    }

    const unit = await VehicleUnit.findById(req.params.id);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Vehicle unit not found",
      });
    }

    if (unit.stockStatus === "sold") {
      return res.status(400).json({
        success: false,
        message: "Sold vehicle status cannot be changed",
      });
    }

    unit.stockStatus = stockStatus;
    await unit.save();

    return res.status(200).json({
      success: true,
      message: "Vehicle unit stock status updated successfully",
      data: unit,
    });
  } catch (error) {
    return handleError(res, error);
  }
};
