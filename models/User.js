const mongoose = require('mongoose');

const operationSchema = new mongoose.Schema({
  amount: Number,
  type: String, // 'income', 'loan', 'expense'
  to: String,   // اسم الشخص (في حالة السلف)
  date: {
    type: Date,
    default: Date.now
  }
});

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  balance: { type: Number, default: 0 },
  operations: [operationSchema]
});

module.exports = mongoose.model('User', userSchema);
