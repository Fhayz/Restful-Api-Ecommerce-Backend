const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Category = require('../src/models/category');
const Product = require('../src/models/products');
const Order = require('../src/models/order')


// Load environment variables
dotenv.config();

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((error) => console.log('Error connecting to MongoDB:', error));

// Define the User model (this should be in a separate file, but adding it here for clarity)
const User = mongoose.model('User', new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
}));

// User registration route
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
  
    try {
      // Check if all required fields are provided
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
      }
  
      // If username is required, validate it
      if (!username) {
        return res.status(400).json({ message: "Username is required." });
      }
  
      // Check for duplicate email
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ message: "Email already exists." });
      }
  
      // Create and save the user
      const newUser = new User({ username, email, password });
      await newUser.save();
  
      res.status(201).json({ message: "User registered successfully!" });
    } catch (error) {
      res.status(500).json({ message: "Registration failed", error });
    }
  });
  

// User login route
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
  
    try {
      // Find the user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Compare the provided password with the stored hashed password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid password' });
      }
  
      // Generate a JWT token (if needed)
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  
      res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
      res.status(500).json({ message: 'Login failed', error });
    }
  });
  
// Test route (for debugging purposes)
app.get('/test', async (req, res) => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    res.json({ message: "Connected to MongoDB Atlas!", collections });
  } catch (error) {
    res.status(500).json({ message: "Failed to query MongoDB", error });
  }
});

// Create a new category
app.post('/api/categories', async (req, res) => {
    try {
      const { name, description } = req.body;
      const newCategory = new Category({ name, description });
      await newCategory.save();
      res.status(201).json({ message: 'Category created successfully', category: newCategory });
    } catch (error) {
      res.status(500).json({ message: 'Failed to create category', error });
    }
  });
  
  // Get all categories
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await Category.find();
      res.status(200).json(categories);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch categories', error });
    }
  });
  
  // Create a new product
  app.post('/api/products', async (req, res) => {
    try {
      const { name, price, description, category, stock } = req.body;
  
      // Validate category ObjectId
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ message: 'Invalid category ID' });
      }
  
      // Ensure the category exists
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({ message: 'Category not found' });
      }
  
      const newProduct = new Product({ name, price, description, category, stock });
      await newProduct.save();
      res.status(201).json({ message: 'Product created successfully', product: newProduct });
    } catch (error) {
      res.status(500).json({ message: 'Failed to create product', error });
    }
  });
  
  // Get all products
  app.get('/api/products', async (req, res) => {
    try {
      const products = await Product.find().populate('category', 'name');
      res.status(200).json(products);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch products', error });
    }
  });

// Get all products with optional filters
app.get('/api/products', async (req, res) => {
    try {
      const { category, minPrice, maxPrice, search } = req.query;
  
      // Build the query object
      const query = {};
  
      // Filter by category
      if (category) {
        query.category = category;
      }
  
      // Filter by price range
      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = Number(minPrice);
        if (maxPrice) query.price.$lte = Number(maxPrice);
      }
  
      // Search by name or description
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }
  
      // Fetch products from the database
      const products = await Product.find(query).populate('category');
  
      res.status(200).json(products);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch products', error });
    }
  });


// Utility function to check if a value is a valid ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Create a new order
app.post('/api/orders', async (req, res) => {
    try {
      const { userId, products } = req.body;
  
      if (!userId || !products || !products.length) {
        return res.status(400).json({ message: 'User ID and products are required' });
      }
  
      // Validate userId
      if (!isValidObjectId(userId)) {
        return res.status(400).json({ message: `Invalid userId: ${userId}` });
      }
  
      // Validate each product ID
      for (const item of products) {
        if (!isValidObjectId(item.product)) {
          return res.status(400).json({ message: `Invalid product ID: ${item.product}` });
        }
      }
  
      // Calculate total price
      let totalPrice = 0;
      for (const item of products) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(404).json({ message: `Product not found: ${item.product}` });
        }
        totalPrice += product.price * item.quantity;
      }
  
      // Create the order
      const order = new Order({
        user: userId,
        products,
        totalPrice,
      });
  
      await order.save();
  
      res.status(201).json({ message: 'Order placed successfully', order });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Failed to place order', error });
    }
  });

// Get orders for a specific user
app.get('/api/orders/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const orders = await Order.find({ user: userId }).populate('products.product', 'name price');
      res.status(200).json({ message: "Orders fetched successfully", orders });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders", error });
    }
  });

// Get all orders (Admin)
app.get('/api/orders', async (req, res) => {
    try {
      const orders = await Order.find().populate('user', 'username email').populate('products.product', 'name price');
      res.status(200).json({ message: "All orders fetched successfully", orders });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders", error });
    }
  });

// Update order status (Admin)
app.put('/api/orders/:orderId', async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
  
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
  
      order.status = status;
      await order.save();
  
      res.status(200).json({ message: "Order status updated successfully", order });
    } catch (error) {
      res.status(500).json({ message: "Failed to update order status", error });
    }
  });
  
  

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
