// ==========================================
// ميكسات - منطق التطبيق الرئيسي
// ==========================================

// ===== الحالة الداخلية =====
const state = {
  settings:       null,
  categories:     [],
  items:          [],
  offers:         [],
  reviews:        [],
  userEmail:      localStorage.getItem('mixat_user_email') || null,
  cart:           [],
  pendingItemId:  null,
  activeCategory: 'all',
  searchQuery:    '',
};

// ===== التهيئة =====
document.addEventListener('DOMContentLoaded', async () => {
  showLoader();
  initFirebase();
  await loadAllData();
  startLiveDataSync();
  if (state.userEmail) {
    state.cart = await DataStore.getUserCart(state.userEmail);
  }
  renderAll();
  setupEventListeners();
  initScrollReveal();
  initNavScroll();
  initParticles();
  setTimeout(hideLoader, 800);
});

// ===== تحميل البيانات =====
async function loadAllData() {
  try {
    const [settings, categories, items, offers, reviews] = await Promise.all([
      DataStore.getSettings(),
      DataStore.getCategories(),
      DataStore.getMenuItems(),
      DataStore.getOffers(),
      DataStore.getReviews(),
    ]);
    state.settings   = settings;
    state.categories = categories;
    state.items      = items;
    state.offers     = offers;
    state.reviews    = reviews;
  } catch (e) {
    console.error('خطأ في تحميل البيانات:', e);
    state.settings   = DEFAULT_SETTINGS;
    state.categories = DEFAULT_MENU_DATA.categories;
    state.items      = DEFAULT_MENU_DATA.items;
    state.offers     = DEFAULT_OFFERS;
    state.reviews    = DEFAULT_REVIEWS;
  }
}

function startLiveDataSync() {
  if (!IS_FIREBASE_CONFIGURED || !db) return;

  subscribeToLiveData({
    onMenuChange: items => {
      state.items = items;
      renderMenu();
      renderBestSellers();
      renderHeroStats();
      updateCartUI();
    },
    onOffersChange: offers => {
      state.offers = offers;
      renderOffers();
    },
    onSettingsChange: settings => {
      state.settings = settings || DEFAULT_SETTINGS;
      applySettings();
      renderAbout();
    },
    onCategoriesChange: categories => {
      state.categories = categories || DEFAULT_MENU_DATA.categories;
      renderMenuTabs();
      renderMenu();
    },
    onReviewsChange: reviews => {
      state.reviews = reviews;
      renderReviews();
    },
  });
}

// ===== رسم كل الأقسام =====
function renderAll() {
  applySettings();
  renderHeroStats();
  renderBestSellers();
  renderOffers();
  renderMenuTabs();
  renderMenu();
  renderAbout();
  renderReviews();
  renderContact();
  renderFooter();
  updateCartUI();
}

// ===== تطبيق الإعدادات =====
function applySettings() {
  const s = state.settings;
  if (!s) return;
  document.title = `${s.shopName} - أشهى الأكلات`;
  setAll('[data-setting="shopName"]', s.shopName);
  setAll('[data-setting="tagline"]', s.tagline);
  setAll('[data-setting="phone"]', s.phone);
  setAll('[data-setting="address"]', s.address);
  setAll('[data-setting="workingHours"]', s.workingHours);
  setAll('[data-setting="deliveryAreas"]', s.deliveryAreas);
  // Update WhatsApp links
  const waNumber = (s.whatsapp || '201145843805').replace(/[^0-9]/g, '');
  document.querySelectorAll('[data-whatsapp]').forEach(el => {
    el.href = `https://api.whatsapp.com/send?phone=${waNumber}`;
  });
}

function setAll(selector, val) {
  document.querySelectorAll(selector).forEach(el => { el.textContent = val; });
}

// ===== إحصائيات الهيرو =====
function renderHeroStats() {
  const totalItems = state.items.filter(i => i.available).length;
  const el = document.getElementById('hero-stats-count');
  if (el) el.textContent = totalItems + '+';
}

// ===== الأكثر طلباً =====
function renderBestSellers() {
  const container = document.getElementById('best-sellers-grid');
  if (!container) return;

  const bestItems = state.items.filter(i => i.bestSeller && i.available);
  if (bestItems.length === 0) {
    container.innerHTML = `<p style="color:var(--text-400);grid-column:1/-1;text-align:center">لا توجد أصناف مميزة حالياً</p>`;
    return;
  }

  container.innerHTML = bestItems.map(item => renderFoodCard(item)).join('');
}

// ===== العروض =====
function renderOffers() {
  const section = document.getElementById('offers-section');
  const container = document.getElementById('offers-grid');
  if (!container) return;

  if (!state.offers || state.offers.length === 0) {
    // أخفِ القسم كله لما مفيش عروض - مش تظهر رسالة وحشة
    if (section) section.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  // فيه عروض - أظهر القسم
  if (section) section.style.display = '';

  container.innerHTML = state.offers.map(offer => `
    <div class="offer-card reveal">
      ${offer.badge ? `<div class="offer-badge">${offer.badge}</div>` : ''}
      <div class="offer-title">${offer.title}</div>
      <div class="offer-desc">${offer.description || ''}</div>
      <div class="offer-price-row">
        <span class="offer-price">${offer.price || offer.offerPrice} جنيه</span>
        ${offer.oldPrice || offer.originalPrice ? `<span class="offer-old-price">${offer.oldPrice || offer.originalPrice} جنيه</span>` : ''}
      </div>
      <button class="btn-offer-add" onclick="addOfferToCart('${offer.id}')">
        <i class="fas fa-cart-plus"></i> اطلب العرض
      </button>
    </div>
  `).join('');
}


function addOfferToCart(offerId) {
  const offer = state.offers.find(o => o.id === offerId);
  if (!offer) return;

  if (!state.userEmail) {
    state.pendingItemId = 'offer_' + offerId;
    openCustomerModal('customer-email-modal');
    return;
  }

  const cartId = 'offer_' + offer.id;
  const existing = state.cart.find(c => c.id === cartId);
  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({
      id: cartId,
      name: `🔥 عرض: ${offer.title}`,
      price: offer.price,
      icon: '🔥',
      image: null,
      qty: 1,
    });
  }

  saveCart();
  updateCartUI();
  showToast(`✅ تم إضافة عرض ${offer.title} للطلب`);
}

// ===== تبويبات المنيو =====
function renderMenuTabs() {
  const tabs = document.getElementById('menu-tabs');
  if (!tabs) return;

  const cats = [{ id: 'all', name: 'الكل', icon: '🍽️' }, ...state.categories];
  tabs.innerHTML = cats.map(c => `
    <button class="menu-tab ${state.activeCategory === c.id ? 'active' : ''}" data-cat="${c.id}">
      <span>${c.icon}</span> ${c.name}
    </button>
  `).join('');
}

// ===== المنيو الكامل =====
function renderMenu() {
  const container = document.getElementById('menu-grid');
  if (!container) return;

  let filtered = state.items.filter(i => i.available);

  if (state.activeCategory !== 'all') {
    filtered = filtered.filter(i => i.category === state.activeCategory);
  }

  if (state.searchQuery.trim()) {
    const q = state.searchQuery.trim().toLowerCase();
    filtered = filtered.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.description && i.description.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--text-400)">
        <div style="font-size:3rem;margin-bottom:12px">🔍</div>
        <p>لا توجد نتائج تطابق بحثك</p>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(item => renderFoodCard(item)).join('');
}

// ===== بناء بطاقة الطعام =====
function renderFoodCard(item) {
  const cat = state.categories.find(c => c.id === item.category);
  const inCart = state.cart.some(c => c.id === item.id);

  const imgHTML = item.image
    ? `<img src="${item.image}" alt="${item.name}" loading="lazy" />`
    : ((cat && cat.image)
      ? `<img src="${cat.image}" alt="${item.name}" loading="lazy" />`
      : `<div class="food-card-emoji">${cat ? cat.icon : '🍽️'}</div>`);

  return `
    <div class="food-card reveal" data-category="${item.category}">
      <div class="food-card-img">
        ${imgHTML}
        ${item.bestSeller ? '<span class="food-card-badge">⭐ الأكثر طلباً</span>' : ''}
      </div>
      <div class="food-card-body">
        <h3 class="food-card-title">${item.name}</h3>
        <p class="food-card-desc">${item.description || ''}</p>
        <div class="food-card-footer">
          <div class="food-card-price">${item.price} <span>جنيه</span></div>
          <button class="btn-add-cart ${inCart ? 'added' : ''}" data-id="${item.id}" onclick="addToCart('${item.id}')">
            ${inCart ? '<i class="fas fa-check"></i> أضيف' : '<i class="fas fa-plus"></i> أضف'}
          </button>
        </div>
      </div>
    </div>`;
}

// ===== قسم عن ميكسات =====
function renderAbout() {
  const el = document.getElementById('about-text');
  if (el && state.settings) el.textContent = state.settings.aboutText;
}

// ===== التقييمات =====
function renderReviews() {
  const track = document.getElementById('reviews-grid');
  if (!track) return;

  const revs = state.reviews;
  if (!revs || revs.length === 0) {
    track.innerHTML = `<p style="color:var(--text-400);text-align:center">لا توجد تقييمات بعد</p>`;
    return;
  }

  track.innerHTML = revs.map(r => `
    <div class="review-card">
      <div class="review-header">
        <div class="review-avatar">${r.name.charAt(0)}</div>
        <div class="review-author">
          <div class="review-name">${r.name}</div>
          <div class="review-date">${formatDate(r.date || new Date())}</div>
        </div>
        <div class="review-stars">${renderStars(r.rating || 5)}</div>
      </div>
      <p class="review-comment">"${r.comment}"</p>
    </div>
  `).join('');
}


function renderStars(rating) {
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="star ${i < rating ? '' : 'empty'}">★</span>`
  ).join('');
}

function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return dateStr; }
}

// ===== التواصل =====
function renderContact() {
  const s = state.settings;
  if (!s) return;
  const waNumber = (s.whatsapp || '201145843805').replace(/[^0-9]/g, '');
  const waBtn = document.getElementById('contact-whatsapp-btn');
  if (waBtn) waBtn.href = `https://api.whatsapp.com/send?phone=${waNumber}`;
}

// ===== الفوتر =====
function renderFooter() {
  const s = state.settings;
  if (!s) return;
  const tagEl = document.querySelectorAll('[data-setting="tagline"]');
  tagEl.forEach(el => el.textContent = s.tagline);
}

// ==========================================
// سلة التسوق وإدارة الإيميل
// ==========================================
function addToCart(itemId) {
  if (!state.userEmail) {
    state.pendingItemId = itemId;
    openCustomerModal('customer-email-modal');
    return;
  }

  const item = state.items.find(i => i.id === itemId);
  if (!item) return;

  const existing = state.cart.find(c => c.id === itemId);
  if (existing) {
    existing.qty += 1;
  } else {
    const cat = state.categories.find(c => c.id === item.category);
    state.cart.push({
      id: item.id,
      name: item.name,
      price: item.price,
      icon: cat ? cat.icon : '🍽️',
      image: item.image,
      qty: 1,
    });
  }

  saveCart();
  updateCartUI();
  showToast(`✅ تم إضافة ${item.name} للطلب`);
}

function removeFromCart(itemId) {
  state.cart = state.cart.filter(c => c.id !== itemId);
  saveCart();
  updateCartUI();
  renderCartItems();
}

function changeQty(itemId, delta) {
  const item = state.cart.find(c => c.id === itemId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) { removeFromCart(itemId); return; }
  saveCart();
  updateCartUI();
  renderCartItems();
}

function saveCart() {
  if (state.userEmail) {
    DataStore.saveUserCart(state.userEmail, state.cart);
  }
}

function updateCartUI() {
  const count = state.cart.reduce((sum, i) => sum + i.qty, 0);
  const badge = document.getElementById('cart-badge');
  if (badge) badge.textContent = count;

  const fab = document.getElementById('cart-fab');
  if (fab) {
    if (count > 0) fab.classList.add('visible');
    else fab.classList.remove('visible');
    const fabBadge = fab.querySelector('.cart-fab-badge');
    if (fabBadge) fabBadge.textContent = count;
  }

  const cartCount = document.getElementById('cart-sidebar-count');
  if (cartCount) cartCount.textContent = count + ' صنف';

  const userEmailDisplay = document.getElementById('user-email-display');
  if (userEmailDisplay) {
    userEmailDisplay.textContent = state.userEmail || 'غير مسجل';
  }

  renderCartItems();
}

function renderCartItems() {
  const body = document.getElementById('cart-body');
  if (!body) return;

  if (state.cart.length === 0) {
    body.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <p>سلة طلباتك فاضية<br><small>أضف أصناف من المنيو</small></p>
      </div>`;
    const footer = document.getElementById('cart-footer');
    if (footer) footer.style.display = 'none';
    return;
  }

  const footer = document.getElementById('cart-footer');
  if (footer) footer.style.display = 'block';

  const total = state.cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  body.innerHTML = state.cart.map(item => `
    <div class="cart-item">
      ${item.image ? `<img src="${item.image}" alt="${item.name}" class="cart-item-img" style="width:50px;height:50px;border-radius:10px;object-fit:cover;">` : `<span class="cart-item-emoji">${item.icon || '🍽️'}</span>`}
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${item.price * item.qty} جنيه</div>
      </div>
      <div class="cart-qty">
        <button class="cart-qty-btn" onclick="changeQty('${item.id}', -1)"><i class="fas fa-minus"></i></button>
        <span class="cart-qty-num">${item.qty}</span>
        <button class="cart-qty-btn" onclick="changeQty('${item.id}', 1)"><i class="fas fa-plus"></i></button>
      </div>
      <button class="cart-remove" onclick="removeFromCart('${item.id}')"><i class="fas fa-trash"></i></button>
    </div>
  `).join('');

  const totalEl = document.getElementById('cart-total');
  if (totalEl) totalEl.textContent = total + ' جنيه';
}

function openCart() {
  document.getElementById('cart-sidebar').classList.add('open');
  document.getElementById('cart-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cart-sidebar').classList.remove('open');
  document.getElementById('cart-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ===== التعامل مع إيميل العميل والمودال =====
function openCustomerModal(modalId) {
  document.getElementById(modalId)?.classList.add('open');
}

function closeCustomerModal(modalId) {
  document.getElementById(modalId)?.classList.remove('open');
}

function promptChangeEmail() {
  const emailInput = document.getElementById('input-customer-email');
  if (emailInput) emailInput.value = state.userEmail || '';
  openCustomerModal('customer-email-modal');
}

async function handleCustomerEmailSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('input-customer-email');
  const email = input ? input.value.trim().toLowerCase() : '';

  if (!email || !email.includes('@')) {
    showToast('⚠️ يرجى أدخال بريد إلكتروني صحيح');
    return;
  }

  state.userEmail = email;
  localStorage.setItem('mixat_user_email', email);

  // تحميل سلة هذا البريد المخصص
  state.cart = await DataStore.getUserCart(email);
  updateCartUI();

  closeCustomerModal('customer-email-modal');
  showToast(`✅ تم تسجيل البريد: ${email}`);

  // لو كان في صنف المعلق إضافة، نضيفه الآن
  if (state.pendingItemId) {
    const pid = state.pendingItemId;
    state.pendingItemId = null;
    if (pid.startsWith('offer_')) {
      addOfferToCart(pid.replace('offer_', ''));
    } else {
      addToCart(pid);
    }
  }
}

// ===== طلب واتساب مع تأكيد ملخص الطلب =====
function orderViaWhatsApp() {
  if (!state.userEmail) {
    openCustomerModal('customer-email-modal');
    return;
  }

  if (state.cart.length === 0) {
    showToast('⚠️ السلة فاضية!');
    return;
  }

  // ملء مودال التلخيص
  const itemsContainer = document.getElementById('order-summary-items-list');
  if (itemsContainer) {
    itemsContainer.innerHTML = state.cart.map(i => `
      <div class="order-summary-item">
        <span>${i.name} × ${i.qty}</span>
        <strong>${i.price * i.qty} جنيه</strong>
      </div>
    `).join('');
  }

  const total = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  const totalEl = document.getElementById('order-summary-total');
  if (totalEl) totalEl.textContent = total + ' جنيه';

  openCustomerModal('order-summary-modal');
}

async function confirmAndSendOrder(e) {
  e.preventDefault();

  const nameInput = document.getElementById('order-customer-name');
  const phoneInput = document.getElementById('order-customer-phone');
  const addressInput = document.getElementById('order-customer-address');

  const name = nameInput ? nameInput.value.trim() : '';
  const phone = phoneInput ? phoneInput.value.trim() : '';
  const address = addressInput ? addressInput.value.trim() : '';

  if (!name || !phone) {
    showToast('⚠️ يرجى إدخال الاسم ورقم الهاتف للتأكيد');
    return;
  }

  const lines = state.cart.map(i => `🔸 ${i.name} × ${i.qty} = ${i.price * i.qty} جنيه`).join('\n');
  const total = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  const msg   = `مرحباً ميكسات! 🍽️\nأريد تأكيد الطلب التالي:\n\n👤 الاسم: ${name}\n📧 الإيميل: ${state.userEmail}\n📞 الهاتف: ${phone}\n📍 العنوان/الملاحظات: ${address || 'لا يوجد'}\n\nتفاصيل الطلب:\n${lines}\n\n💰 الإجمالي: ${total} جنيه`;

  const waRaw = (state.settings && state.settings.whatsapp) ? state.settings.whatsapp : '201145843805';
  const wa = waRaw.replace(/[^0-9]/g, '');
  const waUrl = `https://api.whatsapp.com/send?phone=${wa}&text=${encodeURIComponent(msg)}`;

  // فتح الواتساب برابط ثابت بدون مشاكل تحويل
  window.open(waUrl, '_blank');

  // تفريغ سلة هذا العميل بعد التأكيد في الفايربيز وفي اللوكال
  const userEmail = state.userEmail;
  state.cart = [];
  await DataStore.saveUserCart(userEmail, []);

  closeCustomerModal('order-summary-modal');
  closeCart();
  updateCartUI();
  showToast('✅ تم تأكيد الطلب وإرساله عبر الواتساب وتفريغ السلة!');
}

// ===== إضافة تقييم =====
async function submitReview(e) {
  e.preventDefault();
  const form    = e.target;
  const name    = form.querySelector('#rev-name').value.trim();
  const rating  = parseInt(form.querySelector('input[name="rating"]:checked')?.value || '5');
  const comment = form.querySelector('#rev-comment').value.trim();

  if (!name || !comment) { showToast('⚠️ يرجى ملء جميع الحقول'); return; }

  try {
    await DataStore.saveReview({ name, rating, comment, approved: false });
    showToast('✅ شكراً! سيظهر تقييمك بعد المراجعة');
    form.reset();
  } catch { showToast('❌ حدث خطأ، حاول مرة أخرى'); }
}

// ==========================================
// مستمعات الأحداث
// ==========================================
function setupEventListeners() {
  // Navbar burger
  const burger = document.getElementById('nav-burger');
  const mobileNav = document.getElementById('nav-mobile');
  if (burger && mobileNav) {
    burger.addEventListener('click', () => {
      burger.classList.toggle('open');
      mobileNav.classList.toggle('open');
    });
  }

  // Close mobile nav on link click
  document.querySelectorAll('#nav-mobile .nav-link').forEach(link => {
    link.addEventListener('click', () => {
      burger?.classList.remove('open');
      mobileNav?.classList.remove('open');
    });
  });

  // Category tabs
  document.getElementById('menu-tabs')?.addEventListener('click', e => {
    const btn = e.target.closest('.menu-tab');
    if (!btn) return;
    state.activeCategory = btn.dataset.cat;
    renderMenuTabs();
    renderMenu();
    initScrollReveal();
    document.getElementById('menu').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Search
  document.getElementById('menu-search')?.addEventListener('input', e => {
    state.searchQuery = e.target.value;
    renderMenu();
    initScrollReveal();
  });

  // Cart open/close
  document.getElementById('cart-fab')?.addEventListener('click', openCart);
  document.getElementById('cart-close-btn')?.addEventListener('click', closeCart);
  document.getElementById('cart-overlay')?.addEventListener('click', closeCart);

  // Checkout
  document.getElementById('btn-checkout')?.addEventListener('click', orderViaWhatsApp);

  // Direct WhatsApp in hero
  document.getElementById('hero-whatsapp-btn')?.addEventListener('click', () => {
    const waRaw = (state.settings && state.settings.whatsapp) ? state.settings.whatsapp : '201145843805';
    const wa = waRaw.replace(/[^0-9]/g, '');
    window.open(`https://api.whatsapp.com/send?phone=${wa}`, '_blank');
  });

  // Review form
  document.getElementById('review-form')?.addEventListener('submit', submitReview);

  // Smooth scroll for nav links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });

  // Active nav highlighting on scroll
  window.addEventListener('scroll', updateActiveNav, { passive: true });
}

// ===== تفعيل رابط التنقل النشط =====
function updateActiveNav() {
  const sections = ['hero','best-sellers','menu','about','reviews','contact'];
  const scrollY  = window.scrollY + 100;

  sections.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.offsetTop;
    const bot = top + el.offsetHeight;
    const link = document.querySelector(`.nav-link[href="#${id}"]`);
    if (link) link.classList.toggle('active', scrollY >= top && scrollY < bot);
  });
}

// ===== شريط التنقل عند التمرير =====
function initNavScroll() {
  const nav = document.getElementById('navbar');
  const handler = () => nav?.classList.toggle('scrolled', window.scrollY > 30);
  window.addEventListener('scroll', handler, { passive: true });
  handler();
}

// ===== أنيميشن الظهور عند التمرير =====
function initScrollReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal:not(.visible)').forEach(el => observer.observe(el));
}

// ===== جزيئات الهيرو =====
function initParticles() {
  const container = document.querySelector('.hero-particles');
  if (!container) return;

  const colors = ['#CC0000','#D4AF37','#FF6666','#F0D060'];
  const count  = window.innerWidth < 768 ? 12 : 24;

  for (let i = 0; i < count; i++) {
    const span = document.createElement('span');
    const size = Math.random() * 6 + 2;
    span.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random()*100}%;
      bottom:-${size}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      animation-duration:${Math.random()*10+8}s;
      animation-delay:${Math.random()*8}s;
    `;
    container.appendChild(span);
  }
}

// ===== إظهار/إخفاء المحمل =====
function showLoader() {
  const loader = document.getElementById('page-loader');
  if (loader) loader.classList.remove('hidden');
}

function hideLoader() {
  const loader = document.getElementById('page-loader');
  if (loader) loader.classList.add('hidden');
  // Trigger initial reveal after loader hides
  setTimeout(initScrollReveal, 100);
}

// ===== إشعار Toast =====
function showToast(msg) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
