const mongoose = require('mongoose');

// ✅ المخطط المطور للعملية ليشمل فئة المصروف الشخصي
const operationSchema = new mongoose.Schema({
  amount: Number,
  type: String,     // 'income', 'loan', 'personal'
  to: String,       // اسم الشخص (في حالة السلف)
  category: String, // 👈 السطر السحري الجديد لحفظ فئة المصروف (أكل، نقل، إنترنت...)
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
} , { timestamps: true }); // إضافة اختياري لتوثيق وقت إنشاء الحساب

module.exports = mongoose.model('User', userSchema);