# Domain Document: Staff

**Type:** Domain Document
**Domain Classification:** Core Business Domain (Cafe Engine) — Employee Master Data (Foundational)
**Depends on:** RFC-001 (Context Map), RFC-002 (Event Catalog), RFC-003 (Capability Architecture), System Freeze v1, Master-System-Flow.md
**Reference Template:** Domain-Sales.md، Domain-Menu.md، Domain-Inventory.md، Domain-Suppliers-Business-Accounts.md، Domain-Purchasing.md، Domain-Order-Fulfillment.md، Domain-CRM.md، Domain-Attendance.md، Domain-Payroll.md
**Status:** Draft v1

---

## 1. Domain Purpose

المصدر الوحيد للحقيقة (Single Source of Truth) لكل بيانات الموظف الأساسية: هويته، حالته الوظيفية، فرعه، قسمه، مسماه الوظيفي، تاريخ تعيينه، ونوع توظيفه. Staff **لا يعرف شيئًا عن الحضور ولا الرواتب** — هو فقط "من هو هذا الموظف"، وليس "متى حضر" أو "كم يتقاضى فعليًا". هذا الدومين يسد فجوة موثَّقة صراحة في Domain-Attendance.md وDomain-Payroll.md منذ تصميمهما.

---

## 2. Responsibilities

- إدارة بيانات الموظف الأساسية (Employee Master Data): الاسم، الرقم الوظيفي (Staff Number)، تاريخ التعيين
- إدارة الحالة الوظيفية (Employment Status): نشط، مُعطَّل مؤقتًا، منتهي الخدمة
- إدارة تعيين الفرع الافتراضي (Default Branch Assignment) ونقل الموظف بين الفروع
- إدارة القسم (Department) والمسمى الوظيفي (Job Title)
- إدارة علاقة المدير المباشر (Manager Relationship) — اختيارية، مرجع ذاتي لموظف آخر
- إدارة نوع التوظيف (Employment Type: دوام كامل/جزئي/متعاقد)
- الاحتفاظ بمرجع تعيين الشيفت الافتراضي (Default Shift Assignment) — كخاصية وصفية بسيطة، **وليس** كمحرك جدولة كامل
- الاحتفاظ بمرجع الراتب الأساسي (Base Salary Reference) كحقيقة تعاقدية — **لأغراض Payroll فقط، دون أي حساب أو تطبيق مالي داخل Staff نفسه**
- إدارة تاريخ انتهاء الخدمة (Termination Date) عند إنهاء التوظيف

---

## 3. Out of Scope

| المفهوم | لماذا خارج النطاق | من يملكه |
|---------|---------------------|----------|
| سجلات الحضور والانصراف (Check-in/out، ساعات العمل، تأخير، غياب) | Staff يوفر `employeeId` كمرجع فقط | Attendance |
| حسابات الرواتب، الاقتراحات المالية، دورات الصرف | Staff يوفر مرجع الراتب الأساسي فقط كحقيقة تعاقدية، لا يحسب أي شيء | Payroll |
| الصلاحيات والمصادقة (Permissions & Authentication) | مفهوم "الموظف" (Employee) هنا **منفصل تمامًا** عن مفهوم "المستخدم" (User) الذي يُسجِّل الدخول — نفس نمط الفصل بين Order (تجاري) وFulfillmentOrder (تشغيلي) في Sales/Order Fulfillment | Platform Domains (Auth, Users, Roles) |
| حسابات المستخدمين (User Accounts) | قد يُربَط لاحقًا Employee بـ User عبر مرجع اختياري (`userId`)، لكن Staff لا يملك أو يُنشئ حسابات الدخول | Platform Domain (Users) |
| **محرك الجدولة الكامل** (Shift Scheduling، تناوب، تقويم شيفتات) | Staff يحتفظ بـ "تعيين شيفت افتراضي" كخاصية وصفية بسيطة على الموظف فقط، وليس نظام جدولة متكامل بتواريخ وتكرار | — (Future Extension، لم يُصمَّم بعد) |
| تقييم الأداء (Performance Evaluation) | خارج النطاق تمامًا في MVP | — (Future Extension) |

---

## 4. Business Concepts

| المفهوم | التعريف |
|---------|---------|
| **Employee** | السجل الأساسي للموظف: هويته، حالته، وكل بياناته الوصفية |
| **EmploymentStatus** | الحالة الوظيفية الحالية: `Active` / `Inactive` (تعطيل مؤقت قابل للعكس) / `Terminated` (نهائي، غير قابل للعكس) |
| **BranchAssignment** | الفرع الافتراضي الذي ينتمي إليه الموظف حاليًا |
| **Department** | القسم التنظيمي (مطبخ، كاشير، إدارة...) |
| **JobTitle** | المسمى الوظيفي |
| **ManagerRelationship** | مرجع اختياري لموظف آخر يُمثِّل المدير المباشر (علاقة ذاتية داخل نفس الدومين) |
| **EmploymentType** | نوع التوظيف: دوام كامل / دوام جزئي / متعاقد |
| **StaffNumber** | رقم وظيفي فريد لكل موظف داخل الـ Tenant |
| **DefaultShiftAssignment** | مرجع وصفي بسيط لنمط الشيفت المعتاد للموظف (مثال: "شيفت صباحي") — **ليس** جدولًا زمنيًا فعليًا |
| **BaseSalaryReference** | القيمة التعاقدية للراتب الأساسي، كحقيقة HR — **مرجع فقط**، لا يُستخدَم في أي حساب داخل Staff |

---

## 5. Business Rules

1. `StaffNumber` يجب أن يكون فريدًا داخل نفس الـ Tenant — لا تكرار.
2. لا يمكن إنشاء موظف دون فرع افتراضي (`defaultBranchId`) صالح.
3. **`Inactive` قابلة للعكس عبر إعادة تفعيل (`EmployeeActivated`)؛ `Terminated` حالة نهائية غير قابلة للعكس** — إعادة تعيين موظف منتهي الخدمة تتطلب سجل Employee جديدًا تمامًا، وليس إعادة تفعيل القديم.
4. `managerEmployeeId` (إن وُجد) يجب أن يشير لموظف آخر نشط داخل نفس الـ Tenant — لا مدير من Tenant مختلف، ولا مدير لنفسه (Self-reference ممنوع).
5. `terminationDate` (إن وُجد) يجب ألا يسبق `hireDate`.
6. **Staff لا يُصدر أي حكم أو حساب على `BaseSalaryReference`** — هو حقل معلوماتي بحت يُقرَأ فقط من Payroll لتهيئة `SalaryProfile` الخاص به؛ أي تعديل لاحق على قيمة الراتب الفعلية المُستخدَمة في الحسابات يقع ضمن صلاحية Payroll نفسه بعد التهيئة الأولى (راجع الملاحظة المعمارية في القسم 9 من Domain-Payroll.md بعد هذا التحديث).
7. `DefaultShiftAssignment` قيمة وصفية بسيطة (نص أو مرجع بسيط) — لا يحمل أي منطق تكرار أو تقويم؛ أي جدولة فعلية تحتاج تصميمًا منفصلاً بالكامل خارج نطاق Staff الحالي.
8. نقل موظف بين فروع (`EmployeeTransferred`) يُحدِّث `defaultBranchId` فقط — لا يؤثر على أي سجل حضور أو راتب تاريخي (تلك السجلات تبقى مرتبطة بالفرع الذي كانت عليه وقت حدوثها، ضمن حدود Attendance/Payroll نفسها).

---

## 6. Use Cases / Business Flows

### 6.1 تعيين موظف جديد (Onboarding)

1. مدير الكافيه يُدخِل بيانات موظف جديد: الاسم، الرقم الوظيفي، الفرع الافتراضي، القسم، المسمى الوظيفي، نوع التوظيف، تاريخ التعيين، ومرجع الراتب الأساسي (اختياري وقت الإنشاء).
2. Staff يتحقق من فرادة `StaffNumber` وصحة `defaultBranchId`.
3. تُنشر `EmployeeCreated` — Attendance وPayroll (وReporting) يستهلكون الحدث لبناء Read Models محلية.

### 6.2 تحديث بيانات وظيفية (تغيير مسمى/قسم/مدير)

1. تعديل على أي حقل وصفي (المسمى الوظيفي، القسم، المدير المباشر...) دون تغيير الحالة أو الفرع.
2. تُنشر `EmployeeUpdated` بالحقول المتغيرة.

### 6.3 تعطيل مؤقت وإعادة تفعيل (إجازة طويلة، إيقاف مؤقت)

1. مدير يُعطِّل موظفًا مؤقتًا (`EmployeeDeactivated`) لسبب مُحدَّد (إجازة بدون أجر، إيقاف تأديبي مؤقت).
2. لاحقًا، عند العودة: يُعاد تفعيله (`EmployeeActivated`).
3. Attendance وPayroll يُحدِّثان Read Models المحلية في الحالتين — مثال: Attendance قد يمنع تسجيل حضور لموظف `Inactive`.

### 6.4 نقل بين الفروع

1. موظف يُنقَل من فرع لآخر بشكل دائم.
2. تُنشر `EmployeeTransferred` بالفرع القديم والجديد.
3. Attendance يستخدم الفرع الجديد للتحقق الجغرافي (Geofence) في عمليات الحضور المستقبلية فقط.

### 6.5 إنهاء الخدمة

1. مدير يُنهي خدمة موظف نهائيًا، مع تاريخ انتهاء وسبب.
2. Staff يتحقق أن `terminationDate >= hireDate`.
3. تُنشر `EmployeeTerminated` — حالة نهائية، Business Rule #3 تمنع أي إعادة تفعيل لاحقة لنفس السجل.
4. Payroll قد يحتاج هذا الحدث لإغلاق أي `PayrollAdjustment` معلَّقة أو معالجة تسوية نهاية خدمة (تفصيل يعود لـ Payroll نفسه — خارج حدود Staff).

---

## 7. Aggregate Roots & Entities

| الكيان | النوع | ملاحظات |
|--------|-------|---------|
| **Employee** | Aggregate Root | يضبط كل حالاته وبياناته الوصفية عبر نفسه فقط |
| ManagerRelationship | Value Object (جزء من Employee) | مرجع ذاتي (`managerEmployeeId`) — لا كيان منفصل |
| BranchAssignment | Value Object (جزء من Employee) | يحمل `defaultBranchId` فقط كمرجع خارجي لـ Platform Domain (Branches) |
| DefaultShiftAssignment | Value Object (جزء من Employee) | وصفي بسيط، لا دورة حياة مستقلة |
| BaseSalaryReference | Value Object (جزء من Employee) | قيمة مرجعية بحتة، لا منطق حسابي مرتبط بها داخل هذا الدومين |

---

## 8. Published Events

(تفاصيل كاملة موثّقة في RFC-002 §11 المُحدَّث — هنا فقط قائمة مرجعية)

| الحدث | متى |
|-------|-----|
| `EmployeeCreated` | عند تعيين موظف جديد |
| `EmployeeUpdated` | عند تعديل بيانات وصفية (مسمى، قسم، مدير...) دون تغيير الحالة أو الفرع |
| `EmployeeActivated` | عند إعادة تفعيل موظف كان `Inactive` |
| `EmployeeDeactivated` | عند تعطيل مؤقت لموظف |
| `EmployeeTransferred` | عند نقل موظف بين الفروع |
| `EmployeeTerminated` | عند إنهاء خدمة موظف نهائيًا |

---

## 9. Consumed Events

**لا يوجد.** Staff لا يستهلك أي حدث من أي دومين آخر — هو Domain "مصدر تعريف" (Definitional Source) بالكامل، بنفس نمط Menu بالضبط (بيانات تأسيسية، مستقلة عن أي تغيّر تشغيلي أو مالي في الدومينز الأخرى).

---

## 10. Permissions

| الصلاحية (Atomic) | الوصف |
|---------------------|-------|
| `Staff.ViewEmployees` | استعراض بيانات الموظفين |
| `Staff.ManageEmployees` | إنشاء/تعديل بيانات موظف |
| `Staff.TransferEmployee` | نقل موظف بين الفروع |
| `Staff.DeactivateEmployee` | تعطيل/إعادة تفعيل موظف مؤقتًا |
| `Staff.TerminateEmployee` | إنهاء خدمة موظف نهائيًا |
| `Staff.ViewSalaryReference` | استعراض مرجع الراتب الأساسي (صلاحية حساسة منفصلة عمدًا عن `ViewEmployees` العامة) |
| `Staff.ManageSalaryReference` | تعديل مرجع الراتب الأساسي |

---

## 11. Data Model

> **ملاحظة معمارية:** مستوى عالٍ فقط (High-Level Schema Direction)، اتساقًا مع باقي Domain Documents.

جداول مرشحة (اتجاه عام فقط):
- `employees` (tenant_id, staff_number, full_name, employment_status, default_branch_id, department, job_title, manager_employee_id?, employment_type, hire_date, termination_date?, default_shift_assignment?, base_salary_reference?, created_at, ...)

كل الجداول تحمل `tenant_id` إلزاميًا وفق سياسة RLS المُقرَّرة في Product Bible. `base_salary_reference` حقل حساس يحتاج تحكمًا إضافيًا على مستوى الصلاحيات (`Staff.ViewSalaryReference` منفصلة عمدًا).

---

## 12. Public APIs

> **ملاحظة:** تصميم الـ API التفصيلي يُؤجَّل لوثيقة API Design منفصلة. هنا فقط قائمة القدرات المتوقعة:

- إنشاء/تعديل بيانات موظف
- استعراض قائمة الموظفين (بفلاتر: الفرع، القسم، الحالة)
- نقل موظف بين الفروع
- تعطيل/إعادة تفعيل موظف
- إنهاء خدمة موظف
- استعلام عن مرجع الراتب الأساسي (صلاحية منفصلة)

---

## 12A. Offline access constraint (RFC-006)

- Staff يظل مصدر employee identity/status، وPlatform Auth يملك credentials/roles/capabilities.
- Edge يخزن branch access projection وsalted Argon2id Offline PIN hash فقط، لا plaintext PIN ولا Cloud credential.
- Offline login ينتهي بعد 7 أيام من آخر access sync؛ deactivation/capability removal يسري عند أول sync، ونافذة الانقطاع تُدقَّق.
- كل Offline command يسجل employee وEdge identity والوقت وauthorization snapshot version.

## 13. Future Extensions

- **Shift Scheduling الكامل:** محرك جدولة فعلي (تقويم، تناوب، نوبات متعددة) يبني فوق `DefaultShiftAssignment` الحالي دون استبداله بالضرورة.
- **Performance Reviews:** تقييمات أداء دورية، مرتبطة بـ `Employee` عبر مرجع.
- **User Account Linking:** ربط اختياري صريح بين `Employee` و`User` (Platform Domain) عبر `userId` — يسمح بربط الهوية الوظيفية بحساب الدخول دون دمج الدومينين.
- **Document Management:** إرفاق مستندات الموظف (عقد، هوية...) — يحتاج تكاملًا مع Files (Supporting Domain).
- **Org Chart Visualization:** استخدام `ManagerRelationship` لبناء هيكل تنظيمي مرئي — يخدم AI-Readiness المذكور في Product Bible.

---

## 14. Commercial Packaging Recommendation

> ملاحظة: هذه التوصية معلوماتية بحتة، وليست قيدًا معماريًا (راجع RFC-003). تغييرها لا يتطلب أي تعديل على تصميم هذا الدومين.
>
> **ملاحظة خاصة بهذا الدومين:** `STAFF.EmployeeProfiles` أساسية لتفعيل أي من `ATT.CheckInOut` أو `PAY.RunPayroll` بمعنى عملي (كلاهما يحتاج `employeeId` صالحًا) — راجع تبعيات جديدة مُضافة في RFC-003 §10-ب.

**Capability: بيانات الموظفين الأساسية**
Capability ID: `STAFF.EmployeeProfiles`
Recommended Packaging: Starter ❌ | Growth ✅ | Professional ✅ | Enterprise ✅

**Capability: مرجع الراتب الأساسي**
Capability ID: `STAFF.SalaryReference`
Recommended Packaging: Starter ❌ | Growth ❌ | Professional ✅ | Enterprise ✅

---

*نهاية Domain Document: Staff — v1.*
