const mongoose = require("mongoose");
const VehicleUnit = require("../models/VehicleUnit");
const VehicleModel = require("../models/VehicleModel");

const allowedStatuses = ["available", "reserved", "sold", "damaged"];

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

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

    if (!vehicleModel || !isValidId(vehicleModel)) {
      return res.status(400).json({
        success: false,
        message: "Valid vehicle model ID is required",
      });
    }

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
    const { status, vehicleModel, search, page = 1, limit = 10 } = req.query;

    const filter = {};

    if (status) {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid stock status",
        });
      }

      filter.stockStatus = status;
    }

    if (vehicleModel) {
      if (!isValidId(vehicleModel)) {
        return res.status(400).json({
          success: false,
          message: "Invalid vehicle model ID",
        });
      }

      filter.vehicleModel = vehicleModel;
    }

    if (search && search.trim()) {
      const safeSearch = escapeRegex(search.trim());

      filter.$or = [
        { chassisNumber: { $regex: safeSearch, $options: "i" } },
        { engineNumber: { $regex: safeSearch, $options: "i" } },
        { color: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

    const skip = (currentPage - 1) * perPage;

    const [units, total] = await Promise.all([
      VehicleUnit.find(filter)
        .populate(
          "vehicleModel",
          "modelCode company modelName variant exShowroomPrice",
        )
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage),

      VehicleUnit.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: units.length,
      total,
      pagination: {
        currentPage,
        totalPages: Math.ceil(total / perPage),
        limit: perPage,
      },
      data: units,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET SINGLE VEHICLE UNIT
exports.getVehicleUnitById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle unit ID",
      });
    }

    const unit = await VehicleUnit.findById(id)
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
    const { modelId } = req.params;

    if (!isValidId(modelId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle model ID",
      });
    }

    const units = await VehicleUnit.find({
      vehicleModel: modelId,
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
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle unit ID",
      });
    }

    const allowedFields = [
      "chassisNumber",
      "engineNumber",
      "color",
      "manufacturingYear",
      "purchaseDate",
      "purchasePrice",
      "location",
      "notes",
    ];

    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
      });
    }

    const unit = await VehicleUnit.findById(id);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Vehicle unit not found",
      });
    }

    Object.assign(unit, updates);

    await unit.save();

    await unit.populate("vehicleModel", "modelCode company modelName variant");

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
    const { id } = req.params;
    const { stockStatus } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle unit ID",
      });
    }

    const allowedUpdateStatuses = ["damaged"];

    if (!allowedUpdateStatuses.includes(stockStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid stock status. Allowed: available, reserved, damaged",
      });
    }

    const unit = await VehicleUnit.findById(id);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Vehicle unit not found",
      });
    }

    if (["sold", "reserved"].includes(unit.stockStatus)) {
      return res.status(400).json({
        success: false,
        message: "Sold or reserved vehicle status cannot be changed manually",
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

// GET VEHICLE UNIT STOCK SUMMARY
exports.getVehicleUnitStockSummary = async (req, res) => {
  try {
    const [
      totalUnits,
      availableUnits,
      reservedUnits,
      soldUnits,
      damagedUnits,
      locationSummary,
    ] = await Promise.all([
      VehicleUnit.countDocuments(),
      VehicleUnit.countDocuments({ stockStatus: "available" }),
      VehicleUnit.countDocuments({ stockStatus: "reserved" }),
      VehicleUnit.countDocuments({ stockStatus: "sold" }),
      VehicleUnit.countDocuments({ stockStatus: "damaged" }),

      VehicleUnit.aggregate([
        {
          $group: {
            _id: "$location",
            totalUnits: { $sum: 1 },
            available: {
              $sum: {
                $cond: [{ $eq: ["$stockStatus", "available"] }, 1, 0],
              },
            },
            reserved: {
              $sum: {
                $cond: [{ $eq: ["$stockStatus", "reserved"] }, 1, 0],
              },
            },
            sold: {
              $sum: {
                $cond: [{ $eq: ["$stockStatus", "sold"] }, 1, 0],
              },
            },
            damaged: {
              $sum: {
                $cond: [{ $eq: ["$stockStatus", "damaged"] }, 1, 0],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            location: "$_id",
            totalUnits: 1,
            available: 1,
            reserved: 1,
            sold: 1,
            damaged: 1,
          },
        },
        { $sort: { location: 1 } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      message: "Vehicle stock summary fetched successfully",
      data: {
        totalUnits,
        availableUnits,
        reservedUnits,
        soldUnits,
        damagedUnits,
        locationSummary,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};
