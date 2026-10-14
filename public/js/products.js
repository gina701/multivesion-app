shell("Products");
const productsPage=document.getElementById("page");
let products=[];

productsPage.innerHTML=`<div class="toolbar"><button onclick="newP()">Add product</button><input id="search" type="search" placeholder="Search name, category or SKU" aria-label="Search products"></div><div id="list"></div><div id="editor"></div>`;
const searchInput=document.getElementById("search");
searchInput.addEventListener("input",render);

async function load(){
  try{
    products=await api("/api/admin/products");
    render();
  }catch(error){
    document.getElementById("list").innerHTML=`<div class="panel error-panel">${esc(error.message)}</div>`;
  }
}

function render(){
  const query=searchInput.value.trim().toLocaleLowerCase();
  const filtered=products.filter(product=>[product.name,product.category,product.sku].some(value=>String(value||"").toLocaleLowerCase().includes(query)));
  const list=document.getElementById("list");
  list.innerHTML=filtered.length?`<div class="table-wrap"><table><thead><tr><th>Photo</th><th>Name</th><th>Category</th><th>Price</th><th>Qty</th><th>Public</th><th>Actions</th></tr></thead><tbody>${filtered.map(product=>`<tr><td>${product.imageUrl?`<img class="product-img" src="${esc(product.imageUrl)}" alt="">`:"—"}</td><td>${esc(product.name)}</td><td>${esc(product.category)}</td><td>${money(product.price)}</td><td>${product.quantity}</td><td>${product.publicVisible?"Yes":"No"}</td><td><button onclick="edit('${product.id}')">Edit</button> <button onclick="photo('${product.id}')">Photo</button> <button class="danger" onclick="removeP('${product.id}')">Delete</button></td></tr>`).join("")}</tbody></table></div>`:`<div class="panel empty-state">${query?"No products match your search.":"No products yet. Add your first product to get started."}</div>`;
}

function form(product={}){
  return `<div class="panel"><h2>${product.id?"Edit":"Add"} product</h2><div class="form-grid"><label>Name<input id="pn" value="${esc(product.name)}" required></label><label>Category<input id="pc" value="${esc(product.category||"Other Electronics")}" required></label><label>Price<input id="pp" type="number" min="0" step="0.01" value="${product.price||0}"></label><label>Purchase price<input id="buy" type="number" min="0" step="0.01" value="${product.purchasePrice||0}"></label><label>Quantity<input id="qty" type="number" min="0" step="1" value="${product.quantity||0}"></label><label>Low stock level<input id="low" type="number" min="0" step="1" value="${product.lowStock||2}"></label><label class="full">Description<textarea id="desc">${esc(product.description)}</textarea></label><label><input id="pub" type="checkbox" ${product.publicVisible!==false?"checked":""}> Public website</label><label><input id="avail" type="checkbox" ${product.available!==false?"checked":""}> Available</label></div><br><button onclick="saveP('${product.id||""}')">Save product</button> <button class="secondary" onclick="document.getElementById('editor').replaceChildren()">Cancel</button></div>`;
}

function newP(){document.getElementById("editor").innerHTML=form()}
function edit(id){document.getElementById("editor").innerHTML=form(products.find(product=>product.id===id))}

async function saveP(id){
  const editor=document.getElementById("editor");
  const name=document.getElementById("pn").value.trim();
  if(!name){alert("Enter a product name.");return}
  const data={
    name,
    category:document.getElementById("pc").value.trim(),
    price:Number(document.getElementById("pp").value),
    purchasePrice:Number(document.getElementById("buy").value),
    quantity:Number(document.getElementById("qty").value),
    lowStock:Number(document.getElementById("low").value),
    description:document.getElementById("desc").value,
    publicVisible:document.getElementById("pub").checked,
    available:document.getElementById("avail").checked
  };
  try{
    await api(id?`/api/admin/products/${encodeURIComponent(id)}`:"/api/admin/products",{method:id?"PUT":"POST",body:JSON.stringify(data)});
    editor.replaceChildren();
    await load();
  }catch(error){alert(error.message)}
}

function photo(id){
  document.getElementById("editor").innerHTML=`<div class="panel"><h3>Upload product photo</h3><input id="file" type="file" accept="image/*"><button onclick="upload('${id}')">Upload</button> <button class="secondary" onclick="document.getElementById('editor').replaceChildren()">Cancel</button></div>`;
}

async function upload(id){
  const fileInput=document.getElementById("file");
  const selectedFile=fileInput.files[0];
  if(!selectedFile){alert("Choose an image");return}
  const formData=new FormData();
  formData.append("image",selectedFile);
  try{
    const response=await fetch(`/api/admin/products/${encodeURIComponent(id)}/image`,{method:"POST",headers:{"Authorization":"Bearer "+token()},body:formData});
    const data=await response.json();
    if(!response.ok)throw Error(data.error||"Photo upload failed");
    document.getElementById("editor").replaceChildren();
    await load();
  }catch(error){alert(error.message)}
}

async function removeP(id){
  if(!confirm("Delete this product?"))return;
  try{await api(`/api/admin/products/${encodeURIComponent(id)}`,{method:"DELETE"});await load()}
  catch(error){alert(error.message)}
}

load();
