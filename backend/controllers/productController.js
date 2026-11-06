const mongoose = require("mongoose");
const Product = require("../models/Product");

const handleError = (res, error) => {
  console.error("Product Controller Error:", error);

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Product SKU already exists",
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

// ADD PRODUCT
const addProduct = async (req, res) => {
  try {
    const {
      sku,
      name,
      category,
      brand,
      description,
      unit,
      hsnCode,
      purchasePrice,
      sellingPrice,
      gstRate,
      openingStock,
      reorderLevel,
      notes,
    } = req.body;

    if (
      !sku ||
      !name ||
      !category ||
      purchasePrice === undefined ||
      sellingPrice === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "SKU, name, category, purchasePrice and sellingPrice are required",
      });
    }

    const normalizedSku = String(sku).trim().toUpperCase();

    const existingProduct = await Product.findOne({ sku: normalizedSku });

    if (existingProduct) {
      return res.status(409).json({
        success: false,
        message: "Product SKU already exists",
      });
    }

    const product = await Product.create({
      sku: normalizedSku,
      name,
      category,
      brand,
      description,
      unit,
      hsnCode,
      purchasePrice,
      sellingPrice,
      gstRate,
      openingStock,
      reorderLevel,
      notes,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET ALL PRODUCTS
const getProducts = async (req, res) => {
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

    if (req.query.category) {
      filter.category = {
        $regex: String(req.query.category),
        $options: "i",
      };
    }

    if (req.query.search) {
      const search = String(req.query.search).trim();

      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: products,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET PRODUCT BY ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(id).populate(
      "createdBy",
      "name email",
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// UPDATE PRODUCT
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const allowedFields = [
      "sku",
      "name",
      "category",
      "brand",
      "description",
      "unit",
      "hsnCode",
      "purchasePrice",
      "sellingPrice",
      "gstRate",
      "reorderLevel",
      "notes",
    ];

    const updateData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (updateData.sku !== undefined) {
      updateData.sku = String(updateData.sku).trim().toUpperCase();

      const duplicate = await Product.findOne({
        sku: updateData.sku,
        _id: { $ne: id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Product SKU already exists",
        });
      }
    }

    const product = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("createdBy", "name email");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// DELETE PRODUCT (SOFT DELETE)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { status: "inactive" },
      { new: true, runValidators: true },
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deactivated successfully",
      data: product,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  addProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
