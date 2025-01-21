const {
    registerUserSchema,
    loginUserSchema,
  } = require("../validators/userValidator");
  
  // @desc   Get all users (example)
  const getAllUsers = (req, res) => {
    res.json({ message: "Get all users" });
  };
  
  // @desc   Register a new user
  const registerUser = (req, res) => {
    const { error } = registerUserSchema.validate(req.body);
  
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
  
    const { name, email, password } = req.body;
    res.json({
      message: "User registered successfully",
      user: { name, email },
    });
  };
  
  // @desc   Login a user
  const loginUser = (req, res) => {
    const { error } = loginUserSchema.validate(req.body);
  
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
  
    const { email, password } = req.body;
    res.json({
      message: "User logged in successfully",
      email,
    });
  };
  
  module.exports = { getAllUsers, registerUser, loginUser };
  