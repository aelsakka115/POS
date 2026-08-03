# RFC-001: Cafe Engine — Context Map

**Status:** **Approved / Frozen** — جميع القرارات المفتوحة تم حسمها (راجع القسم 7)
**Type:** RFC (Architecture)
**Depends on:** Product Bible v1.0
**Supersedes:** —
**Author:** Product/Software Architecture Session

---

## 1. Context

بعد اعتماد Product Bible v1، أصبح لدينا فصل واضح بين ثلاث طبقات:

| الطبقة | الدومينز |
|--------|----------|
| **Platform Domains** | Auth · Users · Roles · Companies · Branches · Settings |
| **Supporting Domains** | Notifications · Automation · Files · Audit Logs |
| **Core Business Domains** (Cafe Engine) | Sales · Menu · Inventory · Purchasing · CRM · Staff · Attendance · Expenses · Payroll · Reporting |

قبل تصميم أي Domain بالتفصيل، نحتاج نُثبّت **حدود المسؤولية بين الـ Core Business Domains** تحديدًا، لأن الغموض هنا (مين مالك أي مفهوم، ومين بينشر/يستمع لإيه) هو أكبر مصدر لتضارب لاحق في التصميم وقاعدة البيانات.

هذا الـ RFC **لا يصمم أي Domain بالتفصيل** (هذا سيتم لاحقًا عبر Domain Documents لكل Domain على حدة، بدءًا بـ Sales). الهدف هنا فقط: **رسم الخريطة (Context Map)** — من يملك ماذا، وما هي حدود كل Domain، وكيف تتبادل الأحداث.

---

## 2. Decision Drivers

- بناء المعمارية من المسؤوليات التجارية (Business Responsibilities) أولًا، ثم اشتقاق الـ Database/APIs/UI منها — وليس العكس.
- منع "الملكية المزدوجة" (Two domains owning the same concept) قبل أن تتحول لمشكلة تقنية.
- تثبيت اتجاه الأحداث (من ينشر → من يستمع) بشكل صريح لكل زوج Domains متفاعلين.

---

## 3. Domain Classification

### 3.1 Platform Domains (عامة، خارج Cafe Engine)
Auth · Users · Roles · Companies · Branches · Settings

### 3.2 Supporting Domains (تخدم كل الـ Core Domains دون منطق تجاري خاص بالكافيهات)
Notifications · Automation · Files · Audit Logs

### 3.3 Core Business Domains (Cafe Engine — محور هذا الـ RFC)
Sales · **Order Fulfillment** · **Shift Management** · Menu · Inventory · **Suppliers & Business Accounts** · Purchasing · CRM · Staff · Attendance · Expenses · **Payroll** · Reporting

> **تحديث (بعد الحسم):** أُضيف Domain جديد: **Order Fulfillment** (تنفيذ الطلب/المطبخ)، منفصل تمامًا عن Sales. تفاصيل الحدود في القسم 4.2.
> **تحديث مُلغى:** القرار الأصلي بنقل **Payroll** لـ Phase 2 **أُلغي رسميًا**. Payroll عاد ليصبح Core Business Domain كامل ضمن MVP، منفصل تمامًا عن Attendance، وفق نموذج Suggested Adjustments (راجع القسم 4.12 المُحدَّث بالكامل).
> **تحديث ثالث:** أُضيف Domain جديد: **Shift Management** (فتح/قفل الشيفت، الدرج النقدي، فروقات النقدية) كجزء من MVP.
> **تحديث رابع:** أُضيف Domain جديد: **Suppliers & Business Accounts** — يفصل الالتزامات المالية تجاه الموردين (Supplier Master Data, Accounts Payable, Payments, Aging) عن العمليات التشغيلية للشراء (Purchasing). راجع القسم 4.6.

---

## 4. Domain-by-Domain Boundaries

### 4.1 Sales

**Purpose:** إدارة عملية البيع من بدء الطلب حتى إتمامه وتحصيل قيمته.

**Responsibilities:**
- إنشاء وإدارة الطلبات (Orders) وبنودها (Order Lines)
- حساب الإجمالي، الخصومات، الضرائب على مستوى المعاملة
- تسجيل طريقة الدفع وحالة السداد (Payment Status) للمعاملة
- إصدار الفاتورة (Invoice) كتمثيل للمعاملة التجارية
- إتمام البيع (Sale Completion) ونشر الحدث الناتج
- الاحتفاظ بـ `MenuItemSalesReadModel` محلي من أحداث Menu، ونسخ `currentBasePrice` إلى `OrderLine.unitPrice` كـ Snapshot ثابت وقت إنشاء Order

**Out of Scope:**
- **لا تملك Payments كنظام مستقل متعدد الوسائل (Gateways)** — Sales تُسجّل "طريقة الدفع وحالتها" فقط كخاصية على المعاملة؛ أي تكامل مستقبلي مع بوابات دفع فعلية (Payment Gateway Integration) هو مسؤولية Domain منفصل مستقبلي (Payments)، وليس جزءًا من Sales.
- لا تملك المخزون أو منطق خصمه (هذا لـ Inventory).
- لا تملك تعريف المنتجات أو أسعارها الأساسية (هذا لـ Menu).
- لا تملك جداول الأسعار المستقبلية أو تاريخ نسخ الأسعار؛ تحتفظ فقط بالسعر الحالي اللازم للبيع، ولا تعيد تسعير Order قائم بعد تغيّر سعر Menu.
- لا تملك بيانات العميل أو نقاط الولاء (هذا لـ CRM).
- **لا تملك تتبع تنفيذ الطلب** (Preparing / Ready / Served / Cancelled / Rejected) — هذا حصريًا مسؤولية **Order Fulfillment** (القسم 4.2). Sales مسؤوليتها تنتهي عند إنشاء الطلب ونشر حدث `OrderPlaced`، وتُستأنف فقط عند إتمام المعاملة ماليًا.

**Owned Concepts:** Order, OrderLine, Sale, Invoice (Transaction Representation), Discount (Applied), Payment Status

---

### 4.2 Order Fulfillment (Kitchen Operations)

**Purpose:** تنفيذ الطلب فعليًا بعد بيعه — من استلام المطبخ/الباريستا للطلب حتى تسليمه للعميل.

**Responsibilities:**
- استقبال بنود الطلب (Order Lines) بعد نشرها من Sales
- إدارة دورة حياة تنفيذ كل بند/طلب: `Preparing → Ready → Served`، وكذلك `Cancelled` / `Rejected`
- ترتيب أولوية التنفيذ (Order Queue) عبر محطات العمل (المطبخ، الباريستا...)
- نشر أحداث تغيّر الحالة لتُستهلك من Sales (لإغلاق المعاملة) وNotifications (لتنبيه الكاشير/العميل) وReporting

**Out of Scope:**
- لا تملك حساب السعر أو الخصومات أو الدفع (هذا لـ Sales).
- لا تملك خصم المخزون مباشرة — Inventory يستمع لحدث `SaleCompleted` من Sales (كما هو مثبت سابقًا)، وليس لأحداث Order Fulfillment؛ الأخير معني فقط بحالة "التحضير" لا بـ "الاستهلاك المخزني".
- لا تملك تعريف المنتج أو الوصفة (هذا لـ Menu).

**Owned Concepts:** FulfillmentOrder, FulfillmentOrderLine, StationAssignment (المطبخ/الباريستا/أخرى), OrderStatus

**ملاحظات معمارية:**
- هذا الفصل عن Sales يفتح الباب مستقبلًا (Phase 2/3) لـ: Kitchen Display System (KDS)، شاشة الباريستا، طابور الطلبات (Order Queue)، QR Ordering، وتكامل التوصيل (Delivery Integration) — **دون أي تلوث لمنطق Sales**.
- في MVP: التنفيذ قد يكون مبسّطًا (حالة واحدة بسيطة لكل طلب بدل محطات متعددة)، لكن **الحدود المعمارية بين Sales وOrder Fulfillment ثابتة من اليوم الأول** حتى لو الواجهة في MVP بسيطة.

---

### 4.3 Shift Management

**Purpose:** إدارة دورة فتح وقفل جلسة العمل اليومية (Shift Session) على مستوى الكاشير/الدرج النقدي، وتسوية الفروقات النقدية.

**Responsibilities:**
- فتح شيفت جديد (Shift Open) مع تسجيل مبلغ افتتاح الدرج النقدي (Opening Cash Amount)
- قفل الشيفت (Shift Close) مع تسجيل المبلغ الفعلي في الدرج، ومقارنته بالمتوقع (بناءً على مبيعات الشيفت)
- حساب الفرق النقدي (Cash Difference) عند القفل
- إصدار ملخص نهاية الشيفت (End-of-Shift Summary)
- **الاحتفاظ بعدّاد محلي للطلبات المفتوحة حسب `OrderPlaced.shiftId` الإلزامي** (`OrderPlaced` لم يُغلَق بعد بـ `SaleCompleted`/`OrderCancelled`/`OrderRejected`) لمنع قفل شيفت عليه طلبات معلَّقة. لا يُستنتج الشيفت من `createdByEmployeeId?`

**Out of Scope:**
- لا تملك تفاصيل المبيعات نفسها أو حسابها (هذا لـ Sales) — تستهلك فقط ملخصًا إجماليًا من Sales لمقارنته بالنقدية الفعلية.
- لا تملك حضور/انصراف الموظف كموظف (هذا لـ Attendance) — قد يتزامن فتح الشيفت مع حضور الكاشير، لكنهما حدثان منفصلان معماريًا.
- **لا تملك محتوى الطلبات نفسها** — فقط عدّاد رقمي لعددها المفتوح، دون أي تفاصيل عن بنودها أو قيمتها.

**Owned Concepts:** ShiftSession, CashDrawerOpening, CashDrawerClosing, CashDifference, EndOfShiftSummary, OpenOrdersCounter

> **قرار حاسم مرتبط بـ Sales:** **لا يجوز إتمام أي معاملة بيع (`SaleCompleted`) إلا في ظل وجود شيفت مفتوح فعليًا** لنفس الفرع/الكاشير. هذا القيد أُضيف كـ Business Precondition صريح على `SaleCompleted` في RFC-002. Sales يحتفظ بنسخة محلية (Read Model) لحالة "هل يوجد شيفت مفتوح؟" عبر الاستماع لأحداث `ShiftOpened`/`ShiftClosed` — وليس عبر استدعاء مباشر لـ Shift Management.
>
> **قرار إضافي (System Freeze v1):** **لا يجوز قفل شيفت (`ShiftClosed`) عليه طلبات مفتوحة لم تُغلَق بعد.** Shift Management يستمع لـ `OrderPlaced` (Sales) و`SaleCompleted`/`OrderCancelled`/`OrderRejected` (Sales/Order Fulfillment) للحفاظ على عدّاد محلي — هذا استثناء صريح ومقصود يجعل Shift Management "يستمع للأعلى" (Consumer لأحداث دومينز أخرى رغم كونه في ترتيب مبكر بالخريطة)، وهو متسق تمامًا مع مبدأ Event-Driven العام.

---



### 4.4 Menu

**Purpose:** تعريف كل ما يُباع أو يُصنع في الكافيه: المنتجات، الوصفات، مكوناتها.

**Responsibilities:**
- إدارة القائمة (Menu) والفئات (Categories)
- إدارة المنتجات النهائية القابلة للبيع (Menu Items / Products)
- إدارة الوصفات (Recipes / BOM) وربطها بالمكونات (Ingredients)
- إدارة السعر الأساسي الحالي وكل الأسعار المجدولة وتواريخ نفاذها

**Out of Scope:**
- لا تملك كميات المخزون الفعلية أو حركاته (هذا لـ Inventory).
- لا تملك منطق البيع أو الخصومات التطبيقية وقت البيع (هذا لـ Sales).

**Owned Concepts:** MenuItem, Category, Recipe, RecipeIngredientLink (إشارة فقط لـ `stockItemId` وكمية مطلوبة — وليس تعريف المكوّن نفسه), BasePrice

> **ملكية السعر:** الأسعار المجدولة تظل داخل Menu حتى لحظة نفاذها. عند النفاذ ينشر Menu حدث `MenuItemPriceChanged` بصورة idempotent؛ Sales يحتفظ بالسعر الحالي فقط ويأخذ منه Snapshot ثابت عند `OrderPlaced`. لا يؤثر أي تغيير لاحق على Orders قائمة.

> **تصحيح معماري (بعد تعريف فلسفة Inventory Engine):** القرار السابق القائل بأن "Ingredient كسجل أساسي يُدار عبر Menu" **أصبح لاغيًا**. Menu **لا يملك أي تعريف** للمكوّن (لا اسمه، لا وحدة قياسه، لا حد إعادة طلبه) — كل هذا ينتقل بالكامل لـ **Inventory** كمالك حصري لـ `StockItem` (راجع القسم 4.5 المُحدَّث). Menu.Recipe تكتفي بالإشارة إلى `stockItemId` ككائن خارجي مُعرَّف مسبقًا في Inventory، تمامًا كما تشير Sales إلى `menuItemId` دون امتلاكه.

---

### 4.5 Inventory

**Purpose:** المصدر الوحيد للحقيقة (Single Source of Truth) لكل ما هو فعلي/مادي في المخزون: التعريف (StockItem)، الكمية، الحركة، والقيمة المالية. Inventory ليس "موديول مخزون" بل **Operational Engine** يُبنى فوقه لاحقًا Purchasing وCosting وAnalytics.

**Responsibilities:**
- تعريف أصناف المخزون (StockItem) بالكامل: الاسم، وحدة القياس، الفئة، حد إعادة الطلب (Reorder Level)
- إدارة وحدات القياس (Units of Measure) والتحويل بينها (مثال: تخزين بالكيلوجرام، استهلاك بالجرام)
- تسجيل حركات المخزون (Stock Movements: إدخال، خصم، تحويل، تسوية) — كل حركة سبب واضح
- **حساب الاستهلاك الفعلي وقت البيع**: الاحتفاظ بنسخة محلية من الوصفات (عبر `RecipeUpdated`) وتأثيرات التخصيصات (عبر `ModifierRecipeImpactUpdated`)، ودمجهما عند استلام `SaleCompleted` لحساب الكميات الحقيقية المُستهلَكة بناءً على `selectedModifierIds`
- تسجيل أثر استلام البضاعة (Goods Receipts) كحركة إدخال (الأمر نفسه مملوك لـ Purchasing)
- إدارة التسويات اليدوية (Stock Adjustments) والهدر (Waste Management)
- إدارة الجرد (Stock Counting) والفروقات
- حساب حدود إعادة الطلب واكتشاف انخفاض المخزون (Reorder Levels & Low Stock Detection)
- **تقييم المخزون (Inventory Valuation)** بطريقة **Weighted Average Cost** في MVP

**Out of Scope:**
- لا تملك تعريف الوصفة نفسها أو المنتج (هذا لـ Menu) — فقط تستهلك أحداثها لحساب الاستهلاك.
- لا تملك أوامر الشراء نفسها (هذا لـ Purchasing) — فقط تستقبل "استلام مخزون" كحركة إدخال.
- لا تملك تتبع الدُفعات وتواريخ الصلاحية (Batch/Lot & Expiry) في MVP — خارج النطاق صراحة، لكن التصميم يبقى قابلًا للتوسعة لإضافتها لاحقًا دون إعادة هيكلة (راجع Future Extensions في Domain Document).

**Owned Concepts:** StockItem (تعريف كامل — بعد التصحيح في §4.4)، UnitOfMeasure، StockMovement، StockValuation، StockCount، WasteRecord، ReorderLevel، NegativeStockPolicy، WarehouseLocation (لو موجود مفهوم مخازن متعددة داخل الفرع)

> **قرارات حاسمة مُعتمَدة لفلسفة Inventory Engine:**
> 1. **طريقة التقييم:** Weighted Average Cost في MVP؛ FIFO/Batch Tracking مؤجَّلة لـ Phase 2.
> 2. **الرصيد السالب (Negative Stock):** سياسة قابلة للتهيئة على مستوى كل Tenant (`NegativeStockPolicy`): `Strict` (منع البيع) / `Warning` (السماح + تنبيه — الافتراضي) / `Ignore` (السماح بدون تنبيه). القيمة تُدار عبر Settings (Platform Domain) وتصل إلى Sales وInventory عبر ports محايدة وفق RFC-004 SA-ADR-06، دون أي استيراد مباشر من Platform.
> 3. **Recipe Snapshot Immutability:** أي `StockMovement` ناتج عن بيع يُخزِّن **الكميات الفعلية المُستهلَكة كأرقام ثابتة** (وليس مرجعًا حيًا لوصفة قابلة للتغيير)، مع الاحتفاظ بمرجع لنسخة الوصفة المُستخدَمة (`recipeVersionUsed`) لأغراض التدقيق فقط. تعديل وصفة لاحقًا (`RecipeUpdated`) **لا يغيّر أبدًا** حركات مخزون سابقة بأثر رجعي.

---



### 4.6 Suppliers & Business Accounts

**Purpose:** إدارة بيانات الموردين الأساسية، وكل الالتزامات المالية الناتجة عن علاقة الشراء (Accounts Payable)، بمعزل تام عن دورة الشراء التشغيلية.

**Responsibilities:**
- إدارة بيانات الموردين الأساسية (Supplier Master Data): الاسم، بيانات التواصل، شروط الدفع
- تسجيل فواتير الشراء (Purchase Invoices) كالتزام مالي (Accounts Payable Entry)
- إدارة أرصدة الموردين (Supplier Balances) والمدفوعات الجزئية (Partial Payments)
- حساب الأرصدة المستحقة (Outstanding Balances) وتواريخ الاستحقاق (Due Dates)
- تصنيف الأعمار الزمنية للمستحقات (Aging: 30/60/90 يوم)
- إصدار تذكيرات الدفع (Payment Reminders) عبر Notifications
- الاحتفاظ بسجل تاريخي كامل للمدفوعات (Payment History)

**Out of Scope:**
- **لا تملك أوامر الشراء (Purchase Orders) ولا استلام البضاعة (Goods Receipt)** — هذه عمليات تشغيلية بحتة مملوكة لـ Purchasing.
- **لا تؤثر أبدًا على المخزون بشكل مباشر.** تسجيل فاتورة شراء (`PurchaseInvoiceRecorded`) هو التزام مالي بحت؛ **لا يُغيّر رصيد المخزون بأي شكل**. المخزون يتغيّر حصريًا عبر `GoodsReceived` الذي تنشره Purchasing.

**Owned Concepts:** Supplier, AccountsPayableEntry (PurchaseInvoice), SupplierBalance, Payment, PaymentAllocation, AgingBucket, DueDate

> **قاعدة معمارية حاسمة (بناءً على طلب صريح):** **لا يجوز لأي مورد أو فاتورة شراء أن تزيد المخزون مباشرة.** الفصل بين الالتزام المالي (فاتورة) والأثر الفعلي (استلام) يسمح مستقبلًا بدعم: توريد جزئي، أصناف مرفوضة، توصيل متأخر، أو فاتورة تصل قبل البضاعة فعليًا — دون أي تعارض بين الـ Domains.

---

### 4.7 Purchasing

**Purpose:** إدارة دورة الشراء التشغيلية من إنشاء أمر الشراء حتى استلام البضاعة فعليًا.

**Responsibilities:**
- إنشاء وإدارة أوامر الشراء (Purchase Orders) — بالإشارة لـ `supplierId` كمرجع خارجي من Suppliers & Business Accounts، دون امتلاك بيانات المورد
- تسجيل استلام البضاعة (Goods Receiving) — وينتج عن هذا حدث يُستهلك من Inventory لإضافة حركة إدخال

**Out of Scope:**
- لا تملك أرصدة المخزون بعد الاستلام (هذا لـ Inventory فورًا بعد نشر حدث الاستلام).
- لا تملك تقييم المخزون.
- **لا تملك بيانات المورد الأساسية ولا أي التزام مالي تجاهه** (هذا لـ Suppliers & Business Accounts) — Purchasing تحتفظ فقط بنسخة محلية خفيفة (Read Model) من الموردين النشطين (عبر أحداث `SupplierCreated`/`SupplierDeactivated`) للتحقق المرجعي عند إنشاء أمر شراء، دون امتلاك أي بيانات مالية عنهم.

**Owned Concepts:** PurchaseOrder, PurchaseOrderLine, GoodsReceipt

---

### 4.8 CRM

**Purpose:** إدارة بيانات العملاء وتاريخهم وعلاقتهم بالمنشأة.

**Responsibilities:**
- إدارة سجلات العملاء (Customer Profiles)
- تسجيل تاريخ الشراء لكل عميل (بالاستماع لأحداث Sales)
- (Phase 2) إدارة نقاط الولاء وبرامج المكافآت

**Out of Scope:**
- لا تملك منطق البيع نفسه أو حساب الفاتورة.
- لا تملك تطبيق الخصم وقت البيع (Sales تُطبّق الخصم؛ CRM فقط قد "تقترح" أهلية الخصم مستقبلًا عبر معلومة تُستهلكها Sales، وليس العكس).

**Owned Concepts:** Customer, CustomerPurchaseHistory, LoyaltyAccount (Phase 2)

---

### 4.9 Staff

**Purpose:** المصدر الوحيد للحقيقة لبيانات الموظف الأساسية: هويته، حالته الوظيفية، فرعه، قسمه، مسماه الوظيفي — دون أي معرفة بالحضور أو الرواتب.

**Responsibilities:**
- إدارة بيانات الموظف الأساسية (Employee Master Data) والرقم الوظيفي
- إدارة الحالة الوظيفية (Active/Inactive/Terminated)
- ربط الموظف بفرع افتراضي، ونقله بين الفروع
- إدارة القسم، المسمى الوظيفي، نوع التوظيف، وعلاقة المدير المباشر (اختيارية)
- الاحتفاظ بمرجع تعيين شيفت افتراضي (وصفي بسيط، وليس محرك جدولة)
- الاحتفاظ بمرجع الراتب الأساسي (لأغراض Payroll فقط، دون أي حساب داخل Staff)

**Out of Scope:**
- لا تملك المصادقة أو الصلاحيات النظامية (User/Role/Permission — Platform Domain مستقلة).
- لا تملك حساب الرواتب أو أي منطق مالي (هذا لـ Payroll حصريًا).
- لا تملك تسجيل الحضور الفعلي (هذا لـ Attendance حصريًا).
- **لا تملك محرك جدولة كامل** (تقويم شيفتات، تناوب) — فقط مرجع وصفي بسيط لشيفت افتراضي.

**Owned Concepts:** Employee, EmploymentStatus, BranchAssignment, Department, JobTitle, ManagerRelationship, EmploymentType, StaffNumber, DefaultShiftAssignment, BaseSalaryReference

> **الفصل الحاكم (بعد بناء Staff Domain Document بالكامل):** Attendance وPayroll **لا يملكان أبدًا** بيانات الموظف — يشيران فقط لـ `employeeId` كمرجع خارجي، ويحتفظان بـ Read Models محلية مُحدَّثة من أحداث Staff (`EmployeeCreated`, `EmployeeUpdated`, `EmployeeActivated`, `EmployeeDeactivated`, `EmployeeTransferred`, `EmployeeTerminated`) — **الفجوة الموثَّقة سابقًا في كلا الدومينين مُغلَقة الآن بالكامل.**

---

### 4.10 Attendance

**Purpose:** تسجيل حقائق حضور وانصراف الموظفين التشغيلية فقط — بدون أي حساب مالي إطلاقًا.

**Responsibilities:**
- تسجيل Check-in / Check-out مع التحقق من الموقع الجغرافي (GPS Verification)
- التحقق من هوية الجهاز المُستخدَم (Device Verification) لمنع تسجيل الحضور من جهاز غير مُصرَّح به
- حساب ساعات العمل الفعلية لكل موظف لكل يوم/شيفت
- اكتشاف وتصنيف الانحرافات: تأخير (Late)، انصراف مبكر (Early Leave)، غياب (Absence)
- إدارة اعتماد الحضور الاستثنائي (Attendance Approval) عند وجود تجاوزات تحتاج مراجعة مدير

**Out of Scope:**
- **لا تحسب أي مبلغ مالي بأي شكل — لا خصم، لا مكافأة، لا بدل.** مسؤوليتها تنتهي تمامًا عند نشر حقيقة تشغيلية مُعتمَدة (ساعات عمل، أو نوع انحراف). Payroll هو من يقرر التأثير المالي، إن وُجد، بشكل منفصل تمامًا.
- لا تُدير بيانات الموظف الأساسية (الاسم، الفرع، الدور الوظيفي) — هذا لـ Staff؛ Attendance تشير لـ `employeeId` كمرجع خارجي فقط.
- لا تُدير سياسات الأجر أو قواعد الخصم/المكافأة — هذا لـ Payroll حصريًا.

**Owned Concepts:** AttendanceRecord, CheckInEvent, CheckOutEvent, WorkingHoursSummary, GPSVerification, DeviceVerification, AttendanceException (Late/EarlyLeave/Absence)

> **الفصل الحاكم (بعد إعادة النظر المعمارية):** Attendance وPayroll **دومينان منفصلان تمامًا Must-Have في MVP** (لم يعد Payroll مؤجَّلًا لـ Phase 2). Attendance تنشر **حقائق فقط** (`WorkingHoursCalculated`, `AttendanceExceptionRaised`) دون أي تفسير مالي لها؛ Payroll يستهلك هذه الحقائق ويُقرِّر بنفسه — عبر سياسات قابلة للتهيئة — هل لها أثر مالي أم لا، وبأي قيمة، دائمًا عبر مسار اقتراح يحتاج اعتماد مدير (راجع القسم 4.12).

---

### 4.11 Expenses

**Purpose:** المصدر الوحيد للحقيقة لكل مصروف تشغيلي غير مرتبط بالمخزون — توثيق حدوث المصروف فقط، دون إدارة سداده الفعلي.

**Responsibilities:**
- تصنيف المصروفات (Expense Categories)
- تسجيل مصروفات فعلية مباشرة (بدون اعتماد مسبق في MVP)
- إرفاق مستندات داعمة اختيارية
- إدارة حالة المصروف (Recorded/Cancelled)
- إتاحة مسار تصحيح مُتحكَّم به دون تعديل السجل الأصلي مباشرة

**Out of Scope:**
- لا تملك سداد المصروف الفعلي (نقدًا، تحويل...) — توثيق حدوث المصروف فقط.
- لا تملك مراكز التكلفة أو الميزانيات في MVP.
- **لا تؤثر أبدًا على المخزون أو أرصدة الموردين** — عزل صارم ومتعمَّد عن Inventory وSuppliers & Business Accounts.
- لا تملك الرواتب كمصروف مُدار من داخلها (Payroll domain منفصل، حتى لو ظهر لاحقًا كبند في التقارير المالية الموحدة عبر Reporting).
- **لا يوجد اعتماد مسبق (Approval Workflow) في MVP** — التسجيل مباشر بصلاحية فقط، خلافًا لنموذج Payroll (Suggested/Approved) عمدًا — قرار عمل صريح لكل دومين حسب طبيعته.

**Owned Concepts:** ExpenseCategory, Expense, ExpenseAttachment, ExpenseStatus, ExpenseCorrection

> **ملاحظة على الاتساق:** Expenses يتحقق من `recordedBy` (employeeId) عبر Read Model محلي من أحداث Staff الستة — نفس نمط Attendance وPayroll بالضبط.

---

### 4.12 Payroll

**Purpose:** تطبيق سياسات الأجر القابلة للتهيئة على حقائق الحضور والقرارات الإدارية، عبر نموذج **اقتراح ثم اعتماد** — لا تأثير مالي تلقائي أبدًا بدون مراجعة بشرية صريحة.

> **قرار مُعاد النظر فيه:** كان القرار السابق تأجيل Payroll لـ Phase 2. **هذا القرار أُلغي.** بعد مراجعة السوق المستهدف، تبيّن أن Attendance بدون أي انعكاس مالي محدود القيمة لصاحب كافيه صغير. Payroll الآن **Must-Have كامل في MVP**، لكنه **يظل دومينًا منفصلًا تمامًا عن Attendance** بحدود صارمة.

**Responsibilities:**
- إدارة ملفات الرواتب الأساسية للموظفين (Salary Profiles) ومكوناتها (Salary Components)
- تطبيق قواعد قابلة للتهيئة لكل Tenant تُحوِّل حقائق Attendance لاقتراحات مالية (مثال: تأخير أكثر من 30 دقيقة 3 مرات خلال فترة الراتب → اقتراح خصم نصف يوم)
- حساب الأوفر تايم بناءً على ساعات العمل الفعلية متجاوزة الساعات المجدولة
- إدارة المكافآت والخصومات اليدوية التي يُضيفها المدير مباشرة
- إدارة السلف والقروض للموظفين (Advances & Loans) وجدولة سدادها عبر دورات رواتب مستقبلية
- توليد وإدارة **اقتراحات تعديل الراتب** (Payroll Adjustments) بحالة `Pending` دائمًا كبداية
- إتاحة اعتماد/رفض كل اقتراح للمدير قبل تفعيله
- تجميع دورة راتب شهرية كاملة (Payroll Run) من كل الاقتراحات المُعتمَدة فقط، وإصدار كشوف الرواتب (Payslips)

**Out of Scope:**
- **لا تُسجِّل أي حضور بنفسها إطلاقًا** — تستهلك فقط حقائق Attendance جاهزة (`WorkingHoursCalculated`, `AttendanceExceptionRaised`).
- **لا تُدير بيانات الموظف الأساسية** (الاسم، الفرع، الدور) — تستهلك `employeeId` كمرجع خارجي من Staff.
- **لا تُطبِّق أي خصم أو مكافأة تلقائيًا دون اعتماد بشري.** كل تأثير مالي يبدأ كاقتراح `Pending`، ولا يدخل حساب الراتب الفعلي إلا بعد قرار Approve صريح من مدير يملك الصلاحية.

**Owned Concepts:** SalaryProfile, SalaryComponent, PayrollAdjustment (Suggested/Approved/Rejected)، PayrollAdjustmentRule، EmployeeAdvance، PayrollRun، Payslip

> **نموذج Suggested Adjustments (المبدأ الحاكم لكل الدومين):** أي أثر مالي — خصم، مكافأة، أوفر تايم، غرامة — يبدأ دائمًا كـ `PayrollAdjustmentSuggested` بحالة `Pending`. المدير يستعرض كل الاقتراحات قبل إغلاق دورة الراتب، ويقرر: Approve أو Reject. **فقط الاقتراحات المُعتمَدة تدخل حساب الراتب النهائي.** هذا يحافظ على الأتمتة (النظام يقترح تلقائيًا بناءً على القواعد) مع إبقاء التحكم الكامل بيد الإدارة (لا قرار مالي يُفرَض تلقائيًا).
>
> **ملاحظة على ملكية القواعد (`PayrollAdjustmentRule`):** هذه قواعد عمل غنية ومركبة (عتبات، معادلات، أنواع متعددة) خاصة بكل Tenant — تُدار كـ Master Data مملوكة لـ Payroll نفسه (بنفس نمط `DiscountEligibilityRule` المملوكة لـ CRM)، **وليست** عبر Settings العام (الذي يناسب أعلامًا بسيطة single-value مثل `NegativeStockPolicy`، وليس محركات قواعد معقدة).
>
> **✅ سؤال معماري كان مفتوحًا — حُسِم الآن:** كل من Attendance وPayroll يشيران لـ `employeeId` كمرجع خارجي من **Staff**. Staff الآن ينشر 6 أحداث دورة حياة كاملة (`EmployeeCreated`, `EmployeeUpdated`, `EmployeeActivated`, `EmployeeDeactivated`, `EmployeeTransferred`, `EmployeeTerminated` — راجع §4.9 وRFC-002 §11)، وكلا الدومينين يحتفظان بـ Read Models محلية منها، بنفس نمط Supplier/StockItem. **لا فجوة متبقية.**

---

### 4.13 Reporting

**Purpose:** الإجابة على الأسئلة التجارية للكافيه بالأرقام — تجميع وعرض البيانات التشغيلية والمالية من كل الـ Domains الأخرى، كمستهلك بحت بلا أي حقيقة عمل أصلية.

**Responsibilities:**
- الاستماع لكل حدث في المنصة (48 حدثًا من 12 دومين) وبناء Read Models تحليلية
- حساب KPIs مُصنَّفة حسب 12 فئة عمل (Sales, Financial, Inventory, Purchasing, Suppliers, CRM, Staff, Attendance, Payroll, Operations, Branches, Executive)
- لوحات تحكم مخصَّصة لكل دور وظيفي (Cafe Owner, Branch Manager, Cashier, Kitchen Manager, Accountant, HR)
- الاحتفاظ بلقطات تاريخية ثابتة (Immutable Historical Snapshots)

**Out of Scope:**
- **لا تملك أي بيانات مصدرية (Source of Truth) لأي مفهوم تجاري.** Reporting هو Domain "قارئ فقط" (Read-only Consumer) لكل الأحداث — لا يُنشئ أو يُعدّل بيانات تجارية أصلية أبدًا.
- **لا يعيد تنفيذ أي منطق عمل مملوك لدومين آخر** (مثال: لا يحسب تكلفة المخزون بنفسه — يستهلكها جاهزة من `InventoryMovementRecorded`).

**Owned Concepts:** KPIDefinition, DailySnapshot, DashboardConfiguration, EmployeePerformanceSnapshot (كلها Read Models مُشتقة، وليست مصدر حقيقة)

> **المبدأ الحاكم:** لو Reporting اختفى بالكامل، إعادة تشغيل كل الأحداث (Event Replay) كافية لإعادة بناء كل تقرير — راجع Domain-Reporting.md للتفاصيل الكاملة.

---

## 5. Cross-Domain Ownership — إجابات مباشرة على الأسئلة المطروحة

| السؤال | الإجابة |
|--------|---------|
| هل Sales تملك Payments؟ | لا. Sales تملك حالة الدفع كخاصية على المعاملة فقط. Payments كنظام بوابات دفع مستقل هو Domain مستقبلي منفصل. |
| هل Inventory تملك stock valuation أم فقط الحركات؟ | تملك الاثنين: الحركات والتقييم المالي كليهما ضمن مسؤوليتها. |
| هل Payroll تحسب الحضور أم Attendance فقط تنشر ساعات العمل؟ | Attendance تقيس وتعتمد وتنشر ساعات العمل فقط. Payroll يستهلكها ويحوّلها لأجر. |
| من يملك Products, Recipes, Ingredients, Menu Items؟ | كلها ضمن **Menu** كتعريف (Master Data). أما **رصيد/قيمة** المكوّنات في المخزون فتتبع **Inventory** حصريًا. |
| من يملك تنفيذ الطلب (Preparing/Ready/Served)؟ | Domain مستقل جديد: **Order Fulfillment**، منفصل تمامًا عن Sales (القسم 4.2). |
| هل Expenses وPurchasing يتوحدان؟ | لا. يبقيان منفصلين لاختلاف الـ Workflow جذريًا (Purchasing: Supplier→PO→Receiving→Inventory؛ Expenses: تسجيل مباشر→اعتماد→Reporting). قد يظهران معًا في تقرير Profit & Loss عبر Reporting دون أن يكونا Domain واحدًا. |
| هل Payroll Must-Have في MVP؟ | **نعم — قرار مُعاد النظر فيه.** كان مؤجَّلًا لـ Phase 2 (System Freeze v1)، لكن أُعيد إدراجه كـ Core Business Domain كامل في MVP بعد مراجعة السوق المستهدف (راجع Product Bible ADR-26، RFC-001 §4.12). Attendance وPayroll دومينان منفصلان، مربوطان بنموذج Suggested Adjustments. |
| هل يمكن إتمام بيع بدون شيفت مفتوح؟ | لا. **Shift Management** Domain جديد يملك دورة الشيفت والدرج النقدي؛ `SaleCompleted` يتطلب شيفتًا مفتوحًا كـ Business Precondition إلزامي. |
| هل الـ Modifier يغيّر الوصفة الفعلية المُستهلَكة؟ | نعم. Modifier يحمل "Recipe Impact" اختياري (استبدال/إضافة)، يُنشر عبر `ModifierRecipeImpactUpdated` من Menu، وInventory هو من يحسب الاستهلاك الفعلي وقت البيع بدمج Base Recipe + Modifier Impacts محليًا. |
| من يملك تعريف المكوّن (StockItem)؟ | **Inventory حصريًا** — الاسم، وحدة القياس، حد إعادة الطلب. Menu.Recipe تشير فقط لـ `stockItemId`، لا تملكه (تصحيح لاحق لقرار سابق — راجع §4.4). |
| هل تعديل الوصفة يؤثر على مبيعات سابقة؟ | لا. كل `StockMovement` ناتج عن بيع يخزّن الكميات الفعلية كأرقام ثابتة وقت الخصم (Immutable Snapshot)، وليس مرجعًا حيًا للوصفة الحالية. |
| هل الرصيد السالب يوقف البيع؟ | يعتمد على `NegativeStockPolicy` القابلة للتهيئة لكل Tenant: Strict/Warning (افتراضي)/Ignore. |
| من يملك بيانات المورد؟ | **Suppliers & Business Accounts** حصريًا — الاسم، بيانات التواصل، شروط الدفع. Purchasing تشير لـ `supplierId` فقط كمرجع خارجي. |
| هل فاتورة الشراء تزيد المخزون؟ | **لا أبدًا.** الفاتورة التزام مالي بحت (`PurchaseInvoiceRecorded`) يُدار في Suppliers & Business Accounts. المخزون يتغيّر حصريًا عبر `GoodsReceived` من Purchasing. هذا الفصل يسمح بتوريد جزئي، أصناف مرفوضة، أو فاتورة تسبق الاستلام دون تعارض. |
| هل خصم المخزون الناتج عن البيع مرئي خارج Inventory؟ | **كان غير مرئي إطلاقًا حتى اكتشاف الفجوة أثناء تصميم Reporting.** الآن: `InventoryMovementRecorded` يُنشَر لكل حركة (بيع، استلام، تسوية، هدر، جرد) بالتقييم المالي الكامل — مسار Reporting الوحيد لحساب Food Cost وInventory Valuation. |
| مين بيسجّل مين نفّذ عملية البيع أو التحضير؟ | حقول اختيارية جديدة: `createdByEmployeeId` (OrderPlaced)، `completedByEmployeeId` (SaleCompleted)، `preparedByEmployeeId` (OrderReady)، `servedByEmployeeId` (OrderServed) — لأغراض Reporting فقط (Top Cashiers/Baristas)، ليست شرطًا مسبقًا لأي حدث. |
| هل Order وSale نفس الكيان؟ | **لا.** كيانان منفصلان داخل Sales، مرتبطان بمرجع `orderId` صريح — يسمح مستقبلًا بـ Split Payments، Table Transfer، Merge Orders (اكتُشف عبر End-to-End Walkthrough). |
| هل يمكن إنشاء Order بدون شيفت مفتوح؟ | لا. يحمل Order و`OrderPlaced` قيمة `shiftId` إلزامية من اللحظة الأولى. يستخدم Shift Management هذه القيمة نفسها في Open Orders Counter؛ لا يجوز استنتاج الشيفت من `createdByEmployeeId?`. |
| من يملك سعر Menu وكيف تستخدمه Sales؟ | Menu يملك السعر الحالي والمجدول. Sales يحتفظ فقط بـ `MenuItemSalesReadModel.currentBasePrice` من أحداث التفعيل/تغيير السعر/التعطيل، وينسخه إلى `OrderLine.unitPrice` Snapshot ثابت وقت إنشاء Order؛ لا إعادة تسعير لاحقة. |
| مين بيتحقق من صحة `stockItemId`؟ | Menu وPurchasing كلاهما يحتفظان بـ Read Model محلي من `StockItemCreated`/`StockItemDeactivated` (نفس نمط التحقق من الموردين) — كان Gap مكتشَف عبر Walkthrough، تم سده. |
| ماذا يحدث لأوامر شراء مفتوحة عند تعطيل مورد؟ | **تبقى سارية بالكامل** — يمكن استلام بضاعة ضدها بشكل طبيعي؛ التعطيل يمنع فقط أوامر شراء **جديدة** (System Freeze v1 Finding #1). |
| كيف تُحدَّد إعادة المخزون عند Refund؟ | **ليست سياسة عامة على مستوى الفرع** — قرار لكل بند مرتجع على حدة عبر `disposition` Enum (`Restock`/`Discard`/`InspectionRequired`) يُحدَّد وقت تسجيل المرتجع (System Freeze v1 Finding #2). |
| هل `Strict` Policy تمنع إتمام البيع فعليًا؟ | **لا يمكنها منع معاملة مالية مكتملة بأثر رجعي** (تتعارض مع Immutability). الحل: طبقتان — Sales تمنع `OrderPlaced` استباقيًا عبر Availability Read Model (`ItemAvailabilityChanged`، Eventually Consistent)، وInventory تبقى Backstop نهائي بتصعيد Critical في الحالات النادرة المتبقية (System Freeze v1 Finding #3، الأهم). |
| هل يمكن قفل شيفت عليه طلبات مفتوحة؟ | **لا.** Shift Management يستمع لـ `OrderPlaced`/`SaleCompleted`/`OrderCancelled`/`OrderRejected` للحفاظ على عدّاد محلي يمنع `ShiftClosed` طالما العدّاد > صفر (System Freeze v1 Finding #4). |
| هل Payroll يحسب أي شيء تلقائيًا بدون مراجعة؟ | **لا أبدًا.** كل تأثير مالي (خصم/مكافأة/أوفر تايم) يبدأ كـ `PayrollAdjustmentSuggested` بحالة `Pending`؛ يحتاج اعتماد صريح من مدير قبل دخول حساب الراتب الفعلي — لا استثناء، حتى للقواعد الآلية المبنية على Attendance. |
| هل Attendance تعرف أي شيء عن الراتب؟ | **لا إطلاقًا.** Attendance تنشر حقائق فقط (`WorkingHoursCalculated`, `AttendanceExceptionRaised`)؛ لا تعرف حتى بوجود Payroll كمستهلك — نفس مبدأ "Sales تنشر Events دون معرفة من يستمع". |
| من يملك بيانات الموظف (`employeeId`)؟ | **Staff حصريًا.** Attendance وPayroll يشيران له فقط كمرجع، عبر Read Models محلية من أحداث Staff الستة (`EmployeeCreated/Updated/Activated/Deactivated/Transferred/Terminated`) — فجوة قديمة موثَّقة، مُغلَقة الآن. |
| هل Expenses يمر باعتماد قبل التسجيل؟ | **لا.** قرار عمل صريح: التسجيل مباشر بصلاحية فقط في MVP — خلافًا لـ Payroll (Suggested/Approved) عمدًا؛ كل دومين يختار نموذج الحوكمة المناسب لطبيعته. |
| هل Expenses يؤثر على المخزون أو أرصدة الموردين؟ | **لا أبدًا.** عزل صارم ومتعمَّد — لا حدث مشترك بين Expenses وInventory أو Suppliers & Business Accounts. |

---

## 6. High-Level Event Flow Map

> ملاحظة: هذا مخطط عام لتوضيح اتجاه التفاعل فقط. القائمة التفصيلية الكاملة للأحداث (الأسماء الدقيقة، الـ Payload، الإصدارات) ستكون في وثيقة منفصلة: **Event Catalog** (الخطوة التالية بعد هذا الـ RFC).

```
Shift Management  --ShiftOpened-->             Sales (Read Model), Reporting
Shift Management  --ShiftClosed-->              Sales (Read Model), Reporting, Notifications
Sales             --OrderPlaced-->              Order Fulfillment, Shift Management (عدّاد)
Menu              --MenuItemActivated/PriceChanged/Deactivated--> Sales (MenuItemSalesReadModel), Reporting
Order Fulfillment --OrderReady-->               Notifications, Reporting
Order Fulfillment --OrderServed-->              Sales (لإغلاق/إتمام المعاملة), Reporting
Order Fulfillment --OrderCancelled/Rejected-->  Sales, Notifications, Reporting, Shift Management (عدّاد)
Sales             --SaleCompleted-->            Inventory, CRM, Reporting, Notifications, Shift Management (عدّاد)
Menu              --ModifierRecipeImpactUpdated--> Inventory
Inventory         --ItemAvailabilityChanged-->  Sales (Read Model), Order Fulfillment, Reporting
Inventory         --InventoryMovementRecorded--> Reporting
Suppliers & Business Accounts --SupplierCreated--> Purchasing (Read Model), Reporting
Purchasing        --GoodsReceived-->            Inventory, Reporting, Suppliers & Business Accounts (للمطابقة الثلاثية اختياريًا)
Suppliers & Business Accounts --PurchaseInvoiceRecorded--> Reporting
Suppliers & Business Accounts --PaymentRecorded-->  Reporting
Suppliers & Business Accounts --SupplierPaymentOverdue--> Notifications, Reporting
Inventory         --StockLevelLow-->            Notifications, Reporting
Inventory         --StockCountFinalized-->      Reporting
Attendance        --WorkingHoursCalculated-->   Reporting, Payroll
Menu              --RecipeUpdated-->            Inventory (لإعادة حساب متطلبات المكونات)
CRM               --CustomerCreated-->          Reporting
CRM               --DiscountEligibilityFlagged--> Sales (اقتراح فقط؛ Sales تقرر التطبيق)
Attendance        --AttendanceExceptionRaised--> Notifications, Reporting, Payroll
Staff             --EmployeeCreated/Updated/Activated/Deactivated/Transferred/Terminated--> Attendance (RM), Payroll (RM), Expenses (RM), Reporting
Expenses          --ExpenseRecorded/Cancelled/Corrected--> Reporting
Payroll           --EmployeeAdvanceIssued-->    Reporting
Payroll           --PayrollAdjustmentSuggested--> Reporting, Notifications
Payroll           --PayrollAdjustmentApproved/Rejected--> Reporting
Payroll           --PayrollRunCompleted-->      Reporting, Notifications
```

> **ملاحظة على تسلسل Sales ↔ Order Fulfillment:** العلاقة ليست أحادية الاتجاه بالكامل — Sales تنشر `OrderPlaced` ليبدأ التنفيذ، وOrder Fulfillment تنشر أحداث الحالة النهائية (`OrderServed`/`OrderCancelled`) التي قد تحتاجها Sales لإغلاق المعاملة ماليًا. هذا يبقى ضمن مبدأ "Event-Driven بين الـ Domains" دون أي استدعاء مباشر بينهما.

كل الـ Domains أعلاه (باستثناء Reporting) قد تنشر أحداثها أيضًا إلى **Audit Logs** (Supporting Domain) بشكل عام وغير مرتبط بمنطق تجاري.

---

## 7. Resolved Decisions (سابقًا Open Questions — تم الحسم)

| # | القرار | الحالة |
|---|--------|--------|
| 1 | CRM تقترح أهلية الخصم فقط (Eligibility)؛ Sales هي دائمًا من تُطبّق أو ترفض القرار النهائي، باعتبارها Source of Truth للمعاملات المالية | **محسوم** |
| 2 | Expenses وPurchasing يبقيان Domains منفصلين تمامًا لاختلاف الـ Workflow جذريًا؛ يجتمعان فقط على مستوى العرض في Reporting (مثل P&L) دون توحيد معماري | **محسوم** |
| 3 | ~~Payroll يُنقَل رسميًا إلى Phase 2، خارج نطاق MVP...~~ — **⚠️ عُكِس هذا القرار لاحقًا.** راجع Product Bible ADR-26 وRFC-001 §4.12: Payroll عاد Must-Have كامل في MVP كدومين منفصل عن Attendance بنموذج Suggested Adjustments | **مُستبدَل (كان محسومًا وقت كتابته)** |
| 4 | يُضاف Domain جديد مستقل: **Order Fulfillment (Kitchen Operations)** — منفصل عن Sales، مسؤول عن دورة حياة تنفيذ الطلب (Preparing/Ready/Served/Cancelled/Rejected)، ويفتح الباب مستقبلًا لـ KDS/Barista Screen/QR Ordering/Delivery دون تلويث Sales | **محسوم** |

---

## 8. Next Steps

بعد اعتماد هذا الـ RFC:

1. **Event Catalog** — توثيق كامل لكل حدث (الاسم، الناشر، المستمعين، الـ Payload، الإصدار).
2. **Domain Document: Sales** (أول Domain تفصيلي) وفق القالب الثابت:
   Purpose · Responsibilities · Out of Scope · Business Concepts · Business Rules · Domain Events (Published) · Domain Events (Subscribed) · Public APIs · Permissions · Future Extensions

---

*نهاية RFC-001.*
