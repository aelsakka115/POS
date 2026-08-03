# Master System Flow — Cafe Engine

**Type:** Consolidation Reference (ليست RFC وليست Domain Document)
**Purpose:** مرجع معماري واحد يشرح كيف يعمل Cafe Engine من طرف لطرف، بتجميع ما هو موثَّق بالفعل فقط
**Sources:** Product Bible v1، RFC-001، RFC-002، System Freeze v1، كل Domain Documents المعتمدة
**Status:** **Consolidation Reference — Approved source documents remain authoritative; changes require their RFC-005 process**

---

## 1. High-Level Business Lifecycle

تصنيف كل الدومينز المذكورة في طلبك حسب RFC-001 (Product Bible §5.3):

| الطبقة | الدومينز | الحالة التوثيقية |
|--------|----------|-------------------|
| **Platform Domains** | Auth, Users, Roles, Companies, Branches, **Settings** | حدود عامة فقط (Product Bible)، لا Domain Document تفصيلي بعد |
| **Supporting Domains** | **Notifications**, Automation, Files, Audit Logs | حدود عامة فقط (Product Bible)، لا Domain Document تفصيلي بعد |
| **Core Business Domains** | Sales, Order Fulfillment, Shift Management, Menu, Inventory, Suppliers & Business Accounts, Purchasing, CRM, Staff, Attendance, Expenses, Payroll, **Reporting** | **✅ كل الـ 12 Domain Document مكتملة بالتفصيل** (13 دومين لو حسبنا Shift Management كحدود فقط). Reporting هو الأخير — Terminal Consumer لكل الـ 48 حدث في RFC-002 |
| **AI (Future)** | — | **ليس Domain له حدود في RFC-001.** موثَّق في Product Bible فقط كـ "AI Infrastructure" ضمن Core Platform (بنية تحتية غير مُفعَّلة)، تحت مبدأ AI-Ready, Not AI-Dependent (ADR-10). Phase 3 بالكامل. |

> ملاحظة: Supplier وPurchasing وInventory وMenu وSales وOrder Fulfillment وCRM وReporting وAttendance المذكورة في طلبك كلها **Core Business Domains**. Settings وNotifications مذكورتان في طلبك أيضًا، وهما Platform/Supporting كما هو موضّح أعلاه — لا يوجد تعارض، فقط توضيح تصنيف.

---

## 2. End-to-End Operational Flow

هذا التسلسل مبني حرفيًا على الأحداث الموثَّقة في RFC-002 وUse Cases الخاصة بكل Domain Document، بنفس الترتيب المطلوب:

```
[1] Suppliers & Business Accounts: SupplierCreated
        │
        ▼
[2] Purchasing: PurchaseOrderCreated (يتحقق من Supplier عبر Read Model)
        │
        ▼
[3] Purchasing: GoodsReceived (مع Variance/Price Variance إن وُجدت)
        │
        ├──▶ Inventory: تُحدَّث StockMovement + StockValuation (Weighted Average)
        │         │
        │         └──▶ Inventory: ItemAvailabilityChanged (إن تغيّرت قابلية بيع أي منتج)
        │
        └──▶ Suppliers & Business Accounts (اختياري): مرجع لمطابقة PurchaseInvoiceRecorded لاحقًا
        │       (الفاتورة نفسها تُسجَّل بشكل مستقل تمامًا — Business Rule: لا فاتورة تزيد المخزون)
        │
        ▼
[4] Menu: MenuItemActivated + RecipeUpdated + ModifierRecipeImpactUpdated
        │  (يتحقق من StockItemCreated عبر Read Model قبل بناء أي وصفة)
        ▼
[5] Shift Management: ShiftOpened
        │  (شرط مسبق إلزامي لكل ما يلي)
        ▼
[6] Sales: OrderPlaced (shiftId إلزامي + unitPrice: Money Snapshot من MenuItemSalesReadModel)
        │  (يتحقق من: شيفت مفتوح + Availability عند Strict)
        │
        ├──▶ Order Fulfillment: يُنشئ FulfillmentOrder، يوجّه للمحطات عبر PreparationInfo
        │         │
        │         ▼
        │    OrderReady → OrderServed
        │         │
        │         └──▶ Sales: تستهلك OrderServed لإغلاق دورة الطلب تشغيليًا
        │
        └──▶ Shift Management: عدّاد الطلبات المفتوحة +1
        │
        ▼
[7] Sales: SaleCompleted (دفع + orderId + shiftId — كل الشروط المسبقة مُستوفاة)
        │
        ├──▶ Inventory: خصم فعلي = Base Recipe + Modifier Recipe Impacts (Snapshot ثابت غير قابل للتغيير رجعيًا)
        │         │
        │         └──▶ إعادة حساب ItemAvailabilityChanged لأي منتج متأثر
        │
        ├──▶ CRM: تحديث تاريخ شراء العميل (إن وُجد customerId)
        │
        ├──▶ Reporting: تحديث النماذج التحليلية
        │
        ├──▶ Notifications: تنبيهات إن انطبقت
        │
        └──▶ Shift Management: عدّاد الطلبات المفتوحة -1
        │
        ▼
[8] Shift Management: ShiftClosed
        (يُمنَع طالما عدّاد الطلبات المفتوحة > صفر)
```

**ملاحظة على "Payment":** لا يوجد حدث منفصل باسم Payment — الدفع جزء من `SaleCompleted` نفسه (حالة `paymentStatus`/`paymentMethod` ضمن Payload الحدث الواحد)، وليس خطوة منفصلة في تسلسل الأحداث. هذا مطابق تمامًا لتصميم Sales في RFC-002 §4.2.

---

## 3. Domain Interaction Matrix

| Domain | Owns (Owned Concepts) | Consumes Events | Publishes Events | Read Models يحتفظ بها |
|--------|------------------------|-------------------|---------------------|--------------------------|
| **Sales** | Order, OrderLine, Sale, Invoice, Discount, PaymentStatus | OrderServed, OrderCancelled, OrderRejected, ShiftOpened, ShiftClosed, ItemAvailabilityChanged, MenuItemActivated, MenuItemPriceChanged, MenuItemDeactivated, DiscountEligibilityFlagged | OrderPlaced, SaleCompleted, SaleRefunded, DiscountApplied | Shift Status RM، Item Availability RM، MenuItemSalesReadModel |
| **Order Fulfillment** | FulfillmentOrder, FulfillmentOrderLine, StationAssignment, OrderStatus | OrderPlaced, MenuItemActivated, MenuItemDeactivated, ItemAvailabilityChanged (استشاري) | OrderReady, OrderServed, OrderCancelled, OrderRejected | Menu Items + PreparationInfo RM |
| **Shift Management** | ShiftSession, CashDrawerOpening/Closing, CashDifference, EndOfShiftSummary, OpenOrdersCounter | OrderPlaced, SaleCompleted, OrderCancelled, OrderRejected | ShiftOpened, ShiftClosed | Open Orders Counter (داخلي) |
| **Menu** | MenuItem, Category, Recipe, RecipeIngredientLink, ModifierGroup, Modifier, ModifierRecipeImpact, PreparationInfo, BasePrice | StockItemCreated, StockItemDeactivated | MenuItemActivated, MenuItemDeactivated, MenuItemPriceChanged, RecipeUpdated, ModifierRecipeImpactUpdated | Stock Items RM (للتحقق المرجعي) |
| **Inventory** | StockItem, UnitOfMeasure, StockMovement, StockValuation, StockCount, WasteRecord, ReorderLevel, NegativeStockPolicy, ItemAvailability | SaleCompleted, SaleRefunded, GoodsReceived, RecipeUpdated, ModifierRecipeImpactUpdated | StockLevelLow, StockCountFinalized, StockAdjusted, StockItemCreated, StockItemDeactivated, ItemAvailabilityChanged, **InventoryMovementRecorded** | Recipe + ModifierImpact RM (محلي، لحساب الاستهلاك) |
| **Suppliers & Business Accounts** | Supplier, SupplierCategory, AccountsPayableEntry, Payment, PaymentAllocation, AgingBucket | GoodsReceived (اختياري) | SupplierCreated, SupplierDeactivated, PurchaseInvoiceRecorded, PaymentRecorded, SupplierPaymentOverdue | — |
| **Purchasing** | PurchaseOrder, PurchaseOrderLine, GoodsReceipt | SupplierCreated, SupplierDeactivated, StockItemCreated, StockItemDeactivated | GoodsReceived, PurchaseOrderCreated, PurchaseOrderCancelled | Suppliers RM، Stock Items RM |
| **CRM** | Customer, CustomerPurchaseHistory, LoyaltyAccount (Phase 2) | SaleCompleted (تحديث تاريخ الشراء) | CustomerCreated, DiscountEligibilityFlagged | — |
| **Staff** | Employee, EmploymentStatus, BranchAssignment, Department, JobTitle, ManagerRelationship, EmploymentType, StaffNumber, DefaultShiftAssignment, BaseSalaryReference | — (لا أحداث مُستهلَكة، مصدر تعريف بحت — نفس نمط Menu) | EmployeeCreated, EmployeeUpdated, EmployeeActivated, EmployeeDeactivated, EmployeeTransferred, EmployeeTerminated | — |
| **Attendance** | AttendanceRecord, CheckInEvent, CheckOutEvent, WorkingHoursSummary, GPSVerification, DeviceVerification, AttendanceException | **Staff (كل الأحداث الستة)** — فجوة سابقة مُغلَقة الآن | WorkingHoursCalculated, AttendanceExceptionRaised | Employee Read Model (من Staff) |
| **Expenses** | ExpenseCategory, Expense, ExpenseAttachment, ExpenseStatus, ExpenseCorrection | Staff (كل الأحداث الستة) | ExpenseRecorded, ExpenseCancelled, ExpenseCorrected | Employee Read Model (من Staff) |
| **Payroll** | SalaryProfile, SalaryComponent, PayrollAdjustmentRule, PayrollAdjustment, EmployeeAdvance, PayrollRun, Payslip | WorkingHoursCalculated, AttendanceExceptionRaised, **Staff (كل الأحداث الستة)** — فجوة سابقة مُغلَقة الآن | EmployeeAdvanceIssued, PayrollAdjustmentSuggested, PayrollAdjustmentApproved, PayrollAdjustmentRejected, PayrollRunCompleted | Employee Read Model (من Staff) |
| **Reporting** | KPIDefinition, DailySnapshot, DashboardConfiguration, EmployeePerformanceSnapshot | **كل الأحداث الـ 48** من كل الدومينز الـ 12 (مستهلك نهائي — Terminal Consumer) | لا يوجد (Read-only Consumer دائمًا) | Aggregated Metrics/Snapshots (مُشتقة من كل الدومينز، لا مصدر حقيقة أصلي) |

> **ملاحظة على Staff (مُحدَّثة):** كان RFC-001 §4.9 يُعرِّف حدود Staff فقط (Owned Concepts دون أي حدث). **هذه الفجوة أُغلِقت الآن بالكامل** — Staff ينشر 6 أحداث (`EmployeeCreated/Updated/Activated/Deactivated/Transferred/Terminated`)، موثَّقة في RFC-002 §11 ومصفوفة الاشتراكات الكاملة (§16). Attendance وPayroll كلاهما يستهلكانها عبر Read Models محلية.

---

## 4. Cross-Domain Read Models (القائمة الكاملة الموثَّقة)

| Read Model | يحتفظ به | مبني من أحداث | الاستخدام |
|------------|-----------|------------------|-----------|
| **Shift Status Read Model** | Sales | `ShiftOpened`, `ShiftClosed` | بوابة تحقق لـ `OrderPlaced` و`SaleCompleted` (Domain-Sales.md Business Rules #12, #13) |
| **Item Availability Read Model** | Sales | `ItemAvailabilityChanged` | بوابة تحقق لـ `OrderPlaced` عند `NegativeStockPolicy=Strict` فقط (Domain-Sales.md Business Rule #15) |
| **MenuItemSalesReadModel** | Sales | `MenuItemActivated`, `MenuItemPriceChanged`, `MenuItemDeactivated` | يحتفظ فقط بـ `tenantId`, `menuItemId`, `isActive`, `currentBasePrice: Money`, `priceEffectiveFrom`, `lastChangedAt` لإنشاء Order؛ بلا price history/future schedules/Inventory/Preparation/Modifier pricing |
| **Menu Items + PreparationInfo Read Model** | Order Fulfillment | `MenuItemActivated`, `MenuItemDeactivated` | توجيه البنود للمحطات الصحيحة (Domain-Order-Fulfillment.md §9) |
| **Open Orders Counter** | Shift Management | `OrderPlaced`, `SaleCompleted`, `OrderCancelled`, `OrderRejected` | منع `ShiftClosed` طالما العدّاد > صفر (RFC-001 §4.3) |
| **Stock Items Read Model** | Menu | `StockItemCreated`, `StockItemDeactivated` | التحقق المرجعي قبل بناء أي Recipe أو ModifierRecipeImpact (Domain-Menu.md §9) |
| **Stock Items Read Model** | Purchasing | `StockItemCreated`, `StockItemDeactivated` | التحقق المرجعي عند إضافة بند لأمر شراء (Domain-Purchasing.md §9) |
| **Suppliers Read Model** | Purchasing | `SupplierCreated`, `SupplierDeactivated` | التحقق المرجعي عند إنشاء أمر شراء (Domain-Purchasing.md §9) |
| **Recipe + ModifierRecipeImpact Read Model** | Inventory | `RecipeUpdated`, `ModifierRecipeImpactUpdated` | حساب الاستهلاك الفعلي وقت `SaleCompleted`، وحساب `ItemAvailabilityChanged` (Domain-Inventory.md §9, §6.6) |
| **Employee Read Model** | Attendance | `EmployeeCreated`, `EmployeeUpdated`, `EmployeeActivated`, `EmployeeDeactivated`, `EmployeeTransferred`, `EmployeeTerminated` | التحقق من صحة `employeeId` قبل قبول أي Check-in/Check-out (Domain-Attendance.md §9) |
| **Employee Read Model** | Payroll | نفس الأحداث الستة أعلاه | تهيئة `SalaryProfile` من `BaseSalaryReference`، والتحقق من صحة `employeeId` قبل أي اقتراح راتب (Domain-Payroll.md §9) |
| **Employee Read Model** | Expenses | نفس الأحداث الستة أعلاه | التحقق من أن `recordedBy` يشير لموظف نشط قبل قبول أي `ExpenseRecorded` (Domain-Expenses.md §9) |

> **مبدأ متكرر عبر كل هذه النماذج:** كل Read Model محلي هو **نسخة Eventually Consistent مبنية بالكامل من أحداث دومين آخر**، وليس استعلامًا مباشرًا أو مشاركة قاعدة بيانات. هذا هو الآلية الوحيدة المسموح بها لأي دومين ليعرف شيئًا عن دومين آخر دون كسر قاعدة "لا استدعاءات مباشرة".

---

## 5. Event Flow Overview (مُجمَّع)

هذا تجميع مباشر لخريطة الأحداث الكاملة كما وردت في RFC-001 §6 وRFC-002 §16، بدون أي إضافة:

```
Suppliers & Business Accounts → SupplierCreated/SupplierDeactivated → Purchasing (RM), Reporting
Purchasing        → PurchaseOrderCreated/Cancelled     → Reporting
Purchasing        → GoodsReceived                       → Inventory, Reporting, Suppliers & Business Accounts (اختياري)
Suppliers & Business Accounts → PurchaseInvoiceRecorded/PaymentRecorded/SupplierPaymentOverdue → Reporting, Notifications

Inventory         → StockItemCreated/Deactivated         → Menu (RM), Purchasing (RM), Reporting
Staff             → EmployeeCreated/Updated/Activated/Deactivated/Transferred/Terminated → Attendance (RM), Payroll (RM), Expenses (RM), Reporting
Menu              → RecipeUpdated/ModifierRecipeImpactUpdated → Inventory
Menu              → MenuItemActivated/Deactivated/PriceChanged → Sales, Order Fulfillment, Reporting

Shift Management  → ShiftOpened/ShiftClosed              → Sales (RM), Reporting, Notifications

Sales             → OrderPlaced                          → Order Fulfillment, Shift Management (عدّاد)
Order Fulfillment → OrderReady                            → Notifications, Reporting
Order Fulfillment → OrderServed                            → Sales, Reporting
Order Fulfillment → OrderCancelled/OrderRejected           → Sales, Notifications, Reporting, Shift Management (عدّاد)

Sales             → SaleCompleted                          → Inventory, CRM, Reporting, Notifications, Shift Management (عدّاد)
Sales             → SaleRefunded                            → Inventory, CRM, Reporting, Notifications
Sales             → DiscountApplied                         → Reporting, CRM

Inventory         → StockLevelLow/StockCountFinalized/StockAdjusted → Notifications (جزئيًا), Reporting
Inventory         → ItemAvailabilityChanged                 → Sales (RM), Order Fulfillment, Reporting
Inventory         → InventoryMovementRecorded                → Reporting

CRM               → CustomerCreated                          → Reporting
CRM               → DiscountEligibilityFlagged                → Sales

Attendance        → WorkingHoursCalculated                   → Reporting, Payroll
Attendance        → AttendanceExceptionRaised                → Notifications, Reporting, Payroll

Expenses          → ExpenseRecorded/Cancelled/Corrected         → Reporting

Payroll           → EmployeeAdvanceIssued                       → Reporting
Payroll           → PayrollAdjustmentSuggested                  → Reporting, Notifications
Payroll           → PayrollAdjustmentApproved/Rejected           → Reporting
Payroll           → PayrollRunCompleted                          → Reporting, Notifications

[كل الأحداث أعلاه] → Reporting (مستهلك نهائي شامل)
[كل الأحداث أعلاه] → Audit Logs (استماع ضمني عام، RFC-002 §16 Rule 5)
```

---

## 6. Architectural Principles (كما استقرت بعد System Freeze v1)

| المبدأ | المصدر | ملخص |
|--------|--------|------|
| **Event-Driven بين الدومينز، Direct Calls داخل نفس الـ Bounded Context** | Product Bible ADR-04، Domain-Sales.md | لا استثناء واحد حتى الآن عبر 7 دومينز مكتملة |
| **Domain Ownership الصارم** | RFC-001 (كل دومين) | كل مفهوم له مالك واحد فقط؛ أي إشارة خارجية = مرجع (ID) وليس ملكية |
| **Single Source of Truth لكل مفهوم** | RFC-001، System Freeze v1 §4 | مثال: StockItem (Inventory فقط)، Supplier (Suppliers & Business Accounts فقط) |
| **Read Models كنمط موحَّد للمعرفة عبر الدومينز** | System Freeze v1 §4، القسم 4 أعلاه | 12 Read Models موثَّقة، كلها بنفس النمط (Eventually Consistent، مبنية من أحداث) |
| **Immutable Business Events / Financial Immutability** | Domain-Sales.md، Domain-Inventory.md | Sale مكتملة لا تُلغى بأثر رجعي؛ StockMovement الناتج عن بيع يحمل كميات ثابتة (Recipe Snapshot) |
| **AI-Ready but AI-Independent** | Product Bible ADR-10 | لا Vector DB ولا Embeddings في MVP؛ فقط بيانات نظيفة + أحداث مُهيَّأة لاستخدام مستقبلي |
| **No Direct Cross-Domain Calls** | Product Bible، صمد حتى في أصعب اختبار (Strict Policy — System Freeze v1 Finding #3) | حُلَّت كل الحالات الصعبة بـ Read Models بدل كسر القاعدة |
| **Modular Monolith First** | Product Bible ADR-03 | لا Microservices حتى الآن؛ كل الدومينز داخل نفس الوحدة التشغيلية |
| **Eventual Consistency كـ Trade-off موثَّق وليس ثغرة مخفية** | RFC-002 §6.6، System Freeze v1 §4 | صراحة في كل مكان يُستخدَم فيه (خصوصًا Item Availability RM) |
| **Per-Tenant Ordered Delivery** | RFC-002 §17 Rule 8 | أساس كل قواعد الـ Immutability والـ Read Models المحلية |
| **Two-Layer Defense كنمط لقرارات حرجة** | Domain-Inventory.md Business Rule #4 | Sales (وقائي، Eventually Consistent) + Inventory (Backstop نهائي) — نفس النمط قابل لإعادة الاستخدام مستقبلًا لقرارات مشابهة |

---

## 7. Validation

راجعت كل تفاعل مذكور أعلاه مقابل RFC-001 وRFC-002 مباشرة (وليس من الذاكرة). النتيجة:

✅ **كل الأحداث الـ 48 في RFC-002 مُمثَّلة بدقة** في القسم 5 (Event Flow Overview)، بنفس أسماء الناشر والمستمعين من مصفوفة الاشتراكات §16 (وتُجمَّع الأحداث ذات المسار الواحد في سطر واحد للاختصار).

✅ **كل الـ Read Models الاثني عشر** المذكورة صراحة في Domain Documents مُجمَّعة في القسم 4 دون إضافة أو حذف.

✅ **سجلات القرار متسقة:** Product Bible يحتوي 36 Business ADRs (بما فيها ADR-36)، وRFC-004 يحتوي 6 SA-ADRs (بما فيها SA-ADR-06).

✅ **لا تعارض بين RFC-001 وRFC-002** في أي نقطة تم فحصها.

### ⚠️ ملاحظة واحدة تستحق الانتباه (وليست تعارضًا، بل فجوة توثيق):

### ✅ تحديث: الفجوة السابقة حول Staff أُغلِقت بالكامل

**Staff Domain كان بلا أي حدث منشور أو مُستهلَك** — كانت هذه فجوة موثَّقة صراحة في هذا القسم سابقًا. **تم بناء Domain-Staff.md بالكامل**، وأصبح Staff ينشر 6 أحداث (`EmployeeCreated/Updated/Activated/Deactivated/Transferred/Terminated`)، يستهلكها كل من **Attendance وPayroll** عبر Read Models محلية مستقلة (نفس النمط المعماري المُستخدَم مع Supplier/StockItem). لا توجد فجوة معلَّقة متبقية في منطقة Staff/Attendance/Payroll حاليًا.

**تحقق إضافي بعد إغلاق الفجوة:** RFC-002 يحتوي الآن **48 حدثًا** (39 → 45 بعد Staff → 47 بعد Expenses → 48 بعد `InventoryMovementRecorded`)، ومصفوفة الاشتراكات (§16) تحتوي 48 صفًا مطابقة تمامًا — لا تعارض.

### ✅ إغلاق نهائي: كل الـ 13 دومين مُعرَّفة الحدود، 12 منهم بـ Domain Document كامل

مع اكتمال **Reporting**، أصبحت كل الدومينز التشغيلية الأساسية موثَّقة بالتفصيل الكامل. Reporting بالذات يستهلك **كل الـ 48 حدث بلا استثناء واحد** — تحقق مباشر من مبدأ "لو Reporting اختفى، إعادة تشغيل الأحداث كافية لإعادة بنائه بالكامل" (Domain-Reporting.md §1).

لا توجد أي فجوة أخرى أو تعارض يستدعي التوقف.

---

*نهاية Master System Flow. هذه الوثيقة مرجع تجميعي فقط — أي تعديل مستقبلي على أي دومين يجب أن يُحدَّث هنا لاحقًا لضمان بقائها متزامنة مع الحقيقة.*
