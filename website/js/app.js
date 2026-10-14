function money(value) {
  if (typeof value === "number") return "K" + value.toLocaleString("en-US");
  return String(value || "");
}
function waLink(product) {
  const text = `Hello Multivision Electronics & Investments, I am interested in ${product.name} listed at ${product.price}. Is it still available?`;
  return `https://wa.me/265992282807?text=${encodeURIComponent(text)}`;
}
function placeholder(name) {
  return `<div class="product-image placeholder">${String(name || "Product").slice(0,1).toUpperCase()}</div>`;
}
function productCard(p) {
  const img = p.imageUrl ? `<img class="product-image" src="${p.imageUrl}" alt="${escapeHtml(p.name)}">` : placeholder(p.name);
  return `<article class="product-card">${img}<div class="product-body">
    <span class="tag">${escapeHtml(p.category)}</span><h3>${escapeHtml(p.name)}</h3>
    <strong class="price">${money(p.price)}</strong><p>${escapeHtml(p.description || "")}</p>
    <p class="${p.available ? "available" : "unavailable"}">${p.available ? "Available" : "Currently unavailable"}</p>
    <div class="card-actions"><a class="small-button" href="product.html?id=${encodeURIComponent(p.id)}">Details</a><a class="small-button whatsapp" href="${waLink(p)}">WhatsApp</a></div>
  </div></article>`;
}
function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
async function api(path) {
  if (!API_BASE_URL || API_BASE_URL.includes("YOUR_RENDER")) throw new Error("API URL not configured");
  const res = await fetch(API_BASE_URL.replace(/\/$/, "") + path);
  if (!res.ok) throw new Error("API request failed");
  return res.json();
}
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("menuButton"), nav = document.getElementById("navLinks");
  if (btn && nav) btn.onclick = () => nav.classList.toggle("show");
  const featured = document.getElementById("featuredProducts");
  if (featured) api("/api/products?featured=true").then(data => {
    featured.innerHTML = data.slice(0,6).map(productCard).join("");
  }).catch(() => featured.innerHTML = '<p class="muted">Catalogue is temporarily unavailable. Please contact us on WhatsApp.</p>');
});
