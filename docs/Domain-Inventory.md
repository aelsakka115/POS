# Domain Document: Inventory

**Type:** Domain Document
**Domain Classification:** Core Business Domain (Cafe Engine) — Foundational Operational Engine
**Depends on:** RFC-001 (Context Map), RFC-002 (Event Catalog)
**Reference Template:** Domain-Sales.md, Domain-Menu.md
**Status:** Draft v1

---

## 1. Domain Purpose

Inventory هو **المصدر الوحيد للحقيقة (Single Source of Truth)** لكل ما هو فعلي/مادي في الكافيه: تعريف الأصناف (StockItem)، الكمية، الحركة، والقيمة المالية. ليس "موديول مخزون" بل **Operational Engine** تُبنى فوقه لاحقًا Purchasing وCosting وAnalytics. يحسب الاستهلاك الفعلي للمكونات وقت البيع (بدمج الوصفات وتأثيرات التخصيصات)، وينشر الأحداث التي تُغذّي بقية المنصة.

---

## 2. Responsibilities

- تعريف أصناف المخزون (StockItem) بالكامل: الاسم، وحدة القياس، الفئة، حد إعادة الطلب
- إدارة وحدات القياس (Units of Measure) والتحويل بينها
- تسجيل حركات المخزون (Stock Movements) بكل أنواعها: إدخال (استلام)، خصم (بيع)، تحويل، تسوية
- حساب الاستهلاك الفعلي وقت البيع: دمج الوصفة الأساسية (من `RecipeUpdated`) مع تأثيرات التخصيصات المُختارة (من `ModifierRecipeImpactUpdated` و`selectedModifierIds` في `SaleCompleted`)
- استقبال أثر استلام البضاعة (`GoodsReceived`) كحركة إدخال
- إدارة التسويات اليدوية (Stock Adjustments) والهدر (Waste)
- إدارة الجرد (Stock Counting) واعتماد الفروقات
- حساب حدود إعادة الطلب واكتشاف انخفاض المخزون
- تقييم المخزون ماليًا (Weighted Average Cost)
- تطبيق سياسة الرصيد السالب (`NegativeStockPolicy`) المُهيَّأة على مستوى كل Tenant
- **حساب قابلية بيع كل منتج (`ItemAvailabilityChanged`)** بناءً على مستوى مخزون مكوناته، ونشرها لـ Sales كـ "متاح/غير متاح" فقط — دون كشف أي مستوى مخزون فعلي خارج حدود هذا الدومين

---

## 3. Out of Scope

| المفهوم | لماذا خارج النطاق | من يملكه |
|---------|---------------------|----------|
| تعريف المنتج والوصفة كمفهوم تجاري (اسم المنتج، تصنيفه) | Inventory يستهلك فقط الإشارات لمكوناته | Menu |
| منطق البيع والخصومات | Inventory يستهلك حدث الإتمام فقط | Sales |
| أوامر الشراء نفسها (Purchase Orders) | Inventory يستقبل أثر الاستلام فقط، لا يدير دورة الشراء | Purchasing |
| تتبع الدُفعات وتواريخ الصلاحية (Batch/Lot & Expiry) | خارج نطاق MVP صراحة؛ التصميم يبقى قابلًا للتوسعة لاحقًا (راجع Future Extensions) | — (Phase 2) |
| سياسة الرصيد السالب كإعداد | القيمة نفسها تُدار كإعداد عام لكل Tenant، وليست منطقًا مُرمَّزًا داخل Inventory | Settings (Platform Domain) |

---

## 4. Business Concepts

| المفهوم | التعريف |
|---------|---------|
| **StockItem** | تعريف كامل لصنف مخزون (مكوّن أو سلعة): الاسم، وحدة القياس الأساسية، الفئة، حد إعادة الطلب |
| **UnitOfMeasure** | وحدة قياس (كجم، جرام، لتر، مل...) مع معامل تحويل بين الوحدات المختلفة لنفس الصنف |
| **StockMovement** | سجل حركة واحدة على رصيد صنف معيّن، له نوع (إدخال/خصم/تحويل/تسوية) وسبب واضح دائمًا |
| **ResolvedConsumption** | الكميات الفعلية المحسوبة وقت بيع معيّن، ناتجة عن دمج Base Recipe + Modifier Recipe Impacts المُختارة — تُخزَّن كأرقام ثابتة (Immutable) ضمن StockMovement المرتبط |
| **StockValuation** | القيمة المالية الحالية لرصيد صنف معيّن، مبنية على طريقة Weighted Average Cost |
| **StockCount** | عملية جرد فعلي لمطابقة الرصيد الدفتري بالرصيد الحقيقي، وتسوية أي فروقات |
| **WasteRecord** | تسجيل كمية مفقودة من صنف لسبب غير بيعي (تلف، انسكاب، انتهاء صلاحية) |
| **ReorderLevel** | الحد الأدنى لرصيد صنف قبل اعتباره "منخفضًا" ويحتاج تنبيهًا |
| **NegativeStockPolicy** | سياسة مُهيَّأة على مستوى Tenant تحدد سلوك النظام عند محاولة خصم كمية تتجاوز الرصيد المتاح: `Strict` / `Warning` (افتراضي) / `Ignore` |
| **ItemAvailability** | حالة مُشتقة "متاح/غير متاح" لكل منتج (`menuItemId`)، محسوبة داخليًا بمقارنة متطلبات الوصفة (+ تأثيرات التخصيصات) بمستويات المخزون الحالية لكل مكوّن مطلوب — **لا تُكشَف كمستوى مخزون، فقط كحالة ثنائية** |

---

## 5. Business Rules

1. كل `StockMovement` يجب أن يحمل سببًا واضحًا (بيع، استلام، تحويل، تسوية يدوية، هدر) — لا حركة "بلا سبب".
2. **Immutability الاستهلاك الناتج عن البيع:** الكميات المُخصومة نتيجة `SaleCompleted` تُخزَّن كأرقام ثابتة وقت الحدوث، مع مرجع لنسخة الوصفة المُستخدَمة (`recipeVersionUsed`) لأغراض التدقيق فقط. أي `RecipeUpdated` لاحق **لا يُعيد حساب** حركات سابقة بأي شكل.
3. حساب الاستهلاك الفعلي لبند بيع معيّن = كمية Base Recipe **معدَّلة** بتأثيرات كل `Modifier` مُختار (Substitution يستبدل مكوّنًا بآخر بنفس الكمية أو كمية محددة؛ Addition يزيد كمية مكوّن موجود بالفعل).
4. **سياسة الرصيد السالب** تُقرأ من إعدادات الـ Tenant (Settings)، وتُطبَّق على **طبقتين دفاعيتين** (حُسِم التصميم بعد System Freeze v1 Deep Validation):
   - **الطبقة الأولى (وقائية، في Sales):** عند `Strict`، Sales تمنع `OrderPlaced` أصلًا لأي منتج مُصنَّف `isAvailable=false` في Read Model محلي مُحدَّث من `ItemAvailabilityChanged` (راجع Domain-Sales.md Business Rule #15). هذه الطبقة **Eventually Consistent** — تقلل احتمالية الرصيد السالب بشكل كبير، لكنها لا تضمنه 100% (Trade-off موثَّق في RFC-002 §6.6).
   - **الطبقة الثانية (Backstop نهائي، هنا في Inventory):** وقت معالجة `SaleCompleted` الفعلي، إن نتج عن الخصم رصيد سالب رغم الطبقة الأولى (حالة نادرة من التزامن الدقيق):
     - `Strict`: الخصم **يُنفَّذ رغم ذلك** (المعاملة المالية مكتملة بالفعل وغير قابلة للتراجع — راجع Immutability)، لكن يُنشر تنبيه ذو أولوية قصوى (Critical) يتطلب مراجعة فورية، ويُسجَّل كـ Data Quality Incident بدل تنبيه Warning عادي.
     - `Warning` (افتراضي): يُسمَح بالخصم مباشرة (دون طبقة أولى مانعة)، يُنتَج رصيد سالب، ويُنشر تنبيه عادي (`StockLevelLow`) لتصحيحه لاحقًا عبر الجرد.
     - `Ignore`: يُسمَح بالخصم دون أي تنبيه.
   - **خلاصة معمارية:** `Strict` لا يعني أبدًا "منع اكتمال معاملة مالية بعد إتمامها" (مستحيل تقنيًا لأن Sale غير قابلة للتراجع) — بل يعني "منع نشوء الطلب من الأساس عبر بوابة استباقية في Sales"، مع تصعيد حرج (لا صامت) في الحالات النادرة التي تتخطى هذه البوابة.
5. تقييم المخزون (StockValuation) يُحدَّث عند كل حركة إدخال (باستخدام Weighted Average Cost: `newAvgCost = (currentQty × currentAvgCost + receivedQty × receivedUnitCost) / (currentQty + receivedQty)`)، ولا يتأثر مباشرة بحركات الخصم (يبقى نفس متوسط التكلفة، وتقل الكمية فقط).
6. لا يمكن اعتماد Stock Count (`StockCountFinalized`) إلا بعد تسجيل كل الأصناف المشمولة في الجرد؛ الفروقات المكتشفة تُصبح `StockAdjustment` رسمية عند الاعتماد.
7. كل مكوّن مُشار إليه من Menu (عبر `RecipeUpdated` أو `ModifierRecipeImpactUpdated`) يجب أن يكون معرَّفًا مسبقًا كـ `StockItem` في Inventory؛ الإشارة لمكوّن غير موجود تُرفَض عند معالجة الحدث.
8. الوحدات المختلفة لنفس الصنف (تخزين بالكيلوجرام، استهلاك بالجرام) يجب أن تُحوَّل عبر معامل تحويل مُعرَّف مسبقًا قبل أي عملية حسابية.
9. **كل `StockMovement` يُنشئه Inventory داخليًا — بغض النظر عن نوعه أو مصدره — ينشر `InventoryMovementRecorded` مقابل، بالتقييم المالي الكامل.** هذا الحدث الموحَّد هو المسار الوحيد الذي يجعل أي حركة مخزون (خصوصًا الخصم الناتج عن `SaleCompleted`، الذي لم يكن له أي أثر خارجي مرئي قبل هذا القرار) مرئية لأي دومين خارجي، وأهمها Reporting.

---

## 6. Use Cases / Business Flows

### 6.1 خصم مخزون تلقائي عند بيع منتج بتخصيصات

1. Inventory يستقبل `SaleCompleted` يحتوي بندًا بـ `menuItemId` و`selectedModifierIds`.
2. Inventory يسترجع Base Recipe المحلي لهذا المنتج (مُحدَّث سابقًا عبر `RecipeUpdated`).
3. لكل `modifierId` مُختار: Inventory يسترجع `ModifierRecipeImpact` المقابل (إن وُجد) ويُطبّقه (استبدال أو إضافة) على قائمة المكونات.
4. الناتج: قائمة مكونات نهائية بكميات محدَّدة (`ResolvedConsumption`).
5. لكل مكوّن: Inventory يتحقق من سياسة `NegativeStockPolicy` إن كان الخصم سيُنتج رصيدًا سالبًا، ويتصرف وفقًا للسياسة المُهيَّأة.
6. يُسجَّل `StockMovement` من نوع خصم لكل مكوّن، بالكمية الفعلية الثابتة + `recipeVersionUsed`.
7. إن انخفض أي رصيد تحت `ReorderLevel`: يُنشر `StockLevelLow`.

### 6.2 استلام بضاعة من مورد

1. Purchasing ينشر `GoodsReceived` لأمر شراء مكتمل الاستلام (كليًا أو جزئيًا).
2. Inventory يسجّل `StockMovement` من نوع إدخال لكل صنف مُستلَم، بالكمية والتكلفة الفعلية.
3. Inventory يُحدِّث `StockValuation` لكل صنف باستخدام معادلة Weighted Average Cost.

### 6.3 جرد دوري واعتماد الفروقات

1. مدير الفرع يبدأ عملية Stock Count، ويُسجِّل الكمية الفعلية المُكتشَفة لكل صنف مشمول.
2. عند اكتمال تسجيل كل الأصناف: يُعتمَد الجرد.
3. الفروقات (المتوقع مقابل الفعلي) تُصبح `StockAdjustment` رسمية.
4. تُنشر `StockCountFinalized` بكل التسويات.

### 6.4 تسجيل هدر يدوي

1. موظف يُسجِّل كمية تالفة أو منسكبة من صنف معيّن، مع سبب.
2. يُسجَّل `StockMovement` من نوع تسوية (سالب) مرتبط بسبب "هدر".
3. تُنشر `StockAdjusted` بالتفاصيل.

### 6.5 محاولة خصم تتجاوز الرصيد المتاح (سيناريو Negative Stock — الطبقة الثانية/Backstop)

1. Inventory يحاول خصم كمية أكبر من الرصيد الحالي لمكوّن معيّن أثناء معالجة `SaleCompleted` (يعني الطبقة الأولى في Sales — إن كانت `Strict` — لم تمنع الطلب، غالبًا بسبب Eventual Consistency Lag).
2. Inventory يفحص `NegativeStockPolicy` الخاصة بالـ Tenant:
   - لو `Strict`: الخصم يُنفَّذ (لا رجعة عن معاملة مالية مكتملة)، لكن يُنشر تنبيه Critical فوري يتطلب مراجعة عاجلة.
   - لو `Warning`: يُنفَّذ الخصم، يُصبح الرصيد سالبًا، ويُنشر تنبيه عادي.
   - لو `Ignore`: يُنفَّذ الخصم بصمت.
3. في كل الحالات، الحركة تُسجَّل بشكل طبيعي — الفرق الوحيد هو مستوى إلحاح التنبيه.

### 6.6 حساب وتحديث قابلية بيع منتج (ItemAvailabilityChanged)

1. أي حركة مخزون (خصم بيع، إدخال، تسوية) تُغيّر رصيد مكوّن معيّن.
2. Inventory يستخدم فهرسًا عكسيًا محليًا (`stockItemId → menuItemIds المتأثرة`، مبنيًا من نسخته المحلية لـ `RecipeUpdated` و`ModifierRecipeImpactUpdated`) لتحديد كل المنتجات التي قد تتأثر قابليتها للبيع.
3. لكل منتج متأثر: يُعاد حساب "هل كل مكوناته المطلوبة متوفرة بكمية كافية؟"
4. إن تغيّرت النتيجة عن الحالة المحفوظة سابقًا لهذا المنتج: تُنشر `ItemAvailabilityChanged` بالحالة الجديدة فقط (لا ضوضاء لو لم يتغيّر شيء).

---

## 7. Aggregate Roots & Entities

| الكيان | النوع | ملاحظات |
|--------|-------|---------|
| **StockItem** | Aggregate Root | يضبط تعريفه، رصيده الحالي، وقيمته المالية |
| StockMovement | Entity (مرتبط بـ StockItem، لكن له سجل تاريخي مستقل بمعرّف خاص) | Immutable بعد الإنشاء — لا تعديل، فقط حركات تصحيحية جديدة |
| ResolvedConsumption | Value Object (جزء من StockMovement من نوع بيع) | يحمل الكميات الفعلية المحسوبة + `recipeVersionUsed` |
| StockValuation | Value Object (جزء من StockItem) | يُعاد حسابه عند كل حركة إدخال |
| StockCount | Aggregate Root منفصل | له دورة حياة خاصة (بدء → تسجيل → اعتماد)، يُنتج StockAdjustments عند الاعتماد |
| WasteRecord | Entity (نوع خاص من StockMovement) | يحمل سببًا مصنَّفًا "هدر" دائمًا |
| UnitOfMeasure | Entity مستقل (Master Data) | يُشار إليه من StockItem، له معاملات تحويل معرَّفة |

---

## 8. Published Events

(تفاصيل كاملة موثّقة في RFC-002 §6 — هنا فقط قائمة مرجعية)

| الحدث | متى |
|-------|-----|
| `StockLevelLow` | عند انخفاض رصيد صنف عن حد إعادة الطلب |
| `StockCountFinalized` | عند اعتماد نتيجة جرد وتسوية الفروقات |
| `StockAdjusted` | عند أي تعديل يدوي على المخزون (هدر، تلف، تسوية مباشرة) |
| `StockItemCreated` | عند تعريف صنف مخزون جديد — يُصبح مرجعًا صالحًا لأي Domain آخر (اكتُشفت الحاجة إليه أثناء End-to-End Walkthrough) |
| `StockItemDeactivated` | عند تعطيل صنف مخزون |
| `ItemAvailabilityChanged` | عند تغيّر قابلية بيع منتج (متاح/غير متاح) نتيجة تغيّر مخزون أحد مكوناته |
| `InventoryMovementRecorded` | عند **أي** حركة مخزون (بيع، استلام، تسوية، هدر، جرد) — سجل موحَّد بالتقييم المالي الكامل، مُخصَّص لـ Reporting (اكتُشفت الحاجة إليه أثناء تصميم Reporting Domain) |

---

## 9. Consumed Events

| الحدث | من | كيف يُستخدَم داخل Inventory |
|-------|-----|------------------------------|
| `SaleCompleted` | Sales | يُشغِّل حساب الاستهلاك الفعلي وخصم المخزون لكل بند، بدمج Recipe + Modifier Impacts |
| `SaleRefunded` | Sales | يُعالَج **حسب `disposition` كل بند على حدة** (وليس سياسة عامة): `Restock` ← حركة إدخال فعلية بنفس الكمية؛ `Discard` ← لا حركة إدخال (يُعتبَر هدرًا ضمنيًا، دون تسجيل `WasteRecord` منفصل في MVP)؛ `InspectionRequired` ← لا حركة تلقائية، يبقى معلَّقًا لحين تسوية يدوية لاحقة عبر Stock Adjustment |
| `GoodsReceived` | Purchasing | يُسجَّل كحركة إدخال ويُحدِّث StockValuation |
| `RecipeUpdated` | Menu | يُحدِّث نسخة Inventory المحلية من الوصفة الأساسية — تُستخدَم في عمليات البيع **المستقبلية** فقط |
| `ModifierRecipeImpactUpdated` | Menu | يُحدِّث نسخة Inventory المحلية من تأثيرات التخصيصات على الوصفة — نفس مبدأ عدم الأثر الرجعي |

---

## 10. Permissions

| الصلاحية (Atomic) | الوصف |
|---------------------|-------|
| `Inventory.View` | استعراض الأرصدة والحركات |
| `Inventory.Adjust` | تسجيل تسوية يدوية أو هدر |
| `Inventory.Transfer` | تحويل مخزون بين فروع (Phase 2 حسب Product Bible، لكن الصلاحية تُعرَّف من الآن) |
| `Inventory.ManageStockItems` | إنشاء/تعديل تعريف الأصناف ووحدات القياس |
| `Inventory.ManageReorderLevels` | تعديل حدود إعادة الطلب |
| `Inventory.PerformStockCount` | بدء وتسجيل عمليات الجرد |
| `Inventory.ApproveStockCount` | اعتماد نتيجة الجرد وتسوياته |
| `Inventory.ViewValuation` | استعراض التقييم المالي للمخزون |

---

## 11. Data Model

> **ملاحظة معمارية:** مستوى عالٍ فقط (High-Level Schema Direction)، اتساقًا مع باقي Domain Documents.

جداول مرشحة (اتجاه عام فقط):
- `units_of_measure` (tenant_id, name, conversion_factor, base_unit_id, ...)
- `stock_items` (tenant_id, name, unit_id, category, reorder_level, current_quantity, current_avg_cost, ...)
- `stock_movements` (stock_item_id, movement_type, quantity, reason, source_event_id, recipe_version_used?, created_at, ...)
- `stock_valuations` (stock_item_id, avg_cost, total_value, updated_at, ...) — قد تُدمَج داخل `stock_items` بدل جدول منفصل حسب قرار التصميم التفصيلي
- `stock_counts` (tenant_id, branch_id, status, started_at, finalized_at, ...)
- `stock_count_lines` (stock_count_id, stock_item_id, expected_qty, actual_qty, variance, ...)
- `waste_records` (stock_item_id, quantity, reason, recorded_by, recorded_at, ...)

كل الجداول تحمل `tenant_id` إلزاميًا وفق سياسة RLS المُقرَّرة في Product Bible. حقل `recipe_version_used` وحقول مشابهة يُصمَّم بمرونة كافية (nullable / extensible) لدعم إضافة Batch/Lot Tracking لاحقًا دون إعادة هيكلة الجدول الأساسي.

---

## 12. Public APIs

> **ملاحظة:** تصميم الـ API التفصيلي يُؤجَّل لوثيقة API Design منفصلة. هنا فقط قائمة القدرات المتوقعة:

- إدارة أصناف المخزون ووحدات القياس
- استعلام عن الرصيد الحالي والتقييم المالي لأي صنف
- استعراض سجل حركات صنف معيّن
- بدء/تسجيل/اعتماد عملية جرد
- تسجيل تسوية يدوية أو هدر
- استعلام عن الأصناف المنخفضة عن حد إعادة الطلب

---

## 13. Future Extensions

- **Batch/Lot Tracking & Expiry:** إضافة تتبع دُفعات وتواريخ صلاحية لكل StockMovement إدخال، مع دعم FIFO كطريقة تقييم بديلة عند الحاجة — التصميم الحالي (حقول nullable قابلة للتوسعة) يسمح بذلك دون إعادة هيكلة جذرية.
- **Multi-Warehouse per Branch:** دعم أكثر من موقع تخزين داخل الفرع الواحد (مطبخ رئيسي + تخزين احتياطي)، مع حركات تحويل داخلية.
- **Inter-Branch Transfers:** تحويل مخزون بين فروع مختلفة (مذكور في Product Bible كـ Phase 2).
- ~~**Strict Negative Stock Integration**~~ — **تم الحسم في System Freeze v1** عبر Availability Read Model على طبقتين (راجع Business Rule #4 وUse Case 6.6).
- **Real-Time Availability Push (WebSocket/Realtime):** بدل الاعتماد فقط على Eventually Consistent Read Model، إضافة قناة تحديث فورية لواجهة الكاشير عند تغيّر Availability لحظيًا، لتقليل نافذة الـ Race Condition الموصوفة في RFC-002 §6.6 (تحسين تجربة، ليس ضمانًا معماريًا إضافيًا).
- **Automated Reorder Suggestions:** اقتراحات تلقائية لأوامر شراء بناءً على حدود إعادة الطلب ومعدل الاستهلاك التاريخي (يخدم AI-Readiness المذكور في Product Bible).
- **Cost Analysis per Recipe Version:** استخدام `recipeVersionUsed` المُخزَّن لتحليل تطور تكلفة المنتج الفعلية عبر الزمن (يكمّل Recipe Versioning المذكور في Domain-Menu.md).

---

## 14. Commercial Packaging Recommendation

> ملاحظة: هذه التوصية معلوماتية بحتة، وليست قيدًا معماريًا (راجع RFC-003). تغييرها لا يتطلب أي تعديل على تصميم هذا الدومين.

**Capability: الأساسيات**
Capability ID: `INV.Core`
Recommended Packaging: Starter ✅ | Growth ✅ | Professional ✅ | Enterprise ✅

**Capability: الجرد**
Capability ID: `INV.StockCount`
Recommended Packaging: Starter ❌ | Growth ✅ | Professional ✅ | Enterprise ✅

**Capability: الهدر**
Capability ID: `INV.Waste`
Recommended Packaging: Starter ❌ | Growth ✅ | Professional ✅ | Enterprise ✅

**Capability: التسويات اليدوية**
Capability ID: `INV.StockAdjustment`
Recommended Packaging: Starter ❌ | Growth ✅ | Professional ✅ | Enterprise ✅

**Capability: حدود إعادة الطلب**
Capability ID: `INV.Reorder`
Recommended Packaging: Starter ❌ | Growth ❌ | Professional ✅ | Enterprise ✅

**Capability: التقييم المالي**
Capability ID: `INV.Valuation`
Recommended Packaging: Starter ❌ | Growth ❌ | Professional ✅ | Enterprise ✅

**Capability: تتبع الدُفعات** *(Future — غير مُنفَّذة بعد)*
Capability ID: `INV.BatchTracking`
Recommended Packaging: Starter ❌ | Growth ❌ | Professional ❌ | Enterprise ✅ *(تقديري، يُراجَع عند التنفيذ)*

---

*نهاية Domain Document: Inventory — v1.*
