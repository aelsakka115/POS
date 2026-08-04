# Domain Document: Menu

**Type:** Domain Document
**Domain Classification:** Core Business Domain (Cafe Engine)
**Depends on:** RFC-001 (Context Map), RFC-002 (Event Catalog)
**Reference Template:** Domain-Sales.md
**Status:** **Approved — Business Rule changes require RFC-005 Change Management**

---

## 1. Domain Purpose

تعريف كل ما يُمكن بيعه أو تحضيره في الكافيه: المنتجات (Menu Items)، تصنيفها (Categories)، مكوّناتها ووصفاتها (Recipes)، وأي تخصيصات متاحة عليها (Modifiers)، بالإضافة لمعلومات التحضير التشغيلية (Preparation Information) التي يحتاجها Order Fulfillment لتوجيه كل منتج للمحطة الصحيحة. Menu هو **Source of Truth** الوحيد لتعريف "ما هو المنتج؟" — وليس لكميته أو رصيده.

---

## 2. Responsibilities

- إدارة القائمة (Menu) وفئاتها (Categories)
- إدارة المنتجات القابلة للبيع (Menu Items) وتفعيلها/تعطيلها
- إدارة الوصفات (Recipes/BOM) وربطها بالمكونات (كمرجع لـ `stockItemId` دون امتلاك رصيده)
- إدارة التخصيصات (Modifiers وModifier Groups) — مثل نوع الحليب، درجة التحلية، إضافات
- إدارة معلومات التحضير التشغيلية (Preparation Info): المحطة المسؤولة (مطبخ/باريستا/أخرى)، الوقت التقديري للتحضير
- إدارة الأسعار الأساسية للمنتجات وتوقيت نفاذها

---

## 3. Out of Scope

| المفهوم | لماذا خارج النطاق | من يملكه |
|---------|---------------------|----------|
| رصيد/كمية المكوّنات الفعلية | Menu تُعرّف "ما هي المكونات المطلوبة" فقط، وليس "كم مكوّن متوفر الآن" | Inventory |
| تقييم المخزون (Stock Valuation) | لا علاقة لـ Menu بالقيمة المالية للمخزون | Inventory |
| **تعريف المكوّن نفسه (اسمه، وحدة قياسه، حد إعادة طلبه)** | Menu.Recipe تشير فقط لـ `stockItemId` كمرجع خارجي، ولا تملك أي بيانات تعريفية عن المكوّن | **Inventory** |
| منطق البيع والخصومات وقت المعاملة | Menu تُعرّف السعر الأساسي فقط؛ التسعير الفعلي وقت البيع (بعد الخصم) مسؤولية منفصلة | Sales |
| تنفيذ التحضير الفعلي وتتبع حالته (Preparing/Ready/Served) | Menu تُعرّف "أين يُحضَّر المنتج" (Preparation Info) لكنها لا تدير دورة حياة التنفيذ نفسها | Order Fulfillment |
| تحديد أهلية العميل لخصم | لا علاقة لـ Menu ببيانات العميل | CRM |

---

## 4. Business Concepts

| المفهوم | التعريف |
|---------|---------|
| **Category** | تصنيف منطقي للمنتجات (مشروبات ساخنة، مخبوزات، ساندوتشات...) لأغراض العرض والتنظيم |
| **MenuItem** | منتج نهائي قابل للبيع، ينتمي لفئة واحدة، وله سعر أساسي وحالة تفعيل |
| **Recipe** | تعريف مكونات المنتج وكمياتها المطلوبة لإنتاجه (BOM) — **يُشير فقط** لمكونات مُعرَّفة بالكامل في Inventory (`stockItemId`)، دون أي ملكية لتعريفها أو رصيدها |
| **ModifierGroup** | مجموعة خيارات تخصيص **قابلة لإعادة الاستخدام عبر منتجات متعددة** (مثال: "نوع الحليب" مجموعة واحدة مُعرَّفة مرة، ومرتبطة بكل المشروبات التي تحتاجها) |
| **Modifier** | خيار تخصيص مفرد داخل ModifierGroup، قد يحمل فرق سعر (Price Delta) موجب أو صفري، وقد يحمل **تأثيرًا على الوصفة (Recipe Impact)** اختياريًا |
| **ModifierRecipeImpact** | تعريف أثر اختيار Modifier معيّن على الاستهلاك الفعلي من المخزون: إما **Substitution** (استبدال مكوّن بمكوّن آخر بكمية محددة) أو **Addition** (إضافة كمية لمكوّن موجود بالفعل) |
| **PreparationInfo** | معلومات تشغيلية مرتبطة بالمنتج: المحطة المسؤولة عن تحضيره (Station)، الوقت التقديري للتحضير — يستهلكها Order Fulfillment للتوجيه والجدولة |
| **BasePrice** | `Money` موجبة يملكها Menu؛ قد تكون حالية أو مجدولة بتاريخ نفاذ. الأسعار المجدولة لا تخرج من Menu قبل نفاذها |

> **ملاحظة على النطاق:** المفاهيم (Modifiers, PreparationInfo, ModifierRecipeImpact) لم تكن مذكورة صراحة في التعريف الأول لـ Menu داخل RFC-001 §4.3 (لاحقًا §4.4)، وهي امتداد طبيعي ضروري لتغذية Order Fulfillment وInventory بمعلومات كافية دون افتراضات مرتجلة. يُعتبر هذا تحديثًا ضمنيًا لنطاق Menu، لا يغيّر أي حد من حدود الدومينز الأخرى.

---

## 5. Business Rules

1. كل MenuItem يجب أن ينتمي لفئة (Category) واحدة على الأقل.
2. لا يمكن تفعيل (`MenuItemActivated`) منتج يحتاج تحضيرًا دون وصفة (Recipe) مُعرَّفة مسبقًا.
3. لا يمكن تفعيل منتج دون `BasePrice` صالح بحيث `amountMinor > 0` و`currencyCode` رمز ISO-4217 uppercase متحقق منه. المنتجات ذات السعر الصفري غير صالحة في MVP.
4. تعديل وصفة قائمة (`RecipeUpdated`) لا يؤثر على أي معاملة بيع سابقة اكتملت قبل التعديل — يُطبَّق فقط على عمليات البيع اللاحقة.
5. تغيير السعر الأساسي له تاريخ نفاذ (`effectiveFrom`) لا يجوز أن يكون في الماضي. يبقى مجدولًا داخل Menu، وعند لحظة النفاذ يصبح السعر الحالي وينشر Menu `MenuItemPriceChanged` idempotently باستخدام `priceChangeId`.
5ب. تغيير BasePrice لاحقًا لا يعيد تسعير Order موجود؛ Sales تكون قد حفظت `OrderLine.unitPrice` Snapshot عند `OrderPlaced`.
6. كل Modifier داخل ModifierGroup يجب أن ينتمي لمجموعة واحدة فقط؛ لا ازدواج انتماء.
7. تعطيل منتج (`MenuItemDeactivated`) يمنع إضافته لأي طلب بيع جديد بأثر فوري، لكن لا يؤثر على طلبات قائمة بالفعل تحتوي عليه.
8. كل مكوّن مُشار إليه داخل Recipe يجب أن يكون معرَّفًا في Inventory كـ Master Data (لا يجوز الإشارة لمكوّن غير موجود).
9. PreparationInfo (المحطة، الوقت التقديري) إلزامية لأي منتج يحتاج تحضيرًا فعليًا (وليس منتجًا جاهزًا يُباع كما هو).
10. **ModifierGroup كيان مستقل وقابل لإعادة الاستخدام** — يُعرَّف مرة واحدة ويُربَط بمنتج واحد أو أكثر عبر رابط (MenuItem ↔ ModifierGroup)، وليس مملوكًا حصريًا لمنتج بعينه.
11. أي Modifier يحمل `ModifierRecipeImpact` من نوع `substitute` يجب أن يُحدِّد كلًا من المكوّن الأصلي المُستبدَل (`targetStockItemId`) والمكوّن البديل (`substituteStockItemId`) صراحة.
12. أي Modifier يحمل `ModifierRecipeImpact` من نوع `addition` يجب أن يُحدِّد كمية إضافية موجبة (`quantityDelta > 0`) لمكوّن موجود بالفعل ضمن الوصفة الأساسية.
13. Modifier ليس ملزَمًا بامتلاك `ModifierRecipeImpact` — كثير من التخصيصات (مثل "بدون سكر" لمنتج لا يحتوي أصلًا على مكوّن مُدار في المخزون) قد تكون توصيفية بحتة دون أثر مخزني.

---

## 6. Use Cases / Business Flows

### 6.1 إنشاء منتج جديد وتفعيله

1. مالك/مدير الكافيه ينشئ MenuItem جديدًا ضمن Category موجودة.
2. يُعرَّف السعر الأساسي (BasePrice).
3. إن كان المنتج يحتاج تحضيرًا: تُعرَّف Recipe (مكونات وكميات) وPreparationInfo (المحطة، الوقت التقديري).
4. عند استيفاء كل الشروط المسبقة (القسم 5): يُفعَّل المنتج وتُنشر `MenuItemActivated`.
5. يحمل `MenuItemActivated` السعر الأساسي الحالي وتاريخ نفاذه لبناء Projection البيع، بينما تظل أي جداول أسعار مستقبلية داخل Menu فقط.
6. Sales وOrder Fulfillment وReporting يستهلكون الحدث — أصبح المنتج متاحًا للبيع.

### 6.2 تعديل وصفة منتج قائم

1. مدير المخزون/الكافيه يُعدّل كميات مكونات وصفة منتج (مثال: تقليل كمية القهوة في وصفة الإسبريسو).
2. Menu تتحقق من أن كل مكوّن مُشار إليه موجود في Inventory كـ Master Data.
3. عند الاستيفاء: تُنشر `RecipeUpdated`.
4. Inventory تستهلك الحدث لاستخدام النسخة الجديدة في عمليات الخصم المستقبلية عند البيع — لا تراجع بأثر رجعي على مبيعات سابقة.

### 6.3 تعطيل مؤقت لمنتج (نفاد موسمي)

1. مدير الكافيه يُعطّل منتجًا معينًا (مثال: نفاد مكوّن أساسي بشكل غير متوقع خارج آلية Inventory التلقائية، أو قرار تجاري مؤقت).
2. تُنشر `MenuItemDeactivated` مع سبب التعطيل.
3. Sales تمنع إضافة هذا المنتج لأي طلب جديد فورًا؛ Order Fulfillment لا يستقبل طلبات جديدة له.
4. أي طلب سابق يحتوي على هذا المنتج ولم يُكتمَل بعد يستمر بشكل طبيعي (لا رجوع تلقائي).

### 6.4 إنشاء ModifierGroup قابلة لإعادة الاستخدام وربطها بعدة منتجات

1. مدير الكافيه ينشئ ModifierGroup مستقلة (مثال: "نوع الحليب") مرة واحدة.
2. يُضاف خيار Modifier أو أكثر داخل هذه المجموعة (كامل الدسم، خالي الدسم، شوفان)، مع فرق سعر لكل خيار إن وُجد.
3. لكل Modifier، يُحدَّد اختياريًا `ModifierRecipeImpact`: مثال — اختيار "شوفان" يُنشئ `substitute` (استبدال 200ml حليب كامل الدسم بـ 200ml حليب شوفان).
4. عند حفظ التأثير: Menu تتحقق من وجود كل المكونات المُشار إليها في Inventory كـ Master Data، ثم تنشر `ModifierRecipeImpactUpdated`.
5. المجموعة تُربَط بمنتج واحد أو أكثر (مثال: كل المشروبات الساخنة) عبر رابط MenuItem↔ModifierGroup — بدون تكرار تعريف المجموعة لكل منتج.

### 6.5 إضافة Extra Shot كـ Modifier بأثر إضافي على الوصفة

1. مدير الكافيه يُضيف Modifier باسم "Extra Shot" ضمن مجموعة "الإضافات".
2. يُحدَّد `ModifierRecipeImpact` من نوع `addition`: زيادة 18g على مكوّن "بن القهوة" الموجود أصلًا في وصفة المنتج.
3. تُنشر `ModifierRecipeImpactUpdated`.
4. لاحقًا عند البيع: Inventory (الذي يملك نسخة محلية من الوصفة الأساسية + هذا التأثير) يخصم 18g إضافية تلقائيًا عند اختيار هذا الـ Modifier ضمن `selectedModifierIds`.

---

## 7. Aggregate Roots & Entities

| الكيان | النوع | ملاحظات |
|--------|-------|---------|
| **MenuItem** | Aggregate Root | يضبط حالته (تفعيل/تعطيل)، سعره، وارتباطه بفئة، وصفة، ومجموعات تخصيص (عبر روابط، وليس ملكية مباشرة) |
| Category | Entity (مستقل، يُشار إليه من MenuItem) | له دورة حياة مستقلة (إنشاء/تعديل/حذف) لا تعتمد على أي MenuItem بعينه |
| Recipe | Entity (جزء من MenuItem Aggregate) | لا وجود مستقل خارج المنتج الذي تخصّه |
| RecipeIngredientLink | Value Object (جزء من Recipe) | يحمل فقط `stockItemId` وكمية، دون أي بيانات عن رصيد المكوّن |
| **ModifierGroup** | **Aggregate Root مستقل** | قابلة لإعادة الاستخدام عبر منتجات متعددة؛ لا تنتمي لـ MenuItem واحد؛ الربط يتم عبر كيان وسيط `MenuItemModifierGroupLink` |
| MenuItemModifierGroupLink | Entity (رابط Many-to-Many) | يربط MenuItem بـ ModifierGroup واحدة أو أكثر |
| Modifier | Entity (جزء من ModifierGroup Aggregate) | لا هوية مستقلة خارج مجموعته |
| ModifierRecipeImpact | Value Object (جزء من Modifier) | يحمل نوع التأثير (substitute/addition) والمكونات والكميات المتأثرة |
| PreparationInfo | Value Object (جزء من MenuItem Aggregate) | خاصية توصيفية على المنتج، لا دورة حياة مستقلة |

---

## 8. Published Events

(تفاصيل كاملة موثّقة في RFC-002 §7 — هنا فقط قائمة مرجعية)

| الحدث | متى |
|-------|-----|
| `RecipeUpdated` | عند تعديل مكونات/كميات وصفة منتج قائم |
| `MenuItemPriceChanged` | عند تغيير السعر الأساسي لمنتج |
| `MenuItemActivated` | عند تفعيل منتج جديد أو إعادة تفعيله |
| `MenuItemDeactivated` | عند تعطيل منتج |
| `ModifierRecipeImpactUpdated` | عند تعريف أو تعديل أثر Modifier معيّن على استهلاك المخزون (استبدال/إضافة) |

`MenuItemActivated` و`MenuItemPriceChanged` و`MenuItemDeactivated` تغذي `MenuItemSalesReadModel` لدى Sales. `MenuItemPriceChanged` لا يُنشر عند مجرد جدولة السعر، بل عند نفاذه، وبمفتاح `priceChangeId`.

---

## 9. Consumed Events

| الحدث | من | كيف يُستخدَم داخل Menu |
|-------|-----|--------------------------|
| `StockItemCreated` | Inventory | يُحدِّث Read Model محلي بالأصناف الصالحة للإشارة إليها عند بناء الوصفات (`RecipeUpdated`) أو تعريف تأثيرات التخصيصات (`ModifierRecipeImpactUpdated`) |
| `StockItemDeactivated` | Inventory | يُحدِّث نفس الـ Read Model لمنع الإشارة لصنف مُعطَّل في أي وصفة أو تأثير تخصيص جديد |

> ملاحظة: هذا تحديث بعد اكتشافه أثناء الـ End-to-End Walkthrough — Menu كان يُفترَض أنه "لا يستهلك شيئًا" باعتباره بيانات تأسيسية بحتة، لكن التحقق المرجعي من وجود `stockItemId` (Business Rule #8 أعلاه) يتطلب فعليًا معرفة الأصناف الصالحة، تمامًا كما يفعل Purchasing مع الموردين.

---

## 10. Permissions

| الصلاحية (Atomic) | الوصف |
|---------------------|-------|
| `Menu.ViewItems` | استعراض المنتجات والفئات |
| `Menu.ManageItems` | إنشاء/تعديل/تفعيل/تعطيل المنتجات |
| `Menu.ManageCategories` | إدارة الفئات |
| `Menu.ManageRecipes` | إنشاء/تعديل الوصفات |
| `Menu.ManagePricing` | تعديل الأسعار الأساسية |
| `Menu.ManageModifiers` | إدارة مجموعات وخيارات التخصيص |

---

## 11. Data Model

> **ملاحظة معمارية:** مستوى عالٍ فقط (High-Level Schema Direction)، اتساقًا مع Domain-Sales.md. التصميم التفصيلي الكامل يُبنى في وثيقة منفصلة لاحقًا.

جداول مرشحة (اتجاه عام فقط):
- `categories` (tenant_id, name, ...)
- `menu_items` (tenant_id, category_id, name, base_price, is_active, ...)
- `recipes` (menu_item_id, ...)
- `recipe_ingredients` (recipe_id, stock_item_id, quantity_required, unit, ...)
- `modifier_groups` (tenant_id, name, ...) — **مستقلة، غير مرتبطة بمنتج واحد**
- `menu_item_modifier_groups` (menu_item_id, modifier_group_id, ...) — **جدول ربط Many-to-Many**
- `modifiers` (modifier_group_id, name, price_delta, ...)
- `modifier_recipe_impacts` (modifier_id, impact_type, target_stock_item_id, substitute_stock_item_id, quantity_delta, ...)
- `preparation_info` (menu_item_id, station, estimated_prep_time_minutes, ...)

كل الجداول تحمل `tenant_id` إلزاميًا وفق سياسة RLS المُقرَّرة في Product Bible.

---

## 12. Public APIs

> **ملاحظة:** تصميم الـ API التفصيلي يُؤجَّل لوثيقة API Design منفصلة. هنا فقط قائمة القدرات (Capabilities) المتوقعة:

- إدارة الفئات (إنشاء/تعديل/حذف)
- إدارة المنتجات (إنشاء/تعديل/تفعيل/تعطيل)
- إدارة الوصفات وربطها بالمكونات
- إدارة مجموعات وخيارات التخصيص
- تعديل الأسعار الأساسية مع تاريخ نفاذ
- استعلام عن القائمة الكاملة (للاستهلاك من Sales وOrder Fulfillment)

---

## 12A. Offline-first execution constraint (RFC-006)

- Menu definitions والأسعار الحالية/المستقبلية Cloud-authoritative وتصل للEdge كـversioned snapshots.
- Edge لا يؤلف تغييرات Menu مركزية Offline؛ يخدم آخر snapshot صالح لـSales/Fulfillment.
- السعر المجدول الواصل قبل الانقطاع يتفعّل محليًا عند `effectiveFrom`؛ التعديل الأحدث ينتظر sync.
- تطبيق snapshot وEdge Inbox acknowledgement atomic وidempotent؛ resource version الأقدم/المساوي لا يُعاد تطبيقه.

## 13. Future Extensions

- **Multi-language Menu Content:** دعم أسماء ووصف المنتجات بأكثر من لغة (عربي/إنجليزي) كحقول i18n صريحة — متوافق مع مبدأ Bilingual من اليوم الأول في Product Bible.
- **Seasonal/Time-based Availability:** جدولة تفعيل/تعطيل تلقائي للمنتجات حسب الوقت (فطور فقط، عروض موسمية).
- **Combo/Bundle Items:** منتجات مركّبة من عدة MenuItems بسعر موحّد.
- **Recipe Versioning:** الاحتفاظ بنسخ تاريخية من الوصفات لتحليل تطور تكلفة المنتج عبر الزمن (يخدم AI-Readiness المذكور في Product Bible).
- **Modifier Recipe Impact متعدد المستويات:** دعم تأثير Modifier واحد على أكثر من مكوّن دفعة واحدة (مثال: تغيير حجم الكوب يؤثر على كمية القهوة والحليب معًا)، بدل تأثير واحد لكل Modifier كما هو في MVP.

---

## 14. Commercial Packaging Recommendation

> ملاحظة: هذه التوصية معلوماتية بحتة، وليست قيدًا معماريًا (راجع RFC-003). تغييرها لا يتطلب أي تعديل على تصميم هذا الدومين.

**Capability: القائمة الأساسية**
Capability ID: `MENU.Catalog`
Recommended Packaging: Starter ✅ | Growth ✅ | Professional ✅ | Enterprise ✅

**Capability: الوصفات**
Capability ID: `MENU.Recipes`
Recommended Packaging: Starter ✅ | Growth ✅ | Professional ✅ | Enterprise ✅

**Capability: التخصيصات (Modifiers)**
Capability ID: `MENU.Modifiers`
Recommended Packaging: Starter ❌ | Growth ✅ | Professional ✅ | Enterprise ✅

---

*نهاية Domain Document: Menu — v1.*
