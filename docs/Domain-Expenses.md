# Domain Document: Expenses

**Type:** Domain Document
**Domain Classification:** Core Business Domain (Cafe Engine) — Non-Inventory Operational Expenses
**Depends on:** RFC-001 (Context Map), RFC-002 (Event Catalog), RFC-003 (Capability Architecture), System Freeze v1, Master-System-Flow.md
**Reference Template:** Domain-Sales.md، Domain-Menu.md، Domain-Inventory.md، Domain-Suppliers-Business-Accounts.md، Domain-Purchasing.md، Domain-Order-Fulfillment.md، Domain-CRM.md، Domain-Attendance.md، Domain-Payroll.md، Domain-Staff.md
**Status:** Draft v1

---

## 1. Domain Purpose

المصدر الوحيد للحقيقة (Single Source of Truth) لكل مصروف تشغيلي **غير مرتبط بالمخزون**: إيجار، فواتير خدمات، صيانة، مصروفات نثرية. Expenses **يوثِّق حدوث المصروف فقط** — لا يدير سداده فعليًا، ولا يؤثر بأي شكل على المخزون أو أرصدة الموردين.

---

## 2. Responsibilities

- تصنيف المصروفات (Expense Categories)
- تسجيل مصروفات فعلية (Expense Records) مرتبطة بفرع وفئة وموظف مُسجِّل
- إرفاق مستندات داعمة اختيارية (إيصالات/فواتير — Expense Attachments)
- إدارة حالة المصروف (Draft/Recorded/Cancelled)
- إتاحة مسار تصحيح مُتحكَّم به (Controlled Correction) للمصروفات المُسجَّلة، دون تعديل السجل الأصلي مباشرة
- الحفاظ على سجل تدقيق كامل (Audit History) لكل مصروف، بما في ذلك الملغاة

---

## 3. Out of Scope

| المفهوم | لماذا خارج النطاق | من يملكه |
|---------|---------------------|----------|
| **سداد المصروف فعليًا** (نقدًا، تحويل بنكي...) | Expenses يوثِّق "حدث مصروف تجاري" فقط — القيد المحاسبي/طريقة السداد الفعلية خارج النطاق الحالي تمامًا | — (غير مُصمَّم بعد، Future Extension) |
| مراكز التكلفة (Cost Centers) | خارج نطاق MVP صراحة | — (Future Extension) |
| الميزانيات وحدود الإنفاق (Budgets & Spending Limits) | خارج نطاق MVP صراحة | — (Future Extension) |
| **أي تأثير على المخزون** | Expenses لا يملك ولا يُصدر أي حدث يمس رصيد أي `StockItem` | Inventory |
| **أي تأثير على أرصدة الموردين** | مصروف تشغيلي (كهرباء مثلًا) منفصل تمامًا عن التزامات الموردين | Suppliers & Business Accounts |
| الرواتب كمصروف مُدار داخليًا | Payroll دومين منفصل تمامًا، حتى لو ظهر لاحقًا كبند موحَّد في تقارير مالية عبر Reporting فقط | Payroll |
| **اعتماد المصروف قبل تسجيله (Approval Workflow)** | قرار عمل صريح: **لا يوجد اعتماد في MVP** — التسجيل مباشر بصلاحية فقط | — (Future Extension محتملة) |

---

## 4. Business Concepts

| المفهوم | التعريف |
|---------|---------|
| **ExpenseCategory** | تصنيف المصروف (إيجار، صيانة، فواتير، نثرية...) — Master Data بسيطة على مستوى الـ Tenant |
| **Expense** | سجل مصروف فردي: المبلغ، التاريخ، الفئة، الفرع، الموظف المُسجِّل، الحالة |
| **ExpenseAttachment** | مستند داعم اختياري (صورة إيصال/فاتورة) مرتبط بمصروف |
| **ExpenseStatus** | `Recorded` (مُسجَّل ونشط) / `Cancelled` (مُلغى، لكن السجل يبقى ظاهرًا للتدقيق) |
| **ExpenseCorrection** | سجل تصحيح منفصل يشير لمصروف أصلي، دون تعديل السجل الأصلي مباشرة — يحافظ على Immutability |

---

## 5. Business Rules

1. كل مصروف ينتمي لفرع واحد بالضبط (`branchId` إلزامي).
2. كل مصروف ينتمي لفئة واحدة بالضبط (`categoryId` إلزامي، ولا فئات متعددة لنفس المصروف).
3. كل مصروف يحمل مبلغًا (`amount` > 0)، تاريخًا (`expenseDate`)، وموظفًا مُسجِّلًا (`recordedBy` = `employeeId` صالح).
4. المرفقات (`ExpenseAttachment`) اختيارية تمامًا — لا يُشترَط وجود إيصال لتسجيل مصروف.
5. **لا يوجد اعتماد مسبق (Approval) في MVP** — أي مستخدم يملك الصلاحية المناسبة يُسجِّل المصروف مباشرة، ويُصبح نشطًا فورًا (`Recorded`).
6. **المصروف المُسجَّل غير قابل للتعديل المباشر (Immutable) بعد التسجيل** — أي تصحيح يمر حصريًا عبر `ExpenseCorrected`، الذي يُنشئ سجل تصحيح منفصل يشير للمصروف الأصلي، دون محو أو الكتابة فوق القيم الأصلية.
7. **إلغاء مصروف (`ExpenseCancelled`) لا يحذف السجل** — الحالة تتحول لـ `Cancelled` مع سبب إلزامي، والسجل يبقى ظاهرًا بالكامل في أي استعلام تدقيقي.
8. **Expenses لا يُصدر ولا يستهلك أي حدث يمس Inventory أو Suppliers & Business Accounts** — عزل صارم ومتعمَّد، لمنع أي التباس بين "مصروف تشغيلي" و"شراء بضاعة" أو "التزام مورّد".
9. `recordedBy` يجب أن يشير لموظف نشط (`Active`) في Staff وقت التسجيل — يُتحقَّق عبر Read Model محلي (نفس نمط Attendance/Payroll).
10. المصروف المُلغى (`Cancelled`) لا يقبل أي `ExpenseCorrected` لاحق — التصحيح يُطبَّق فقط على مصروفات في حالة `Recorded`.

---

## 6. Use Cases / Business Flows

### 6.1 تسجيل مصروف مباشر (بدون اعتماد)

1. موظف يملك الصلاحية المناسبة يُسجِّل مصروفًا: المبلغ، الفئة، الفرع، التاريخ، ووصف اختياري.
2. يُرفِق إيصالًا إن أراد (اختياري تمامًا).
3. Expenses يتحقق من الشروط المسبقة (القسم 5) — بما فيها صحة `employeeId` عبر Read Model من Staff.
4. يُنشَر `ExpenseRecorded` فورًا — لا انتظار لأي اعتماد.

### 6.2 تصحيح مصروف مُسجَّل (خطأ في المبلغ أو الفئة)

1. يُكتشَف خطأ في مصروف سابق (مثال: المبلغ خطأ إملائي، أو الفئة غير صحيحة).
2. بدلًا من تعديل السجل الأصلي مباشرة: يُسجَّل `ExpenseCorrected` يشير لـ `originalExpenseId` مع القيم الصحيحة الجديدة.
3. السجل الأصلي يبقى كما هو تمامًا (Immutable)؛ التصحيح يظهر كحدث منفصل قابل للتتبع في سجل التدقيق.

### 6.3 إلغاء مصروف مُسجَّل بالخطأ بالكامل

1. مصروف بأكمله سُجِّل خطأً (مثال: تكرار غير مقصود).
2. يُلغى عبر `ExpenseCancelled` مع سبب إلزامي — الحالة تتحول لـ `Cancelled`.
3. السجل يبقى ظاهرًا في تقارير التدقيق، لكنه لا يُحتسَب ضمن إجمالي المصروفات الفعّالة في Reporting.

### 6.4 محاولة تسجيل مصروف بموظف غير نشط

1. محاولة تسجيل مصروف بـ `recordedBy` يشير لموظف `Inactive` أو `Terminated` (بناءً على Read Model من Staff).
2. Expenses يرفض العملية داخليًا (Validation Failure) — لا `ExpenseRecorded` يُنشَر.

---

## 7. Aggregate Roots & Entities

| الكيان | النوع | ملاحظات |
|--------|-------|---------|
| **Expense** | Aggregate Root | Immutable بعد الإنشاء؛ تغييره الوحيد المسموح هو حالته (`Recorded → Cancelled`) عبر حدث صريح |
| ExpenseAttachment | Entity (جزء من Expense Aggregate) | قائمة مرفقات اختيارية، لا دورة حياة مستقلة |
| ExpenseCategory | Entity مستقل (Master Data) | دورة حياة مستقلة عن أي مصروف بعينه |
| **ExpenseCorrection** | Aggregate Root مستقل | يشير لـ `originalExpenseId` كمرجع فقط، لا يُعدِّله — بنفس فلسفة فصل `Refund` عن `Sale` في Domain-Sales.md |

---

## 8. Published Events

(تفاصيل كاملة موثّقة في RFC-002 §13 المُحدَّث — هنا فقط قائمة مرجعية)

| الحدث | متى |
|-------|-----|
| `ExpenseRecorded` | عند تسجيل مصروف جديد مباشرة (بدون اعتماد) |
| `ExpenseCancelled` | عند إلغاء مصروف مُسجَّل، مع سبب إلزامي |
| `ExpenseCorrected` | عند تسجيل تصحيح لمصروف سابق، دون تعديله مباشرة |

---

## 9. Consumed Events

| الحدث | من | كيف يُستخدَم داخل Expenses |
|-------|-----|------------------------------|
| `EmployeeCreated` | Staff | يُحدِّث Read Model محلي بالموظفين الصالحين كمُسجِّلي مصروفات |
| `EmployeeActivated` | Staff | يُعيد تفعيل الموظف في الـ Read Model |
| `EmployeeDeactivated` | Staff | يمنع تسجيل مصروفات جديدة باسم هذا الموظف (Business Rule #9) |
| `EmployeeTerminated` | Staff | نفس أثر `EmployeeDeactivated`، بشكل نهائي |

> **ملاحظة على الاتساق:** هذا الاستهلاك يُطبِّق نفس النمط المعماري المُستخدَم بالفعل في Attendance وPayroll (التحقق من `employeeId` عبر Read Model من Staff) — وليس قرارًا جديدًا، بل تطبيقًا مباشرًا لنمط قائم.

---

## 10. Permissions

| الصلاحية (Atomic) | الوصف |
|---------------------|-------|
| `Expenses.View` | استعراض المصروفات المُسجَّلة |
| `Expenses.Record` | تسجيل مصروف جديد |
| `Expenses.Cancel` | إلغاء مصروف مُسجَّل |
| `Expenses.Correct` | تسجيل تصحيح لمصروف سابق |
| `Expenses.ManageCategories` | إدارة فئات المصروفات |

---

## 11. Data Model

> **ملاحظة معمارية:** مستوى عالٍ فقط (High-Level Schema Direction)، اتساقًا مع باقي Domain Documents.

جداول مرشحة (اتجاه عام فقط):
- `expense_categories` (tenant_id, name, ...)
- `expenses` (tenant_id, branch_id, category_id, amount, expense_date, description?, recorded_by, status, recorded_at, ...)
- `expense_attachments` (expense_id, file_reference, uploaded_at, ...)
- `expense_corrections` (original_expense_id, tenant_id, corrected_fields, corrected_by, reason, corrected_at, ...)

كل الجداول تحمل `tenant_id` إلزاميًا وفق سياسة RLS المُقرَّرة في Product Bible.

---

## 12. Public APIs

> **ملاحظة:** تصميم الـ API التفصيلي يُؤجَّل لوثيقة API Design منفصلة. هنا فقط قائمة القدرات المتوقعة:

- إدارة فئات المصروفات
- تسجيل مصروف جديد (مع مرفق اختياري)
- استعراض سجل المصروفات (بفلاتر: الفرع، الفئة، الفترة، الحالة)
- إلغاء مصروف
- تسجيل تصحيح لمصروف سابق
- استعراض سجل التدقيق الكامل لمصروف معيّن (شاملًا أي تصحيحات)

---

## 13. Future Extensions

- **Payment Tracking:** ربط المصروف بطريقة سداد فعلية (نقدًا، تحويل بنكي، شيك) — خارج النطاق الحالي تمامًا (راجع Out of Scope).
- **Cost Centers:** تصنيف المصروفات حسب مركز تكلفة (بخلاف الفرع البسيط) للمنشآت متعددة الفروع الكبيرة.
- **Budgets & Spending Limits:** حدود إنفاق شهرية لكل فئة/فرع، مع تنبيهات عند الاقتراب من الحد.
- **Approval Workflow:** إضافة اعتماد مسبق اختياري لمصروفات تتجاوز مبلغًا معيّنًا — يستفيد من محرك الاعتماد العام المذكور في Product Bible (نفس النمط المُستخدَم مستقبلًا لـ Refunds).
- **Recurring Expenses:** مصروفات دورية تلقائية (إيجار شهري ثابت مثلًا) تُنشئ `ExpenseRecorded` تلقائيًا حسب جدول زمني.

---

## 14. Commercial Packaging Recommendation

> ملاحظة: هذه التوصية معلوماتية بحتة، وليست قيدًا معماريًا (راجع RFC-003). تغييرها لا يتطلب أي تعديل على تصميم هذا الدومين.

**Capability: الأساسيات (فئات + تسجيل + إلغاء)**
Capability ID: `EXP.Core`
Recommended Packaging: Starter ✅ | Growth ✅ | Professional ✅ | Enterprise ✅

**Capability: المرفقات**
Capability ID: `EXP.Attachments`
Recommended Packaging: Starter ❌ | Growth ✅ | Professional ✅ | Enterprise ✅

**Capability: التصحيحات المُتحكَّم بها**
Capability ID: `EXP.Corrections`
Recommended Packaging: Starter ❌ | Growth ❌ | Professional ✅ | Enterprise ✅

---

*نهاية Domain Document: Expenses — v1.*
