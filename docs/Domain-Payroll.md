# Domain Document: Payroll

**Type:** Domain Document
**Domain Classification:** Core Business Domain (Cafe Engine) — Configurable Wage Policy Engine
**Depends on:** RFC-001 (Context Map), RFC-002 (Event Catalog), System Freeze v1, Master-System-Flow.md, Domain-Attendance.md
**Reference Template:** Domain-Sales.md, Domain-Menu.md, Domain-Inventory.md, Domain-Suppliers-Business-Accounts.md, Domain-Purchasing.md, Domain-Order-Fulfillment.md, Domain-CRM.md
**Status:** Draft v1

---

## 1. Domain Purpose

تطبيق سياسات الأجر القابلة للتهيئة على حقائق الحضور (من Attendance) والقرارات الإدارية اليدوية، عبر نموذج **اقتراح ثم اعتماد** (Suggested → Approved/Rejected) — لا تأثير مالي على راتب أي موظف يحدث تلقائيًا دون مراجعة بشرية صريحة. Payroll هو المصدر الوحيد للحقيقة المالية لمستحقات الموظفين، تمامًا كما Sales هو المصدر الوحيد لحقيقة الإيراد.

---

## 2. Responsibilities

- إدارة ملفات الرواتب الأساسية (Salary Profiles) ومكوناتها (Salary Components: أساسي، بدلات ثابتة)
- إدارة قواعد تعديل الراتب القابلة للتهيئة لكل Tenant (`PayrollAdjustmentRule`)
- تحويل حقائق Attendance المُستهلَكة (`WorkingHoursCalculated`, `AttendanceExceptionRaised`) إلى **اقتراحات** مالية عبر تطبيق القواعد المُهيَّأة
- حساب الأوفر تايم كاقتراح، بناءً على ساعات العمل الفعلية متجاوزة الساعات المجدولة
- إتاحة إدخال يدوي لمكافآت أو خصومات مباشرة من المدير (كاقتراح أيضًا، بنفس المسار)
- إدارة السلف والقروض (`EmployeeAdvance`) وتوليد أقساط سداد كاقتراحات خصم تلقائية عبر دورات رواتب مستقبلية
- إتاحة اعتماد أو رفض كل اقتراح فرديًا قبل إغلاق دورة الراتب
- تجميع دورة راتب شهرية (Payroll Run) من الراتب الأساسي + كل الاقتراحات المُعتمَدة فقط، وإصدار كشوف الرواتب (Payslips)

---

## 3. Out of Scope

| المفهوم | لماذا خارج النطاق | من يملكه |
|---------|---------------------|----------|
| تسجيل الحضور نفسه (Check-in/out، تحقق GPS/الجهاز) | Payroll يستهلك حقائق جاهزة فقط، لا يقيسها | Attendance |
| بيانات الموظف الأساسية (الاسم، الفرع، الدور) | Payroll يشير لـ `employeeId` كمرجع خارجي فقط | Staff |
| **أي تطبيق تلقائي لخصم أو مكافأة دون اعتماد** | كل تأثير مالي يبدأ كاقتراح `Pending` إلزاميًا — لا استثناء حتى للقواعد الآلية بالكامل | — (مبدأ حاكم للدومين نفسه) |
| محرك الاعتماد العام (Approval Workflow Engine) المذكور في Product Bible كـ Phase 2/3 | اعتماد Payroll في MVP آلية مباشرة (صلاحية + فعل Approve/Reject)، وليست سير عمل متعدد المراحل | — (Future Extension) |

---

## 4. Business Concepts

| المفهوم | التعريف |
|---------|---------|
| **SalaryProfile** | ملف الراتب الأساسي لموظف: الراتب الأساسي، دورية الصرف (شهري)، ربط بـ `employeeId` |
| **SalaryComponent** | مكوّن ثابت ضمن الراتب الأساسي (بدل انتقال، بدل سكن...) — جزء من الهيكل الأساسي، وليس اقتراحًا متغيرًا |
| **PayrollAdjustmentRule** | قاعدة قابلة للتهيئة لكل Tenant تُحوِّل حدث Attendance أو ظرفًا معيّنًا لاقتراح تلقائي (مثال: "تأخير > 30 دقيقة، 3 مرات خلال الفترة → اقتراح خصم نصف يوم") |
| **PayrollAdjustment** | اقتراح تعديل مالي فردي، له نوع (`Deduction`/`Bonus`/`Overtime`/`Penalty`) وحالة (`Pending`/`Approved`/`Rejected`) |
| **EmployeeAdvance** | سلفة أو قرض مصروف لموظف، له خطة سداد بالأقساط عبر دورات رواتب مستقبلية |
| **PayrollRun** | دورة راتب مكتملة لفترة زمنية محددة، تُجمِّع كل الموظفين وكل الاقتراحات المُعتمَدة لهم |
| **Payslip** | كشف راتب فردي نهائي لموظف ضمن `PayrollRun` معيّن: الأساسي + المكونات الثابتة + الاقتراحات المُعتمَدة = الصافي |

---

## 5. Business Rules

1. **لا يوجد مسار واحد يُطبِّق تأثيرًا ماليًا مباشرة على راتب موظف دون المرور بحالة `Pending` أولًا.** هذا ينطبق على القواعد الآلية (Attendance-driven) والإدخال اليدوي من المدير على حد سواء.
2. `PayrollAdjustmentSuggested` يُنشَر تلقائيًا عند استيفاء أي `PayrollAdjustmentRule` مُفعَّلة — لكن نشره **لا يعني** اعتماده.
3. اقتراح واحد فقط لكل مصدر (`sourceReference`) لكل فترة راتب — لا يجوز أن يُنشئ نفس حدث Attendance أكثر من اقتراح واحد (منع الازدواج).
4. **لا يمكن إغلاق `PayrollRun` (نشر `PayrollRunCompleted`) طالما يوجد أي اقتراح بحالة `Pending`** مرتبط بنفس الفترة — كل اقتراح يجب أن يُحسَم (Approve أو Reject) صراحة قبل الإغلاق.
5. اقتراح `Approved` **لا يمكن التراجع عنه بعد إغلاق الـ `PayrollRun`** الذي احتُسِب ضمنه — أي تصحيح لاحق يمر عبر `PayrollRun` جديد أو تسوية منفصلة (لم يُصمَّم تفصيلها بعد — راجع Future Extensions).
6. السلفة (`EmployeeAdvance`) تُولِّد تلقائيًا `PayrollAdjustmentSuggested` من نوع `Deduction` بقيمة القسط المستحق في **كل** دورة راتب لاحقة، حتى اكتمال عدد الأقساط بالكامل — لكن كل قسط يبقى اقتراحًا يحتاج اعتمادًا مثل أي تعديل آخر (لا يُخصَم تلقائيًا دون مراجعة، حتى لو كان التزامًا معروفًا مسبقًا).
7. الأوفر تايم يُحسَب كاقتراح `Overtime` بمقارنة `workedHours` (من `WorkingHoursCalculated`) بالساعات المُجدوَلة — الفارق الموجب فقط يُولِّد اقتراحًا؛ لا اقتراح لو الفارق سالب أو صفري.
8. رفض اقتراح (`PayrollAdjustmentRejected`) **يبقى في السجل التاريخي دائمًا** لأغراض التدقيق — لا حذف، فقط تغيير حالة.
9. اعتماد أو رفض اقتراح يتطلب صلاحية `Payroll.ApproveAdjustment` صراحة — لا اعتماد ضمني أو تلقائي حتى من نفس الشخص الذي أنشأ الاقتراح يدويًا.

---

## 6. Use Cases / Business Flows

### 6.1 اقتراح خصم تلقائي بناءً على تكرار التأخير

1. Payroll يستهلك `AttendanceExceptionRaised` من نوع `Late` لموظف معيّن.
2. يتحقق من `PayrollAdjustmentRule` المُهيَّأة: "تأخير > 30 دقيقة، 3 مرات خلال الفترة الحالية".
3. عند وصول التكرار الثالث خلال نفس الفترة: يُنشئ Payroll اقتراحًا (`PayrollAdjustmentSuggested`) من نوع `Deduction` (نصف يوم)، بحالة `Pending`.
4. المدير يستعرض الاقتراح لاحقًا ضمن قائمة المراجعة، ويقرر Approve أو Reject.

### 6.2 اقتراح مكافأة حضور مثالي

1. Payroll يراقب `WorkingHoursCalculated` و(غياب) `AttendanceExceptionRaised` لموظف عبر شهرين متتاليين.
2. عند استيفاء قاعدة "حضور مثالي لشهرين متتاليين": يُنشَر اقتراح `Bonus`.
3. نفس مسار المراجعة والاعتماد.

### 6.3 صرف سلفة وسداد تلقائي (كاقتراح) عبر عدة دورات

1. المدير يصرف سلفة لموظف: `EmployeeAdvanceIssued` بقيمة إجمالية ومدة أقساط (مثال: 3 أقساط).
2. عند بدء دورة الراتب الأولى بعد الصرف: Payroll يُنشئ تلقائيًا `PayrollAdjustmentSuggested` من نوع `Deduction`، `reasonCode=AdvanceRepayment`، بقيمة القسط الأول.
3. المدير يعتمده (أو يرفضه استثنائيًا لو قرر تأجيل القسط).
4. نفس المسار يتكرر في الدورتين التاليتين حتى اكتمال السداد.

### 6.4 إغلاق دورة راتب كاملة

1. نهاية فترة الراتب (شهريًا عادة)، المدير يفتح شاشة مراجعة الرواتب.
2. يستعرض كل الاقتراحات `Pending` لكل الموظفين المشمولين.
3. يعتمد أو يرفض كل اقتراح فرديًا (Business Rule #4 يمنع الإغلاق قبل حسم الكل).
4. عند عدم وجود أي `Pending` متبقٍ: يُغلِق الدورة — تُنشر `PayrollRunCompleted` بكل كشوف الرواتب النهائية (أساسي + اقتراحات مُعتمَدة فقط).

### 6.5 إدخال مكافأة يدوية مباشرة من المدير

1. المدير يُضيف مكافأة استثنائية لموظف (مثال: أداء متميز في مناسبة معيّنة) دون أي قاعدة آلية.
2. يُنشَر `PayrollAdjustmentSuggested` بـ `reasonCode=ManualEntry`، بحالة `Pending` — **نفس المسار بالضبط** كأي اقتراح آلي، لا معاملة خاصة.
3. حتى لو كان المدير نفسه من سيعتمدها لاحقًا، الاقتراح يمر بنفس خطوة المراجعة الصريحة (Business Rule #9).

---

## 7. Aggregate Roots & Entities

| الكيان | النوع | ملاحظات |
|--------|-------|---------|
| **SalaryProfile** | Aggregate Root | يضبط الراتب الأساسي ومكوناته الثابتة لموظف واحد |
| SalaryComponent | Entity (جزء من SalaryProfile Aggregate) | لا وجود مستقل خارج الملف |
| **PayrollAdjustmentRule** | Aggregate Root مستقل (Master Data) | قواعد عامة على مستوى Tenant، غير مرتبطة بموظف بعينه |
| **PayrollAdjustment** | Aggregate Root مستقل | يضبط دورة حياته الخاصة (`Pending → Approved/Rejected`) بمعزل عن `SalaryProfile` — يسمح بمراجعة وتاريخ مستقل لكل اقتراح |
| **EmployeeAdvance** | Aggregate Root مستقل | له دورة حياة خاصة (صرف → أقساط متعددة عبر الزمن)، مرتبط بموظف عبر مرجع فقط |
| **PayrollRun** | Aggregate Root مستقل | يُجمِّع مراجع لـ `PayrollAdjustment` المُعتمَدة فقط + بيانات `SalaryProfile` وقت الإغلاق؛ Immutable بعد `PayrollRunCompleted` |
| Payslip | Entity (جزء من PayrollRun Aggregate) | تمثيل نهائي لكل موظف ضمن الدورة، مُشتق ولا يُعدَّل مباشرة |

> **ملاحظة تصميم:** فصل `PayrollAdjustment` كـ Aggregate مستقل عن `PayrollRun` (بدل تضمينه مباشرة) متعمَّد — يسمح بوجود اقتراحات معلَّقة تتراكم عبر الوقت قبل وجود أي `PayrollRun` فعلي يجمعها، تمامًا كما `AccountsPayableEntry` منفصل عن أي "دورة دفع" في Domain-Suppliers-Business-Accounts.md.

---

## 8. Published Events

(تفاصيل كاملة موثّقة في RFC-002 §13 — هنا فقط قائمة مرجعية)

| الحدث | متى |
|-------|-----|
| `EmployeeAdvanceIssued` | عند صرف سلفة أو قرض لموظف |
| `PayrollAdjustmentSuggested` | عند توليد اقتراح تعديل راتب (آليًا من قاعدة، أو يدويًا من مدير) |
| `PayrollAdjustmentApproved` | عند اعتماد مدير لاقتراح معلَّق |
| `PayrollAdjustmentRejected` | عند رفض مدير لاقتراح معلَّق |
| `PayrollRunCompleted` | عند إغلاق دورة راتب كاملة (بعد حسم كل الاقتراحات المعلَّقة) |

---

## 9. Consumed Events

| الحدث | من | كيف يُستخدَم داخل Payroll |
|-------|-----|------------------------------|
| `WorkingHoursCalculated` | Attendance | مدخل لحساب اقتراحات الأوفر تايم (Business Rule #7)، ومرجع لحساب الراتب الأساسي المُستحَق للفترة |
| `AttendanceExceptionRaised` | Attendance | مدخل لتقييم `PayrollAdjustmentRule` (تأخير، انصراف مبكر، غياب) وتوليد اقتراحات مقابلة |
| `EmployeeCreated` | Staff | يُحدِّث Employee Read Model محلي؛ **يُهيِّئ `SalaryProfile` الأولي** باستخدام `baseSalaryReference` المُرسَل ضمن الحدث (إن وُجد) |
| `EmployeeUpdated` | Staff | يُحدِّث الـ Read Model عند تغيّر بيانات وصفية ذات صلة (مثال: تغيّر `baseSalaryReference` من Staff) |
| `EmployeeActivated` | Staff | يُعيد تفعيل الموظف في الـ Read Model — يُسمَح باقتراحات راتب جديدة له |
| `EmployeeDeactivated` | Staff | يُعطِّل الموظف في الـ Read Model — لا اقتراحات راتب جديدة تلقائية له، لكن أي اقتراحات معلَّقة سابقًا تبقى قابلة للمراجعة |
| `EmployeeTransferred` | Staff | تحديث معلوماتي فقط (الفرع) — لا أثر مباشر على منطق الحساب المالي |
| `EmployeeTerminated` | Staff | يُنبِّه Payroll لضرورة تسوية نهائية (تصفية مستحقات، سداد سلف متبقية) — **تفاصيل هذه التسوية غير مُصمَّمة بالكامل بعد، راجع Future Extensions** |

> **✅ تحديث (فجوة سابقة مُغلَقة):** هذا القسم كان يحتوي ملاحظة صريحة بعدم قابلية تنفيذ التحقق المرجعي من Staff بسبب غياب أحداثه. **تم حل هذا بالكامل** ببناء Domain-Staff.md.
>
> **ملاحظة تصميم مهمة (تسوية تداخل مفاهيمي):** `Staff.BaseSalaryReference` و`Payroll.SalaryProfile.base_salary` **ليسا نفس الحقل بالضبط**. Staff يملك القيمة التعاقدية المرجعية (حقيقة HR)؛ Payroll يستهلكها **مرة واحدة عند الإنشاء** لتهيئة `SalaryProfile` الخاص به، لكن Payroll **يحتفظ بملكية تشغيلية كاملة** للقيمة المُستخدَمة فعليًا في الحسابات بعد ذلك (قد تتغيّر عبر Payroll نفسه لاحقًا — مثال: تسوية راتب داخلية — دون أن يتطلب ذلك تعديل مرجع Staff بالضرورة، رغم أن التزامن اليدوي بينهما بقرار إداري يبقى ممكنًا وموصى به).

---

## 10. Permissions

| الصلاحية (Atomic) | الوصف |
|---------------------|-------|
| `Payroll.ViewSalaryProfiles` | استعراض ملفات الرواتب الأساسية |
| `Payroll.ManageSalaryProfiles` | إنشاء/تعديل ملف راتب موظف |
| `Payroll.ManageAdjustmentRules` | إدارة قواعد التعديل الآلي |
| `Payroll.CreateManualAdjustment` | إنشاء اقتراح تعديل يدوي (مكافأة/خصم استثنائي) |
| `Payroll.ApproveAdjustment` | اعتماد أو رفض اقتراح معلَّق |
| `Payroll.IssueAdvance` | صرف سلفة أو قرض لموظف |
| `Payroll.RunPayroll` | بدء وإغلاق دورة راتب كاملة |
| `Payroll.ViewPayslips` | استعراض كشوف الرواتب |

---

## 11. Data Model

> **ملاحظة معمارية:** مستوى عالٍ فقط (High-Level Schema Direction)، اتساقًا مع باقي Domain Documents.

جداول مرشحة (اتجاه عام فقط):
- `salary_profiles` (tenant_id, employee_id, base_salary, pay_frequency, ...)
- `salary_components` (salary_profile_id, component_type, amount, ...)
- `payroll_adjustment_rules` (tenant_id, rule_type, threshold_config, resulting_adjustment_type, resulting_amount_formula, is_active, ...)
- `payroll_adjustments` (tenant_id, employee_id, payroll_period_id, adjustment_type, amount, reason_code, source_reference?, status, suggested_at, approved_by?, approved_at?, rejected_by?, rejected_at?, ...)
- `employee_advances` (tenant_id, employee_id, amount, installments_count, installment_amount, issued_by, issued_at, ...)
- `payroll_runs` (tenant_id, period, status, completed_at, ...)
- `payslips` (payroll_run_id, employee_id, base_salary, total_approved_adjustments, net_amount, ...)

كل الجداول تحمل `tenant_id` إلزاميًا وفق سياسة RLS المُقرَّرة في Product Bible.

---

## 12. Public APIs

> **ملاحظة:** تصميم الـ API التفصيلي يُؤجَّل لوثيقة API Design منفصلة. هنا فقط قائمة القدرات المتوقعة:

- إدارة ملفات الرواتب الأساسية
- إدارة قواعد التعديل الآلي
- استعراض الاقتراحات المعلَّقة لكل فترة/موظف
- اعتماد/رفض اقتراح فردي (أو بالجملة لعدة اقتراحات)
- صرف سلفة وعرض جدول أقساطها المتبقية
- بدء وإغلاق دورة راتب
- استعراض كشف راتب فردي أو دورة كاملة

---

## 13. Future Extensions

- **Approval Workflow Engine الكامل:** ربط اعتماد الاقتراحات بمحرك الاعتماد العام متعدد المراحل (مذكور في Product Bible)، بدل اعتماد مباشر بصلاحية واحدة كما في MVP.
- **Post-Closure Corrections:** آلية رسمية لتصحيح `PayrollRun` مُغلَق بالفعل (حاليًا غير مُصمَّمة — Business Rule #5 تمنع التراجع المباشر).
- **Multi-Currency Payroll:** دعم رواتب بعملات مختلفة — يتوافق مع مبدأ Multi-currency العام في Product Bible.
- **Tax & Social Insurance Deductions:** خصومات ضريبية/تأمينية تلقائية حسب القوانين المحلية — يحتاج طبقة Adapter قُطرية منفصلة، بنفس فلسفة e-Invoice المذكورة في Product Bible §8.
- ~~**Staff Read Model**~~ — **تم الحل بالكامل** ببناء Domain-Staff.md (راجع القسم 9 المُحدَّث).
- **Final Settlement on Termination:** تصميم كامل لتسوية نهاية الخدمة (تصفية مستحقات، سداد سلف متبقية دفعة واحدة أو تقسيطها على مدفوعات نهائية) عند استهلاك `EmployeeTerminated` — مذكورة الآن كاستجابة مبدئية في القسم 9، لكن التفاصيل الحسابية الكاملة غير مُصمَّمة بعد.
- **AI-Assisted Rule Suggestions:** اقتراح قواعد `PayrollAdjustmentRule` جديدة بناءً على تحليل أنماط الحضور التاريخية — يخدم AI-Readiness المذكور في Product Bible، دون أي بنية AI فعلية في MVP.

---

## 14. Commercial Packaging Recommendation

> ملاحظة: هذه التوصية معلوماتية بحتة، وليست قيدًا معماريًا (راجع RFC-003). تغييرها لا يتطلب أي تعديل على تصميم هذا الدومين.
>
> **ملاحظة خاصة بهذا الدومين:** `PAY.RunPayroll` يحمل تبعية موثَّقة على `ATT.CheckInOut` (راجع RFC-003 §10-ب) — لذلك تظهر كل Capabilities هذا الدومين ابتداءً من نفس الباقة التي يظهر فيها Attendance، وليس قبلها.

**Capability: تشغيل دورة الرواتب**
Capability ID: `PAY.RunPayroll`
Recommended Packaging: Starter ❌ | Growth ❌ | Professional ✅ | Enterprise ✅

**Capability: المكافآت**
Capability ID: `PAY.Bonus`
Recommended Packaging: Starter ❌ | Growth ❌ | Professional ✅ | Enterprise ✅

**Capability: الخصومات**
Capability ID: `PAY.Deduction`
Recommended Packaging: Starter ❌ | Growth ❌ | Professional ✅ | Enterprise ✅

**Capability: السلف والقروض**
Capability ID: `PAY.Advances`
Recommended Packaging: Starter ❌ | Growth ❌ | Professional ❌ | Enterprise ✅

**Capability: قواعد التعديل الآلي**
Capability ID: `PAY.AdjustmentRules`
Recommended Packaging: Starter ❌ | Growth ❌ | Professional ✅ | Enterprise ✅

---

*نهاية Domain Document: Payroll — v1.*
