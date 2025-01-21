const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  registerUser,
  loginUser,
} = require("../controllers/userController");

// Route to get all users
router.get("/", getAllUsers);

// Route to register a user
router.post("/register", registerUser);

// Route to login a user
router.post("/login", loginUser);

module.exports = router;
