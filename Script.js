const API = `${window.location.origin}/api`;

let cart = JSON.parse(localStorage.getItem("cart")) || [];

/* =========================
   HELPERS
========================= */
function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeInlineJson(obj) {
  return JSON.stringify(obj).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function getEl(id) {
  return document.getElementById(id);
}

async function apiFetch(path, options = {}) {
  return fetch(`${API}${path}`, options);
}

/* =========================
   SECTION SWITCH
========================= */
function show(id) {
  document.querySelectorAll(".section").forEach(sec => {
    sec.classList.remove("active");
  });

  const el = getEl(id);
  if (el) el.classList.add("active");
}

/* =========================
   LOAD DOCUMENTS
========================= */
async function loadDocs() {
  try {
    const q = getEl("search")?.value?.trim() || "";
    const industry = getEl("industryFilter")?.value || "";
    const category = getEl("categoryFilter")?.value?.trim() || "";
    const consultancy = getEl("consultancyFilter")?.value || "";

    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (industry) params.set("industry", industry);
    if (category) params.set("category", category);
    if (consultancy) params.set("consultancy", consultancy);

    const path = `/documents/marketplace${params.toString() ? `?${params.toString()}` : ""}`;
    const res = await apiFetch(path);

    if (!res.ok) {
      throw new Error(`Marketplace API failed: ${res.status}`);
    }

    const data = await res.json();

    const box = getEl("docs");
    if (!box) return;

    box.innerHTML = "";

    if (!Array.isArray(data) || data.length === 0) {
      box.innerHTML = `<div class="card">No documents found ❌</div>`;
      return;
    }

    data.forEach(doc => {
      const safeDoc = safeInlineJson(doc);
      const tagsText = Array.isArray(doc.tags) ? doc.tags.join(", ") : (doc.tags || "N/A");

      box.innerHTML += `
        <div class="card">
          <h3>${escapeHTML(doc.title)}</h3>
          <p>💰 Price: ₹${escapeHTML(doc.price)}</p>
          <p>🏭 Industry: ${escapeHTML(doc.industry || "General")}</p>
          <p>📂 Category: ${escapeHTML(doc.category || "Other")}</p>
          <p>🏷️ Tags: ${escapeHTML(tagsText)}</p>
          <p>🎥 Consultancy: ${doc.consultancyAvailable ? "Available ✅" : "Not Available ❌"}</p>
          ${doc.consultancyMode ? `<p>📞 Mode: ${escapeHTML(doc.consultancyMode)}</p>` : ""}
          ${Number(doc.consultancyRate) > 0 ? `<p>⏱️ Rate: ₹${escapeHTML(doc.consultancyRate)}/hr</p>` : ""}

          <button onclick="window.open('${API}/documents/file/${doc._id}', '_blank')">
            📄 View
          </button>

          <a href="${API}/documents/download/${doc._id}" target="_blank" rel="noopener">
            ⬇️ Download
          </a>

          <button onclick='addToCart(${safeDoc})'>
            🛒 Add to Cart
          </button>
        </div>
      `;
    });
  } catch (err) {
    console.error("Load Error:", err);
    const box = getEl("docs");
    if (box) box.innerHTML = `<div class="card">Marketplace load failed ❌</div>`;
  }
}

/* =========================
   UPLOAD DOCUMENT
========================= */
async function uploadDoc() {
  try {
    const fileInput = getEl("file");

    if (!fileInput || !fileInput.files || !fileInput.files.length) {
      alert("File select kar ❌");
      return;
    }

    const fd = new FormData();
    fd.append("title", getEl("title")?.value || "Untitled");
    fd.append("price", getEl("price")?.value || 0);
    fd.append("description", getEl("description")?.value || "");
    fd.append("industry", getEl("industry")?.value || "Oil & Gas");
    fd.append("category", getEl("category")?.value || "");
    fd.append("tags", getEl("tags")?.value || "");
    fd.append("consultancyAvailable", getEl("consultancyAvailable")?.checked ? "true" : "false");
    fd.append("consultancyMode", getEl("consultancyMode")?.value || "");
    fd.append("consultancyRate", getEl("consultancyRate")?.value || 0);
    fd.append("file", fileInput.files[0]);

    const res = await apiFetch("/documents/upload", {
      method: "POST",
      body: fd
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      alert("Uploaded ✅");

      ["title", "price", "description", "category", "tags", "consultancyRate"].forEach(id => {
        const el = getEl(id);
        if (el) el.value = "";
      });

      const industry = getEl("industry");
      if (industry) industry.value = "Oil & Gas";

      const consultancyMode = getEl("consultancyMode");
      if (consultancyMode) consultancyMode.value = "";

      const consultancyAvailable = getEl("consultancyAvailable");
      if (consultancyAvailable) consultancyAvailable.checked = false;

      fileInput.value = "";

      await loadDocs();
      show("market");
    } else {
      alert(data.message || "Upload failed ❌");
    }
  } catch (err) {
    console.error("Upload Error:", err);
    alert("Upload failed ❌");
  }
}

/* =========================
   CART SYSTEM
========================= */
function addToCart(doc) {
  const exists = cart.find(item => item._id === doc._id);

  if (exists) {
    alert("Already in cart 🛒");
    return;
  }

  cart.push(doc);
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
  showCart();

  alert("Added to cart 🛒");
}

function updateCartCount() {
  const el = getEl("cartCount");
  if (el) {
    el.innerText = cart.length;
  }
}

function showCart() {
  const box = getEl("cartItems");
  if (!box) return;

  let total = 0;
  box.innerHTML = "";

  cart.forEach(item => {
    total += Number(item.price || 0);
    box.innerHTML += `
      <div class="card">
        <strong>${escapeHTML(item.title)}</strong><br>
        ₹${escapeHTML(item.price)}
      </div>
    `;
  });

  const totalEl = getEl("total");
  if (totalEl) totalEl.innerText = "Total ₹" + total;
}

function payNow() {
  alert("Integrate Razorpay backend here 💳");
}

/* =========================
   CONSULTANCY
========================= */
function bookMeeting() {
  const email = getEl("email")?.value || "";
  const date = getEl("date")?.value || "";
  const note = getEl("consultNote")?.value || "";

  alert(`Meeting request saved ✅\nEmail: ${email}\nDate: ${date}\nNote: ${note}`);
}

/* =========================
   ADMIN
========================= */
function adminLogin() {
  const adminUser = getEl("adminUser")?.value || "";
  const adminPass = getEl("adminPass")?.value || "";

  if (adminUser === "admin" && adminPass === "123") {
    alert("Admin login success 🔐");
  } else {
    alert("Wrong credentials ❌");
  }
}

/* =========================
   CHART
========================= */
function initChart() {
  const canvas = getEl("chart");
  if (!canvas || typeof Chart === "undefined") return;

  new Chart(canvas, {
    type: "line",
    data: {
      labels: ["Jan", "Feb", "Mar"],
      datasets: [
        {
          data: [10, 30, 50]
        }
      ]
    }
  });
}

/* =========================
   INIT
========================= */
window.addEventListener("load", () => {
  loadDocs();
  updateCartCount();
  initChart();
});