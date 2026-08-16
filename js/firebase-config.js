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
    console.info("✅ ميكسات: Firebase متصل بنجاح!");
    return true;
  } catch (e) {
    console.error("❌ خطأ في Firebase:", e);
    return false;
  }
}

// Helper: Timeout wrapper for promises to prevent UI hangs
function withTimeout(promise, ms = 4000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), ms))
  ]);
}

// ==========================================
// طبقة البيانات - تعمل مع Firebase أو localStorage
// ==========================================
const DataStore = {
  // --------- قراءة ---------
  async getSettings() {
    if (IS_FIREBASE_CONFIGURED && db) {
      try {
        const doc = await withTimeout(db.collection("settings").doc("general").get(), 3000);
        if (doc.exists) return doc.data();
      } catch (e) {}
    }
    return JSON.parse(localStorage.getItem("mixat_settings") || JSON.stringify(DEFAULT_SETTINGS));
  },

  async getMenuItems() {
    let localItems = [];
    try {
      localItems = JSON.parse(localStorage.getItem("mixat_menu_items") || "[]");
    } catch (e) { localItems = []; }
    if (localItems.length === 0) localItems = DEFAULT_MENU_DATA.items;

    if (IS_FIREBASE_CONFIGURED && db) {
      try {
        const snap = await withTimeout(db.collection("menu_items").get(), 4000);
        if (!snap.empty) {
          const fsItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          // Merge default items with firestore items so default items exist alongside custom edited items
          const itemMap = new Map();
          localItems.forEach(i => itemMap.set(i.id, i));
          fsItems.forEach(i => itemMap.set(i.id, i));
          const merged = Array.from(itemMap.values());
          localStorage.setItem("mixat_menu_items", JSON.stringify(merged));
          return merged;
        }
      } catch (e) {
        console.warn("⚠️ Firestore getMenuItems fallback:", e.message);
      }
    }
    return localItems;
  },

  async getCategories() {
    if (IS_FIREBASE_CONFIGURED && db) {
      try {
        const doc = await withTimeout(db.collection("settings").doc("categories").get(), 3000);
        if (doc.exists && doc.data().list) return doc.data().list;
      } catch (e) {}
    }
    return JSON.parse(localStorage.getItem("mixat_categories") || JSON.stringify(DEFAULT_MENU_DATA.categories));
  },

  async getOffers() {
    if (IS_FIREBASE_CONFIGURED && db) {
      try {
        const snap = await withTimeout(db.collection("offers").where("active", "==", true).get(), 3000);
        if (!snap.empty) return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {}
    }
    return JSON.parse(localStorage.getItem("mixat_offers") || JSON.stringify(DEFAULT_OFFERS));
  },

  async getReviews() {
    if (IS_FIREBASE_CONFIGURED && db) {
      try {
        const snap = await withTimeout(db.collection("reviews").where("approved", "==", true).get(), 3000);
        if (!snap.empty) return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {}
    }
    return JSON.parse(localStorage.getItem("mixat_reviews") || JSON.stringify(DEFAULT_REVIEWS));
  },

  // --------- كتابة ---------
  async saveSettings(data) {
    if (IS_FIREBASE_CONFIGURED && db) {
      try {
        await withTimeout(db.collection("settings").doc("general").set(data, { merge: true }), 4000);
      } catch (e) {}
    }
    localStorage.setItem("mixat_settings", JSON.stringify(data));
  },

  async saveMenuItem(item) {
    let savedId = item.id;
    if (IS_FIREBASE_CONFIGURED && db) {
      try {
        const { id, ...rest } = item;
        if (!id || id.startsWith("new_")) {
          const ref = await withTimeout(db.collection("menu_items").add(rest), 4000);
          savedId = ref.id;
        } else {
          await withTimeout(db.collection("menu_items").doc(id).set(rest, { merge: true }), 4000);
          savedId = id;
        }
      } catch (e) {
        console.warn("⚠️ Firestore saveMenuItem timeout/error, saved locally:", e.message);
      }
    }
    // Sync with localStorage
    item.id = savedId;
    let items = [];
    try {
      items = JSON.parse(localStorage.getItem("mixat_menu_items") || "[]");
    } catch (e) { items = []; }
    if (items.length === 0) items = DEFAULT_MENU_DATA.items;

    const idx = items.findIndex(i => i.id === item.id);
    if (idx >= 0) items[idx] = item;
    else items.push(item);
    localStorage.setItem("mixat_menu_items", JSON.stringify(items));
    return savedId;
  },

  async deleteMenuItem(id) {
    if (IS_FIREBASE_CONFIGURED && db) {
      try {
        await withTimeout(db.collection("menu_items").doc(id).delete(), 4000);
      } catch (e) {}
    }
    let items = [];
    try {
      items = JSON.parse(localStorage.getItem("mixat_menu_items") || "[]");
    } catch (e) { items = []; }
    items = items.filter(i => i.id !== id);
    localStorage.setItem("mixat_menu_items", JSON.stringify(items));
  },

  // --------- إدارة سلة المستخدم بالإيميل ---------
  async getUserCart(email) {
    if (!email) return [];
    const cleanEmail = email.trim().toLowerCase();
    const localKey = `mixat_cart_${cleanEmail}`;

    if (IS_FIREBASE_CONFIGURED && db) {
      try {
        const doc = await withTimeout(db.collection("carts").doc(cleanEmail).get(), 3000);
        if (doc.exists && doc.data() && Array.isArray(doc.data().items)) {
          const items = doc.data().items;
          localStorage.setItem(localKey, JSON.stringify(items));
          return items;
        }
      } catch (e) {
        console.error("Error fetching user cart from Firestore:", e);
      }
    }
    return JSON.parse(localStorage.getItem(localKey) || "[]");
  },

  async saveUserCart(email, cartItems) {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    const localKey = `mixat_cart_${cleanEmail}`;
    localStorage.setItem(localKey, JSON.stringify(cartItems));

    if (IS_FIREBASE_CONFIGURED && db) {
      try {
        await withTimeout(db.collection("carts").doc(cleanEmail).set({
          email: cleanEmail,
          items: cartItems,
          updatedAt: new Date().toISOString()
        }, { merge: true }), 4000);
      } catch (e) {
        console.error("Error saving user cart to Firestore:", e);
      }
    }
  },

  async saveOffer(offer) {
    if (IS_FIREBASE_CONFIGURED && db) {
      const { id, ...rest } = offer;
      if (id && id.startsWith("new_")) {
        await db.collection("offers").add(rest);
      } else {
        await db.collection("offers").doc(id).set(rest, { merge: true });
      }
    } else {
      const offers = await DataStore.getOffers();
      const idx = offers.findIndex(o => o.id === offer.id);
      if (idx >= 0) offers[idx] = offer;
      else offers.push(offer);
      localStorage.setItem("mixat_offers", JSON.stringify(offers));
    }
  },

  async deleteOffer(id) {
    if (IS_FIREBASE_CONFIGURED && db) {
      await db.collection("offers").doc(id).delete();
    } else {
      const offers = (await DataStore.getOffers()).filter(o => o.id !== id);
      localStorage.setItem("mixat_offers", JSON.stringify(offers));
    }
  },

  async saveReview(review) {
    if (IS_FIREBASE_CONFIGURED && db) {
      await db.collection("reviews").add({ ...review, date: new Date().toISOString() });
    } else {
      const reviews = JSON.parse(localStorage.getItem("mixat_reviews") || "[]");
      reviews.push({ ...review, id: "rv_" + Date.now(), date: new Date().toISOString(), approved: false });
      localStorage.setItem("mixat_reviews", JSON.stringify(reviews));
    }
  },

  async getAllReviews() {
    if (IS_FIREBASE_CONFIGURED && db) {
      const snap = await db.collection("reviews").orderBy("date", "desc").get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    return JSON.parse(localStorage.getItem("mixat_reviews") || JSON.stringify(DEFAULT_REVIEWS));
  },

  async updateReviewApproval(id, approved) {
    if (IS_FIREBASE_CONFIGURED && db) {
      await db.collection("reviews").doc(id).update({ approved });
    } else {
      const reviews = await DataStore.getAllReviews();
      const idx = reviews.findIndex(r => r.id === id);
      if (idx >= 0) reviews[idx].approved = approved;
      localStorage.setItem("mixat_reviews", JSON.stringify(reviews));
    }
  },

  async saveCategories(categories) {
    if (IS_FIREBASE_CONFIGURED && db) {
      await db.collection("settings").doc("categories").set({ list: categories });
    }
    localStorage.setItem("mixat_categories", JSON.stringify(categories));
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
  if (!IS_FIREBASE_CONFIGURED || !db) return () => {};

  const unsubscribers = [];

  const watchCollection = (collectionName, callback, queryFn) => {
    let ref = db.collection(collectionName);
    if (typeof queryFn === 'function') ref = queryFn(ref);

    const unsubscribe = ref.onSnapshot(
      snapshot => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (typeof callback === 'function') callback(items);
        const cacheKey = {
          menu_items: 'mixat_menu_items',
          offers: 'mixat_offers',
          reviews: 'mixat_reviews',
        }[collectionName] || `mixat_${collectionName}`;
        localStorage.setItem(cacheKey, JSON.stringify(items));
      },
      error => {
        console.warn(`⚠️ Firestore live sync error (${collectionName}):`, error?.message || error);
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
      localStorage.setItem('mixat_settings', JSON.stringify(settings));
      if (typeof onSettingsChange === 'function') onSettingsChange(settings);
    },
    error => {
      console.warn('⚠️ Firestore live sync error (settings/general):', error?.message || error);
    }
  );

  const unsubCategories = db.doc('settings/categories').onSnapshot(
    doc => {
      const categories = doc.exists && Array.isArray(doc.data().list) ? doc.data().list : DEFAULT_MENU_DATA.categories;
      localStorage.setItem('mixat_categories', JSON.stringify(categories));
      if (typeof onCategoriesChange === 'function') onCategoriesChange(categories);
    },
    error => {
      console.warn('⚠️ Firestore live sync error (settings/categories):', error?.message || error);
    }
  );

  unsubscribers.push(unsubSettings, unsubCategories);

  return () => unsubscribers.forEach(fn => fn && fn());
}
