shell("Dashboard");
const dashboardPage=document.getElementById("page");
(async()=>{
  try{
    const d=await api("/api/admin/dashboard");
    dashboardPage.innerHTML=`
      <section class="dashboard-hero">
        <div><p class="eyebrow">BUSINESS OVERVIEW</p><h2>Your shop at a glance</h2><p>Track sales, stock value and the items that need attention.</p></div>
        <nav class="quick-actions" aria-label="Quick actions">
          <a class="action-link" href="sales.html">Record a sale</a>
          <a class="action-link" href="products.html">Add a product</a>
          <a class="action-link action-link-light" href="inventory.html">Receive stock</a>
        </nav>
      </section>
      <section class="dashboard-section">
        <div class="section-heading"><div><p class="eyebrow">INVENTORY VALUE</p><h2>Stock on hand</h2></div><a href="inventory.html">View inventory</a></div>
        <div class="grid stock-grid">
          ${m("Stock at cost",money(d.stockCostValue),"What you paid for current stock")}
          ${m("Potential retail value",money(d.stockRetailValue),"Value if all stock is sold")}
          ${m("Units in stock",Number(d.stockUnits||0).toLocaleString("en-US"),"Total sellable quantity")}
        </div>
      </section>
      <section class="dashboard-section">
        <div class="section-heading"><div><p class="eyebrow">PERFORMANCE</p><h2>Sales & operations</h2></div><a href="reports.html">Open reports</a></div>
        <div class="grid">
          ${m("Today's sales",money(d.todaySales))}
          ${m("Monthly sales",money(d.monthlySales))}
          ${m("Monthly expenses",money(d.expenses))}
          ${m("Monthly profit",money(d.profit))}
          ${m("Products",d.products)}
          ${m("Low stock",d.lowStock)}
          ${m("Out of stock",d.outOfStock)}
          ${m("Pending lay-bys",d.pendingLaybys)}
        </div>
      </section>
      <section class="dashboard-columns">
        <div class="panel"><div class="section-heading"><div><p class="eyebrow">REORDER WATCH</p><h2>Stock alerts</h2></div><a href="inventory.html">Manage stock</a></div>
          ${d.inventoryAlerts.length?`<div class="alert-list">${d.inventoryAlerts.map(p=>`<div class="alert-row"><span><strong>${esc(p.name)}</strong><small>Reorder level: ${p.lowStock}</small></span><span class="${p.quantity<=0?"status-out":"status-low"}">${p.quantity<=0?"Out of stock":`${p.quantity} left`}</span></div>`).join("")}</div>`:'<p class="empty-state">All products are above their reorder levels.</p>'}
        </div>
        <div class="panel"><div class="section-heading"><div><p class="eyebrow">LATEST ACTIVITY</p><h2>Recent sales</h2></div><a href="sales.html">View sales</a></div>
          ${d.recentSales.length?`<div class="table-wrap"><table><thead><tr><th>Product</th><th>Total</th><th>Date</th></tr></thead><tbody>${d.recentSales.map(s=>`<tr><td>${esc(s.productName)}</td><td>${money(s.total)}</td><td>${new Date(s.date).toLocaleString()}</td></tr>`).join("")}</tbody></table></div>`:'<p class="empty-state">Sales will appear here once recorded.</p>'}
        </div>
      </section>`;
  }catch(error){
    dashboardPage.innerHTML=`<div class="panel error-panel"><h2>Dashboard could not be loaded</h2><p>${esc(error.message)}</p><button onclick="location.reload()">Try again</button></div>`;
  }
})();
function m(label,value,detail=""){
  return `<div class="card metric"><span class="muted">${label}</span><strong>${value}</strong>${detail?`<small>${detail}</small>`:""}</div>`;
}
