"use strict";

/* =========================================================
   SAROJ&CO AUTHORITY MASTER CONTROL CENTER - CORE ENGINE
   Master Page Controller for Every Webpage, Catalog & Orders
   ========================================================= */

const API_BASE = (window.location.protocol.startsWith("http") && window.location.origin && window.location.origin !== "null")
  ? `${window.location.origin}/api`
  : "http://127.0.0.1:5000/api";

const KEY = {
  products: "nishu_products",
  settings: "nishu_settings",
  page_content: "nishu_page_content",
  coupons: "nishu_coupons",
  cart: "nishuCart",
  wish: "nishuWishlist",
  recent: "nishuRecent",
  coupon: "nishu_coupon",
  user: "nishu_user",
  accounts: "nishu_accounts",
  addr: "nishu_addresses",
  orders: "nishu_orders",
  msgs: "nishu_messages",
  news: "nishu_newsletter",
  faqs: "nishu_faqs",
  reviews: "nishu_reviews",
  customers: "nishu_customers"
};

// Unified storage manager
const store = {
  get(k, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(k));
      return v ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      window.dispatchEvent(new CustomEvent("nishu-store-updated", { detail: { key: k, value: v } }));
    } catch (e) {
      console.warn("Storage quota or access error:", e);
    }
  },
  del(k) {
    try {
      localStorage.removeItem(k);
      window.dispatchEvent(new CustomEvent("nishu-store-updated", { detail: { key: k } }));
    } catch {}
  },
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const formatPrice = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

let isBackendOnline = false;
let addImageBase64 = "";
let editImageBase64 = "";

/* =========================================================
   DEFAULT SEED DATA
   ========================================================= */
const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: "Velvet Amber Candle",
    slug: "velvet-amber-candle",
    category: "candles",
    price: 1499,
    mrp: 1799,
    icon: "🕯️",
    stock: 25,
    featured: true,
    image_url: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=800&q=80",
    notes: "Amber · Vanilla · Musk",
    desc: "A warm, enveloping soy candle hand-poured in an amber glass jar. 250g, around 45 hours of slow, even burn with lead-free cotton wick."
  },
  {
    id: 2,
    name: "Wild French Lavender Candle",
    slug: "wild-french-lavender",
    category: "candles",
    price: 1199,
    mrp: 1399,
    icon: "🌿",
    stock: 30,
    featured: true,
    image_url: "https://images.unsplash.com/photo-1508759073847-9ca702cec7d2?auto=format&fit=crop&w=800&q=80",
    notes: "Lavender · Sage · Cedar",
    desc: "Calming French lavender with a green herbal heart. Crafted for slow evenings, relaxation rituals and restorative sleep."
  },
  {
    id: 3,
    name: "Sandalwood Serenity Candle",
    slug: "sandalwood-serenity",
    category: "candles",
    price: 1349,
    mrp: 1599,
    icon: "🌙",
    stock: 18,
    featured: true,
    image_url: "https://images.unsplash.com/photo-1572726729207-a78d6feb18d7?auto=format&fit=crop&w=800&q=80",
    notes: "Sandalwood · Tonka · Cream",
    desc: "Creamy Mysore sandalwood with a soft woody finish. A meditative, grounding scent for quiet corners and mindful reading."
  },
  {
    id: 4,
    name: "Citrus Bloom Candle",
    slug: "citrus-bloom",
    category: "candles",
    price: 999,
    mrp: 1199,
    icon: "🍋",
    stock: 40,
    featured: false,
    image_url: "https://images.unsplash.com/photo-1602874801007-bd458bb1b8b8?auto=format&fit=crop&w=800&q=80",
    notes: "Bergamot · Lemon · Neroli",
    desc: "Bright, sparkling Mediterranean citrus that awakens any living space instantly. Perfect for sunny mornings and lively gatherings."
  },
  {
    id: 5,
    name: "Vanilla Chai Candle",
    slug: "vanilla-chai",
    category: "candles",
    price: 1099,
    mrp: 1299,
    icon: "☕",
    stock: 22,
    featured: false,
    image_url: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80",
    notes: "Vanilla · Cardamom · Cinnamon",
    desc: "The cosy comfort of freshly brewed spiced masala chai and Madagascar vanilla, hand-poured in small artisanal batches."
  },
  {
    id: 6,
    name: "Rose Petal Candle",
    slug: "rose-petal",
    category: "candles",
    price: 1249,
    mrp: 1449,
    icon: "🌸",
    stock: 20,
    featured: false,
    image_url: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80",
    notes: "Rose · Peony · White Musk",
    desc: "Soft, romantic Kannauj damask rose with an airy white musk base. Delicate, elegant and evocative on any bedside table."
  },
  {
    id: 7,
    name: "Cedar & Bergamot Diffuser",
    slug: "cedar-bergamot-diffuser",
    category: "diffusers",
    price: 2199,
    mrp: 2499,
    icon: "🌲",
    stock: 15,
    featured: true,
    image_url: "https://images.unsplash.com/photo-1616949755610-8c9bbc08f138?auto=format&fit=crop&w=800&q=80",
    notes: "Cedarwood · Bergamot · Vetiver",
    desc: "A fresh woody reed diffuser that scents your home for up to 10 continuous weeks. Includes 8 natural rattan reeds. 150ml."
  },
  {
    id: 8,
    name: "Ocean Mist Diffuser",
    slug: "ocean-mist-diffuser",
    category: "diffusers",
    price: 1899,
    mrp: 2199,
    icon: "🌊",
    stock: 16,
    featured: true,
    image_url: "https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80",
    notes: "Sea Salt · Driftwood · Mint",
    desc: "Crisp, breezy coastal air captured in a frosted bottle. Light, airy, ozone-infused and wonderfully invigorating. 150ml."
  },
  {
    id: 9,
    name: "White Tea & Fig Diffuser",
    slug: "white-tea-fig-diffuser",
    category: "diffusers",
    price: 1999,
    mrp: 2299,
    icon: "🍃",
    stock: 12,
    featured: false,
    image_url: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80",
    notes: "White Tea · Fig · Green Leaves",
    desc: "Delicate organic white tea notes with ripe Mediterranean fig. A soothing, spa-like fragrance for peaceful interiors. 150ml."
  },
  {
    id: 10,
    name: "Rose Oud Diffuser",
    slug: "rose-oud-diffuser",
    category: "diffusers",
    price: 2399,
    mrp: 2799,
    icon: "🌹",
    stock: 10,
    featured: false,
    image_url: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80",
    notes: "Rose · Oud · Amber",
    desc: "Rich, intoxicating and opulent. Deep oriental agarwood paired with velvet red rose petals. Our most lavish reed diffuser. 150ml."
  },
  {
    id: 11,
    name: "Linen Fresh Room Spray",
    slug: "linen-fresh-spray",
    category: "sprays",
    price: 799,
    mrp: 899,
    icon: "✨",
    stock: 50,
    featured: true,
    image_url: "https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=800&q=80",
    notes: "Cotton · Lily · Clean Musk",
    desc: "Crisp, freshly line-dried linen aroma. Mist generously over curtains, sofas, bedding and entryways for an instantaneous refresh. 100ml."
  },
  {
    id: 12,
    name: "Lemongrass Room Mist",
    slug: "lemongrass-mist",
    category: "sprays",
    price: 749,
    mrp: 849,
    icon: "🌾",
    stock: 45,
    featured: false,
    image_url: "https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&w=800&q=80",
    notes: "Lemongrass · Ginger · Basil",
    desc: "Zesty, stimulating botanicals that deodorize and uplift any space in seconds. Formulated with natural botanical essential oils. 100ml."
  },
  {
    id: 13,
    name: "Jasmine Pillow Mist",
    slug: "jasmine-pillow-mist",
    category: "sprays",
    price: 849,
    mrp: 949,
    icon: "🌼",
    stock: 35,
    featured: false,
    image_url: "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?auto=format&fit=crop&w=800&q=80",
    notes: "Jasmine · Chamomile · Vanilla",
    desc: "A gentle bedtime linen mist infused with soothing night-blooming mogra jasmine and Roman chamomile for serene sleep rituals. 100ml."
  },
  {
    id: 14,
    name: "Amber Wax Melts (6 pcs)",
    slug: "amber-wax-melts",
    category: "melts",
    price: 499,
    mrp: 599,
    icon: "🍯",
    stock: 60,
    featured: true,
    image_url: "https://images.unsplash.com/photo-1605651202774-7d573fd3f12d?auto=format&fit=crop&w=800&q=80",
    notes: "Amber · Honey · Vanilla",
    desc: "Six slow-melting soy wax cubes that fill a large room with rich warm amber. Flame-free fragrance release for ceramic burners."
  },
  {
    id: 15,
    name: "Lavender Wax Melts (6 pcs)",
    slug: "lavender-wax-melts",
    category: "melts",
    price: 449,
    mrp: 549,
    icon: "💜",
    stock: 60,
    featured: false,
    image_url: "https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=800&q=80",
    notes: "Lavender · Eucalyptus · Thyme",
    desc: "Soothing natural lavender melts for your wax warmer. 6 hand-poured botanical pieces per pack, offering over 60 hours of aroma."
  },
  {
    id: 16,
    name: "Cinnamon Spice Wax Melts (6 pcs)",
    slug: "cinnamon-spice-melts",
    category: "melts",
    price: 479,
    mrp: 579,
    icon: "🍂",
    stock: 55,
    featured: false,
    image_url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80",
    notes: "Cinnamon · Clove · Orange Peel",
    desc: "Warming festive spices and sweet citrus peel. Fills your home with festive warmth and hospitality. Six pieces per pack."
  },
  {
    id: 17,
    name: "Relax Ritual Gift Set",
    slug: "relax-ritual-gift-set",
    category: "gift-sets",
    price: 2999,
    mrp: 3499,
    icon: "🎁",
    stock: 11,
    featured: true,
    image_url: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80",
    notes: "Candle · Room Mist · Brass Snuffer",
    desc: "Includes our Wild French Lavender candle, Linen Fresh room mist, and a solid brass candle snuffer, presented in a luxury gift box."
  },
  {
    id: 18,
    name: "Festive Glow Hamper",
    slug: "festive-glow-hamper",
    category: "gift-sets",
    price: 3999,
    mrp: 4599,
    icon: "🕯️",
    stock: 8,
    featured: true,
    image_url: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80",
    notes: "2 Candles · Reed Diffuser · Wax Melts",
    desc: "Our finest festive centerpiece: two soy candles, a reed diffuser, and aromatic wax melts with festive matches and gold ribbon."
  },
  {
    id: 19,
    name: "Mini Candle Discovery Trio",
    slug: "mini-candle-trio",
    category: "gift-sets",
    price: 1799,
    mrp: 2099,
    icon: "🎀",
    stock: 28,
    featured: false,
    image_url: "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=800&q=80",
    notes: "3 × 75g Travel Candles",
    desc: "Three travel-size soy candles in Velvet Amber, Wild Lavender and Citrus Bloom. A delightful tasting set and perfect gift."
  },
];

const DEFAULT_SETTINGS = {
  theme_mode: "classic",
  festival_decoration: "none",
  announcement_text: "Free shipping across India · Cash on Delivery available",
  announcement_active: "true",
  brand_name: "Saroj&co",
  hero_eyebrow: "The Art of Fragrance",
  hero_title: "Make Space for Beautiful Moments.",
  hero_subtitle: "Discover thoughtfully crafted fragrances for your home, your rituals and the moments that matter.",
  hero_btn1_text: "Explore Collection",
  hero_btn1_link: "products.html",
  hero_btn2_text: "Our Story",
  hero_btn2_link: "about.html",
  support_email: "cosaroj032@gmail.com",
  support_phone: "+91 93063 53104",
  support_hours: "Monday – Friday, 9:00 AM – 6:00 PM IST",
  footer_bio: "Thoughtfully created fragrances for beautiful spaces and everyday rituals.",
  copyright_text: `© ${new Date().getFullYear()} Saroj&co. All rights reserved.`,
  enable_cod: "false",
  enable_online_payment: "true",
  enable_upi: "true",
  enable_cards: "true",
  enable_netbanking: "true",
  upi_id: "sarojandco@upi",
  upi_name: "Saroj&co Luxury Fragrance",
  razorpay_key_id: "rzp_test_SarojCoLuxury2026",
  payment_note: "100% Secure Payment via UPI (GPay, PhonePe, Paytm, QR) & Cards",
  instagram_url: "https://www.instagram.com/saroj_co.7?psln=bjJqZDN3bnpsNzVo",
  facebook_url: "https://www.facebook.com/share/14pWdcvLyvU/",
  whatsapp_url: "https://wa.me/919306353104?text=Hi%20Saroj%26co%2C%20I%20have%20an%20enquiry.",
};

const DEFAULT_REVIEWS = [
  { id: 1, name: "Aanya", city: "Mumbai", stars: 5, quote: "The Velvet Amber candle filled my whole living room. Burns evenly, smells incredible and looks gorgeous on my coffee table." },
  { id: 2, name: "Rohan", city: "Jaipur", stars: 5, quote: "Ordered the Relax Ritual set for my sister's housewarming. The packaging and hand-written note felt so premium." },
  { id: 3, name: "Meera", city: "Delhi", stars: 5, quote: "Cedar & Bergamot diffuser is subtle, crisp and lasts for weeks without fading. Highly recommend Saroj&co to fragrance lovers!" },
];

const DEFAULT_FAQS = [
  { id: 1, category: "orders", question: "How does Cash on Delivery work?", answer: "Add items to your bag, proceed to Checkout, enter your delivery address and tap 'Confirm & Place Order'. You only pay when the courier brings the parcel to your doorstep." },
  { id: 2, category: "orders", question: "How can I track my order?", answer: "Sign in to your Profile page and open 'My Orders'. You can check the live tracking status (Placed, Packed, Shipped, Delivered) for every order you have placed." },
  { id: 3, category: "orders", question: "Are the products gift-ready?", answer: "Yes! Every Saroj&co parcel arrives in our signature gift-ready presentation box, and our Gift Sets come hand-wrapped with satin ribbon and botanical cards." },
  { id: 4, category: "shipping", question: "How long does delivery take across India?", answer: "Orders are hand-packed and dispatched within 1–2 business days. Metro cities usually arrive in 2–4 working days; the rest of India takes 4–6 working days." },
  { id: 5, category: "shipping", question: "Is shipping free?", answer: "Yes, shipping is 100% free on all orders across India with no minimum cart requirement." },
  { id: 6, category: "returns", question: "My candle arrived damaged. What should I do?", answer: "Glassware is delicate, so we double-box every order. If your parcel arrives damaged, send us clear photos via the Contact page within 48 hours and we will ship an immediate replacement free of charge." },
  { id: 7, category: "returns", question: "What is your return policy?", answer: "Unburned candles in their original presentation box can be returned or exchanged within 7 days of delivery. Used or bespoke customized items cannot be returned." },
  { id: 8, category: "products", question: "How do I prevent candle tunneling?", answer: "On the first burn, allow the candle to burn continuously for 2–3 hours until the melted wax reaches the very edge of the glass jar. This establishes an even burn memory." },
  { id: 9, category: "products", question: "Why should I trim the wick before lighting?", answer: "Always trim the wick to about 5mm before every lighting. It prevents excess soot, stops the flame from dancing, and extends the total burn life of your candle." }
];

const DEFAULT_COUPONS = {
  SAROJ10: { label: "10% off with Saroj&co", min: 0, type: "percent", value: 10 },
  NISHU10: { label: "10% off your entire order", min: 0, type: "percent", value: 10 },
  WELCOME200: { label: "₹200 off on orders above ₹1,000", min: 1000, type: "flat", value: 200 },
  FESTIVE25: { label: "Festive special: 25% off above ₹2,000", min: 2000, type: "percent", value: 25 },
};

function getSettings() {
  const s = { ...DEFAULT_SETTINGS, ...(store.get(KEY.settings, {}) || {}) };
  if (!s.brand_name || s.brand_name === "Nishu") s.brand_name = "Saroj&co";
  if (s.upi_id === "nishufragrance@upi") s.upi_id = "sarojandco@upi";
  if (s.upi_name === "Nishu Luxury Fragrance") s.upi_name = "Saroj&co Luxury Fragrance";
  if (!s.support_email || s.support_email.includes("example")) s.support_email = "cosaroj032@gmail.com";
  if (!s.support_phone || s.support_phone.includes("98765")) s.support_phone = "+91 93063 53104";
  if (!s.instagram_url || s.instagram_url === "https://www.instagram.com") s.instagram_url = "https://www.instagram.com/saroj_co.7?psln=bjJqZDN3bnpsNzVo";
  if (!s.facebook_url || s.facebook_url === "https://www.facebook.com") s.facebook_url = "https://www.facebook.com/share/14pWdcvLyvU/";
  if (!s.whatsapp_url || s.whatsapp_url.includes("9876543210")) s.whatsapp_url = "https://wa.me/919306353104?text=Hi%20Saroj%26co%2C%20I%20have%20an%20enquiry.";
  if (s.copyright_text && s.copyright_text.includes("Nishu")) s.copyright_text = s.copyright_text.replace(/Nishu/g, "Saroj&co");
  if (s.announcement_text && s.announcement_text.includes("Nishu")) s.announcement_text = s.announcement_text.replace(/Nishu/g, "Saroj&co");
  return s;
}


/* =========================================================
   NOTIFICATION TOAST
   ========================================================= */
function adminToast(msg, type = "success") {
  let box = document.getElementById("admin-toast-box");
  if (!box) {
    box = document.createElement("div");
    box.id = "admin-toast-box";
    document.body.appendChild(box);
  }
  const t = document.createElement("div");
  t.className = "admin-toast";
  t.innerHTML = `<span>${type === "success" ? "✓" : "✦"}</span> <div>${esc(msg)}</div>`;
  box.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 300);
  }, 2800);
}

/* =========================================================
   NAVIGATION CONTROLLER
   ========================================================= */
function switchTab(targetTabId) {
  document.querySelectorAll(".admin-nav-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".admin-tab-content").forEach((s) => s.classList.remove("active"));

  const targetBtn = document.querySelector(`.admin-nav-btn[data-tab="${targetTabId}"]`);
  const targetSection = document.getElementById(targetTabId);

  if (targetBtn) targetBtn.classList.add("active");
  if (targetSection) targetSection.classList.add("active");

  if (targetTabId === "customers-tab") loadCustomersTable();
  if (targetTabId === "orders-tab") loadOrdersTable();
  if (targetTabId === "products-tab") loadCatalogTable();
  if (targetTabId === "messages-tab") loadInquiriesTable();
  if (targetTabId === "newsletter-tab") loadNewsletterTable();

  window.scrollTo({ top: 0, behavior: "smooth" });
}
window.switchTab = switchTab;

document.querySelectorAll(".admin-nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    switchTab(btn.dataset.tab);
  });
});

// CMS subnav switcher
document.querySelectorAll(".cms-subnav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".cms-subnav-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".cms-section").forEach((s) => s.classList.remove("active"));
    btn.classList.add("active");
    const target = document.getElementById(btn.dataset.cms);
    if (target) target.classList.add("active");
  });
});

/* =========================================================
   1. DASHBOARD OVERVIEW ENGINE
   ========================================================= */
function updateDashboard() {
  const products = store.get(KEY.products, DEFAULT_PRODUCTS);
  const orders = store.get(KEY.orders, []);
  const inquiries = store.get(KEY.msgs, []);

  // Update counts
  const totalProdsEl = document.getElementById("dash-prod-count");
  if (totalProdsEl) totalProdsEl.textContent = products.length;

  const totalOrdersEl = document.getElementById("dash-orders-count");
  if (totalOrdersEl) totalOrdersEl.textContent = orders.length;

  const totalSales = orders.reduce((sum, o) => (o.status !== "Cancelled" ? sum + Number(o.total || 0) : sum), 0);
  const totalSalesEl = document.getElementById("dash-sales-total");
  if (totalSalesEl) totalSalesEl.textContent = formatPrice(totalSales);

  const totalInquiriesEl = document.getElementById("dash-inquiries-count");
  if (totalInquiriesEl) totalInquiriesEl.textContent = inquiries.length;

  const customers = store.get(KEY.customers, []);
  const customerCount = customers.length || (new Set(orders.map((o) => o.email || o.phone || o.recipient_name).filter(Boolean)).size) || 0;
  const dashCustEl = document.getElementById("dash-customers-count");
  if (dashCustEl) dashCustEl.textContent = customerCount;

  // Sidebar badge pills
  const navProdPill = document.getElementById("nav-prod-count");
  if (navProdPill) navProdPill.textContent = products.length;

  const navOrderPill = document.getElementById("nav-order-count");
  if (navOrderPill) navOrderPill.textContent = orders.length;

  const navCustPill = document.getElementById("nav-cust-count");
  if (navCustPill) navCustPill.textContent = customerCount;

  const navMsgPill = document.getElementById("nav-msg-count");
  if (navMsgPill) navMsgPill.textContent = inquiries.length;

  // Recent 5 orders table
  const recentOrdersTbody = document.getElementById("dash-recent-orders-list");
  if (recentOrdersTbody) {
    if (!orders.length) {
      recentOrdersTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 25px;">No customer orders placed yet.</td></tr>`;
    } else {
      recentOrdersTbody.innerHTML = orders.slice(0, 5).map((o) => {
        const orderIdentifier = o.order_ref || o.id;
        return `
          <tr>
            <td><strong>#${esc(orderIdentifier)}</strong></td>
            <td>${esc(o.recipient_name || "Customer")}</td>
            <td>${esc(o.city || o.address?.city || o.shipping_address || "—")}</td>
            <td><strong>${formatPrice(o.total)}</strong></td>
            <td><span class="badge-pill ${o.status === 'Delivered' ? 'success' : o.status === 'Cancelled' ? 'danger' : 'warning'}">${esc(o.status)}</span></td>
            <td>
              <div style="display:flex;gap:5px;">
                <button class="btn-secondary btn-sm" onclick="viewOrderInvoice('${esc(orderIdentifier)}')">View</button>
                <button class="btn-danger btn-sm" onclick="deleteOrder('${esc(orderIdentifier)}')">🗑️</button>
              </div>
            </td>
          </tr>
        `;
      }).join("");
    }
  }
}

/* =========================================================
   2. PRODUCT MASTER CATALOG (ADD, EDIT, DELETE, IMAGE PREVIEW)
   ========================================================= */
function setupImageUploadHandlers() {
  // Add product image preview
  const addUrlInput = document.getElementById("prod-image-url");
  const addFileInput = document.getElementById("prod-image-file");
  const addBox = document.getElementById("add-img-preview-box");
  const clearAddBtn = document.getElementById("clear-add-img-btn");

  function renderAddPreview(src) {
    if (src) {
      addBox.innerHTML = `<img src="${src}" alt="Preview" onerror="this.onerror=null;this.parentElement.innerHTML='<span class=\\'image-preview-placeholder\\'>Broken image link</span>';">`;
    } else {
      addBox.innerHTML = `<span class="image-preview-placeholder">No image selected</span>`;
    }
  }

  addUrlInput?.addEventListener("input", (e) => {
    addImageBase64 = "";
    renderAddPreview(e.target.value.trim());
  });

  addFileInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (re) => {
        addImageBase64 = re.target.result;
        renderAddPreview(addImageBase64);
        if (addUrlInput) addUrlInput.value = "";
      };
      reader.readAsDataURL(file);
    }
  });

  clearAddBtn?.addEventListener("click", () => {
    addImageBase64 = "";
    if (addUrlInput) addUrlInput.value = "";
    if (addFileInput) addFileInput.value = "";
    renderAddPreview("");
  });

  // Edit product image preview
  const editUrlInput = document.getElementById("edit-prod-image-url");
  const editFileInput = document.getElementById("edit-prod-image-file");
  const editBox = document.getElementById("edit-img-preview-box");
  const clearEditBtn = document.getElementById("clear-edit-img-btn");

  function renderEditPreview(src) {
    if (src) {
      editBox.innerHTML = `<img src="${src}" alt="Preview">`;
    } else {
      editBox.innerHTML = `<span class="image-preview-placeholder">No image selected</span>`;
    }
  }

  editUrlInput?.addEventListener("input", (e) => {
    editImageBase64 = "";
    renderEditPreview(e.target.value.trim());
  });

  editFileInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (re) => {
        editImageBase64 = re.target.result;
        renderEditPreview(editImageBase64);
        if (editUrlInput) editUrlInput.value = "";
      };
      reader.readAsDataURL(file);
    }
  });

  clearEditBtn?.addEventListener("click", () => {
    editImageBase64 = "";
    if (editUrlInput) editUrlInput.value = "";
    if (editFileInput) editFileInput.value = "";
    renderEditPreview("");
  });
}

function loadCatalogTable() {
  const products = store.get(KEY.products, DEFAULT_PRODUCTS);
  const tbody = document.getElementById("admin-catalog-list");
  if (!tbody) return;

  const query = (document.getElementById("catalog-search")?.value || "").toLowerCase().trim();
  const cat = document.getElementById("catalog-category-filter")?.value || "all";

  const filtered = products.filter((p) => {
    const matchCat = cat === "all" || p.category === cat;
    const matchQ = !query || [p.name, p.category, p.notes, p.desc, String(p.id)].join(" ").toLowerCase().includes(query);
    return matchCat && matchQ;
  });

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 30px;">No matching products found in catalog.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((p) => {
    const isOut = Number(p.stock) <= 0;
    const isLow = !isOut && Number(p.stock) <= 12;
    const thumbHtml = p.image_url
      ? `<img src="${esc(p.image_url)}" class="table-thumb" alt="${esc(p.name)}" onerror="this.onerror=null;this.parentElement.innerHTML='<span style=\\'font-size:24px;\\'>${p.icon || '🕯️'}</span>';">`
      : `<div class="table-thumb" style="display:flex;align-items:center;justify-content:center;font-size:22px;">${p.icon || '🕯️'}</div>`;

    return `
      <tr>
        <td>${thumbHtml}</td>
        <td><strong>#${p.id}</strong></td>
        <td>
          <strong>${esc(p.name)}</strong>
          <small style="display:block;color:var(--admin-muted);">${esc(p.notes || "No notes defined")}</small>
        </td>
        <td><span class="badge-pill info">${esc(p.category)}</span></td>
        <td>
          <strong>${formatPrice(p.price)}</strong>
          ${p.mrp > p.price ? `<small style="display:block;color:#94a3b8;"><del>${formatPrice(p.mrp)}</del></small>` : ""}
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:6px;">
            <button class="btn-secondary btn-sm" onclick="adjustStock(${p.id}, -1)">−</button>
            <span style="font-weight:700;min-width:24px;text-align:center;">${p.stock}</span>
            <button class="btn-secondary btn-sm" onclick="adjustStock(${p.id}, 1)">+</button>
            <span class="badge-pill ${isOut ? 'danger' : isLow ? 'warning' : 'success'}" style="margin-left:4px;">
              ${isOut ? 'Out of Stock' : isLow ? 'Low' : 'In Stock'}
            </span>
          </div>
        </td>
        <td>${p.featured ? '<span style="color:#d97706;font-weight:700;">★ Home</span>' : '<span style="color:#94a3b8;">—</span>'}</td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn-secondary btn-sm" onclick="openEditProductModal(${p.id})">✏️ Edit</button>
            <button class="btn-danger btn-sm" onclick="deleteProduct(${p.id})">🗑️ Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// Quick Stock Adjuster
window.adjustStock = function (id, delta) {
  const products = store.get(KEY.products, DEFAULT_PRODUCTS);
  const p = products.find((x) => x.id === Number(id));
  if (p) {
    p.stock = Math.max(0, Number(p.stock) + delta);
    store.set(KEY.products, products);

    fetch(`${API_BASE}/admin/products/${id}/stock`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: p.stock })
    }).catch(() => {});

    loadCatalogTable();
    adminToast(`Stock for ${p.name} updated to ${p.stock}`);
  }
};

// Add Product Submission
document.getElementById("add-product-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("prod-name").value.trim();
  const category = document.getElementById("prod-category").value;
  const price = Number(document.getElementById("prod-price").value);
  const mrp = Number(document.getElementById("prod-mrp").value) || 0;
  const stock = Number(document.getElementById("prod-stock").value);
  const notes = document.getElementById("prod-notes").value.trim();
  const desc = document.getElementById("prod-desc").value.trim();
  const featured = document.getElementById("prod-featured").checked;

  const imageUrl = addImageBase64 || document.getElementById("prod-image-url").value.trim();

  const products = store.get(KEY.products, DEFAULT_PRODUCTS);
  const nextId = products.reduce((max, p) => Math.max(max, p.id || 0), 0) + 1;

  const newProd = {
    id: nextId,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    category,
    price,
    mrp: mrp > price ? mrp : 0,
    stock,
    icon: category === "diffusers" ? "🌿" : category === "sprays" ? "✨" : category === "gift-sets" ? "🎁" : "🕯️",
    featured,
    image_url: imageUrl,
    notes,
    desc
  };

  products.unshift(newProd);
  store.set(KEY.products, products);

  // Background sync if backend is active
  fetch(`${API_BASE}/admin/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newProd)
  }).catch(() => {});

  e.target.reset();
  addImageBase64 = "";
  document.getElementById("add-img-preview-box").innerHTML = `<span class="image-preview-placeholder">No image selected</span>`;

  loadCatalogTable();
  updateDashboard();
  adminToast(`✅ "${name}" published live to website!`);
});

// Edit Product Modal Handlers
window.openEditProductModal = function (id) {
  const products = store.get(KEY.products, DEFAULT_PRODUCTS);
  const p = products.find((x) => x.id === Number(id));
  if (!p) return;

  document.getElementById("edit-prod-id").value = p.id;
  document.getElementById("edit-prod-name").value = p.name;
  document.getElementById("edit-prod-category").value = p.category;
  document.getElementById("edit-prod-price").value = p.price;
  document.getElementById("edit-prod-mrp").value = p.mrp || "";
  document.getElementById("edit-prod-stock").value = p.stock;
  document.getElementById("edit-prod-notes").value = p.notes || "";
  document.getElementById("edit-prod-desc").value = p.desc || "";
  document.getElementById("edit-prod-featured").checked = !!p.featured;
  document.getElementById("edit-prod-image-url").value = p.image_url || "";

  editImageBase64 = "";
  const box = document.getElementById("edit-img-preview-box");
  if (p.image_url) {
    box.innerHTML = `<img src="${p.image_url}" alt="${p.name}">`;
  } else {
    box.innerHTML = `<span class="image-preview-placeholder">No image</span>`;
  }

  document.getElementById("edit-product-modal").hidden = false;
};

window.closeEditProductModal = function () {
  document.getElementById("edit-product-modal").hidden = true;
};

document.getElementById("edit-product-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const id = Number(document.getElementById("edit-prod-id").value);
  const products = store.get(KEY.products, DEFAULT_PRODUCTS);
  const p = products.find((x) => x.id === id);
  if (!p) return;

  p.name = document.getElementById("edit-prod-name").value.trim();
  p.category = document.getElementById("edit-prod-category").value;
  p.price = Number(document.getElementById("edit-prod-price").value);
  p.mrp = Number(document.getElementById("edit-prod-mrp").value) || 0;
  p.stock = Number(document.getElementById("edit-prod-stock").value);
  p.notes = document.getElementById("edit-prod-notes").value.trim();
  p.desc = document.getElementById("edit-prod-desc").value.trim();
  p.featured = document.getElementById("edit-prod-featured").checked;

  const newImg = editImageBase64 || document.getElementById("edit-prod-image-url").value.trim();
  if (newImg) p.image_url = newImg;

  store.set(KEY.products, products);

  // Sync to backend if online
  fetch(`${API_BASE}/admin/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p)
  }).catch(() => {});

  closeEditProductModal();
  loadCatalogTable();
  updateDashboard();
  adminToast(`✅ Product "${p.name}" updated live!`);
});

// Delete Product
window.deleteProduct = function (id) {
  const products = store.get(KEY.products, DEFAULT_PRODUCTS);
  const p = products.find((x) => x.id === Number(id));
  if (!confirm(`Are you sure you want to remove "${p ? p.name : 'this product'}" from your catalog?`)) return;

  const next = products.filter((x) => x.id !== Number(id));
  store.set(KEY.products, next);

  // Sync to backend
  fetch(`${API_BASE}/admin/products/${id}`, { method: "DELETE" }).catch(() => {});

  loadCatalogTable();
  updateDashboard();
  adminToast(`🗑️ Product removed from website.`);
};

// Search & Category Filter Listeners
document.getElementById("catalog-search")?.addEventListener("input", loadCatalogTable);
document.getElementById("catalog-category-filter")?.addEventListener("change", loadCatalogTable);

/* =========================================================
   3. WEBPAGES & CMS MASTER CONTROLLER
   ========================================================= */
function loadCmsForms() {
  const settings = getSettings();
  const content = store.get(KEY.page_content, {}) || {};

  // 1. Homepage
  const hEyebrow = document.getElementById("cms-hero-eyebrow");
  if (hEyebrow) hEyebrow.value = settings.hero_eyebrow || "";
  const hTitle = document.getElementById("cms-hero-title");
  if (hTitle) hTitle.value = settings.hero_title || "";
  const hSub = document.getElementById("cms-hero-subtitle");
  if (hSub) hSub.value = settings.hero_subtitle || "";
  const hBtn1 = document.getElementById("cms-hero-btn1");
  if (hBtn1) hBtn1.value = settings.hero_btn1_text || "";
  const hBtn2 = document.getElementById("cms-hero-btn2");
  if (hBtn2) hBtn2.value = settings.hero_btn2_text || "";

  // 2. About
  const about = content.about || {};
  const abTitle = document.getElementById("cms-about-title");
  if (abTitle) abTitle.value = about.title || "The Story of Saroj&co";
  const abSub = document.getElementById("cms-about-sub");
  if (abSub) abSub.value = about.subtitle || "Creating moments of calm through intentional fragrance...";
  const abStoryTitle = document.getElementById("cms-about-story-title");
  if (abStoryTitle) abStoryTitle.value = about.story_title || "More Than a Fragrance";
  const abStoryP1 = document.getElementById("cms-about-story-p1");
  if (abStoryP1) abStoryP1.value = about.story_p1 || "At Saroj&co, we believe that scent has the unique power to change an atmosphere and ground our senses. A quiet flick of amber or a soothing drift of wild lavender can turn the end of a long day into a peaceful evening ritual.";

  // 3. Bespoke
  const bespoke = content.bespoke || {};
  const besTitle = document.getElementById("cms-bespoke-title");
  if (besTitle) besTitle.value = bespoke.title || "Bespoke by Saroj&co";
  const besSub = document.getElementById("cms-bespoke-sub");
  if (besSub) besSub.value = bespoke.subtitle || "Whether for weddings, private events or signature corporate gifting, collaborate with us to tailor an unforgettable fragrance.";

  // 4. Policies
  const pol = content.policies || {};
  const pMetro = document.getElementById("cms-policy-metro");
  if (pMetro) pMetro.value = pol.metro || "2 to 4 working days";
  const pRoi = document.getElementById("cms-policy-roi");
  if (pRoi) pRoi.value = pol.roi || "4 to 6 working days";
  const pReturns = document.getElementById("cms-policy-returns");
  if (pReturns) pReturns.value = pol.returns || "7-Day returns on unburned candles";
  const pPayment = document.getElementById("cms-policy-payment");
  if (pPayment) pPayment.value = pol.payment || "Cash on Delivery available across India";

  // 5. Contact & Footer
  const cEmail = document.getElementById("cms-contact-email");
  if (cEmail) cEmail.value = settings.support_email || "cosaroj032@gmail.com";
  const cPhone = document.getElementById("cms-contact-phone");
  if (cPhone) cPhone.value = settings.support_phone || "+91 93063 53104";
  const cHours = document.getElementById("cms-contact-hours");
  if (cHours) cHours.value = settings.support_hours || "Monday – Saturday, 9:00 AM – 7:00 PM IST";
  const cInsta = document.getElementById("cms-instagram-url");
  if (cInsta) cInsta.value = settings.instagram_url || "https://www.instagram.com/saroj_co.7?psln=bjJqZDN3bnpsNzVo";
  const cFb = document.getElementById("cms-facebook-url");
  if (cFb) cFb.value = settings.facebook_url || "https://www.facebook.com/share/14pWdcvLyvU/";
  const cWa = document.getElementById("cms-whatsapp-url");
  if (cWa) cWa.value = settings.whatsapp_url || "https://wa.me/919306353104?text=Hi%20Saroj%26co%2C%20I%20have%20an%20enquiry.";
  const cBio = document.getElementById("cms-footer-bio");
  if (cBio) cBio.value = settings.footer_bio || "Thoughtfully created fragrances for beautiful spaces and everyday rituals.";
  const cCopy = document.getElementById("cms-footer-copyright");
  if (cCopy) cCopy.value = settings.copyright_text || `© ${new Date().getFullYear()} Saroj&co. All rights reserved.`;

  loadReviewsTable();
  loadFaqsTable();
}

// Save Homepage CMS
document.getElementById("cms-home-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const settings = getSettings();
  settings.hero_eyebrow = document.getElementById("cms-hero-eyebrow").value.trim();
  settings.hero_title = document.getElementById("cms-hero-title").value.trim();
  settings.hero_subtitle = document.getElementById("cms-hero-subtitle").value.trim();
  settings.hero_btn1_text = document.getElementById("cms-hero-btn1").value.trim();
  settings.hero_btn2_text = document.getElementById("cms-hero-btn2").value.trim();

  store.set(KEY.settings, settings);
  adminToast("✅ Homepage content updated live!");
});

// Save About CMS
document.getElementById("cms-about-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const content = store.get(KEY.page_content, {}) || {};
  content.about = {
    title: document.getElementById("cms-about-title").value.trim(),
    subtitle: document.getElementById("cms-about-sub").value.trim(),
    story_title: document.getElementById("cms-about-story-title").value.trim(),
    story_p1: document.getElementById("cms-about-story-p1").value.trim(),
  };
  store.set(KEY.page_content, content);
  adminToast("✅ About Us page content saved live!");
});

// Save Bespoke CMS
document.getElementById("cms-bespoke-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const content = store.get(KEY.page_content, {}) || {};
  content.bespoke = {
    title: document.getElementById("cms-bespoke-title").value.trim(),
    subtitle: document.getElementById("cms-bespoke-sub").value.trim(),
  };
  store.set(KEY.page_content, content);
  adminToast("✅ Bespoke page text saved live!");
});

// Save Policies CMS
document.getElementById("cms-policies-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const content = store.get(KEY.page_content, {}) || {};
  content.policies = {
    metro: document.getElementById("cms-policy-metro").value.trim(),
    roi: document.getElementById("cms-policy-roi").value.trim(),
    returns: document.getElementById("cms-policy-returns").value.trim(),
    payment: document.getElementById("cms-policy-payment").value.trim(),
  };
  store.set(KEY.page_content, content);
  adminToast("✅ Policies & Delivery details saved live!");
});

// Save Contact & Footer CMS
document.getElementById("cms-contact-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const settings = getSettings();
  settings.support_email = document.getElementById("cms-contact-email").value.trim();
  settings.support_phone = document.getElementById("cms-contact-phone").value.trim();
  settings.support_hours = document.getElementById("cms-contact-hours").value.trim();
  if (document.getElementById("cms-instagram-url")) settings.instagram_url = document.getElementById("cms-instagram-url").value.trim();
  if (document.getElementById("cms-facebook-url")) settings.facebook_url = document.getElementById("cms-facebook-url").value.trim();
  if (document.getElementById("cms-whatsapp-url")) settings.whatsapp_url = document.getElementById("cms-whatsapp-url").value.trim();
  settings.footer_bio = document.getElementById("cms-footer-bio").value.trim();
  settings.copyright_text = document.getElementById("cms-footer-copyright").value.trim();

  store.set(KEY.settings, settings);
  fetch(`${API_BASE}/admin/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  }).catch(() => {});
  adminToast("✅ Contact concierge & footer settings saved!");
});

/* =========================================================
   TESTIMONIALS / REVIEWS MANAGER
   ========================================================= */
function loadReviewsTable() {
  const reviews = store.get(KEY.reviews, DEFAULT_REVIEWS);
  const tbody = document.getElementById("cms-reviews-list");
  if (!tbody) return;

  if (!reviews.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:20px;">No reviews added yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = reviews.map((r) => `
    <tr>
      <td><strong>${esc(r.name)}</strong></td>
      <td>${esc(r.city || "India")}</td>
      <td><span style="color:#f59e0b;">${"★".repeat(r.stars || 5)}</span></td>
      <td><small style="color:#475569;">"${esc(r.quote)}"</small></td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn-secondary btn-sm" onclick="openReviewModal(${r.id})">Edit</button>
          <button class="btn-danger btn-sm" onclick="deleteReview(${r.id})">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
}

document.getElementById("btn-add-review")?.addEventListener("click", () => openReviewModal(null));

window.openReviewModal = function (id) {
  const reviews = store.get(KEY.reviews, DEFAULT_REVIEWS);
  const r = id ? reviews.find((x) => x.id === id) : null;

  document.getElementById("review-id").value = r ? r.id : "";
  document.getElementById("rev-name").value = r ? r.name : "";
  document.getElementById("rev-city").value = r ? r.city : "";
  document.getElementById("rev-stars").value = r ? r.stars : "5";
  document.getElementById("rev-quote").value = r ? r.quote : "";
  document.getElementById("review-modal-title").textContent = r ? "Edit Testimonial" : "Add Customer Testimonial";
  document.getElementById("review-modal").hidden = false;
};

window.closeReviewModal = function () {
  document.getElementById("review-modal").hidden = true;
};

document.getElementById("review-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const id = document.getElementById("review-id").value;
  const reviews = store.get(KEY.reviews, DEFAULT_REVIEWS);
  const name = document.getElementById("rev-name").value.trim();
  const city = document.getElementById("rev-city").value.trim();
  const stars = Number(document.getElementById("rev-stars").value);
  const quote = document.getElementById("rev-quote").value.trim();

  if (id) {
    const existing = reviews.find((x) => String(x.id) === String(id));
    if (existing) {
      existing.name = name;
      existing.city = city;
      existing.stars = stars;
      existing.quote = quote;
    }
  } else {
    reviews.push({ id: Date.now(), name, city, stars, quote });
  }

  store.set(KEY.reviews, reviews);

  // Sync to backend if online
  if (id) {
    fetch(`${API_BASE}/admin/reviews/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, city, stars, quote })
    }).catch(() => {});
  } else {
    fetch(`${API_BASE}/admin/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, city, stars, quote })
    }).catch(() => {});
  }

  closeReviewModal();
  loadReviewsTable();
  adminToast("✅ Testimonial saved live!");
});

window.deleteReview = function (id) {
  if (!confirm("Delete this customer testimonial?")) return;
  const reviews = store.get(KEY.reviews, DEFAULT_REVIEWS).filter((x) => String(x.id) !== String(id));
  store.set(KEY.reviews, reviews);

  fetch(`${API_BASE}/admin/reviews/${id}`, { method: "DELETE" }).catch(() => {});

  loadReviewsTable();
  adminToast("Testimonial removed.");
};

/* =========================================================
   FAQ ITEMS MANAGER
   ========================================================= */
function loadFaqsTable() {
  const faqs = store.get(KEY.faqs, DEFAULT_FAQS);
  const tbody = document.getElementById("cms-faqs-list");
  if (!tbody) return;

  if (!faqs.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:20px;">No FAQs added yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = faqs.map((f) => `
    <tr>
      <td><span class="badge-pill info">${esc(f.category)}</span></td>
      <td><strong>${esc(f.question)}</strong></td>
      <td><small style="color:#475569;">${esc(f.answer.slice(0, 110))}${f.answer.length > 110 ? "..." : ""}</small></td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn-secondary btn-sm" onclick="openFaqModal(${f.id})">Edit</button>
          <button class="btn-danger btn-sm" onclick="deleteFaq(${f.id})">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
}

document.getElementById("btn-add-faq")?.addEventListener("click", () => openFaqModal(null));

window.openFaqModal = function (id) {
  const faqs = store.get(KEY.faqs, DEFAULT_FAQS);
  const f = id ? faqs.find((x) => x.id === id) : null;

  document.getElementById("faq-id").value = f ? f.id : "";
  document.getElementById("faq-category").value = f ? f.category : "orders";
  document.getElementById("faq-question").value = f ? f.question : "";
  document.getElementById("faq-answer").value = f ? f.answer : "";
  document.getElementById("faq-modal-title").textContent = f ? "Edit FAQ Item" : "Add New FAQ Item";
  document.getElementById("faq-modal").hidden = false;
};

window.closeFaqModal = function () {
  document.getElementById("faq-modal").hidden = true;
};

document.getElementById("faq-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const id = document.getElementById("faq-id").value;
  const faqs = store.get(KEY.faqs, DEFAULT_FAQS);
  const category = document.getElementById("faq-category").value;
  const question = document.getElementById("faq-question").value.trim();
  const answer = document.getElementById("faq-answer").value.trim();

  if (id) {
    const existing = faqs.find((x) => String(x.id) === String(id));
    if (existing) {
      existing.category = category;
      existing.question = question;
      existing.answer = answer;
    }
  } else {
    faqs.push({ id: Date.now(), category, question, answer });
  }

  store.set(KEY.faqs, faqs);

  // Sync to backend if online
  if (id) {
    fetch(`${API_BASE}/admin/faqs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, question, answer })
    }).catch(() => {});
  } else {
    fetch(`${API_BASE}/admin/faqs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, question, answer })
    }).catch(() => {});
  }

  closeFaqModal();
  loadFaqsTable();
  adminToast("✅ FAQ saved live!");
});

window.deleteFaq = function (id) {
  if (!confirm("Delete this FAQ item?")) return;
  const faqs = store.get(KEY.faqs, DEFAULT_FAQS).filter((x) => String(x.id) !== String(id));
  store.set(KEY.faqs, faqs);

  fetch(`${API_BASE}/admin/faqs/${id}`, { method: "DELETE" }).catch(() => {});

  loadFaqsTable();
  adminToast("FAQ removed.");
};

/* =========================================================
   4. APPEARANCE, THEMES & FESTIVE MODES
   ========================================================= */
function loadThemeSettings() {
  const settings = getSettings();
  const themeSel = document.getElementById("theme-preset-select");
  if (themeSel) themeSel.value = settings.theme_mode || "classic";

  const decorSel = document.getElementById("festival-decor-select");
  if (decorSel) decorSel.value = (settings.festival_decoration === "diwali") ? "candle" : (settings.festival_decoration || "none");

  const brandInput = document.getElementById("brand-name-input");
  if (brandInput) brandInput.value = settings.brand_name || "Saroj&co";

  const annTextInput = document.getElementById("announcement-text-input");
  if (annTextInput) annTextInput.value = settings.announcement_text || "";

  const annStatusSel = document.getElementById("announcement-status-select");
  if (annStatusSel) annStatusSel.value = String(settings.announcement_active ?? "true");
}

document.getElementById("admin-theme-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const settings = getSettings();
  settings.theme_mode = document.getElementById("theme-preset-select").value;
  settings.festival_decoration = document.getElementById("festival-decor-select").value;
  settings.brand_name = document.getElementById("brand-name-input").value.trim() || "Saroj&co";
  settings.announcement_text = document.getElementById("announcement-text-input").value.trim();
  settings.announcement_active = document.getElementById("announcement-status-select").value;

  store.set(KEY.settings, settings);

  // Sync with backend if online
  fetch(`${API_BASE}/admin/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings)
  }).catch(() => {});

  adminToast("🎨 Luxury theme & festive settings applied live across all pages!");
});

/* =========================================================
   4B. PAYMENT GATEWAYS & MODE CONTROLS
   ========================================================= */
function loadPaymentSettings() {
  const settings = getSettings();
  const codEl = document.getElementById("pay-enable-cod");
  if (codEl) codEl.checked = settings.enable_cod === "true" || settings.enable_cod === true;

  const onlineEl = document.getElementById("pay-enable-online");
  if (onlineEl) onlineEl.checked = settings.enable_online_payment !== "false" && settings.enable_online_payment !== false;

  const upiIdEl = document.getElementById("pay-upi-id");
  if (upiIdEl) upiIdEl.value = settings.upi_id || "sarojandco@upi";

  const upiNameEl = document.getElementById("pay-upi-name");
  if (upiNameEl) upiNameEl.value = settings.upi_name || "Saroj&co Luxury Fragrance";

  const rzpKeyEl = document.getElementById("pay-razorpay-key");
  if (rzpKeyEl) rzpKeyEl.value = settings.razorpay_key_id || "";

  const noteEl = document.getElementById("pay-custom-note");
  if (noteEl) noteEl.value = settings.payment_note || "100% Encrypted & Secure Payment via UPI & Cards";
}

document.getElementById("admin-payments-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const settings = getSettings();
  settings.enable_cod = document.getElementById("pay-enable-cod")?.checked ? "true" : "false";
  settings.enable_online_payment = document.getElementById("pay-enable-online")?.checked ? "true" : "false";
  settings.upi_id = (document.getElementById("pay-upi-id")?.value || "").trim();
  settings.upi_name = (document.getElementById("pay-upi-name")?.value || "").trim();
  settings.razorpay_key_id = (document.getElementById("pay-razorpay-key")?.value || "").trim();
  settings.payment_note = (document.getElementById("pay-custom-note")?.value || "").trim();

  store.set(KEY.settings, settings);

  fetch(`${API_BASE}/admin/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings)
  }).catch(() => {});

  adminToast(settings.enable_cod === "true" 
    ? "💳 Payment modes updated: Online Payments & Cash on Delivery (COD) are ACTIVE." 
    : "💳 Payment modes updated: Cash on Delivery (COD) is DISABLED. Only Online Payments active.");
});

/* =========================================================
   5. CUSTOMER ORDERS MANAGEMENT
   ========================================================= */
function loadOrdersTable() {
  const orders = store.get(KEY.orders, []);
  const tbody = document.getElementById("admin-orders-table-body");
  if (!tbody) return;

  const query = (document.getElementById("orders-search")?.value || "").toLowerCase().trim();
  const status = document.getElementById("orders-status-filter")?.value || "all";

  const filtered = orders.filter((o) => {
    const matchStatus = status === "all" || o.status === status;
    const matchQ = !query || [o.id, o.recipient_name, o.phone, o.city, o.address?.city].join(" ").toLowerCase().includes(query);
    return matchStatus && matchQ;
  });

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:35px;">No customer orders found matching criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((o) => {
    const orderRef = o.order_ref || o.id;
    const formattedDate = o.created_at
      ? new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : (o.date || "—");
    const custPhone = o.phone || o.address?.phone || "";
    const cleanPhone = custPhone.replace(/[^0-9]/g, "");
    const custEmail = o.email || "";
    const fullAddr = o.shipping_address || o.address?.address_line || "";
    const cityState = [o.city || o.address?.city, o.state || o.address?.state].filter(Boolean).join(", ");
    const pin = o.pincode || o.address?.pincode || "";

    return `
      <tr>
        <td><strong>#${esc(orderRef)}</strong></td>
        <td><small style="color:#64748b;">${esc(formattedDate)}</small></td>
        <td>
          <div style="font-weight:700;color:#0f172a;">${esc(o.recipient_name || o.address?.recipient_name || "Customer")}</div>
          ${custPhone ? `
            <div style="margin-top:3px;font-size:12px;display:flex;align-items:center;gap:6px;">
              <a href="tel:${cleanPhone}" style="color:#0284c7;text-decoration:none;font-weight:600;" title="Call Customer">📞 ${esc(custPhone)}</a>
              <a href="https://wa.me/91${cleanPhone.slice(-10)}" target="_blank" rel="noopener noreferrer" style="color:#16a34a;text-decoration:none;" title="Chat on WhatsApp">💬</a>
            </div>` : ""}
          ${custEmail ? `<div style="font-size:11px;color:#64748b;margin-top:2px;"><a href="mailto:${esc(custEmail)}" style="color:#64748b;text-decoration:none;">✉️ ${esc(custEmail)}</a></div>` : ""}
        </td>
        <td>
          <strong>${esc(o.city || o.address?.city || "—")}</strong>
          ${fullAddr ? `<small style="display:block;color:#64748b;max-width:200px;line-height:1.3;margin-top:2px;" title="${esc(fullAddr + (cityState ? ', ' + cityState : '') + (pin ? ' - ' + pin : ''))}">${esc(fullAddr)}</small>` : ""}
          ${pin ? `<small style="color:#94a3b8;font-size:11px;">PIN: ${esc(pin)}</small>` : ""}
        </td>
        <td>
          <strong>${formatPrice(o.total)}</strong>
          <div style="margin-top: 4px;">
            <span class="badge-pill ${(o.payment_status === 'paid' || (!o.payment_status && o.payment_method !== 'Cash on Delivery')) ? 'success' : 'warning'}" style="font-size: 10px; padding: 2px 6px;">
              ${esc(o.payment_method || 'Online Payment')}
            </span>
          </div>
          ${o.transaction_ref ? `<div style="font-size:10px;color:#64748b;margin-top:2px;">Ref: ${esc(o.transaction_ref)}</div>` : ''}
        </td>
        <td>
          <span class="badge-pill ${o.status === 'Delivered' ? 'success' : o.status === 'Cancelled' ? 'danger' : 'warning'}">
            ${esc(o.status)}
          </span>
        </td>
        <td>
          <select onchange="changeOrderStatus('${esc(orderRef)}', this.value)" style="padding:4px 8px;font-size:12px;border-radius:4px;border:1px solid #cbd5e1;">
            <option value="">Update Status...</option>
            <option value="Order Placed" ${o.status === 'Order Placed' ? 'selected' : ''}>Order Placed</option>
            <option value="Packed" ${o.status === 'Packed' ? 'selected' : ''}>Packed</option>
            <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
            <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
            <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn-secondary btn-sm" onclick="viewOrderInvoice('${esc(orderRef)}')">🧾 Receipt</button>
            <button class="btn-danger btn-sm" onclick="deleteOrder('${esc(orderRef)}')" title="Permanently delete order">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

window.changeOrderStatus = function (orderId, newStatus) {
  if (!newStatus) return;
  const orders = store.get(KEY.orders, []);
  const o = orders.find((x) => String(x.id) === String(orderId) || String(x.order_ref || "") === String(orderId));
  if (o) {
    o.status = newStatus;
    store.set(KEY.orders, orders);

    // Sync to backend if online
    fetch(`${API_BASE}/admin/orders/${encodeURIComponent(orderId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    }).catch(() => {});

    loadOrdersTable();
    updateDashboard();
    adminToast(`Order #${orderId} marked as "${newStatus}"!`);
  }
};

window.viewOrderInvoice = function (orderId) {
  const orders = store.get(KEY.orders, []);
  const o = orders.find((x) => String(x.id) === String(orderId) || String(x.order_ref || "") === String(orderId));
  if (!o) return;

  const modal = document.getElementById("order-invoice-modal");
  const content = document.getElementById("invoice-modal-content");
  if (!modal || !content) return;

  const addr = o.address || {};
  const items = o.items || [];
  const orderRef = o.order_ref || o.id;
  const placedDate = o.created_at
    ? new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : (o.date || "—");
  const custPhone = o.phone || addr.phone || "";
  const cleanPhone = custPhone.replace(/[^0-9]/g, "");

  content.innerHTML = `
    <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:15px;margin-bottom:20px;">
      <div>
        <h2 style="margin:0;font-size:22px;color:#0f172a;">Customer Order Invoice</h2>
        <p style="margin:4px 0 0;font-size:13px;color:#64748b;">Reference: <strong>#${esc(orderRef)}</strong> · Placed: ${esc(placedDate)}</p>
      </div>
      <div style="text-align:right;">
        <span class="badge-pill ${o.status === 'Delivered' ? 'success' : o.status === 'Cancelled' ? 'danger' : 'warning'}" style="font-size:12px;padding:6px 12px;">
          Status: ${esc(o.status)}
        </span>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;font-size:14px;background:#f8fafc;padding:16px;border-radius:8px;">
      <div>
        <strong>Shipping Destination:</strong>
        <p style="margin:6px 0 0;color:#334155;line-height:1.5;">
          <strong>${esc(o.recipient_name || addr.recipient_name || "Customer")}</strong><br>
          ${esc(o.shipping_address || addr.address_line || "Delivery Address")}<br>
          ${esc(o.city || addr.city || "")}${o.state || addr.state ? ", " + esc(o.state || addr.state) : ""} - ${esc(o.pincode || addr.pincode || "")}<br>
          ${custPhone ? `<strong>Phone:</strong> <a href="tel:${cleanPhone}" style="color:#0284c7;text-decoration:none;">${esc(custPhone)}</a> <a href="https://wa.me/91${cleanPhone.slice(-10)}" target="_blank" rel="noopener noreferrer" style="color:#16a34a;margin-left:6px;text-decoration:none;" title="Direct WhatsApp Chat">💬 WhatsApp</a>` : "Phone: —"}
        </p>
      </div>
      <div>
        <strong>Payment Information:</strong>
        <p style="margin:6px 0 0;color:#334155;line-height:1.5;">
          <strong>Mode:</strong> ${esc(o.payment_method || "Cash on Delivery")}<br>
          <strong>Status:</strong> <span class="badge-pill ${(o.payment_status === 'paid' || (!o.payment_status && o.payment_method !== 'Cash on Delivery')) ? 'success' : 'warning'}" style="font-size:11px;">${esc(o.payment_status ? o.payment_status.toUpperCase() : 'PENDING')}</span><br>
          ${o.transaction_ref ? `<strong>UTR / Ref:</strong> <code>${esc(o.transaction_ref)}</code><br>` : ""}
          <strong>Email:</strong> <a href="mailto:${esc(o.email || '')}" style="color:#0284c7;">${esc(o.email || '—')}</a>
        </p>
      </div>
    </div>

    <h3 style="margin:0 0 10px;font-size:15px;">Line Items</h3>
    <table class="admin-data-table" style="margin-bottom:20px;">
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.length ? items.map((i) => `
          <tr>
            <td><strong>${esc(i.name)}</strong></td>
            <td>${i.qty}</td>
            <td>${formatPrice(i.price)}</td>
            <td><strong>${formatPrice(i.price * i.qty)}</strong></td>
          </tr>
        `).join("") : `<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:10px;">Order items detailed in record</td></tr>`}
      </tbody>
    </table>

    <div style="border-top:1px solid #e2e8f0;padding-top:12px;text-align:right;font-size:15px;line-height:1.8;">
      <div>Subtotal: <strong>${formatPrice(o.subtotal || o.total)}</strong></div>
      ${o.discount ? `<div style="color:#16a34a;">Coupon Discount (${esc(o.coupon || o.coupon_code || "")}): <strong>−${formatPrice(o.discount)}</strong></div>` : ""}
      <div>Shipping: <strong style="color:#16a34a;">Free</strong></div>
      <div style="font-size:18px;margin-top:6px;">Grand Total: <strong style="color:#0f172a;">${formatPrice(o.total)}</strong></div>
    </div>

    <div style="margin-top:20px;display:flex;justify-content:flex-end;gap:10px;">
      <button class="btn-primary" onclick="window.print()">🖨️ Print Invoice</button>
      <button class="btn-secondary" onclick="closeOrderInvoiceModal()">Close</button>
    </div>
  `;

  modal.hidden = false;
};

window.closeOrderInvoiceModal = function () {
  document.getElementById("order-invoice-modal").hidden = true;
};

window.deleteOrder = async function (id) {
  if (!confirm(`Are you sure you want to permanently delete order #${id}?`)) return;

  // 1. Immediately remove from local state
  let orders = store.get(KEY.orders, []);
  orders = orders.filter((o) => 
    String(o.id) !== String(id) && 
    String(o.order_ref || "") !== String(id)
  );
  store.set(KEY.orders, orders);
  loadOrdersTable();
  updateDashboard();

  // 2. Sync deletion to backend API / MySQL database
  try {
    const res = await fetch(`${API_BASE}/admin/orders/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    if (res.ok) {
      adminToast(`Order #${id} deleted from database.`);
    } else {
      console.warn("Backend order delete status:", res.status);
      adminToast(`Order #${id} removed.`);
    }
  } catch (err) {
    console.warn("Backend sync notice:", err);
    adminToast(`Order #${id} removed locally.`);
  }
};

document.getElementById("orders-search")?.addEventListener("input", loadOrdersTable);
document.getElementById("orders-status-filter")?.addEventListener("change", loadOrdersTable);

/* =========================================================
   5C. CUSTOMERS & USERS DIRECTORY CONTROLLER
   ========================================================= */
function loadCustomersTable() {
  const tbody = document.getElementById("admin-customers-table-body");
  if (!tbody) return;

  let customers = store.get(KEY.customers, []);
  const orders = store.get(KEY.orders, []);

  // If customers array is empty, derive directly from orders & accounts
  if (!customers.length && orders.length) {
    const custMap = {};
    orders.forEach((o) => {
      const email = (o.email || "").toLowerCase().trim();
      const phone = o.phone || o.address?.phone || "";
      const key = email || phone || o.recipient_name || "guest";
      if (!custMap[key]) {
        custMap[key] = {
          id: o.user_id ? `U-${o.user_id}` : `C-${key.slice(0, 6)}`,
          name: o.recipient_name || o.address?.recipient_name || "Customer",
          email: email,
          phone: phone,
          role: "customer",
          created_at: o.created_at || o.date,
          total_orders: 0,
          total_spent: 0,
          last_order_date: o.created_at || o.date,
          last_address: o.shipping_address || o.address?.address_line || "",
          city: o.city || o.address?.city || "",
          state: o.state || o.address?.state || "",
          pincode: o.pincode || o.address?.pincode || "",
        };
      }
      custMap[key].total_orders += 1;
      if (o.status !== "Cancelled") custMap[key].total_spent += Number(o.total || 0);
    });
    customers = Object.values(custMap);
    store.set(KEY.customers, customers);
  }

  const query = (document.getElementById("customers-search")?.value || "").toLowerCase().trim();
  const filtered = customers.filter((c) => {
    if (!query) return true;
    const hay = [c.name, c.email, c.phone, c.city, c.state, c.pincode, c.last_address].join(" ").toLowerCase();
    return hay.includes(query);
  });

  const navCustPill = document.getElementById("nav-cust-count");
  if (navCustPill) navCustPill.textContent = customers.length;
  const dashCustEl = document.getElementById("dash-customers-count");
  if (dashCustEl) dashCustEl.textContent = customers.length;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 35px;">No customer profiles found matching "${esc(query)}".</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((c) => {
    const phone = c.phone || "";
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const email = c.email || "";
    const initial = (c.name || "C").charAt(0).toUpperCase();
    const isVip = (Number(c.total_spent) > 4000) || (Number(c.total_orders) >= 3);
    const dateFormatted = c.created_at
      ? new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "Active Member";

    const destination = [c.last_address, c.city, c.state, c.pincode].filter(Boolean).join(", ") || "—";

    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;border-radius:50%;background:#e2e8f0;color:#1e293b;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;">
              ${initial}
            </div>
            <div>
              <strong style="color:#0f172a;display:block;">${esc(c.name || "Customer")}</strong>
              <small style="color:#64748b;font-size:11px;">ID: ${esc(String(c.id || "C-NEW"))}</small>
            </div>
          </div>
        </td>
        <td>
          <span class="badge-pill ${isVip ? 'success' : c.role === 'admin' ? 'neutral' : 'info'}" style="font-size:11px;">
            ${isVip ? '✦ VIP Member' : (c.role === 'guest' ? 'Guest Checkout' : 'Registered Customer')}
          </span>
        </td>
        <td>
          ${phone ? `
            <div style="display:flex;align-items:center;gap:6px;font-size:12.5px;">
              <a href="tel:${cleanPhone}" style="color:#0284c7;font-weight:600;text-decoration:none;" title="Call Customer">📞 ${esc(phone)}</a>
              <a href="https://wa.me/91${cleanPhone.slice(-10)}" target="_blank" rel="noopener noreferrer" style="color:#16a34a;text-decoration:none;" title="Direct WhatsApp Chat">💬</a>
            </div>` : "<span style='color:#94a3b8;'>—</span>"}
          ${email ? `<div style="font-size:11px;color:#64748b;margin-top:2px;"><a href="mailto:${esc(email)}" style="color:#64748b;text-decoration:none;">✉️ ${esc(email)}</a></div>` : ""}
        </td>
        <td>
          <small style="color:#334155;display:block;max-width:220px;line-height:1.4;" title="${esc(destination)}">
            ${esc(destination)}
          </small>
        </td>
        <td>
          <span class="badge-pill neutral" style="font-weight:700;font-size:12px;">
            🛍️ ${c.total_orders || 0} order(s)
          </span>
        </td>
        <td>
          <strong style="color:#0f172a;font-size:13.5px;">${formatPrice(c.total_spent || 0)}</strong>
        </td>
        <td>
          <small style="color:#64748b;">${esc(dateFormatted)}</small>
        </td>
        <td>
          <button type="button" class="btn-secondary btn-sm" onclick="filterCustomerOrders('${esc(c.name || '')}', '${esc(cleanPhone)}')" title="View this customer's orders">
            View Orders →
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

window.filterCustomerOrders = function(name, phone) {
  switchTab("orders-tab");
  const searchInput = document.getElementById("orders-search");
  if (searchInput) {
    searchInput.value = phone || name || "";
    loadOrdersTable();
  }
};

window.exportCustomersCSV = function() {
  const customers = store.get(KEY.customers, []);
  if (!customers.length) {
    return adminToast("No customer records found to export.", "info");
  }
  const headers = ["ID", "Name", "Role", "Email", "Phone", "Shipping Address", "City", "State", "Pincode", "Total Orders", "Total Spent (INR)", "First Active"];
  const rows = customers.map((c) => [
    `"${c.id || ''}"`,
    `"${(c.name || '').replace(/"/g, '""')}"`,
    `"${c.role || 'customer'}"`,
    `"${c.email || ''}"`,
    `"${c.phone || ''}"`,
    `"${(c.last_address || '').replace(/"/g, '""')}"`,
    `"${c.city || ''}"`,
    `"${c.state || ''}"`,
    `"${c.pincode || ''}"`,
    c.total_orders || 0,
    c.total_spent || 0,
    `"${c.created_at || ''}"`
  ]);
  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `saroj_co_customers_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  adminToast("📥 Exported " + customers.length + " customers to CSV!");
};

document.getElementById("customers-search")?.addEventListener("input", loadCustomersTable);
document.getElementById("btn-export-customers")?.addEventListener("click", exportCustomersCSV);

/* =========================================================
   6. COUPONS & OFFERS CONTROLLER
   ========================================================= */
function loadCouponsTable() {
  const coupons = store.get(KEY.coupons, DEFAULT_COUPONS);
  const tbody = document.getElementById("coupons-table-body");
  if (!tbody) return;

  const entries = Object.entries(coupons);
  if (!entries.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:20px;">No promotional coupons active.</td></tr>`;
    return;
  }

  tbody.innerHTML = entries.map(([code, c]) => `
    <tr>
      <td><strong>${esc(code)}</strong></td>
      <td><span class="badge-pill info">${c.type === 'percent' ? 'Percentage' : 'Flat ₹'}</span></td>
      <td><strong>${c.type === 'percent' ? `${c.value}% Off` : formatPrice(c.value) + ' Off'}</strong></td>
      <td>${c.min ? formatPrice(c.min) : 'None (₹0)'}</td>
      <td><small style="color:#64748b;">${esc(c.label || "")}</small></td>
      <td><button class="btn-danger btn-sm" onclick="deleteCoupon('${esc(code)}')">Delete</button></td>
    </tr>
  `).join("");
}

document.getElementById("add-coupon-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const code = document.getElementById("coupon-code").value.trim().toUpperCase();
  const type = document.getElementById("coupon-type").value;
  const value = Number(document.getElementById("coupon-value").value);
  const min = Number(document.getElementById("coupon-min").value) || 0;
  const label = document.getElementById("coupon-label").value.trim() || `${type === 'percent' ? value + '% off' : formatPrice(value) + ' off'}`;

  const coupons = store.get(KEY.coupons, DEFAULT_COUPONS);
  coupons[code] = { type, value, min, label };
  store.set(KEY.coupons, coupons);

  // Sync to backend if online
  fetch(`${API_BASE}/admin/coupons`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      discount_type: type,
      discount_value: value,
      min_spend: min,
      label
    })
  }).catch(() => {});

  e.target.reset();
  loadCouponsTable();
  adminToast(`🏷️ Coupon code "${code}" is now active!`);
});

window.deleteCoupon = function (code) {
  if (!confirm(`Remove coupon ${code}?`)) return;
  const coupons = store.get(KEY.coupons, DEFAULT_COUPONS);
  delete coupons[code];
  store.set(KEY.coupons, coupons);

  fetch(`${API_BASE}/admin/coupons/${encodeURIComponent(code)}`, {
    method: "DELETE"
  }).catch(() => {});

  loadCouponsTable();
  adminToast(`Coupon ${code} removed.`);
};

/* =========================================================
   7. INQUIRIES & BESPOKE MESSAGES
   ========================================================= */
function loadInquiriesTable() {
  const msgs = store.get(KEY.msgs, []);
  const tbody = document.getElementById("admin-inquiries-table-body");
  if (!tbody) return;

  const filter = document.getElementById("msg-type-filter")?.value || "all";
  const list = msgs.filter((m) => filter === "all" || m.type === filter);

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:30px;">No customer inquiries or custom requests received yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((m) => {
    const formattedDate = m.date || (m.created_at ? new Date(m.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
    return `
    <tr>
      <td><small style="color:#64748b;">${esc(formattedDate)}</small></td>
      <td><span class="badge-pill ${m.type === 'Bespoke Request' ? 'warning' : 'info'}">${esc(m.type || "Inquiry")}</span></td>
      <td><strong>${esc(m.name || "Customer")}</strong></td>
      <td><a href="mailto:${esc(m.email)}" style="color:#0284c7;">${esc(m.email)}</a></td>
      <td><span class="badge-pill neutral">${esc(m.topic || m["bespoke-type"] || "General")}</span></td>
      <td><small style="color:#334155;max-width:280px;display:block;">${esc(m.message || "")}</small></td>
      <td>
        <div style="display:flex;gap:6px;">
          <a href="mailto:${esc(m.email)}?subject=Re:%20Saroj%26co%20Fragrance%20Enquiry" class="btn-primary btn-sm" style="text-decoration:none;">Reply</a>
          <button class="btn-danger btn-sm" onclick="deleteInquiry('${esc(m.id)}')">Delete</button>
        </div>
      </td>
    </tr>
  `;
  }).join("");
}

window.deleteInquiry = function (id) {
  if (!confirm("Delete this inquiry?")) return;
  const msgs = store.get(KEY.msgs, []).filter((x) => String(x.id) !== String(id));
  store.set(KEY.msgs, msgs);

  fetch(`${API_BASE}/admin/messages/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});

  loadInquiriesTable();
  updateDashboard();
  adminToast("Inquiry removed.");
};

document.getElementById("msg-type-filter")?.addEventListener("change", loadInquiriesTable);

/* =========================================================
   8. NEWSLETTER SUBSCRIBERS
   ========================================================= */
function loadNewsletterTable() {
  const rawList = store.get(KEY.news, []);
  const list = rawList.map((x) => (typeof x === "string" ? x : (x.email || ""))).filter(Boolean);
  const tbody = document.getElementById("newsletter-table-body");
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:25px;">No newsletter subscribers yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((email, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><a href="mailto:${esc(email)}" style="color:#0284c7;font-weight:600;">${esc(email)}</a></td>
      <td><button class="btn-danger btn-sm" onclick="deleteSubscriber('${esc(email)}')">Delete</button></td>
    </tr>
  `).join("");
}

window.deleteSubscriber = function (email) {
  if (!confirm(`Remove subscriber ${email}?`)) return;
  const rawList = store.get(KEY.news, []);
  const list = rawList.filter((x) => (typeof x === "string" ? x : x.email) !== email);
  store.set(KEY.news, list);

  fetch(`${API_BASE}/admin/newsletter/${encodeURIComponent(email)}`, { method: "DELETE" }).catch(() => {});

  loadNewsletterTable();
  updateDashboard();
  adminToast("Subscriber removed.");
};

document.getElementById("btn-copy-newsletter")?.addEventListener("click", () => {
  const rawList = store.get(KEY.news, []);
  const list = rawList.map((x) => (typeof x === "string" ? x : (x.email || ""))).filter(Boolean);
  if (!list.length) return adminToast("No subscriber emails to copy.", "info");
  navigator.clipboard.writeText(list.join(", ")).then(() => {
    adminToast(`📋 Copied ${list.length} email(s) to clipboard!`);
  });
});

/* =========================================================
   9. DATA BACKUP, IMPORT & FACTORY RESET
   ========================================================= */
document.getElementById("btn-export-backup")?.addEventListener("click", () => {
  const data = {
    exported_at: new Date().toISOString(),
    version: "3.8",
    products: store.get(KEY.products, DEFAULT_PRODUCTS),
    settings: store.get(KEY.settings, DEFAULT_SETTINGS),
    page_content: store.get(KEY.page_content, {}),
    coupons: store.get(KEY.coupons, DEFAULT_COUPONS),
    orders: store.get(KEY.orders, []),
    inquiries: store.get(KEY.msgs, []),
    newsletter: store.get(KEY.news, []),
    faqs: store.get(KEY.faqs, DEFAULT_FAQS),
    reviews: store.get(KEY.reviews, DEFAULT_REVIEWS),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `saroj-co-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  adminToast("💾 Backup downloaded successfully!");
});

document.getElementById("backup-file-input")?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (re) => {
    try {
      const data = JSON.parse(re.target.result);
      if (data.products) store.set(KEY.products, data.products);
      if (data.settings) store.set(KEY.settings, data.settings);
      if (data.page_content) store.set(KEY.page_content, data.page_content);
      if (data.coupons) store.set(KEY.coupons, data.coupons);
      if (data.orders) store.set(KEY.orders, data.orders);
      if (data.inquiries) store.set(KEY.msgs, data.inquiries);
      if (data.newsletter) store.set(KEY.news, data.newsletter);
      if (data.faqs) store.set(KEY.faqs, data.faqs);
      if (data.reviews) store.set(KEY.reviews, data.reviews);

      adminToast("✅ Full website backup restored successfully!");
      setTimeout(() => location.reload(), 1000);
    } catch {
      alert("❌ Invalid backup JSON file.");
    }
  };
  reader.readAsText(file);
});

document.getElementById("btn-reset-defaults")?.addEventListener("click", () => {
  if (!confirm("⚠️ Are you sure you want to revert all products and settings to default luxury factory values? Custom products will be reset.")) return;

  store.set(KEY.products, DEFAULT_PRODUCTS);
  store.set(KEY.settings, DEFAULT_SETTINGS);
  store.set(KEY.page_content, {});
  store.set(KEY.coupons, DEFAULT_COUPONS);
  store.set(KEY.faqs, DEFAULT_FAQS);
  store.set(KEY.reviews, DEFAULT_REVIEWS);

  adminToast("Reverted to factory luxury defaults.");
  setTimeout(() => location.reload(), 1000);
});

/* =========================================================
   CHECK BACKEND STATUS
   ========================================================= */
async function checkBackendConnectivity() {
  const pill = document.getElementById("engine-status");
  const text = document.getElementById("engine-status-text");
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      isBackendOnline = true;
      if (pill) {
        pill.classList.add("backend-on");
        if (text) text.textContent = "Backend API Connected (Sync Active)";
      }

      // Automatically hydrate live data from backend
      try {
        const [
          prodRes,
          ordersRes,
          custRes,
          msgsRes,
          newsRes,
          settingsRes,
          couponsRes,
          reviewsRes,
          faqsRes,
          emailCfgRes
        ] = await Promise.all([
          fetch(`${API_BASE}/products`).catch(() => null),
          fetch(`${API_BASE}/admin/orders`).catch(() => null),
          fetch(`${API_BASE}/admin/customers`).catch(() => null),
          fetch(`${API_BASE}/admin/messages`).catch(() => null),
          fetch(`${API_BASE}/admin/newsletter`).catch(() => null),
          fetch(`${API_BASE}/settings`).catch(() => null),
          fetch(`${API_BASE}/coupons`).catch(() => null),
          fetch(`${API_BASE}/reviews`).catch(() => null),
          fetch(`${API_BASE}/faqs`).catch(() => null),
          fetch(`${API_BASE}/admin/order-notification-config`).catch(() => null),
        ]);

        if (prodRes && prodRes.ok) {
          const prods = await prodRes.json();
          if (Array.isArray(prods) && prods.length > 0) {
            const formatted = prods.map((p) => ({
              id: p.id,
              name: p.name,
              slug: p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              category: p.category || "candles",
              price: Number(p.price) || 0,
              mrp: p.mrp ? Number(p.mrp) : Math.round((Number(p.price) || 0) * 1.2),
              stock: p.stock !== undefined ? Number(p.stock) : 20,
              featured: Boolean(p.featured),
              icon: p.icon || "🕯️",
              image_url: p.image_url || "",
              notes: p.fragrance_notes || p.notes || "",
              desc: p.description || p.desc || "",
            }));
            store.set(KEY.products, formatted);
            loadCatalogTable();
          }
        }

        if (ordersRes && ordersRes.ok) {
          const ords = await ordersRes.json();
          if (Array.isArray(ords)) {
            store.set(KEY.orders, ords);
            loadOrdersTable();
          }
        }

        if (custRes && custRes.ok) {
          const custs = await custRes.json();
          if (Array.isArray(custs)) {
            store.set(KEY.customers, custs);
            loadCustomersTable();
          }
        }

        if (msgsRes && msgsRes.ok) {
          const msgs = await msgsRes.json();
          if (Array.isArray(msgs)) {
            store.set(KEY.msgs, msgs);
            loadInquiriesTable();
          }
        }

        if (newsRes && newsRes.ok) {
          const news = await newsRes.json();
          if (Array.isArray(news)) {
            const emails = news.map((x) => (typeof x === "string" ? x : (x.email || ""))).filter(Boolean);
            store.set(KEY.news, emails);
            loadNewsletterTable();
          }
        }

        if (settingsRes && settingsRes.ok) {
          const s = await settingsRes.json();
          if (s && typeof s === "object" && Object.keys(s).length > 0) {
            const current = store.get(KEY.settings, DEFAULT_SETTINGS);
            const merged = { ...current, ...s };
            store.set(KEY.settings, merged);
            loadThemeSettings();
            loadPaymentSettings();
            loadCmsForms();
          }
        }

        if (couponsRes && couponsRes.ok) {
          const c = await couponsRes.json();
          if (c && typeof c === "object" && Object.keys(c).length > 0) {
            store.set(KEY.coupons, c);
            loadCouponsTable();
          }
        }

        if (reviewsRes && reviewsRes.ok) {
          const r = await reviewsRes.json();
          if (Array.isArray(r) && r.length > 0) {
            store.set(KEY.reviews, r);
            loadReviewsTable();
          }
        }

        if (faqsRes && faqsRes.ok) {
          const f = await faqsRes.json();
          if (Array.isArray(f) && f.length > 0) {
            store.set(KEY.faqs, f);
            loadFaqsTable();
          }
        }

        if (emailCfgRes && emailCfgRes.ok) {
          const cfg = await emailCfgRes.json();
          const emailTargetEl = document.getElementById("order-email-target");
          if (emailTargetEl && cfg.notification_email) {
            emailTargetEl.textContent = cfg.notification_email;
          }
        }

        updateDashboard();
      } catch (e) {
        console.warn("Backend hydration note:", e);
      }
    } else {
      throw new Error();
    }
  } catch {
    isBackendOnline = false;
    if (pill) {
      pill.classList.remove("backend-on");
      if (text) text.textContent = "Unified Local Engine (Offline Ready)";
    }
  }
}

/* =========================================================
   INITIALIZATION
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  // Check if store has initial data, if not seed it
  if (!store.get(KEY.products, null)) store.set(KEY.products, DEFAULT_PRODUCTS);
  if (!store.get(KEY.settings, null)) store.set(KEY.settings, DEFAULT_SETTINGS);
  if (!store.get(KEY.coupons, null)) store.set(KEY.coupons, DEFAULT_COUPONS);
  if (!store.get(KEY.faqs, null)) store.set(KEY.faqs, DEFAULT_FAQS);
  if (!store.get(KEY.reviews, null)) store.set(KEY.reviews, DEFAULT_REVIEWS);

  checkBackendConnectivity();
  setupImageUploadHandlers();
  updateDashboard();
  loadCatalogTable();
  loadCmsForms();
  loadThemeSettings();
  loadPaymentSettings();
  loadOrdersTable();
  loadCustomersTable();
  loadCouponsTable();
  loadInquiriesTable();
  loadNewsletterTable();
  loadReviewsTable();
  loadFaqsTable();
});

// React live to external updates
window.addEventListener("storage", () => {
  updateDashboard();
  loadCatalogTable();
  loadOrdersTable();
  loadCustomersTable();
  loadInquiriesTable();
  loadNewsletterTable();
  loadReviewsTable();
  loadFaqsTable();
});
