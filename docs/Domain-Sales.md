# Domain Document: Sales

**Type:** Domain Document
**Domain Classification:** Core Business Domain (Cafe Engine)
**Depends on:** RFC-001 (Context Map), RFC-002 (Event Catalog)
**Status:** **Approved — Business Rule changes require RFC-005 Change Management**

---

## 1. Domain Purpose

إدارة عملية البيع بالكامل من لحظة إنشاء الطلب حتى إتمامه ماليًا: بناء المعاملة، تطبيق الخصومات، تحديد حالة الدفع، وإصدار الفاتورة كتمثيل رسمي للمعاملة التجارية. Sales هو **Source of Truth** الوحيد لأي قرار مالي يخص عملية بيع.

---

## 2. Responsibilities

- إنشاء وإدارة الطلبات (Orders) وبنودها (Order Lines)
- حساب الإجمالي، تطبيق الخصومات، وحساب الضرائب على مستوى المعاملة
- تسجيل طريقة الدفع وحالة السداد (Payment Status)
- إصدار الفاتورة (Invoice) كتمثيل للمعاملة التجارية
- إتمام البيع (Sale Completion) واعتماده كمصدر حقيقة للإيراد
- إدارة المرتجعات الكاملة أو الجزئية (Refunds)
- اتخاذ القرار النهائي بتطبيق أو رفض أي خصم، بغض النظر عن مصدر الاقتراح

---

## 3. Out of Scope

| المفهوم | لماذا خارج النطاق | من يملكه |
|---------|---------------------|----------|
| بوابات الدفع الفعلية (Payment Gateways) | Sales تُسجّل طريقة وحالة الدفع فقط كخاصية على المعاملة، لا تدير تكامل بوابات دفع متعددة | Domain مستقبلي منفصل (Payments) |
| خصم المخزون | Sales تنشر حدث فقط؛ لا تنفّذ أي منطق مخزني | Inventory |
| تعريف المنتجات وأسعارها الحالية أو المجدولة | Sales تستهلك السعر الحالي فقط عبر Read Model محلي، ولا تنشئه أو تحفظ جدول نسخ الأسعار المستقبلية | Menu |
| بيانات العميل ونقاط الولاء | Sales تستهلك `customerId` فقط كمرجع | CRM |
| تتبع تنفيذ الطلب (Preparing/Ready/Served) | مسؤولية تشغيلية منفصلة تمامًا عن القرار المالي | Order Fulfillment |
| اقتراح أهلية الخصم | Sales تستقبل الاقتراح فقط وتقرر التطبيق | CRM |

---

## 4. Business Concepts

| المفهوم | التعريف |
|---------|---------|
| **Order** | تمثيل رحلة تنفيذ الطلب داخل الكافيه (حالة تشغيلية)، ويحمل `shiftId` إلزاميًا. **كيان منفصل تمامًا عن Sale** — Sale تشير إليه عبر `orderId` كمرجع صريح، وليس نفس الكيان بحالتين. هذا الفصل يسمح مستقبلًا بـ Split Payments، Table Transfer، وMerge Orders دون تعقيد بنية Sale نفسها |
| **OrderLine** | بند مفرد داخل الطلب: منتج، كمية، و`unitPrice: Money` موجبة تُنسخ من السعر الحالي وقت إنشاء Order وتبقى Snapshot ثابتًا، مع ملاحظات اختيارية |
| **MenuItemSalesReadModel** | Projection محلي داخل Sales بالحقول فقط: `tenantId`, `menuItemId`, `isActive`, `currentBasePrice: Money`, `priceEffectiveFrom`, `lastChangedAt`. لا يحتوي `priceVersions[]` أو جداول مستقبلية أو Inventory availability أو Preparation Info أو Modifier pricing |
| **Sale** | المعاملة المالية، تحمل `orderId` كمرجع للطلب التشغيلي الذي نشأت منه — غير قابلة للتعديل بعد الإتمام (Immutable) إلا عبر Refund |
| **Invoice** | التمثيل الرسمي/المطبوع للمعاملة، مُشتق من Sale، وليس كيانًا منفصلًا له دورة حياة خاصة |
| **Discount** | تخفيض قيمة مُطبَّق على معاملة، إما يدويًا من الكاشير أو بناءً على اقتراح خارجي (CRM) |
| **PaymentStatus** | حالة السداد: `Pending`, `Paid`, `PartiallyPaid`, `Refunded`, `PartiallyRefunded` |
| **Refund** | عكس مالي كلي أو جزئي لمعاملة Sale سابقة |
| **RefundLineDisposition** | تصنيف مصير كل بند مُسترجَع على حدة (Enum قابل للتوسعة): `Restock` (يعود فعليًا للمخزون)، `Discard` (لا يعود — يُعتبَر هدرًا)، `InspectionRequired` (حالة مُعلَّقة تحتاج مراجعة يدوية قبل تحديد المصير النهائي) — يُحدَّد وقت تسجيل المرتجع نفسه، وليس سياسة عامة ثابتة |

---

## 5. Business Rules

1. لا يمكن إتمام Sale (`SaleCompleted`) إلا إذا كان هناك بند واحد على الأقل في المعاملة.
2. لا يمكن إتمام Sale إلا بعد اعتماد الدفع (Payment Approved) — سواء نقدًا أو أي وسيلة أخرى مُسجَّلة.
3. الخصم يُطبَّق فقط بواسطة Sales، بغض النظر عن مصدر الاقتراح (يدوي من الكاشير أو مُقترَح من CRM).
4. قيمة أي خصم لا يجوز أن تتجاوز الحد الأقصى المسموح به في إعدادات الفرع (Configurable per Tenant/Branch).
5. لا يمكن استرجاع (Refund) معاملة لم تُكتمَل بعد (`SaleCompleted` يجب أن يسبق أي `SaleRefunded`).
6. لا يجوز أن يتجاوز إجمالي المبالغ المُسترجَعة عبر عمليات Refund متعددة إجمالي المعاملة الأصلية.
7. لا يجوز استرجاع نفس البنود مرتين ضمن معاملة واحدة (منع الاسترجاع المزدوج).
7ب. **كل بند مُسترجَع يجب أن يحمل `disposition` صريحًا** (`Restock`/`Discard`/`InspectionRequired`) — لا يوجد افتراض ضمني واحد لكل الحالات؛ الأثر المخزني الفعلي (إن وُجد) يعتمد بالكامل على هذا التصنيف لكل بند على حدة.
8. تنفيذ عملية Refund يتطلب صلاحية `POS.Refund` صراحة، ولا تُطبَّق تلقائيًا.
9. تطبيق أي خصم يتطلب صلاحية `POS.ApplyDiscount` صراحة.
10. حالة تنفيذ الطلب (Order Fulfillment) لا تُغيّر أبدًا القرار المالي لمعاملة مكتملة بالفعل؛ أي تعارض (مثل إلغاء الطلب بعد إتمام الدفع) يُدار عبر مسار Refund صريح ومنفصل، وليس تراجعًا تلقائيًا.
11. إجمالي المعاملة (`totalAmount`) يجب أن يطابق حسابيًا مجموع بنود الطلب مطروحًا منه أي خصم مُطبَّق، قبل اعتماد `SaleCompleted`.
12. **لا يمكن إتمام Sale إلا في ظل وجود شيفت (`shiftId`) مفتوح فعليًا** للفرع/الكاشير وقت المعاملة (راجع Shift Management Domain في RFC-001 §4.3). Sales يتحقق من ذلك عبر Read Model محلي مُحدَّث من أحداث `ShiftOpened`/`ShiftClosed`.
13. **لا يمكن إنشاء Order (`OrderPlaced`) إلا في ظل وجود شيفت مفتوح فعليًا** أيضًا — نفس الشرط يُطبَّق من بداية دورة التشغيل، وليس فقط عند الدفع، لأن الشيفت يمثّل بداية يوم التشغيل ولازم كل العمليات التشغيلية ترتبط بيه من اللحظة الأولى.
14. **كل `SaleCompleted` يجب أن يحمل `orderId` صالحًا** يشير لـ Order سابق (`OrderPlaced`) — لا يمكن إتمام معاملة بيع دون طلب تشغيلي أصلي مرتبط بها.
15. **عند `NegativeStockPolicy=Strict` (سياسة Tenant، مُعرَّفة في Domain-Inventory.md):** لا يُقبَل أي بند في `OrderPlaced` لمنتج (`menuItemId`) مُصنَّف حاليًا كغير متاح (`isAvailable=false`) في الـ Availability Read Model المحلي لـ Sales (مُحدَّث من `ItemAvailabilityChanged`). **Sales لا تعرف مستويات المخزون نفسها إطلاقًا** — فقط حالة "متاح/غير متاح" لكل منتج، محسوبة بالكامل داخل Inventory. هذا التحقق **Eventually Consistent وليس ضمانًا فوريًا مطلقًا** (راجع الملاحظة المعمارية في RFC-002 §6.6) — في حالات نادرة جدًا من التزامن الدقيق، قد يُقبَل طلب قبل وصول تحديث الحالة؛ Inventory يبقى خط الدفاع الأخير وقت معالجة `SaleCompleted` الفعلي.
16. عند `NegativeStockPolicy=Warning` أو `Ignore`، حالة عدم التوفر لا تمنع إنشاء الطلب — قد تُعرَض كمعلومة استشارية فقط للكاشير (قرار UX، ليس قيدًا معماريًا).
17. `createdByEmployeeId` (على `OrderPlaced`) و`completedByEmployeeId` (على `SaleCompleted`) **حقلان اختياريان دائمًا** — لأغراض تحليلية بحتة (Reporting KPIs مثل Top Cashiers)، وليسا شرطًا مسبقًا لأي من الحدثين.
18. **لا يمكن إنشاء Order أو نشر `OrderPlaced` إلا إذا احتوى Order على `OrderLine` واحد صالح على الأقل. يكون `OrderLine` صالحًا لهذه القاعدة إذا كان `quantity > 0`، وكان `menuItemId` موجودًا وفعّالًا في `MenuItemSalesReadModel`، وكان له `currentBasePrice` صالح بقيمة موجبة يمكن نسخه إلى `OrderLine.unitPrice` وقت إنشاء Order. يجب أن تستخدم كل بنود Order عملة واحدة. التحقق من توفر المخزون لا يدخل في تعريف صلاحية البند هنا؛ بل يُطبَّق بصورة مستقلة وفق Business Rules #15 و#16.**

---

## 6. Use Cases / Business Flows

### 6.1 إتمام عملية بيع عادية (Happy Path)

1. عند بدء Create Order، تقرأ Sales `NegativeStockPolicy` مرة واحدة عبر `INegativeStockPolicyProvider` (الافتراضي `Warning`) وتتحقق من Business Rules #13 و#15 و#16 و#18.
2. تنسخ Sales `MenuItemSalesReadModel.currentBasePrice` الموجب إلى `OrderLine.unitPrice` لكل بند. كل البنود تستخدم عملة واحدة، وأي تغيّر سعر لاحق لا يعيد تسعير Order.
3. في أول Slice تنفيذي فقط، يجب أن يكون `selectedModifierIds.length === 0`. أي قائمة غير فارغة تُرفض صراحةً؛ لا تُتجاهل، ولا تُسعَّر بالسعر الأساسي فقط، ولا تُحفَظ، ولا يُنشر `OrderPlaced`.
4. Sales تنشر `OrderPlaced` حاملًا `orderId` و`shiftId` الإلزاميين → Order Fulfillment يبدأ التنفيذ التشغيلي.
5. الكاشير (أو النظام) يُطبّق خصمًا إن وُجد — يدويًا، أو بناءً على `DiscountEligibilityFlagged` من CRM.
6. الكاشير يُثبّت طريقة الدفع ويعتمد السداد.
7. Sales تتحقق من استيفاء كل الشروط المسبقة وتُصدر `SaleCompleted` حاملًا `orderId` كمرجع صريح للطلب الأصلي.
8. Inventory وCRM وReporting وNotifications يستهلكون الحدث كل حسب مسؤوليته.

### 6.2 تطبيق خصم مُقترَح من CRM

1. CRM تنشر `DiscountEligibilityFlagged` لعميل معيّن أثناء أو قبل عملية البيع.
2. Sales تعرض الاقتراح للكاشير كخيار متاح، وليس كتطبيق تلقائي.
3. الكاشير يقرر القبول أو الرفض.
4. عند القبول: Sales تُطبّق الخصم فعليًا وتنشر `DiscountApplied` كجزء من دورة إتمام البيع.

### 6.3 مرتجع كامل بعد إتمام البيع

1. طلب استرجاع يُقدَّم لمعاملة (`saleId`) مكتملة مسبقًا.
2. النظام يتحقق: هل `saleId` مكتمل؟ هل يوجد مرتجع سابق لنفس البنود؟ هل المُعتمِد يملك `POS.Refund`؟
3. عند استيفاء الشروط: Sales تنشر `SaleRefunded` بكامل البنود والمبلغ.
4. Inventory (لاسترجاع المخزون إن انطبق)، CRM، Reporting، Notifications يستهلكون الحدث.

### 6.4 محاولة إتمام بيع بدون دفع معتمد (Rejection Path)

1. الكاشير يحاول إتمام Sale دون اعتماد دفع.
2. Sales ترفض العملية داخليًا (Validation Failure) ولا تنشر أي حدث.
3. لا يوجد أثر خارجي على أي Domain آخر — الفشل يبقى محليًا داخل Sales.

---

## 7. Aggregate Roots & Entities

| الكيان | النوع | ملاحظات |
|--------|-------|---------|
| **Sale** | Aggregate Root | يضبط كل التعديلات على حالته (بما فيها الخصومات والدفع) عبر نفسه فقط؛ لا كيان خارجي يُعدّل Sale مباشرة |
| **Order** | Aggregate Root مستقل (مملوك لـ Sales) | يمثّل "ما طُلِب تجاريًا" (المنتجات، الكميات، التخصيصات)؛ منفصل تمامًا عن Sale ككيانين داخل نفس الدومين، مرتبطين بمرجع `orderId` فقط — وليس نفس الكيان بحالتين. **ملاحظة:** هذا مختلف عن `FulfillmentOrder` المملوك لـ Order Fulfillment (راجع RFC-001 §4.2)، الذي يتتبّع حالة التحضير فقط (Preparing/Ready/Served) وليس محتوى الطلب التجاري نفسه؛ الاثنان يشيران لنفس `orderId` كل من زاويته |
| OrderLine | Entity (جزء من Order Aggregate) | لا وجود مستقل خارج Order |
| Discount (Applied) | Value Object | لا هوية مستقلة؛ خاصية على Sale |
| Refund | Entity (مرتبط بـ Sale، لكن له دورة حياة ومعرّف خاص `refundId`) | يُعامَل كعملية منفصلة قابلة للتتبع بشكل مستقل عن Sale الأصلية |
| Invoice | Value Object / Read Representation | مُشتق من Sale، وليس له حالة مستقلة قابلة للتعديل |

---

## 8. Published Events

(تفاصيل كاملة موثّقة في RFC-002 §3 — هنا فقط قائمة مرجعية)

| الحدث | متى |
|-------|-----|
| `OrderPlaced` | عند إنشاء طلب جديد جاهز للتنفيذ التشغيلي |
| `SaleCompleted` | عند اعتماد الدفع وإتمام المعاملة ماليًا |
| `SaleRefunded` | عند اعتماد مرتجع كلي أو جزئي |
| `DiscountApplied` | عند تطبيق خصم فعليًا على معاملة |

---

## 9. Consumed Events

| الحدث | من | كيف يُستخدَم داخل Sales |
|-------|-----|--------------------------|
| `OrderServed` | Order Fulfillment | إشارة إغلاق تشغيلي لدورة الطلب — لا تُغيّر الحالة المالية، لكن قد تُستخدَم لتأكيد ربط سجل تشغيلي بمعاملة مالية مكتملة |
| `OrderCancelled` | Order Fulfillment | إن وُجدت معاملة مالية مرتبطة ولم تُكتمَل بعد، Sales تستخدم هذا كإشارة لعدم المتابعة نحو `SaleCompleted`؛ إن كانت مكتملة بالفعل، لا يُحدِث تغييرًا تلقائيًا (يتطلب Refund صريح — راجع Business Rule #10) |
| `OrderRejected` | Order Fulfillment | نفس منطق `OrderCancelled` |
| `DiscountEligibilityFlagged` | CRM | يُعرَض كخيار استشاري للكاشير وقت البيع؛ لا يُطبَّق تلقائيًا (راجع Use Case 6.2) |
| `ShiftOpened` | Shift Management | يُحدِّث Read Model محلي داخل Sales يشير إلى وجود شيفت مفتوح — شرط مسبق لكل من `OrderPlaced` و`SaleCompleted` |
| `ShiftClosed` | Shift Management | يُحدِّث نفس الـ Read Model ليشير إلى إغلاق الشيفت — يمنع أي `OrderPlaced` أو `SaleCompleted` جديد لهذا الشيفت بعد هذه اللحظة |
| `ItemAvailabilityChanged` | Inventory | يُحدِّث Read Model محلي بحالة "متاح/غير متاح" لكل منتج — **بدون أي مستوى مخزون فعلي** — يُستخدَم كبوابة تحقق عند `NegativeStockPolicy=Strict` فقط (راجع Business Rule #15) |
| `MenuItemActivated` | Menu | ينشئ/يحدّث `MenuItemSalesReadModel` بالسعر الأساسي الحالي الموجب ويجعل الصنف فعّالًا |
| `MenuItemPriceChanged` | Menu | يحدّث `currentBasePrice`, `priceEffectiveFrom`, و`lastChangedAt` بصورة idempotent عبر `priceChangeId`; لا يحتفظ بالجدول المستقبلي ولا يعيد تسعير Orders قائمة |
| `MenuItemDeactivated` | Menu | يجعل الصنف غير فعّال للطلبات الجديدة دون التأثير على Orders قائمة |

---

## 10. Permissions

| الصلاحية (Atomic) | الوصف |
|---------------------|-------|
| `POS.CreateOrder` | إنشاء طلب جديد (Order) — تسمية مُصحَّحة بعد الفصل بين Order وSale؛ الصلاحية القديمة `POS.CreateSale` كانت غير دقيقة لأنها تُستخدَم فعليًا عند إنشاء الطلب، قبل وجود أي Sale فعلية |
| `POS.CompleteSale` | اعتماد إتمام المعاملة ماليًا |
| `POS.ApplyDiscount` | تطبيق خصم على معاملة |
| `POS.Refund` | تنفيذ مرتجع كلي أو جزئي |
| `POS.ViewSalesHistory` | استعراض سجل المعاملات السابقة |

جميعها صلاحيات ذرية قابلة للتخصيص عبر أي Role (راجع نموذج Permission → Role → User في Product Bible).

---

## 11. Data Model

> **ملاحظة معمارية:** هذا القسم يُترك أعلى مستوى فقط في هذه المرحلة (High-Level Schema Direction)، تمشيًا مع مبدأ "بناء المعمارية من المسؤوليات التجارية أولًا". التصميم التفصيلي الكامل لقاعدة البيانات (الحقول، الفهارس، القيود) يُبنى في وثيقة منفصلة بعد اعتماد هذا الـ Domain Document.

جداول مرشحة (اتجاه عام فقط):
- `orders` (tenant_id, branch_id, shift_id, created_by_employee_id?, status, created_at, ...) — `shift_id` إلزامي، والكيان منفصل عن `sales`
- `order_lines` (order_id, menu_item_id, quantity, unit_price_amount_minor, currency_code, selected_modifier_ids[], notes, ...) — السعر Snapshot ثابت موجب
- `menu_item_sales_read_model` (tenant_id, menu_item_id, is_active, current_base_price_amount_minor, currency_code, price_effective_from, last_changed_at) — بلا تاريخ أسعار أو جداول مستقبلية
- `sales` (tenant_id, branch_id, order_id, shift_id, customer_id?, completed_by_employee_id?, total_amount, payment_status, payment_method, completed_at, ...)
- `sale_lines` (sale_id, menu_item_id, quantity, unit_price, ...)
- `sale_discounts` (sale_id, discount_type, value, applied_by, source, ...)
- `refunds` (sale_id, refund_id, refunded_amount, reason, approved_by, refunded_at, ...)
- `refund_lines` (refund_id, menu_item_id, quantity, ...)

كل الجداول تحمل `tenant_id` إلزاميًا وفق سياسة RLS المُقرَّرة في Product Bible.

---

## 12. Public APIs

> **ملاحظة:** تصميم الـ API التفصيلي (Endpoints, Request/Response Schemas) يُؤجَّل لوثيقة API Design منفصلة. هنا فقط قائمة القدرات (Capabilities) المتوقعة من منظور تجاري:

- إنشاء طلب/معاملة بيع
- إضافة/تعديل/حذف بند قبل الإتمام
- تطبيق خصم
- اعتماد الدفع وإتمام المعاملة
- تنفيذ مرتجع (كلي/جزئي)
- استعلام عن معاملة أو سجل معاملات

---

## 12A. Offline-first execution constraint (RFC-006)

- `Create Order`, `OrderPlaced`, Sale completion, cash payment، وتسجيل الدفع الخارجي المؤكد تُحسم على Branch Edge دون Cloud.
- Order/Sale/PaymentStatus Branch-authoritative وimmutable بعد الإتمام؛ Cloud ingestion لا يستخدم Last-write-wins.
- Business state وLocal Outbox يلتزمان atomically؛ retry لا يكرر business effect.
- Sales تستخدم آخر Menu/Settings/access projections متزامنة، والواجهة التشغيلية تستدعي Edge API عبر LAN وتعرض Sync state.

## 13. Future Extensions

- **Payments Domain مستقل:** فصل منطق بوابات الدفع الفعلية عن Sales عند الحاجة لدعم وسائل دفع إلكترونية متعددة.
- **Split Payments:** دعم دفع معاملة واحدة بأكثر من وسيلة دفع (نقدًا + بطاقة).
- **Partial Refund per Line:** دعم استرجاع بند واحد فقط من معاملة متعددة البنود (مذكور مبدئيًا، لكن يحتاج تفصيلًا إضافيًا لاحقًا).
- **e-Invoice Adapter:** طبقة امتثال ضريبي قُطرية (مثل ETA المصرية) تُبنى فوق Invoice كـ Adapter منفصل، دون تعديل Sales نفسها (راجع Product Bible §8).
- **Approval Workflow for Refunds:** ربط `POS.Refund` بسير اعتماد (Approval Workflow) بدل التنفيذ المباشر، عند تفعيل محرك الاعتماد العام على مستوى Core Platform.

---

## 14. Commercial Packaging Recommendation

> ملاحظة: هذه التوصية معلوماتية بحتة، وليست قيدًا معماريًا (راجع RFC-003). تغييرها لا يتطلب أي تعديل على تصميم هذا الدومين.

**Capability: نقطة البيع الأساسية**
Capability ID: `SALES.POS`
Recommended Packaging: Starter ✅ | Growth ✅ | Professional ✅ | Enterprise ✅

**Capability: الخصومات**
Capability ID: `SALES.Discounts`
Recommended Packaging: Starter ✅ | Growth ✅ | Professional ✅ | Enterprise ✅

**Capability: المرتجعات**
Capability ID: `SALES.Refunds`
Recommended Packaging: Starter ✅ | Growth ✅ | Professional ✅ | Enterprise ✅

---

*نهاية Domain Document: Sales — v1.*
