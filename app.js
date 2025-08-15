const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const User = require('./models/User');
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ Connection error:", err));


let currentUser = null;

// ✅ صفحة تسجيل الدخول
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user) return res.send('❌ المستخدم غير موجود');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.send('❌ كلمة المرور غير صحيحة');

  currentUser = user;
  res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
  currentUser = null;
  res.redirect('/login');
});

app.get('/create-user', async (req, res) => {
  const hashedPassword = await bcrypt.hash('YOUNES@', 10);
  await User.create({ username: 'you', password: hashedPassword });
  res.send('✅ تم إنشاء المستخدم: you / YOUNES@');
});

// ✅ لوحة التحكم
app.get('/dashboard', async (req, res) => {
  if (!currentUser) return res.redirect('/login');
  const user = await User.findById(currentUser._id);
  res.render('dashboard', { user });
});

// ✅ إضافة دخل
app.post('/add-income', async (req, res) => {
  const amount = parseFloat(req.body.amount);
  await User.findByIdAndUpdate(currentUser._id, {
    $inc: { balance: amount },
    $push: {
      operations: {
        amount,
        type: 'income',
        date: new Date()
      }
    }
  });
  res.redirect('/dashboard');
});

// ✅ إضافة سلف مع اسم الشخص
app.post('/add-loan', async (req, res) => {
  const amount = parseFloat(req.body.amount);
  const to = req.body.to;
  await User.findByIdAndUpdate(currentUser._id, {
    $inc: { balance: -amount },
    $push: {
      operations: {
        amount,
        type: 'loan',
        to,
        date: new Date()
      }
    }
  });
  res.redirect('/dashboard');
});

// ✅ حذف عملية
app.post('/delete-operation/:opId', async (req, res) => {
  const opId = req.params.opId;
  const user = await User.findById(currentUser._id);

  const operation = user.operations.id(opId);
  if (operation) {
    const amount = operation.amount;
    const type = operation.type;

    if (type === 'income') user.balance -= amount;
    if (type === 'loan') user.balance += amount;

    operation.deleteOne();
    await user.save();
  }

  res.redirect('/dashboard');
});

// ✅ عرض صفحة التعديل
app.get('/edit-operation/:opId', async (req, res) => {
  const user = await User.findById(currentUser._id);
  const operation = user.operations.id(req.params.opId);
  res.render('edit', { operation });
});

// ✅ تعديل العملية
app.post('/edit-operation/:opId', async (req, res) => {
  const { amount, to } = req.body;
  const user = await User.findById(currentUser._id);
  const operation = user.operations.id(req.params.opId);

  if (operation) {
    // إرجاع الرصيد القديم
    if (operation.type === 'income') user.balance -= operation.amount;
    if (operation.type === 'loan') user.balance += operation.amount;

    // تعديل القيم
    operation.amount = parseFloat(amount);
    if (operation.type === 'loan') operation.to = to;

    // تطبيق التعديل على الرصيد الجديد
    if (operation.type === 'income') user.balance += parseFloat(amount);
    if (operation.type === 'loan') user.balance -= parseFloat(amount);

    await user.save();
  }

  res.redirect('/dashboard');
});

app.post('/add-expense', async (req, res) => {
  const amount = parseFloat(req.body.amount);

  await User.findByIdAndUpdate(currentUser._id, {
    $inc: { balance: -amount },
    $push: {
      operations: {
        amount,
        type: 'personal', // 🧾 مصروف شخصي
        date: new Date()
      }
    }
  });

  res.redirect('/dashboard');
});

app.listen(port, () => {
  console.log(`🚀 الخادم يعمل على http://localhost:${port}`);
});
