# Product Bible — Cafe & Restaurant Operating System (v1.0)
### الجزء الأول من رؤية أوسع: AI Business OS

**تاريخ الإصدار:** يوليو 2026
**الحالة:** **Approved — changes require RFC-005 Change Management**
**النطاق:** MVP — Cafe/Restaurant Vertical

---

## 1. رؤية المنتج (Product Vision)

### 1.1 ما هو المنتج؟

نظام SaaS متعدد المستأجرين (Multi-tenant) يهدف إلى مساعدة أصحاب الكافيهات والمطاعم الصغيرة والمتوسطة على **إدارة أعمالهم من مكان واحد**، بوضوح (Visibility)، وتحكم (Control)، وأتمتة (Automation)، مع الحفاظ على بساطة كافية للاستخدام اليومي.

### 1.2 ما هو المنتج **ليس**؟

- **ليس** برنامج كاشير (POS) تقليديًا يتنافس على الميزات مع أنظمة POS الموجودة.
- **ليس** منتجًا عامًا (Generic) يحاول خدمة كل قطاع منذ اليوم الأول.
- **ليس** معتمدًا على الذكاء الاصطناعي لتشغيل وظائفه الأساسية.

### 1.3 الرؤية طويلة المدى

المنتج هو الخطوة الأولى نحو **Business Operating System** أوسع، يبدأ بعمق كامل في قطاع الكافيهات والمطاعم، ثم يتوسع لاحقًا إلى قطاعات أخرى (عيادات، مقاولات، توريدات...) عبر بناء "محركات" (Engines) جديدة فوق نفس **Core Platform**، دون إعادة كتابة الأساس.

### 1.4 المبادئ التوجيهية (Guiding Principles)

| # | المبدأ | الوصف |
|---|--------|-------|
| 1 | Configuration over Customization | نفس المنتج يخدم كل العملاء؛ الفروقات تُدار عبر الإعدادات والصلاحيات وتفعيل/تعطيل الـ Modules، وليس عبر تعديل الكود لكل عميل. |
| 2 | Depth over Breadth (في MVP) | عمق كامل في قطاع واحد (Cafe/Restaurant) أفضل من عرض ضعيف عبر عدة قطاعات. |
| 3 | AI-Ready, not AI-Dependent | النظام يعمل بكامل قيمته التشغيلية بدون أي ميزة ذكاء اصطناعي؛ الـ AI طبقة تحسين اختيارية لاحقة. |
| 4 | Modular Monolith + Domain Events | معمارية واحدة منظمة داخليًا، بدون تعقيد Microservices المبكر، مع تواصل بين الوحدات عبر Domain Events. |
| 5 | Tenant-Aware Application, Infrastructure-Flexible | طبقة التطبيق لا تفترض مكان تخزين بيانات المستأجر؛ يمكن لاحقًا نقل عملاء محددين لبنية تحتية مختلفة دون تعديل منطق الأعمال. |
| 6 | Permission-First Authorization | الصلاحيات الذرية (Atomic Permissions) هي أساس النظام، والأدوار (Roles) مجرد قوالب قابلة للتخصيص فوقها. |
| 7 | Country-Agnostic Core | لا ترميز (Hardcoding) لقواعد ضريبية أو تنظيمية خاصة بدولة معينة داخل الـ Core؛ الامتثال المحلي (مثل e-Invoice) يُبنى كطبقة Adapter منفصلة. |
| 8 | Offline-first Branch Operation | الفرع يكمل دورته التشغيلية على LAN لعدة أيام دون Internet؛ Cloud للإدارة والتجميع والمزامنة وليس شرطًا لقبول البيع. |

---

## 2. السوق المستهدف (Target Market / ICP)

| البُعد | القرار |
|--------|--------|
| **السوق التجاري الأول** | مصر |
| **حجم العميل** | كافيهات مفردة (Single-branch) وسلاسل صغيرة (Multi-branch) — كلاهما مدعوم في الـ Core منذ البداية |
| **اللغة** | ثنائية اللغة (عربي/إنجليزي) من اليوم الأول، مع كون العربية اللغة الأساسية؛ RTL وLTR كلاهما Citizens من الدرجة الأولى في كل الطبقات (DB, API, UI, Reports, Notifications, AI) |
| **العملة/الضرائب/التوقيت** | معماريًا: Multi-currency, Multi-tax, Multi-timezone, Multi-date-format منذ اليوم الأول، حتى لو المُفعّل تجاريًا في MVP هو إعداد مصر فقط |
| **مبدأ التوسع الجغرافي** | التوسع لدول أخرى (مثل السعودية) يجب أن يتم عبر Configuration وBusiness Rules، وليس عبر إعادة كتابة النظام |

### 2.1 العملات والقيم المالية

- يدعم الـ Core أكثر من عملة دون استخدام قيم Floating-Point للأموال.
- العقد المالي القياسي المشترك هو `Money { amountMinor: safe integer, currencyCode: validated ISO-4217 uppercase code }`.
- لا يجوز إجراء عملية حسابية بين قيمتي Money بعملتين مختلفتين.
- قد تكون Money العامة موجبة أو صفرية أو سالبة حين يسمح المفهوم التجاري بذلك؛ أما `BasePrice.amountMinor` و`OrderLine.unitPrice.amountMinor` فيجب أن يكونا أكبر من صفر. المنتجات المجانية ذات السعر الصفري غير صالحة في MVP.

---

## 3. نطاق MVP (Modules Scope)

### 3.1 فلسفة الاختيار

الهدف من MVP: حل المشاكل التشغيلية اليومية الحقيقية لأصحاب الكافيهات، وليس منافسة كل ميزة موجودة في السوق.

### 3.2 Must-Have (MVP)

1. المبيعات ونقطة البيع (Sales & POS)
2. إدارة الطلبات (Orders)
3. **تنفيذ الطلب / عمليات المطبخ (Order Fulfillment / Kitchen Operations)** — Domain مستقل عن Sales، يدير حالة الطلب (تحضير/جاهز/تم التقديم/ملغي) — راجع RFC-001
4. **إدارة الشيفت (Shift Management)** — فتح/قفل الشيفت، مبلغ افتتاح وإقفال الدرج النقدي، حساب الفرق النقدي، ملخص نهاية الشيفت — Domain مستقل يشترط شيفت مفتوح لأي عملية بيع (راجع RFC-001 §4.3)
5. المنتجات والقائمة (Menu Management)
6. الوصفات وخصم المخزون التلقائي (Recipes / BOM Deduction)
7. إدارة المخزون (Inventory Management)
8. المشتريات (Purchasing) — أوامر شراء واستلام مخزون أساسي (Domain تشغيلي بحت)
9. **الموردين والحسابات المالية (Suppliers & Business Accounts)** — بيانات المورد، فواتير الشراء، المدفوعات، الأرصدة المستحقة، الأعمار الزمنية — Domain مالي مستقل تمامًا عن Purchasing (راجع RFC-001 §4.6)
10. المصروفات (Expenses)
11. إدارة الموظفين والشيفتات (Staff Management)
12. الحضور والانصراف عبر الموبايل بتتبع الموقع (Attendance — Location-based Check-in) — حقائق تشغيلية بحتة: Check-in/out، ساعات العمل، تأخير، انصراف مبكر، غياب، تحقق GPS وتحقق الجهاز — **بدون أي حساب مالي إطلاقًا** (راجع RFC-001 §4.10)
13. **الرواتب (Payroll)** — يستهلك حقائق Attendance ويطبّق سياسات أجر قابلة للتهيئة (بدلات، خصومات، أوفر تايم، سلف)، عبر نموذج **Suggested Adjustments** يتطلب اعتماد المدير قبل التفعيل — لا خصم أو مكافأة تلقائية بدون مراجعة بشرية (راجع RFC-001 §4.12، قرار مُعاد النظر فيه بعد التجميد الأول)
14. جرد المخزون (Stock Counting)
15. إدارة الهدر (Waste Management)
16. لوحة التحكم والتقارير التشغيلية (Manager Dashboard & Operational Reporting)
17. العملاء (Basic CRM)
18. المصادقة والأدوار والصلاحيات (Authentication, Roles & Permissions)
19. إدارة الشركة والفروع (Company / Branch Management)
20. الإشعارات داخل التطبيق (In-app Notifications)

> **تحديث (بعد إعادة نظر معمارية لاحقة):** القرار الأصلي بنقل Payroll لـ Phase 2 (راجع RFC-001 القديم) **أُلغي**. بعد مراجعة السوق المستهدف (كافيهات صغيرة/متوسطة)، تبيّن أن Attendance بدون أي انعكاس مالي قيمته محدودة لصاحب الكافيه. القرار النهائي: **Attendance وPayroll دومينان منفصلان تمامًا، لكن كلاهما Must-Have في MVP**، مع فصل صارم بينهما (Attendance = حقائق تشغيلية فقط، Payroll = سياسات مالية قابلة للتهيئة + اعتماد بشري إلزامي قبل أي تأثير مالي فعلي). التفاصيل الكاملة في Domain-Attendance.md وDomain-Payroll.md.

### 3.3 Phase 2

- برنامج الولاء (Loyalty Program)
- إدارة الطاولات (Table Management)
- الحجوزات (Reservations)
- مشتريات متقدمة (Advanced Procurement)
- شاشة عرض المطبخ (Kitchen Display System — KDS) — تُبنى فوق Order Fulfillment Domain المُثبَّت في MVP
- تحويلات بين الفروع (Inter-Branch Transfers)
- تحليلات متقدمة (Advanced Analytics)

### 3.4 Phase 3

- AI Assistant (توقع الطلب، تحليل الأداء، توصيات)
- محرك الأتمتة (Automation Engine)
- منشئ سير العمل (Workflow Builder)
- مركز التواصل (WhatsApp / Email / SMS)
- التنبؤ (Forecasting)
- Marketplace
- Public APIs & Integrations
- تطبيقات موبايل للعملاء النهائيين

### 3.5 خارج النطاق صراحة في MVP

- الفوترة الإلكترونية الحكومية (مثل ETA المصرية) — ستُبنى لاحقًا كطبقة Adapter قُطرية منفصلة عن الـ Core
- نظام اشتراكات وفوترة SaaS كامل — الإدارة تكون يدوية في MVP
- النشر الذاتي العام الذي يديره العميل (Customer-managed Self-hosting). **Branch Edge المُدار من Cafe Engine جزء إلزامي من المنتج وليس Self-hosting** (RFC-006)
- محركات صناعية أخرى (عيادات، مقاولات، تجزئة...)

---

## 4. نموذج الصلاحيات (Authorization Model)

### 4.1 المبدأ الأساسي

```
Permission (Atomic) → Role (Template قابل للتخصيص) → User
```

الصلاحيات هي **ذرية (Atomic)** وليست على مستوى الـ Module، أمثلة:

- `POS.CreateOrder`
- `POS.Refund`
- `POS.ApplyDiscount`
- `Inventory.View`
- `Inventory.Adjust`
- `Inventory.Transfer`
- `Reports.View`
- `Staff.Manage`
- `Attendance.Approve`

### 4.2 الأدوار الافتراضية (Default Role Templates)

- Owner
- Branch Manager
- Cashier
- Staff

كل Tenant يستطيع إنشاء أدوار مخصصة وتخصيص الصلاحيات دون تعديل النظام.

### 4.3 التوسع المستقبلي

النظام يجب أن يدعم مستقبلًا **Approval Workflows** (مثل: اعتماد المرتجعات، أوامر الشراء، تعديلات المخزون، اعتماد الرواتب) كطبقة منفصلة فوق نظام الصلاحيات، حتى لو لم تُنفَّذ في MVP.

---

## 5. المعمارية العامة (Software Architecture Principles)

### 5.1 نمط النظام: Modular Monolith

- Modular Monolith واحد في الـCodebase بحدود Modules واضحة؛ له Composition/Deployment role محلي على Branch Edge ودور سحابي مركزي دون تحويل الدومينات إلى Microservices.
- لا Microservices في MVP — تجنب تعقيد الأنظمة الموزعة مبكرًا.
- أي Module يكبر لاحقًا بما يكفي (AI, Notifications, Automation, Reporting) يمكن استخراجه كخدمة مستقلة دون إعادة تصميم المنصة بالكامل.

### 5.2 التواصل بين الوحدات: Domain Events

- **بين Modules مختلفة:** إلزامي عبر Domain Events (Event-Driven)، لا استدعاءات مباشرة.
- **داخل نفس الـ Bounded Context:** استدعاءات مباشرة مسموحة إن كانت تبسّط التصميم دون زيادة الترابط.

مثال تطبيقي:

```
POS يُكمل عملية بيع
   → ينشر Event: SaleCompleted
        → Inventory يستمع → يخصم المخزون
        → CRM يستمع → يحدّث نقاط/سجل العميل
        → Reporting يستمع → يحدّث التحليلات
        → Notifications يستمع → يرسل تنبيهًا عند الحاجة
        → (لاحقًا) AI يستمع → دون أي تعديل على منطق POS
```

**القاعدة الذهبية:** Sales Engine لا يعرف من يستمع لأحداثه، ولا يستدعي أي Module آخر مباشرة.

### 5.3 فصل Core عن Vertical

| الطبقة | المحتوى |
|--------|---------|
| **Core Platform** (عام، يصلح لأي قطاع مستقبلًا) | Authentication · Users, Roles & Permissions · Companies & Branches · Multi-tenancy · Notifications · Automation Framework (بنية تحتية فقط) · AI Infrastructure (بنية تحتية فقط) · Reporting Framework · Settings · Domain Event Bus |
| **Cafe Engine** (خاص بالقطاع، قابل للاستبدال لاحقًا) | Sales · POS · Orders · Menu · Recipes · Inventory · Kitchen · Tables · Staff Operations وأي سير عمل خاص بالكافيهات |

العميل (صاحب الكافيه) لا يرى أبدًا أي مفهوم أو شاشة تخص صناعات أخرى.

### 5.4 نموذج تعدد المستأجرين (Multi-Tenancy Strategy)

**الاستراتيجية الافتراضية (MVP وغالبية العملاء):**

- Shared Database, Shared Schema
- عزل عبر `tenant_id` في كل جدول
- PostgreSQL Row-Level Security (RLS)
- تفويض صارم على مستوى التطبيق (Application-level Authorization) كطبقة حماية إضافية

**المرونة طويلة المدى (بدون تنفيذ في MVP):**

- طبقة التطبيق تبقى "Tenant-Aware" فقط، بينما طبقة البنية التحتية تقرر أين تُخزَّن بيانات كل Tenant.
- عملاء Enterprise مستقبليون يمكن نقلهم إلى قاعدة بيانات مخصصة (Dedicated DB) دون تعديل كود التطبيق، عبر "Tenant Context Resolver" يحدد مصدر البيانات لكل طلب.

**استثناء تشغيلي إلزامي للـ Offline-first:** كل فرع يملك PostgreSQL محلية داخل `Branch Edge` ومربوطة بـ`tenantId + branchId` واحدين. هذه ليست قاعدة Cloud مخصصة للـTenant؛ هي Operational Store محلي يتزامن مع الـCloud وفق RFC-006 مع استمرار RLS وApplication Authorization.

### 5.5 نموذج النشر (Deployment Model)

- **MVP:** Cloud-managed SaaS مع `Branch Edge` مُدار من Cafe Engine على جهاز Windows رئيسي في كل فرع، وقاعدة PostgreSQL محلية مشتركة عبر LAN.
- الدورة التشغيلية الأساسية يجب أن تستمر لعدة أيام بدون Internet؛ Cloud يبقى مركز الإدارة والتجميع والتقارير والأسطول.
- Branch Edge ليس Customer-managed Self-hosting. النشر الذاتي العام لمنصة Cloud بالكامل ما زال خارج MVP.
- آلية الملكية والمزامنة والأمان والنسخ الاحتياطي محددة في RFC-006.

### 5.6 التعامل مع Supabase (Vendor Abstraction)

- استخدام Supabase (Auth, Realtime, Storage, PostgreSQL) مقبول ومناسب لسرعة MVP.
- **لا يُسمح** لمنطق الأعمال (Business Logic) بالاعتماد المباشر على SDK الخاص بـ Supabase.
- كل خدمة خارجية تُستدعى عبر طبقة Abstraction داخلية:
  - `IAuthService`
  - `IStorageService`
  - `IRealtimeService`
  - `INotificationService`
  - (لاحقًا) `IAIService`

هذا يحافظ على نظافة الكود ويجعل استبدال المزود أو الانتقال لبنية Self-hosted لاحقًا ممكنًا دون إعادة كتابة منطق الأعمال.

---

## 6. استراتيجية الذكاء الاصطناعي (AI Strategy)

**المبدأ:** AI-Ready, Not AI-Dependent.

في MVP:

- التقاط بيانات نظيفة ومنظّمة (Clean Structured Data) لكل الأنشطة المهمة.
- نشر Domain Events لكل نشاط تجاري مهم (متاح مجانًا بفضل المعمارية الحدثية أصلًا).
- الحفاظ على معمارية Modular تسمح بإضافة AI لاحقًا دون تعديل جوهري.
- عدم بناء أي بنية تحتية خاصة بالـ AI الآن (لا Vector DB، لا Embeddings، لا RAG).
- عند تقديم ميزات AI لاحقًا (Phase 3)، ستُستدعى عبر طبقة Abstraction (`IAIService`) دون ربط منطق الأعمال بمزوّد معين.

---

## 7. النموذج التجاري لمرحلة MVP (Onboarding & Billing)

- لا يوجد نظام اشتراكات/فوترة SaaS كامل في MVP.
- الـ Onboarding يدوي بالكامل:
  1. صاحب المنتج (أنت) يُنشئ الـ Tenant.
  2. يُهيّئ إعدادات الشركة.
  3. يُفعّل الـ Modules المشتراة.
  4. الفوترة تُدار يدويًا خارج المنصة.
  5. الدعم والتهيئة يتمّان شخصيًا.
- **متطلب معماري إلزامي رغم البساطة التجارية:** كل Module يجب أن يملك آلية تفعيل/تعطيل (`is_active` per Tenant) منذ اليوم الأول — حتى لو التفعيل يتم يدويًا عبر لوحة Admin بسيطة بدل محرك اشتراكات تلقائي.
- هذا يسمح لاحقًا بالانتقال إلى: تسجيل ذاتي للعملاء، دفع إلكتروني، خطط اشتراك، وتفعيل تلقائي للـ Modules — دون تعديل الـ Core.

---

## 8. النموذج الضريبي والفوترة (Invoicing & Tax Model)

- الفاتورة الإلكترونية الحكومية (مثل منظومة ETA المصرية) **خارج نطاق MVP** صراحة.
- نموذج الفاتورة في الـ Core يُصمَّم ليكون **عامًا ومحايدًا قُطريًا (Country-Agnostic)**: يمثّل المعاملة التجارية ذاتها (Business Transaction) دون ترميز متطلبات ضريبية خاصة بدولة معينة.
- الامتثال الضريبي المحلي (مصر، السعودية، أو أي دولة أخرى مستقبلًا) يُبنى كـ **Adapter/Integration Layer منفصل** فوق نموذج الفاتورة الأساسي، دون التأثير على Core Platform أو Cafe Engine.

---

## 9. ملخص القرارات المعمارية الحاسمة (Architectural Decision Log)

| # | القرار | الحالة |
|---|--------|--------|
| ADR-01 | Multi-tenant SaaS منذ البداية | معتمد |
| ADR-02 | Configuration over Customization | معتمد |
| ADR-03 | Modular Monolith (لا Microservices في MVP) | معتمد |
| ADR-04 | Domain Events إلزامية بين الـ Modules | معتمد |
| ADR-05 | Permission-First Authorization (Atomic Permissions) | معتمد |
| ADR-06 | Shared DB + Shared Schema + RLS (Hybrid مستقبلًا) | معتمد |
| ADR-07 | ~~Cloud-dependent SaaS فقط في MVP~~ — **مُستبدَل بـ ADR-37**؛ Customer-managed Self-hosting ما زال مؤجلًا | مُستبدَل |
| ADR-08 | Supabase مع طبقات Abstraction إلزامية | معتمد |
| ADR-09 | Core Platform منفصل عن Cafe Engine | معتمد |
| ADR-10 | AI-Ready, Not AI-Dependent | معتمد |
| ADR-11 | Onboarding/Billing يدوي في MVP مع دعم Module Activation منذ البداية | معتمد |
| ADR-12 | نموذج فاتورة محايد قُطريًا؛ الامتثال الضريبي طبقة Adapter منفصلة | معتمد |
| ADR-13 | إضافة Order Fulfillment كـ Domain مستقل عن Sales (راجع RFC-001) | معتمد |
| ADR-14 | ~~Payroll يُنقَل إلى Phase 2~~ — **مُلغى، راجع ADR-26** | مُستبدَل |
| ADR-15 | CRM تقترح أهلية الخصم فقط؛ Sales هي دائمًا من تُطبّق القرار المالي النهائي (راجع RFC-001) | معتمد |
| ADR-16 | Expenses وPurchasing يبقيان Domains منفصلين معماريًا (راجع RFC-001) | معتمد |
| ADR-17 | إضافة Shift Management كـ Domain مستقل Must-Have في MVP؛ كل Order يحمل `shiftId` إلزاميًا منذ إنشائه، و`SaleCompleted` يشترط شيفتًا مفتوحًا. Shift Management يعتمد على `OrderPlaced.shiftId` في Open Orders Counter ولا يستنتج الشيفت من `createdByEmployeeId?` (راجع RFC-001 §4.3، RFC-002) | معتمد |
| ADR-18 | ModifierGroup كيان قابل لإعادة الاستخدام (Aggregate Root مستقل) وليس مملوكًا لمنتج واحد (راجع Domain-Menu.md) | معتمد |
| ADR-19 | Modifiers قد تحمل تأثيرًا على الوصفة (Substitution/Addition)؛ Inventory يحسب الاستهلاك الفعلي بدمج Base Recipe + Modifier Impacts محليًا (راجع RFC-002 §9، Domain-Menu.md) | معتمد |
| ADR-20 | StockItem مملوك حصريًا لـ Inventory (تصحيح لقرار سابق)؛ Menu.Recipe تشير فقط لـ `stockItemId` دون امتلاكه (راجع Domain-Inventory.md) | معتمد |
| ADR-21 | Weighted Average Cost كطريقة تقييم مخزون في MVP؛ FIFO/Batch Tracking مؤجَّلة لـ Phase 2 | معتمد |
| ADR-22 | `NegativeStockPolicy` قابلة للتهيئة لكل Tenant (`Strict`/`Warning`/`Ignore`، والافتراضي `Warning`) عبر Settings، وليست منطقًا مُرمَّزًا. Sales تقرأ القيمة المحلولة مرة واحدة عند بدء Create Order عبر port مملوك لطبقة Sales Application، دون استيراد Platform (راجع Domain-Inventory.md وRFC-004 SA-ADR-06) | معتمد |
| ADR-23 | Recipe/Consumption Immutability: حركات المخزون الناتجة عن بيع تُخزَّن بكميات ثابتة، ولا تتأثر بتعديل الوصفة لاحقًا | معتمد |
| ADR-24 | إضافة **Suppliers & Business Accounts** كـ Domain مستقل يملك بيانات المورد والالتزامات المالية (Accounts Payable, Payments, Aging)، منفصل تمامًا عن Purchasing التشغيلي (راجع RFC-001 §4.6) | معتمد |
| ADR-25 | فاتورة الشراء أو المورد لا يزيدان المخزون مباشرة أبدًا؛ المخزون يتغيّر حصريًا عبر `GoodsReceived` من Purchasing | معتمد |
| ADR-26 | Payroll يعود ليصبح Must-Have في MVP (يُلغي ويستبدل ADR-14) — Attendance بدون انعكاس مالي قيمته محدودة لصاحب كافيه صغير | معتمد |
| ADR-27 | فصل صارم: Attendance = حقائق تشغيلية فقط (Check-in/out, ساعات عمل, تأخير, انصراف مبكر, غياب, GPS, تحقق الجهاز) بدون أي حساب مالي؛ Payroll = سياسات أجر قابلة للتهيئة فقط، بدون أي تسجيل حضور مباشر (راجع Domain-Attendance.md، Domain-Payroll.md) | معتمد |
| ADR-28 | Payroll لا يُطبِّق أي خصم أو مكافأة تلقائيًا — كل تأثير مالي يبدأ كـ `PayrollAdjustmentSuggested` بحالة `Pending`، ولا يُصبح جزءًا من الراتب الفعلي إلا بعد اعتماد صريح من المدير (Approve/Reject) | معتمد |
| ADR-29 | السلف والقروض (`EmployeeAdvance`) كيان مملوك لـ Payroll، تُسدَّد عبر توليد `PayrollAdjustmentSuggested` تلقائي بنوع Deduction في كل دورة راتب لاحقة حتى اكتمال السداد | معتمد |
| ADR-30 | Staff هو المصدر الوحيد لبيانات الموظف الأساسية (`employeeId`)؛ Attendance وPayroll يشيران له فقط عبر Read Models من 6 أحداث دورة حياة — يُغلق فجوة موثَّقة سابقًا في كلا الدومينين (راجع RFC-001 §4.9، Domain-Staff.md) | معتمد |
| ADR-31 | `Staff.BaseSalaryReference` (حقيقة تعاقدية) و`Payroll.SalaryProfile.base_salary` (قيمة تشغيلية) مفهومان منفصلان عمدًا — الأول يُهيِّئ الثاني عند الإنشاء فقط، وPayroll يحتفظ بملكية تشغيلية كاملة بعدها (راجع Domain-Payroll.md §9) | معتمد |
| ADR-32 | Expenses يوثِّق حدوث المصروف فقط، دون سداد فعلي، دون اعتماد مسبق (خلافًا لـ Payroll عمدًا)؛ التصحيح يمر حصريًا عبر `ExpenseCorrected` (سجل منفصل) دون تعديل السجل الأصلي (راجع Domain-Expenses.md) | معتمد |
| ADR-33 | إضافة `InventoryMovementRecorded` كحدث موحَّد يُنشَر لكل حركة مخزون بالتقييم المالي الكامل — يسد فجوة كان خصم المخزون الناتج عن البيع فيها غير مرئي خارج Inventory إطلاقًا (اكتُشفت أثناء تصميم Reporting) | معتمد |
| ADR-34 | إضافة حقول إسناد موظف اختيارية (`createdByEmployeeId`, `completedByEmployeeId`, `preparedByEmployeeId`, `servedByEmployeeId`) لأحداث دورة حياة الطلب — لأغراض Reporting فقط (Top Cashiers/Baristas)، دون أي شرط تشغيلي جديد | معتمد |
| ADR-35 | Reporting مُصمَّم كـ Pure Read Model Domain: لا يملك أي حقيقة عمل، لا ينشر أي حدث، ويستهلك كل الـ 48 حدث في RFC-002 دون استثناء. إعادة تشغيل الأحداث (Event Replay) كافية نظريًا لإعادة بناء كل تقرير من الصفر (راجع Domain-Reporting.md) | معتمد |
| ADR-36 | **Canonical Money:** كل قيمة مالية مشتركة تستخدم `Money { amountMinor, currencyCode }`؛ لا Floating-Point، ولا عمليات بين عملات مختلفة. Menu يملك السعر الحالي والمجدول، وSales ينسخ السعر الحالي إلى `OrderLine.unitPrice` كـ Snapshot ثابت لا يُعاد تسعيره لاحقًا | معتمد |
| ADR-37 | **Offline-first Branch Edge:** كل فرع يشغّل Vendor-managed Windows Edge + PostgreSQL محلية مشتركة عبر LAN، ويستمر في الدورة التشغيلية لأيام دون Internet. Cloud Supabase يبقى مركز الإدارة والتجميع؛ المزامنة Application-level Outbox/Inbox وفق ملكية Single-writer، وليست PostgreSQL replication أو Customer-managed Self-hosting (RFC-006) | معتمد |

---

## 10. الخطوات التالية (Next Documents to Produce)

هذه الوثيقة تمثل **الطبقة الأولى (Vision + Architecture Principles)**. الوثائق التالية المقترحة لإكمال حزمة التنفيذ:

1. **PRD تفصيلي لكل Module** في MVP (User Stories, Acceptance Criteria)
2. **Data Model / ERD** على مستوى Core Platform وCafe Engine
3. **Event Catalog** — قائمة كاملة بكل Domain Events المتوقعة وحمولتها (Payload)
4. **Permission Matrix** التفصيلية لكل Module
5. **API Design Guidelines** (REST/GraphQL, Versioning, i18n Headers)
6. **Non-Functional Requirements (NFRs)** التفصيلية (الأداء، الأمان، النسخ الاحتياطي)
7. **Roadmap تنفيذي** بمراحل زمنية تقديرية لـ MVP

---

*نهاية النسخة الأولى من Product Bible.*
