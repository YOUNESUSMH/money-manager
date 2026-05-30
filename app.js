const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo'); // 👈 تأكد أنه مكتوب هكذا بدون (session) في الآخر
const User = require('./models/User');
const app = express();

require('dotenv').config();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 📡 الاتصال بقاعدة البيانات MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ Connection error:", err));

// 🔐 إعداد نظام الجلسات الآمن (Sessions Configuration)
app.use(session({
  secret: 'my_super_secret_key_younes',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI, // 👈 تأكد أنها mongoUrl بالكامل
    ttl: 14 * 24 * 60 * 60
  }),
  cookie: {
    maxAge: 14 * 24 * 60 * 60 * 1000,
    httpOnly: true
  }
}));

// 🛡️ Middleware مخصص لحماية المسارات (بدل الفحص اليدوي المتكرر)
const requireLogin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

// ✅ صفحة تسجيل الدخول
app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard'); // إذا كان مسجلاً يذهب للداشبورد فوراً
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user) return res.send('❌ المستخدم غير موجود');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.send('❌ كلمة المرور غير صحيحة');

  // 💡 حفظ بيانات المستخدم داخل الجلسة الآمنة الخاصة بهاتف هذا الشخص فقط
  req.session.user = { _id: user._id, username: user.username };
  
  res.redirect('/dashboard');
});

// 🚪 تسجيل الخروج (تدمير الجلسة)
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// ✅ لوحة التحكم (محمية بـ requireLogin)
app.get('/dashboard', requireLogin, async (req, res) => {
  const user = await User.findById(req.session.user._id); // جلب البيانات بناءً على جلسة المستخدم الحالي
  const filterType = req.query.type || 'all';

  let totalLoans = 0;
  let totalExpenses = 0;
  let totalIncomes = 0;

  user.operations.forEach(op => {
    if (op.type === 'loan') totalLoans += op.amount;
    if (op.type === 'personal') totalExpenses += op.amount;
    if (op.type === 'income') totalIncomes += op.amount;
  });

  const fullBalance = user.balance + totalLoans;

  let filteredOperations = user.operations;
  if (filterType !== 'all') {
    filteredOperations = user.operations.filter(op => op.type === filterType);
  }

  filteredOperations.sort((a, b) => b.date - a.date);

  res.render('dashboard', { 
    user, 
    fullBalance, 
    totalLoans, 
    totalExpenses, 
    filteredOperations, 
    filterType 
  });
});

// ✅ إضافة دخل
app.post('/add-income', requireLogin, async (req, res) => {
  const amount = parseFloat(req.body.amount);
  await User.findByIdAndUpdate(req.session.user._id, {
    $inc: { balance: amount },
    $push: { operations: { amount, type: 'income', date: new Date() } }
  });
  res.redirect('/dashboard');
});

// ✅ إضافة سلف مع اسم الشخص
app.post('/add-loan', requireLogin, async (req, res) => {
  const amount = parseFloat(req.body.amount);
  const to = req.body.to;
  await User.findByIdAndUpdate(req.session.user._id, {
    $inc: { balance: -amount },
    $push: { operations: { amount, type: 'loan', to, date: new Date() } }
  });
  res.redirect('/dashboard');
});

// ✅ إضافة مصروف شخصي مرن
app.post('/add-expense', requireLogin, async (req, res) => {
  const amount = parseFloat(req.body.amount);
  let category = req.body.category;

  if (category === 'custom') {
    category = req.body.custom_category || 'أخرى';
  }

  await User.findByIdAndUpdate(req.session.user._id, {
    $inc: { balance: -amount },
    $push: { operations: { amount, type: 'personal', category, date: new Date() } }
  });
  res.redirect('/dashboard');
});

// ✅ حذف عملية
app.post('/delete-operation/:opId', requireLogin, async (req, res) => {
  const opId = req.params.opId;
  const user = await User.findById(req.session.user._id);
  const operation = user.operations.id(opId);

  if (operation) {
    const amount = operation.amount;
    const type = operation.type;

    if (type === 'income') user.balance -= amount;
    if (type === 'loan') user.balance += amount;
    if (type === 'personal') user.balance += amount;

    operation.deleteOne();
    await user.save();
  }
  res.redirect('/dashboard');
});

// ✅ عرض صفحة التعديل
app.get('/edit-operation/:opId', requireLogin, async (req, res) => {
  const user = await User.findById(req.session.user._id);
  const operation = user.operations.id(req.params.opId);
  res.render('edit', { operation });
});

// ✅ تعديل العملية
app.post('/edit-operation/:opId', requireLogin, async (req, res) => {
  const { amount, to, category } = req.body;
  const user = await User.findById(req.session.user._id);
  const operation = user.operations.id(req.params.opId);

  if (operation) {
    if (operation.type === 'income') user.balance -= operation.amount;
    if (operation.type === 'loan') user.balance += operation.amount;
    if (operation.type === 'personal') user.balance += operation.amount;

    operation.amount = parseFloat(amount);
    if (operation.type === 'loan') operation.to = to;
    if (operation.type === 'personal') operation.category = category || 'أخرى';

    if (operation.type === 'income') user.balance += parseFloat(amount);
    if (operation.type === 'loan') user.balance -= parseFloat(amount);
    if (operation.type === 'personal') user.balance -= parseFloat(amount);

    await user.save();
  }
  res.redirect('/dashboard');
});

// صفحة التسجيل
app.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('register');
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.send('اسم المستخدم موجود بالفعل');

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, balance: 0, operations: [] });
    await newUser.save();

    res.redirect('/login');
  } catch (err) {
    console.error(err);
    res.send('حدث خطأ أثناء التسجيل');
  }
});

app.get('/', (req, res) => {
  res.redirect('/login');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل بأمان على http://localhost:${PORT}`);
});