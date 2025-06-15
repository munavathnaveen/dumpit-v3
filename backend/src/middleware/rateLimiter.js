const rateLimit = require("express-rate-limit");

// For sensitive routes like login or signup
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 5 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: "Too many login attempts from this IP, try again in 5 minutes",
});

// For general API usage (more generous)
exports.generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // allow 200 requests/min
  message: "Too many requests, please try again shortly",
});


// ImageSearch Limiter
exports.imageSearchLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 10,
  message: "Too many image search requests. Please try again shortly.",
});
