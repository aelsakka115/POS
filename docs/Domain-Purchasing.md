# Domain Document: Purchasing

**Type:** Domain Document
**Domain Classification:** Core Business Domain (Cafe Engine) — Operational Procurement
**Depends on:** RFC-001 (Context Map), RFC-002 (Event Catalog), Domain-Suppliers-Business-Accounts.md
**Reference Template:** Domain-Sales.md, Domain-Menu.md, Domain-Inventory.md
**Status:** **Approved / Frozen** — Receiving Variance، Price Variance، وSupplier Lead Time مُدمَجة في MVP؛ Goods Receipt Without PO مؤجَّلة رسميًا كـ Future Extension

---

## 1. Domain Purpose

إدارة دورة الشراء التشغيلية البحتة: من إنشاء أمر شراء لمورد نشط، حتى استلام البضاعة فعليًا (كليًا أو جزئيًا). لا علاقة لهذا الدومين بأي التزام مالي — ذلك بالكامل مسؤولية Suppliers & Business Accounts. Purchasing هو الجسر التشغيلي الوحيد الذي يُسمح له بزيادة المخزون فعليًا، عبر حدث واحد فقط: `GoodsReceived`.

---

## 2. Responsibilities

- إنشاء وإدارة أوامر الشراء (Purchase Orders) لمورد نشط
- تتبّع حالة أمر الشراء عبر دورة حياته (مُنشَأ → مُستلَم جزئيًا → مُستلَم بالكامل / مُلغى)
- تسجيل استلام البضاعة فعليًا (Goods Receiving) — كليًا أو جزئيًا، عبر استلام واحد أو أكثر لنفس أمر الشراء
- نشر أثر الاستلام كحدث يُستهلَك من Inventory لزيادة المخزون فعليًا

---

## 3. Out of Scope

| المفهوم | لماذا خارج النطاق | من يملكه |
|---------|---------------------|----------|
| بيانات المورد الأساسية | Purchasing تحتفظ فقط بنسخة محلية خفيفة (Read Model) للتحقق المرجعي | Suppliers & Business Accounts |
| أي التزام مالي (فاتورة، رصيد، دفعات) | إنشاء أمر شراء أو حتى استلام بضاعة **لا يُنشئ أي التزام مالي تلقائيًا** — الفاتورة تُسجَّل بشكل مستقل تمامًا | Suppliers & Business Accounts |
| رصيد المخزون بعد الاستلام | Purchasing تنشر الحدث فقط؛ التحديث الفعلي للرصيد والتقييم المالي مسؤولية منفصلة | Inventory |
| تعريف الأصناف المُشتراة (StockItem) | Purchasing تشير لـ `stockItemId` كمرجع خارجي فقط | Inventory |

---

## 4. Business Concepts

| المفهوم | التعريف |
|---------|---------|
| **PurchaseOrder** | التزام تشغيلي بشراء كميات محددة من مورد نشط، له حالة ودورة حياة |
| **PurchaseOrderLine** | بند داخل أمر الشراء: `stockItemId`، الكمية المطلوبة، التكلفة المتوقعة للوحدة |
| **PurchaseOrderStatus** | `Draft` → `Sent` → `PartiallyReceived` → `Received` (أو `Cancelled` من أي حالة قبل الاكتمال) |
| **GoodsReceipt** | تسجيل استلام فعلي لبضاعة مقابل أمر شراء، قد يكون جزئيًا أو كاملًا |
| **GoodsReceiptLine** | بند داخل الاستلام: `stockItemId`، الكمية المُستلَمة فعليًا، التكلفة الفعلية للوحدة، وأي فروقات مسجَّلة |
| **ReceivingVariance** | الفرق بين الكمية المطلوبة والمُستلَمة فعليًا في بند استلام، مُصنَّف بنوع واضح: `Shortage` (نقص) / `Excess` (زيادة) / `Damaged` (تالف) / `WrongItem` (صنف خاطئ)، مع سبب نصي اختياري |
| **PriceVariance** | الفرق بين التكلفة المتوقعة (من أمر الشراء) والتكلفة الفعلية وقت الاستلام لنفس البند — لا يمنع الاستلام أبدًا، فقط يُسجَّل |
| **SupplierLeadTime** | مدة التوريد، مُشتقة تلقائيًا من الفرق بين تاريخ إنشاء أمر الشراء وتاريخ أول/آخر استلام مرتبط به |

---

## 5. Business Rules

1. لا يمكن إنشاء أمر شراء إلا لمورد نشط (يُتحقَّق عبر Read Model محلي مُحدَّث من `SupplierCreated`/`SupplierDeactivated`).
2. أمر الشراء يجب أن يحتوي على بند واحد على الأقل، وكل `stockItemId` مُشار إليه يجب أن يكون صنفًا نشطًا معرَّفًا مسبقًا في Inventory (يُتحقَّق عبر Read Model محلي مُحدَّث من `StockItemCreated`/`StockItemDeactivated`).
3. الكمية المُستلَمة في أي `GoodsReceipt` **قد تختلف** عن الكمية المتبقية غير المُستلَمة بعد في نفس البند من أمر الشراء — الفرق (نقصًا أو زيادة) **لا يمنع تسجيل الاستلام أبدًا**، بل يُسجَّل كـ `ReceivingVariance` واضح (راجع Business Rule #9).
4. أمر الشراء يمكن استلامه على أكثر من دفعة (استلامات جزئية متعددة)؛ حالته تتحول تلقائيًا لـ `Received` فقط عند اكتمال استلام كل البنود بالكامل.
5. لا يمكن إلغاء أمر شراء (`PurchaseOrderCancelled`) بعد اكتمال استلامه بالكامل.
6. أمر شراء مُلغى **لا يقبل أي استلام جديد** ضده.
7. **`GoodsReceived` هو المسار الوحيد المسموح به لزيادة المخزون فعليًا** — لا مسار آخر (لا فاتورة، لا أمر شراء بحد ذاته) يُنشئ حركة إدخال في Inventory.
8. إنشاء أمر شراء أو تسجيل استلام **لا يُنشئ تلقائيًا** أي فاتورة أو التزام مالي — ذلك فعل منفصل يُسجَّل يدويًا في Suppliers & Business Accounts، مع إمكانية الربط الاختياري بـ `relatedGoodsReceiptId` لأغراض المطابقة الثلاثية فقط.
9. **أي فرق بين الكمية المطلوبة والمُستلَمة فعليًا في بند معيّن يُسجَّل إلزاميًا كـ `ReceivingVariance`** بنوع مصنَّف (`Shortage`/`Excess`/`Damaged`/`WrongItem`) — الفرق ليس مجرد رقم مختلف، بل سجل رسمي دائم ضمن الاستلام نفسه، لأغراض تقييم أداء الموردين لاحقًا.
10. **فرق السعر بين المتوقع (أمر الشراء) والفعلي (الاستلام) لا يمنع الاستلام أبدًا** — يُسجَّل كـ `PriceVariance` واضح ضمن نفس البند، ويُستخدَم Actual Unit Cost فقط في تحديث تقييم المخزون (Weighted Average) في Inventory، بغض النظر عن التوقع الأصلي.
11. **Purchasing تحتفظ تلقائيًا بتاريخ أول وآخر `GoodsReceipt` مرتبط بكل أمر شراء** (`firstGoodsReceiptAt`, `lastGoodsReceiptAt`)، إلى جانب تاريخ الإنشاء، دون أي منطق إضافي — هذه البيانات جاهزة فورًا لحساب متوسط مدة التوريد (Lead Time) لكل مورد في Reporting دون تعديل هذا الدومين لاحقًا.
12. أمر الشراء الواحد قد يُنشئ أكثر من `GoodsReceipt` (استلامات جزئية متعددة)؛ `firstGoodsReceiptAt` يُسجَّل عند أول استلام فقط ولا يتغيّر بعدها، بينما `lastGoodsReceiptAt` يُحدَّث مع كل استلام جديد.

---

## 6. Use Cases / Business Flows

### 6.1 إنشاء أمر شراء لمورد نشط

1. مدير الكافيه يُنشئ أمر شراء، يختار موردًا نشطًا (من القائمة المحلية المُتاحة عبر Read Model)، ويُضيف بندًا أو أكثر.
2. Purchasing تتحقق من استيفاء الشروط المسبقة (القسم 5).
3. تُنشر `PurchaseOrderCreated`.

### 6.2 استلام جزئي متكرر لنفس أمر الشراء، مع فروقات

1. عند وصول دفعة أولى من البضاعة: يُسجَّل `GoodsReceipt` بالكميات الفعلية المُستلَمة (قد تقل عن المطلوب).
2. لكل بند: إن اختلفت الكمية المُستلَمة عن المطلوبة، يُسجَّل `ReceivingVariance` بنوعه (مثال: طلبنا 10 كجم بن ووصل 8 فقط → `Shortage`؛ أو وصل صنف مختلف تمامًا → `WrongItem`).
3. إن اختلف السعر الفعلي وقت الاستلام عن السعر المتوقع في أمر الشراء، يُسجَّل `PriceVariance` — **الاستلام يُكمَل بشكل طبيعي دون أي رفض أو حظر**.
4. تُنشر `GoodsReceived` بكل هذه التفاصيل — Inventory تُحدِّث الرصيد بالكميات الفعلية المُستلَمة فقط، وبالتكلفة الفعلية (Actual Unit Cost).
5. تاريخ هذا الاستلام يُسجَّل تلقائيًا كـ `firstGoodsReceiptAt` (إن كان أول استلام لهذا الأمر) أو يُحدِّث `lastGoodsReceiptAt`.
6. حالة أمر الشراء تتحول لـ `PartiallyReceived`.
7. عند وصول باقي الكمية لاحقًا: يتكرر نفس المسار حتى اكتمال كل البنود.
8. عند اكتمال آخر بند: حالة أمر الشراء تتحول تلقائيًا لـ `Received`.

### 6.3 إلغاء أمر شراء قبل الاستلام

1. مدير الكافيه يُلغي أمر شراء لم يُستلَم بعد (أو استُلم جزئيًا فقط).
2. Purchasing تتحقق أن الأمر لم يكتمل استلامه.
3. تُنشر `PurchaseOrderCancelled` — لا استلام إضافي مسموح ضده بعد ذلك.

### 6.4 استلام بضاعة دون فاتورة مسجَّلة بعد (Decoupling في الممارسة)

1. البضاعة تصل فعليًا، ويُسجَّل `GoodsReceipt` فورًا — Inventory تُحدَّث في نفس اللحظة.
2. الفاتورة الورقية/الرسمية من المورد تصل لاحقًا (بعد يوم أو أكثر)، وتُسجَّل بشكل مستقل في Suppliers & Business Accounts، مع ربط اختياري بـ `goodsReceiptId` لأغراض المطابقة.
3. لا تعارض ولا انتظار بين المسارين — المخزون تحدَّث فعليًا، والالتزام المالي يُسجَّل بشكل منفصل تمامًا في وقته.

---

## 7. Aggregate Roots & Entities

| الكيان | النوع | ملاحظات |
|--------|-------|---------|
| **PurchaseOrder** | Aggregate Root | يضبط حالته ودورة حياته بالكامل |
| PurchaseOrderLine | Entity (جزء من PurchaseOrder Aggregate) | لا وجود مستقل خارج أمر الشراء |
| **GoodsReceipt** | Aggregate Root مستقل | يشير لـ `purchaseOrderId` كمرجع خارجي، لكن له دورة حياة ومعرّف خاص به (يسمح باستلامات متعددة لنفس الأمر) |
| GoodsReceiptLine | Entity (جزء من GoodsReceipt Aggregate) | لا وجود مستقل خارج الاستلام |

---

## 8. Published Events

(تفاصيل كاملة موثّقة في RFC-002 §8 — هنا فقط قائمة مرجعية)

| الحدث | متى |
|-------|-----|
| `GoodsReceived` | عند تسجيل استلام بضاعة فعلي (كليًا أو جزئيًا) — المسار الوحيد لزيادة المخزون |
| `PurchaseOrderCreated` | عند إنشاء أمر شراء جديد |
| `PurchaseOrderCancelled` | عند إلغاء أمر شراء قبل اكتمال استلامه |

---

## 9. Consumed Events

| الحدث | من | كيف يُستخدَم داخل Purchasing |
|-------|-----|-------------------------------|
| `SupplierCreated` | Suppliers & Business Accounts | يُحدِّث Read Model محلي بالموردين النشطين المتاحين لإنشاء أوامر شراء ضدهم |
| `SupplierDeactivated` | Suppliers & Business Accounts | يُحدِّث نفس الـ Read Model لمنع إنشاء أوامر شراء جديدة لمورد مُعطَّل |
| `StockItemCreated` | Inventory | يُحدِّث Read Model محلي بالأصناف الصالحة للإشارة إليها في بنود أمر الشراء |
| `StockItemDeactivated` | Inventory | يُحدِّث نفس الـ Read Model لمنع إضافة بند جديد لصنف مُعطَّل |

---

## 10. Permissions

| الصلاحية (Atomic) | الوصف |
|---------------------|-------|
| `Purchasing.View` | استعراض أوامر الشراء وحالاتها |
| `Purchasing.CreateOrder` | إنشاء أمر شراء جديد |
| `Purchasing.CancelOrder` | إلغاء أمر شراء قبل اكتمال استلامه |
| `Purchasing.ReceiveGoods` | تسجيل استلام بضاعة (كلي أو جزئي) |

---

## 11. Data Model

> **ملاحظة معمارية:** مستوى عالٍ فقط (High-Level Schema Direction)، اتساقًا مع باقي Domain Documents.

جداول مرشحة (اتجاه عام فقط):
- `purchase_orders` (tenant_id, branch_id, supplier_id, status, created_at, first_goods_receipt_at, last_goods_receipt_at, ...)
- `purchase_order_lines` (purchase_order_id, stock_item_id, quantity_ordered, quantity_received_so_far, expected_unit_cost, ...)
- `goods_receipts` (tenant_id, purchase_order_id, supplier_id, received_at, ...)
- `goods_receipt_lines` (goods_receipt_id, stock_item_id, quantity_ordered, quantity_received, unit_cost_expected, unit_cost_actual, variance_type?, variance_reason?, ...)

حقول `first_goods_receipt_at` و`last_goods_receipt_at` على `purchase_orders` تُحدَّث تلقائيًا مع كل `GoodsReceived` مُعالَج، دون أي منطق إضافي مطلوب من Reporting لاحقًا لحساب Lead Time. `variance_type` على `goods_receipt_lines` يُشتَق تلقائيًا بمقارنة `quantity_ordered` بـ `quantity_received` (أو يُدخَل يدويًا لحالات `Damaged`/`WrongItem` التي لا تظهر من الفرق الرقمي وحده).

كل الجداول تحمل `tenant_id` إلزاميًا وفق سياسة RLS المُقرَّرة في Product Bible.

---

## 12. Public APIs

> **ملاحظة:** تصميم الـ API التفصيلي يُؤجَّل لوثيقة API Design منفصلة. هنا فقط قائمة القدرات المتوقعة:

- إنشاء/إلغاء أمر شراء
- استعراض أوامر الشراء المفتوحة وحالاتها
- تسجيل استلام بضاعة (كلي أو جزئي) مقابل أمر شراء
- استعلام عن سجل الاستلامات لأمر شراء معيّن

---

## 13. Future Extensions

- **Purchase Requisition & Approval Workflow:** طلب شراء داخلي يحتاج اعتمادًا قبل تحوله لأمر شراء رسمي — يستفيد من محرك الاعتماد العام المذكور في Product Bible.
- **Automated Reorder Suggestions:** إنشاء أوامر شراء مقترحة تلقائيًا بناءً على `ReorderLevel` من Inventory (يخدم AI-Readiness).
- **Goods Receipt Without Purchase Order:** دعم استلام بضاعة مباشرة دون أمر شراء رسمي مسبق — سيناريو شائع في الكافيهات الصغيرة (طلب هاتفي/واتساب). **خارج MVP صراحة**، لكن يحتاج عند التنفيذ: جعل `purchaseOrderId` حقلًا اختياريًا (Nullable) في `GoodsReceipt` بدل إلزامي، مع تعريف مسار بديل لتسجيل التكلفة والمورد مباشرة دون مطابقة لأمر شراء. لا يتطلب إعادة هيكلة الـ Aggregate الحالي.
- **Formal Rejection Workflow:** توسعة `ReceivingVariance` من نوع `Damaged`/`WrongItem` إلى مسار رفض رسمي متكامل (إعادة للمورد، ربط بمطالبة تعويض) بدل مجرد تسجيل الفرق.
- **Multi-Supplier Price Comparison:** مقارنة أسعار نفس الصنف بين موردين مختلفين قبل إنشاء أمر الشراء.
- **Purchasing Budgets/Limits:** حدود إنفاق شهرية أو لكل فرع، مرتبطة بصلاحيات الاعتماد.
- **Supplier Lead Time Analytics في Dashboard:** استخدام `firstGoodsReceiptAt`/`lastGoodsReceiptAt` المُخزَّنة بالفعل لحساب وعرض متوسط مدة التوريد لكل مورد في Reporting — البيانات جاهزة من اليوم الأول، فقط يحتاج بناء التقرير نفسه.

---

## 14. Commercial Packaging Recommendation

> ملاحظة: هذه التوصية معلوماتية بحتة، وليست قيدًا معماريًا (راجع RFC-003). تغييرها لا يتطلب أي تعديل على تصميم هذا الدومين.

**Capability: أوامر الشراء**
Capability ID: `PUR.PurchaseOrders`
Recommended Packaging: Starter ❌ | Growth ✅ | Professional ✅ | Enterprise ✅

**Capability: استلام البضاعة**
Capability ID: `PUR.GoodsReceiving`
Recommended Packaging: Starter ❌ | Growth ✅ | Professional ✅ | Enterprise ✅

---

*نهاية Domain Document: Purchasing — v1.*
