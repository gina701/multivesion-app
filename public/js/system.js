const TOKEN_KEY="multivision_token";
window.currentUser=null;
function token(){return localStorage.getItem(TOKEN_KEY)}
function headers(){return {"Authorization":"Bearer "+token(),"Content-Type":"application/json"}}
async function api(path,opt={}){let o={...opt,headers:{...headers(),...(opt.headers||{})}};let r=await fetch(path,o);if(r.status===401){localStorage.removeItem(TOKEN_KEY);location="login.html";throw Error("Login required")}let d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"Request failed");return d}
function money(v){return "K"+Number(v||0).toLocaleString("en-US")}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function shell(title){
  const app=document.getElementById("app");
  app.innerHTML=`<div class="layout"><aside class="side"><div class="brand"><span class="brand-mark" aria-hidden="true">M</span><div><h2>MULTIVISION</h2><p>Shop Management</p></div></div><nav class="navlinks" aria-label="Main navigation"><a href="dashboard.html">Dashboard</a><a href="products.html">Products</a><a href="inventory.html">Inventory</a><a href="sales.html">Sales</a><a href="expenses.html">Expenses</a><a href="customers.html">Customers</a><a href="suppliers.html">Suppliers</a><a href="layby.html">Lay-by</a><a href="reports.html">Reports</a><a href="branches.html">Branches</a><a href="users.html">Users</a><a href="settings.html">Settings</a></nav><div class="side-footer"><p id="who"></p><button onclick="logout()">Log out</button></div></aside><main class="main"><header class="top"><h1>${esc(title)}</h1></header><div id="page"></div></main></div>`;
  const currentPage=location.pathname.split("/").pop();
  app.querySelectorAll(".navlinks a").forEach(link=>{
    if(link.getAttribute("href")===currentPage){link.classList.add("active");link.setAttribute("aria-current","page")}
  });
  api("/api/admin/me").then(user=>{
    window.currentUser=user;
    const who=document.getElementById("who");
    if(who)who.textContent=`${user.name} — ${user.role}`;
    window.dispatchEvent(new CustomEvent("appuserloaded",{detail:user}));
  }).catch(error=>console.error("Could not load signed-in user details:",error));
}
function logout(){localStorage.removeItem(TOKEN_KEY);location="login.html"}
if(!token() && !location.pathname.endsWith("login.html")) location="login.html";
