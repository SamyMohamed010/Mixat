// ==========================================
// ميكسات - بيانات المنيو الافتراضية
// يمكن تعديل هذه البيانات من لوحة التحكم
// ==========================================

const DEFAULT_MENU_DATA = {
  categories: [
    { id: 'crepe',   name: 'الكريب',      icon: '🥙', image: 'assets/images/crepe.png' },
    { id: 'hawashi', name: 'الحواوشي',    icon: '🥪', image: 'assets/images/hawashi.png' },
    { id: 'takeaway',name: 'التيك اواي',  icon: '🍗', image: null },
    { id: 'rice',    name: 'الأرز',        icon: '🍚', image: null },
    { id: 'mixat',   name: 'الميكسات',    icon: '⭐', image: null },
    { id: 'pasta',   name: 'المكرونات',   icon: '🍝', image: 'assets/images/pasta.png' },
  ],
  items: [
    // ===== الكريب =====
    { id: 'c1',  category: 'crepe',    name: 'كريب كوردن بلو',      price: 55, description: 'كريب بحشوة كوردن بلو كريمي مع جبنة موزاريلا', available: true, bestSeller: true },
    { id: 'c2',  category: 'crepe',    name: 'كريب زنجر حار',       price: 50, description: 'كريب بفيليه فراخ مقلي حار مع صوص خاص', available: true, bestSeller: false },
    { id: 'c3',  category: 'crepe',    name: 'كريب بانية',           price: 45, description: 'كريب بفيليه فراخ بانية مقرمش', available: true, bestSeller: false },
    { id: 'c4',  category: 'crepe',    name: 'كريب استريس',          price: 45, description: 'كريب بصدر فراخ مشوي مع صوص استريس', available: true, bestSeller: false },
    { id: 'c5',  category: 'crepe',    name: 'كريب شيش',             price: 50, description: 'كريب بشيش طاووق مشوي مع خضروات وصوص', available: true, bestSeller: false },
    { id: 'c6',  category: 'crepe',    name: 'كريب فراخ',            price: 45, description: 'كريب بفراخ مشوية مع خضروات طازجة', available: true, bestSeller: false },
    { id: 'c7',  category: 'crepe',    name: 'كريب هوت دوج',        price: 40, description: 'كريب بهوت دوج مع جبنة وصوص مميز', available: true, bestSeller: false },
    { id: 'c8',  category: 'crepe',    name: 'كريب سجق',             price: 40, description: 'كريب بسجق مشوي مع خضروات وصوص', available: true, bestSeller: false },
    { id: 'c9',  category: 'crepe',    name: 'كريب ميكسات لحمة',    price: 65, description: 'كريب بخلطة اللحمة الخاصة بميكسات', available: true, bestSeller: true },
    { id: 'c10', category: 'crepe',    name: 'كريب ميكسات فراخ',    price: 60, description: 'كريب بخلطة الفراخ الخاصة بميكسات', available: true, bestSeller: false },
    { id: 'c11', category: 'crepe',    name: 'كريب بطاطس',           price: 35, description: 'كريب بطاطس مقلية مع جبنة وصوص', available: true, bestSeller: false },
    { id: 'c12', category: 'crepe',    name: 'كريب برجر',            price: 55, description: 'كريب بباتي برجر لحم مع خس وطماطم وصوص', available: true, bestSeller: false },
    { id: 'c13', category: 'crepe',    name: 'كريب بانية فريش',     price: 50, description: 'كريب بفيليه فراخ فريش مقلي مقرمش', available: true, bestSeller: false },

    // ===== الحواوشي =====
    { id: 'h1',  category: 'hawashi',  name: 'حواوشي عادي',          price: 35, description: 'حواوشي لحمة مفرومة متبلة بالتوابل المصرية الأصيلة', available: true, bestSeller: true },
    { id: 'h2',  category: 'hawashi',  name: 'حواوشي شاورما',        price: 45, description: 'حواوشي بشاورما فراخ مع صوص الثوم والخضروات', available: true, bestSeller: false },
    { id: 'h3',  category: 'hawashi',  name: 'حواوشي مونتيريلا',     price: 50, description: 'حواوشي لحمة مع جبنة موزاريلا تتمد على النار', available: true, bestSeller: true },
    { id: 'h4',  category: 'hawashi',  name: 'حواوشي سجق',           price: 40, description: 'حواوشي بسجق مشوي مع بصل وفلفل', available: true, bestSeller: false },
    { id: 'h5',  category: 'hawashi',  name: 'حواوشي سجق مدخن',     price: 45, description: 'حواوشي بسجق مدخن بنكهة مميزة', available: true, bestSeller: false },

    // ===== التيك اواي =====
    { id: 't1',  category: 'takeaway', name: 'كبدة',                  price: 30, description: 'كبدة مشوية على الفحم بالتوابل', available: true, bestSeller: false },
    { id: 't2',  category: 'takeaway', name: 'سجق',                   price: 30, description: 'سجق مشوي طازج', available: true, bestSeller: false },
    { id: 't3',  category: 'takeaway', name: 'سجق مدخن',             price: 35, description: 'سجق مدخن بنكهة مميزة', available: true, bestSeller: false },
    { id: 't4',  category: 'takeaway', name: 'بانية فريش',            price: 40, description: 'فيليه فراخ فريش مقلي مقرمش', available: true, bestSeller: true },
    { id: 't5',  category: 'takeaway', name: 'استريس',                price: 35, description: 'صدر فراخ مشوي مع صوص استريس', available: true, bestSeller: false },
    { id: 't6',  category: 'takeaway', name: 'كفتة',                  price: 40, description: 'كفتة لحمة مشوية على الفحم', available: true, bestSeller: false },
    { id: 't7',  category: 'takeaway', name: 'هوت دوج',               price: 35, description: 'هوت دوج مشوي مع خبز طري', available: true, bestSeller: false },
    { id: 't8',  category: 'takeaway', name: 'برجر',                  price: 50, description: 'باتي برجر لحم مع خس وطماطم وصوص', available: true, bestSeller: false },
    { id: 't9',  category: 'takeaway', name: 'برجر بيض',              price: 55, description: 'برجر لحم مع بيضة مقلية', available: true, bestSeller: false },
    { id: 't10', category: 'takeaway', name: 'برجر جبنة',             price: 55, description: 'برجر لحم مع جبنة شيدر', available: true, bestSeller: true },
    { id: 't11', category: 'takeaway', name: 'برجر فراخ',             price: 50, description: 'باتي فراخ مع خس وطماطم وصوص', available: true, bestSeller: false },
    { id: 't12', category: 'takeaway', name: 'برجر جامبو',            price: 65, description: 'برجر ضخم بباتي مزدوج مع جبنة وبيض', available: true, bestSeller: false },
    { id: 't13', category: 'takeaway', name: 'شاورما',                price: 50, description: 'شاورما فراخ بصوص الثوم والخضروات', available: true, bestSeller: false },
    { id: 't14', category: 'takeaway', name: 'بطاطس',                 price: 25, description: 'بطاطس مقلية طازجة مقرمشة', available: true, bestSeller: false },

    // ===== الأرز =====
    { id: 'r1',  category: 'rice',     name: 'أرز + كبدة',            price: 45, description: 'أرز ابيض مع كبدة مشوية', available: true, bestSeller: false },
    { id: 'r2',  category: 'rice',     name: 'أرز + سجق',             price: 45, description: 'أرز أبيض مع سجق مشوي', available: true, bestSeller: false },
    { id: 'r3',  category: 'rice',     name: 'أرز + سجق مدخن',       price: 50, description: 'أرز أبيض مع سجق مدخن', available: true, bestSeller: false },
    { id: 'r4',  category: 'rice',     name: 'أرز + شاورما',           price: 60, description: 'أرز أبيض مع شاورما فراخ وصوص الثوم', available: true, bestSeller: true },
    { id: 'r5',  category: 'rice',     name: 'أرز + كفتة',            price: 55, description: 'أرز أبيض مع كفتة لحمة مشوية', available: true, bestSeller: false },
    { id: 'r6',  category: 'rice',     name: 'أرز + بانية فريش',     price: 55, description: 'أرز أبيض مع فيليه فراخ بانية', available: true, bestSeller: false },
    { id: 'r7',  category: 'rice',     name: 'أرز + كبدة + سجق',     price: 60, description: 'أرز أبيض مع كبدة وسجق مشويين', available: true, bestSeller: false },
    { id: 'r8',  category: 'rice',     name: 'أرز + كفتة + كبدة',    price: 65, description: 'أرز أبيض مع كفتة لحمة وكبدة', available: true, bestSeller: false },
    { id: 'r9',  category: 'rice',     name: 'أرز + شاورما + بانية', price: 70, description: 'أرز أبيض مع شاورما وبانية فريش', available: true, bestSeller: false },

    // ===== الميكسات =====
    { id: 'm1',  category: 'mixat',    name: 'كوردن + بانية',         price: 75, description: 'خلطة كوردن بلو مع بانية فريش بصوص خاص', available: true, bestSeller: true },
    { id: 'm2',  category: 'mixat',    name: 'هوت دوج + استريس',     price: 65, description: 'خلطة هوت دوج مع استريس بطريقة ميكسات', available: true, bestSeller: false },
    { id: 'm3',  category: 'mixat',    name: 'سوريس + شيش',           price: 70, description: 'خلطة سجق مع شيش طاووق بصوص خاص', available: true, bestSeller: false },
    { id: 'm4',  category: 'mixat',    name: 'سوريس + بانية',         price: 70, description: 'خلطة سجق مع بانية فريش', available: true, bestSeller: false },
    { id: 'm5',  category: 'mixat',    name: 'كوردن + استريس',        price: 75, description: 'خلطة كوردن بلو مع استريس بصوص كريمي', available: true, bestSeller: false },
    { id: 'm6',  category: 'mixat',    name: 'ميكسات فراخ',           price: 80, description: 'الخلطة الخاصة من الفراخ بصوص ميكسات السري', available: true, bestSeller: true },
    { id: 'm7',  category: 'mixat',    name: 'ميكسات لحم',            price: 85, description: 'الخلطة الخاصة من اللحم بصوص ميكسات السري', available: true, bestSeller: false },
    { id: 'm8',  category: 'mixat',    name: 'ميكسات الشيخ',          price: 90, description: 'أكبر خلطة من أصناف متعددة - وجبة الشيخ', available: true, bestSeller: false },
    { id: 'm9',  category: 'mixat',    name: 'ميكسات ميكسات',         price: 95, description: 'الخلطة الأسطورية - كل حاجة في حاجة واحدة', available: true, bestSeller: true },

    // ===== المكرونات =====
    { id: 'p1',  category: 'pasta',    name: 'مكرونة + كفتة',         price: 50, description: 'مكرونة مع كفتة لحمة بصوص البشاميل', available: true, bestSeller: false },
    { id: 'p2',  category: 'pasta',    name: 'مكرونة + شاورما',       price: 60, description: 'مكرونة مع شاورما فراخ بصوص الكريمة', available: true, bestSeller: true },
    { id: 'p3',  category: 'pasta',    name: 'مكرونة + بانية فريش',  price: 55, description: 'مكرونة مع بانية فريش بصوص ميكسات', available: true, bestSeller: false },
    { id: 'p4',  category: 'pasta',    name: 'مكرونة + كبدة',         price: 50, description: 'مكرونة مع كبدة مشوية بصوص الطماطم', available: true, bestSeller: false },
    { id: 'p5',  category: 'pasta',    name: 'مكرونة + سجق مدخن',   price: 55, description: 'مكرونة مع سجق مدخن بصوص الكريمة', available: true, bestSeller: false },
    { id: 'p6',  category: 'pasta',    name: 'مكرونة + سجق عادي',   price: 50, description: 'مكرونة مع سجق مشوي بصوص الطماطم', available: true, bestSeller: false },
    { id: 'p7',  category: 'pasta',    name: 'مكرونة + ميكسات',      price: 70, description: 'مكرونة مع الخلطة الخاصة بميكسات', available: true, bestSeller: false },
    { id: 'p8',  category: 'pasta',    name: 'مكرونة + فراخ',         price: 60, description: 'مكرونة مع فراخ مشوية بصوص الكريمة', available: true, bestSeller: false },
  ]
};

// بيانات التقييمات الافتراضية
const DEFAULT_REVIEWS = [
  { id: 'rv1', name: 'أحمد محمد',    rating: 5, comment: 'أحسن كريب أكلته في حياتي! الطعم رهيب والكمية كويسة جداً', date: '2024-01-15', approved: true },
  { id: 'rv2', name: 'سارة علي',     rating: 5, comment: 'الحواوشي ده جنة! اللحمة طازجة والتتبيل مختلف. هنرجع تاني بكرة', date: '2024-01-20', approved: true },
  { id: 'rv3', name: 'محمد خالد',   rating: 4, comment: 'ميكسات ميكسات كان تجربة مختلفة، الصوص الخاص بتاعهم مميز فعلاً', date: '2024-01-25', approved: true },
  { id: 'rv4', name: 'نورا حسن',    rating: 5, comment: 'المكرونة بالشاورما ده أكل من التاني، سريع في التوصيل والتغليف أنيق', date: '2024-02-01', approved: true },
  { id: 'rv5', name: 'عمر إبراهيم', rating: 5, comment: 'من زمان ما لاقيت أكل بالسعر ده والجودة دي. ميكسات هتبقى وجهتي الأولى', date: '2024-02-10', approved: true },
];

// إعدادات المحل الافتراضية
const DEFAULT_SETTINGS = {
  shopName: 'ميكسات',
  tagline: 'كريب · كبدة · حواوشي · مكرونة',
  whatsapp: '201145843805',
  phone: '01145843805',
  address: 'الخصوص - بالقرب من مدرسة فتحي داود',
  workingHours: 'يومياً من 12 ظهراً حتى 2 صباحاً',
  deliveryAreas: 'نغطي جميع مناطق القاهرة والجيزة',
  aboutText: 'ميكسات مش بس أكل، ميكسات تجربة! بدأنا برؤية واحدة: إننا نقدم أحلى وأشهى الأكلات الشعبية المصرية بخلطات مميزة وبنكهة مختلفة تماماً. من أول كريب لأخر مكرونة، كل حاجة عندنا بتتعمل بحب وجودة.',
};

// عروض افتراضية
const DEFAULT_OFFERS = [
  { id: 'o1', title: 'عرض الترحيب', description: 'كريب ميكسات + مكرونة بالشاورما', originalPrice: 125, offerPrice: 99, validUntil: '2024-12-31', active: true },
  { id: 'o2', title: 'وجبة الشيخ', description: 'ميكسات الشيخ + بطاطس + مشروب', originalPrice: 115, offerPrice: 89, validUntil: '2024-12-31', active: true },
];
