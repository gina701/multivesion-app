let allProducts = [];
document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("products"), search = document.getElementById("search"), category = document.getElementById("category"), status = document.getElementById("status");
  try {
    allProducts = await api("/api/products");
    [...new Set(allProducts.map(p => p.category))].sort().forEach(c => category.insertAdjacentHTML("beforeend", `<option>${escapeHtml(c)}</option>`));
    render();
    search.oninput = render; category.onchange = render;
  } catch(e) { status.textContent = "Catalogue is temporarily unavailable. Please contact us on WhatsApp."; }
  function render() {
    const q = search.value.toLowerCase().trim(), c = category.value;
    const filtered = allProducts.filter(p => (!q || `${p.name} ${p.category} ${p.description} ${JSON.stringify(p.specifications)}`.toLowerCase().includes(q)) && (!c || p.category === c));
    status.textContent = `${filtered.length} product${filtered.length === 1 ? "" : "s"} found`;
    grid.innerHTML = filtered.map(productCard).join("") || '<p class="muted">No matching products.</p>';
  }
});
