const mongoose = require("mongoose");

const Purchase = require("../models/Purchase");
const Vendor = require("../models/Vendor");
const Product = require("../models/Product");

const roundAmount = (amount) =>
  Math.round((Number(amount) + Number.EPSILON) * 100) / 100;

const handleError = (res, error) => {
  console.error("Purchase Controller Error:", error);

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];

    return res.status(409).json({
      success: false,
      message: `${field || "Purchase field"} already exists`,
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

// BUILD PURCHASE ITEMS AND CALCULATE TOTALS
const buildPurchaseData = async (items, paidAmount = 0) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one purchase item is required");
  }

  const productIds = [];

  for (const item of items) {
    if (!mongoose.Types.ObjectId.isValid(item.product)) {
      throw new Error("Invalid product ID");
    }

    productIds.push(String(item.product));
  }

  const uniqueProductIds = [...new Set(productIds)];

  const products = await Product.find({
    _id: { $in: uniqueProductIds },
    status: "active",
  });

  if (products.length !== uniqueProductIds.length) {
    throw new Error("One or more products are invalid or inactive");
  }

  const productMap = new Map(
    products.map((product) => [String(product._id), product]),
  );

  let subTotal = 0;
  let totalDiscount = 0;
  let totalTaxableAmount = 0;
  let totalGST = 0;

  const purchaseItems = items.map((item) => {
    const product = productMap.get(String(item.product));

    const quantity = Number(item.quantity);

    const purchasePrice =
      item.purchasePrice !== undefined
        ? Number(item.purchasePrice)
        : Number(product.purchasePrice);

    const discount = item.discount !== undefined ? Number(item.discount) : 0;

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("Quantity must be greater than zero");
    }

    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
      throw new Error("Invalid purchase price");
    }

    if (!Number.isFinite(discount) || discount < 0) {
      throw new Error("Invalid item discount");
    }

    const grossAmount = roundAmount(quantity * purchasePrice);

    if (discount > grossAmount) {
      throw new Error("Discount cannot exceed item amount");
    }

    const taxableAmount = roundAmount(grossAmount - discount);

    const gstRate = Number(product.gstRate);
    const gstAmount = roundAmount((taxableAmount * gstRate) / 100);

    const totalAmount = roundAmount(taxableAmount + gstAmount);

    subTotal += grossAmount;
    totalDiscount += discount;
    totalTaxableAmount += taxableAmount;
    totalGST += gstAmount;

    return {
      product: product._id,
      productName: product.name,
      sku: product.sku,
      quantity,
      purchasePrice,
      discount,
      gstRate,
      taxableAmount,
      gstAmount,
      totalAmount,
    };
  });

  subTotal = roundAmount(subTotal);
  totalDiscount = roundAmount(totalDiscount);
  totalTaxableAmount = roundAmount(totalTaxableAmount);
  totalGST = roundAmount(totalGST);

  const grandTotal = roundAmount(totalTaxableAmount + totalGST);
  const paid = Number(paidAmount);

  if (!Number.isFinite(paid) || paid < 0) {
    throw new Error("Invalid paid amount");
  }

  if (paid > grandTotal) {
    throw new Error("Paid amount cannot exceed grand total");
  }

  const balanceAmount = roundAmount(grandTotal - paid);

  let paymentStatus = "unpaid";

  if (paid > 0 && balanceAmount > 0) {
    paymentStatus = "partial";
  } else if (balanceAmount === 0) {
    paymentStatus = "paid";
  }

  return {
    items: purchaseItems,
    subTotal,
    totalDiscount,
    totalTaxableAmount,
    totalGST,
    grandTotal,
    paidAmount: paid,
    balanceAmount,
    paymentStatus,
  };
};

// VALIDATE VENDOR
const validateVendor = async (vendorId) => {
  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    throw new Error("Invalid vendor ID");
  }

  const vendor = await Vendor.findOne({
    _id: vendorId,
    status: "active",
  });

  if (!vendor) {
    throw new Error("Vendor not found or inactive");
  }

  return vendor;
};

// ADD PURCHASE (DRAFT)
const addPurchase = async (req, res) => {
  try {
    const {
      purchaseNumber,
      vendor,
      vendorInvoiceNumber,
      invoiceDate,
      items,
      paidAmount,
      paymentMethod,
      notes,
    } = req.body;

    if (!purchaseNumber || !vendor || !invoiceDate) {
      return res.status(400).json({
        success: false,
        message: "Purchase number, vendor and invoice date are required",
      });
    }

    await validateVendor(vendor);

    const parsedDate = new Date(invoiceDate);

    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice date",
      });
    }

    const purchaseData = await buildPurchaseData(items, paidAmount);

    const purchase = await Purchase.create({
      purchaseNumber,
      vendor,
      vendorInvoiceNumber,
      invoiceDate: parsedDate,
      ...purchaseData,
      paymentMethod,
      notes,
      purchaseStatus: "draft",
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Purchase draft created successfully",
      data: purchase,
    });
  } catch (error) {
    if (
      error.message.startsWith("Invalid") ||
      error.message.includes("required") ||
      error.message.includes("greater") ||
      error.message.includes("exceed") ||
      error.message.includes("discount") ||
      error.message.includes("inactive") ||
      error.message.includes("amount")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return handleError(res, error);
  }
};

// GET ALL PURCHASES
const getPurchases = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100,
    );

    const skip = (page - 1) * limit;
    const filter = {};

    if (req.query.purchaseStatus) {
      filter.purchaseStatus = req.query.purchaseStatus;
    }

    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }

    if (req.query.vendor) {
      if (!mongoose.Types.ObjectId.isValid(req.query.vendor)) {
        return res.status(400).json({
          success: false,
          message: "Invalid vendor ID",
        });
      }

      filter.vendor = req.query.vendor;
    }

    const [purchases, total] = await Promise.all([
      Purchase.find(filter)
        .populate("vendor", "vendorCode name mobile")
        .populate("items.product", "sku name")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Purchase.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: purchases,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET PURCHASE BY ID
const getPurchaseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase ID",
      });
    }

    const purchase = await Purchase.findById(id)
      .populate("vendor", "vendorCode name mobile email")
      .populate("items.product", "sku name purchasePrice gstRate")
      .populate("createdBy", "name email");

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: purchase,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// UPDATE DRAFT PURCHASE
const updatePurchase = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase ID",
      });
    }

    const purchase = await Purchase.findById(id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    if (purchase.purchaseStatus !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Only draft purchases can be updated",
      });
    }

    const vendorId = req.body.vendor || purchase.vendor;

    await validateVendor(vendorId);

    const items = req.body.items || purchase.items;
    const paidAmount =
      req.body.paidAmount !== undefined
        ? req.body.paidAmount
        : purchase.paidAmount;

    const purchaseData = await buildPurchaseData(items, paidAmount);

    const updateData = {
      ...purchaseData,
      vendor: vendorId,
    };

    if (req.body.vendorInvoiceNumber !== undefined) {
      updateData.vendorInvoiceNumber = req.body.vendorInvoiceNumber;
    }

    if (req.body.invoiceDate !== undefined) {
      const parsedDate = new Date(req.body.invoiceDate);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid invoice date",
        });
      }

      updateData.invoiceDate = parsedDate;
    }

    if (req.body.paymentMethod !== undefined) {
      updateData.paymentMethod = req.body.paymentMethod;
    }

    if (req.body.notes !== undefined) {
      updateData.notes = req.body.notes;
    }

    const updatedPurchase = await Purchase.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("vendor", "vendorCode name mobile")
      .populate("items.product", "sku name")
      .populate("createdBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Purchase draft updated successfully",
      data: updatedPurchase,
    });
  } catch (error) {
    if (
      error.message.startsWith("Invalid") ||
      error.message.includes("required") ||
      error.message.includes("greater") ||
      error.message.includes("exceed") ||
      error.message.includes("discount") ||
      error.message.includes("inactive") ||
      error.message.includes("amount")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return handleError(res, error);
  }
};

// CANCEL PURCHASE (SOFT DELETE)
const deletePurchase = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase ID",
      });
    }

    const purchase = await Purchase.findById(id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    if (purchase.purchaseStatus !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Only draft purchases can be cancelled",
      });
    }

    purchase.purchaseStatus = "cancelled";
    await purchase.save();

    return res.status(200).json({
      success: true,
      message: "Purchase cancelled successfully",
      data: purchase,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  addPurchase,
  getPurchases,
  getPurchaseById,
  updatePurchase,
  deletePurchase,
};
