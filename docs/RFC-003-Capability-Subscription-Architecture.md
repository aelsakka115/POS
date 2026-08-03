# RFC-003: Capability & Subscription Architecture

**Type:** RFC (Architecture — Commercial/Technical Boundary Layer)
**Depends on:** Product Bible v1 (ADR-11: Module Activation)، RFC-001، RFC-002، System Freeze v1، Master-System-Flow.md
**Status:** **Approved / Frozen** — القراران المعلَّقان في القسم 11 حُسِما: (1) الوثائق العشر تُحدَّث بأثر رجعي بالقسم 14، (2) Capability Dependencies تبقى خفيفة الوزن (راجع القسم 10-ب) دون Framework كامل حتى تنمو لـ 10+ حالة

---

## 1. Purpose

هذا الـ RFC يُثبِّت فصلًا معماريًا صارمًا بين ثلاث طبقات مختلفة تمامًا، غالبًا ما تُخلَط في أنظمة SaaS الناشئة فتُنتِج كودًا متشابكًا بالتسعير:

| الطبقة | ما هي؟ | من يملكها |
|--------|---------|-----------|
| **Architecture (المعمارية)** | حدود الدومينز، الأحداث، القواعد التجارية — كل ما وثَّقناه في RFC-001/002 والـ Domain Documents | Product/Software Architecture |
| **Commercial Packaging (التغليف التجاري)** | كيف تُجمَّع القدرات في "باقات" (Starter, Growth...) تُباع للعميل | فريق المنتج/المبيعات، قابل للتغيير أسبوعيًا |
| **Pricing (التسعير)** | كم تُكلِّف كل باقة | فريق المبيعات/المالية، لا علاقة له بهذا الـ RFC إطلاقًا |

**المبدأ الحاكم:** **لا Domain، ولا حدث، ولا قاعدة عمل يعرف بوجود "خطة اشتراك" إطلاقًا.** كل ما يعرفه أي Domain هو: "هل هذه القدرة (`Capability`) مُفعَّلة لهذا الـ Tenant؟" — نعم أو لا، بدون أي معرفة بالسبب التجاري وراء ذلك.

هذا يعني: **تغيير الباقات التجارية غدًا لا يتطلب تعديل حرف واحد في أي Domain Document أو RFC معماري.**

---

## 2. Core Principles

| المفهوم | التعريف |
|---------|---------|
| **Core Platform** | الطبقة الأساسية التي تعمل دائمًا لكل Tenant بغض النظر عن أي تفعيل: Auth, Users, Roles, Companies, Branches, Settings, Event Bus (راجع Product Bible §5.3) |
| **Business Module** | تجميعة كبيرة من القدرات المرتبطة بـ Domain واحد أو أكثر مترابطة بإحكام (مثال: "Inventory" كـ Module يحتوي عدة Capabilities) |
| **Capability** | أصغر وحدة قابلة للتفعيل/التعطيل بشكل مستقل داخل Module، لها **Capability ID** فريد وثابت |
| **Feature Flag** | الآلية التقنية التي تُترجم "هل Capability مُفعَّلة؟" لقرار تشغيلي فعلي وقت التنفيذ |
| **Permission** | صلاحية ذرية (كما في كل Domain Document) — **موجودة دائمًا في الكود**، لكن **لا تظهر أو تُمنَح إلا إذا كانت الـ Capability المالكة لها مُفعَّلة** |
| **UI Visibility** | ظهور عنصر واجهة (شاشة، زر، قائمة تنقل) مشروط بتفعيل الـ Capability المرتبطة به |
| **API Availability** | Endpoint معيّن قد يُرجِع `404`/`403` صراحة إن كانت الـ Capability الخاصة به غير مُفعَّلة للـ Tenant، حتى لو كان الكود موجودًا فعليًا |
| **Event Processing** | معالج حدث (Event Handler) معيّن قد يتجاهل حدثًا واردًا إن كانت الـ Capability المسؤولة عنه غير مُفعَّلة (مثال: `PayrollAdjustmentSuggested` لا يُعالَج إن كانت `PAY.RunPayroll` غير مُفعَّلة لهذا الـ Tenant) |

---

## 3. Capability Hierarchy

```
Core Platform
    │  (يعمل دائمًا، لكل Tenant، بلا استثناء)
    ▼
Business Module
    │  (تفعيل/تعطيل على مستوى الوحدة الكاملة — مثال: تعطيل "Payroll" بالكامل)
    ▼
Capability
    │  (تفعيل/تعطيل دقيق داخل الموديول — مثال: تفعيل Payroll لكن بدون "Advances")
    ▼
Permission
       (لا تُمنَح لأي Role إلا إذا كانت الـ Capability المالكة مُفعَّلة أصلًا)
```

**العلاقة بين الطبقات:**

- **Module معطَّل ⟵ كل الـ Capabilities تحته معطَّلة تلقائيًا** (لا استثناء، بغض النظر عن أي إعداد فردي على مستوى Capability).
- **Capability معطَّلة ⟵ كل الـ Permissions المرتبطة بها غير قابلة للمنح** — حتى لو حاول مدير تعيينها لدور معيّن، النظام يرفض بصمت أو يُخفيها من واجهة إدارة الصلاحيات.
- **Module مُفعَّل لا يعني كل Capabilities مُفعَّلة تلقائيًا** — كل Capability لها مفتاح تفعيل مستقل (مثال: تفعيل "Inventory" الأساسي لا يعني تفعيل "Batch Tracking" تلقائيًا).
- هذا التسلسل **لا علاقة له بحدود الـ Domain نفسها** — Domain واحد (مثال: Inventory) يمكن أن يحتوي على عدة Capabilities مستقلة تجاريًا، لكنه يبقى Domain واحد معماريًا بحدود واحدة (RFC-001 لا يتغيّر).

---

## 4. Module Activation

كل Business Module يُمثِّل تفعيلًا/تعطيلًا على المستوى الأعلى، متوافقًا تمامًا مع المبدأ المُثبَّت سابقًا في Product Bible (ADR-11: *"كل Module يجب أن يملك آلية تفعيل/تعطيل `is_active` per Tenant"*). هذا الـ RFC **لا يُلغي** ذلك المبدأ، بل **يُفصِّله** إلى طبقتين (Module + Capability) بدل طبقة واحدة فقط.

| Module | الحالة الافتراضية | ملاحظة |
|--------|---------------------|--------|
| Sales, Order Fulfillment, Shift Management, Menu, Inventory | **مُفعَّل دائمًا** | لا قيمة تجارية لتعطيلها — أساس تشغيل أي كافيه |
| Suppliers & Business Accounts, Purchasing | اختياري | كافيه صغير جدًا قد يدير مشترياته يدويًا خارج النظام |
| CRM | اختياري | قيمة أساسية (Customer records) قد تكون مُفعَّلة افتراضيًا، بينما Loyalty/Marketing كـ Capabilities منفصلة اختيارية |
| Attendance | اختياري، **لكن يعتمد على Staff** | كافيه بموظف واحد (صاحبه) قد لا يحتاجها؛ Attendance يحتاج `STAFF.EmployeeProfiles` مُفعَّلة (راجع القسم 10-ب) |
| Payroll | اختياري، **لكن يعتمد على Attendance وStaff** | لا معنى لتفعيل Payroll بدون Attendance أو بدون مرجع راتب من Staff (راجع القسم 10-ب) |
| Staff | اختياري، لكنه **أساسي لأي من Attendance/Payroll** | كافيه صغير جدًا بدون موظفين مُسجَّلين رسميًا قد لا يحتاجه؛ لكنه تبعية فعلية لكل من Attendance وPayroll |

**آلية التفعيل عمليًا (بلا تغيير كود):** جدول `tenant_module_activations` (tenant_id, module_id, is_active) — يُقرأ عند بداية كل طلب لتحديد أي Modules متاحة لهذا الـ Tenant، بالضبط كما وُصِف في Product Bible §7.

---

## 5. Capability Activation

كل Module يُفصَّل داخليًا إلى Capabilities مستقلة، كل واحدة لها **Capability ID** ثابت (راجع القسم 6 للـ Scheme الكامل). فقط الـ Capabilities المُفعَّلة تظهر في:

- **Navigation** (قوائم التنقل في الواجهة)
- **UI** (الشاشات والعناصر التفاعلية)
- **Permissions** (الصلاحيات القابلة للمنح ضمن Role Builder)
- **APIs** (الـ Endpoints الفعّالة)
- **Event Handlers** (معالجات الأحداث النشطة)

### مثال تطبيقي كامل: Inventory Module

| Capability ID | الاسم | الوصف | الحالة الافتراضية |
|---------------|-------|-------|----------------------|
| `INV.Core` | الأساسيات | تعريف StockItem، حركات المخزون، خصم تلقائي وقت البيع | مُفعَّلة دائمًا مع الـ Module |
| `INV.StockCount` | الجرد | عمليات جرد دوري وتسوية الفروقات | اختيارية |
| `INV.Waste` | الهدر | تسجيل الهدر كسبب تسوية مصنَّف | اختيارية |
| `INV.StockAdjustment` | التسويات اليدوية | تعديل رصيد يدويًا لأسباب غير الهدر | اختيارية |
| `INV.Reorder` | حدود إعادة الطلب | حساب `ReorderLevel` واكتشاف `StockLevelLow` | اختيارية |
| `INV.Valuation` | التقييم المالي | Weighted Average Cost وتقارير القيمة | اختيارية |
| `INV.BatchTracking` *(Future)* | تتبع الدُفعات | راجع Domain-Inventory.md §13 Future Extensions | غير مُنفَّذة بعد |
| `INV.ExpiryTracking` *(Future)* | تتبع الصلاحية | مرتبطة بـ `INV.BatchTracking` | غير مُنفَّذة بعد |
| `INV.Barcode` *(Future)* | الباركود | مسح وربط أصناف بباركود | غير مُنفَّذة بعد |

> ملاحظة: `INV.BatchTracking` و`INV.ExpiryTracking` و`INV.Barcode` موجودة هنا كـ **IDs محجوزة مسبقًا** حتى لو لم تُنفَّذ بعد (راجع Future Extensions في Domain-Inventory.md) — هذا يمنع تضاربًا في التسمية عند التنفيذ الفعلي لاحقًا.

---

## 6. Capability ID Naming Scheme

**الصيغة الموحَّدة:** `PREFIX.CapabilityName` — بادئة الدومين بأحرف كبيرة (2-5 أحرف)، نقطة، ثم اسم القدرة بصيغة PascalCase. هذا الـ ID **هو المرجع الموحَّد** في: قاعدة البيانات، Feature Flags، Permissions، Frontend، Backend، وAPIs — لا اعتماد على الأسماء النصية القابلة للترجمة (Arabic/English) في أي منطق برمجي.

### جدول البادئات الرسمي (Prefix Registry)

| Domain | Prefix | مثال |
|--------|--------|------|
| Sales | `SALES` | `SALES.POS`, `SALES.Discounts`, `SALES.Refunds` |
| Order Fulfillment | `OF` | `OF.KitchenOps` |
| Shift Management | `SHIFT` | `SHIFT.CashDrawer` |
| Menu | `MENU` | `MENU.Catalog`, `MENU.Recipes`, `MENU.Modifiers` |
| Inventory | `INV` | `INV.StockCount`, `INV.Waste`, `INV.Reorder`, `INV.Valuation` |
| Suppliers & Business Accounts | `SUP` | `SUP.SupplierProfiles`, `SUP.AccountsPayable`, `SUP.AgingReports` |
| Purchasing | `PUR` | `PUR.PurchaseOrders`, `PUR.GoodsReceiving` |
| CRM | `CRM` | `CRM.Customer`, `CRM.Loyalty`, `CRM.Marketing`, `CRM.DiscountRules` |
| Staff | `STAFF` | `STAFF.EmployeeProfiles`, `STAFF.SalaryReference` |
| Attendance | `ATT` | `ATT.CheckInOut`, `ATT.ExceptionTracking` |
| Expenses | `EXP` | `EXP.Core`, `EXP.Attachments`, `EXP.Corrections` |
| Payroll | `PAY` | `PAY.RunPayroll`, `PAY.Bonus`, `PAY.Deduction`, `PAY.Advances`, `PAY.AdjustmentRules` |
| Reporting | `RPT` | `RPT.Dashboards`, `RPT.SalesReports`, `RPT.FinancialReports`, `RPT.InventoryReports`, `RPT.PurchasingReports`, `RPT.SupplierReports`, `RPT.CRMReports`, `RPT.StaffReports`, `RPT.AttendanceReports`, `RPT.PayrollReports`, `RPT.OperationsReports`, `RPT.BranchComparison`, `RPT.ExecutiveDashboard`, `RPT.AdvancedAnalytics` *(Future)* |

**قاعدة صارمة:** أي Capability ID جديد يُضاف مستقبلًا **يجب أن يستخدم بادئة موجودة بالفعل في هذا الجدول** — لا بادئات مرتجلة. إضافة بادئة جديدة (لدومين جديد) تتطلب تحديث هذا الجدول صراحة كجزء من تصميم ذلك الدومين.

---

## 7. Commercial Packaging

**⚠️ تنبيه معماري صريح:** الباقات (Starter, Growth, Professional, Enterprise, أو أي مسميات مستقبلية) **ليست جزءًا من المعمارية إطلاقًا**. هي **تجميعات تجارية بحتة** لمجموعة من الـ Capability IDs، تُدار كبيانات (Data) في جدول `commercial_plans` أو ما يعادله — **وليست منطقًا مُرمَّزًا (hardcoded) في أي Domain أو RFC**.

**النتيجة العملية:** فريق المبيعات يستطيع إنشاء باقة جديدة، أو حذف باقة، أو نقل Capability من باقة لأخرى — **بدون طلب أي تعديل معماري، وبدون أي Deployment جديد للكود** (فقط تعديل بيانات).

---

## 8. Default Commercial Recommendation

> **هذا القسم معلوماتي بحت، وليس قاعدة معمارية.** يُمثِّل التوصية الحالية فقط، وقابل للتغيير الكامل دون أي تأثير على أي وثيقة معمارية أخرى.

| Capability ID | Starter | Growth | Professional | Enterprise |
|---------------|:-------:|:------:|:-------------:|:----------:|
| `SALES.POS` | ✅ | ✅ | ✅ | ✅ |
| `SALES.Discounts` | ✅ | ✅ | ✅ | ✅ |
| `SALES.Refunds` | ✅ | ✅ | ✅ | ✅ |
| `OF.KitchenOps` | ✅ | ✅ | ✅ | ✅ |
| `SHIFT.CashDrawer` | ✅ | ✅ | ✅ | ✅ |
| `MENU.Catalog` | ✅ | ✅ | ✅ | ✅ |
| `MENU.Recipes` | ✅ | ✅ | ✅ | ✅ |
| `MENU.Modifiers` | ❌ | ✅ | ✅ | ✅ |
| `STAFF.EmployeeProfiles` | ❌ | ✅ | ✅ | ✅ |
| `STAFF.SalaryReference` | ❌ | ❌ | ✅ | ✅ |
| `INV.Core` | ✅ | ✅ | ✅ | ✅ |
| `INV.StockCount` | ❌ | ✅ | ✅ | ✅ |
| `INV.Waste` | ❌ | ✅ | ✅ | ✅ |
| `INV.StockAdjustment` | ❌ | ✅ | ✅ | ✅ |
| `INV.Reorder` | ❌ | ❌ | ✅ | ✅ |
| `INV.Valuation` | ❌ | ❌ | ✅ | ✅ |
| `SUP.SupplierProfiles` | ❌ | ✅ | ✅ | ✅ |
| `SUP.AccountsPayable` | ❌ | ❌ | ✅ | ✅ |
| `SUP.AgingReports` | ❌ | ❌ | ✅ | ✅ |
| `EXP.Core` | ✅ | ✅ | ✅ | ✅ |
| `EXP.Attachments` | ❌ | ✅ | ✅ | ✅ |
| `EXP.Corrections` | ❌ | ❌ | ✅ | ✅ |
| `PUR.PurchaseOrders` | ❌ | ✅ | ✅ | ✅ |
| `PUR.GoodsReceiving` | ❌ | ✅ | ✅ | ✅ |
| `CRM.Customer` | ❌ | ✅ | ✅ | ✅ |
| `CRM.DiscountRules` | ❌ | ✅ | ✅ | ✅ |
| `CRM.Loyalty` | ❌ | ❌ | ✅ | ✅ |
| `CRM.Marketing` | ❌ | ❌ | ❌ | ✅ |
| `ATT.CheckInOut` | ❌ | ✅ | ✅ | ✅ |
| `ATT.ExceptionTracking` | ❌ | ✅ | ✅ | ✅ |
| `PAY.RunPayroll` | ❌ | ❌ | ✅ | ✅ |
| `PAY.Bonus` | ❌ | ❌ | ✅ | ✅ |
| `PAY.Deduction` | ❌ | ❌ | ✅ | ✅ |
| `PAY.Advances` | ❌ | ❌ | ❌ | ✅ |
| `PAY.AdjustmentRules` | ❌ | ❌ | ✅ | ✅ |
| `RPT.Dashboards` | ✅ | ✅ | ✅ | ✅ |
| `RPT.SalesReports` | ❌ | ✅ | ✅ | ✅ |
| `RPT.FinancialReports` | ❌ | ❌ | ✅ | ✅ |
| `RPT.InventoryReports` | ❌ | ✅ | ✅ | ✅ |
| `RPT.PurchasingReports` | ❌ | ✅ | ✅ | ✅ |
| `RPT.SupplierReports` | ❌ | ❌ | ✅ | ✅ |
| `RPT.CRMReports` | ❌ | ✅ | ✅ | ✅ |
| `RPT.StaffReports` | ❌ | ❌ | ✅ | ✅ |
| `RPT.AttendanceReports` | ❌ | ✅ | ✅ | ✅ |
| `RPT.PayrollReports` | ❌ | ❌ | ✅ | ✅ |
| `RPT.OperationsReports` | ❌ | ✅ | ✅ | ✅ |
| `RPT.BranchComparison` | ❌ | ❌ | ❌ | ✅ |
| `RPT.ExecutiveDashboard` | ❌ | ❌ | ✅ | ✅ |
| `RPT.AdvancedAnalytics` | ❌ | ❌ | ❌ | ✅ |

---

## 9. Domain Documentation Rule (معيار توثيقي جديد)

**اعتبارًا من هذا الـ RFC، كل Domain Document (الحالي والمستقبلي) يجب أن ينتهي بقسم 14 إضافي:**

```
## 14. Commercial Packaging Recommendation

لكل Capability مملوكة لهذا الدومين:

Capability: [الاسم]
Capability ID: [PREFIX.Name]

Recommended Packaging:
Starter      [✅/❌]
Growth       [✅/❌]
Professional [✅/❌]
Enterprise   [✅/❌]

> ملاحظة: هذه التوصية معلوماتية بحتة، وليست قيدًا معماريًا.
> تغييرها لا يتطلب أي تعديل على تصميم هذا الدومين.
```

> **⚠️ أثر هذا القرار على الوثائق العشر المكتملة بالفعل:** Sales, Order Fulfillment, Shift Management, Menu, Inventory, Suppliers & Business Accounts, Purchasing, CRM, Attendance, Payroll — **كلها لا تحتوي هذا القسم حاليًا** لأنها كُتبت قبل هذا الـ RFC. **هذا لا يُعتبَر خطأً في تصميمها** (المعيار لم يكن موجودًا وقتها)، لكنه عمل تحديثي متبقٍ يحتاج قرارك: هل نُضيف القسم 14 لكل الوثائق العشر الآن كخطوة تالية، أم نكتفي بتطبيقه على الدومينز القادمة (Staff, Expenses, Reporting) ونعتبر القديم "معفى" (Grandfathered)؟

---

## 10. Architectural Rules (قواعد صارمة، بدون استثناء)

1. **لا Domain يعتمد على اسم خطة اشتراك.** لا كود، لا Business Rule، لا Event Handler يحتوي شرطًا مثل `if plan == "Enterprise"`.
2. **كل Domain يتحقق فقط من Capabilities.** الفحص الوحيد المسموح: `if capability("PAY.Bonus").isEnabled(tenantId)`.
3. **Permissions تعتمد على Capabilities.** لا صلاحية تُمنَح لأي Role إن كانت الـ Capability المالكة لها معطَّلة، بغض النظر عن رغبة المدير.
4. **UI يعتمد على Capabilities.** لا استثناء لعرض عنصر واجهة "معطَّل لكن ظاهر كـ Upsell" إلا كقرار UX صريح منفصل تمامًا عن هذه القاعدة المعمارية.
5. **APIs تعتمد على Capabilities.** Endpoint لصلاحية غير مُفعَّلة يُرجِع خطأ صريح (403/404)، وليس نتيجة فارغة صامتة.
6. **Event Handlers تعتمد على Capabilities.** معالج حدث لدومين مُعطَّل الـ Capability عنده **لا يُنفِّذ منطق العمل**، لكن **يبقى يستقبل الحدث** (لا كسر لعقد الـ Event Bus نفسه) — فقط يتجاهله بصمت أو يُسجِّله للتدقيق دون أثر فعلي.
7. **الباقات التجارية تُفعِّل فقط مجموعات من Capabilities.** باقة = قائمة Capability IDs. لا أكثر، لا أقل.
8. **تبعيات بين Capabilities مسموحة ويجب توثيقها صراحة** — راجع القسم 10-ب (Capability Dependencies) للتوثيق الفعلي.

---

## 10-ب. Capability Dependencies (خفيف الوزن، بدون Framework كامل)

> **فلسفة هذا القسم:** لا نبني نظام تبعيات رسميًا (Dependency Graph/Engine) الآن — هذه أول حالة مكتشَفة فعليًا. كل تبعية تُوثَّق كسطر بسيط هنا. **إن نما العدد إلى 10+ تبعية**، يُعاد النظر في ترقيتها لـ Matrix مستقلة أو محرك تبعيات رسمي (قرار مؤجَّل، غير مطلوب الآن).

**تنسيق التوثيق:**

```
[Capability ID]
Requires:
- [Capability ID آخر]
Reason:
[سبب العمل باختصار]
```

### التبعيات الموثَّقة حتى الآن

```
PAY.RunPayroll
Requires:
- ATT.CheckInOut
Reason:
حسابات الرواتب تحتاج بيانات حضور مُعتمَدة وصحيحة (WorkingHoursCalculated)
من Attendance؛ تفعيل Payroll دون Attendance ينتج قيمة تشغيلية شبه معدومة.

ATT.CheckInOut
Requires:
- STAFF.EmployeeProfiles
Reason:
لا يمكن تسجيل حضور موظف غير موجود في النظام؛ Attendance يحتاج Read Model
صالح من Staff (employeeId) قبل قبول أي Check-in.

PAY.RunPayroll
Requires:
- STAFF.SalaryReference
Reason:
Payroll.SalaryProfile يُهيَّأ ابتداءً من BaseSalaryReference المملوك لـ Staff؛
بدونه لا توجد نقطة بداية لحساب أي راتب أساسي.

EXP.Core
Requires:
- STAFF.EmployeeProfiles
Reason:
كل مصروف يجب أن يرتبط بموظف مُسجِّل (recordedBy) صالح ونشط في Staff؛
بدون STAFF.EmployeeProfiles لا توجد طريقة للتحقق من هوية المُسجِّل.

RPT.FinancialReports
Requires:
- INV.Valuation
- EXP.Core
Reason:
حساب الربح والفود كوست يعتمد على InventoryMovementRecorded (يتطلب INV.Valuation)
وعلى بيانات المصروفات المُسجَّلة (EXP.Core) — بدونهما التقرير المالي غير مكتمل.

RPT.PayrollReports
Requires:
- PAY.RunPayroll
Reason:
لا يوجد محتوى لعرضه بدون دورات رواتب فعلية.

RPT.AttendanceReports
Requires:
- ATT.CheckInOut
Reason:
لا يوجد محتوى لعرضه بدون تسجيل حضور فعلي.

RPT.SupplierReports
Requires:
- SUP.AccountsPayable
Reason:
تقارير أرصدة الموردين والأعمار الزمنية تعتمد على بيانات الفواتير والمدفوعات.
```

> **⚠️ ملاحظة على العدد:** أصبح لدينا الآن **9 تبعيات موثَّقة** (كانت 4). اقتربنا من حد الـ 10+ المُتفَق عليه لإعادة النظر في بناء Framework رسمي. **لم نتجاوزه بعد**، لكن أي دومين قادم يُضيف تبعيتين أو أكثر سيتطلب فتح نقاش جاد حول ترقية هذا القسم لـ Dependency Matrix مستقلة بدل الأسلوب النصي الحالي.

> **ملاحظة:** هذه تبعية **منطقية/تجارية** (مُوصى بها عند التغليف التجاري — راجع القسم 8)، **وليست قيدًا تقنيًا صارمًا يمنع النظام من تفعيل PAY.RunPayroll دون ATT.CheckInOut**. لا فحص برمجي إلزامي يمنع هذا التوليف حاليًا؛ التوثيق هنا لأغراض القرار التجاري والتصميم المستقبلي فقط.

---

## 11. Consistency Review

راجعت هذا الـ RFC مقابل كل الوثائق الموجودة:

✅ **متوافق مع Product Bible ADR-11** (Module Activation) — هذا الـ RFC يُفصِّل المبدأ لطبقتين بدل طبقة واحدة، لا يتعارض معه.

✅ **لا تعارض مع RFC-001/002** — يحتوي RFC-002 على 48 Event contracts ولم يُضَف أي Domain أو Event جديد في Issue #2؛ الـ Capabilities كلها مبنية على Responsibilities وPermissions الموثَّقة بالفعل في كل Domain Document.

✅ **لا تغيير في Capability IDs** — `SALES.POS` وباقي السجل كما هي. `NegativeStockPolicy` إعداد Tenant وليس Capability ولا يُقرأ عبر `ICapabilityGuard`.

✅ **متوافق مع مبدأ "No Direct Cross-Domain Calls"** — فحص الـ Capability هو استعلام محلي (عادة من Core Platform Settings)، وليس استدعاءً لدومين آخر.

### القراران اللذان كانا معلَّقين — حُسِما الآن

1. **القسم 9 (Domain Documentation Rule):** **القرار: الخيار (أ)** — كل الوثائق العشر المكتملة تُحدَّث الآن بأثر رجعي بالقسم 14 (Commercial Packaging Recommendation)، لضمان اتساق القالب عبر كل الدومينز الحالية والمستقبلية دون استثناءات.
2. **Cross-Capability Dependencies:** **القرار: تبقى خفيفة الوزن** — تُوثَّق كأسطر بسيطة في القسم 10-ب الجديد، دون بناء Framework أو Dependency Engine رسمي. يُعاد النظر فقط إن نما العدد لـ 10+ تبعية موثَّقة.

لا يوجد أي قرار معلَّق آخر. **RFC-003 مُعتمَد ومُجمَّد.**

---

## 12. Future Extensions

- **AI Capabilities:** بادئة مقترحة `AI` (مثال: `AI.DemandForecasting`, `AI.SmartReordering`) — تفعَّل فقط بعد بناء AI Infrastructure الفعلية (Phase 3، راجع Product Bible §6).
- **Marketplace Modules:** قدرات مُقدَّمة من أطراف ثالثة، تحتاج بادئة ديناميكية (مثال: `MKT.{VendorId}.{CapabilityName}`) — تصميم كامل مؤجَّل.
- **Third-party Integrations:** بادئة مقترحة `INT` (مثال: `INT.WhatsApp`, `INT.AccountingSync`) — مرتبطة بـ Communication Hub وIntegrations المذكورة في Product Bible Phase 3.
- **White-label Features:** قدرات متعلقة بتخصيص العلامة التجارية لعملاء Enterprise — بادئة مقترحة `WL`، تصميم كامل مؤجَّل لحين وجود طلب فعلي.

---

*نهاية RFC-003.*
