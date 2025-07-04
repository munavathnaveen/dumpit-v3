require('dotenv').config();


const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const { authLimiter, generalLimiter } = require("./middleware/rateLimiter");
const colors = require("colors");
const config = require("./config");
const connectDB = require("./utils/database");
const errorHandler = require("./middleware/error");

// Initialize Express app
const app = express();
app.set("trust proxy", 1); 
connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet());
app.use(cors());

// Request logging in development
app.use(
    morgan((tokens, req, res) => {
        return [colors.cyan(tokens.method(req, res)), colors.yellow(tokens.url(req, res)), colors.green(tokens.status(req, res)), colors.red(tokens["response-time"](req, res) + " ms")].join(" ");
    })
);


// Only rate limit sensitive routes
app.use("/api/v1/auth", authLimiter);
app.use("/api/v1/orders", generalLimiter); // Maybe limit orders/cart

  

// Routes
app.use("/api/v1/auth", require("./routes/auth"));
app.use("/api/v1/users", require("./routes/users"));
app.use("/api/v1/addresses", require("./routes/addresses"));
app.use("/api/v1/products", require("./routes/products"));
app.use("/api/v1/shops", require("./routes/shops"));
app.use("/api/v1/cart", require("./routes/cart"));
app.use("/api/v1/orders", require("./routes/orders"));
app.use("/api/v1/coupons", require("./routes/coupons"));
app.use("/api/v1/analytics", require("./routes/analytics"));
app.use("/api/v1/location", require("./routes/location"));

// Root route
app.get("/", (req, res) => {
    res.send("Dumpit API Server is running...");
});

app.use(errorHandler);

const PORT = config.port;
const HOST = config.host;
const server = app.listen(PORT, () => {
    console.log(colors.yellow.bold(`Server running PORT ${process.env.PORT}`));
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
    console.error(colors.red.bold(`Error: ${err.message}`));
    server.close(() => process.exit(1));
});
