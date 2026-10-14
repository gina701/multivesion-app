shell("Expenses");
const expensePage=document.getElementById("page");
expensePage.innerHTML=`<div class="panel"><h2>Record expense</h2><div class="form-grid"><label>Name<input id="expenseName" required></label><label>Category<input id="category" required></label><label>Amount<input id="amount" type="number" min="0" step="0.01" required></label><label>Branch ID<input id="branch"></label><label class="full">Description<textarea id="description"></textarea></label></div><button onclick="saveExpense()">Save expense</button></div><div id="list" class="panel"></div>`;
async function load(){
  try{
    const expenses=await api("/api/admin/expenses");
    document.getElementById("list").innerHTML=`<div class="table-wrap"><table><thead><tr><th>Name</th><th>Category</th><th>Amount</th><th>Date</th></tr></thead><tbody>${expenses.map(expense=>`<tr><td>${esc(expense.name)}</td><td>${esc(expense.category)}</td><td>${money(expense.amount)}</td><td>${new Date(expense.date).toLocaleString()}</td></tr>`).join("")}</tbody></table></div>`;
  }catch(error){document.getElementById("list").textContent=error.message}
}
async function saveExpense(){
  const expenseName=document.getElementById("expenseName").value.trim();
  const category=document.getElementById("category").value.trim();
  const amount=Number(document.getElementById("amount").value);
  if(!expenseName||!category||!Number.isFinite(amount)||amount<=0){alert("Enter an expense name, category and an amount greater than zero.");return}
  try{
    await api("/api/admin/expenses",{method:"POST",body:JSON.stringify({name:expenseName,category,amount,branchId:document.getElementById("branch").value,description:document.getElementById("description").value})});
    document.getElementById("expenseName").value="";
    document.getElementById("amount").value="";
    document.getElementById("description").value="";
    await load();
  }catch(error){alert(error.message)}
}
load();
