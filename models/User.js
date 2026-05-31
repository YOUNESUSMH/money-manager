const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 0 },
  operations: [
    {
      amount: Number,
      type: { type: String, enum: ['income', 'loan', 'personal'] },
      to: String,
      category: String,
      date: { type: Date, default: Date.now }
    }
  ],
  // 🎯 الحصالة الرقمية الجديدة هنا
  savingsGoals: [
    {
      title: String,        // اسم الهدف (مثلاً: هاتف جديد)
      targetAmount: Number, // المبلغ المطلوب لشرائه
      savedAmount: { type: Number, default: 0 }, // المبلغ الذي وفرته حتى الآن
      date: { type: Date, default: Date.now }
    }
  ]
});

module.exports = mongoose.model('User', UserSchema);