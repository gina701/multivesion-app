shell("Dashboard");
const dashboardPage=document.getElementById("page");

(async()=>{
  try{
    const data=await api("/api/admin/dashboard");
    dashboardPage.innerHTML=`
      <section class="dashboard-hero">
        <div><p class="eyebrow">BUSINESS OVERVIEW</p><h2>Your shop at a glance</h2><p>Sales trends, stock value and the items that need your attention.</p></div>
        <nav class="quick-actions" aria-label="Quick actions">
          <a class="action-link" href="sales.html">Record a sale</a>
          <a class="action-link" href="products.html">Add a product</a>
          <a class="action-link action-link-light" href="inventory.html">Receive stock</a>
        </nav>
      </section>
      <section class="dashboard-section">
        <div class="section-heading"><div><p class="eyebrow">INVENTORY VALUE</p><h2>Stock on hand</h2></div><a href="inventory.html">View inventory</a></div>
        <div class="grid stock-grid">
          ${metric("Stock at cost",money(data.stockCostValue),"What you paid for current stock")}
          ${metric("Potential retail value",money(data.stockRetailValue),"Value if all stock is sold")}
          ${metric("Units in stock",Number(data.stockUnits||0).toLocaleString("en-US"),"Total sellable quantity")}
        </div>
      </section>
      <section class="dashboard-section">
        <div class="section-heading"><div><p class="eyebrow">PERFORMANCE</p><h2>Sales & operations</h2></div><a href="reports.html">Open reports</a></div>
        <div class="grid">
          ${metric("Today's sales",money(data.todaySales))}
          ${metric("Monthly sales",money(data.monthlySales))}
          ${metric("Monthly expenses",money(data.expenses))}
          ${metric("Monthly profit",money(data.profit))}
          ${metric("Products",data.products)}
          ${metric("Low stock",data.lowStock)}
          ${metric("Out of stock",data.outOfStock)}
          ${metric("Pending lay-bys",data.pendingLaybys)}
        </div>
      </section>
      <section class="insights-grid">
        <div class="panel chart-panel">
          <div class="section-heading"><div><p class="eyebrow">LAST 7 DAYS</p><h2>Sales trend</h2></div><span class="trend-badge ${trendClass(data.salesChangePercent)}">${trendText(data.salesChangePercent)}</span></div>
          ${salesChart(data.salesTrend||[])}
          <div class="chart-summary"><span>Sales this week <strong>${money(data.lastWeekSales)}</strong></span><span>Average sale <strong>${money(data.averageSale)}</strong></span></div>
        </div>
        <div class="panel chart-panel">
          <div class="section-heading"><div><p class="eyebrow">PRODUCT INSIGHTS</p><h2>Best sellers</h2></div><a href="reports.html">Full reports</a></div>
          ${topProductsChart(data.topProducts||[])}
        </div>
      </section>
      <section class="dashboard-columns">
        <div class="panel"><div class="section-heading"><div><p class="eyebrow">REORDER WATCH</p><h2>Stock alerts</h2></div><a href="inventory.html">Manage stock</a></div>
          ${data.inventoryAlerts.length?`<div class="alert-list">${data.inventoryAlerts.map(product=>`<div class="alert-row"><span><strong>${esc(product.name)}</strong><small>Reorder level: ${product.lowStock}</small></span><span class="${product.quantity<=0?"status-out":"status-low"}">${product.quantity<=0?"Out of stock":`${product.quantity} left`}</span></div>`).join("")}</div>`:'<p class="empty-state">All products are above their reorder levels.</p>'}
        </div>
        <div class="panel"><div class="section-heading"><div><p class="eyebrow">LATEST ACTIVITY</p><h2>Recent sales</h2></div><a href="sales.html">View sales</a></div>
          ${data.recentSales.length?`<div class="table-wrap"><table><thead><tr><th>Product</th><th>Total</th><th>Date</th></tr></thead><tbody>${data.recentSales.map(sale=>`<tr><td>${esc(sale.productName)}</td><td>${money(sale.total)}</td><td>${new Date(sale.date).toLocaleString()}</td></tr>`).join("")}</tbody></table></div>`:'<p class="empty-state">Sales will appear here once recorded.</p>'}
        </div>
      </section>`;
  }catch(error){
    dashboardPage.innerHTML=`<div class="panel error-panel"><h2>Dashboard could not be loaded</h2><p>${esc(error.message)}</p><button type="button" onclick="location.reload()">Try again</button></div>`;
  }
})();

function metric(label,value,detail=""){
  return `<div class="card metric"><span class="muted">${label}</span><strong>${value}</strong>${detail?`<small>${detail}</small>`:""}</div>`;
}

function trendClass(change){
  return change===null?"trend-neutral":change>=0?"trend-positive":"trend-negative";
}

function trendText(change){
  if(change===null)return "No comparison yet";
  return `${change>0?"+":""}${change}% vs last week`;
}

function salesChart(trend){
  const points=trend.slice(-7);
  if(!points.length)return '<p class="empty-state">Sales trends will appear here as sales are recorded.</p>';
  const width=700,height=230,left=54,right=22,top=22,bottom=38,plotHeight=height-top-bottom,plotWidth=width-left-right;
  const maxValue=Math.max(1,...points.map(point=>Number(point.total)||0));
  const valueAt=index=>Number(points[index].total)||0;
  const coords=points.map((point,index)=>({
    x:left+(points.length===1?plotWidth/2:index*plotWidth/(points.length-1)),
    y:top+plotHeight-(valueAt(index)/maxValue)*plotHeight
  }));
  const path=coords.map((point,index)=>`${index===0?"M":"L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const fillPath=`${path} L ${coords.at(-1).x.toFixed(1)} ${height-bottom} L ${coords[0].x.toFixed(1)} ${height-bottom} Z`;
  const grid=[0,.5,1].map(fraction=>{
    const y=top+plotHeight*(1-fraction);
    return `<line class="chart-gridline" x1="${left}" y1="${y}" x2="${width-right}" y2="${y}"/><text class="chart-axis-label" x="${left-9}" y="${y+4}" text-anchor="end">${compactMoney(maxValue*fraction)}</text>`;
  }).join("");
  const labels=points.map((point,index)=>{
    const x=coords[index].x,date=new Date(`${point.date}T12:00:00Z`),label=new Intl.DateTimeFormat(undefined,{weekday:"short",timeZone:"UTC"}).format(date);
    return `<text class="chart-axis-label" x="${x}" y="${height-12}" text-anchor="middle">${label}</text>`;
  }).join("");
  const circles=coords.map((point,index)=>`<circle class="chart-point" cx="${point.x}" cy="${point.y}" r="4"><title>${esc(points[index].date)}: ${money(valueAt(index))}</title></circle>`).join("");
  return `<div class="chart-scroll"><svg class="sales-chart" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="sales-chart-title sales-chart-description"><title id="sales-chart-title">Sales over the last seven days</title><desc id="sales-chart-description">Daily sales total in Malawi Kwacha.</desc><defs><linearGradient id="sales-gradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#3189d4" stop-opacity=".22"/><stop offset="100%" stop-color="#3189d4" stop-opacity=".01"/></linearGradient></defs>${grid}<path class="chart-area" d="${fillPath}"/><path class="chart-line" d="${path}"/>${circles}${labels}</svg></div>`;
}

function compactMoney(value){
  const amount=Number(value)||0;
  if(amount>=1000000)return `K${(amount/1000000).toFixed(1)}m`;
  if(amount>=1000)return `K${(amount/1000).toFixed(0)}k`;
  return `K${Math.round(amount)}`;
}

function topProductsChart(products){
  if(!products.length)return '<p class="empty-state">Product sales insights will appear here once sales are recorded.</p>';
  const maxQuantity=Math.max(1,...products.map(product=>Number(product.quantity)||0));
  return `<div class="bestseller-list">${products.map((product,index)=>{
    const quantity=Number(product.quantity)||0,percentage=Math.max(3,quantity/maxQuantity*100);
    return `<div class="bestseller"><div class="bestseller-heading"><span><i class="rank">${index+1}</i><strong>${esc(product.name)}</strong></span><span>${quantity} sold</span></div><div class="bestseller-track" role="img" aria-label="${esc(product.name)}: ${quantity} sold"><span style="width:${percentage.toFixed(1)}%"></span></div><small>${money(product.revenue)} revenue</small></div>`;
  }).join("")}</div>`;
}
