// ==========================================
// ميكسات - منطق لوحة التحكم
// ==========================================

// ===== الحالة =====
const adminState = {
  items:      [],
  categories: [],
  offers:     [],
  reviews:    [],
  settings:   null,
  activePage: 'dashboard',
  editingItem:  null,
  editingOffer: null,
  searchQuery: '',
};

// ===== التهيئة =====
document.addEventListener('DOMContentLoaded', async () => {
  initFirebase();

  // Firebase Auth بيحتاج وقت عشان يحمل الـ session المحفوظة
  // لازم نستنى onAuthStateChanged عشان نعرف لو المستخدم مسجل دخول ولا لأ
  if (IS_FIREBASE_CONFIGURED && auth) {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        console.log('✅ Admin authenticated:', user.email);
        showDashboard();
        await loadAdminData();
        renderActivePage();
      } else {
        console.log('🔒 No admin session found');
        showLoginPage();
      }
    });
  } else {
    // وضع localStorage (بدون Firebase)
    if (DataStore.isAdminLoggedIn()) {
      showDashboard();
      await loadAdminData();
      renderActivePage();
    } else {
      showLoginPage();
    }
  }

  setupAdminEvents();
});

// ===== تحميل البيانات =====
async function loadAdminData() {
  try {
    const [items, categories, offers, reviews, settings] = await Promise.all([
      DataStore.getMenuItems(),
      DataStore.getCategories(),
      DataStore.getAllReviews(),
      DataStore.getAllReviews(),
      DataStore.getSettings(),
    ]);
    adminState.items      = items;
    adminState.categories = categories;
    adminState.offers     = offers;
    adminState.reviews    = reviews;
    adminState.settings   = settings;
    updateSidebarBadges();
  } catch (e) {
    console.error('خطأ في تحميل بيانات الداشبورد:', e);
    adminState.items      = DEFAULT_MENU_DATA.items;
    adminState.categories = DEFAULT_MENU_DATA.categories;
    adminState.offers     = DEFAULT_OFFERS;
    adminState.reviews    = DEFAULT_REVIEWS;
    adminState.settings   = DEFAULT_SETTINGS;
  }
}

// ==========================================
// صفحات الداشبورد
// ==========================================
function showPage(page) {
  adminState.activePage = page;
  adminState.searchQuery = '';
  renderActivePage();
  updateSidebarActive();
  document.querySelector('#top-bar-title').textContent = getPageTitle(page);
}

function getPageTitle(page) {
  const titles = {
    dashboard: 'لوحة التحكم الرئيسية',
    menu:      'إدارة المنيو',
    categories:'إدارة الفئات',
    offers:    'إدارة العروض',
    bestSellers:'أفضل الأصناف',
    reviews:   'التقييمات',
    settings:  'إعدادات المحل',
  };
  return titles[page] || page;
}

function updateSidebarActive() {
  document.querySelectorAll('.sidebar-link[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === adminState.activePage);
  });
}

function updateSidebarBadges() {
  const pendingReviews = adminState.reviews.filter(r => !r.approved).length;
  const badge = document.getElementById('reviews-badge');
  if (badge) {
    badge.textContent = pendingReviews;
    badge.style.display = pendingReviews > 0 ? 'inline-block' : 'none';
  }
}

function renderActivePage() {
  const content = document.getElementById('page-content');
  switch (adminState.activePage) {
    case 'dashboard':   content.innerHTML = renderDashboardPage();   break;
    case 'menu':        content.innerHTML = renderMenuPage();        break;
    case 'categories':  content.innerHTML = renderCategoriesPage();  break;
    case 'offers':      content.innerHTML = renderOffersPage();      break;
    case 'bestSellers': content.innerHTML = renderBestSellersPage(); break;
    case 'reviews':     content.innerHTML = renderReviewsPage();     break;
    case 'settings':    content.innerHTML = renderSettingsPage();    break;
  }
  setupPageEvents();
}

// ==========================================
// صفحة الإحصائيات
// ==========================================
function renderDashboardPage() {
  const totalItems = adminState.items.length;
  const availItems = adminState.items.filter(i => i.available).length;
  const bestCount  = adminState.items.filter(i => i.bestSeller).length;
  const pendReviews= adminState.reviews.filter(r => !r.approved).length;
  const activeOffers= adminState.offers.filter(o => o.active).length;

  return `
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon red"><i class="fas fa-utensils"></i></div>
      <div>
        <div class="stat-value">${totalItems}</div>
        <div class="stat-label">إجمالي الأصناف</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
      <div>
        <div class="stat-value">${availItems}</div>
        <div class="stat-label">صنف متاح</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon gold"><i class="fas fa-star"></i></div>
      <div>
        <div class="stat-value">${bestCount}</div>
        <div class="stat-label">الأكثر طلباً</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon orange"><i class="fas fa-tag"></i></div>
      <div>
        <div class="stat-value">${activeOffers}</div>
        <div class="stat-label">عروض نشطة</div>
      </div>
    </div>
  </div>

  <div class="content-card">
    <div class="card-header">
      <div class="card-title"><i class="fas fa-fire"></i> أحدث الأصناف المضافة</div>
      <button class="btn btn-red btn-sm" onclick="showPage('menu')">
        <i class="fas fa-plus"></i> إضافة صنف
      </button>
    </div>
    <div class="card-body" style="padding:0;overflow-x:auto">
      <table class="data-table">
        <thead>
          <tr>
            <th>الاسم</th>
            <th>الفئة</th>
            <th>السعر</th>
            <th>الحالة</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          ${adminState.items.slice(-6).reverse().map(item => renderItemRow(item)).join('')}
        </tbody>
      </table>
    </div>
  </div>

  ${pendReviews > 0 ? `
  <div class="content-card">
    <div class="card-header">
      <div class="card-title"><i class="fas fa-comment"></i> تقييمات بانتظار المراجعة (${pendReviews})</div>
      <button class="btn btn-outline btn-sm" onclick="showPage('reviews')">عرض الكل</button>
    </div>
    <div class="card-body">
      <p style="color:var(--text-400);font-size:.88rem">يوجد ${pendReviews} تقييم بانتظار موافقتك. اذهب لصفحة التقييمات للمراجعة.</p>
    </div>
  </div>` : ''}
  `;
}

// ==========================================
// صفحة المنيو
// ==========================================
function renderMenuPage() {
  const filtered = adminState.searchQuery
    ? adminState.items.filter(i => i.name.includes(adminState.searchQuery) || (i.description || '').includes(adminState.searchQuery))
    : adminState.items;

  return `
  <div class="content-card">
    <div class="card-header">
      <div class="card-title"><i class="fas fa-list"></i> جميع الأصناف (${adminState.items.length})</div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <div class="dash-search-wrap">
          <i class="fas fa-search dash-search-icon"></i>
          <input type="text" class="dash-search" id="item-search" placeholder="بحث..." value="${adminState.searchQuery}" oninput="adminSearchItems(this.value)" />
        </div>
        <button class="btn btn-red btn-sm" onclick="openItemModal()">
          <i class="fas fa-plus"></i> إضافة صنف
        </button>
      </div>
    </div>
    <div style="overflow-x:auto">
      <table class="data-table">
        <thead>
          <tr>
            <th>الاسم</th>
            <th>الفئة</th>
            <th>السعر</th>
            <th>متاح</th>
            <th>الأكثر طلباً</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody id="items-table-body">
          ${filtered.map(item => renderItemRow(item)).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- مودال إضافة/تعديل صنف -->
  ${renderItemModal()}
  `;
}

function renderItemRow(item) {
  const cat = adminState.categories.find(c => c.id === item.category);
  return `
    <tr>
      <td class="item-name-cell">${item.name}</td>
      <td><span class="item-cat-badge">${cat ? cat.icon + ' ' + cat.name : item.category}</span></td>
      <td class="price-cell">${item.price} جنيه</td>
      <td>
        <label class="toggle-switch" title="${item.available ? 'متاح' : 'غير متاح'}">
          <input type="checkbox" ${item.available ? 'checked' : ''} onchange="toggleItemAvailable('${item.id}', this.checked)" />
          <div class="toggle-track"><div class="toggle-thumb"></div></div>
        </label>
      </td>
      <td>
        <label class="toggle-switch" title="${item.bestSeller ? 'أكثر طلباً' : 'عادي'}">
          <input type="checkbox" ${item.bestSeller ? 'checked' : ''} onchange="toggleBestSeller('${item.id}', this.checked)" />
          <div class="toggle-track"><div class="toggle-thumb"></div></div>
        </label>
      </td>
      <td>
        <div class="actions-cell">
          <button class="btn btn-outline btn-sm btn-icon" onclick="openItemModal('${item.id}')" title="تعديل">
            <i class="fas fa-pen"></i>
          </button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="deleteItem('${item.id}')" title="حذف">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>`;
}

function renderItemModal(itemId) {
  const item = itemId ? adminState.items.find(i => i.id === itemId) : null;
  return `
  <div class="modal-overlay" id="item-modal">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">${item ? '✏️ تعديل صنف' : '➕ إضافة صنف جديد'}</div>
        <button class="modal-close" onclick="closeModal('item-modal')"><i class="fas fa-times"></i></button>
      </div>
      <form id="item-form" onsubmit="saveItem(event)">
        <div class="modal-body">
          <input type="hidden" id="item-id" value="${item ? item.id : ''}" />
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">اسم الصنف *</label>
              <input type="text" class="form-input" id="item-name" value="${item ? item.name : ''}" required placeholder="مثال: كريب كوردن بلو" />
            </div>
            <div class="form-group">
              <label class="form-label">الفئة *</label>
              <select class="form-input" id="item-category" required>
                <option value="">اختر الفئة</option>
                ${adminState.categories.map(c => `<option value="${c.id}" ${item && item.category === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">وصف الصنف</label>
            <input type="text" class="form-input" id="item-desc" value="${item ? (item.description || '') : ''}" placeholder="مكونات ومميزات الصنف..." />
          </div>
          <div class="form-group">
            <label class="form-label">صورة الصنف (اختياري)</label>
            <input type="file" class="form-input" id="item-image" accept="image/*" />
            ${item && item.image ? `<img src="${item.image}" alt="Preview" style="max-width:80px;border-radius:8px;margin-top:8px;">` : ''}
          </div>
          <div class="form-row">
            <div class="form-group" style="flex:1">
              <label class="form-label">نوع السعر *</label>
              <select class="form-input" id="item-price-type" onchange="document.getElementById('single-price-group').style.display=this.value==='single'?'flex':'none'; document.getElementById('sizes-price-group').style.display=this.value==='sizes'?'flex':'none';">
                <option value="single" ${!item || !item.sizes ? 'selected' : ''}>سعر واحد ثابت</option>
                <option value="sizes" ${item && item.sizes ? 'selected' : ''}>أحجام (صغير / كبير)</option>
              </select>
            </div>
          </div>
          <div class="form-row" id="single-price-group" style="${item && item.sizes ? 'display:none' : 'display:flex'}">
            <div class="form-group">
              <label class="form-label">السعر (جنيه) *</label>
              <input type="number" class="form-input" id="item-price" value="${item && !item.sizes ? item.price : ''}" min="1" placeholder="مثال: 50" />
            </div>
          </div>
          <div class="form-row" id="sizes-price-group" style="${item && item.sizes ? 'display:flex' : 'display:none'}">
            <div class="form-group">
              <label class="form-label">سعر الصغير (جنيه)</label>
              <input type="number" class="form-input" id="item-price-small" value="${item && item.sizes ? (item.sizes.find(s=>s.name==='صغير')?.price || '') : ''}" min="1" />
            </div>
            <div class="form-group">
              <label class="form-label">سعر الكبير (جنيه)</label>
              <input type="number" class="form-input" id="item-price-large" value="${item && item.sizes ? (item.sizes.find(s=>s.name==='كبير')?.price || '') : ''}" min="1" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group" style="justify-content:flex-end;gap:12px;flex-direction:row">
              <label class="form-check" style="flex-direction:row-reverse">
                <input type="checkbox" id="item-available" ${!item || item.available ? 'checked' : ''} />
                متاح للطلب
              </label>
              <label class="form-check" style="flex-direction:row-reverse">
                <input type="checkbox" id="item-best" ${item && item.bestSeller ? 'checked' : ''} />
                ⭐ الأكثر طلباً
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick="closeModal('item-modal')">إلغاء</button>
          <button type="submit" class="btn btn-red">
            <i class="fas fa-save"></i> حفظ
          </button>
        </div>
      </form>
    </div>
  </div>`;
}

// ==========================================
// صفحة الفئات
// ==========================================
function renderCategoriesPage() {
  return `
  <div class="content-card">
    <div class="card-header">
      <div class="card-title"><i class="fas fa-th-large"></i> الفئات (${adminState.categories.length})</div>
      <button class="btn btn-red btn-sm" onclick="openCatModal()">
        <i class="fas fa-plus"></i> فئة جديدة
      </button>
    </div>
    <div class="card-body">
      <div id="cat-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">
        ${adminState.categories.map(cat => `
          <div style="background:var(--bg-input);border:1px solid var(--border);border-radius:10px;padding:16px;display:flex;align-items:center;gap:12px">
            <span style="font-size:2rem">${cat.icon}</span>
            <div style="flex:1">
              <div style="font-weight:700;color:var(--text-100)">${cat.name}</div>
              <div style="font-size:.72rem;color:var(--text-400)">${adminState.items.filter(i=>i.category===cat.id).length} صنف</div>
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-outline btn-sm btn-icon" onclick="openCatModal('${cat.id}')"><i class="fas fa-pen"></i></button>
              <button class="btn btn-danger btn-sm btn-icon" onclick="deleteCat('${cat.id}')"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </div>

  <!-- مودال الفئة -->
  <div class="modal-overlay" id="cat-modal">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title" id="cat-modal-title">➕ فئة جديدة</div>
        <button class="modal-close" onclick="closeModal('cat-modal')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <form id="cat-form" onsubmit="saveCat(event)">
          <input type="hidden" id="cat-id" />
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">اسم الفئة *</label>
              <input type="text" class="form-input" id="cat-name" required placeholder="مثال: المشروبات" />
            </div>
            <div class="form-group">
              <label class="form-label">أيقونة إيموجي *</label>
              <input type="text" class="form-input" id="cat-icon" required placeholder="مثال: 🥤" maxlength="4" />
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal('cat-modal')">إلغاء</button>
        <button class="btn btn-red" onclick="document.getElementById('cat-form').requestSubmit()">
          <i class="fas fa-save"></i> حفظ
        </button>
      </div>
    </div>
  </div>`;
}

// ==========================================
// صفحة العروض
// ==========================================
function renderOffersPage() {
  return `
  <div class="content-card">
    <div class="card-header">
      <div class="card-title"><i class="fas fa-tag"></i> العروض (${adminState.offers.length})</div>
      <button class="btn btn-red btn-sm" onclick="openOfferModal()">
        <i class="fas fa-plus"></i> عرض جديد
      </button>
    </div>
    <div style="overflow-x:auto">
      <table class="data-table">
        <thead>
          <tr>
            <th>العنوان</th>
            <th>الوصف</th>
            <th>السعر الأصلي</th>
            <th>سعر العرض</th>
            <th>نشط</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          ${adminState.offers.map(offer => `
            <tr>
              <td style="font-weight:700;color:var(--text-100)">${offer.title}</td>
              <td style="color:var(--text-400);font-size:.82rem;max-width:200px">${offer.description}</td>
              <td style="color:var(--text-400);text-decoration:line-through">${offer.originalPrice} جنيه</td>
              <td class="price-cell">${offer.offerPrice} جنيه</td>
              <td>
                <label class="toggle-switch">
                  <input type="checkbox" ${offer.active ? 'checked' : ''} onchange="toggleOffer('${offer.id}', this.checked)" />
                  <div class="toggle-track"><div class="toggle-thumb"></div></div>
                </label>
              </td>
              <td>
                <div class="actions-cell">
                  <button class="btn btn-outline btn-sm btn-icon" onclick="openOfferModal('${offer.id}')"><i class="fas fa-pen"></i></button>
                  <button class="btn btn-danger btn-sm btn-icon" onclick="deleteOffer('${offer.id}')"><i class="fas fa-trash"></i></button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- مودال العرض -->
  <div class="modal-overlay" id="offer-modal">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title" id="offer-modal-title">➕ عرض جديد</div>
        <button class="modal-close" onclick="closeModal('offer-modal')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <form id="offer-form" onsubmit="saveOffer(event)">
          <input type="hidden" id="offer-id" />
          <div class="form-row single">
            <div class="form-group">
              <label class="form-label">عنوان العرض *</label>
              <input type="text" class="form-input" id="offer-title" required placeholder="مثال: عرض الترحيب" />
            </div>
          </div>
          <div class="form-row single">
            <div class="form-group">
              <label class="form-label">وصف العرض *</label>
              <input type="text" class="form-input" id="offer-desc" required placeholder="مثال: كريب ميكسات + مكرونة بالشاورما" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">السعر الأصلي (جنيه) *</label>
              <input type="number" class="form-input" id="offer-original" min="1" required />
            </div>
            <div class="form-group">
              <label class="form-label">سعر العرض (جنيه) *</label>
              <input type="number" class="form-input" id="offer-price" min="1" required />
            </div>
          </div>
          <label class="form-check" style="margin-top:4px">
            <input type="checkbox" id="offer-active" checked />
            تفعيل العرض الآن
          </label>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal('offer-modal')">إلغاء</button>
        <button class="btn btn-red" onclick="document.getElementById('offer-form').requestSubmit()">
          <i class="fas fa-save"></i> حفظ
        </button>
      </div>
    </div>
  </div>`;
}

// ==========================================
// صفحة الأكثر طلباً
// ==========================================
function renderBestSellersPage() {
  return `
  <div class="content-card">
    <div class="card-header">
      <div class="card-title"><i class="fas fa-fire"></i> إدارة "الأكثر طلباً"</div>
      <span style="font-size:.8rem;color:var(--text-400)">${adminState.items.filter(i=>i.bestSeller).length} صنف مختار</span>
    </div>
    <div class="card-body">
      <p style="color:var(--text-400);font-size:.85rem;margin-bottom:20px">
        فعّل/أوقف الأصناف التي تريد إظهارها في قسم "الأكثر طلباً" في الصفحة الرئيسية
      </p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">
        ${adminState.items.filter(i => i.available).map(item => {
          const cat = adminState.categories.find(c => c.id === item.category);
          return `
          <div style="background:var(--bg-input);border:1px solid ${item.bestSeller ? 'rgba(212,175,55,.4)' : 'var(--border)'};border-radius:10px;padding:14px;display:flex;align-items:center;gap:12px;transition:.2s">
            <span style="font-size:1.6rem">${cat ? cat.icon : '🍽️'}</span>
            <div style="flex:1">
              <div style="font-weight:700;font-size:.88rem;color:var(--text-100)">${item.name}</div>
              <div style="font-size:.72rem;color:var(--gold)">${item.price} جنيه</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" ${item.bestSeller ? 'checked' : ''} onchange="toggleBestSeller('${item.id}', this.checked)" />
              <div class="toggle-track"><div class="toggle-thumb"></div></div>
            </label>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

// ==========================================
// صفحة التقييمات
// ==========================================
function renderReviewsPage() {
  return `
  <div class="content-card">
    <div class="card-header">
      <div class="card-title"><i class="fas fa-star"></i> التقييمات (${adminState.reviews.length})</div>
    </div>
    <div style="overflow-x:auto">
      <table class="data-table">
        <thead>
          <tr>
            <th>الاسم</th>
            <th>التقييم</th>
            <th>التعليق</th>
            <th>التاريخ</th>
            <th>الحالة</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          ${adminState.reviews.map(r => `
            <tr>
              <td style="font-weight:700;color:var(--text-100)">${r.name}</td>
              <td>${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</td>
              <td style="color:var(--text-400);font-size:.82rem;max-width:250px">${r.comment}</td>
              <td style="font-size:.78rem;color:var(--text-400)">${new Date(r.date).toLocaleDateString('ar-EG')}</td>
              <td>
                <span class="status-badge ${r.approved ? 'available' : 'unavailable'}">
                  ${r.approved ? '✅ موافق عليه' : '⏳ في الانتظار'}
                </span>
              </td>
              <td>
                <div class="actions-cell">
                  <button class="btn ${r.approved ? 'btn-danger' : 'btn-success'} btn-sm btn-icon"
                    onclick="toggleReview('${r.id}', ${!r.approved})"
                    title="${r.approved ? 'إلغاء الموافقة' : 'الموافقة'}">
                    <i class="fas fa-${r.approved ? 'times' : 'check'}"></i>
                  </button>
                  <button class="btn btn-danger btn-sm btn-icon" onclick="deleteReview('${r.id}')" title="حذف">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

// ==========================================
// صفحة الإعدادات
// ==========================================
function renderSettingsPage() {
  const s = adminState.settings || DEFAULT_SETTINGS;
  return `
  <div class="content-card">
    <div class="card-header">
      <div class="card-title"><i class="fas fa-cog"></i> إعدادات المحل</div>
    </div>
    <div class="card-body">
      <form id="settings-form" onsubmit="saveSettings(event)">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">اسم المحل</label>
            <input type="text" class="form-input" id="set-name" value="${s.shopName}" />
          </div>
          <div class="form-group">
            <label class="form-label">الشعار / التاجلاين</label>
            <input type="text" class="form-input" id="set-tagline" value="${s.tagline}" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">رقم الواتساب (مع كود الدولة)</label>
            <input type="text" class="form-input" id="set-whatsapp" value="${s.whatsapp}" placeholder="مثال: 201000000000" dir="ltr" />
          </div>
          <div class="form-group">
            <label class="form-label">رقم التليفون</label>
            <input type="text" class="form-input" id="set-phone" value="${s.phone}" placeholder="01000000000" dir="ltr" />
          </div>
        </div>
        <div class="form-row single">
          <div class="form-group">
            <label class="form-label">عنوان المحل</label>
            <input type="text" class="form-input" id="set-address" value="${s.address}" placeholder="القاهرة، مصر..." />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">ساعات العمل</label>
            <input type="text" class="form-input" id="set-hours" value="${s.workingHours}" />
          </div>
          <div class="form-group">
            <label class="form-label">مناطق التوصيل</label>
            <input type="text" class="form-input" id="set-delivery" value="${s.deliveryAreas}" />
          </div>
        </div>
        <div class="form-row single">
          <div class="form-group">
            <label class="form-label">نص "عن ميكسات"</label>
            <textarea class="form-input" id="set-about" rows="4">${s.aboutText}</textarea>
          </div>
        </div>
        <div style="margin-top:8px">
          <button type="submit" class="btn btn-red">
            <i class="fas fa-save"></i> حفظ الإعدادات
          </button>
        </div>
      </form>
    </div>
  </div>

  <div class="content-card">
    <div class="card-header">
      <div class="card-title"><i class="fas fa-lock"></i> تغيير كلمة السر</div>
    </div>
    <div class="card-body">
      <p style="color:var(--text-400);font-size:.85rem;margin-bottom:16px">
        ${IS_FIREBASE_CONFIGURED ? 'لتغيير كلمة السر، استخدم Firebase Authentication Console.' : 'تعديل بيانات الدخول المحلية'}
      </p>
      ${!IS_FIREBASE_CONFIGURED ? `
      <form id="pass-form" onsubmit="changeLocalPass(event)">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">الإيميل</label>
            <input type="email" class="form-input" id="new-email" placeholder="${ADMIN_LOCAL_CREDENTIALS.email}" dir="ltr" />
          </div>
          <div class="form-group">
            <label class="form-label">كلمة السر الجديدة</label>
            <input type="password" class="form-input" id="new-pass" placeholder="••••••••" dir="ltr" />
          </div>
        </div>
        <button type="submit" class="btn btn-outline"><i class="fas fa-key"></i> تغيير</button>
      </form>` : '<p style="color:var(--gold);font-size:.85rem">🔗 اذهب إلى Firebase Console لتغيير كلمة السر</p>'}
    </div>
  </div>

  ${IS_FIREBASE_CONFIGURED ? `
  <div class="content-card">
    <div class="card-header">
      <div class="card-title"><i class="fas fa-cloud-upload-alt"></i> مزامنة البيانات مع Firebase</div>
    </div>
    <div class="card-body">
      <p style="color:var(--text-400);font-size:.85rem;margin-bottom:16px">
        لو قاعدة البيانات فاضية أو الأصناف مش ظاهرة عند الزباين، اضغط الزرار ده عشان ترفع كل البيانات الافتراضية على Firebase.
        <br><strong style="color:var(--gold)">⚠️ ملاحظة:</strong> ده هيرفع البيانات الافتراضية من menu-data.js. لو عندك بيانات معدلة على Firebase، ممكن تتكتب عليها.
      </p>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-red" id="btn-seed-firestore" onclick="handleSeedFirestore()">
          <i class="fas fa-cloud-upload-alt"></i> رفع البيانات على Firebase
        </button>
        <span id="seed-status" style="font-size:.85rem;color:var(--text-400)"></span>
      </div>
    </div>
  </div>` : ''}`;
}

// ==========================================
// وظائف المنيو
// ==========================================
function openItemModal(itemId) {
  const existingModal = document.getElementById('item-modal');
  if (existingModal) existingModal.remove();

  const modalHTML = renderItemModal(itemId);
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  if (itemId) {
    const item = adminState.items.find(i => i.id === itemId);
    if (item) {
      document.getElementById('item-id').value = item.id;
      document.getElementById('item-name').value = item.name;
      document.getElementById('item-category').value = item.category;
      document.getElementById('item-desc').value = item.description || '';
      document.getElementById('item-price').value = item.price;
      document.getElementById('item-available').checked = item.available;
      document.getElementById('item-best').checked = item.bestSeller;
    }
  }

  document.getElementById('item-modal').classList.add('open');
}

// ==========================================
// رفع الصور - Cloudinary مع fallback لـ base64
// ==========================================
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadImageToCloudinary(file) {
  // أولاً: نحاول Cloudinary
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'Mixat_dedo');
    
    const response = await fetch('https://api.cloudinary.com/v1_1/dfeptodqc/image/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Cloudinary Error:', response.status, errorData);
      throw new Error(errorData?.error?.message || 'فشل رفع الصورة على Cloudinary');
    }
    const data = await response.json();
    console.log('✅ تم رفع الصورة على Cloudinary:', data.secure_url);
    return data.secure_url;
  } catch (cloudErr) {
    console.warn('⚠️ Cloudinary فشل، جاري التحويل لـ base64:', cloudErr.message);
    // Fallback: تحويل الصورة لـ base64 وحفظها مباشرة
    const base64 = await fileToBase64(file);
    return base64;
  }
}

async function saveItem(e) {
  e.preventDefault();
  
  // نلاقي زرار الحفظ - ممكن يكون جوا الفورم أو في modal-footer
  let submitBtn = e.target.querySelector('button[type="submit"]');
  if (!submitBtn) {
    const modal = e.target.closest('.modal') || document.querySelector('#item-modal .modal');
    if (modal) submitBtn = modal.querySelector('.btn-red');
  }
  
  let originalText = '';
  if (submitBtn) {
    originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
    submitBtn.disabled = true;
  }

  try {
    const id = document.getElementById('item-id').value;
    const fileInput = document.getElementById('item-image');
    let imageUrl = null;
    
    // إذا كان في صنف موجود أصلاً، نحتفظ بصورته القديمة كمبدأ
    if (id) {
      const existingItem = adminState.items.find(i => i.id === id);
      if (existingItem && existingItem.image) {
        imageUrl = existingItem.image;
      }
    }

    // لو تم اختيار صورة جديدة، نرفعها
    if (fileInput && fileInput.files.length > 0) {
      console.log('📸 جاري رفع صورة جديدة...');
      imageUrl = await uploadImageToCloudinary(fileInput.files[0]);
      console.log('✅ تم رفع الصورة:', imageUrl ? imageUrl.substring(0, 60) + '...' : 'فشل');
    }

    const priceType = document.getElementById('item-price-type').value;
    let price = null;
    let sizes = null;

    if (priceType === 'single') {
      price = parseInt(document.getElementById('item-price').value) || 0;
    } else {
      sizes = [];
      const sp = parseInt(document.getElementById('item-price-small').value);
      const lp = parseInt(document.getElementById('item-price-large').value);
      if (!isNaN(sp) && sp > 0) sizes.push({ name: 'صغير', price: sp });
      if (!isNaN(lp) && lp > 0) sizes.push({ name: 'كبير', price: lp });
      
      if (sizes.length === 0) sizes = null;
      else price = sizes[0].price; // fallback price for older clients or sorting
    }

    const item = {
      id:          id || 'new_' + Date.now(),
      name:        document.getElementById('item-name').value.trim(),
      category:    document.getElementById('item-category').value,
      description: document.getElementById('item-desc').value.trim(),
      price:       price,
      sizes:       sizes, // If null, it overrides any existing array in merge
      available:   document.getElementById('item-available').checked,
      bestSeller:  document.getElementById('item-best').checked,
    };
    
    // نحفظ الصورة دايماً - سواء جديدة أو قديمة
    item.image = imageUrl || '';

    const savedId = await DataStore.saveMenuItem(item);
    item.id = savedId;

    const idx = adminState.items.findIndex(i => i.id === item.id);
    if (idx >= 0) adminState.items[idx] = item;
    else adminState.items.push(item);

    closeModal('item-modal');
    renderActivePage();
    showAdminToast('✅ تم حفظ الصنف بنجاح');
  } catch (err) { 
    console.error('❌ خطأ في حفظ الصنف:', err);
    showAdminToast('❌ حدث خطأ في الحفظ: ' + err.message, true); 
  } finally {
    if (submitBtn) {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  }
}

async function deleteItem(id) {
  if (!confirm('هل تريد حذف هذا الصنف؟')) return;
  try {
    await DataStore.deleteMenuItem(id);
    adminState.items = adminState.items.filter(i => i.id !== id);
    renderActivePage();
    showAdminToast('✅ تم حذف الصنف');
  } catch { showAdminToast('❌ حدث خطأ في الحذف', true); }
}

async function toggleItemAvailable(id, val) {
  const item = adminState.items.find(i => i.id === id);
  if (!item) return;
  item.available = val;
  await DataStore.saveMenuItem(item);
  showAdminToast(val ? '✅ الصنف متاح الآن' : '⚠️ تم إخفاء الصنف');
}

async function toggleBestSeller(id, val) {
  const item = adminState.items.find(i => i.id === id);
  if (!item) return;
  item.bestSeller = val;
  await DataStore.saveMenuItem(item);
  if (adminState.activePage === 'bestSellers') renderActivePage();
  showAdminToast(val ? '⭐ تم إضافته للأكثر طلباً' : '✅ تم الإزالة من الأكثر طلباً');
}

function adminSearchItems(q) {
  adminState.searchQuery = q;
  const filtered = q
    ? adminState.items.filter(i => i.name.includes(q) || (i.description || '').includes(q))
    : adminState.items;

  const tbody = document.getElementById('items-table-body');
  if (tbody) tbody.innerHTML = filtered.map(item => renderItemRow(item)).join('');
}

// ==========================================
// وظائف الفئات
// ==========================================
function openCatModal(catId) {
  const cat = catId ? adminState.categories.find(c => c.id === catId) : null;
  document.getElementById('cat-modal-title').textContent = cat ? '✏️ تعديل فئة' : '➕ فئة جديدة';
  document.getElementById('cat-id').value   = cat ? cat.id : '';
  document.getElementById('cat-name').value = cat ? cat.name : '';
  document.getElementById('cat-icon').value = cat ? cat.icon : '';
  document.getElementById('cat-modal').classList.add('open');
}

async function saveCat(e) {
  e.preventDefault();
  const id   = document.getElementById('cat-id').value;
  const name = document.getElementById('cat-name').value.trim();
  const icon = document.getElementById('cat-icon').value.trim();

  if (id) {
    const cat = adminState.categories.find(c => c.id === id);
    if (cat) { cat.name = name; cat.icon = icon; }
  } else {
    adminState.categories.push({ id: name.replace(/\s+/g,'_').toLowerCase() + '_' + Date.now(), name, icon });
  }

  try {
    await DataStore.saveCategories(adminState.categories);
    closeModal('cat-modal');
    renderActivePage();
    showAdminToast('✅ تم حفظ الفئة');
  } catch { showAdminToast('❌ حدث خطأ', true); }
}

async function deleteCat(id) {
  const hasItems = adminState.items.some(i => i.category === id);
  if (hasItems && !confirm('هذه الفئة تحتوي على أصناف. هل تريد حذفها؟')) return;
  adminState.categories = adminState.categories.filter(c => c.id !== id);
  await DataStore.saveCategories(adminState.categories);
  renderActivePage();
  showAdminToast('✅ تم حذف الفئة');
}

// ==========================================
// وظائف العروض
// ==========================================
function openOfferModal(offerId) {
  const offer = offerId ? adminState.offers.find(o => o.id === offerId) : null;
  document.getElementById('offer-modal-title').textContent = offer ? '✏️ تعديل عرض' : '➕ عرض جديد';
  document.getElementById('offer-id').value       = offer ? offer.id : '';
  document.getElementById('offer-title').value    = offer ? offer.title : '';
  document.getElementById('offer-desc').value     = offer ? offer.description : '';
  document.getElementById('offer-original').value = offer ? offer.originalPrice : '';
  document.getElementById('offer-price').value    = offer ? offer.offerPrice : '';
  document.getElementById('offer-active').checked = offer ? offer.active : true;
  document.getElementById('offer-modal').classList.add('open');
}

async function saveOffer(e) {
  e.preventDefault();
  const id = document.getElementById('offer-id').value;
  const offer = {
    id:            id || 'new_' + Date.now(),
    title:         document.getElementById('offer-title').value.trim(),
    description:   document.getElementById('offer-desc').value.trim(),
    originalPrice: parseInt(document.getElementById('offer-original').value),
    offerPrice:    parseInt(document.getElementById('offer-price').value),
    active:        document.getElementById('offer-active').checked,
  };

  try {
    await DataStore.saveOffer(offer);
    const idx = adminState.offers.findIndex(o => o.id === offer.id);
    if (idx >= 0) adminState.offers[idx] = offer;
    else adminState.offers.push(offer);

    closeModal('offer-modal');
    renderActivePage();
    showAdminToast('✅ تم حفظ العرض');
  } catch { showAdminToast('❌ حدث خطأ', true); }
}

async function deleteOffer(id) {
  if (!confirm('هل تريد حذف هذا العرض؟')) return;
  try {
    await DataStore.deleteOffer(id);
    adminState.offers = adminState.offers.filter(o => o.id !== id);
    renderActivePage();
    showAdminToast('✅ تم حذف العرض');
  } catch { showAdminToast('❌ حدث خطأ', true); }
}

async function toggleOffer(id, val) {
  const offer = adminState.offers.find(o => o.id === id);
  if (!offer) return;
  offer.active = val;
  await DataStore.saveOffer(offer);
  showAdminToast(val ? '✅ تم تفعيل العرض' : '⚠️ تم إيقاف العرض');
}

// ==========================================
// وظائف التقييمات
// ==========================================
async function toggleReview(id, approve) {
  try {
    await DataStore.updateReviewApproval(id, approve);
    const r = adminState.reviews.find(r => r.id === id);
    if (r) r.approved = approve;
    renderActivePage();
    updateSidebarBadges();
    showAdminToast(approve ? '✅ تمت الموافقة على التقييم' : '⚠️ تم إلغاء الموافقة');
  } catch { showAdminToast('❌ حدث خطأ', true); }
}

async function deleteReview(id) {
  if (!confirm('هل تريد حذف هذا التقييم؟')) return;
  adminState.reviews = adminState.reviews.filter(r => r.id !== id);
  localStorage.setItem('mixat_reviews', JSON.stringify(adminState.reviews));
  renderActivePage();
  updateSidebarBadges();
  showAdminToast('✅ تم حذف التقييم');
}

// ==========================================
// وظائف الإعدادات
// ==========================================
async function saveSettings(e) {
  e.preventDefault();
  const settings = {
    shopName:      document.getElementById('set-name').value.trim(),
    tagline:       document.getElementById('set-tagline').value.trim(),
    whatsapp:      document.getElementById('set-whatsapp').value.trim(),
    phone:         document.getElementById('set-phone').value.trim(),
    address:       document.getElementById('set-address').value.trim(),
    workingHours:  document.getElementById('set-hours').value.trim(),
    deliveryAreas: document.getElementById('set-delivery').value.trim(),
    aboutText:     document.getElementById('set-about').value.trim(),
  };

  try {
    await DataStore.saveSettings(settings);
    adminState.settings = settings;
    showAdminToast('✅ تم حفظ الإعدادات بنجاح');
  } catch { showAdminToast('❌ حدث خطأ في الحفظ', true); }
}

async function handleSeedFirestore() {
  const btn = document.getElementById('btn-seed-firestore');
  const status = document.getElementById('seed-status');

  if (!confirm('هل تريد رفع كل البيانات الافتراضية على Firebase؟\nده هيرفع الأصناف والفئات والإعدادات والتقييمات.')) return;

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الرفع...';
  status.textContent = '';

  try {
    const results = await seedFirestore();
    status.style.color = '#4CAF50';
    status.textContent = `✅ تم رفع ${results.items} صنف + الفئات + الإعدادات + ${results.reviews} تقييم بنجاح!`;
    showAdminToast('🎉 تم رفع كل البيانات على Firebase بنجاح!');
    // أعد تحميل البيانات
    await loadAdminData();
    renderActivePage();
  } catch (err) {
    status.style.color = '#f44336';
    status.textContent = '❌ خطأ: ' + err.message;
    showAdminToast('❌ فشل رفع البيانات: ' + err.message, true);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> رفع البيانات على Firebase';
  }
}

function changeLocalPass(e) {
  e.preventDefault();
  const email = document.getElementById('new-email').value;
  const pass  = document.getElementById('new-pass').value;
  if (email) ADMIN_LOCAL_CREDENTIALS.email = email;
  if (pass)  ADMIN_LOCAL_CREDENTIALS.password = pass;
  showAdminToast('✅ تم تغيير بيانات الدخول (مؤقتاً حتى إعادة التحميل)');
}

// ==========================================
// وظائف الواجهة
// ==========================================
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function showLoginPage() {
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('dashboard').classList.remove('active');
}

function showDashboard() {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('dashboard').classList.add('active');
}

function showAdminToast(msg, isError = false) {
  const old = document.querySelector('.admin-toast');
  if (old) old.remove();
  const toast = document.createElement('div');
  toast.className = `admin-toast${isError ? ' error' : ''}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ==========================================
// مستمعات الأحداث
// ==========================================
function setupAdminEvents() {
  // تسجيل الدخول
  document.getElementById('login-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass  = document.getElementById('login-pass').value;
    const errEl = document.getElementById('login-error');
    const btn   = e.target.querySelector('.login-btn');

    btn.textContent = 'جاري الدخول...';
    btn.disabled = true;
    errEl.classList.remove('show');

    try {
      await DataStore.adminLogin(email, pass);
      showDashboard();
      await loadAdminData();
      renderActivePage();
    } catch (err) {
      errEl.textContent = err.message || 'بيانات الدخول غير صحيحة';
      errEl.classList.add('show');
    } finally {
      btn.textContent = 'تسجيل الدخول';
      btn.disabled = false;
    }
  });

  // تسجيل الخروج
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await DataStore.adminLogout();
    showLoginPage();
  });

  // زر الهامبرجر للموبايل
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  function openSidebar() {
    sidebar.classList.add('open');
    sidebarToggle?.classList.add('open');
    sidebarOverlay?.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarToggle?.classList.remove('open');
    sidebarOverlay?.classList.remove('visible');
    document.body.style.overflow = '';
  }

  sidebarToggle?.addEventListener('click', () => {
    if (sidebar.classList.contains('open')) closeSidebar();
    else openSidebar();
  });

  sidebarOverlay?.addEventListener('click', closeSidebar);

  // روابط الشريط الجانبي
  document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
    link.addEventListener('click', () => {
      showPage(link.dataset.page);
      // أغلق السايدبار على الموبايل بعد الاختيار
      if (window.innerWidth <= 900) closeSidebar();
    });
  });

  // إغلاق المودال بالنقر على الخلفية
  document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) {
      e.target.classList.remove('open');
    }
  });
}

function setupPageEvents() {
  // لا شيء إضافي - كل الأحداث inline أو setupAdminEvents
}
