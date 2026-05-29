const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const User = require('./models/User');
const app = express();

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
// ✅ لوحة التحكم المطورة بحساب الأرصدة
// ✅ لوحة التحكم المطورة: فلترة ذكية + إحصائيات شهرية
app.get('/dashboard', async (req, res) => {
  if (!currentUser) return res.redirect('/login');
  
  const user = await User.findById(currentUser._id);
  
  // 1️⃣ جلب نوع الفلتر من الرابط (إذا لم يحدد، يعرض 'all' تلقائياً)
  const filterType = req.query.type || 'all';

  // 2️⃣ حساب الإحصائيات (تمر على كل العمليات لحساب الإجماليات)
  let totalLoans = 0;
  let totalExpenses = 0;
  let totalIncomes = 0;

  user.operations.forEach(op => {
    if (op.type === 'loan') totalLoans += op.amount;
    if (op.type === 'personal') totalExpenses += op.amount;
    if (op.type === 'income') totalIncomes += op.amount;
  });

  const fullBalance = user.balance + totalLoans; // الرصيد الكامل

  // 3️⃣ تصفية (فلترة) مصفوفة العمليات بناءً على طلبك
  let filteredOperations = user.operations;
  if (filterType !== 'all') {
    filteredOperations = user.operations.filter(op => op.type === filterType);
  }

  // 4️⃣ ترتيب العمليات من الأحدث إلى الأقدم (لكي لا تتعب في النزول للأسفل)
  filteredOperations.sort((a, b) => b.date - a.date);

  // إرسال كل البيانات الجديدة إلى صفحة الـ EJS
  res.render('dashboard', { 
    user, 
    fullBalance, 
    totalLoans, 
    totalExpenses, 
    filteredOperations, // 👈 الجدول سيعرض هذه المصفوفة المفلترة والمنظمة
    filterType // 👈 لمعرفة الفلتر الحالي وتلوينه
  });
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
// ✅ دالة الحذف المصححة والمضمونة لجميع العمليات
app.post('/delete-operation/:opId', async (req, res) => {
  const opId = req.params.opId;
  const user = await User.findById(currentUser._id);

  const operation = user.operations.id(opId);
  if (operation) {
    const amount = operation.amount;
    const type = operation.type;

    if (type === 'income') user.balance -= amount; // حذف الدخل ينقص الرصيد
    if (type === 'loan') user.balance += amount;   // حذف السلفة يعيد المال للرصيد
    
    // 💡 التعديل الجديد هنا لحل مشكلتك:
    if (type === 'personal') user.balance += amount; // حذف المصروف يعيد المال للرصيد الحالي

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

// ✅ مسار إضافة مصروف مطور بالفئة
app.post('/add-expense', async (req, res) => {
  const amount = parseFloat(req.body.amount);
  const category = req.body.category || 'أخرى'; // استقبال الفئة من النموذج

  await User.findByIdAndUpdate(currentUser._id, {
    $inc: { balance: -amount },
    $push: {
      operations: {
        amount,
        type: 'personal',
        category, // 👈 حفظ الفئة المحددة في قاعدة البيانات
        date: new Date()
      }
    }
  });

  res.redirect('/dashboard');
});

// صفحة التسجيل
app.get('/register', (req, res) => {
  res.render('register'); // ملف EJS جديد اسمه register.ejs
});

// استقبال بيانات التسجيل
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    // نتأكد إذا كان الاسم موجود مسبقًا
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.send('اسم المستخدم موجود بالفعل');
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);

    // إنشاء مستخدم جديد
    const newUser = new User({
      username,
      password: hashedPassword,
      balance: 0,
      operations: []
    });

    await newUser.save();

    res.redirect('/login'); // بعد التسجيل يروح لصفحة تسجيل الدخول
  } catch (err) {
    console.error(err);
    res.send('حدث خطأ أثناء التسجيل');
  }
});


// ✅ الصفحة الرئيسية
app.get('/', (req, res) => {
  res.redirect('/login'); // يحول تلقائياً إلى صفحة تسجيل الدخول
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على http://localhost:${PORT}`);
});

