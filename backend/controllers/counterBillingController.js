const mongoose = require("mongoose");

const Product = require("../models/Product");
const Inventory = require("../models/Inventory");
const StockMovement = require("../models/StockMovement");
const CounterInvoice = require("../models/CounterInvoice");
const CounterPayment = require("../models/CounterPayment");

const handleError = (res, error) => {
  console.error("Counter Billing Error:", error);

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate invoice or payment record",
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
    error: error.message,
  });
};

// 1. Create Counter Invoice
exports.createCounterInvoice = async (req, res) => {
  const stockUpdates = [];
  const createdMovements = [];

  try {
    const { customer, items, notes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one product is required",
      });
    }

    if (customer && !mongoose.isValidObjectId(customer)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const invoiceItems = [];

    let subTotal = 0;
    let totalDiscount = 0;
    let taxableAmount = 0;
    let gstAmount = 0;

    // Validate and calculate invoice items
    for (const item of items) {
      const { product, quantity, discount = 0 } = item;

      if (!mongoose.isValidObjectId(product)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID",
        });
      }

      const qty = Number(quantity);
      const itemDiscount = Number(discount);

      if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be greater than zero",
        });
      }

      if (!Number.isFinite(itemDiscount) || itemDiscount < 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid discount",
        });
      }

      const productData = await Product.findOne({
        _id: product,
        status: "active",
      });

      if (!productData) {
        return res.status(404).json({
          success: false,
          message: "Product not found or inactive",
        });
      }

      const unitPrice = productData.sellingPrice;
      const grossAmount = qty * unitPrice;

      if (itemDiscount > grossAmount) {
        return res.status(400).json({
          success: false,
          message: `Discount cannot exceed amount for ${productData.name}`,
        });
      }

      const itemTaxableAmount = grossAmount - itemDiscount;
      const gstRate = productData.gstRate || 0;
      const itemGstAmount = (itemTaxableAmount * gstRate) / 100;

      const totalAmount = itemTaxableAmount + itemGstAmount;

      subTotal += grossAmount;
      totalDiscount += itemDiscount;
      taxableAmount += itemTaxableAmount;
      gstAmount += itemGstAmount;

      invoiceItems.push({
        product: productData._id,
        description: productData.name,
        quantity: qty,
        unitPrice,
        discount: itemDiscount,
        gstRate,
        taxableAmount: itemTaxableAmount,
        gstAmount: itemGstAmount,
        totalAmount,
      });
    }

    const grandTotal = taxableAmount + gstAmount;

    // Create draft invoice first
    const invoice = await CounterInvoice.create({
      invoiceNumber: `CINV-${Date.now()}`,
      customer: customer || null,
      items: invoiceItems,
      subTotal,
      discount: totalDiscount,
      taxableAmount,
      gstAmount,
      grandTotal,
      paidAmount: 0,
      balanceAmount: grandTotal,
      paymentStatus: "unpaid",
      invoiceStatus: "draft",
      notes: notes || "",
      createdBy: req.user._id,
    });

    // Deduct stock product-wise
    for (const item of invoiceItems) {
      const inventory = await Inventory.findOne({
        product: item.product,
        status: "active",
      });

      if (!inventory) {
        throw new Error(
          `Active inventory not found for product ${item.description}`,
        );
      }

      const beforeStock = inventory.currentStock;
      const afterStock = beforeStock - item.quantity;

      if (inventory.availableStock < item.quantity) {
        throw new Error(`Insufficient stock for ${item.description}`);
      }

      const updatedInventory = await Inventory.findOneAndUpdate(
        {
          _id: inventory._id,
          currentStock: beforeStock,
          availableStock: { $gte: item.quantity },
        },
        {
          $inc: {
            currentStock: -item.quantity,
            availableStock: -item.quantity,
          },
          $set: {
            lastStockMovement: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );

      if (!updatedInventory) {
        throw new Error(
          `Stock changed during billing for ${item.description}. Please retry`,
        );
      }

      stockUpdates.push({
        inventoryId: inventory._id,
        quantity: item.quantity,
      });

      const movement = await StockMovement.create({
        product: item.product,
        inventory: inventory._id,
        movementType: "sale",
        direction: "out",
        quantity: item.quantity,
        beforeStock,
        afterStock,
        referenceType: "counterSale",
        referenceId: invoice._id,
        referenceNumber: invoice.invoiceNumber,
        sourceKey: `counterSale-${invoice._id}-${item.product}`,
        notes: "Counter sale stock deduction",
        createdBy: req.user._id,
      });

      createdMovements.push(movement._id);
    }

    // Issue invoice after successful stock deduction
    invoice.invoiceStatus = "issued";
    await invoice.save();

    return res.status(201).json({
      success: true,
      message: "Counter invoice created successfully",
      data: invoice,
    });
  } catch (error) {
    // Roll back stock movements
    for (const movementId of createdMovements) {
      await StockMovement.findByIdAndDelete(movementId).catch(() => {});
    }

    for (const update of stockUpdates.reverse()) {
      await Inventory.findByIdAndUpdate(update.inventoryId, {
        $inc: {
          currentStock: update.quantity,
          availableStock: update.quantity,
        },
        $set: {
          lastStockMovement: new Date(),
        },
      }).catch(() => {});
    }

    return handleError(res, error);
  }
};

// 2. Get All Counter Invoices
exports.getAllCounterInvoices = async (req, res) => {
  try {
    const invoices = await CounterInvoice.find()
      .populate("customer")
      .populate("items.product")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 3. Get Counter Invoice By ID
exports.getCounterInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID",
      });
    }

    const invoice = await CounterInvoice.findById(id)
      .populate("customer")
      .populate("items.product")
      .populate("createdBy", "name email");

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Counter invoice not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 4. Add Counter Payment
exports.addCounterPayment = async (req, res) => {
  try {
    const {
      counterInvoiceId,
      amount,
      paymentMethod,
      transactionReference,
      paymentDate,
      notes,
    } = req.body;

    if (!mongoose.isValidObjectId(counterInvoiceId)) {
      return res.status(400).json({
        success: false,
        message: "Valid counter invoice ID is required",
      });
    }

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid payment amount is required",
      });
    }

    const invoice = await CounterInvoice.findById(counterInvoiceId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Counter invoice not found",
      });
    }

    if (invoice.invoiceStatus !== "issued") {
      return res.status(400).json({
        success: false,
        message: "Payment is allowed only for issued invoices",
      });
    }

    if (paymentAmount > invoice.balanceAmount) {
      return res.status(400).json({
        success: false,
        message: "Payment cannot exceed invoice balance",
      });
    }

    const payment = await CounterPayment.create({
      paymentNumber: `CPAY-${Date.now()}`,
      counterInvoice: invoice._id,
      amount: paymentAmount,
      paymentMethod,
      transactionReference: transactionReference || "",
      paymentDate: paymentDate || Date.now(),
      paymentStatus: "completed",
      notes: notes || "",
      receivedBy: req.user._id,
    });

    const updatedInvoice = await CounterInvoice.findOneAndUpdate(
      {
        _id: invoice._id,
        invoiceStatus: "issued",
        balanceAmount: { $gte: paymentAmount },
      },
      {
        $inc: {
          paidAmount: paymentAmount,
          balanceAmount: -paymentAmount,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedInvoice) {
      await CounterPayment.findByIdAndDelete(payment._id);

      return res.status(409).json({
        success: false,
        message: "Invoice balance changed. Please retry payment",
      });
    }

    updatedInvoice.paymentStatus =
      updatedInvoice.balanceAmount === 0 ? "paid" : "partially_paid";

    await updatedInvoice.save();

    return res.status(201).json({
      success: true,
      message: "Counter payment recorded successfully",
      data: {
        payment,
        invoice: updatedInvoice,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 5. Get All Counter Payments
exports.getAllCounterPayments = async (req, res) => {
  try {
    const payments = await CounterPayment.find()
      .populate("counterInvoice")
      .populate("receivedBy", "name email")
      .sort({ paymentDate: -1 });

    return res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 6. Get Payments By Invoice
exports.getCounterPaymentsByInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    if (!mongoose.isValidObjectId(invoiceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID",
      });
    }

    const payments = await CounterPayment.find({
      counterInvoice: invoiceId,
    })
      .populate("receivedBy", "name email")
      .sort({ paymentDate: -1 });

    return res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 7. Get Counter Payment By ID
exports.getCounterPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
      });
    }

    const payment = await CounterPayment.findById(id)
      .populate("counterInvoice")
      .populate("receivedBy", "name email");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Counter payment not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    return handleError(res, error);
  }
};
