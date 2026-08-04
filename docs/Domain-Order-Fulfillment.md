# Domain Document: Order Fulfillment

**Type:** Domain Document
**Domain Classification:** Core Business Domain (Cafe Engine) — Kitchen Operations
**Depends on:** RFC-001 (Context Map), RFC-002 (Event Catalog), Domain-Sales.md, Domain-Menu.md
**Reference Template:** Domain-Sales.md, Domain-Menu.md, Domain-Inventory.md, Domain-Purchasing.md
**Status:** Draft v1

---

## 1. Domain Purpose

تنفيذ الطلب فعليًا بعد بيعه: من استلام المطبخ/الباريستا لبنود الطلب حتى تسليمها للعميل. Order Fulfillment مسؤول حصريًا عن **الحالة التشغيلية للتحضير** (Preparing/Ready/Served/Cancelled/Rejected) — لا علاقة له بالسعر أو الدفع أو المخزون. هذا الفصل عن Sales يفتح الباب مستقبلًا لـ KDS، شاشة الباريستا، Order Queue، QR Ordering، وتكامل التوصيل دون أي تلوث لمنطق البيع.

> **توضيح حاسم (بعد End-to-End Walkthrough):** الكيان اللي يديره هذا الدومين (`FulfillmentOrder`) **مختلف عن** `Order` المملوك لـ Sales. `Order` (في Sales) يمثّل "ماذا طُلِب تجاريًا" (منتجات، كميات، تخصيصات، سعر). `FulfillmentOrder` (هنا) يمثّل "أين وصلت عملية التحضير". الاثنان يشيران لنفس `orderId`، لكن كل واحد يملك بياناته الخاصة من زاويته.

---

## 2. Responsibilities

- استقبال بنود الطلب بعد نشرها من Sales (`OrderPlaced`) وإنشاء `FulfillmentOrder` مقابل
- إدارة دورة حياة تنفيذ كل طلب: `Preparing → Ready → Served`، وكذلك `Cancelled` / `Rejected`
- توجيه كل بند للمحطة المسؤولة عنه (Station Routing) بناءً على `PreparationInfo` المُعرَّفة في Menu
- ترتيب أولوية التنفيذ (Order Queue) عبر محطات العمل (المطبخ، الباريستا...)
- نشر أحداث تغيّر الحالة لتُستهلك من Sales (لإغلاق دورة الطلب)، Notifications (للتنبيه)، وReporting

---

## 3. Out of Scope

| المفهوم | لماذا خارج النطاق | من يملكه |
|---------|---------------------|----------|
| السعر، الخصومات، الدفع | Order Fulfillment لا يعرف شيئًا عن القيمة المالية للطلب | Sales |
| خصم المخزون | Inventory يستمع لـ `SaleCompleted` من Sales مباشرة، وليس لأي حدث من هذا الدومين | Inventory |
| تعريف المنتج أو الوصفة | Order Fulfillment يستهلك `PreparationInfo` فقط (المحطة، الوقت التقديري) دون أي معرفة بمكونات الوصفة | Menu |
| محتوى الطلب التجاري (ماذا طُلِب، بأي سعر، بأي تخصيصات) | هذا مملوك لـ `Order` في Sales؛ `FulfillmentOrder` هنا يحمل فقط مرجعًا (`orderId`) والحد الأدنى من البيانات التشغيلية اللازمة للتحضير (اسم الصنف، الكمية، التخصيصات المُختارة كنص وصفي) | Sales |

---

## 4. Business Concepts

| المفهوم | التعريف |
|---------|---------|
| **FulfillmentOrder** | التمثيل التشغيلي لطلب قيد التنفيذ داخل الكافيه، منفصل عن `Order` التجاري في Sales، يشير إليه عبر `orderId` |
| **FulfillmentOrderLine** | بند تنفيذ مفرد: الصنف، الكمية، التخصيصات المُختارة (كبيانات وصفية للتحضير فقط)، حالته الخاصة |
| **StationAssignment** | توجيه بند أو مجموعة بنود لمحطة عمل معيّنة (مطبخ، باريستا، أخرى) بناءً على `PreparationInfo` من Menu |
| **OrderStatus** | الحالة الكلية للطلب التشغيلي: `Preparing` → `Ready` → `Served`، أو `Cancelled` / `Rejected` من أي نقطة قبل `Served` |
| **OrderQueue** | ترتيب أولوية الطلبات قيد التحضير داخل محطة عمل معيّنة، عادة بترتيب وقت الوصول (FIFO) في MVP |

---

## 5. Business Rules

1. لا يُنشَأ `FulfillmentOrder` إلا استجابة لحدث `OrderPlaced` من Sales — لا مسار آخر لإنشائه.
2. حالة الطلب تتحول بترتيب صارم: `Preparing → Ready → Served`. لا يمكن القفز مباشرة من `Preparing` إلى `Served` دون المرور بـ `Ready`.
3. `Cancelled` و`Rejected` يمكن أن يحدثا فقط من حالة `Preparing` — لا يمكن إلغاء أو رفض طلب وصل بالفعل لحالة `Ready` أو `Served`.
4. كل بند (`FulfillmentOrderLine`) يُوجَّه تلقائيًا لمحطة العمل المحدَّدة في `PreparationInfo` الخاصة بالمنتج (من Menu)؛ عدم وجود `PreparationInfo` لمنتج يحتاج تحضيرًا يُعتبَر خطأ بيانات (يجب أن يكون قد مُنِع أصلًا وقت تفعيل المنتج في Menu — راجع Domain-Menu.md Business Rule #9).
5. الطلب يُعتبَر `Ready` بالكامل فقط عند اكتمال تحضير **كل** بنوده في **كل** المحطات المعنية — ليس عند اكتمال بند واحد فقط.
6. `OrderRejected` يتطلب سببًا واضحًا مرتبطًا بنقص فعلي في التنفيذ (مثال: نفاد مكوّن اكتُشف أثناء التحضير) — وليس قرارًا تعسفيًا.
7. **Order Fulfillment لا يعرف حالة الشيفت (`ShiftOpened`/`ShiftClosed`) ولا يستهلكها.** بما أن `OrderPlaced` نفسه لا يُنشَر من Sales إلا في ظل شيفت مفتوح (Business Rule #13 في Domain-Sales.md)، فإن وصول الحدث لهذا الدومين يعني ضمنيًا أن الشيفت كان مفتوحًا وقت الإنشاء — لا حاجة لتكرار هذا التحقق هنا.
8. تعطيل منتج (`MenuItemDeactivated`) لا يؤثر على أي `FulfillmentOrderLine` قائم بالفعل يحتوي عليه — يمنع فقط طلبات جديدة (مسؤولية Sales، ليست هذا الدومين).
9. `preparedByEmployeeId` (على `OrderReady`) و`servedByEmployeeId` (على `OrderServed`) **حقلان اختياريان دائمًا** — لأغراض تحليلية بحتة (Reporting KPIs مثل Top Baristas، Average Preparation Time لكل موظف)، وليسا شرطًا مسبقًا لأي انتقال حالة.

---

## 6. Use Cases / Business Flows

### 6.1 المسار الطبيعي الكامل (Happy Path)

1. Sales تنشر `OrderPlaced` بـ `orderId` وبنود الطلب (`menuItemId`, `quantity`, `selectedModifierIds`).
2. Order Fulfillment ينشئ `FulfillmentOrder` جديدًا بحالة `Preparing`، ويُنشئ `FulfillmentOrderLine` لكل بند.
3. كل بند يُوجَّه تلقائيًا لمحطة العمل المناسبة بناءً على `PreparationInfo` (من نسخة Order Fulfillment المحلية لبيانات Menu — راجع القسم 9).
4. عند اكتمال تحضير كل البنود في كل المحطات: تتحول الحالة لـ `Ready`، وتُنشر `OrderReady`.
5. عند تسليم الطلب فعليًا للعميل: تتحول الحالة لـ `Served`، وتُنشر `OrderServed` — Sales تستهلكه لإغلاق دورة الطلب (دون أي تأثير على `SaleCompleted` المالي الذي يحدث بشكل مستقل تمامًا).

### 6.2 إلغاء طلب أثناء التحضير

1. العميل يطلب الإلغاء، أو يُكتشَف خطأ إدخال، أثناء حالة `Preparing`.
2. الطلب ينتقل مباشرة لحالة `Cancelled` مع سبب واضح.
3. تُنشر `OrderCancelled` — Sales تستهلكها (قد تحتاج قرارًا ماليًا منفصلًا: عدم إتمام الدفع أصلًا، أو بدء Refund إن كان قد اكتمل بالفعل — قرار يعود لـ Sales وليس لهذا الدومين).

### 6.3 رفض طلب لنفاد مكوّن أثناء التحضير

1. أثناء التحضير الفعلي، تكتشف المحطة نفاد مكوّن أساسي (سيناريو غير متوقَّع رغم أي تنبيهات مسبقة من Inventory).
2. الطلب ينتقل لحالة `Rejected` مع سبب واضح.
3. تُنشر `OrderRejected` — Sales وNotifications يستهلكان الحدث؛ يحتاج تدخلًا فوريًا (مثال: عرض بديل على العميل).

### 6.4 توجيه طلب متعدد المحطات

1. طلب يحتوي بندين: مشروب (يُحضَّر في محطة الباريستا) وساندوتش (يُحضَّر في المطبخ).
2. Order Fulfillment يُنشئ `StationAssignment` منفصلًا لكل بند حسب `PreparationInfo` الخاصة به.
3. كل محطة تعمل بشكل مستقل على بندها؛ الطلب ككل لا يتحول لـ `Ready` إلا عند اكتمال المحطتين معًا (Business Rule #5).

---

## 7. Aggregate Roots & Entities

| الكيان | النوع | ملاحظات |
|--------|-------|---------|
| **FulfillmentOrder** | Aggregate Root | يضبط حالته الكلية (`OrderStatus`) بناءً على حالة كل بنوده؛ يحمل `orderId` كمرجع خارجي لـ Order في Sales، دون أي معرفة بمحتواه التجاري (السعر، الخصم) |
| FulfillmentOrderLine | Entity (جزء من FulfillmentOrder Aggregate) | لا وجود مستقل خارج الطلب؛ يحمل حالته الفرعية الخاصة (قد تكتمل بنود قبل أخرى) |
| StationAssignment | Value Object (جزء من FulfillmentOrderLine) | يحدد المحطة المسؤولة، مُشتق من `PreparationInfo` وقت إنشاء الـ FulfillmentOrder |

---

## 8. Published Events

(تفاصيل كاملة موثّقة في RFC-002 §5 — هنا فقط قائمة مرجعية)

| الحدث | متى |
|-------|-----|
| `OrderReady` | عند اكتمال تحضير كل بنود الطلب في كل المحطات المعنية |
| `OrderServed` | عند تسليم الطلب فعليًا للعميل |
| `OrderCancelled` | عند إلغاء الطلب أثناء التحضير — يستهلكه أيضًا Shift Management (عدّاد الطلبات المفتوحة، راجع RFC-001 §4.3) |
| `OrderRejected` | عند تعذّر تنفيذ الطلب تشغيليًا رغم قبوله ماليًا — يستهلكه أيضًا Shift Management (نفس العدّاد) |

---

## 9. Consumed Events

| الحدث | من | كيف يُستخدَم داخل Order Fulfillment |
|-------|-----|----------------------------------------|
| `OrderPlaced` | Sales | يُشغِّل إنشاء `FulfillmentOrder` جديد ببنوده |
| `MenuItemActivated` | Menu | يُحدِّث Read Model محلي بالمنتجات الصالحة ومعلومات تحضيرها (`PreparationInfo`) |
| `MenuItemDeactivated` | Menu | يُحدِّث نفس الـ Read Model — لا يؤثر على طلبات قائمة (Business Rule #8) |
| `RecipeUpdated` | Menu | **غير مُستهلَك مباشرة** — Order Fulfillment لا يحتاج تفاصيل المكونات، فقط `PreparationInfo` (المحطة، الوقت التقديري)، وهذه لا تتغيّر بالضرورة مع كل تعديل وصفة |
| `ItemAvailabilityChanged` | Inventory | معلومة استشارية فقط (مثال: عرض تحذير بصري في شاشة المطبخ لو صنف أوشك ينفد) — **لا يمنع** أي انتقال حالة قائم بالفعل؛ القرار الملزم (منع الطلب من الأساس) مسؤولية Sales فقط |

---

## 10. Permissions

| الصلاحية (Atomic) | الوصف |
|---------------------|-------|
| `Fulfillment.View` | استعراض الطلبات قيد التنفيذ وحالاتها |
| `Fulfillment.UpdateStatus` | تحديث حالة طلب أو بند (Preparing→Ready→Served) |
| `Fulfillment.Cancel` | إلغاء طلب أثناء التحضير |
| `Fulfillment.Reject` | رفض طلب لتعذّر التنفيذ |

---

## 11. Data Model

> **ملاحظة معمارية:** مستوى عالٍ فقط (High-Level Schema Direction)، اتساقًا مع باقي Domain Documents.

جداول مرشحة (اتجاه عام فقط):
- `fulfillment_orders` (tenant_id, branch_id, order_id, status, created_at, ready_at?, served_at?, prepared_by_employee_id?, served_by_employee_id?, ...)
- `fulfillment_order_lines` (fulfillment_order_id, menu_item_id, quantity, selected_modifier_ids[], station, status, ...)

كل الجداول تحمل `tenant_id` إلزاميًا وفق سياسة RLS المُقرَّرة في Product Bible. `order_id` يُفهرَس (indexed) لضمان استعلام سريع عند ربط `OrderServed`/`OrderCancelled` بمرجعه في Sales.

---

## 12. Public APIs

> **ملاحظة:** تصميم الـ API التفصيلي يُؤجَّل لوثيقة API Design منفصلة. هنا فقط قائمة القدرات المتوقعة:

- استعراض قائمة الطلبات قيد التنفيذ (Order Queue) لكل محطة
- تحديث حالة طلب أو بند معيّن
- إلغاء أو رفض طلب مع سبب
- استعلام عن حالة طلب معيّن بمرجع `orderId`

---

## 12A. Offline-first execution constraint (RFC-006)

- Fulfillment state Branch-authoritative ويعمل على نفس Edge؛ أجهزة المطبخ/الباريستا تستمر عبر LAN دون Internet.
- استهلاك `OrderPlaced` ونشر Ready/Served/Cancelled/Rejected durable وidempotent عبر restart وsync retry.
- Cloud downstream consolidated projection، وليس command fallback لحالة التحضير.

## 13. Future Extensions

- **Kitchen Display System (KDS) / Barista Screen:** واجهات مخصصة لكل محطة تعرض الـ Order Queue الخاصة بها فقط — البنية الحالية (StationAssignment لكل بند) جاهزة لهذا دون إعادة تصميم.
- **QR Ordering:** السماح للعميل بإنشاء `OrderPlaced` مباشرة عبر مسح QR، دون تدخل كاشير — لا يؤثر على حدود هذا الدومين، فقط على مصدر إنشاء `Order` في Sales.
- **Delivery Integration:** إضافة حالة `OutForDelivery` بين `Ready` و`Served` لطلبات التوصيل، مع تكامل خارجي لاحق.
- **Per-Line Timing Analytics:** استخدام الوقت الفعلي بين `Preparing` و`Ready` لكل بند لتحليل أداء كل محطة عمل (يخدم AI-Readiness المذكور في Product Bible).
- **Priority Queue بدل FIFO البسيط:** دعم أولويات مختلفة (طلبات VIP، طلبات مستعجلة) بدل الترتيب الزمني البسيط في MVP.

---

## 14. Commercial Packaging Recommendation

> ملاحظة: هذه التوصية معلوماتية بحتة، وليست قيدًا معماريًا (راجع RFC-003). تغييرها لا يتطلب أي تعديل على تصميم هذا الدومين.

**Capability: عمليات المطبخ**
Capability ID: `OF.KitchenOps`
Recommended Packaging: Starter ✅ | Growth ✅ | Professional ✅ | Enterprise ✅

---

*نهاية Domain Document: Order Fulfillment — v1.*
