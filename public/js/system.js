const TOKEN_KEY="multivision_token";
function token(){return localStorage.getItem(TOKEN_KEY)}
function headers(){return {"Authorization":"Bearer "+token(),"Content-Type":"application/json"}}
async function api(path,opt={}){let o={...opt,headers:{...headers(),...(opt.headers||{})}};let r=await fetch(path,o);if(r.status===401){localStorage.removeItem(TOKEN_KEY);location="login.html";throw Error("Login required")}let d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"Request failed");return d}
function money(v){return "K"+Number(v||0).toLocaleString("en-US")}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function shell(title){document.getElementById("app").innerHTML=`<div class="layout"><aside class="side"><h2>MULTIVISION</h2><p>Shop Management</p><nav class="navlinks"><a href="dashboard.html">Dashboard</a><a href="products.html">Products</a><a href="inventory.html">Inventory</a><a href="sales.html">Sales</a><a href="expenses.html">Expenses</a><a href="customers.html">Customers</a><a href="suppliers.html">Suppliers</a><a href="layby.html">Lay-by</a><a href="reports.html">Reports</a><a href="branches.html">Branches</a><a href="users.html">Users</a><a href="settings.html">Settings</a></nav><br><button onclick="logout()">Log out</button></aside><main class="main"><div class="top"><div><h1>${title}</h1><p id="who" class="muted"></p></div></div><div id="page"></div></main></div>`;api("/api/admin/me").then(u=>who.textContent=`${u.name} — ${u.role}`)}
function logout(){localStorage.removeItem(TOKEN_KEY);location="login.html"}
if(!token() && !location.pathname.endsWith("login.html")) location="login.html";
