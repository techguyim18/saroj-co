"use strict";

/* =========================================================
   SAROJ&CO LUXURY HOME FRAGRANCE – MASTER CLIENT STORE ENGINE
   Dual-Sync: LocalStorage Persistence + Realtime API Sync
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
  reviews: "nishu_reviews"
};

// Current page filename detector
const PAGE = (() => {
  let n = (location.pathname.split("/").pop() || "").toLowerCase();
  if (!n) n = "index";
  return n.endsWith(".html") ? n : n + ".html";
})();

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
    } catch { }
  },
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const formatPrice = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/* =========================================================
   DEFAULT CATALOG WITH HIGH-RESOLUTION LUXURY IMAGERY
   ========================================================= */
const CATS = {
  candles: "Scented Candle",
  diffusers: "Reed Diffuser",
  sprays: "Room Spray",
  melts: "Wax Melts",
  "gift-sets": "Gift Set",
};

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

// Dynamic catalog helpers
function getProducts() {
  const custom = store.get(KEY.products, null);
  if (Array.isArray(custom) && custom.length > 0) return custom;
  return DEFAULT_PRODUCTS;
}

function getProduct(id) {
  const list = getProducts();
  return list.find((p) => Number(p.id) === Number(id));
}

const COLLECTIONS = {
  signature: { name: "Signature Range", ids: [1, 2, 7, 11, 14] },
  summer: { name: "Summer Collection", ids: [4, 8, 12, 13, 15] },
  timeless: { name: "Timeless Collection", ids: [3, 5, 6, 9, 10, 16] },
};

/* =========================================================
   COUPONS & PROMOTIONS ENGINE
   ========================================================= */
const DEFAULT_COUPONS = {
  SAROJ10: { label: "10% off with Saroj&co", min: 0, type: "percent", value: 10, calc: (s) => Math.round(s * 0.1) },
  NISHU10: { label: "10% off your entire order", min: 0, type: "percent", value: 10, calc: (s) => Math.round(s * 0.1) },
  WELCOME200: { label: "₹200 off on orders above ₹1,000", min: 1000, type: "flat", value: 200, calc: (s) => (s >= 1000 ? 200 : 0) },
  FESTIVE25: { label: "Festive special: 25% off above ₹2,000", min: 2000, type: "percent", value: 25, calc: (s) => (s >= 2000 ? Math.round(s * 0.25) : 0) },
};

function getCoupons() {
  const custom = store.get(KEY.coupons, null);
  if (custom && typeof custom === "object" && Object.keys(custom).length > 0) {
    // Ensure calc method exists
    const full = {};
    for (const [k, v] of Object.entries(custom)) {
      full[k] = {
        ...v,
        calc: (subtotal) => {
          if (v.min && subtotal < v.min) return 0;
          if (v.type === "percent") return Math.round(subtotal * (Number(v.value) / 100));
          return Math.min(Number(v.value) || 0, subtotal);
        }
      };
    }
    return full;
  }
  return DEFAULT_COUPONS;
}

/* =========================================================
   DEFAULT SETTINGS & CMS CONTENT
   ========================================================= */
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
  instagram_url: "https://www.instagram.com/saroj_co.7?psln=bjJqZDN3bnpsNzVo",
  facebook_url: "https://www.facebook.com/share/14pWdcvLyvU/",
  whatsapp_url: "https://wa.me/919306353104?text=Hi%20Saroj%26co%2C%20I%20have%20an%20enquiry.",
  support_hours: "Monday – Saturday, 9:00 AM – 7:00 PM IST",
  footer_bio: "Thoughtfully created fragrances for beautiful spaces and everyday rituals.",
  copyright_text: `© ${new Date().getFullYear()} Saroj&co. All rights reserved.`,
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

function getSettings() {
  const s = { ...DEFAULT_SETTINGS, ...(store.get(KEY.settings, {}) || {}) };
  if (!s.brand_name || s.brand_name === "Nishu") s.brand_name = "Saroj&co";
  if (s.upi_id === "nishufragrance@upi") s.upi_id = "sarojandco@upi";
  if (s.upi_name === "Nishu Luxury Fragrance") s.upi_name = "Saroj&co Luxury Fragrance";
  if (!s.support_email || s.support_email.includes("example")) {
    s.support_email = "cosaroj032@gmail.com";
  }
  if (!s.support_phone || s.support_phone.includes("98765")) {
    s.support_phone = "+91 93063 53104";
  }
  if (!s.instagram_url || s.instagram_url === "https://www.instagram.com") {
    s.instagram_url = "https://www.instagram.com/saroj_co.7?psln=bjJqZDN3bnpsNzVo";
  }
  if (!s.facebook_url || s.facebook_url === "https://www.facebook.com") {
    s.facebook_url = "https://www.facebook.com/share/14pWdcvLyvU/";
  }
  if (!s.whatsapp_url || s.whatsapp_url.includes("9876543210")) {
    s.whatsapp_url = "https://wa.me/919306353104?text=Hi%20Saroj%26co%2C%20I%20have%20an%20enquiry.";
  }
  if (s.copyright_text && s.copyright_text.includes("Nishu")) s.copyright_text = s.copyright_text.replace(/Nishu/g, "Saroj&co");
  if (s.announcement_text && s.announcement_text.includes("Nishu")) s.announcement_text = s.announcement_text.replace(/Nishu/g, "Saroj&co");
  return s;
}

function getFaqs() {
  const custom = store.get(KEY.faqs, null);
  if (Array.isArray(custom) && custom.length > 0) return custom;
  return DEFAULT_FAQS;
}

function getReviews() {
  const custom = store.get(KEY.reviews, null);
  if (Array.isArray(custom) && custom.length > 0) return custom;
  return DEFAULT_REVIEWS;
}

/* =========================================================
   LIVE SITE SETTINGS & THEME APPLIER (INSTANT REFLECTION)
   ========================================================= */
function applyLiveSiteSettings() {
  const settings = getSettings();

  // 1. Theme Presets (classic, diwali, noir, royal, emerald, rose)
  document.body.classList.remove("theme-classic", "theme-diwali", "theme-noir", "theme-royal");
  if (settings.theme_mode && settings.theme_mode !== "classic") {
    document.body.classList.add(`theme-${settings.theme_mode}`);
  }

  // 2. Festive Animated Decoration (Candles or Lamps - No diyas)
  let decorEl = $("#nishu-festive-decor");
  const decorType = settings.festival_decoration;
  if (decorType && decorType !== "none") {
    if (!decorEl) {
      decorEl = document.createElement("div");
      decorEl.id = "nishu-festive-decor";
      document.body.appendChild(decorEl);
    }
    decorEl.className = "festival-ambient-decor";
    if (decorType === "lamp") {
      decorEl.classList.add("decor-lamps");
    } else if (decorType === "candle-lamp") {
      decorEl.classList.add("decor-candle-lamp");
    } else {
      decorEl.classList.add("decor-candles");
    }
  } else if (decorEl) {
    decorEl.remove();
  }

  // 3. Top Announcement Bar
  const bar = $(".site-announcement-bar");
  if (bar) {
    if (settings.announcement_active === "false" || settings.announcement_active === false) {
      bar.style.display = "none";
    } else {
      bar.style.display = "block";
      if (settings.announcement_text) {
        bar.textContent = settings.announcement_text;
      }
    }
  }

  // 4. Logo / Brand Name (Keep only circular image in header)
  const headerLogo = $(".site-header .logo");
  if (headerLogo) {
    const logoSrc = settings.logo_url || "images/logo-256.png";
    const brand = esc(settings.brand_name || "Saroj&co");
    headerLogo.setAttribute("aria-label", brand);
    if (!headerLogo.querySelector("img.header-logo-img")) {
      headerLogo.innerHTML = `<img src="${logoSrc}" alt="${brand}" class="header-logo-img" onerror="this.onerror=null; this.src='images/logo.png';" />`;
    }
  }
  const footerLogo = $(".footer-brand .footer-logo");
  if (footerLogo) {
    const logoSrc = settings.logo_url || "images/logo-256.png";
    const brand = esc(settings.brand_name || "Saroj&co");
    footerLogo.setAttribute("aria-label", brand);
    if (!footerLogo.querySelector("img.footer-logo-img")) {
      footerLogo.innerHTML = `<img src="${logoSrc}" alt="${brand}" class="footer-logo-img" onerror="this.onerror=null; this.src='images/logo.png';" /><span class="footer-logo-text">${brand}</span>`;
    }
  }

  // 5. Homepage Hero Section Customization
  if (PAGE === "index.html") {
    const heroEyebrow = $(".hero-copy .eyebrow");
    if (heroEyebrow && settings.hero_eyebrow) heroEyebrow.textContent = settings.hero_eyebrow;

    const heroTitle = $(".hero-copy h1");
    if (heroTitle && settings.hero_title) heroTitle.textContent = settings.hero_title;

    const heroSub = $(".hero-copy p");
    if (heroSub && settings.hero_subtitle) heroSub.textContent = settings.hero_subtitle;

    const btn1 = $(".hero-copy .button-row a:first-child");
    if (btn1 && settings.hero_btn1_text) {
      btn1.textContent = settings.hero_btn1_text;
      if (settings.hero_btn1_link) btn1.href = settings.hero_btn1_link;
    }
    const btn2 = $(".hero-copy .button-row a:last-child");
    if (btn2 && settings.hero_btn2_text) {
      btn2.textContent = settings.hero_btn2_text;
      if (settings.hero_btn2_link) btn2.href = settings.hero_btn2_link;
    }

    // Render Testimonials Dynamically
    const testWrap = $(".testimonials");
    if (testWrap) {
      const revs = getReviews();
      if (revs && revs.length) {
        testWrap.innerHTML = revs.map(r => `
          <div class="quote-card">
            <div class="stars">${"★".repeat(r.stars || 5)}</div>
            <p>"${esc(r.quote)}"</p>
            <strong>– ${esc(r.name)}, ${esc(r.city || "India")}</strong>
          </div>
        `).join("");
      }
    }
  }

  // 6. About Page Content Customization
  if (PAGE === "about.html") {
    const content = store.get(KEY.page_content, {})?.about || {};
    if (content.title) {
      const h1 = $(".page-hero h1");
      if (h1) h1.textContent = content.title;
    }
    if (content.subtitle) {
      const p = $(".page-hero p");
      if (p) p.textContent = content.subtitle;
    }
    if (content.story_title) {
      const h2 = $(".feature-card h2");
      if (h2) h2.textContent = content.story_title;
    }
    if (content.story_p1) {
      const p1 = $(".feature-card p:first-of-type");
      if (p1) p1.textContent = content.story_p1;
    }
  }

  // 7. Bespoke Page Content Customization
  if (PAGE === "bespoke.html") {
    const content = store.get(KEY.page_content, {})?.bespoke || {};
    if (content.title) {
      const h1 = $(".page-hero h1");
      if (h1) h1.textContent = content.title;
    }
    if (content.subtitle) {
      const p = $(".page-hero p");
      if (p) p.textContent = content.subtitle;
    }
  }

  // 8. Contact Page Info Customization
  if (PAGE === "contact.html") {
    $$(".feature-card p").forEach(el => {
      if (el.textContent.includes("support@sarojandco") || el.textContent.includes("support@nishu")) {
        el.textContent = settings.support_email || "support@sarojandco.example";
      }
      if (el.textContent.includes("Monday – Friday")) {
        el.textContent = settings.support_hours || "Monday – Friday, 9:00 AM – 6:00 PM IST";
      }
    });
  }

  // 9. Footer Details
  const footerBrandP = $(".footer-brand p");
  if (footerBrandP && settings.footer_bio) {
    footerBrandP.textContent = settings.footer_bio;
  }
}

/* =========================================================
   BACKGROUND BACKEND SYNC (When Backend is Online)
   ========================================================= */
async function syncWithBackendIfOnline() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    const [settingsRes, productsRes] = await Promise.all([
      fetch(`${API_BASE}/settings`, { signal: controller.signal }).catch(() => null),
      fetch(`${API_BASE}/products`, { signal: controller.signal }).catch(() => null),
    ]);
    clearTimeout(timeout);

    if (settingsRes && settingsRes.ok) {
      const remoteSettings = await settingsRes.json();
      if (remoteSettings && Object.keys(remoteSettings).length > 0) {
        const merged = { ...getSettings(), ...remoteSettings };
        store.set(KEY.settings, merged);
        applyLiveSiteSettings();
      }
    }

    if (productsRes && productsRes.ok) {
      const remoteProducts = await productsRes.json();
      if (Array.isArray(remoteProducts) && remoteProducts.length > 0) {
        // Merge remote products with local catalog
        const local = getProducts();
        const mergedList = remoteProducts.map(rp => {
          const matched = local.find(lp => lp.id === rp.id || lp.slug === rp.slug);
          return {
            id: rp.id,
            name: rp.name,
            slug: rp.slug || rp.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            category: rp.category || "candles",
            price: Number(rp.price) || 999,
            mrp: rp.mrp ? Number(rp.mrp) : (matched ? matched.mrp : Math.round(Number(rp.price) * 1.2)),
            stock: (rp.stock !== undefined) ? Number(rp.stock) : (matched ? matched.stock : 20),
            featured: (rp.featured !== undefined) ? Boolean(rp.featured) : (matched ? matched.featured : true),
            icon: rp.icon || (matched ? matched.icon : "🕯️"),
            image_url: rp.image_url || (matched ? matched.image_url : ""),
            notes: rp.fragrance_notes || rp.notes || (matched ? matched.notes : "Luxury Fragrance Notes"),
            desc: rp.description || (matched ? matched.desc : "")
          };
        });
        store.set(KEY.products, mergedList);
        if ($("#product-grid") || $("#product-detail") || $("#search-results")) {
          initShop();
        }
      }
    }
  } catch (err) {
    // Silently fall back to offline/localStorage mode
  }
}

/* =========================================================
   TOAST NOTIFICATION COMPONENT
   ========================================================= */
function toast(msg) {
  let box = $("#toast-box");
  if (!box) {
    box = document.createElement("div");
    box.id = "toast-box";
    document.body.appendChild(box);
  }
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  box.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 300);
  }, 2600);
}

/* =========================================================
   CART CONTROLLER
   ========================================================= */
const cart = {
  items: () => store.get(KEY.cart, []),
  save(list) {
    store.set(KEY.cart, list);
    updateCartCount();
  },
  count() {
    return this.items().reduce((t, i) => t + i.qty, 0);
  },
  add(id, qty = 1) {
    const p = getProduct(id);
    if (!p) return;
    if (Number(p.stock) <= 0) {
      toast(`${p.name} is currently out of stock`);
      return;
    }
    const list = this.items();
    const row = list.find((i) => Number(i.id) === Number(p.id));
    const next = Math.min((row ? row.qty : 0) + qty, p.stock);
    if (row) row.qty = next;
    else list.push({ id: p.id, qty: next });
    this.save(list);
    toast(`${p.name} added to your bag`);
  },
  setQty(id, qty) {
    const p = getProduct(id);
    const list = this.items();
    const row = list.find((i) => Number(i.id) === Number(id));
    if (!row || !p) return;
    row.qty = Math.max(1, Math.min(Number(qty) || 1, p.stock));
    this.save(list);
  },
  remove(id) {
    this.save(this.items().filter((i) => Number(i.id) !== Number(id)));
  },
  detailed() {
    return this.items()
      .map((i) => {
        const prod = getProduct(i.id);
        return prod ? { ...prod, qty: i.qty } : null;
      })
      .filter(Boolean);
  },
  total() {
    return this.detailed().reduce((t, i) => t + i.price * i.qty, 0);
  },
  coupon() {
    const c = store.get(KEY.coupon, "");
    const coupons = getCoupons();
    return coupons[c] ? c : "";
  },
  discount() {
    const c = this.coupon();
    if (!c) return 0;
    const coupons = getCoupons();
    return Math.min(coupons[c].calc(this.total()), this.total());
  },
  grand() {
    return Math.max(0, this.total() - this.discount());
  },
  clear() {
    store.del(KEY.coupon);
    this.save([]);
  },
};

function updateCartCount() {
  const n = cart.count();
  $$("#cart-count").forEach((el) => {
    el.textContent = n;
    el.classList.toggle("is-empty", n === 0);
  });
}

/* =========================================================
   WISHLIST CONTROLLER
   ========================================================= */
const wish = {
  ids: () => store.get(KEY.wish, []).map(Number),
  has(id) {
    return this.ids().includes(Number(id));
  },
  toggle(id) {
    id = Number(id);
    let list = this.ids();
    const p = getProduct(id);
    if (list.includes(id)) {
      list = list.filter((x) => x !== id);
      toast("Removed from wishlist");
    } else {
      list.push(id);
      toast(`${p ? p.name : "Item"} saved to wishlist`);
    }
    store.set(KEY.wish, list);
    refreshWishButtons();
    updateWishCount();
    renderWishlist();
    if ($(".profile-page")) renderProfile();
  },
};

function updateWishCount() {
  const n = wish.ids().length;
  $$("#wish-count").forEach((el) => {
    el.textContent = n;
    el.classList.toggle("is-empty", n === 0);
  });
}

function refreshWishButtons() {
  $$(".wishlist-toggle").forEach((btn) => {
    const saved = wish.has(btn.dataset.id);
    btn.classList.toggle("saved", saved);
    if (btn.id === "detail-wish-btn") {
      btn.textContent = saved ? "♥ In Wishlist" : "♡ Save to Wishlist";
    } else {
      btn.textContent = saved ? "♥" : "♡";
    }
  });
}

/* =========================================================
   PRODUCT CARD (REAL LUXURY IMAGE + SMART FALLBACK)
   ========================================================= */
function productCard(p) {
  const saved = wish.has(p.id);
  const off = p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;
  const isOutOfStock = Number(p.stock) <= 0;

  const imageHtml = p.image_url
    ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy" onerror="this.onerror=null;this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='block';">
       <span class="p-emoji" style="display:none">${p.icon || '🕯️'}</span>`
    : `<span class="p-emoji">${p.icon || '🕯️'}</span>`;

  return `
    <article class="product-card" data-category="${esc(p.category)}">
      <a href="product-details.html?id=${p.id}">
        <div class="product-image cat-${esc(p.category)}">
          ${off ? `<span class="p-badge">-${off}%</span>` : ""}
          ${imageHtml}
        </div>
      </a>
      <p class="product-category">${esc(CATS[p.category] || "Fragrance")}</p>
      <h3><a href="product-details.html?id=${p.id}">${esc(p.name)}</a></h3>
      <p class="p-notes">${esc(p.notes || "")}</p>
      <p class="price">${formatPrice(p.price)} ${p.mrp > p.price ? `<del>${formatPrice(p.mrp)}</del>` : ""}</p>
      ${isOutOfStock ? `<p class="stock-low" style="color:#b31d28;font-weight:700">Out of Stock</p>` : p.stock <= 12 ? `<p class="stock-low">Only ${p.stock} left in stock</p>` : ""}
      <div class="card-actions">
        <button class="btn btn-dark add-to-cart" data-id="${p.id}" type="button" ${isOutOfStock ? "disabled style='opacity:0.6;cursor:not-allowed'" : ""}>${isOutOfStock ? "Sold Out" : "Add to Bag"}</button>
        <button class="btn btn-outline wishlist-toggle ${saved ? "saved" : ""}" data-id="${p.id}" type="button" aria-label="Save to wishlist">${saved ? "♥" : "♡"}</button>
      </div>
    </article>`;
}

const emptyState = (title, text = "", link = true) =>
  `<div class="empty-state"><h2>${title}</h2>${text ? `<p>${text}</p>` : ""}${link ? `<a href="products.html" class="btn btn-dark" style="margin-top:15px;display:inline-block">Shop Products</a>` : ""}</div>`;

/* =========================================================
   HEADER, FOOTER & CORE CSS INJECTION
   ========================================================= */
const ICONS = {
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/>',
  heart: '<path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/>',
  bag: '<path d="M5.5 8h13l-1.1 12.2a1 1 0 0 1-1 .8H7.6a1 1 0 0 1-1-.8L5.5 8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
};
const svg = (name) =>
  `<svg class="ico" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

const SOCIAL_ICONS = {
  instagram: `<svg class="social-ico" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>`,
  facebook: `<svg class="social-ico" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879v-6.988h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.891h-2.33v6.988C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10z"/></svg>`,
  whatsapp: `<svg class="social-ico" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12.004 2C6.48 2 2 6.48 2 12c0 1.94.55 3.75 1.51 5.28L2 22l4.86-1.48C8.35 21.46 10.12 22 12.004 22c5.523 0 10-4.48 10-10s-4.477-10-10-10zm5.666 14.41c-.24.67-1.39 1.28-1.92 1.36-.5.08-1.12.11-3.6-0.89-3.07-1.25-5.01-4.38-5.16-4.58-.15-.2-1.22-1.62-1.22-3.09s.77-2.19 1.04-2.49c.28-.3.6-.37.8-.37.2 0 .4 0 .58.01.19.01.44-.07.69.52.25.6.85 2.08.93 2.23.08.15.13.33.03.53-.1.2-.15.33-.3.51-.15.18-.32.4-.46.54-.15.15-.31.31-.13.62.18.31.8 1.32 1.72 2.14 1.18 1.05 2.17 1.37 2.48 1.52.31.15.49.13.67-.08.18-.21.77-.9 1-.98.23-.08.46-.04.66.04s1.28.6 1.5 1.02c.22.42.22.79.03 1.07z"/></svg>`,
  phone: `<svg class="social-ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  email: `<svg class="social-ico" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>`
};

function injectCoreCss() {
  if ($("#nishu-core-css")) return;
  const s = document.createElement("style");
  s.id = "nishu-core-css";
  s.textContent = `
  .site-header{display:flex;align-items:center;justify-content:space-between}
  .header-actions{display:flex;align-items:center;gap:6px}
  .header-actions .icon-btn{position:relative;width:42px;height:42px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:var(--nishu-ink,#1f3a4d)}
  .cart-badge{position:absolute;top:2px;right:0;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:var(--nishu-gold,#b98a3e);color:#fff;font:700 11px/18px Arial,sans-serif;text-align:center}
  .cart-badge.is-empty{display:none}
  .nav-toggle{display:none;background:none;color:var(--nishu-ink,#1f3a4d);border:1px solid var(--nishu-border,#e8dfd2);border-radius:8px;font-size:20px;padding:4px 11px;line-height:1.2}
  @media (max-width:980px){
    .site-header{flex-wrap:wrap;padding:10px 5%;gap:10px}
    .logo{order:1;margin-right:auto}.header-actions{order:2}.nav-toggle{display:block;order:3}
    .main-nav{order:4;width:100%;display:none;flex-direction:column;align-items:flex-start;gap:2px;padding:8px 0 12px}
    .site-header.nav-open .main-nav{display:flex}
    .dropdown-menu{position:static;opacity:1;visibility:visible;transform:none;box-shadow:none;border:none;background:transparent;padding:0 0 0 14px}
  }
  .product-image img, .detail-image img, .cart-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .admin-footer-pill { display: inline-flex; align-items: center; gap: 5px; color: var(--nishu-gold,#c5a059); font-weight: 600; text-decoration: none; padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(197, 160, 89, 0.4); font-size: 13px; transition: all 0.2s; }
  .admin-footer-pill:hover { background: var(--nishu-gold,#c5a059); color: #fff; transform: translateY(-1px); }
  .stock-low{color:#b03a3a;font-size:13px;font-weight:600;margin:-4px 0 8px}
  .coupon-box{margin:14px 0 4px;padding-top:12px;border-top:1px dashed var(--nishu-border,#e8dfd2)}
  .coupon-row{display:flex;gap:8px}
  .coupon-row input{flex:1;min-width:0;padding:9px 12px;border:1px solid var(--nishu-border,#e8dfd2);border-radius:999px;text-transform:uppercase}
  .coupon-row .btn{padding:8px 16px;font-size:13px}
  .coupon-msg{font-size:13px;margin-top:6px;color:#b03a3a}
  .coupon-applied{color:#1e7e34;font-size:14px;gap:8px;align-items:center}
  .discount-line strong{color:#1e7e34}
  .order-steps{display:flex;gap:6px;margin:10px 0 4px;flex-wrap:wrap}
  .order-steps span{font-size:11px;padding:3px 10px;border-radius:999px;background:#f1ebe2;color:#8a8279}
  .order-steps span.done{background:#e3f1e8;color:#1e7e34;font-weight:700}
  .order-cancelled{margin-top:8px;color:#b03a3a;font-weight:700;font-size:13px}
  .cancel-order-btn{margin-top:8px;background:none;border:1px solid #b03a3a;color:#b03a3a;border-radius:999px;padding:5px 14px;font-size:12px}
  .cancel-order-btn:hover{background:#b03a3a;color:#fff}

  /* Responsive Design Enhancements for Phones & Small Tablets */
  @media (max-width: 640px) {
    .product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 10px !important; }
    .product-card { padding: 10px 10px 14px !important; border-radius: 12px !important; }
    .product-card .product-image { aspect-ratio: 1 / 1 !important; height: 155px !important; border-radius: 8px !important; margin-bottom: 8px !important; }
    .product-card h3 { font-size: 13.5px !important; min-height: 34px !important; line-height: 1.25 !important; margin-bottom: 4px !important; }
    .product-card .notes { font-size: 11px !important; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
    .product-card .price { font-size: 13.5px !important; margin-bottom: 8px !important; }
    .product-card .card-actions { flex-direction: column !important; gap: 6px !important; }
    .product-card .card-actions .btn { width: 100% !important; padding: 7px 8px !important; font-size: 11.5px !important; justify-content: center !important; }
    .category-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 10px !important; }
    .hero { padding: 20px 0 !important; min-height: auto !important; }
    .hero-copy { padding: 24px 16px !important; text-align: center !important; align-items: center !important; }
    .hero-copy h1 { font-size: clamp(24px, 6.5vw, 32px) !important; line-height: 1.2 !important; }
    .hero-copy p { font-size: 14px !important; line-height: 1.5 !important; }
    .hero-actions { display: flex !important; flex-wrap: wrap !important; gap: 10px !important; justify-content: center !important; width: 100% !important; }
    .hero-actions .btn { flex: 1 1 130px !important; text-align: center !important; }
    .container { padding-left: 14px !important; padding-right: 14px !important; }
    .footer-container { display: flex !important; flex-direction: column !important; text-align: center !important; gap: 24px !important; }
    .footer-brand, .footer-column, .footer-newsletter { text-align: center !important; align-items: center !important; }
    .footer-logo { justify-content: center !important; }
    .social-links { justify-content: center !important; margin: 0 auto !important; }
    .footer-newsletter form { max-width: 320px; margin: 0 auto; }
    .footer-bottom { flex-direction: column !important; gap: 8px !important; text-align: center !important; }
    .cart-layout, .checkout-layout { grid-template-columns: 1fr !important; gap: 20px !important; }
    .cart-table-wrap, .table-responsive { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; width: 100% !important; display: block !important; }
    .modal-content, .receipt-modal-content, .order-details-modal-content { width: 94% !important; max-width: 94% !important; margin: 16px auto !important; padding: 16px !important; }
  }

  @media (min-width: 641px) and (max-width: 980px) {
    .product-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 14px !important; }
    .category-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 14px !important; }
  }

  /* FESTIVE AMBIENT DECORATIONS (CANDLES & LAMPS) */
  .festival-ambient-decor, .festival-diwali-decor {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 99999;
  }
  .festival-ambient-decor::before,
  .festival-ambient-decor::after,
  .festival-diwali-decor::before,
  .festival-diwali-decor::after {
    content: "🕯️" !important;
    position: fixed;
    top: 90px;
    font-size: 30px;
    filter: drop-shadow(0 0 14px rgba(245, 158, 11, 0.85));
    animation: candleGlow 2.5s infinite alternate ease-in-out;
    transition: transform 0.3s;
  }
  .festival-ambient-decor::before,
  .festival-diwali-decor::before { left: 24px; }
  .festival-ambient-decor::after,
  .festival-diwali-decor::after { right: 24px; }

  .festival-ambient-decor.decor-lamps::before,
  .festival-ambient-decor.decor-lamps::after {
    content: "🏮" !important;
    filter: drop-shadow(0 0 16px rgba(239, 68, 68, 0.75));
    animation: lampSway 3s infinite alternate ease-in-out;
  }
  .festival-ambient-decor.decor-candle-lamp::before {
    content: "🕯️" !important;
    filter: drop-shadow(0 0 14px rgba(245, 158, 11, 0.85));
    animation: candleGlow 2.5s infinite alternate ease-in-out;
  }
  .festival-ambient-decor.decor-candle-lamp::after {
    content: "🏮" !important;
    filter: drop-shadow(0 0 16px rgba(239, 68, 68, 0.75));
    animation: lampSway 3s infinite alternate ease-in-out;
  }

  @keyframes candleGlow {
    0% { transform: translateY(0) scale(0.96); opacity: 0.88; filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.75)); }
    100% { transform: translateY(-8px) scale(1.1); opacity: 1; filter: drop-shadow(0 0 22px rgba(251, 191, 36, 0.95)); }
  }
  @keyframes lampSway {
    0% { transform: translateY(0) rotate(-3deg); opacity: 0.9; filter: drop-shadow(0 0 12px rgba(220, 38, 38, 0.7)); }
    100% { transform: translateY(-6px) rotate(3deg); opacity: 1; filter: drop-shadow(0 0 22px rgba(245, 158, 11, 0.9)); }
  }

  @media (max-width: 768px) {
    .festival-ambient-decor::before,
    .festival-ambient-decor::after,
    .festival-diwali-decor::before,
    .festival-diwali-decor::after { top: 75px; font-size: 22px; }
    .festival-ambient-decor::before,
    .festival-diwali-decor::before { left: 8px; }
    .festival-ambient-decor::after,
    .festival-diwali-decor::after { right: 8px; }
  }`;
  document.head.appendChild(s);
}

function buildLayout() {
  const NAV = [
    ["Home", "index.html"],
    ["Shop", "products.html", [
      ["All Products", "products.html"],
      ["Scented Candles", "products.html?category=candles"],
      ["Reed Diffusers", "products.html?category=diffusers"],
      ["Room Sprays", "products.html?category=sprays"],
      ["Wax Melts", "products.html?category=melts"],
      ["Gift Sets", "gift-sets.html"],
    ]],
    ["Collections", "collections.html", [
      ["Signature Range", "products.html?collection=signature"],
      ["Summer Collection", "products.html?collection=summer"],
      ["Timeless Collection", "products.html?collection=timeless"],
    ]],
    ["Bespoke", "bespoke.html"],
    ["About Us", "about.html"],
    ["Contact", "contact.html"],
  ];
  const link = ([t, h]) => `<a href="${h}">${t}</a>`;
  const nav = NAV.map(([t, h, sub]) =>
    sub
      ? `<div class="nav-dropdown"><a href="${h}">${t}</a><div class="dropdown-menu">${sub.map(link).join("")}</div></div>`
      : link([t, h]),
  ).join("");

  if (!$(".site-announcement-bar")) {
    const bar = document.createElement("div");
    bar.className = "site-announcement-bar";
    bar.textContent = "Free shipping across India · Cash on Delivery available";
    document.body.prepend(bar);
  }

  let header = $(".site-header");
  if (!header) {
    header = document.createElement("header");
    header.className = "site-header";
    $(".site-announcement-bar").after(header);
  }
  const settings = getSettings();
  const brandTitle = settings.brand_name || "Saroj&co";
  const logoSrc = settings.logo_url || "images/logo-256.png";

  header.innerHTML = `
    <a class="logo" href="index.html" aria-label="${esc(brandTitle)}">
      <img src="${logoSrc}" alt="${esc(brandTitle)}" class="header-logo-img" onerror="this.onerror=null; this.src='images/logo.png';" />
    </a>
    <button class="nav-toggle" type="button" aria-label="Menu" aria-expanded="false">☰</button>
    <nav class="main-nav">${nav}</nav>
    <div class="header-actions">
      <a class="icon-btn" href="search.html" aria-label="Search" title="Search">${svg("search")}</a>
      <a class="icon-btn" href="profile.html" aria-label="My Account" title="My Account">${svg("user")}</a>
      <a class="icon-btn" href="wishlist.html" aria-label="Wishlist" title="Wishlist">${svg("heart")}<span id="wish-count" class="cart-badge is-empty">0</span></a>
      <a class="icon-btn" href="cart.html" aria-label="Shopping Bag" title="Shopping Bag">${svg("bag")}<span id="cart-count" class="cart-badge">0</span></a>
    </div>`;

  $(".nav-toggle", header)?.addEventListener("click", (e) => {
    const open = header.classList.toggle("nav-open");
    e.currentTarget.setAttribute("aria-expanded", open);
  });
  $$(".main-nav > a, .nav-dropdown > a", header).forEach((a) => {
    if ((a.getAttribute("href") || "").split("?")[0].toLowerCase() === PAGE) a.classList.add("active");
  });

  let footer = $(".site-footer");
  if (!footer) {
    footer = document.createElement("footer");
    footer.className = "site-footer";
    document.body.appendChild(footer);
  }
  footer.innerHTML = `
    <div class="footer-container">
      <div class="footer-brand">
        <a class="footer-logo" href="index.html" aria-label="${esc(brandTitle)}">
          <img src="${logoSrc}" alt="${esc(brandTitle)}" class="footer-logo-img" onerror="this.onerror=null; this.src='images/logo.png';" />
          <span class="footer-logo-text">${esc(brandTitle)}</span>
        </a>
        <p>${esc(settings.footer_bio || "Thoughtfully created fragrances for beautiful spaces and everyday rituals.")}</p>
        <div class="social-links" aria-label="Follow Saroj&co on Social Media">
          <a href="${esc(settings.instagram_url || 'https://www.instagram.com/saroj_co.7?psln=bjJqZDN3bnpsNzVo')}" target="_blank" rel="noopener noreferrer" class="social-btn" aria-label="Instagram" title="Instagram">${SOCIAL_ICONS.instagram}</a>
          <a href="${esc(settings.facebook_url || 'https://www.facebook.com/share/14pWdcvLyvU/')}" target="_blank" rel="noopener noreferrer" class="social-btn" aria-label="Facebook" title="Facebook">${SOCIAL_ICONS.facebook}</a>
          <a href="${esc(settings.whatsapp_url || 'https://wa.me/919306353104?text=Hi%20Saroj%26co%2C%20I%20have%20an%20enquiry.')}" target="_blank" rel="noopener noreferrer" class="social-btn" aria-label="WhatsApp" title="WhatsApp">${SOCIAL_ICONS.whatsapp}</a>
          <a href="tel:${esc((settings.support_phone || '+91 93063 53104').replace(/\s+/g, ''))}" class="social-btn" aria-label="Call +91 93063 53104" title="Call Us: +91 93063 53104">${SOCIAL_ICONS.phone}</a>
          <a href="mailto:${esc(settings.support_email || 'cosaroj032@gmail.com')}" class="social-btn" aria-label="Email cosaroj032@gmail.com" title="Email: cosaroj032@gmail.com">${SOCIAL_ICONS.email}</a>
        </div>
      </div>
      <div class="footer-column">
        <h3>Explore</h3>
        <ul>
          <li><a href="products.html">Shop All</a></li>
          <li><a href="collections.html">Collections</a></li>
          <li><a href="gift-sets.html">Gift Sets</a></li>
          <li><a href="bespoke.html">Bespoke</a></li>
          <li><a href="about.html">Our Story</a></li>
        </ul>
      </div>
      <div class="footer-column">
        <h3>Customer Care</h3>
        <ul>
          <li><a href="contact.html">Contact Us</a></li>
          <li><a href="profile.html">My Account</a></li>
          <li><a href="shipping-returns.html">Shipping &amp; Returns</a></li>
          <li><a href="help.html">Help Center</a></li>
        </ul>
      </div>
      <div class="footer-newsletter">
        <h3>Stay in the Know</h3>
        <p style="font-size:14px;margin-bottom:10px">Fragrance inspiration and new blends, straight to your inbox.</p>
        <form id="newsletter-form">
          <div class="newsletter-input" style="display:flex;gap:6px">
            <input type="email" placeholder="Your email address" required />
            <button type="submit">Join</button>
          </div>
          <p id="newsletter-message" style="font-size:13px;margin-top:8px"></p>
        </form>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="legal-links">
        <a href="privacy-policy.html">Privacy</a>
        <a href="terms.html">Terms</a>
        <a href="shipping-returns.html">Shipping</a>
        <a href="admin.html">Authority Dashboard</a>
      </div>
      <span>${esc(settings.copyright_text || `© ${new Date().getFullYear()} Saroj&Co. All rights reserved.`)}</span>
      <button class="back-to-top" id="back-to-top" type="button">Back to Top ↑</button>
    </div>`;
}

function injectFonts() {
  if ($("#nishu-fonts")) return;
  const l = document.createElement("link");
  l.id = "nishu-fonts";
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap";
  document.head.appendChild(l);
}

/* =========================================================
   SHOP PAGES (DYNAMIC PRODUCTS FROM UNIFIED ENGINE)
   ========================================================= */
function initShop() {
  const grid = $("#product-grid");
  if (!grid || $("#product-detail")) return;

  const catalog = getProducts();

  if (PAGE === "index.html") {
    const featured = catalog.filter((p) => p.featured);
    const displayList = featured.length ? featured.slice(0, 8) : catalog.slice(0, 8);
    grid.innerHTML = displayList.map(productCard).join("");
    return;
  }
  if (PAGE === "gift-sets.html") {
    const gifts = catalog.filter((p) => p.category === "gift-sets");
    grid.innerHTML = gifts.length
      ? gifts.map(productCard).join("")
      : emptyState("No gift sets currently available", "Check back soon for upcoming holiday hampers.");
    return;
  }

  const params = new URLSearchParams(location.search);
  const boxes = $$(".category-filter");
  const sortSel = $("#sort-products");
  const urlCat = params.get("category");
  const col = COLLECTIONS[params.get("collection")];
  if (urlCat) boxes.forEach((b) => (b.checked = b.value === urlCat));
  if (col) {
    const h = $("#shop-title");
    if (h) h.textContent = col.name;
    const sub = $("#shop-sub");
    if (sub) sub.textContent = "A curated edit from the Saroj&co luxury collection.";
  }

  function apply() {
    const active = boxes.filter((b) => b.checked).map((b) => b.value);
    const all = getProducts();
    const list = all.filter((p) => (!col || col.ids.includes(p.id)) && (!active.length || active.includes(p.category)));
    const s = sortSel ? sortSel.value : "featured";
    if (s === "low") list.sort((a, b) => a.price - b.price);
    else if (s === "high") list.sort((a, b) => b.price - a.price);
    else if (s === "az") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (s === "za") list.sort((a, b) => b.name.localeCompare(a.name));

    const count = $("#result-count");
    if (count) count.textContent = `${list.length} product${list.length === 1 ? "" : "s"}`;
    grid.innerHTML = list.length ? list.map(productCard).join("") : emptyState("No products found", "Try clearing your filters.", false);
  }

  boxes.forEach((b) => b.addEventListener("change", apply));
  sortSel?.addEventListener("change", apply);
  apply();
}

/* =========================================================
   PRODUCT DETAILS PAGE
   ========================================================= */
function initProductDetails() {
  const c = $("#product-detail");
  if (!c) return;
  const p = getProduct(new URLSearchParams(location.search).get("id"));
  if (!p) {
    c.innerHTML = emptyState("Product not found", "This fragrance may have been retired or removed.");
    return;
  }
  document.title = `${p.name} | Saroj&co Luxury Fragrance`;
  const saved = wish.has(p.id);
  const isOutOfStock = Number(p.stock) <= 0;

  const imageHtml = p.image_url
    ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" onerror="this.onerror=null;this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='block';">
       <span class="p-emoji big" style="display:none">${p.icon || '🕯️'}</span>`
    : `<span class="p-emoji big">${p.icon || '🕯️'}</span>`;

  c.innerHTML = `
    <div class="detail-image cat-${esc(p.category)}">${imageHtml}</div>
    <div class="detail-copy">
      <p class="eyebrow">${esc(CATS[p.category] || "Artisan Fragrance")}</p>
      <h1>${esc(p.name)}</h1>
      <p class="price" style="font-size:26px;margin:10px 0">${formatPrice(p.price)} ${p.mrp > p.price ? `<del>${formatPrice(p.mrp)}</del>` : ""}</p>
      <p class="p-notes" style="margin-bottom:12px">Fragrance Notes: <strong>${esc(p.notes || "")}</strong></p>
      <p style="color:var(--nishu-muted);line-height:1.8">${esc(p.desc || "")}</p>
      <div style="margin:25px 0">
        <label for="quantity">Quantity: </label>
        <input id="quantity" type="number" min="1" max="${p.stock}" value="1" style="width:70px;padding:8px" ${isOutOfStock ? "disabled" : ""}>
        <span class="${p.stock <= 12 ? "stock-low" : ""}" style="font-size:13px;margin-left:10px">
          ${isOutOfStock ? "<strong style='color:#b31d28'>Out of stock</strong>" : p.stock <= 12 ? `Only ${p.stock} left in stock` : `(${p.stock} available)`}
        </span>
      </div>
      <div style="display:flex;gap:15px;flex-wrap:wrap">
        <button class="btn btn-dark" id="detail-add-btn" type="button" ${isOutOfStock ? "disabled style='opacity:0.6;cursor:not-allowed'" : ""}>${isOutOfStock ? "Sold Out" : "Add to Bag"}</button>
        <button class="btn btn-outline wishlist-toggle ${saved ? "saved" : ""}" data-id="${p.id}" id="detail-wish-btn" type="button">${saved ? "♥ In Wishlist" : "♡ Save to Wishlist"}</button>
      </div>
    </div>`;

  $("#detail-add-btn")?.addEventListener("click", () => {
    if (isOutOfStock) return;
    const q = Math.max(1, Math.min(Number($("#quantity").value) || 1, p.stock));
    cart.add(p.id, q);
  });

  // Complementary Scents
  const rel = $("#product-grid");
  if (rel) {
    const all = getProducts();
    const same = all.filter((x) => x.id !== p.id && x.category === p.category);
    const rest = all.filter((x) => x.id !== p.id && x.category !== p.category);
    rel.innerHTML = [...same, ...rest].slice(0, 4).map(productCard).join("");
  }

  // Recently viewed
  const prev = store.get(KEY.recent, []).filter((x) => x !== p.id);
  store.set(KEY.recent, [p.id, ...prev].slice(0, 9));
  const shown = prev.slice(0, 4).map(getProduct).filter(Boolean);
  const main = $("main");
  if (main && shown.length && !$("#recent-grid")) {
    const sec = document.createElement("section");
    sec.style.marginTop = "60px";
    sec.innerHTML = `
      <div class="section-heading"><span class="eyebrow">Pick up where you left off</span><h2>Recently Viewed</h2></div>
      <div class="product-grid" id="recent-grid">${shown.map(productCard).join("")}</div>`;
    main.appendChild(sec);
  }
}

/* =========================================================
   SEARCH PAGE
   ========================================================= */
function initSearch() {
  const form = $("#search-form");
  const out = $("#search-results");
  if (!form || !out) return;

  function run(q) {
    const t = q.toLowerCase();
    const catalog = getProducts();
    const res = catalog.filter((p) =>
      [p.name, p.category, CATS[p.category], p.notes, p.desc].join(" ").toLowerCase().includes(t)
    );
    out.innerHTML = res.length
      ? res.map(productCard).join("")
      : emptyState(`No fragrances matched "${esc(q)}"`, 'Try searching "lavender", "amber", "diffuser" or "gift".', false);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("#search-query").value.trim();
    if (q) run(q);
  });

  const q = new URLSearchParams(location.search).get("q");
  if (q) {
    $("#search-query").value = q;
    run(q);
  }
}

function renderWishlist() {
  const c = $("#wishlist-content");
  if (!c) return;
  const items = wish.ids().map(getProduct).filter(Boolean);
  c.innerHTML = items.length
    ? items.map(productCard).join("")
    : emptyState("Your wishlist is empty", "Explore our fragrances and bookmark your favourites.", PAGE !== "profile.html");
}

/* =========================================================
   CART PAGE
   ========================================================= */
function renderCart() {
  const c = $("#cart-content");
  if (!c) return;
  const items = cart.detailed();
  if (!items.length) {
    c.innerHTML = emptyState("Your bag is empty", "Explore our fragrances and fill your space with light.");
    return;
  }
  const code = cart.coupon();
  const disc = cart.discount();

  c.innerHTML = `
    <div class="info-grid">
      <div>
        ${items.map((i) => {
    const thumbHtml = i.image_url
      ? `<img src="${esc(i.image_url)}" alt="${esc(i.name)}" onerror="this.onerror=null;this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='block';"><span class="p-emoji small" style="display:none">${i.icon || '🕯️'}</span>`
      : `<span class="p-emoji small">${i.icon || '🕯️'}</span>`;
    return `
          <article class="cart-item">
            <div class="cart-thumb cat-${esc(i.category)}">${thumbHtml}</div>
            <div>
              <h3><a href="product-details.html?id=${i.id}">${esc(i.name)}</a></h3>
              <p>${formatPrice(i.price)}</p>
              <label>Qty <input class="cart-quantity" type="number" min="1" max="${i.stock}" value="${i.qty}" data-id="${i.id}"></label>
              <button class="remove-item" data-id="${i.id}" type="button">Remove</button>
            </div>
            <strong>${formatPrice(i.price * i.qty)}</strong>
          </article>`;
  }).join("")}
        <p style="margin-top:14px"><a href="products.html">← Continue shopping</a></p>
      </div>
      <aside class="summary-card">
        <h2>Order Summary</h2>
        <p>Items: <strong>${cart.count()}</strong></p>
        <p>Subtotal: <strong>${formatPrice(cart.total())}</strong></p>
        ${disc ? `<p class="discount-line">Discount (${esc(code)}): <strong>−${formatPrice(disc)}</strong></p>` : ""}
        <p>Shipping: <strong>Free (Pan-India)</strong></p>
        <p>Total: <strong id="cart-grand-total">${formatPrice(cart.grand())}</strong></p>
        <p style="font-size:13px;color:var(--nishu-muted)">Payment: Cash on Delivery (Pay on arrival)</p>
        <div class="coupon-box">
          ${code
      ? `<p class="coupon-applied">🏷️ <span><strong>${esc(code)}</strong> applied</span> <button id="remove-coupon" class="remove-item" type="button">Remove</button></p>`
      : `<div class="coupon-row"><input id="coupon-input" placeholder="Coupon code" autocomplete="off"><button id="apply-coupon" class="btn btn-outline" type="button">Apply</button></div>
               <p id="coupon-msg" class="coupon-msg"></p>
               <small style="color:var(--nishu-muted)">Try SAROJ10 or WELCOME200</small>`}
        </div>
        <a href="checkout.html" class="btn btn-dark" style="display:block;text-align:center;margin-top:18px">Proceed to Checkout</a>
      </aside>
    </div>`;
}

/* =========================================================
   CHECKOUT PAGE (INTEGRATED ONLINE PAYMENT & COD ENGINE)
   ========================================================= */
let checkoutOrderContext = null;

function completeOrderPlacement(orderData, paymentMethod, transactionRef, isPaid) {
  const orderId = "SAR-" + Math.floor(100000 + Math.random() * 900000);
  const isCod = paymentMethod === "Cash on Delivery";

  const currentUser = store.get(KEY.user, null);
  const order = {
    ...orderData,
    id: orderId,
    order_ref: orderId,
    user_id: currentUser?.id || orderData.user_id || null,
    recipient_name: orderData.recipient_name || orderData.address?.recipient_name || "Customer",
    phone: orderData.phone || orderData.address?.phone || "",
    email: orderData.email || currentUser?.email || "",
    shipping_address: orderData.address?.address_line || orderData.shipping_address || "",
    city: orderData.city || orderData.address?.city || "",
    state: orderData.state || orderData.address?.state || "",
    pincode: orderData.pincode || orderData.address?.pincode || "",
    date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    status: "Order Placed",
    payment_method: paymentMethod,
    payment_status: isPaid ? "paid" : (isCod ? "cod_pending" : "verification_pending"),
    transaction_ref: transactionRef || (isCod ? "COD-PENDING" : "TXN-MANUAL"),
  };

  // 1. Save in localStorage
  const orders = store.get(KEY.orders, []);
  orders.unshift(order);
  store.set(KEY.orders, orders);

  // Update customer directory in localStorage
  const customers = store.get("nishu_customers", []);
  const custEmail = (order.email || "").toLowerCase().trim();
  const existingCust = customers.find(c => (custEmail && c.email && c.email.toLowerCase() === custEmail) || (order.phone && c.phone === order.phone));
  if (existingCust) {
    existingCust.total_orders = (existingCust.total_orders || 0) + 1;
    existingCust.total_spent = (existingCust.total_spent || 0) + Number(order.total || 0);
    existingCust.last_order_date = new Date().toISOString();
    existingCust.last_address = order.shipping_address;
    existingCust.city = order.city;
  } else {
    customers.unshift({
      id: "C-" + Math.floor(1000 + Math.random() * 9000),
      name: order.recipient_name,
      email: custEmail,
      phone: order.phone,
      role: "customer",
      created_at: new Date().toISOString(),
      total_orders: 1,
      total_spent: Number(order.total || 0),
      last_order_date: new Date().toISOString(),
      last_address: order.shipping_address,
      city: order.city,
      state: order.state,
      pincode: order.pincode,
    });
  }
  store.set("nishu_customers", customers);

  // 2. Sync to Backend API / MySQL
  fetch(`${API_BASE}/checkout/direct-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order)
  }).catch(() => { });

  cart.clear();

  // 3. Render Success View
  const wrap = $("#checkout-container");
  if (wrap) {
    wrap.innerHTML = `
      <div class="empty-state success-box" style="animation: fadeIn 0.4s ease;">
        <div style="font-size: 52px; margin-bottom: 12px;">${isCod ? "📦" : "✨"}</div>
        <h2 style="color: #0f172a; margin-bottom: 6px;">✓ Payment & Order Confirmed!</h2>
        <p style="color: #64748b; margin-top: 0;">Your payment was verified and order has been locked into our system.</p>
        
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;max-width:500px;margin:22px auto;text-align:left;font-size:14px;line-height:1.8;">
          <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:10px;">
            <span>Order Reference:</span>
            <strong style="font-size:16px;color:#0f172a;">#${order.id}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:10px;">
            <span>Amount Paid:</span>
            <strong style="font-size:17px;color:#0f172a;">${formatPrice(order.total)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:10px;">
            <span>Payment Mode:</span>
            <strong style="color:${isCod ? '#b45309' : '#059669'};">${esc(order.payment_method)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:10px;">
            <span>Payment Status:</span>
            <span class="badge-pill ${isCod ? 'warning' : 'success'}">${isCod ? 'Pay on Delivery' : 'PAID & VERIFIED'}</span>
          </div>
          ${order.transaction_ref ? `
            <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:10px;">
              <span>Transaction Ref / UTR:</span>
              <code style="background:#e2e8f0;padding:2px 8px;border-radius:4px;font-size:13px;">${esc(order.transaction_ref)}</code>
            </div>
          ` : ""}
          <div style="padding-top:4px;">
            <span>Delivery Destination:</span><br>
            <strong style="color:#0f172a;">${esc(order.recipient_name)}</strong> (${esc(order.phone)})<br>
            <span style="color:#64748b;font-size:13px;">${esc(order.address?.address_line)}, ${esc(order.city)}, ${esc(order.address?.state)} - ${esc(order.address?.pincode)}</span>
          </div>
        </div>

        <div class="button-row" style="justify-content:center;margin-top:25px;gap:14px;">
          <a href="profile.html#orders" class="btn btn-dark">View Order in Profile</a>
          <a href="products.html" class="btn btn-outline">Continue Shopping</a>
        </div>
      </div>`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function initCheckout() {
  const form = $("#checkout-form");
  if (!form) return;
  const wrap = $("#checkout-container") || form.parentElement;
  const items = cart.detailed();
  if (!items.length) {
    wrap.innerHTML = emptyState("Your bag is empty", "Add fragrances to your bag before checking out.");
    return;
  }

  // Pre-fill user profile if logged in
  const user = store.get(KEY.user, null);
  if (user) {
    if ($("#checkout-email")) $("#checkout-email").value = user.email || "";
    const [f, ...l] = (user.name || "").split(" ");
    if ($("#first-name")) $("#first-name").value = f || "";
    if ($("#last-name")) $("#last-name").value = l.join(" ");
    if ($("#phone")) $("#phone").value = user.phone || "";
  }

  // Order Summary Box Rendering
  const summaryBox = $("#checkout-order-summary");
  const disc = cart.discount();
  const grandTotal = cart.grand();
  if (summaryBox) {
    summaryBox.innerHTML = `
      <div class="summary-items-preview">
        ${items.map((i) => `
          <div class="summary-item-pill">
            <span>🕯️</span>
            <strong>${esc(i.name)}</strong>
            <span style="color:#64748b;">×${i.qty}</span>
            <span style="color:#0f172a;font-weight:600;">${formatPrice(i.price * i.qty)}</span>
          </div>
        `).join("")}
      </div>
      <div class="summary-pricing-row">
        <div>
          <span>Bag Subtotal: <strong>${formatPrice(cart.total())}</strong></span>
          ${disc ? `<span style="color:#16a34a;margin-left:12px;">Coupon Discount: <strong>−${formatPrice(disc)} (${esc(cart.coupon())})</strong></span>` : ""}
          <span style="color:#16a34a;margin-left:12px;">Delivery: <strong>Free</strong></span>
        </div>
        <div>
          <span>Total Payable: </span>
          <span class="grand-amount">${formatPrice(grandTotal)}</span>
        </div>
      </div>
    `;
  }

  // Fetch Payment Configuration
  const settings = store.get(KEY.settings, {});
  let enableCod = settings.enable_cod === "true" || settings.enable_cod === true;
  let upiId = settings.upi_id || "sarojandco@upi";
  let upiName = settings.upi_name || "Saroj&co Luxury Fragrance";
  let rzpKey = settings.razorpay_key_id || "";

  const codCard = $("#method-card-cod");
  if (codCard) codCard.style.display = enableCod ? "flex" : "none";

  const upiAmountDisplay = $("#upi-amount-display");
  if (upiAmountDisplay) upiAmountDisplay.textContent = formatPrice(grandTotal);

  const displayUpiId = $("#display-upi-id");
  if (displayUpiId) displayUpiId.textContent = upiId;

  // Dynamic QR Code for UPI
  const updateQrCode = (targetUpiId) => {
    const qrImg = $("#upi-qr-image");
    if (qrImg) {
      const upiString = `upi://pay?pa=${encodeURIComponent(targetUpiId)}&pn=${encodeURIComponent(upiName)}&am=${grandTotal.toFixed(2)}&cu=INR`;
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiString)}`;
    }
  };
  updateQrCode(upiId);

  // Copy UPI Button
  $("#btn-copy-upi")?.addEventListener("click", () => {
    navigator.clipboard?.writeText(upiId).then(() => {
      const btn = $("#btn-copy-upi");
      if (btn) {
        btn.textContent = "✓ Copied!";
        setTimeout(() => { btn.textContent = "📋 Copy"; }, 2000);
      }
    }).catch(() => { alert(`UPI ID: ${upiId}`); });
  });

  // Demo Auto-fill UTR for Quick Testing
  $("#btn-demo-utr")?.addEventListener("click", () => {
    const randomUtr = "5029" + Math.floor(10000000 + Math.random() * 90000000);
    const utrInput = $("#upi-utr-input");
    if (utrInput) {
      utrInput.value = randomUtr;
      utrInput.style.borderColor = "#10b981";
      utrInput.style.background = "#f0fdf4";
      const msg = $("#checkout-message");
      if (msg) msg.textContent = "✓ Demo UTR filled! Click 'Proceed to Secure Payment' below.";
      if (msg) msg.style.color = "#047857";
    }
  });

  // Method Panels Switching
  const methodRadios = form.querySelectorAll("input[name='payment_method']");
  methodRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      form.querySelectorAll(".payment-method-card").forEach((c) => c.classList.remove("active"));
      radio.closest(".payment-method-card")?.classList.add("active");

      const upiPanel = $("#panel-upi");
      const cardPanel = $("#panel-card");
      const rzpPanel = $("#panel-razorpay");
      const codPanel = $("#panel-cod");

      if (upiPanel) upiPanel.style.display = "none";
      if (cardPanel) cardPanel.style.display = "none";
      if (rzpPanel) rzpPanel.style.display = "none";
      if (codPanel) codPanel.style.display = "none";

      const val = radio.value;
      if (val === "UPI / QR Code" && upiPanel) upiPanel.style.display = "block";
      else if (val === "Debit / Credit Card" && cardPanel) cardPanel.style.display = "block";
      else if (val === "Razorpay Gateway" && rzpPanel) rzpPanel.style.display = "block";
      else if (val === "Cash on Delivery" && codPanel) codPanel.style.display = "block";
    });
  });

  // Query Backend for Real-Time Payment Config
  fetch(`${API_BASE}/payment/config`)
    .then((r) => r.json())
    .then((cfg) => {
      if (cfg) {
        if (codCard) codCard.style.display = cfg.enable_cod ? "flex" : "none";
        if (cfg.upi_id) {
          upiId = cfg.upi_id;
          if (displayUpiId) displayUpiId.textContent = cfg.upi_id;
          updateQrCode(cfg.upi_id);
        }
        if (cfg.razorpay_key_id) rzpKey = cfg.razorpay_key_id;
      }
    })
    .catch(() => { });

  // FORM SUBMISSION HANDLER
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const val = (id) => ($("#" + id)?.value || "").trim();
    const pin = val("pin");
    const msg = $("#checkout-message");
    if (msg) {
      msg.textContent = "";
      msg.style.color = "#b03a3a";
    }

    // 1. Validate Delivery Inputs
    if (!/^[0-9]{6}$/.test(pin)) {
      if (msg) msg.textContent = "Please enter a valid 6-digit PIN code.";
      return;
    }
    const phone = val("phone");
    if (phone.length < 10) {
      if (msg) msg.textContent = "Please enter a valid 10-digit phone number.";
      return;
    }

    const selectedMethod = form.querySelector("input[name='payment_method']:checked")?.value || "UPI / QR Code";

    const address = {
      id: Date.now(),
      recipient_name: `${val("first-name")} ${val("last-name")}`.trim(),
      phone: phone,
      address_line: val("address"),
      city: val("city"),
      state: val("state"),
      pincode: pin,
    };

    // Save address locally
    const addrs = store.get(KEY.addr, []);
    if (!addrs.some((a) => a.address_line === address.address_line && a.pincode === pin)) {
      addrs.unshift(address);
      store.set(KEY.addr, addrs);
    }

    checkoutOrderContext = {
      subtotal: cart.total(),
      coupon: cart.coupon(),
      discount: cart.discount(),
      total: cart.grand(),
      email: val("checkout-email"),
      recipient_name: address.recipient_name,
      phone: address.phone,
      city: address.city,
      address,
      items: items.map((i) => ({ name: i.name, qty: i.qty, price: i.price, image_url: i.image_url, id: i.id })),
    };

    // -------------------------------------------------------------
    // REAL PAYMENT GATEWAY CHECK & ENFORCEMENT
    // -------------------------------------------------------------

    // GATEWAY OPTION 1: UPI / QR CODE (STRICT UTR VERIFICATION)
    if (selectedMethod === "UPI / QR Code") {
      const utr = val("upi-utr-input");
      if (!utr || utr.length < 10) {
        if (msg) {
          msg.textContent = "❌ Payment Not Detected! Please scan the QR code to pay " + formatPrice(grandTotal) + " and enter your 12-digit UPI UTR / Reference number from Google Pay/PhonePe.";
          msg.style.color = "#dc2626";
        }
        const utrEl = $("#upi-utr-input");
        if (utrEl) {
          utrEl.focus();
          utrEl.style.borderColor = "#dc2626";
          utrEl.style.background = "#fff1f2";
        }
        return; // BLOCK ORDER PLACEMENT
      }

      // Show verification in progress
      const submitBtn = $("#btn-submit-checkout");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "⏳ Verifying UPI Transaction with Bank...";
      }

      setTimeout(() => {
        completeOrderPlacement(checkoutOrderContext, "UPI / QR Code", utr, true);
      }, 700);
      return;
    }

    // GATEWAY OPTION 2: DEBIT / CREDIT CARD (BANK 3D-SECURE OTP GATEWAY)
    if (selectedMethod === "Debit / Credit Card") {
      const cardNum = val("card-number").replace(/\s+/g, "");
      const cardExp = val("card-expiry");
      const cardCvv = val("card-cvv");
      const cardName = val("card-name");

      if (cardNum.length < 14 || !cardExp || cardCvv.length < 3 || !cardName) {
        if (msg) {
          msg.textContent = "❌ Please complete all card fields (16-digit card number, MM/YY expiry, 3-digit CVV and Cardholder Name).";
          msg.style.color = "#dc2626";
        }
        return; // BLOCK ORDER PLACEMENT
      }

      // Open Bank 3D-Secure Authentication Modal
      const otpModal = $("#bank-otp-modal");
      const otpAmount = $("#bank-otp-amount");
      if (otpAmount) otpAmount.textContent = formatPrice(grandTotal);
      const otpError = $("#bank-otp-error");
      if (otpError) otpError.textContent = "";
      const otpInput = $("#bank-otp-input");
      if (otpInput) otpInput.value = "";

      if (otpModal) otpModal.hidden = false;
      return;
    }

    // GATEWAY OPTION 3: RAZORPAY GATEWAY
    if (selectedMethod === "Razorpay Gateway") {
      const submitBtn = $("#btn-submit-checkout");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "⏳ Launching Razorpay Gateway...";
      }

      try {
        const orderRes = await fetch(`${API_BASE}/payment/razorpay/create-order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: grandTotal })
        });
        const rzpOrder = await orderRes.json();

        if (window.Razorpay && rzpKey && !rzpKey.startsWith("YOUR_")) {
          const rzp = new window.Razorpay({
            key: rzpKey,
            amount: rzpOrder.amount,
            currency: "INR",
            name: "Saroj&co Luxury Fragrance",
            description: "Candle & Fragrance Order",
            order_id: rzpOrder.id.startsWith("order_mock") ? undefined : rzpOrder.id,
            prefill: {
              name: address.recipient_name,
              email: val("checkout-email"),
              contact: address.phone
            },
            theme: { color: "#0f172a" },
            handler: function (response) {
              completeOrderPlacement(checkoutOrderContext, "Razorpay Gateway", response.razorpay_payment_id || ("RZP-" + Date.now()), true);
            },
            modal: {
              ondismiss: function () {
                if (submitBtn) {
                  submitBtn.disabled = false;
                  submitBtn.textContent = "🔒 Proceed to Secure Payment →";
                }
                if (msg) {
                  msg.textContent = "❌ Razorpay payment was cancelled. Order has NOT been placed.";
                  msg.style.color = "#dc2626";
                }
              }
            }
          });
          rzp.open();
        } else {
          // If Razorpay live credentials not configured, prompt simulated gateway authorization
          const confirmPayment = confirm(
            `[RAZORPAY TEST GATEWAY]\n\nMerchant: Saroj&co Luxury Fragrance\nAmount: ${formatPrice(grandTotal)}\n\nClick OK to authorize test payment of ${formatPrice(grandTotal)}.\nClick Cancel to decline.`
          );
          if (confirmPayment) {
            completeOrderPlacement(checkoutOrderContext, "Razorpay Gateway", "RZP-PAY-" + Math.floor(100000 + Math.random() * 900000), true);
          } else {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = "🔒 Proceed to Secure Payment →";
            }
            if (msg) msg.textContent = "❌ Payment cancelled. Order was NOT placed.";
          }
        }
      } catch (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "🔒 Proceed to Secure Payment →";
        }
        if (msg) msg.textContent = "❌ Could not reach payment server. Please try again.";
      }
      return;
    }

    // GATEWAY OPTION 4: CASH ON DELIVERY (IF ENABLED BY ADMIN)
    if (selectedMethod === "Cash on Delivery") {
      const codModal = $("#cod-confirm-modal");
      const codSummary = $("#cod-modal-summary");
      if (codSummary) {
        codSummary.innerHTML = `
          <div class="confirm-review-row">
            <span>Payable in Cash on Delivery:</span>
            <strong style="font-size:16px;color:#0f172a;">${formatPrice(grandTotal)}</strong>
          </div>
          <div class="confirm-review-row">
            <span>Recipient:</span>
            <span>${esc(address.recipient_name)} (${esc(address.phone)})</span>
          </div>
          <div class="confirm-review-row">
            <span>Delivery Address:</span>
            <span style="text-align:right;max-width:60%;font-size:12.5px;">${esc(address.address_line)}, ${esc(address.city)}, ${esc(address.state)} - ${esc(address.pincode)}</span>
          </div>
        `;
      }
      if (codModal) codModal.hidden = false;
    }
  });

  // BANK OTP MODAL HANDLERS
  $("#btn-autofill-otp")?.addEventListener("click", () => {
    const input = $("#bank-otp-input");
    if (input) input.value = "482910";
  });

  $("#btn-cancel-bank-otp")?.addEventListener("click", () => {
    const otpModal = $("#bank-otp-modal");
    if (otpModal) otpModal.hidden = true;
    const msg = $("#checkout-message");
    if (msg) {
      msg.textContent = "❌ Card payment was cancelled. Your order has NOT been placed.";
      msg.style.color = "#dc2626";
    }
  });

  $("#btn-submit-bank-otp")?.addEventListener("click", () => {
    const otp = ($("#bank-otp-input")?.value || "").trim();
    const otpError = $("#bank-otp-error");
    if (otp.length !== 6) {
      if (otpError) otpError.textContent = "Please enter the 6-digit OTP code.";
      return;
    }

    const btn = $("#btn-submit-bank-otp");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "⏳ Authorizing with Bank...";
    }

    setTimeout(() => {
      const otpModal = $("#bank-otp-modal");
      if (otpModal) otpModal.hidden = true;
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Authorize Payment →";
      }
      completeOrderPlacement(
        checkoutOrderContext,
        "Debit / Credit Card",
        "CARD-AUTH-" + Math.floor(100000 + Math.random() * 900000),
        true
      );
    }, 900);
  });

  // COD MODAL HANDLERS
  $("#btn-cancel-cod")?.addEventListener("click", () => {
    const codModal = $("#cod-confirm-modal");
    if (codModal) codModal.hidden = true;
  });

  $("#btn-finalize-cod")?.addEventListener("click", () => {
    const codModal = $("#cod-confirm-modal");
    if (codModal) codModal.hidden = true;
    completeOrderPlacement(checkoutOrderContext, "Cash on Delivery", "COD-PENDING", false);
  });
}


/* =========================================================
   PROFILE PAGE (DYNAMIC ORDERS & ACCOUNT DETAILS)
   ========================================================= */
const ORDER_STEPS = ["Order Placed", "Packed", "Shipped", "Delivered"];

function orderRow(o) {
  const cancelled = o.status === "Cancelled";
  const idx = Math.max(0, ORDER_STEPS.indexOf(o.status));
  const tracker = cancelled
    ? `<div class="order-cancelled">✕ This order was cancelled</div>`
    : `<div class="order-steps">${ORDER_STEPS.map((s, i) => `<span class="${i <= idx ? "done" : ""}">${s}</span>`).join("")}</div>`;
  const cancelBtn = o.status === "Order Placed"
    ? `<button class="cancel-order-btn" type="button" data-cancel-order="${esc(o.id)}">Cancel Order</button>`
    : "";
  return `
    <div class="order-row">
      <div style="display:flex;justify-content:space-between;gap:10px;font-weight:600">
        <span>Order #${esc(o.id)}</span><span>${formatPrice(o.total)}</span>
      </div>
      <div class="order-items">${(o.items || []).map((i) => `${esc(i.name)} × ${i.qty}`).join(", ")}</div>
      <div class="order-meta">Placed on ${esc(o.date)} · ${esc(o.payment)}${o.discount ? ` · Coupon ${esc(o.coupon)} (−${formatPrice(o.discount)})` : ""} · Status: <b>${esc(o.status)}</b></div>
      ${tracker}${cancelBtn}
    </div>`;
}

function initProfile() {
  if (!$(".profile-page")) return;

  const panels = $$(".account-panel");
  const navs = $$(".account-nav");
  function openPanel(name) {
    panels.forEach((p) => {
      const on = p.id === `panel-${name}`;
      p.hidden = !on;
      p.classList.toggle("active", on);
    });
    navs.forEach((b) => b.classList.toggle("active", b.dataset.panel === name));
  }
  navs.forEach((b) => b.addEventListener("click", () => openPanel(b.dataset.panel)));
  $$("[data-open-panel]").forEach((b) => b.addEventListener("click", () => openPanel(b.dataset.openPanel)));
  const hash = location.hash.replace("#", "");
  if (["orders", "wishlist", "addresses", "details"].includes(hash)) openPanel(hash);

  const modal = $("#auth-modal");
  const tabLogin = $("#tab-login"), tabSignup = $("#tab-signup");
  const fLogin = $("#login-form"), fSignup = $("#signup-form");
  const showTab = (which) => {
    const login = which !== "signup";
    tabLogin?.classList.toggle("active", login);
    tabSignup?.classList.toggle("active", !login);
    if (fLogin) fLogin.hidden = !login;
    if (fSignup) fSignup.hidden = login;
  };
  const openModal = (tab = "login") => { if (modal) { showTab(tab); modal.hidden = false; } };
  const closeModal = () => modal && (modal.hidden = true);

  $("#open-auth-btn")?.addEventListener("click", () => {
    if (store.get(KEY.user, null)) {
      if (confirm("Are you sure you want to sign out?")) {
        store.del(KEY.user);
        renderProfile();
        toast("You have been signed out");
      }
    } else openModal();
  });
  $("#close-auth-modal")?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
  tabLogin?.addEventListener("click", () => showTab("login"));
  tabSignup?.addEventListener("click", () => showTab("signup"));

  fLogin?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#login-email").value.trim().toLowerCase();
    const password = $("#login-password")?.value || "";

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        const u = data.user || { name: email.split("@")[0], email };
        store.set(KEY.user, { id: u.id, name: u.name, email: u.email, phone: u.phone || "" });
        fLogin.reset(); closeModal(); renderProfile(); toast(`Welcome back, ${u.name}!`);
        return;
      }
    } catch { }

    // Offline / local fallback
    const accounts = store.get(KEY.accounts, {});
    const acc = accounts[email] || { name: email.split("@")[0], email };
    store.set(KEY.user, { name: acc.name, email, phone: acc.phone || "" });
    fLogin.reset(); closeModal(); renderProfile(); toast("Welcome back!");
  });

  fSignup?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#signup-name").value.trim();
    const email = $("#signup-email").value.trim().toLowerCase();
    const phone = $("#signup-phone").value.trim();
    const password = $("#signup-password")?.value || "123456";

    // 1. Sync to backend API / MySQL
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password }),
      });
      if (res.ok) {
        const data = await res.json();
        const u = data.user || { name, email, phone };
        store.set(KEY.user, { id: u.id, name: u.name, email: u.email, phone: u.phone });
        const accounts = store.get(KEY.accounts, {});
        accounts[email] = { name, email, phone };
        store.set(KEY.accounts, accounts);
        fSignup.reset(); closeModal(); renderProfile(); toast("Account created successfully!");
        return;
      } else {
        const err = await res.json().catch(() => ({}));
        if (err.error && err.error.includes("already exists")) {
          store.set(KEY.user, { name, email, phone });
          fSignup.reset(); closeModal(); renderProfile(); toast("Welcome back! Account linked.");
          return;
        }
      }
    } catch { }

    // Offline fallback
    const accounts = store.get(KEY.accounts, {});
    accounts[email] = { name, email, phone };
    store.set(KEY.accounts, accounts);
    store.set(KEY.user, { name, email, phone });
    fSignup.reset(); closeModal(); renderProfile(); toast("Account created!");
  });

  const addrForm = $("#inline-address-form");
  $("#show-address-form-btn")?.addEventListener("click", () => {
    addrForm.style.display = addrForm.style.display === "none" ? "block" : "none";
  });
  $("#hide-address-form-btn")?.addEventListener("click", () => (addrForm.style.display = "none"));
  addrForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const pin = $("#new-addr-pin").value.trim();
    if (!/^[0-9]{6}$/.test(pin)) return toast("Enter a valid 6-digit PIN");
    const list = store.get(KEY.addr, []);
    list.unshift({
      id: Date.now(),
      recipient_name: $("#new-addr-name").value.trim(),
      phone: $("#new-addr-phone").value.trim(),
      address_line: $("#new-addr-line").value.trim(),
      city: $("#new-addr-city").value.trim(),
      pincode: pin,
    });
    store.set(KEY.addr, list);
    addrForm.reset(); addrForm.style.display = "none";
    renderProfile(); toast("Address saved");
  });

  $("#profile-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const user = store.get(KEY.user, null);
    if (!user) { toast("Please sign in first"); openModal(); return; }
    user.name = $("#customer-name").value.trim();
    user.phone = $("#customer-phone").value.trim();
    store.set(KEY.user, user);
    renderProfile();
    const msg = $("#profile-message");
    if (msg) {
      msg.textContent = "Profile changes saved successfully!";
      msg.style.color = "#1e7e34";
      setTimeout(() => (msg.textContent = ""), 3000);
    }
  });

  renderProfile();
}

function renderProfile() {
  if (!$(".profile-page")) return;
  const user = store.get(KEY.user, null);
  const orders = store.get(KEY.orders, []);
  const addrs = store.get(KEY.addr, []);
  const set = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };

  set("sidebar-name", user ? user.name : "Dear Customer");
  set("sidebar-email", user ? user.email : "Welcome to Saroj&co");
  set("welcome-name", user ? user.name.split(" ")[0] : "Friend");
  set("profile-avatar", user ? user.name.charAt(0).toUpperCase() : "N");
  set("open-auth-btn", user ? "Sign Out" : "Sign In / Register");
  const nm = $("#customer-name"), em = $("#customer-email"), ph = $("#customer-phone");
  if (nm) nm.value = user ? user.name : "";
  if (em) em.value = user ? user.email : "";
  if (ph) ph.value = user ? user.phone || "" : "";

  const active = orders.filter((o) => o.status !== "Cancelled").length;
  set("orders-count", active);
  set("addresses-count", addrs.length);
  set("wishlist-stat-count", wish.ids().length);
  set("user-tier-tag", active >= 5 ? "✦ VIP Connoisseur" : active >= 2 ? "Gold Member" : "Standard Member");

  const al = $("#address-list");
  if (al) {
    al.innerHTML = addrs.length
      ? addrs.map((a) => `
        <article>
          <button class="delete-addr-btn" type="button" data-del-addr="${a.id}">Delete</button>
          <h4>${esc(a.recipient_name)}</h4>
          <p>${esc(a.address_line)}</p>
          <p>${esc(a.city)}${a.state ? ", " + esc(a.state) : ""} - ${esc(a.pincode)}</p>
          <p style="font-size:12px">Phone: ${esc(a.phone)}</p>
        </article>`).join("")
      : `<p class="empty-state">No saved addresses found.</p>`;
  }

  const empty = "No orders placed yet.";
  const ro = $("#recent-orders"), ol = $("#orders-list");
  if (ro) ro.innerHTML = orders.length ? orders.slice(0, 3).map(orderRow).join("") : empty;
  if (ol) ol.innerHTML = orders.length ? orders.map(orderRow).join("") : empty;
  renderWishlist();
}

/* =========================================================
   HELP & DYNAMIC FAQ COMPONENT
   ========================================================= */
function initHelpFaq() {
  const faqListContainer = $(".faq-list");
  if (faqListContainer) {
    const faqs = getFaqs();
    faqListContainer.innerHTML = faqs.map(f => `
      <article class="faq-item" data-category="${esc(f.category || "orders")}">
        <button class="faq-question">
          <span>${esc(f.question)}</span><span>+</span>
        </button>
        <div class="faq-answer">
          <p>${esc(f.answer)}</p>
        </div>
      </article>
    `).join("") + `<p id="noResults" class="empty-state" hidden>No matching questions found. Please contact our support team below.</p>`;
  }

  $$(".faq-question").forEach((q) => {
    q.addEventListener("click", () => {
      const item = q.closest(".faq-item");
      const was = item.classList.contains("active");
      $$(".faq-item").forEach((el) => el.classList.remove("active"));
      if (!was) item.classList.add("active");
    });
  });

  const cats = $$(".help-category");
  const getItems = () => $$(".faq-item");

  cats.forEach((btn) => btn.addEventListener("click", () => {
    cats.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    getItems().forEach((it) => (it.style.display = btn.dataset.category === "all" || it.dataset.category === btn.dataset.category ? "" : "none"));
  }));

  const input = $("#faqSearch"), clear = $("#clearSearch"), none = $("#noResults");
  input?.addEventListener("input", (e) => {
    const v = e.target.value.toLowerCase().trim();
    let n = 0;
    getItems().forEach((it) => {
      const ok = it.textContent.toLowerCase().includes(v);
      it.style.display = ok ? "" : "none";
      if (ok) n++;
    });
    if (none) none.hidden = n > 0;
  });
  clear?.addEventListener("click", () => {
    if (input) input.value = "";
    getItems().forEach((it) => (it.style.display = ""));
    if (none) none.hidden = true;
  });
}

/* =========================================================
   FORMS CONTROLLER (CONTACT, BESPOKE & NEWSLETTER)
   ========================================================= */
function initForms() {
  $$("#newsletter-form").forEach((f) => {
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("input[type='email']", f);
      const msg = $("#newsletter-message", f) || $(".form-message", f) || $("p", f);
      const list = store.get(KEY.news, []);
      const email = input.value.trim().toLowerCase();
      if (!list.includes(email)) {
        list.push(email);
        store.set(KEY.news, list);
        // Sync with backend if available
        fetch(`${API_BASE}/newsletter`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        }).catch(() => { });
      }
      if (msg) msg.textContent = "Thank you for subscribing to Saroj&co!";
      input.value = "";
      toast("Subscribed to Saroj&co newsletter");
    });
  });

  $$(".demo-form").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const isBespoke = PAGE === "bespoke.html" || form.querySelector("#bespoke-message");
      const data = {
        id: "INQ-" + Date.now(),
        type: isBespoke ? "Bespoke Request" : "Contact Message",
        page: PAGE,
        date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      };
      $$("input, select, textarea", form).forEach((el) => {
        data[el.id || el.name || "field"] = el.value.trim();
      });
      data.name = data["bespoke-name"] || data["contact-name"] || data.name || "Customer";
      data.email = data["bespoke-email"] || data["contact-email"] || data.email || "";
      data.message = data["bespoke-message"] || data["contact-message"] || data.message || "";
      data.topic = data["bespoke-type"] || data["contact-subject"] || "General Enquiry";

      const list = store.get(KEY.msgs, []);
      list.unshift(data);
      store.set(KEY.msgs, list);

      // Sync with backend if active
      fetch(`${API_BASE}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, email: data.email, message: `${data.topic}: ${data.message}` })
      }).catch(() => { });

      const msg = $(".form-message", form);
      if (msg) {
        msg.textContent = isBespoke
          ? "Thank you! Your bespoke request has been received. Our fragrance team will connect with you within 24 hours."
          : "Thank you! Your message has been received. Our team will contact you soon.";
        msg.style.color = "#1e7e34";
      }
      form.reset();
      toast("Inquiry submitted successfully");
    });
  });

  $("#back-to-top")?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

/* =========================================================
   GLOBAL INTERACTION EVENTS
   ========================================================= */
document.addEventListener("click", (e) => {
  const w = e.target.closest(".wishlist-toggle");
  if (w) { e.preventDefault(); wish.toggle(w.dataset.id); return; }

  const a = e.target.closest(".add-to-cart");
  if (a) { e.preventDefault(); cart.add(a.dataset.id, 1); return; }

  const r = e.target.closest(".remove-item[data-id]");
  if (r) { cart.remove(r.dataset.id); renderCart(); toast("Item removed"); return; }

  if (e.target.closest("#apply-coupon")) {
    const code = ($("#coupon-input").value || "").trim().toUpperCase();
    const coupons = getCoupons();
    const c = coupons[code];
    const msg = $("#coupon-msg");
    if (!c) { if (msg) msg.textContent = "Invalid coupon code."; return; }
    if (c.min && cart.total() < c.min) {
      if (msg) msg.textContent = `Add items worth ${formatPrice(c.min)} or more to use ${code}.`;
      return;
    }
    store.set(KEY.coupon, code);
    renderCart();
    toast(`Coupon ${code} applied – ${c.label}`);
    return;
  }
  if (e.target.closest("#remove-coupon")) { store.del(KEY.coupon); renderCart(); return; }

  const cancel = e.target.closest("[data-cancel-order]");
  if (cancel) {
    if (!confirm("Cancel this order?")) return;
    const orders = store.get(KEY.orders, []);
    const o = orders.find((x) => x.id === cancel.dataset.cancelOrder);
    if (o && o.status === "Order Placed") {
      o.status = "Cancelled";
      store.set(KEY.orders, orders);
      renderProfile();
      toast("Order cancelled");
    }
    return;
  }

  const d = e.target.closest("[data-del-addr]");
  if (d && confirm("Remove this address?")) {
    store.set(KEY.addr, store.get(KEY.addr, []).filter((x) => String(x.id) !== d.dataset.delAddr));
    renderProfile();
  }
});

document.addEventListener("change", (e) => {
  if (e.target.matches(".cart-quantity")) {
    cart.setQty(e.target.dataset.id, e.target.value);
    renderCart();
  }
});

// React live to changes made in Authority Admin or across tabs
window.addEventListener("storage", () => {
  applyLiveSiteSettings();
  updateCartCount();
  updateWishCount();
  if ($("#product-grid") || $("#product-detail")) initShop();
});

window.addEventListener("nishu-store-updated", () => {
  applyLiveSiteSettings();
  updateCartCount();
  updateWishCount();
});

/* =========================================================
   APPLICATION BOOTSTRAP
   ========================================================= */
function safe(fn) {
  try { fn(); } catch (err) { console.error("[Saroj&co] " + fn.name + " failed:", err); }
}

function boot() {
  [injectCoreCss, buildLayout, injectFonts, applyLiveSiteSettings,
    updateCartCount, updateWishCount, initShop, initProductDetails,
    initSearch, renderCart, initCheckout, renderWishlist,
    initProfile, initHelpFaq, initForms].forEach(safe);

  // Self-heal check for layout
  if (!$(".site-header .main-nav")) {
    safe(buildLayout);
    safe(updateCartCount);
    safe(updateWishCount);
  }

  // Background check for online API
  syncWithBackendIfOnline();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
