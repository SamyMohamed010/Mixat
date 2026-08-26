// ==========================================
// ميكسات - إعداد Firebase
// ==========================================
// 📌 لتفعيل Firebase:
// 1. اذهب إلى https://console.firebase.google.com
// 2. أنشئ مشروع جديد باسم "Mixat"
// 3. أضف تطبيق ويب واحصل على الإعدادات
// 4. فعّل Firestore Database و Authentication (Email/Password)
// 5. ضع إعداداتك هنا بدلاً من القيم الافتراضية

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCyWgeoXNIA3s3gza3XexDQSjB6uxQXhPo",
  authDomain: "mixat-99b39.firebaseapp.com",
  projectId: "mixat-99b39",
  storageBucket: "mixat-99b39.firebasestorage.app",
  messagingSenderId: "55410923593",
  appId: "1:55410923593:web:5e6ef71d38111d9eec0798"
};

// الإيميل وكلمة السر للأدمن (قبل تفعيل Firebase)
const ADMIN_LOCAL_CREDENTIALS = {
  email:    "admin@mixat.com",
  password: "mixat@2024"
};

// هل Firebase مفعل؟
const IS_FIREBASE_CONFIGURED = true;

// ==========================================
// تهيئة Firebase إذا كان مفعلاً
// ==========================================
let db = null;
let auth = null;
let firebaseApp = null;

function initFirebase() {
  if (!IS_FIREBASE_CONFIGURED) {
    console.info("🔶 ميكسات: تعمل في وضع localStorage. فعّل Firebase للحصول على مزامنة سحابية.");
    return false;
  }
  try {
    firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    db   = firebase.firestore();
    auth = firebase.auth();
    // تجاهل كاش محلي قديم — المصدر الوحيد للحقيقة هو السيرفر
    db.settings({ ignoreUndefinedProperties: true });
    console.info("✅ ميكسات: Firebase متصل بنجاح!");
    return true;
  } catch (e) {
    console.error("❌ خطأ في Firebase:", e);
    db = null;
    auth = null;
    return false;
  }
}

function isFirebaseReady() {
  return IS_FIREBASE_CONFIGURED && !!db;
}

/** عند تفعيل Firebase لازم الكتابة تتم على السيرفر — ممنوع الحفظ المحلي الصامت */
function assertFirebaseWritable() {
  if (IS_FIREBASE_CONFIGURED && !db) {
    throw new Error('Firebase مش متصل. حدّث الصفحة أو راجع الاتصال ثم حاول مرة تانية.');
  }
}

function readLocalJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function writeLocalJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Helper: Timeout wrapper for promises to prevent UI hangs
function withTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), ms))
  ]);
}

// ==========================================
// طبقة البيانات - تعمل مع Firebase أو localStorage
// ==========================================
function normalizeCategories(categories) {
  const defaults = DEFAULT_MENU_DATA.categories || [];
  const defaultMap = new Map(defaults.map(cat => [cat.id, cat]));

  return (Array.isArray(categories) ? categories : []).map(cat => {
    const defaultCat = defaultMap.get(cat.id) || defaultMap.get(cat.slug) || {};
    return {
      ...defaultCat,
      ...cat,
      image: cat.image || defaultCat.image || null,
      icon: cat.icon || defaultCat.icon || '🍽️',
      name: cat.name || defaultCat.name || 'غير مسمى',
    };
  });
}

function sanitizeOffers(offers) {
  const legacyIds = new Set(['o1', 'o2']);
  const legacyTitles = new Set(['عرض الترحيب', 'وجبة الشيخ']);

  return (Array.isArray(offers) ? offers : []).filter(offer => {
    if (!offer) return false;
    const idOk = !legacyIds.has(String(offer.id));
    const titleOk = !legacyTitles.has(String(offer.title || '').trim());
    return idOk && titleOk;
  });
}

const DataStore = {
  // --------- قراءة ---------
  async getSettings() {
    if (isFirebaseReady()) {
      try {
        const doc = await withTimeout(
          db.collection("settings").doc("general").get({ source: "server" }),
          8000
        );
        if (doc.exists) {
          writeLocalJson("mixat_settings", doc.data());
          return doc.data();
        }
        // مستند مش موجود على السيرفر → إعدادات افتراضية (مش كاش جهاز تاني)
        return DEFAULT_SETTINGS;
      } catch (e) {
        console.error("❌ Firestore getSettings failed:", e.message);
        const cached = readLocalJson("mixat_settings", null);
        if (cached) return cached;
        throw e;
      }
    }
    return readLocalJson("mixat_settings", DEFAULT_SETTINGS);
  },

  async getMenuItems() {
    if (isFirebaseReady()) {
      try {
        // source: server يمنع الاعتماد على كاش قديم ويخلي كل الأجهزة تشوف نفس البيانات
        const snap = await withTimeout(
          db.collection("menu_items").get({ source: "server" }),
          10000
        );
        const fsItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        writeLocalJson("mixat_menu_items", fsItems);
        // حتى لو فاضي: دي الحقيقة من السيرفر — ممنوع الرجوع للـ defaults/local لوحدها
        return fsItems;
      } catch (e) {
        console.error("❌ Firestore getMenuItems failed:", e.message);
        const localItems = readLocalJson("mixat_menu_items", []);
        if (Array.isArray(localItems) && localItems.length > 0) {
          console.warn("⚠️ استخدام نسخة محلية مؤقتة بسبب فشل الاتصال");
          return localItems;
        }
        throw e;
      }
    }
    // وضع بدون Firebase فقط
    const localItems = readLocalJson("mixat_menu_items", []);
    return localItems.length > 0 ? localItems : DEFAULT_MENU_DATA.items;
  },

  async getCategories() {
    if (isFirebaseReady()) {
      try {
        const doc = await withTimeout(
          db.collection("settings").doc("categories").get({ source: "server" }),
          8000
        );
        if (doc.exists && Array.isArray(doc.data().list) && doc.data().list.length > 0) {
          const normalized = normalizeCategories(doc.data().list);
          writeLocalJson("mixat_categories", normalized);
          return normalized;
        }
        // مستند فاضي أو مش موجود → الفئات الافتراضية (مش قائمة فاضية)
        const fallback = normalizeCategories(DEFAULT_MENU_DATA.categories);
        writeLocalJson("mixat_categories", fallback);
        return fallback;
      } catch (e) {
        console.error("❌ Firestore getCategories failed:", e.message);
        const stored = readLocalJson("mixat_categories", null);
        if (Array.isArray(stored) && stored.length) return normalizeCategories(stored);
        return normalizeCategories(DEFAULT_MENU_DATA.categories);
      }
    }

    const stored = readLocalJson("mixat_categories", null);
    const categories = Array.isArray(stored) && stored.length ? stored : DEFAULT_MENU_DATA.categories;
    const normalized = normalizeCategories(categories);
    writeLocalJson("mixat_categories", normalized);
    return normalized;
  },

  async getOffers() {
    if (isFirebaseReady()) {
      try {
        const snap = await withTimeout(
          db.collection("offers").where("active", "==", true).get({ source: "server" }),
          8000
        );
        const offers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const filtered = sanitizeOffers(offers);
        writeLocalJson("mixat_offers", filtered);
        return filtered;
      } catch (e) {
        console.error("❌ Firestore getOffers failed:", e.message);
        const stored = readLocalJson("mixat_offers", []);
        if (Array.isArray(stored)) return sanitizeOffers(stored);
        throw e;
      }
    }

    const stored = readLocalJson("mixat_offers", []);
    return sanitizeOffers(Array.isArray(stored) ? stored : []);
  },

  /** كل العروض (نشطة وغير نشطة) — للوحة الأدمن */
  async getAllOffers() {
    if (isFirebaseReady()) {
      try {
        const snap = await withTimeout(
          db.collection("offers").get({ source: "server" }),
          8000
        );
        return sanitizeOffers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("❌ Firestore getAllOffers failed:", e.message);
        throw e;
      }
    }
    return sanitizeOffers(readLocalJson("mixat_offers", []));
  },

  async getReviews() {
    if (isFirebaseReady()) {
      try {
        const snap = await withTimeout(
          db.collection("reviews").where("approved", "==", true).get({ source: "server" }),
          8000
        );
        const reviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        writeLocalJson("mixat_reviews", reviews);
        return reviews;
      } catch (e) {
        console.error("❌ Firestore getReviews failed:", e.message);
        return readLocalJson("mixat_reviews", DEFAULT_REVIEWS);
      }
    }
    return readLocalJson("mixat_reviews", DEFAULT_REVIEWS);
  },

  // --------- كتابة ---------
  async saveSettings(data) {
    assertFirebaseWritable();
    if (isFirebaseReady()) {
      try {
        await withTimeout(db.collection("settings").doc("general").set(data, { merge: true }), 15000);
        console.log('✅ Settings saved to Firestore');
      } catch (e) {
        console.error('❌ Firestore saveSettings FAILED:', e.message);
        throw new Error('فشل حفظ الإعدادات على السيرفر: ' + e.message);
      }
    }
    writeLocalJson("mixat_settings", data);
  },

  async saveMenuItem(item) {
    assertFirebaseWritable();
    let savedId = item.id;
    if (isFirebaseReady()) {
      try {
        const { id, ...rest } = item;
        if (!id || id.startsWith("new_")) {
          const ref = await withTimeout(db.collection("menu_items").add(rest), 15000);
          savedId = ref.id;
        } else {
          await withTimeout(db.collection("menu_items").doc(id).set(rest, { merge: true }), 15000);
          savedId = id;
        }
        console.log('✅ Menu item saved to Firestore:', savedId);
      } catch (e) {
        console.error('❌ Firestore saveMenuItem FAILED:', e.message, e);
        throw new Error('فشل حفظ الصنف على السيرفر: ' + e.message);
      }
    }
    // تحديث الكاش المحلي فقط بعد نجاح السيرفر (أو في وضع بدون Firebase)
    item.id = savedId;
    let items = readLocalJson("mixat_menu_items", []);
    if (!Array.isArray(items)) items = [];
    // ممنوع حقن DEFAULT_MENU_DATA هنا — ده كان بيخلي جهاز الأدمن يشوف منيو كامل والجهاز التاني لا
    const idx = items.findIndex(i => i.id === item.id);
    if (idx >= 0) items[idx] = item;
    else items.push(item);
    writeLocalJson("mixat_menu_items", items);
    return savedId;
  },

  async deleteMenuItem(id) {
    assertFirebaseWritable();
    if (isFirebaseReady()) {
      try {
        await withTimeout(db.collection("menu_items").doc(id).delete(), 15000);
        console.log('✅ Menu item deleted from Firestore:', id);
      } catch (e) {
        console.error('❌ Firestore deleteMenuItem FAILED:', e.message);
        throw new Error('فشل حذف الصنف من السيرفر: ' + e.message);
      }
    }
    let items = readLocalJson("mixat_menu_items", []);
    if (!Array.isArray(items)) items = [];
    items = items.filter(i => i.id !== id);
    writeLocalJson("mixat_menu_items", items);
  },

  // --------- إدارة سلة المستخدم بالإيميل ---------
  async getUserCart(email) {
    if (!email) return [];
    const cleanEmail = email.trim().toLowerCase();
    const localKey = `mixat_cart_${cleanEmail}`;

    if (isFirebaseReady()) {
      try {
        const doc = await withTimeout(db.collection("carts").doc(cleanEmail).get({ source: "server" }), 6000);
        if (doc.exists && doc.data() && Array.isArray(doc.data().items)) {
          const items = doc.data().items;
          writeLocalJson(localKey, items);
          return items;
        }
      } catch (e) {
        console.error("Error fetching user cart from Firestore:", e);
      }
    }
    return readLocalJson(localKey, []);
  },

  async saveUserCart(email, cartItems) {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    const localKey = `mixat_cart_${cleanEmail}`;
    writeLocalJson(localKey, cartItems);

    if (isFirebaseReady()) {
      try {
        await withTimeout(db.collection("carts").doc(cleanEmail).set({
          email: cleanEmail,
          items: cartItems,
          updatedAt: new Date().toISOString()
        }, { merge: true }), 10000);
      } catch (e) {
        console.error("Error saving user cart to Firestore:", e);
      }
    }
  },

  async saveOffer(offer) {
    assertFirebaseWritable();
    if (isFirebaseReady()) {
      try {
        const { id, ...rest } = offer;
        if (id && id.startsWith("new_")) {
          const ref = await withTimeout(db.collection("offers").add(rest), 15000);
          offer.id = ref.id;
        } else {
          await withTimeout(db.collection("offers").doc(id).set(rest, { merge: true }), 15000);
        }
        console.log('✅ Offer saved to Firestore:', offer.id);
      } catch (e) {
        console.error('❌ Firestore saveOffer FAILED:', e.message);
        throw new Error('فشل حفظ العرض على السيرفر: ' + e.message);
      }
    }
    let offers = readLocalJson("mixat_offers", []);
    if (!Array.isArray(offers)) offers = [];
    const idx = offers.findIndex(o => o.id === offer.id);
    if (idx >= 0) offers[idx] = offer;
    else offers.push(offer);
    writeLocalJson("mixat_offers", sanitizeOffers(offers));
  },

  async deleteOffer(id) {
    assertFirebaseWritable();
    if (isFirebaseReady()) {
      try {
        await withTimeout(db.collection("offers").doc(id).delete(), 15000);
        console.log('✅ Offer deleted from Firestore:', id);
      } catch (e) {
        console.error('❌ Firestore deleteOffer FAILED:', e.message);
        throw new Error('فشل حذف العرض من السيرفر: ' + e.message);
      }
    }
    const offers = sanitizeOffers(readLocalJson("mixat_offers", [])).filter(o => o.id !== id);
    writeLocalJson("mixat_offers", offers);
  },

  async saveReview(review) {
    if (isFirebaseReady()) {
      await db.collection("reviews").add({ ...review, date: new Date().toISOString() });
    } else {
      const reviews = readLocalJson("mixat_reviews", []);
      reviews.push({ ...review, id: "rv_" + Date.now(), date: new Date().toISOString(), approved: false });
      writeLocalJson("mixat_reviews", reviews);
    }
  },

  async getAllReviews() {
    if (isFirebaseReady()) {
      const snap = await db.collection("reviews").orderBy("date", "desc").get({ source: "server" });
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    return readLocalJson("mixat_reviews", DEFAULT_REVIEWS);
  },

  async updateReviewApproval(id, approved) {
    assertFirebaseWritable();
    if (isFirebaseReady()) {
      await db.collection("reviews").doc(id).update({ approved });
    } else {
      const reviews = await DataStore.getAllReviews();
      const idx = reviews.findIndex(r => r.id === id);
      if (idx >= 0) reviews[idx].approved = approved;
      writeLocalJson("mixat_reviews", reviews);
    }
  },

  async deleteReview(id) {
    assertFirebaseWritable();
    if (isFirebaseReady()) {
      try {
        await withTimeout(db.collection("reviews").doc(id).delete(), 15000);
        console.log('✅ Review deleted from Firestore:', id);
      } catch (e) {
        console.error('❌ Firestore deleteReview FAILED:', e.message);
        throw new Error('فشل حذف التقييم من السيرفر: ' + e.message);
      }
    }
    const reviews = readLocalJson("mixat_reviews", []).filter(r => r.id !== id);
    writeLocalJson("mixat_reviews", reviews);
  },

  async saveCategories(categories) {
    assertFirebaseWritable();
    if (isFirebaseReady() && (!auth || !auth.currentUser)) {
      throw new Error('لازم تكون مسجّل دخول كأدمن عشان تحفظ. اعمل تسجيل خروج وادخل تاني.');
    }
    const normalized = normalizeCategories(categories).map(cat => ({
      id: String(cat.id || ''),
      name: String(cat.name || 'غير مسمى'),
      icon: String(cat.icon || '🍽️'),
      image: cat.image || null,
    }));
    if (!normalized.length) {
      throw new Error('مفيش فئات للحفظ');
    }
    if (isFirebaseReady()) {
      try {
        await withTimeout(
          db.collection("settings").doc("categories").set({ list: normalized }),
          15000
        );
        console.log('✅ Categories saved to Firestore');
      } catch (e) {
        console.error('❌ Firestore saveCategories FAILED:', e.message);
        const msg = (e && e.code === 'permission-denied')
          ? 'مرفوض من قواعد Firebase — تأكد إنك مسجّل دخول كأدمن وإن القواعد منشورة'
          : (e.message || String(e));
        throw new Error('فشل حفظ الفئات على السيرفر: ' + msg);
      }
    }
    writeLocalJson("mixat_categories", normalized);
    return normalized;
  },

  // --------- أدمن Auth ---------
  async adminLogin(email, password) {
    if (IS_FIREBASE_CONFIGURED && auth) {
      await auth.signInWithEmailAndPassword(email, password);
      return true;
    }
    // وضع localStorage
    if (email === ADMIN_LOCAL_CREDENTIALS.email && password === ADMIN_LOCAL_CREDENTIALS.password) {
      localStorage.setItem("mixat_admin_logged", "true");
      return true;
    }
    throw new Error("بيانات الدخول غير صحيحة");
  },

  async adminLogout() {
    if (IS_FIREBASE_CONFIGURED && auth) await auth.signOut();
    localStorage.removeItem("mixat_admin_logged");
  },

  isAdminLoggedIn() {
    if (IS_FIREBASE_CONFIGURED && auth) return auth.currentUser !== null;
    return localStorage.getItem("mixat_admin_logged") === "true";
  },
};

function subscribeToLiveData({
  onMenuChange,
  onOffersChange,
  onSettingsChange,
  onCategoriesChange,
  onReviewsChange,
} = {}) {
  if (!isFirebaseReady()) return () => {};

  const unsubscribers = [];

  const watchCollection = (collectionName, callback, queryFn) => {
    let ref = db.collection(collectionName);
    if (typeof queryFn === 'function') ref = queryFn(ref);

    const unsubscribe = ref.onSnapshot(
      { includeMetadataChanges: false },
      snapshot => {
        // تجاهل التحديثات من الكاش المحلي لو فيه بيانات معلقة من السيرفر
        if (snapshot.metadata && snapshot.metadata.fromCache && snapshot.empty) {
          return;
        }

        let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const cacheKey = {
          menu_items: 'mixat_menu_items',
          offers: 'mixat_offers',
          reviews: 'mixat_reviews',
        }[collectionName] || `mixat_${collectionName}`;

        if (collectionName === 'offers') {
          items = sanitizeOffers(items);
        }

        // القائمة الفاضية من السيرفر = منيو فاضي (مش defaults محلية)
        // ده يمنع جهاز يشوف تعديل وجهاز تاني يشوف menu-data.js القديم
        writeLocalJson(cacheKey, items);
        if (typeof callback === 'function') callback(items);
      },
      error => {
        console.error(`❌ Firestore live sync error (${collectionName}):`, error?.message || error);
      }
    );

    unsubscribers.push(unsubscribe);
  };

  watchCollection('menu_items', onMenuChange);
  watchCollection('offers', onOffersChange, ref => ref.where('active', '==', true));
  watchCollection('reviews', onReviewsChange, ref => ref.where('approved', '==', true));

  const unsubSettings = db.doc('settings/general').onSnapshot(
    doc => {
      const settings = doc.exists ? doc.data() : DEFAULT_SETTINGS;
      writeLocalJson('mixat_settings', settings);
      if (typeof onSettingsChange === 'function') onSettingsChange(settings);
    },
    error => {
      console.error('❌ Firestore live sync error (settings/general):', error?.message || error);
    }
  );

  const unsubCategories = db.doc('settings/categories').onSnapshot(
    doc => {
      const raw = doc.exists && Array.isArray(doc.data().list) ? doc.data().list : null;
      // قائمة فاضية على السيرفر مش معناها امسح الفئات من الواجهة
      const list = raw && raw.length > 0 ? raw : DEFAULT_MENU_DATA.categories;
      const categories = normalizeCategories(list);
      writeLocalJson('mixat_categories', categories);
      if (typeof onCategoriesChange === 'function') onCategoriesChange(categories);
    },
    error => {
      console.error('❌ Firestore live sync error (settings/categories):', error?.message || error);
    }
  );

  unsubscribers.push(unsubSettings, unsubCategories);

  return () => unsubscribers.forEach(fn => fn && fn());
}

// ==========================================
// رفع البيانات الافتراضية لـ Firestore (Seed)
// يُستخدم مرة واحدة لملء قاعدة البيانات الفاضية
// ==========================================
async function seedFirestore() {
  if (!isFirebaseReady()) {
    throw new Error('Firebase مش متصل!');
  }
  if (!auth || !auth.currentUser) {
    throw new Error('لازم تسجل دخول كأدمن الأول!');
  }

  const results = { items: 0, categories: false, settings: false, reviews: 0 };

  // 1. رفع أصناف المنيو
  console.log('📦 جاري رفع أصناف المنيو...');
  const menuItems = DEFAULT_MENU_DATA.items;
  const batchSize = 400;
  for (let i = 0; i < menuItems.length; i += batchSize) {
    const batch = db.batch();
    const chunk = menuItems.slice(i, i + batchSize);
    for (const item of chunk) {
      const { id, ...rest } = item;
      batch.set(db.collection('menu_items').doc(id), rest);
      results.items++;
    }
    await batch.commit();
  }
  writeLocalJson('mixat_menu_items', menuItems.map(item => ({ ...item })));
  console.log(`✅ تم رفع ${results.items} صنف`);

  // 2. رفع الفئات
  console.log('📦 جاري رفع الفئات...');
  const categories = normalizeCategories(DEFAULT_MENU_DATA.categories);
  await db.collection('settings').doc('categories').set({ list: categories });
  writeLocalJson('mixat_categories', categories);
  results.categories = true;
  console.log('✅ تم رفع الفئات');

  // 3. رفع الإعدادات
  console.log('📦 جاري رفع الإعدادات...');
  await db.collection('settings').doc('general').set(DEFAULT_SETTINGS);
  writeLocalJson('mixat_settings', DEFAULT_SETTINGS);
  results.settings = true;
  console.log('✅ تم رفع الإعدادات');

  // 4. رفع التقييمات الافتراضية
  console.log('📦 جاري رفع التقييمات...');
  for (const review of DEFAULT_REVIEWS) {
    const { id, ...rest } = review;
    await db.collection('reviews').doc(id).set(rest);
    results.reviews++;
  }
  writeLocalJson('mixat_reviews', DEFAULT_REVIEWS.map(r => ({ ...r })));
  console.log(`✅ تم رفع ${results.reviews} تقييم`);

  console.log('🎉 تم ملء قاعدة البيانات بنجاح!', results);
  return results;
}

/** لو المنيو أو الفئات فاضية على السيرفر، ارفع البيانات الافتراضية */
async function ensureMenuSeeded() {
  if (!isFirebaseReady() || !auth || !auth.currentUser) return false;

  const [menuSnap, catDoc] = await Promise.all([
    withTimeout(db.collection('menu_items').limit(1).get({ source: 'server' }), 10000),
    withTimeout(db.collection('settings').doc('categories').get({ source: 'server' }), 10000),
  ]);

  const menuEmpty = menuSnap.empty;
  const catsEmpty = !catDoc.exists
    || !Array.isArray(catDoc.data().list)
    || catDoc.data().list.length === 0;

  if (!menuEmpty && !catsEmpty) return false;

  // لو المنيو فاضي بالكامل → seed كامل
  if (menuEmpty) {
    console.warn('📦 Firestore فاضي — جاري الرفع التلقائي...');
    await seedFirestore();
    return true;
  }

  // المنيو موجود بس الفئات ناقصة → ارفع الفئات فقط (من غير ما تمسح الأصناف)
  if (catsEmpty) {
    console.warn('📦 الفئات فاضية على Firestore — جاري رفع الفئات الافتراضية...');
    const categories = normalizeCategories(DEFAULT_MENU_DATA.categories);
    await db.collection('settings').doc('categories').set({ list: categories });
    writeLocalJson('mixat_categories', categories);
    return true;
  }

  return false;
}
