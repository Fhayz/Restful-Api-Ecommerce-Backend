const express = require("express");

const app = express();

// Middleware to parse JSON
app.use(express.json());

// Import routes
const userRoutes = require("./routes/userRoutes");

// Mount routes
app.use("/api/users", userRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("E-Commerce API is running...");
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
