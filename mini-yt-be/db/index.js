const mongoose = require('mongoose');
const { z } = require('zod');
require('dotenv').config();

const connectToDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to Database');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

const Schema = mongoose.Schema;
const ObjectId = mongoose.ObjectId;

// Zod Schemas for Validation
const userSchemaZod = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const userSchema = new Schema({
  username: String,
  password: String,
});

const User = mongoose.model('User', userSchema);

// Middleware for Validating Data Before Saving
const validateUser = (data) => userSchemaZod.parse(data);

module.exports = {
  connectToDatabase,
  User,
  validateUser,
};
