document.addEventListener("DOMContentLoaded", async () => {
  const id = new URLSearchParams(location.search).get("id"), el = document.getElementById("productDetail");
  if (!id) { el.innerHTML = "<p>Product not found.</p>"; return; }
  try {
    const p = await api("/api/products/" + encodeURIComponent(id));
    const specs = Object.entries(p.specifications || {}).map(([k,v]) => `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</li>`).join("");
    const image = p.imageUrl ? `<img class="detail-image" src="${p.imageUrl}" alt="${escapeHtml(p.name)}">` : placeholder(p.name);
    el.innerHTML = `<div class="detail">${image}<div><span class="tag">${escapeHtml(p.category)}</span><h1>${escapeHtml(p.name)}</h1><div class="price big">${money(p.price)}</div><p>${escapeHtml(p.description || "")}</p><ul class="specs">${specs}</ul><p class="${p.available ? "available" : "unavailable"}">${p.available ? "Available" : "Currently unavailable"}</p><div class="actions"><a class="button" href="${waLink(p)}">WhatsApp enquiry</a><a class="button outline" href="tel:+265992282807">Call</a></div></div></div>`;
  } catch(e) { el.innerHTML = '<p>Product unavailable. Please contact Multivision on WhatsApp.</p>'; }
});
