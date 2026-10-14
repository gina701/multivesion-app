shell("Lay-by");
const laybyPage=document.getElementById("page");

(async()=>{
  try{
    const products=await api("/api/admin/products");
    laybyPage.innerHTML=`<div class="panel"><h2>New lay-by</h2><div class="form-grid"><label>Customer name<input id="cn" required></label><label>Phone<input id="cp"></label><label>Product<select id="prod">${products.map(product=>`<option value="${esc(product.id)}" data-price="${Number(product.price)||0}">${esc(product.name)} — ${money(product.price)}</option>`).join("")}</select></label><label>Agreed price<input id="price" type="number" min="0" step="0.01" required></label><label>Branch ID<input id="branch"></label></div><br><button onclick="createLayby()">Create lay-by</button></div><div id="list" class="panel"></div>`;
    const productSelect=document.getElementById("prod");
    const priceInput=document.getElementById("price");
    productSelect.addEventListener("change",()=>{priceInput.value=productSelect.selectedOptions[0]?.dataset.price||""});
    if(productSelect.options.length)priceInput.value=productSelect.selectedOptions[0].dataset.price;
    await load();
  }catch(error){laybyPage.innerHTML=`<div class="panel error-panel">${esc(error.message)}</div>`}
})();

async function load(){
  try{
    const laybys=await api("/api/admin/laybys");
    const list=document.getElementById("list");
    if(!list)return;
    list.innerHTML=laybys.length?`<div class="table-wrap"><table><thead><tr><th>Customer</th><th>Product</th><th>Agreed</th><th>Paid</th><th>Balance</th><th>Status</th><th></th></tr></thead><tbody>${laybys.map(layby=>`<tr><td>${esc(layby.customerName)}</td><td>${esc(layby.productName)}</td><td>${money(layby.agreedPrice)}</td><td>${money(layby.amountPaid)}</td><td>${money(layby.balance)}</td><td>${esc(layby.status)}</td><td>${layby.balance?`<button onclick="pay('${esc(layby.id)}')">Payment</button>`:"Done"}</td></tr>`).join("")}</tbody></table></div>`:'<p class="empty-state">No lay-bys have been recorded yet.</p>';
  }catch(error){const list=document.getElementById("list");if(list)list.textContent=error.message}
}

window.createLayby=async()=>{
  const customerName=document.getElementById("cn").value.trim();
  const selectedProduct=document.getElementById("prod").selectedOptions[0];
  const agreedPrice=Number(document.getElementById("price").value);
  if(!customerName||!selectedProduct||!Number.isFinite(agreedPrice)||agreedPrice<=0){alert("Enter a customer name, choose a product and set an agreed price greater than zero.");return}
  try{
    await api("/api/admin/laybys",{method:"POST",body:JSON.stringify({customerName,phone:document.getElementById("cp").value,productId:selectedProduct.value,productName:selectedProduct.textContent.split(" — ")[0],agreedPrice,branchId:document.getElementById("branch").value})});
    document.getElementById("cn").value="";
    document.getElementById("cp").value="";
    await load();
  }catch(error){alert(error.message)}
};

window.pay=async id=>{
  const amount=prompt("Payment amount");
  if(amount===null||amount.trim()==="")return;
  const paymentAmount=Number(amount);
  if(!Number.isFinite(paymentAmount)||paymentAmount<=0){alert("Enter a payment amount greater than zero.");return}
  try{
    const layby=await api(`/api/admin/laybys/${encodeURIComponent(id)}/payment`,{method:"POST",body:JSON.stringify({amount:paymentAmount})});
    alert(`Payment recorded. Receipt: ${layby.receiptNumbers.at(-1)}`);
    await load();
  }catch(error){alert(error.message)}
};
