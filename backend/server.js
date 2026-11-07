require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const salespersonRoutes = require("./routes/salespersonRoutes");
const customerRoutes = require("./routes/customerRoutes");
const userRoutes = require("./routes/userRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const productRoutes = require("./routes/productRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const vehicleModelRoutes = require("./routes/vehicleModelRoutes");
const vehicleUnitRoutes = require("./routes/vehicleUnitRoutes");
const vehicleSaleRoutes = require("./routes/vehicleSaleRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const servicePartsRoutes = require("./routes/servicePartsRoutes");
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// Request logger
app.use(morgan("dev"));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/salesperson", salespersonRoutes);

app.use("/api/customers", customerRoutes);

app.use("/api/users", userRoutes);

app.use("/api/vehicles", vehicleRoutes);
app.use("/api/products", productRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/inventory", inventoryRoutes);

// Vehicle Sales Management Routes
app.use("/api/vehicle-models", vehicleModelRoutes);
app.use("/api/vehicle-units", vehicleUnitRoutes);
app.use("/api/vehicle-sales", vehicleSaleRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/service-parts", servicePartsRoutes);
// Test route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Two Wheeler Showroom POS Backend Running",
  });
});

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Two Wheeler Showroom POS Backend Healthy",
    database: "Connected",
  });
});

// Server configuration
const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log("--------------------------------");
      console.log("ServicePOS Backend Started");
      console.log(`Server: http://localhost:${PORT}`);
      console.log(`Frontend: ${process.env.FRONTEND_URL}`);
      console.log("--------------------------------");
    });
  } catch (error) {
    console.error("Server Startup Failed:", error.message);
    process.exit(1);
  }
};

startServer();
