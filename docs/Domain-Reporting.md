# Domain Document: Reporting

**Type:** Domain Document
**Domain Classification:** Core Business Domain (Cafe Engine) — Business Intelligence & Analytics (Pure Consumer)
**Depends on:** RFC-001 (Context Map), RFC-002 (Event Catalog), RFC-003 (Capability Architecture), System Freeze v1, Master-System-Flow.md، وكل الـ 11 Domain Document السابقة
**Reference Template:** نفس القالب المُستخدَم في كل الدومينز السابقة
**Status:** Draft v1

---

## 1. Domain Purpose

الإجابة على الأسئلة التجارية للكافيه بالأرقام: كام بعنا النهارده؟ إيه أكتر منتج مبيعًا؟ الفود كوست كام؟ مين أحسن كاشير؟ Reporting هو **مستهلك بحت** لكل حدث يُنشَر من أي دومين آخر في المنصة — **لا يملك أي حقيقة تجارية أصلية إطلاقًا**. كل رقم يعرضه Reporting هو انعكاس (Projection) لحدث حدث بالفعل في دومين آخر يملكه.

> **المبدأ الحاكم غير القابل للتفاوض:** لو Reporting اختفى بالكامل من النظام غدًا، وأُعيد بناؤه من الصفر، فإعادة تشغيل كل الأحداث المُخزَّنة (Event Replay) كافية لإعادة بناء كل تقرير ولوحة تحكم — **دون فقدان أي معلومة**. أي تصميم يخالف هذا المبدأ (مثال: Reporting يحسب رقمًا لا يمكن اشتقاقه من الأحداث المنشورة) يُعتبَر خطأً معماريًا.

---

## 2. Responsibilities

- بناء Read Models تحليلية (Analytical Projections) من كل حدث منشور في المنصة
- حساب مؤشرات الأداء (KPIs) لكل الفئات: مبيعات، مالية، مخزون، مشتريات، موردين، عملاء، موظفين، حضور، رواتب، عمليات، فروع
- الاحتفاظ بلقطات تاريخية ثابتة (Historical Snapshots) لا تتغيّر بأثر رجعي
- توفير لوحات تحكم (Dashboards) مخصَّصة لكل دور وظيفي
- تجميع (Aggregation) البيانات عبر الفروع والفترات الزمنية

---

## 3. Out of Scope

| المفهوم | لماذا خارج النطاق | من يملكه |
|---------|---------------------|----------|
| **أي حقيقة تجارية أصلية** | Reporting لا يُنشئ، لا يُعدِّل، ولا يحذف أي بيانات مصدرية — فقط يعكسها | كل الدومينز الأخرى، كل واحد لبياناته |
| تصحيح أو تعديل أي معاملة | لو رقم في تقرير غلط، الإصلاح يكون في الدومين المصدر (مثال: `ExpenseCorrected`)، وليس بتعديل مباشر في Reporting | الدومين المصدر |
| اتخاذ أي قرار عمل (Business Decision) | Reporting يعرض المعلومة، لا يقرر (مثال: لا يقرر رفض بيع أو اعتماد راتب) | الدومين المعني |
| نشر أي حدث يُعتبَر حقيقة عمل يستهلكها دومين آخر | Reporting **لا ينشر أي حدث** إطلاقًا — Terminal Consumer بحت | — |

---

## 4. Business Concepts

| المفهوم | التعريف |
|---------|---------|
| **KPI (مؤشر أداء)** | مقياس مُعرَّف بدقة: مصدر الأحداث، منطق الحساب، تكرار التحديث، سياسة الاحتفاظ التاريخي، والدومين المصدر |
| **Projection / Read Model** | نموذج بيانات مُشتق بالكامل من أحداث سابقة، مُحسَّن للقراءة والتجميع، وليس للكتابة التشغيلية |
| **HistoricalSnapshot** | لقطة ثابتة (Immutable) لحالة مقياس معيّن في نقطة زمنية سابقة (مثال: "إجمالي مبيعات 10 يوليو") — **لا تتغيّر بأثر رجعي** حتى لو وصلت تصحيحات لاحقة لنفس الفترة |
| **ReportCategory** | تصنيف منطقي للتقارير: Sales, Financial, Inventory, Purchasing, Suppliers, CRM, Staff, Attendance, Payroll, Operations, Branches, Executive Dashboard |
| **Dashboard** | تجميعة من الـ Widgets مُخصَّصة لدور وظيفي معيّن (Cafe Owner, Branch Manager, Cashier, Kitchen Manager, Accountant, HR) |

---

## 5. Business Rules

1. **Reporting لا يصبح مصدر حقيقة أبدًا.** أي رقم مُخزَّن هنا قابل لإعادة الاشتقاق بالكامل من الأحداث الأصلية.
2. **اللقطات التاريخية (Historical Snapshots) ثابتة بعد إغلاق فترتها.** تصحيح لاحق (مثال: `SaleRefunded` يصل بعد يومين من البيع الأصلي، أو `ExpenseCorrected`) **يُسجَّل في فترة حدوثه الفعلي** (اليوم الحالي)، **وليس بأثر رجعي على اللقطة القديمة** — نفس مبدأ المحاسبة التقليدية (لا إعادة صياغة لفترات مُقفلة إلا بقرار عمل صريح مستقبلي).
3. كل KPI يجب أن يُوثَّق بالحقول الخمسة: مصدر الأحداث، منطق الحساب، تكرار التحديث، سياسة الاحتفاظ التاريخي، والدومين المالك للحقيقة الأصلية — **لا KPI بمنطق حساب ضمني غير موثَّق**.
4. **Reporting يعمل بمبدأ Eventual Consistency دائمًا** — أي مؤشر يعكس آخر الأحداث المُعالَجة، بترتيب Outbox المحلي وPer-Origin sync ordering من RFC-002 §17 Rule 8 وRFC-006 §4، مع إظهار staleness لكل فرع.
5. كل Projection مفصولة بصرامة بـ `tenant_id` — لا تجميع عابر للـ Tenants إطلاقًا.
6. **لا يُسمَح بأي منطق حساب مالي (مثل تكلفة المخزون) يُعاد تنفيذه داخل Reporting بمعزل عن الدومين المالك** — أي حساب من هذا النوع يجب أن يُستهلَك جاهزًا من حدث الدومين المصدر (مثال: `InventoryMovementRecorded` لتكلفة المخزون، وليس إعادة حساب الوصفات محليًا).
7. لوحات التحكم (Dashboards) تعرض فقط المعلومات ذات الصلة بدور المستخدم — لا كاشير يرى بيانات رواتب، ولا مدير فرع يرى بالضرورة مقارنة كل الفروع (حسب صلاحياته).

---

## 6. Use Cases / Business Flows — مُنظَّمة حسب الفئة (Reporting Categories)

### 6.1 فئة Sales

| السؤال التجاري | KPI | مصدر الأحداث | منطق الحساب | تكرار التحديث | الاحتفاظ التاريخي | الدومين المالك |
|---|---|---|---|---|---|---|
| كام بعنا النهارده؟ | Daily Sales Total | `SaleCompleted` | مجموع `totalAmount` لكل معاملات اليوم | فوري (Real-time) | لقطة يومية دائمة | Sales |
| إيه أكتر منتج مبيعًا؟ | Best/Worst Selling Products | `SaleCompleted.orderLines` | تجميع الكمية المُباعة لكل `menuItemId` | يومي/فترة مُختارة | لقطة دورية | Sales + Menu |
| المبيعات بالساعة؟ | Hourly Sales | `SaleCompleted` | تجميع حسب ساعة `completedAt` | فوري | لقطة يومية | Sales |
| متوسط الفاتورة؟ | Average Ticket | `SaleCompleted` | متوسط `totalAmount` | يومي | لقطة يومية | Sales |
| أداء الفئات؟ | Category Performance | `SaleCompleted` + `MenuItemActivated` | تجميع الإيراد حسب `Category` | يومي | لقطة دورية | Sales + Menu |
| أحسن كاشير؟ | Top Cashiers | `SaleCompleted.completedByEmployeeId` | تجميع الإيراد/عدد المعاملات لكل موظف | يومي/فترة | لقطة دورية | Sales + Staff |
| النمو الشهري؟ | Month-over-Month Growth | `SaleCompleted` (تاريخي) | مقارنة إجمالي شهرين متتاليين | شهري | لقطات شهرية دائمة | Sales |

### 6.2 فئة Financial

| السؤال التجاري | KPI | مصدر الأحداث | منطق الحساب | تكرار التحديث | الاحتفاظ التاريخي | الدومين المالك |
|---|---|---|---|---|---|---|
| الربح النهارده؟ | Daily Profit | `SaleCompleted` − `InventoryMovementRecorded` (COGS) − `ExpenseRecorded` | إيراد − تكلفة مخزون مُستهلَك − مصروفات الفترة | يومي (شبه فوري) | لقطة يومية | Sales + Inventory + Expenses |
| الفود كوست؟ | Food Cost % | `InventoryMovementRecorded` (`movementSource=Sale`) | قيمة المكونات المُستهلَكة ÷ الإيراد | يومي | لقطة يومية | Inventory + Sales |
| الحركة النقدية اليومية؟ | Daily Cash Movement | `ShiftClosed`, `SaleCompleted` (نقدي) | صافي النقدية الداخلة/الخارجة لكل شيفت | لكل شيفت | لقطة لكل شيفت | Shift Management + Sales |
| تحليل المصروفات؟ | Expense Analysis | `ExpenseRecorded/Cancelled/Corrected` | تجميع حسب الفئة/الفرع/الفترة | يومي | لقطة دورية | Expenses |

### 6.3 فئة Inventory

| السؤال التجاري | KPI | مصدر الأحداث | منطق الحساب | تكرار التحديث | الاحتفاظ التاريخي | الدومين المالك |
|---|---|---|---|---|---|---|
| قيمة المخزون الحالية؟ | Inventory Valuation | `InventoryMovementRecorded.newTotalValue` | آخر قيمة مُسجَّلة لكل `stockItemId` | فوري | لقطة يومية | Inventory |
| نسبة الهدر؟ | Waste % (بالقيمة) | `InventoryMovementRecorded` (`movementSource=Adjustment`, `reason=waste`) | قيمة الهدر ÷ قيمة الاستهلاك الكلي | يومي | لقطة دورية | Inventory |

### 6.4 فئة Purchasing

| السؤال التجاري | KPI | مصدر الأحداث | منطق الحساب | تكرار التحديث | الاحتفاظ التاريخي | الدومين المالك |
|---|---|---|---|---|---|---|
| أوامر الشراء المفتوحة؟ | Open PO Summary | `PurchaseOrderCreated/Cancelled`, `GoodsReceived` | عدد/قيمة الأوامر حسب الحالة | فوري | لقطة يومية | Purchasing |
| مدة توريد كل مورد؟ | Supplier Lead Time | `firstGoodsReceiptAt`/`lastGoodsReceiptAt` (من PurchaseOrder) | متوسط الفرق الزمني بين الإنشاء والاستلام | دوري | لقطة شهرية | Purchasing |

### 6.5 فئة Suppliers

| السؤال التجاري | KPI | مصدر الأحداث | منطق الحساب | تكرار التحديث | الاحتفاظ التاريخي | الدومين المالك |
|---|---|---|---|---|---|---|
| أرصدة الموردين؟ | Supplier Balances | `PurchaseInvoiceRecorded`, `PaymentRecorded` | الفواتير − المدفوعات المُخصَّصة | فوري | لقطة يومية | Suppliers & Business Accounts |
| المستحقات المتأخرة؟ | Aging / Outstanding Payables | نفس ما سبق + `SupplierPaymentOverdue` | تصنيف حسب فترة التأخر | يومي | لقطة يومية | Suppliers & Business Accounts |

### 6.6 فئة CRM

| السؤال التجاري | KPI | مصدر الأحداث | منطق الحساب | تكرار التحديث | الاحتفاظ التاريخي | الدومين المالك |
|---|---|---|---|---|---|---|
| القيمة الدائمة للعميل؟ | Customer Lifetime Value | `SaleCompleted` (مربوطة بـ `customerId`) | مجموع الإنفاق التاريخي لكل عميل | دوري | لقطة شهرية | Sales + CRM |

### 6.7 فئة Staff / Attendance / Payroll

| السؤال التجاري | KPI | مصدر الأحداث | منطق الحساب | تكرار التحديث | الاحتفاظ التاريخي | الدومين المالك |
|---|---|---|---|---|---|---|
| ملخص الحضور؟ | Attendance Summary | `WorkingHoursCalculated`, `AttendanceExceptionRaised` | ساعات العمل + عدد الانحرافات لكل موظف | يومي | لقطة شهرية | Attendance |
| رواتب الشهر؟ | Payroll This Month | `PayrollRunCompleted` | إجمالي كشوف الرواتب المُعتمَدة | شهري | لقطة شهرية دائمة | Payroll |

### 6.8 فئة Operations

| السؤال التجاري | KPI | مصدر الأحداث | منطق الحساب | تكرار التحديث | الاحتفاظ التاريخي | الدومين المالك |
|---|---|---|---|---|---|---|
| متوسط وقت التحضير؟ | Average Preparation Time | `OrderPlaced.createdAt` → `OrderReady.readyAt` | متوسط الفارق الزمني | يومي | لقطة يومية | Sales + Order Fulfillment |
| متوسط وقت الخدمة؟ | Average Service Time | `OrderReady.readyAt` → `OrderServed.servedAt` | متوسط الفارق الزمني | يومي | لقطة يومية | Order Fulfillment |
| أحسن باريستا؟ | Top Baristas | `OrderReady.preparedByEmployeeId`, `OrderServed.servedByEmployeeId` | تجميع عدد/سرعة التحضير لكل موظف | يومي | لقطة دورية | Order Fulfillment + Staff |
| أداء الشيفت؟ | Shift Performance | `ShiftOpened/Closed` + `SaleCompleted` | إيراد الشيفت مقابل مدته | لكل شيفت | لقطة لكل شيفت | Shift Management + Sales |

### 6.9 فئة Branches & Executive Dashboard

| السؤال التجاري | KPI | مصدر الأحداث | منطق الحساب | تكرار التحديث | الاحتفاظ التاريخي | الدومين المالك |
|---|---|---|---|---|---|---|
| مقارنة الفروع؟ | Branch Comparison | كل الأحداث المُفهرَسة بـ `branchId` | تجميع مقارَن لكل مقياس رئيسي عبر الفروع | يومي | لقطة يومية | متعدد الدومينز |
| لوحة المالك التنفيذية؟ | Executive Summary | تجميعة من كل ما سبق | أهم 6-8 مؤشرات في شاشة واحدة | فوري | لقطة يومية | متعدد الدومينز |

---

## 7. Aggregate Roots & Entities

> **ملاحظة تصميم جوهرية:** Reporting **لا يملك Aggregate Roots بالمعنى التقليدي في DDD** (كيانات تفرض Invariants عبر أوامر Command) — لأنه لا يوجد "كتابة تشغيلية" هنا، فقط **Projections** مُشتقة بالكامل من أحداث خارجية. الجدول التالي يصف Read Models الأساسية بدل Aggregates.

| الكيان | النوع | ملاحظات |
|--------|-------|---------|
| **KPIDefinition** | Master Data (Read Model) | تعريف كل مقياس: مصدره، منطق حسابه، تكرار تحديثه |
| **DailySnapshot** (متعدد الأنواع: Sales, Inventory, Financial...) | Immutable Projection | لا تُعدَّل بعد إغلاق يومها (Business Rule #2) |
| **DashboardConfiguration** | Master Data (Read Model) | تعريف Widgets لكل دور وظيفي |
| **EmployeePerformanceSnapshot** | Projection دورية | مُشتقة من أحداث Sales/Order Fulfillment المُرتبطة بـ `employeeId` |

---

## 8. Published Events

**لا يوجد.** Reporting **لا ينشر أي حدث إطلاقًا** — مستهلك نهائي بحت (Terminal Consumer)، متوافق تمامًا مع RFC-002 §15 (لم يتغيّر).

---

## 9. Consumed Events

**Reporting يستهلك كل الأحداث الـ 48 الموثَّقة في RFC-002 دون استثناء** — هو أكبر مستهلك أحداث في المنصة بالكامل، بحكم طبيعته. بدلًا من تكرار كل حدث هنا، الجدول التالي يُلخِّص حسب الدومين المصدر (التفاصيل الكاملة لكل حدث موجودة في RFC-002 والـ Domain Document الخاص بمصدره):

| الدومين المصدر | عدد الأحداث المُستهلَكة | الاستخدام الأساسي في Reporting |
|---|---|---|
| Sales | 4 (`OrderPlaced`, `SaleCompleted`, `SaleRefunded`, `DiscountApplied`) | KPIs المبيعات، المالية، Top Cashiers |
| Order Fulfillment | 4 | KPIs التشغيل (وقت التحضير/الخدمة، Top Baristas) |
| Shift Management | 2 | الحركة النقدية، أداء الشيفت |
| Menu | 5 | أداء الفئات/المنتجات |
| Inventory | 7 (بما فيها `InventoryMovementRecorded` الجديد) | التقييم المالي، الفود كوست، الهدر |
| Suppliers & Business Accounts | 5 | أرصدة الموردين، الأعمار الزمنية |
| Purchasing | 3 | ملخص أوامر الشراء، مدة التوريد |
| CRM | 2 | القيمة الدائمة للعميل |
| Staff | 6 | عدد الموظفين، ربط الأداء بالاسم |
| Attendance | 2 | ملخص الحضور |
| Expenses | 3 | تحليل المصروفات |
| Payroll | 5 | رواتب الشهر، الاقتراحات المعلَّقة |

**الإجمالي: 48 حدثًا مُستهلَكًا من 12 دومين — Reporting هو المستهلك الوحيد الذي يلمس كل حدث في RFC-002 بلا استثناء واحد.**

---

## 10. Permissions

| الصلاحية (Atomic) | الوصف |
|---------------------|-------|
| `Reporting.ViewSalesReports` | تقارير المبيعات |
| `Reporting.ViewFinancialReports` | تقارير مالية (ربح، فود كوست، مصروفات) |
| `Reporting.ViewInventoryReports` | تقارير المخزون والتقييم |
| `Reporting.ViewPurchasingReports` | تقارير المشتريات |
| `Reporting.ViewSupplierReports` | تقارير الموردين والأعمار الزمنية |
| `Reporting.ViewCRMReports` | تقارير العملاء |
| `Reporting.ViewStaffReports` | تقارير الموظفين |
| `Reporting.ViewAttendanceReports` | تقارير الحضور |
| `Reporting.ViewPayrollReports` | تقارير الرواتب (حساسة) |
| `Reporting.ViewOperationsReports` | تقارير التشغيل |
| `Reporting.ViewBranchComparison` | مقارنة الفروع |
| `Reporting.ViewExecutiveDashboard` | اللوحة التنفيذية الشاملة |

---

## 11. Data Model

> **ملاحظة معمارية:** مستوى عالٍ فقط، وطبيعة الجداول هنا مختلفة عن باقي الدومينز — كلها Projections مُشتقة، وليست مصدر حقيقة.

جداول مرشحة (اتجاه عام فقط):
- `kpi_definitions` (tenant_id, kpi_key, source_events[], calculation_logic, update_frequency, retention_policy, ...)
- `daily_sales_snapshots` (tenant_id, branch_id, date, total_revenue, transaction_count, avg_ticket, ...)
- `inventory_valuation_snapshots` (tenant_id, date, stock_item_id, total_value, ...)
- `employee_performance_snapshots` (tenant_id, employee_id, period, role_context (cashier/barista), metric_value, ...)
- `dashboard_configurations` (tenant_id, role, widget_definitions[], ...)
- `branch_comparison_snapshots` (tenant_id, date, branch_id, key_metrics{...}, ...)

كل الجداول تحمل `tenant_id` إلزاميًا وفق سياسة RLS المُقرَّرة في Product Bible.

---

## 12. Public APIs

> **ملاحظة:** تصميم الـ API التفصيلي يُؤجَّل لوثيقة API Design منفصلة. هنا فقط قائمة القدرات المتوقعة:

- استعلام عن أي KPI بفلاتر (الفرع، الفترة، الموظف)
- استرجاع لوحة تحكم مُخصَّصة حسب دور المستخدم:
  - **Cafe Owner:** Executive Dashboard (مبيعات اليوم، ربح، مقارنة فروع، أفضل منتجات، مستحقات موردين، رواتب الشهر)
  - **Branch Manager:** مبيعات الفرع، تنبيهات مخزون، ملخص حضور، أداء الشيفت
  - **Cashier:** مبيعات شيفته الحالي، أداؤه الشخصي، حالة الدرج النقدي
  - **Kitchen Manager:** أداء طابور الطلبات، متوسط وقت التحضير، نسبة الهدر، أفضل الباريستا
  - **Accountant:** لوحة مالية (مصروفات، أرصدة موردين، رواتب، ربح)
  - **HR:** عدد الموظفين، ملخص حضور، حالة الرواتب، معدل الدوران الوظيفي
- تصدير لقطة تاريخية لفترة مُحدَّدة

---

## 12A. Offline-first reporting semantics (RFC-006)

- Cloud Reporting eventually consistent ويعرض `lastSyncedAt` وconnectivity وbacklog/attention وstaleness.
- بيانات الفرع المنقطع لا تُسمّى Live؛ consolidated KPIs تتقارب بعد durable ingestion.
- التقارير التشغيلية المحلية تقرأ Edge projections Offline دون أن تصبح مصدر حقيقة.
- retried sync messages تُزال ازدواجيتها قبل projections حتى لا تتكرر الإجماليات.

## 13. Future Extensions

- **Scheduled Reports:** جدولة تقارير دورية تلقائية (يومي/أسبوعي/شهري).
- **Email Reports:** إرسال التقارير عبر البريد الإلكتروني تلقائيًا.
- **PDF Export:** تصدير أي تقرير كملف PDF.
- **Excel Export:** تصدير أي تقرير كملف Excel للتحليل الإضافي.
- **Power BI Integration:** ربط مباشر بأدوات BI خارجية.
- **AI Insights:** تحليلات ذكية تلقائية (مثال: "مبيعاتك انخفضت 15% مقارنة بالأسبوع الماضي") — يخدم AI-Readiness المذكور في Product Bible، دون أي بنية AI فعلية في MVP.
- **Predictive Analytics:** توقعات مستقبلية (الطلب المتوقَّع، اقتراحات إعادة الطلب) — تعتمد على البيانات النظيفة التي تلتقطها المنصة بالفعل منذ MVP.

---

## 14. Commercial Packaging Recommendation

> ملاحظة: هذه التوصية معلوماتية بحتة، وليست قيدًا معماريًا (راجع RFC-003). تغييرها لا يتطلب أي تعديل على تصميم هذا الدومين.

| Capability ID | الوصف | Starter | Growth | Professional | Enterprise |
|---|---|:---:|:---:|:---:|:---:|
| `RPT.Dashboards` | لوحة تحكم تشغيلية أساسية | ✅ | ✅ | ✅ | ✅ |
| `RPT.SalesReports` | تقارير المبيعات | ❌ | ✅ | ✅ | ✅ |
| `RPT.FinancialReports` | تقارير مالية (ربح، فود كوست) | ❌ | ❌ | ✅ | ✅ |
| `RPT.InventoryReports` | تقارير المخزون | ❌ | ✅ | ✅ | ✅ |
| `RPT.PurchasingReports` | تقارير المشتريات | ❌ | ✅ | ✅ | ✅ |
| `RPT.SupplierReports` | تقارير الموردين | ❌ | ❌ | ✅ | ✅ |
| `RPT.CRMReports` | تقارير العملاء | ❌ | ✅ | ✅ | ✅ |
| `RPT.StaffReports` | تقارير الموظفين | ❌ | ❌ | ✅ | ✅ |
| `RPT.AttendanceReports` | تقارير الحضور | ❌ | ✅ | ✅ | ✅ |
| `RPT.PayrollReports` | تقارير الرواتب | ❌ | ❌ | ✅ | ✅ |
| `RPT.OperationsReports` | تقارير التشغيل | ❌ | ✅ | ✅ | ✅ |
| `RPT.BranchComparison` | مقارنة الفروع | ❌ | ❌ | ❌ | ✅ |
| `RPT.ExecutiveDashboard` | اللوحة التنفيذية | ❌ | ❌ | ✅ | ✅ |
| `RPT.AdvancedAnalytics` *(Future)* | تحليلات AI تنبؤية | ❌ | ❌ | ❌ | ✅ |

---

*نهاية Domain Document: Reporting — v1.*
