# Domain Document: Suppliers & Business Accounts

**Type:** Domain Document
**Domain Classification:** Core Business Domain (Cafe Engine) — Financial Relationship Engine
**Depends on:** RFC-001 (Context Map), RFC-002 (Event Catalog)
**Reference Template:** Domain-Sales.md, Domain-Menu.md, Domain-Inventory.md
**Status:** **Approved** — الفصل بين هوية المورد والسجل المالي مُثبَّت؛ Credit Notes مؤجَّلة رسميًا كـ Future Extension

---

## 1. Domain Purpose

المحرك المالي الكامل لعلاقة الكافيه بمورّديه: بيانات المورد الأساسية، الالتزامات المالية الناتجة عن الشراء (Accounts Payable)، المدفوعات (كاملة أو جزئية)، الأرصدة المستحقة، الأعمار الزمنية للديون، وكشف حساب كل مورد. هذا الدومين **مستقل تمامًا** عن دورة الشراء التشغيلية (Purchasing) — لا يعرف شيئًا عن أوامر الشراء أو استلام البضاعة، ولا يؤثر أبدًا على المخزون.

---

## 2. Responsibilities

- إدارة بيانات الموردين الأساسية (Supplier Master Data) وتصنيفهم (Supplier Categories)
- تسجيل فواتير الشراء (Purchase Invoices) كالتزامات مالية (Accounts Payable Entries)
- تسجيل المدفوعات (كاملة أو جزئية) وتوزيعها على فاتورة أو أكثر (Payment Allocation)
- حساب الرصيد المستحق لكل مورد في أي لحظة (Outstanding Balance)
- تتبّع تواريخ الاستحقاق (Due Dates) وتصنيف الأعمار الزمنية للديون غير المسددة (Aging)
- إصدار تذكيرات دفع عند اقتراب أو تجاوز الاستحقاق (Payment Reminders)
- توليد كشف حساب كامل لكل مورد (Supplier Statement of Account): كل الفواتير والمدفوعات المرتبطة به تاريخيًا

---

## 3. Out of Scope

| المفهوم | لماذا خارج النطاق | من يملكه |
|---------|---------------------|----------|
| أوامر الشراء (Purchase Orders) | عملية تشغيلية بحتة، لا علاقة مالية مباشرة بها حتى تصبح فاتورة | Purchasing |
| استلام البضاعة (Goods Receipt) | حدث فعلي مادي، منفصل تمامًا عن الالتزام المالي | Purchasing |
| **أي تأثير مباشر على المخزون** | تسجيل فاتورة أو حتى سداد كامل لمورد **لا يُغيّر رصيد أي StockItem بأي شكل**؛ المخزون يتغيّر حصريًا عبر `GoodsReceived` من Purchasing | Inventory (عبر Purchasing فقط) |
| تعريف الأصناف المُشتراة (المنتج/المكوّن نفسه) | لا علاقة لهذا الدومين بتعريف ما يُشترى، فقط بالقيمة المالية للفاتورة ككل | Menu / Inventory |

---

## 4. Business Concepts

| المفهوم | التعريف |
|---------|---------|
| **Supplier** | الكيان الأساسي لمورّد: الاسم، بيانات التواصل، شروط الدفع (Payment Terms بالأيام)، الفئة، حالة النشاط |
| **SupplierCategory** | تصنيف الموردين (بن، ألبان، مخبوزات، مستلزمات تشغيلية...) لأغراض التنظيم والتقارير |
| **AccountsPayableEntry (PurchaseInvoice)** | التزام مالي مسجَّل تجاه مورد، بمبلغ وتاريخ استحقاق، مستقل تمامًا عن أي حركة مخزون |
| **Payment** | دفعة (كاملة أو جزئية) مُسجَّلة تجاه مورد، قد تُوزَّع على فاتورة واحدة أو أكثر |
| **PaymentAllocation** | جزء من دفعة مُخصَّص لفاتورة محددة — يحدد "كام اتسدد من إيه" |
| **OutstandingBalance** | الرصيد المستحق الحالي لمورد = مجموع الفواتير غير المسددة بالكامل، مطروحًا منه كل المدفوعات المُخصَّصة لها |
| **AgingBucket** | تصنيف زمني للديون غير المسددة حسب المدة المتجاوزة لتاريخ الاستحقاق (0-30 / 31-60 / 61-90 / +90 يوم) |
| **SupplierStatementOfAccount** | كشف كامل يعرض كل الفواتير والمدفوعات المرتبطة بمورد معيّن عبر الزمن، بترتيب زمني |

---

## 5. Business Rules

1. تسجيل فاتورة شراء (`PurchaseInvoiceRecorded`) يزيد الرصيد المستحق للمورد بمقدار قيمة الفاتورة فورًا.
2. **لا يجوز لأي فاتورة أو مورد أن يزيد رصيد أي StockItem في Inventory بأي شكل مباشر أو غير مباشر.**
3. حالة كل فاتورة تتحول تلقائيًا حسب مجموع المدفوعات المُخصَّصة لها: `Unpaid` (لا مدفوعات) → `PartiallyPaid` (مدفوعات جزئية) → `Paid` (سُدِّدت بالكامل).
4. مجموع `PaymentAllocation` المُخصَّصة لفاتورة واحدة لا يجوز أن يتجاوز قيمة الفاتورة الأصلية.
5. دفعة واحدة (`Payment`) يمكن أن تُوزَّع على فاتورة واحدة أو أكثر لنفس المورد — لا يجوز توزيعها على فواتير موردين مختلفين.
6. تاريخ الاستحقاق (`dueDate`) لكل فاتورة يُحسَب تلقائيًا بناءً على تاريخ التسجيل + `paymentTermsDays` الخاصة بالمورد وقت التسجيل، ما لم يُحدَّد تاريخ استحقاق يدوي صراحة.
7. الفاتورة تُعتبَر متأخرة السداد (Overdue) إذا تجاوز التاريخ الحالي `dueDate` ولم تُسدَّد بالكامل بعد — هذا يُشغِّل `SupplierPaymentOverdue`.
8. تعطيل مورد (`SupplierDeactivated`) **لا يحذف ولا يُخفي** أي فاتورة أو دفعة سابقة — السجل التاريخي دائم الوصول.
9. **لا يمكن تسجيل فاتورة جديدة** لمورد في حالة معطَّلة، لكن **يمكن تسجيل مدفوعات** لتسوية ديون قديمة حتى لو المورد معطَّل حاليًا (لتفادي "تجميد" ديون قائمة).
10. الرصيد المستحق (`OutstandingBalance`) لمورد معيّن هو دائمًا قيمة **محسوبة/مُشتقة** من مجموع الفواتير غير المسددة، وليس رقمًا يُعدَّل يدويًا مباشرة — أي تعديل يجب أن يمر عبر فاتورة أو دفعة رسمية.
11. الأعمار الزمنية (Aging) تُحسَب فقط على الفواتير ذات رصيد متبقٍ > 0، بناءً على عدد الأيام المتجاوزة لتاريخ الاستحقاق.

---

## 6. Use Cases / Business Flows

### 6.1 تسجيل فاتورة شراء جديدة

1. مسؤول الحسابات يُسجِّل فاتورة شراء لمورد نشط، بمبلغ وربط اختياري بأمر استلام (`relatedGoodsReceiptId`) لأغراض المطابقة الثلاثية فقط.
2. النظام يحسب تاريخ الاستحقاق بناءً على شروط الدفع الخاصة بالمورد.
3. تُنشر `PurchaseInvoiceRecorded` — الرصيد المستحق للمورد يزيد فورًا، **بدون أي أثر على المخزون**.

### 6.2 تسجيل دفعة جزئية موزَّعة على أكثر من فاتورة

1. مسؤول الحسابات يسجل دفعة بمبلغ معيّن لمورد لديه أكثر من فاتورة غير مسددة.
2. يُوزِّع المبلغ على فاتورة أو أكثر (`PaymentAllocation`)، بحيث لا يتجاوز أي تخصيص الرصيد المتبقي لتلك الفاتورة.
3. تُنشر `PaymentRecorded` — حالة كل فاتورة مُخصَّصة تُحدَّث (Unpaid→PartiallyPaid أو →Paid حسب المبلغ).
4. الرصيد المستحق الكلي للمورد ينخفض بمقدار الدفعة.

### 6.3 استعلام فوري عن الوضع المالي لمورد

1. مالك الكافيه يطلب رؤية: كم مستحق على هذا المورد؟ أي فواتير لسه مش مسددة؟ أي منها متأخر؟
2. النظام يحسب `OutstandingBalance` الحالي من مجموع الفواتير غير المسددة بالكامل.
3. يعرض قائمة الفواتير غير المسددة مع حالتها (Unpaid/PartiallyPaid) وتاريخ استحقاق كل منها.
4. يُميّز الفواتير المتجاوزة لتاريخ استحقاقها (Overdue) عن الفواتير في موعدها.

### 6.4 توليد كشف حساب كامل (Statement of Account)

1. مالك الكافيه يطلب كشف حساب شامل لمورد معيّن.
2. النظام يعرض كل الفواتير والمدفوعات المرتبطة بهذا المورد، مرتبة زمنيًا، بغض النظر عن حالة تفعيل المورد الحالية.

### 6.5 اكتشاف فاتورة متأخرة السداد وإصدار تذكير

1. عملية دورية (Scheduled Check) تفحص كل الفواتير غير المسددة بالكامل مقابل تاريخ اليوم.
2. أي فاتورة تجاوزت `dueDate`: تُنشر `SupplierPaymentOverdue` مع عدد الأيام المتجاوزة والمبلغ المتبقي.
3. Notifications يستهلك الحدث ويُصدر تذكيرًا للمستخدم المعني.

### 6.6 تعطيل مورد مع الحفاظ على تاريخه المالي

1. مالك الكافيه يُعطِّل موردًا (توقف تعامل).
2. تُنشر `SupplierDeactivated`.
3. Purchasing يمنع إنشاء أوامر شراء جديدة لهذا المورد (عبر Read Model محلي).
4. **الفواتير والمدفوعات السابقة تبقى ظاهرة بالكامل** في كشف الحساب، وأي دين قائم يبقى قابلًا للتسوية.

---

## 7. Aggregate Roots & Entities

| الكيان | النوع | ملاحظات |
|--------|-------|---------|
| **Supplier** | Aggregate Root | يضبط بياناته الأساسية وحالة تفعيله فقط — لا يحتفظ بالرصيد كحقل قابل للتعديل المباشر |
| SupplierCategory | Entity مستقل (Master Data) | يُشار إليه من Supplier، دورة حياة مستقلة |
| **AccountsPayableEntry (PurchaseInvoice)** | Aggregate Root مستقل | يضبط حالته (Unpaid/PartiallyPaid/Paid) بناءً على المدفوعات المُخصَّصة له فقط |
| **Payment** | Aggregate Root مستقل | يضبط توزيعه على الفواتير عبر PaymentAllocation؛ Immutable بعد التسجيل |
| PaymentAllocation | Value Object (جزء من Payment) | يحمل `invoiceId` والمبلغ المُخصَّص فقط |
| OutstandingBalance | Value Object محسوب (Derived/Projection) | لا تخزين مباشر كمصدر حقيقة؛ يُشتق دائمًا من AccountsPayableEntries + Payments |
| AgingBucket | Value Object محسوب (Derived/Projection) | يُحسَب وقت الطلب أو دوريًا، وليس كيانًا مخزَّنًا بحالة مستقلة |

> **ملاحظة تصميم مهمة:** الفصل بين `Supplier` (الهوية) و`AccountsPayableEntry`/`Payment` (السجل المالي) كـ Aggregates منفصلة متعمَّد — يضمن أن الرصيد المالي **لا يمكن أبدًا** أن يُعدَّل مباشرة دون المرور عبر فاتورة أو دفعة رسمية موثَّقة (Business Rule #10).

---

## 8. Published Events

(تفاصيل كاملة موثّقة في RFC-002 §7 — هنا فقط قائمة مرجعية)

| الحدث | متى |
|-------|-----|
| `SupplierCreated` | عند تسجيل مورد جديد |
| `SupplierDeactivated` | عند تعطيل مورد |
| `PurchaseInvoiceRecorded` | عند تسجيل فاتورة شراء كالتزام مالي جديد |
| `PaymentRecorded` | عند تسجيل دفعة (كاملة أو جزئية) |
| `SupplierPaymentOverdue` | عند تجاوز فاتورة غير مسددة تاريخ استحقاقها |

---

## 9. Consumed Events

| الحدث | من | كيف يُستخدَم داخل Suppliers & Business Accounts |
|-------|-----|--------------------------------------------------|
| `GoodsReceived` | Purchasing | **اختياري في MVP** — يُستخدَم فقط كمرجع للمطابقة الثلاثية (Three-Way Match: PO ↔ Goods Receipt ↔ Invoice) عند تسجيل الفاتورة يدويًا، وليس لأي تحديث تلقائي للرصيد أو المخزون |

---

## 10. Permissions

| الصلاحية (Atomic) | الوصف |
|---------------------|-------|
| `Suppliers.View` | استعراض بيانات الموردين وأرصدتهم |
| `Suppliers.Manage` | إنشاء/تعديل/تفعيل/تعطيل الموردين وفئاتهم |
| `Suppliers.RecordInvoice` | تسجيل فاتورة شراء جديدة |
| `Suppliers.RecordPayment` | تسجيل دفعة وتخصيصها على فواتير |
| `Suppliers.ViewStatement` | استعراض كشف حساب مورد كامل |
| `Suppliers.ViewAgingReport` | استعراض تقرير الأعمار الزمنية للديون |

---

## 11. Data Model

> **ملاحظة معمارية:** مستوى عالٍ فقط (High-Level Schema Direction)، اتساقًا مع باقي Domain Documents.

جداول مرشحة (اتجاه عام فقط):
- `supplier_categories` (tenant_id, name, ...)
- `suppliers` (tenant_id, category_id, name, contact_info, payment_terms_days, is_active, ...)
- `accounts_payable_entries` (tenant_id, supplier_id, amount, due_date, status, related_goods_receipt_id?, recorded_at, ...)
- `payments` (tenant_id, supplier_id, amount, payment_method, recorded_at, ...)
- `payment_allocations` (payment_id, invoice_id, allocated_amount, ...)

الرصيد المستحق (`OutstandingBalance`) والأعمار الزمنية (`AgingBucket`) **لا يُخزَّنان كحقول مستقلة** بل يُحسَبان ديناميكيًا (أو عبر Read Model مُحدَّث دوريًا لأغراض الأداء) من `accounts_payable_entries` + `payment_allocations`. كل الجداول تحمل `tenant_id` إلزاميًا وفق سياسة RLS.

---

## 12. Public APIs

> **ملاحظة:** تصميم الـ API التفصيلي يُؤجَّل لوثيقة API Design منفصلة. هنا فقط قائمة القدرات المتوقعة:

- إدارة الموردين وفئاتهم (إنشاء/تعديل/تفعيل/تعطيل)
- تسجيل فاتورة شراء
- تسجيل دفعة وتوزيعها على فاتورة أو أكثر
- استعلام عن الرصيد المستحق الحالي لمورد
- استعلام عن الفواتير غير المسددة (مع تمييز المتأخر منها)
- توليد كشف حساب كامل لمورد (Statement of Account)
- توليد تقرير أعمار الديون (Aging Report) على مستوى كل الموردين أو مورد محدد

---

## 13. Future Extensions

- **Multi-Currency Supplier Balances:** دعم فواتير ومدفوعات بعملات مختلفة لكل مورد — يتوافق مع مبدأ Multi-currency من اليوم الأول في Product Bible، حتى لو غير مُفعَّل في MVP.
- **Supplier Credit Notes:** دعم إشعارات دائن (مرتجعات للمورد، خصومات، تصحيحات فواتير) **كمستندات مالية مستقلة** تُخفِّض الرصيد المستحق (Accounts Payable) مباشرة — وليس عبر "دفعة سالبة" أو تعديل على `Payment`. الفرق جوهري: Credit Note يُصحِّح **الالتزام الأصلي نفسه** (الفاتورة)، بينما Payment يُمثِّل **سداد فعلي**؛ خلط المفهومين يُفسد دقة تقارير Aging وStatement of Account لاحقًا. يحتاج Aggregate جديد مستقل (`CreditNote`) بمنطق مشابه لـ `AccountsPayableEntry` لكن بأثر عكسي، مع حدث منشور خاص به (`SupplierCreditNoteIssued`) عند التنفيذ الفعلي.
- **Automated Payment Reminders عبر قنوات متعددة:** ربط `SupplierPaymentOverdue` بـ Communication Hub (WhatsApp/Email) في Phase 3 بدل التنبيه داخل التطبيق فقط.
- **Early Payment Discounts:** دعم شروط خصم عند السداد المبكر (مثال: خصم 2% لو السداد خلال 10 أيام).
- **Supplier Performance Scorecards:** تحليل أداء المورد (دقة المواعيد، جودة التوريد) بربط بيانات Purchasing/Inventory التشغيلية ببيانات هذا الدومين المالية — يخدم AI-Readiness المذكور في Product Bible.
- **Overpayment / Credit Balance Handling:** التعامل مع حالة دفع مبلغ أكبر من المستحق (رصيد دائن يُستخدَم في فواتير مستقبلية) — غير مُعرَّف في MVP، ويحتاج قرار عمل صريح لاحقًا.

---

## 14. Commercial Packaging Recommendation

> ملاحظة: هذه التوصية معلوماتية بحتة، وليست قيدًا معماريًا (راجع RFC-003). تغييرها لا يتطلب أي تعديل على تصميم هذا الدومين.

**Capability: بيانات الموردين الأساسية**
Capability ID: `SUP.SupplierProfiles`
Recommended Packaging: Starter ❌ | Growth ✅ | Professional ✅ | Enterprise ✅

**Capability: الحسابات الدائنة (فواتير، مدفوعات، أرصدة)**
Capability ID: `SUP.AccountsPayable`
Recommended Packaging: Starter ❌ | Growth ❌ | Professional ✅ | Enterprise ✅

**Capability: تقارير الأعمار الزمنية**
Capability ID: `SUP.AgingReports`
Recommended Packaging: Starter ❌ | Growth ❌ | Professional ✅ | Enterprise ✅

---

*نهاية Domain Document: Suppliers & Business Accounts — v1.*
