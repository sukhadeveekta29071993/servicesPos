const mongoose = require("mongoose");

const Product = require("../models/Product");
const Inventory = require("../models/Inventory");
const StockMovement = require("../models/StockMovement");
const JobCard = require("../models/JobCard");
const ServicePartConsumption = require("../models/ServicePartConsumption");

const handleError = (res, error) => {
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate service part consumption record",
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

// CONSUME PARTS FOR JOB CARD
exports.consumeServicePart = async (req, res) => {
  let inventoryBeforeUpdate = null;
  let updatedInventory = null;
  let createdMovement = null;
  let createdConsumption = null;

  try {
    const {
      jobCardId,
      productId,
      quantity,
      discount = 0,
      notes = "",
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(jobCardId) ||
      !mongoose.Types.ObjectId.isValid(productId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid job card ID and product ID are required",
      });
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than zero",
      });
    }

    if (!Number.isFinite(discount) || discount < 0) {
      return res.status(400).json({
        success: false,
        message: "Discount cannot be negative",
      });
    }

    const jobCard = await JobCard.findById(jobCardId);

    if (!jobCard) {
      return res.status(404).json({
        success: false,
        message: "Job card not found",
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

    const inventory = await Inventory.findOne({
      product: productId,
      status: "active",
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Active inventory not found for this product",
      });
    }

    if (inventory.availableStock < quantity) {
      return res.status(400).json({
        success: false,
        message: "Insufficient available stock",
        availableStock: inventory.availableStock,
        requestedQuantity: quantity,
      });
    }

    const unitPrice = Number(product.sellingPrice);

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product selling price",
      });
    }

    const gstRate = Number(product.gstRate || 0);

    if (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid product GST rate",
      });
    }

    const grossAmount = unitPrice * quantity;

    if (discount > grossAmount) {
      return res.status(400).json({
        success: false,
        message: "Discount cannot exceed gross amount",
      });
    }

    const taxableAmount = Number((grossAmount - discount).toFixed(2));

    const gstAmount = Number(((taxableAmount * gstRate) / 100).toFixed(2));

    const totalAmount = Number((taxableAmount + gstAmount).toFixed(2));

    const beforeStock = inventory.currentStock;
    const afterStock = beforeStock - quantity;

    inventoryBeforeUpdate = {
      _id: inventory._id,
      currentStock: inventory.currentStock,
      availableStock: inventory.availableStock,
      lastStockMovement: inventory.lastStockMovement,
      reservedStock: inventory.reservedStock,
    };

    // ATOMIC STOCK DEDUCTION
    updatedInventory = await Inventory.findOneAndUpdate(
      {
        _id: inventory._id,
        currentStock: beforeStock,
        availableStock: { $gte: quantity },
      },
      {
        $set: {
          currentStock: afterStock,
          availableStock: afterStock - inventory.reservedStock,
          lastStockMovement: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedInventory) {
      return res.status(409).json({
        success: false,
        message: "Stock changed concurrently. Please retry.",
      });
    }

    try {
      // CREATE STOCK MOVEMENT
      createdMovement = await StockMovement.create({
        product: productId,
        inventory: inventory._id,
        movementType: "service",
        direction: "out",
        quantity,
        beforeStock,
        afterStock,
        referenceType: "jobCard",
        referenceId: jobCard._id,
        referenceNumber: jobCard.jobCardNumber,
        notes: notes || "Parts consumed for service job",
        createdBy: req.user._id,
      });

      // CREATE SERVICE PART CONSUMPTION
      createdConsumption = await ServicePartConsumption.create({
        jobCard: jobCard._id,
        product: productId,
        inventory: inventory._id,
        quantity,
        unitPrice,
        discount,
        gstRate,
        taxableAmount,
        gstAmount,
        totalAmount,
        stockMovement: createdMovement._id,
        notes,
        createdBy: req.user._id,
      });

      return res.status(201).json({
        success: true,
        message: "Service part consumed successfully",
        data: {
          consumption: createdConsumption,
          stockMovement: createdMovement,
          inventory: updatedInventory,
        },
      });
    } catch (operationError) {
      // ROLLBACK CREATED RECORDS
      if (createdConsumption) {
        await ServicePartConsumption.deleteOne({
          _id: createdConsumption._id,
        });
      }

      if (createdMovement) {
        await StockMovement.deleteOne({
          _id: createdMovement._id,
        });
      }

      // RESTORE INVENTORY
      await Inventory.findOneAndUpdate(
        {
          _id: inventory._id,
          currentStock: afterStock,
        },
        {
          $set: {
            currentStock: inventoryBeforeUpdate.currentStock,
            availableStock: inventoryBeforeUpdate.availableStock,
            lastStockMovement: inventoryBeforeUpdate.lastStockMovement,
          },
        },
        {
          runValidators: true,
        },
      );

      throw operationError;
    }
  } catch (error) {
    return handleError(res, error);
  }
};

// GET ALL SERVICE PART CONSUMPTIONS
exports.getAllServicePartConsumptions = async (req, res) => {
  try {
    const consumptions = await ServicePartConsumption.find()
      .populate("jobCard")
      .populate("product", "sku name sellingPrice")
      .populate("inventory", "currentStock availableStock")
      .populate("stockMovement")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: consumptions.length,
      data: consumptions,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET SERVICE PART CONSUMPTIONS BY JOB CARD
exports.getConsumptionsByJobCard = async (req, res) => {
  try {
    const { jobCardId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(jobCardId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job card ID",
      });
    }

    const consumptions = await ServicePartConsumption.find({
      jobCard: jobCardId,
    })
      .populate("jobCard")
      .populate("product", "sku name sellingPrice")
      .populate("inventory", "currentStock availableStock")
      .populate("stockMovement")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: consumptions.length,
      data: consumptions,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET SINGLE SERVICE PART CONSUMPTION
exports.getServicePartConsumptionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid consumption ID",
      });
    }

    const consumption = await ServicePartConsumption.findById(id)
      .populate("jobCard")
      .populate("product", "sku name sellingPrice")
      .populate("inventory", "currentStock availableStock")
      .populate("stockMovement")
      .populate("createdBy", "name email");

    if (!consumption) {
      return res.status(404).json({
        success: false,
        message: "Service part consumption not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: consumption,
    });
  } catch (error) {
    return handleError(res, error);
  }
};
