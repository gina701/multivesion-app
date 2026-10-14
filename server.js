const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret-in-production";
if(process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || !process.env.ADMIN_PASSWORD)) console.warn("Set JWT_SECRET and ADMIN_PASSWORD in Render environment variables.");

const ROOT = __dirname;
const DATA = path.join(ROOT, "data");
const UPLOADS = path.join(ROOT, "uploads");
for (const dir of [DATA, UPLOADS]) fs.mkdirSync(dir, {recursive:true});

app.use(cors({origin:true}));
app.use(express.json({limit:"2mb"}));
app.use(express.urlencoded({extended:true}));
app.use("/uploads", express.static(UPLOADS));
app.use(express.static(path.join(ROOT, "public")));

const files = {
  users:"users.json", products:"products.json", sales:"sales.json", expenses:"expenses.json",
  customers:"customers.json", suppliers:"suppliers.json", laybys:"laybys.json",
  branches:"branches.json", audit:"audit.json", stockMovements:"stock-movements.json"
};
function read(name){ const f=path.join(DATA,files[name]); try{return JSON.parse(fs.readFileSync(f,"utf8"));}catch{return [];} }
let githubWriteQueue=Promise.resolve();
function writeData(name,data){
  const body=JSON.stringify(data,null,2);fs.writeFileSync(path.join(DATA,files[name]),body);
  // Optional GitHub mirror: set GITHUB_TOKEN, GITHUB_REPO (owner/repo), and GITHUB_DATA_PATH (e.g. system/data).
  if(process.env.GITHUB_TOKEN&&process.env.GITHUB_REPO){
    const repo=process.env.GITHUB_REPO,branch=process.env.GITHUB_BRANCH||"main",base=(process.env.GITHUB_DATA_PATH||"system/data").replace(/^\/+|\/+$/g,"");
    const filePath=`${base}/${files[name]}`;
    githubWriteQueue=githubWriteQueue.then(async()=>{
      try{
        const url=`https://api.github.com/repos/${repo}/contents/${filePath}`;
        const headers={Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"};
        const old=await fetch(`${url}?ref=${encodeURIComponent(branch)}`,{headers});let sha;
        if(old.ok){const j=await old.json();sha=j.sha;} else if(old.status!==404){throw new Error(`GitHub read failed: ${old.status}`)}
        const payload={message:`Update shop data: ${files[name]}`,content:Buffer.from(body).toString("base64"),branch};if(sha)payload.sha=sha;
        const put=await fetch(url,{method:"PUT",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify(payload)});
        if(!put.ok)console.error("GitHub JSON mirror failed",files[name],put.status,await put.text());
      }catch(e){console.error("GitHub JSON mirror error:",e.message)}
    }).catch(e=>console.error("GitHub queue error:",e.message));
  }
}
function id(prefix="id"){return prefix+"_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7);}
function now(){return new Date().toISOString();}
function moneyNumber(v){const n=Number(v);return Number.isFinite(n)?n:0;}

async function restoreGitHubData(){
  if(!process.env.GITHUB_TOKEN||!process.env.GITHUB_REPO)return;
  const repo=process.env.GITHUB_REPO,branch=process.env.GITHUB_BRANCH||"main",base=(process.env.GITHUB_DATA_PATH||"system/data").replace(/^\/+|\/+$/g,"");
  const headers={Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"};
  for(const name of Object.keys(files)){
    try{const r=await fetch(`https://api.github.com/repos/${repo}/contents/${base}/${files[name]}?ref=${encodeURIComponent(branch)}`,{headers});if(!r.ok){if(r.status!==404)console.error("GitHub restore failed",files[name],r.status);continue;}const item=await r.json();const raw=Buffer.from(item.content.replace(/\n/g,""),"base64").toString("utf8");JSON.parse(raw);fs.writeFileSync(path.join(DATA,files[name]),raw);}
    catch(e){console.error("GitHub restore error",files[name],e.message)}
  }
}

async function seed(){
  let users=read("users");
  if(!users.length){
    const username=process.env.ADMIN_USERNAME||"admin";
    const password=process.env.ADMIN_PASSWORD||"admin123";
    users=[{id:id("usr"),username,passwordHash:await bcrypt.hash(password,10),role:"ADMIN",name:"Administrator",createdAt:now()}];
    writeData("users",users);
  }
  if(!read("branches").length) writeData("branches",[
    {id:"br_mzuzu_st",name:"Mzuzu — St Augustine Market",address:"Opposite Mzuni in St Augustine Market",active:true},
    {id:"br_mzuzu_uni",name:"Mzuzu — Near Mzuzu University",address:"Just after Mzuzu University Main Gate, 30 metres ahead towards Kaka Motel, right-hand side after Cape Restaurant",active:true},
    {id:"br_zomba",name:"Zomba — An Juman Shopping Mall",address:"An Juman Shopping Mall",active:true}
  ]);
}
function auth(req,res,next){
  const h=req.headers.authorization||"";
  const token=h.startsWith("Bearer ")?h.slice(7):null;
  if(!token)return res.status(401).json({error:"Login required"});
  try{req.user=jwt.verify(token,JWT_SECRET);next();}catch{return res.status(401).json({error:"Invalid or expired login"});}
}
function admin(req,res,next){if(req.user.role!=="ADMIN")return res.status(403).json({error:"Admin only"});next();}
function audit(action,req,details={}){
  const logs=read("audit"); logs.unshift({id:id("aud"),action,user:req.user?.username||"system",role:req.user?.role||"SYSTEM",details,date:now()}); writeData("audit",logs.slice(0,1000));
}

app.get("/api/health",(req,res)=>res.json({ok:true,name:"Multivision Shop Management API"}));

app.post("/api/login",async(req,res)=>{
  const {username,password}=req.body||{};
  const user=read("users").find(u=>u.username===username);
  if(!user || !(await bcrypt.compare(password||"",user.passwordHash))) return res.status(401).json({error:"Invalid username or password"});
  const token=jwt.sign({id:user.id,username:user.username,role:user.role,name:user.name},JWT_SECRET,{expiresIn:"8h"});
  res.json({token,user:{id:user.id,username:user.username,role:user.role,name:user.name}});
});

app.get("/api/products",(req,res)=>{
  let products=read("products").filter(p=>p.publicVisible!==false);
  if(req.query.featured==="true") products=products.filter(p=>p.featured);
  res.json(products.map(publicProduct));
});
app.get("/api/products/:id",(req,res)=>{
  const p=read("products").find(x=>x.id===req.params.id && x.publicVisible!==false);
  if(!p)return res.status(404).json({error:"Product not found"});
  res.json(publicProduct(p));
});
app.get("/api/categories",(req,res)=>res.json([...new Set(read("products").map(p=>p.category))].sort()));
app.get("/api/branches",(req,res)=>res.json(read("branches").filter(b=>b.active)));

function publicProduct(p){
  return {id:p.id,name:p.name,category:p.category,description:p.description,specifications:p.specifications||{},price:p.price,priceText:p.priceText||null,available:p.quantity>0 && p.available!==false,imageUrl:p.imageUrl||null,branchIds:p.branchIds||[]};
}

app.get("/api/admin/me",auth,(req,res)=>res.json(req.user));
app.get("/api/admin/dashboard",auth,(req,res)=>{
  const sales=read("sales"), expenses=read("expenses"), products=read("products"), laybys=read("laybys");
  const today=new Date().toISOString().slice(0,10), month=new Date().toISOString().slice(0,7);
  const todays=sales.filter(s=>s.date.slice(0,10)===today), monthly=sales.filter(s=>s.date.slice(0,7)===month);
  const salesTotal=arr=>arr.reduce((a,s)=>a+moneyNumber(s.total),0);
  const expenseTotal=expenses.filter(e=>e.date.slice(0,7)===month).reduce((a,e)=>a+moneyNumber(e.amount),0);
  res.json({
    todaySales:salesTotal(todays),monthlySales:salesTotal(monthly),totalSales:salesTotal(sales),
    expenses:expenseTotal,profit:monthly.reduce((a,s)=>a+moneyNumber(s.profit),0)-expenseTotal,
    products:products.length,lowStock:products.filter(p=>p.quantity<=p.lowStock && p.quantity>0).length,
    outOfStock:products.filter(p=>p.quantity<=0).length,customers:read("customers").length,
    suppliers:read("suppliers").length,pendingLaybys:laybys.filter(l=>l.status!=="COMPLETED").length,
    recentSales:sales.slice(0,8)
  });
});

app.get("/api/admin/products",auth,(req,res)=>res.json(read("products")));
app.post("/api/admin/products",auth,admin,(req,res)=>{
  const p=req.body||{};
  const products=read("products");
  const product={id:id("prd"),name:p.name||"Unnamed product",category:p.category||"Other Electronics",description:p.description||"",specifications:p.specifications||{},price:moneyNumber(p.price),priceText:p.priceText||null,purchasePrice:moneyNumber(p.purchasePrice),quantity:moneyNumber(p.quantity),lowStock:moneyNumber(p.lowStock)||2,branchIds:p.branchIds||[],supplierId:p.supplierId||null,available:p.available!==false,publicVisible:p.publicVisible!==false,featured:!!p.featured,imageUrl:p.imageUrl||null,sku:p.sku||"",createdAt:now(),updatedAt:now()};
  products.unshift(product);writeData("products",products);audit("PRODUCT_ADDED",req,{id:product.id,name:product.name});res.status(201).json(product);
});
app.put("/api/admin/products/:id",auth,admin,(req,res)=>{
  const products=read("products"), i=products.findIndex(p=>p.id===req.params.id);
  if(i<0)return res.status(404).json({error:"Product not found"});
  const old=products[i], p=req.body||{};
  products[i]={...old,...p,price:moneyNumber(p.price??old.price),purchasePrice:moneyNumber(p.purchasePrice??old.purchasePrice),quantity:moneyNumber(p.quantity??old.quantity),lowStock:moneyNumber(p.lowStock??old.lowStock),updatedAt:now()};
  writeData("products",products);audit("PRODUCT_UPDATED",req,{id:old.id,name:products[i].name});res.json(products[i]);
});
app.delete("/api/admin/products/:id",auth,admin,(req,res)=>{
  const products=read("products"), i=products.findIndex(p=>p.id===req.params.id);
  if(i<0)return res.status(404).json({error:"Product not found"});
  const [removed]=products.splice(i,1);writeData("products",products);audit("PRODUCT_DELETED",req,{id:removed.id,name:removed.name});res.json({ok:true});
});

// Stock intake/adjustment records preserve the reason and purchase cost.
app.get("/api/admin/stock-movements",auth,(req,res)=>res.json(read("stockMovements")));
app.post("/api/admin/stock-movements",auth,admin,(req,res)=>{
  const x=req.body||{},qty=moneyNumber(x.quantity),cost=moneyNumber(x.unitCost);
  const products=read("products"),i=products.findIndex(p=>p.id===x.productId);
  if(i<0)return res.status(404).json({error:"Product not found"});
  if(!Number.isInteger(qty)||qty===0)return res.status(400).json({error:"Quantity must be a non-zero whole number"});
  if(products[i].quantity+qty<0)return res.status(400).json({error:"Stock cannot become negative"});
  if(qty>0&&cost<0)return res.status(400).json({error:"Unit cost cannot be negative"});
  products[i].quantity+=qty;if(qty>0&&cost>0)products[i].purchasePrice=cost;products[i].updatedAt=now();writeData("products",products);
  const movement={id:id("mov"),productId:x.productId,productName:products[i].name,quantity:qty,unitCost:cost,reason:x.reason|| (qty>0?"Stock received":"Stock adjustment"),supplierId:x.supplierId||null,reference:x.reference||"",date:now(),staffId:req.user.id};
  const arr=read("stockMovements");arr.unshift(movement);writeData("stockMovements",arr);audit("STOCK_MOVEMENT",req,{productId:x.productId,quantity:qty,reason:movement.reason});res.status(201).json(movement);
});
app.post("/api/admin/sales/:id/return",auth,admin,(req,res)=>{
 const sales=read("sales"),i=sales.findIndex(x=>x.id===req.params.id);if(i<0)return res.status(404).json({error:"Sale not found"});
 const sale=sales[i];if(sale.returned)return res.status(400).json({error:"This sale has already been returned"});
 const products=read("products"),p=products.find(x=>x.id===sale.productId);if(p){p.quantity=moneyNumber(p.quantity)+moneyNumber(sale.quantity);writeData("products",products)}
 sale.returned=true;sale.returnedAt=now();sale.returnReason=(req.body||{}).reason||"Customer return";writeData("sales",sales);audit("SALE_RETURNED",req,{saleId:sale.id});res.json(sale);
});
app.get("/api/admin/profit-loss",auth,(req,res)=>{
 const from=req.query.from||"0000-01-01",to=req.query.to||"9999-12-31";
 const sales=read("sales").filter(s=>!s.returned&&s.date.slice(0,10)>=from&&s.date.slice(0,10)<=to);
 const expenses=read("expenses").filter(e=>e.date.slice(0,10)>=from&&e.date.slice(0,10)<=to);
 const revenue=sales.reduce((a,s)=>a+moneyNumber(s.total),0),cogs=sales.reduce((a,s)=>a+moneyNumber(s.costOfGoods??(s.purchasePriceAtSale||0)*moneyNumber(s.quantity)),0),expenseTotal=expenses.reduce((a,e)=>a+moneyNumber(e.amount),0);
 res.json({from,to,revenue,costOfGoods:cogs,grossProfit:revenue-cogs,expenses:expenseTotal,netProfit:revenue-cogs-expenseTotal,salesCount:sales.length,expensesCount:expenses.length});
});

const storage=multer.diskStorage({destination:(req,file,cb)=>cb(null,UPLOADS),filename:(req,file,cb)=>{const ext=path.extname(file.originalname).toLowerCase();cb(null,Date.now()+"-"+Math.random().toString(36).slice(2)+ext);}});
const upload=multer({storage,limits:{fileSize:5*1024*1024},fileFilter:(req,file,cb)=>{if(!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype))return cb(new Error("Only image files are allowed"));cb(null,true);}});
app.post("/api/admin/products/:id/image",auth,admin,upload.single("image"),(req,res)=>{
  if(!req.file)return res.status(400).json({error:"Image required"});
  const products=read("products"), i=products.findIndex(p=>p.id===req.params.id);
  if(i<0)return res.status(404).json({error:"Product not found"});
  products[i].imageUrl=`/uploads/${req.file.filename}`;products[i].updatedAt=now();writeData("products",products);
  audit("PRODUCT_IMAGE_UPLOADED",req,{id:req.params.id});res.json({imageUrl:products[i].imageUrl,product:products[i]});
});

app.get("/api/admin/sales",auth,(req,res)=>res.json(read("sales")));
app.post("/api/admin/sales",auth,(req,res)=>{
  const {productId,quantity,customerId,branchId,paymentMethod,discount=0}=req.body||{};
  const products=read("products"), i=products.findIndex(p=>p.id===productId);
  if(i<0)return res.status(404).json({error:"Product not found"});
  const qty=moneyNumber(quantity); if(qty<=0 || products[i].quantity<qty)return res.status(400).json({error:"Insufficient stock"});
  const gross=products[i].price*qty, disc=moneyNumber(discount); if(disc<0||disc>gross)return res.status(400).json({error:"Discount must be between 0 and the sale subtotal"}); const total=gross-disc, cost=products[i].purchasePrice*qty;
  products[i].quantity-=qty;writeData("products",products);
  const sale={id:id("sale"),productId,productName:products[i].name,quantity:qty,sellingPrice:products[i].price,purchasePriceAtSale:products[i].purchasePrice,costOfGoods:cost,discount:disc,customerId:customerId||null,branchId:branchId||null,paymentMethod:paymentMethod||"Cash",staffId:req.user.id,date:now(),total,profit:total-cost};
  const sales=read("sales");sales.unshift(sale);writeData("sales",sales);audit("SALE_CREATED",req,{id:sale.id,total});res.status(201).json(sale);
});

app.get("/api/admin/expenses",auth,(req,res)=>res.json(read("expenses")));
app.post("/api/admin/expenses",auth,(req,res)=>{
  const e=req.body||{}, item={id:id("exp"),name:e.name||"Expense",category:e.category||"Other",amount:moneyNumber(e.amount),description:e.description||"",branchId:e.branchId||null,date:e.date||now(),staffId:req.user.id};
  const arr=read("expenses");arr.unshift(item);writeData("expenses",arr);audit("EXPENSE_CREATED",req,{id:item.id,amount:item.amount});res.status(201).json(item);
});

app.get("/api/admin/customers",auth,(req,res)=>res.json(read("customers")));
app.post("/api/admin/customers",auth,(req,res)=>{const x=req.body||{}, c={id:id("cus"),name:x.name||"",phone:x.phone||"",whatsapp:x.whatsapp||"",address:x.address||"",createdAt:now()};const a=read("customers");a.unshift(c);writeData("customers",a);res.status(201).json(c);});

app.get("/api/admin/suppliers",auth,(req,res)=>res.json(read("suppliers")));
app.post("/api/admin/suppliers",auth,(req,res)=>{const x=req.body||{}, s={id:id("sup"),name:x.name||"",phone:x.phone||"",productsSupplied:x.productsSupplied||"",amountOwed:moneyNumber(x.amountOwed),createdAt:now()};const a=read("suppliers");a.unshift(s);writeData("suppliers",a);res.status(201).json(s);});

app.get("/api/admin/laybys",auth,(req,res)=>res.json(read("laybys")));
app.post("/api/admin/laybys",auth,(req,res)=>{
  const x=req.body||{}, l={id:id("lay"),customerId:x.customerId||null,customerName:x.customerName||"",phone:x.phone||"",productId:x.productId||null,productName:x.productName||"",agreedPrice:moneyNumber(x.agreedPrice),amountPaid:0,balance:moneyNumber(x.agreedPrice),payments:[],receiptNumbers:[],branchId:x.branchId||null,dateStarted:x.dateStarted||now(),status:"ACTIVE",notes:x.notes||""};
  const a=read("laybys");a.unshift(l);writeData("laybys",a);res.status(201).json(l);
});
app.post("/api/admin/laybys/:id/payment",auth,(req,res)=>{
  const a=read("laybys"),i=a.findIndex(l=>l.id===req.params.id);if(i<0)return res.status(404).json({error:"Lay-by not found"});
  const amount=moneyNumber(req.body.amount);if(amount<=0 || amount>a[i].balance)return res.status(400).json({error:"Invalid payment"});
  const payment={id:id("pay"),amount,date:now(),receiptNumber:"RC-"+Date.now().toString().slice(-7),staffId:req.user.id};
  a[i].payments.push(payment);a[i].receiptNumbers.push(payment.receiptNumber);a[i].amountPaid+=amount;a[i].balance=a[i].agreedPrice-a[i].amountPaid;if(a[i].balance===0)a[i].status="COMPLETED";
  writeData("laybys",a);audit("LAYBY_PAYMENT",req,{id:a[i].id,amount});res.json(a[i]);
});

app.get("/api/admin/branches",auth,(req,res)=>res.json(read("branches")));
app.post("/api/admin/branches",auth,admin,(req,res)=>{const x=req.body||{},b={id:id("br"),name:x.name||"",address:x.address||"",active:true};const a=read("branches");a.push(b);writeData("branches",a);res.status(201).json(b);});

app.get("/api/admin/users",auth,admin,(req,res)=>res.json(read("users").map(u=>({id:u.id,username:u.username,role:u.role,name:u.name,createdAt:u.createdAt}))));
app.post("/api/admin/users",auth,admin,async(req,res)=>{const x=req.body||{};if(!x.username||!x.password)return res.status(400).json({error:"Username and password required"});const a=read("users");if(a.some(u=>u.username===x.username))return res.status(400).json({error:"Username already exists"});const u={id:id("usr"),username:x.username,passwordHash:await bcrypt.hash(x.password,10),role:x.role==="STAFF"?"STAFF":"ADMIN",name:x.name||x.username,createdAt:now()};a.push(u);writeData("users",a);res.status(201).json({id:u.id,username:u.username,role:u.role,name:u.name});});

app.get("/api/admin/audit",auth,admin,(req,res)=>res.json(read("audit")));
app.get("/api/admin/backup",auth,admin,(req,res)=>{
  const backup={createdAt:now()};for(const n of Object.keys(files))backup[n]=read(n);
  res.setHeader("Content-Disposition",'attachment; filename="multivision-backup.json"');res.json(backup);
});

app.use((err,req,res,next)=>{console.error(err);res.status(400).json({error:err.message||"Request failed"});});
app.get("*",(req,res)=>res.sendFile(path.join(ROOT,"public","login.html")));

restoreGitHubData().then(seed).then(()=>app.listen(PORT,()=>console.log(`Multivision management system running on port ${PORT}`))).catch(err=>{console.error("Startup failed",err);process.exit(1)});
