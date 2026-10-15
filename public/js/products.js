shell("Products");
const productsPage=document.getElementById("page");
let products=[];

productsPage.innerHTML=`<div class="products-intro"><div><p class="eyebrow">CATALOGUE</p><h2>Keep your product range up to date</h2><p>Update pricing and stock or add clear photos for your shop catalogue.</p></div><button type="button" data-action="add">Add product</button></div><div class="toolbar"><input id="search" type="search" placeholder="Search name, category or SKU" aria-label="Search products"><span id="product-count" class="muted" aria-live="polite"></span></div><div id="list"></div><div id="editor"></div>`;
const searchInput=productsPage.querySelector("#search");
const productList=productsPage.querySelector("#list");
const editor=productsPage.querySelector("#editor");

searchInput.addEventListener("input",render);
window.addEventListener("appuserloaded",render);
productsPage.addEventListener("click",event=>{
  const button=event.target.closest("button[data-action]");
  if(!button)return;
  const {action,id}=button.dataset;
  if(action==="add")newP();
  if(action==="edit")edit(id);
  if(action==="photo")photo(id);
  if(action==="cancel")editor.replaceChildren();
  if(action==="delete")removeP(id);
});
editor.addEventListener("submit",event=>{
  if(event.target.matches("[data-product-form]"))saveP(event);
  if(event.target.matches("[data-photo-form]"))upload(event);
});
editor.addEventListener("change",event=>{
  if(event.target.matches("#file"))previewPhoto(event.target);
});

async function load(){
  try{
    products=await api("/api/admin/products");
    render();
  }catch(error){
    productList.innerHTML=`<div class="panel error-panel">${esc(error.message)}</div>`;
  }
}

function render(){
  const query=searchInput.value.trim().toLocaleLowerCase();
  const filtered=products.filter(product=>[product.name,product.category,product.sku].some(value=>String(value||"").toLocaleLowerCase().includes(query)));
  const canManageProducts=window.currentUser?.role==="ADMIN";
  productsPage.querySelector("#product-count").textContent=`${filtered.length} of ${products.length} products`;
  productsPage.querySelector('[data-action="add"]').hidden=!canManageProducts;
  productList.innerHTML=filtered.length?`${!canManageProducts?'<p class="permission-note">You have view-only access to products. Ask an administrator to edit details or upload photos.</p>':""}<div class="table-wrap"><table><thead><tr><th>Photo</th><th>Name</th><th>Category</th><th>Price</th><th>Qty</th><th>Public</th>${canManageProducts?"<th>Actions</th>":""}</tr></thead><tbody>${filtered.map(product=>`<tr><td>${product.imageUrl?`<img class="product-img" src="${esc(product.imageUrl)}" alt="${esc(product.name)}">`:'<span class="product-placeholder" aria-label="No photo">＋</span>'}</td><td><strong>${esc(product.name)}</strong><small class="product-sku">${esc(product.sku||"No SKU")}</small></td><td>${esc(product.category)}</td><td>${money(product.price)}</td><td>${product.quantity}</td><td><span class="visibility-badge ${product.publicVisible?"is-visible":"is-hidden"}">${product.publicVisible?"Visible":"Hidden"}</span></td>${canManageProducts?`<td><div class="product-actions"><button type="button" class="secondary" data-action="edit" data-id="${esc(product.id)}">Edit</button><button type="button" class="secondary" data-action="photo" data-id="${esc(product.id)}">Photo</button><button type="button" class="danger" data-action="delete" data-id="${esc(product.id)}">Delete</button></div></td>`:""}</tr>`).join("")}</tbody></table></div>`:`${!canManageProducts?'<p class="permission-note">You have view-only access to products. Ask an administrator to edit details or upload photos.</p>':""}<div class="panel empty-state">${query?"No products match your search.":canManageProducts?"No products yet. Add your first product to get started.":"No products have been added yet."}</div>`;
}

function form(product={}){
  return `<section class="panel product-editor"><div class="section-heading"><div><p class="eyebrow">${product.id?"PRODUCT DETAILS":"NEW PRODUCT"}</p><h2>${product.id?"Edit product":"Add product"}</h2></div></div><form data-product-form data-product-id="${esc(product.id||"")}"><div class="form-grid"><label>Name<input name="name" value="${esc(product.name)}" required></label><label>Category<input name="category" value="${esc(product.category||"Other Electronics")}" required></label><label>Selling price<input name="price" type="number" min="0" step="0.01" value="${Number(product.price)||0}" required></label><label>Purchase price<input name="purchasePrice" type="number" min="0" step="0.01" value="${Number(product.purchasePrice)||0}" required></label><label>Quantity<input name="quantity" type="number" min="0" step="1" value="${Number(product.quantity)||0}" required></label><label>Low stock level<input name="lowStock" type="number" min="0" step="1" value="${Number(product.lowStock)||0}"></label><label class="full">Description<textarea name="description">${esc(product.description)}</textarea></label><label class="checkbox-label"><input name="publicVisible" type="checkbox" ${product.publicVisible!==false?"checked":""}> Show on public website</label><label class="checkbox-label"><input name="available" type="checkbox" ${product.available!==false?"checked":""}> Available for sale</label></div><div class="editor-actions"><button type="submit">Save product</button><button type="button" class="secondary" data-action="cancel">Cancel</button></div></form></section>`;
}

function newP(){editor.innerHTML=form();editor.querySelector("[name=name]").focus()}
function edit(id){
  if(window.currentUser?.role!=="ADMIN"){alert("Only administrators can edit products.");return}
  const product=products.find(item=>item.id===id);
  if(!product){alert("This product is no longer in the catalogue. Refresh the page and try again.");return}
  editor.innerHTML=form(product);
  editor.scrollIntoView({behavior:"smooth",block:"start"});
  editor.querySelector("[name=name]").focus({preventScroll:true});
}

async function saveP(event){
  event.preventDefault();
  const formElement=event.target;
  const formData=new FormData(formElement);
  const productId=formElement.dataset.productId;
  const data={
    name:String(formData.get("name")||"").trim(),
    category:String(formData.get("category")||"").trim(),
    price:Number(formData.get("price")),
    purchasePrice:Number(formData.get("purchasePrice")),
    quantity:Number(formData.get("quantity")),
    lowStock:Number(formData.get("lowStock")),
    description:String(formData.get("description")||""),
    publicVisible:formData.has("publicVisible"),
    available:formData.has("available")
  };
  if(!data.name||!data.category||![data.price,data.purchasePrice,data.quantity,data.lowStock].every(Number.isFinite)||data.price<0||data.purchasePrice<0||data.quantity<0||!Number.isInteger(data.quantity)||data.lowStock<0||!Number.isInteger(data.lowStock)){
    alert("Check the product details. Prices and quantities must be valid non-negative numbers.");
    return;
  }
  const saveButton=formElement.querySelector('[type="submit"]');
  saveButton.disabled=true;
  saveButton.textContent="Saving…";
  try{
    await api(productId?`/api/admin/products/${encodeURIComponent(productId)}`:"/api/admin/products",{method:productId?"PUT":"POST",body:JSON.stringify(data)});
    editor.replaceChildren();
    await load();
  }catch(error){
    alert(error.message);
    saveButton.disabled=false;
    saveButton.textContent="Save product";
  }
}

function photo(id){
  if(window.currentUser?.role!=="ADMIN"){alert("Only administrators can upload product photos.");return}
  const product=products.find(item=>item.id===id);
  if(!product){alert("This product is no longer in the catalogue. Refresh the page and try again.");return}
  editor.innerHTML=`<section class="panel product-editor"><div class="section-heading"><div><p class="eyebrow">PRODUCT IMAGE</p><h2>Update photo</h2></div></div><form data-photo-form data-product-id="${esc(id)}"><p class="muted">Choose a JPG, PNG, WebP or GIF image up to 5 MB for <strong>${esc(product.name)}</strong>.</p><label class="photo-drop"><span class="photo-preview" id="photo-preview">${product.imageUrl?`<img src="${esc(product.imageUrl)}" alt="Current photo of ${esc(product.name)}">`:"＋"}</span><span class="photo-help">Tap to choose a photo<input id="file" name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required></span></label><p id="photo-status" class="hint" aria-live="polite"></p><div class="editor-actions"><button type="submit">Upload photo</button><button type="button" class="secondary" data-action="cancel">Cancel</button></div></form></section>`;
  editor.scrollIntoView({behavior:"smooth",block:"start"});
}

function previewPhoto(input){
  const file=input.files[0];
  const status=editor.querySelector("#photo-status");
  const preview=editor.querySelector("#photo-preview");
  if(!file)return;
  if(!["image/jpeg","image/png","image/webp","image/gif"].includes(file.type)){
    input.value="";
    status.textContent="Choose a JPG, PNG, WebP or GIF image.";
    return;
  }
  if(file.size>5*1024*1024){
    input.value="";
    status.textContent="The image must be smaller than 5 MB.";
    return;
  }
  preview.innerHTML="";
  const image=document.createElement("img");
  image.alt="Selected product photo preview";
  image.src=URL.createObjectURL(file);
  image.addEventListener("load",()=>URL.revokeObjectURL(image.src),{once:true});
  preview.append(image);
  status.textContent=`${file.name} · ${(file.size/1024/1024).toFixed(2)} MB`;
}

async function upload(event){
  event.preventDefault();
  if(window.currentUser?.role!=="ADMIN"){alert("Only administrators can upload product photos.");return}
  const formElement=event.target;
  const fileInput=formElement.querySelector("#file");
  const file=fileInput.files[0];
  if(!file){alert("Choose a photo first.");return}
  if(file.size>5*1024*1024){alert("The image must be smaller than 5 MB.");return}
  const button=formElement.querySelector('[type="submit"]');
  button.disabled=true;
  button.textContent="Uploading…";
  const formData=new FormData();
  formData.append("image",file);
  try{
    const response=await fetch(`/api/admin/products/${encodeURIComponent(formElement.dataset.productId)}/image`,{method:"POST",headers:{"Authorization":"Bearer "+token()},body:formData});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(data.error||"Photo upload failed");
    editor.replaceChildren();
    await load();
  }catch(error){
    alert(error.message);
    button.disabled=false;
    button.textContent="Upload photo";
  }
}

async function removeP(id){
  if(window.currentUser?.role!=="ADMIN"){alert("Only administrators can delete products.");return}
  const product=products.find(item=>item.id===id);
  if(!confirm(`Delete ${product?.name||"this product"}?`))return;
  try{await api(`/api/admin/products/${encodeURIComponent(id)}`,{method:"DELETE"});await load()}
  catch(error){alert(error.message)}
}

load();
