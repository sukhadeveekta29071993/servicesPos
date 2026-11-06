const mongoose = require("mongoose");
const Product = require("../models/Product");
const Inventory = require("../models/Inventory");
const StockMovement = require("../models/StockMovement");

const handleError = (res, error) => {
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Inventory already exists for this product",
    });
  }

  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: error.message || "Internal server error",
  });
};

// CREATE INVENTORY FOR PRODUCT
exports.createInventory = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Valid product ID is required",
      });
    }

    const product = await Product.findOne({
      _id: productId,
      status: "active",
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Active product not found",
      });
    }

    const existingInventory = await Inventory.findOne({
      product: productId,
    });

    if (existingInventory) {
      return res.status(409).json({
        success: false,
        message: "Inventory already exists for this product",
        data: existingInventory,
      });
    }

    const openingStock = Number(product.openingStock || 0);

    const inventory = await Inventory.create({
      product: productId,
      currentStock: openingStock,
      reservedStock: 0,
      availableStock: openingStock,
    });

    if (openingStock > 0) {
      try {
        await StockMovement.create({
          product: productId,
          inventory: inventory._id,
          movementType: "opening",
          direction: "in",
          quantity: openingStock,
          beforeStock: 0,
          afterStock: openingStock,
          referenceType: "opening",
          referenceNumber: `OPEN-${product.sku}`,
          notes: "Initial opening stock",
          createdBy: req.user._id,
        });
      } catch (movementError) {
        await Inventory.deleteOne({ _id: inventory._id });
        throw movementError;
      }
    }

    return res.status(201).json({
      success: true,
      message: "Inventory created successfully",
      data: inventory,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET ALL INVENTORY
exports.getAllInventory = async (req, res) => {
  try {
    const inventory = await Inventory.find()
      .populate("product", "sku name category brand unit")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: inventory.length,
      data: inventory,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET INVENTORY BY ID
exports.getInventoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inventory ID",
      });
    }

    const inventory = await Inventory.findById(id).populate(
      "product",
      "sku name category brand unit",
    );

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET INVENTORY BY PRODUCT ID
exports.getInventoryByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const inventory = await Inventory.findOne({
      product: productId,
    }).populate("product", "sku name category brand unit");

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found for this product",
      });
    }

    return res.status(200).json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// STOCK MOVEMENT HISTORY
exports.getStockMovements = async (req, res) => {
  try {
    const movements = await StockMovement.find()
      .populate("product", "sku name")
      .populate("inventory", "currentStock availableStock")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: movements.length,
      data: movements,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// STOCK MOVEMENT HISTORY BY PRODUCT
exports.getStockMovementsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const movements = await StockMovement.find({
      product: productId,
    })
      .populate("product", "sku name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: movements.length,
      data: movements,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// STOCK IN / STOCK OUT
exports.updateStock = async (req, res) => {
  try {
    const {
      productId,
      movementType,
      direction,
      quantity,
      referenceType,
      referenceId,
      referenceNumber,
      notes,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Valid product ID is required",
      });
    }

    if (
      !["purchase", "sale", "service", "adjustment", "return"].includes(
        movementType,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid movement type",
      });
    }

    if (!["in", "out"].includes(direction)) {
      return res.status(400).json({
        success: false,
        message: "Direction must be in or out",
      });
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than zero",
      });
    }

    const product = await Product.findOne({
      _id: productId,
      status: "active",
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Active product not found",
      });
    }

    const inventory = await Inventory.findOne({ product: productId });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found. Create inventory first.",
      });
    }

    const beforeStock = inventory.currentStock;
    const afterStock =
      direction === "in" ? beforeStock + quantity : beforeStock - quantity;

    if (afterStock < 0) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock",
        availableStock: inventory.availableStock,
      });
    }

    if (afterStock < inventory.reservedStock) {
      return res.status(400).json({
        success: false,
        message: "Stock cannot be less than reserved stock",
      });
    }

    const updatedInventory = await Inventory.findOneAndUpdate(
      {
        _id: inventory._id,
        currentStock: beforeStock,
      },
      {
        $set: {
          currentStock: afterStock,
          availableStock: afterStock - inventory.reservedStock,
          lastStockMovement: new Date(),
        },
      },
      { new: true, runValidators: true },
    );

    if (!updatedInventory) {
      return res.status(409).json({
        success: false,
        message: "Stock changed concurrently. Please retry.",
      });
    }

    try {
      const movement = await StockMovement.create({
        product: productId,
        inventory: inventory._id,
        movementType,
        direction,
        quantity,
        beforeStock,
        afterStock,
        referenceType: referenceType || "manual",
        referenceId: referenceId || null,
        referenceNumber: referenceNumber || null,
        notes: notes || "",
        createdBy: req.user._id,
      });

      return res.status(200).json({
        success: true,
        message: "Stock updated successfully",
        data: {
          inventory: updatedInventory,
          movement,
        },
      });
    } catch (movementError) {
      await Inventory.findOneAndUpdate(
        {
          _id: inventory._id,
          currentStock: afterStock,
        },
        {
          $set: {
            currentStock: beforeStock,
            availableStock: beforeStock - inventory.reservedStock,
            lastStockMovement: inventory.lastStockMovement,
          },
        },
      );

      throw movementError;
    }
  } catch (error) {
    return handleError(res, error);
  }
};
