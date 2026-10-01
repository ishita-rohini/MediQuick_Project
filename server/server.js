import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { getDB, saveDB, databasePath } from './database.js';

dotenv.config();
const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

const db = getDB();

const sign = user => jwt.sign(
  {id:user.id,email:user.email,role:user.role},
  process.env.JWT_SECRET || 'dev-secret',
  {expiresIn:'7d'}
);

const auth = (req,res,next) => {
  try {
    const token = (req.headers.authorization||'').replace('Bearer ','');
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    next();
  } catch {
    res.status(401).json({message:'Please login'});
  }
};

const admin = (req,res,next) =>
  req.user?.role === 'ADMIN'
    ? next()
    : res.status(403).json({message:'Admin only'});

app.get('/api/health',(req,res)=>res.json({
  ok:true,
  service:'MediQuick API',
  database:'local-file',
  databaseFile:'server/data/database.json'
}));

app.post('/api/auth/register', async (req,res)=>{
  const {name,email,password,phone} = req.body;
  if(!name||!email||!password)
    return res.status(400).json({message:'Name, email and password are required'});

  if(db.users.some(u=>u.email===email))
    return res.status(409).json({message:'Email already registered'});

  const user={
    id:Date.now().toString(),
    name,
    email,
    phone,
    password:await bcrypt.hash(password,10),
    role:'CUSTOMER'
  };

  db.users.push(user);
  saveDB();

  res.json({
    token:sign(user),
    user:{...user,password:undefined}
  });
});

app.post('/api/auth/login', async (req,res)=>{
  const {email,password} = req.body;
  const user=db.users.find(u=>u.email===email);

  if(!user || !(await bcrypt.compare(password,user.password)))
    return res.status(401).json({message:'Invalid email or password'});

  res.json({
    token:sign(user),
    user:{...user,password:undefined}
  });
});

app.get('/api/auth/me',auth,(req,res)=>res.json({user:req.user}));

app.get('/api/medicines',(req,res)=>{
  let data=[...db.medicines];
  const q=(req.query.q||'').toLowerCase();
  const category=req.query.category||'All';

  if(q)
    data=data.filter(m=>(m.name+' '+m.brand).toLowerCase().includes(q));

  if(category!=='All')
    data=data.filter(m=>m.category===category);

  res.json(data);
});

app.get('/api/medicines/:id',(req,res)=>{
  const m=db.medicines.find(x=>x.id===req.params.id);
  m ? res.json(m) : res.status(404).json({message:'Medicine not found'});
});

app.post('/api/prescriptions',auth,upload.single('file'),(req,res)=>{
  if(!req.file)
    return res.status(400).json({message:'Please choose a prescription file'});

  const p={
    id:Date.now().toString(),
    userId:req.user.id,
    fileName:req.file.originalname,
    status:'PENDING',
    notes:req.body.notes||'',
    date:new Date().toISOString()
  };

  db.prescriptions.push(p);
  saveDB();
  res.json(p);
});

app.get('/api/prescriptions',auth,(req,res)=>
  res.json(db.prescriptions.filter(p=>p.userId===req.user.id))
);

app.post('/api/orders',auth,(req,res)=>{
  const {items,address,paymentMethod='Demo Payment'}=req.body;

  if(!items?.length)
    return res.status(400).json({message:'Cart is empty'});

  const total=items.reduce((s,i)=>s+i.price*i.qty,0);

  const order={
    id:'MQ'+Date.now(),
    userId:req.user.id,
    items,
    address,
    paymentMethod,
    total,
    status:'PLACED',
    date:new Date().toISOString()
  };

  db.orders.push(order);
  saveDB();
  res.json(order);
});

app.get('/api/orders',auth,(req,res)=>
  res.json(db.orders.filter(o=>o.userId===req.user.id))
);

app.get('/api/admin/orders',auth,admin,(req,res)=>
  res.json(db.orders)
);

app.get('/api/admin/stats',auth,admin,(req,res)=>res.json({
  users:db.users.length,
  medicines:db.medicines.length,
  orders:db.orders.length,
  prescriptions:db.prescriptions.length,
  revenue:db.orders.reduce((s,o)=>s+o.total,0)
}));

app.get('/api/admin/prescriptions',auth,admin,(req,res)=>
  res.json(db.prescriptions)
);

app.patch('/api/admin/prescriptions/:id',auth,admin,(req,res)=>{
  const p=db.prescriptions.find(x=>x.id===req.params.id);

  if(!p)
    return res.status(404).json({message:'Not found'});

  p.status=req.body.status;
  saveDB();
  res.json(p);
});

app.post('/api/assistant',async(req,res)=>{
  const q=(req.body.message||'').toLowerCase();
  let reply='I can help you search medicines, understand the MediQuick website, upload prescriptions, and check orders. I cannot diagnose conditions or prescribe medicines.';

  if(q.includes('cold')||q.includes('cough'))
    reply='You can browse the Syrups category for general product information. For medical advice, please consult a qualified healthcare professional.';

  if(q.includes('prescription'))
    reply='Open Prescriptions, choose your file, add optional notes, and submit. Restricted-medicine orders require admin approval.';

  if(q.includes('order'))
    reply='After checkout, open My Orders to view the order status and tracking timeline.';

  res.json({
    reply,
    aiConfigured:Boolean(process.env.GEMINI_API_KEY)
  });
});

const PORT=process.env.PORT||5000;
app.listen(PORT,()=>console.log(
  `MediQuick API running on http://localhost:${PORT} | Database: ${databasePath}`
));
