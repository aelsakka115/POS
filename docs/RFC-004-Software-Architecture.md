# RFC-004: Software Architecture — Implementation Constitution

**Type:** RFC (Software/Implementation Architecture — Phase 2)
**Depends on:** Product Bible v1، RFC-001، RFC-002، RFC-003، System Freeze v1، Master-System-Flow.md، وكل الـ 12 Domain Document
**Status:** **Approved — changes require RFC-005 Engineering Decision Process**
**Audience:** Claude Code، Lovable، GitHub Copilot، وأي AI Agent أو مطوّر بشري يعمل على هذا المشروع مستقبلًا

---

## 1. Purpose and Scope

### 1.1 الفرق بين Business Architecture وSoftware Architecture

| | Business Architecture (Phase 1 — مُجمَّدة) | Software Architecture (Phase 2 — هذه الوثيقة) |
|---|---|---|
| تجيب على | "ماذا يفعل النظام؟" | "كيف نبنيه؟" |
| الوثائق | Product Bible، RFC-001، RFC-002، RFC-003، Master-System-Flow، Domain Documents | RFC-004 (هذه الوثيقة) وملحقاتها المستقبلية |
| التعديل | لا يُعاد فتحها إلا بـ RFC تعديل صريح | تتطور مع المشروع، لكن ضمن نفس المبادئ الحاكمة |

**هذه الوثيقة لا تُعيد تصميم أي سلوك تجاري.** كل Domain، كل Event، كل Business Rule، كل Capability ID مذكور هنا هو **مرجع لما هو موثَّق بالفعل**، وليس تعريفًا جديدًا. أي تعارض يظهر أثناء القراءة يُوقِف العمل فورًا (راجع القسم 14 لسجل القرارات المفتوحة للنقاش).

### 1.2 العلاقة مع RFC-001/002/003

- **RFC-001 (Context Map)** → يترجم مباشرة لحدود الـ Modules في الكود (القسم 4، 5، 6).
- **RFC-002 (Event Catalog)** → يترجم مباشرة لآلية نشر/استهلاك الأحداث الفعلية (القسم 6.5) — كل حقل Payload موثَّق هناك **يجب** أن يظهر بنفس الاسم في الكود، دون ترجمة أو إعادة تسمية.
- **RFC-003 (Capability Architecture)** → يترجم لطبقة Middleware/Guard تتحقق من الـ Capability ID قبل تنفيذ أي Endpoint أو عرض أي UI Component (القسم 6.5، 7.4).

### 1.3 غير المسموح به في هذه الوثيقة

- إضافة/حذف/تعديل أي Domain، Event، أو Business Rule.
- تغيير أي ADR مُعتمَد في Product Bible.
- توليد كود تنفيذي فعلي (هذه وثيقة معمارية، ليست Codebase).

### 1.4 ما لا تحدِّده هذه الوثيقة عمدًا: تفاصيل البنية التحتية

RFC-004 يُثبِّت **الالتزامات المعمارية** (حدود، أنماط، عقود) — **وليس** اختيارات الاستضافة أو التشغيل الدقيقة (أي منصة استضافة بعينها، آلية جدولة الـ Outbox، طريقة حقن سياق الـ Tenant في الاستعلامات). هذه القرارات **بنية تحتية (Infrastructure)**، تتغيّر بحرية أكبر من القرارات المعمارية، وتُوثَّق في **وثيقة Infrastructure & Deployment منفصلة مستقبلًا** — لا تُخلَط مع دستور التنفيذ هذا. أي مكان في هذه الوثيقة يذكر أداة أو تقنية استضافة بعينها هو **توصية حالية غير مُلزِمة**، مُعلَّمة صراحة كذلك (راجع القسم 14).

---

## 2. Technology Stack

| التقنية | الدور | لماذا اخترناها |
|---|---|---|
| **React** | مكتبة الواجهة | أكبر مجتمع ودعم أدوات AI (Claude Code, Lovable مبنيان حولها أساسًا)؛ Component Model يطابق فلسفة "Configuration over Customization" |
| **TypeScript** | لغة التطوير الأساسية (Frontend + Backend) | Type Safety عبر الطبقتين يمنع فئة كاملة من الأخطاء، وأساسي لمشاركة الـ Zod Schemas بين الطرفين (راجع القسم 6.5) |
| **Vite** | Build Tool للواجهة | أسرع من Webpack بشكل كبير في Dev Mode، دعم ممتاز لـ TypeScript وTailwind بدون إعداد معقَّد |
| **Supabase** | Backend Platform (Postgres + Auth + Storage + Realtime) | قرار مُثبَّت بالفعل في Product Bible §5.6 — يُستخدَم عبر طبقات Abstraction إلزامية (`IAuthService`, `IStorageService`, `IRealtimeService`) وليس مباشرة |
| **PostgreSQL** | قاعدة البيانات | يدعم Row-Level Security (أساس عزل الـ Tenants المُقرَّر في Product Bible)؛ آلية تشغيل الـ Dispatcher والمهام غير المتزامنة تفصيل بنية تحتية مؤجَّل (راجع القسم 14)، وليس سببًا معماريًا لاختيار Postgres نفسه |
| **Tailwind CSS** | نظام التنسيق | Utility-first يطابق فلسفة Design Tokens (القسم 9)؛ دعم ممتاز لـ RTL/LTR عبر Logical Properties |
| **shadcn/ui** | مكتبة مكوّنات أساسية | مكوّنات قابلة للتعديل الكامل (مش Black-box Library) — تدعم "Configuration over Customization"، ومبنية على Radix (Accessibility جاهزة) |
| **React Query (TanStack Query)** | إدارة حالة السيرفر | يطابق تمامًا نمط Read Models/Eventually Consistent المُتبَع في كل الـ Domain Documents — Caching وInvalidation وRefetching جاهزين |
| **React Hook Form** | إدارة النماذج | أداء أفضل من الحلول القائمة على Context لكل تغيير حقل؛ تكامل مباشر مع Zod |
| **Zod** | التحقق من البيانات (Validation) وToken الأنواع | **العمود الفقري لعقد الـ API** — نفس الـ Schema يُستخدَم للتحقق في الـ Backend ولاستنتاج الأنواع (`z.infer`) في الـ Frontend؛ مصدر حقيقة واحد للشكل، متسق مع مبدأ Single Source of Truth |

### مكتبات مساعدة موصى بها

| المكتبة | الدور | السبب |
|---|---|---|
| **React Router** | التوجيه (Routing) | الأنضج والأوسع دعمًا؛ كافٍ لبنية Feature-first (القسم 7.1) دون تعقيد إضافي (YAGNI) |
| **date-fns + date-fns-tz** | التعامل مع التواريخ والمناطق الزمنية | خفيف الوزن (Tree-shakable)، يدعم Multi-timezone المُقرَّر في Product Bible §2 |
| **react-i18next** | الترجمة (i18n) والدعم ثنائي اللغة | يدعم RTL/LTR كـ First-class Citizens (مبدأ Product Bible §5.3) |
| **Recharts** | الرسوم البيانية للوحات التحكم | يخدم Domain-Reporting.md مباشرة (Dashboards لكل الأدوار) |
| **lucide-react** | الأيقونات | يتكامل مع shadcn/ui افتراضيًا |
| **Zustand** | حالة UI محلية بسيطة (غير Server State) | أخف من Redux بكثير؛ يُستخدَم فقط لحالة واجهة عابرة (مثال: حالة Sidebar) — **ليس** لتخزين بيانات من السيرفر (تلك مسؤولية React Query حصريًا) |
| **Vitest + React Testing Library** | اختبارات الوحدة والتكامل (Frontend) | يتكامل مع Vite مباشرة بدون إعداد منفصل |
| **Playwright** | اختبارات End-to-End | يدعم اختبار سيناريوهات كاملة عبر الـ Domains (مثال: Walkthrough الكامل من RFC-001) |
| **ESLint + Prettier** | جودة والتزام الكود | إلزامي لضمان اتساق الأسلوب عبر مساهمات AI متعددة |

---

## 3. High-Level Software Architecture

### 3.1 Modular Monolith — التطبيق المباشر

كل الـ 13 Domain في RFC-001 تُبنى كوحدات (Modules) منفصلة **داخل نفس الـ Codebase والـ Deployment الواحد** (لا Microservices — Product Bible ADR-03، صمد عبر كل الـ System Freeze). كل Module:
- له مجلد مستقل بنفس اسم الـ Domain بالضبط.
- يملك طبقاته الثلاث (Domain/Application/Infrastructure — القسم 6)، ويلتزم بقواعد الاعتماد الصريحة (القسم 5).
- **لا يستورد كودًا من مجلد Module آخر مباشرة** إلا عبر Read Models أو Event Bus — نفس قاعدة "لا استدعاءات مباشرة بين الدومينز" لكن الآن على مستوى ملفات الكود.

### 3.2 Event-Driven Communication — من RFC-002 للكود

كل الـ 48 حدث الموثَّقة في RFC-002 تُنفَّذ عبر **Transactional Outbox Pattern** — نمط معماري مستقل تمامًا عن أي آلية تشغيل بعينها:

1. أي Domain يكتب تغييرًا في قاعدة البيانات (مثال: `SaleCompleted`) يكتب **في نفس الـ Transaction** سجلًا في جدول `event_outbox` (tenant_id, event_type, payload, created_at, published_at?).
2. **عملية Dispatcher غير متزامنة** (Asynchronous، آلية التشغيل الفعلية — مجدولة، أو مبنية على طابور، أو غير ذلك — قرار تنفيذي منفصل، راجع القسم 14) تقرأ الأحداث غير المنشورة **بترتيب `created_at` لكل `tenant_id`** وتُوزِّعها على المستمعين.
3. هذا النمط هو **الضمان المعماري** وراء RFC-002 §16 Rule 8 (Per-Tenant Ordered Delivery) — بدونه، الضمان يبقى نصًا نظريًا فقط. **آلية تشغيل الـ Dispatcher نفسها (الجدولة الزمنية، الاستدعاء عند الحدث، أو غيرها) تفصيل بنية تحتية، وليست قرارًا معماريًا** — راجع القسم 14 (SA-ADR) للفصل الصريح بين الاثنين.

> **لماذا Outbox وليس استدعاء مباشر لكل مستمع وقت الكتابة؟** يضمن Atomicity (التغيير + الحدث ينجحان أو يفشلان معًا)، ويمنع فقدان أحداث عند تعطّل مؤقت لأي مستهلك. **هذا الضمان لا يعتمد على أي تقنية تشغيل مُحدَّدة** — Outbox هو العقد المعماري؛ طريقة "تفريغه" فعليًا قرار تنفيذي منفصل يتغيّر بحرية دون المساس بالعقد نفسه.

### 3.3 Read Models — من التوثيق للتنفيذ

كل الـ 8+ Read Models الموثَّقة عبر الـ Domain Documents (Shift Status في Sales، Stock Items في Menu/Purchasing، Employee في Attendance/Payroll/Expenses...) تُنفَّذ كـ **جداول Projection منفصلة**، تُحدَّث بواسطة Event Handler يستمع لنفس أحداث الـ Outbox. **لا Read Model يُبنى بـ JOIN مباشر لجداول دومين آخر** — يُبنى فقط من الأحداث المُستهلَكة.

### 3.4 CQRS — أين ولماذا

النظام يتبع **CQRS خفيف (Lightweight)** وليس Event Sourcing كامل:
- **Command Side:** كل Domain يكتب لجداوله الخاصة (Source of Truth) عبر Application Layer يفرض الـ Business Rules.
- **Query Side:** Reporting (وكل Read Model محلي آخر) يقرأ من Projections منفصلة، محسَّنة للقراءة، لا علاقة لها بجداول الكتابة الأصلية.
- **لا Event Sourcing كامل** (إعادة بناء الحالة بالكامل من الأحداث في كل قراءة) — هذا تعقيد غير مطلوب في MVP (YAGNI)، رغم أن Domain-Reporting.md §1 يُثبِّت أن "إعادة التشغيل نظريًا ممكنة" كمبدأ تصميم، وليس كآلية تشغيل يومية فعلية.

---

## 4. Project Structure Blueprint

### 4.1 Canonical Money Contract

العقد المشترك الوحيد للقيم المالية هو:

```text
Money {
  amountMinor: safe integer
  currencyCode: validated ISO-4217 uppercase code
}
```

لا تُستخدم Floating-Point للأموال، ولا تُجمع أو تُقارن حسابيًا قيم بعملات مختلفة. يجوز أن تكون Money العامة signed حين يسمح المفهوم التجاري، بينما `BasePrice.amountMinor > 0` و`OrderLine.unitPrice.amountMinor > 0`. يُوثَّق العقد هنا فقط في هذه المهمة، وتنفيذه اللاحق يكون حصريًا داخل `packages/domain-contracts` بمهمة تنفيذ مستقلة.

### 4.2 Monorepo Structure

بنية Monorepo واحدة، تحوي الـ Frontend والـ Backend معًا:

```
cafe-engine/
├── apps/
│   ├── web/                      # تطبيق React (الواجهة)
│   └── backend/                   # منطق العمل الخلفي (كل الدومينز) — آلية الاستضافة الفعلية تفصيل بنية تحتية، راجع القسم 14
├── packages/
│   ├── domain-contracts/         # Zod Schemas + Event Types + Capability IDs — مصدر حقيقة واحد للأنواع
│   ├── ui/                       # مكوّنات shadcn/ui المُعدَّلة + Design Tokens (القسم 10)
│   └── config/                   # eslint/tsconfig/tailwind مشتركة
├── database/
│   ├── migrations/                # SQL Migrations (منظَّمة حسب الدومين)
│   └── seed/                      # بيانات أولية للتطوير
├── docs/                          # كل وثائق RFC وDomain Documents (Product Bible → RFC-004) — "Architecture as Living Documentation"
└── ...
```

### شرح كل مجلد

- **`packages/domain-contracts`**: **الأهم في كل البنية.** يحتوي Zod Schema لكل Event من RFC-002 (بنفس الاسم بالضبط)، وكل Capability ID من RFC-003. أي Domain (Backend أو Frontend) يستورد من هنا، ولا أحد يُعرِّف نفس الشكل مرتين.
- **`apps/backend`**: مُقسَّم داخليًا لمجلد بكل اسم Domain من RFC-001 حرفيًا (`sales/`, `inventory/`, `menu/`, `order-fulfillment/`, `shift-management/`, `suppliers-business-accounts/`, `purchasing/`, `crm/`, `staff/`, `attendance/`, `expenses/`, `payroll/`, `reporting/`). **هذا المجلد منطقي (Logical)**، وقد يُنشَر كوحدة واحدة أو كدوال منفصلة حسب قرار البنية التحتية — لا يفرض هذا القسم آلية استضافة بعينها.
- **`apps/web`**: مُقسَّم Feature-first بنفس أسماء الدومينز (القسم 7.1).
- **`docs`**: نسخة حية من كل الوثائق المعمارية — أي AI Agent يبدأ عمله بقراءة هذا المجلد أولًا (القسم 11).

---

## 5. Dependency Rules

هذا القسم يُحوِّل "لا تخالف حدود الدومين" من مبدأ عام لقيود صريحة على الاستيراد (Import) بين كل جزء من الكود — القاعدة التي يُقاس عليها أي PR (راجع القسم 12).

### 5.1 بين الطبقات داخل نفس الـ Domain (اتجاه واحد فقط، للداخل)

```
API  →  Application  →  Domain
                ↓
         Infrastructure  →  Domain (عبر Interfaces فقط، وليس تنفيذًا مباشرًا)
```

| من | يسمح بالاستيراد من | ممنوع الاستيراد من |
|---|---|---|
| **Domain** | لا شيء خارج نفسه (لا Framework، لا مكتبة خارجية غير أساسية) | `application/`, `infrastructure/`, `api/` — أي طبقة أعلى |
| **Application** | `domain/` فقط (Interfaces والكيانات) | `infrastructure/` مباشرة (يستقبل التنفيذ عبر Dependency Injection، لا يستورده) |
| **Infrastructure** | `domain/` (لتنفيذ الـ Interfaces المُعرَّفة هناك) | `application/` |
| **API** | `application/` فقط | `domain/`, `infrastructure/` مباشرة |

### 5.2 بين الدومينز المختلفة (القاعدة الأصعب، والأهم)

| مسموح | ممنوع تمامًا |
|---|---|
| الاستيراد من `packages/domain-contracts` (Zod Schemas، Event Types، Capability IDs) | استيراد أي ملف من `domain/`, `application/`, أو `infrastructure/` الخاص بدومين آخر |
| قراءة Read Model محلي مبني من أحداث دومين آخر (راجع القسم 3.3) | استعلام SQL مباشر (JOIN) على جداول دومين آخر |
| نشر حدث عبر الـ Outbox (القسم 3.2) | استدعاء دالة أو Use Case من دومين آخر مباشرة (In-Process Function Call عابر للدومين) |

**اختبار عملي بسيط لأي PR:** لو ملف داخل `sales/` عنده `import` من مسار يحتوي `inventory/` (غير `domain-contracts`) — **هذا انتهاك مباشر، يُرفَض فورًا بغض النظر عن أي مبرر.**

### 5.3 بين الـ Frontend والـ Backend

الـ Frontend **لا يستورد أي كود من `apps/backend` إطلاقًا** — التواصل الوحيد المسموح عبر طبقة الـ API (HTTP)، بعقد مُشترَك من `packages/domain-contracts`. هذا يحافظ على إمكانية استبدال آلية استضافة الـ Backend بالكامل (القسم 14) دون أي أثر على كود الـ Frontend.

---

---

## 6. Backend Architecture

### 6.1 الطبقات الأربع لكل Domain

كل Domain (داخل طبقة الـ Backend، بغض النظر عن آلية الاستضافة الفعلية — راجع القسم 14) يتبع نفس البنية الداخلية:

```
{domain-name}/
├── domain/           # كيانات، Value Objects، قواعد العمل الصرفة (بدون أي Dependency خارجي)
├── application/       # Use Cases / Services — تُنسِّق منطق العمل، تنشر أحداثًا، تتحقق من Capabilities
├── infrastructure/     # Repositories (Postgres)، Event Publisher (Outbox)، تكامل خارجي
└── api/               # نقاط الدخول (Entry Points) — تحويل Request↔Zod Schema↔Application Layer
```

| الطبقة | المسؤولية | مثال مباشر من الـ Domain Documents |
|---|---|---|
| **Domain** | تطبيق حرفي للقسم "Business Rules" و"Aggregate Roots" من كل Domain Document | `Sale` Aggregate يفرض "لا SaleCompleted بدون شيفت مفتوح" |
| **Application** | تنسيق العملية الكاملة: تحقق Capability (RFC-003) → تحقق Permission → استدعاء Domain → حفظ → كتابة للـ Outbox | `CompleteSaleUseCase` يستدعي `Sale.complete()` ثم يكتب `SaleCompleted` للـ Outbox |
| **Infrastructure** | تنفيذ فعلي: استعلامات SQL، قراءة/كتابة Outbox، استدعاء `IStorageService` لو محتاج | `PostgresSaleRepository` |
| **API** | تحويل الطلب الوارد لـ DTO مُتحقَّق بـ Zod، واستدعاء Application Layer | معالج `POST /sales/complete` |

### 6.2 قاعدة صارمة: Domain Layer لا يعرف بوجود Database أو أي بروتوكول اتصال

طبقة الـ Domain (الكيانات وقواعد العمل) **يجب أن تكون قابلة للاختبار بدون أي اتصال بقاعدة بيانات أو شبكة** — هذا هو المقياس العملي لصحة الفصل بين الطبقات (Dependency Inversion من SOLID). راجع القسم 5 (Dependency Rules) للقيود الصريحة على الاستيراد بين الطبقات.

### 6.3 تنظيم قاعدة البيانات (مستوى معماري فقط)

- جدول أو أكثر لكل Aggregate Root الموثَّق في كل Domain Document (القسم 11 من كل وثيقة — "Data Model").
- **كل جدول يحمل `tenant_id` إلزاميًا**، مع عزل مُطبَّق على مستوى قاعدة البيانات (Row-Level Security) بناءً على هوية الـ Tenant المُستخرَجة من سياق الطلب المُصادَق عليه. **الآلية التقنية الدقيقة لحقن هوية الـ Tenant في سياق كل استعلام (Session Variables، Connection Pooling Strategy، أو غيرها) تفصيل بنية تحتية** — مؤجَّلة لوثيقة Infrastructure مستقبلية (راجع القسم 14).
- جدول `event_outbox` مشترك (وليس لكل Domain جدول منفصل) — يسهِّل الـ Dispatcher الموحَّد.
- Migrations مُنظَّمة بترتيب زمني، لكن **مُجمَّعة بمجلد فرعي لكل Domain** لسهولة التتبع.

### 6.4 آلية نشر الأحداث (العقد المعماري، بمعزل عن آلية التشغيل)

```
[Application Layer] → يكتب Business State + Outbox Record في نفس الـ Transaction
                    ↓
[Dispatcher — آلية تشغيل غير محدَّدة معماريًا] → يقرأ Outbox غير المُرسَل، مُرتَّبًا بـ tenant_id + created_at
                    ↓
[Event Router] → يستدعي كل Handler مُسجَّل لهذا النوع من الأحداث (حسب مصفوفة الاشتراكات في RFC-002 §16)
                    ↓
[كل Handler] → يُحدِّث Read Model الخاص به، أو يُنفِّذ منطق Application Layer المرتبط
```

### 6.5 تطبيق RFC-003 (Capabilities) في الكود

سلسلة تحقق واحدة على مستوى الـ API Layer، بمعزل عن أي تقنية استضافة:

```
Request → [Auth] → [Tenant Context Resolution] → [Capability Guard] → [Permission Guard] → Application Layer
```

### 6.6 Tenant Configuration Dependency Direction

العقد المحايد للدومينز يقع في `apps/backend/shared/application/configuration/ITenantConfigurationPort`. لا يحتوي هذا العقد أي منطق Sales. أما `INegativeStockPolicyProvider` فهو outbound port مملوك لطبقة Sales Application في `apps/backend/sales/application/ports/INegativeStockPolicyProvider`.

```text
CreateOrderUseCase
    → Sales Application INegativeStockPolicyProvider

Sales Infrastructure Adapter
    → implements INegativeStockPolicyProvider
    → depends on shared ITenantConfigurationPort

Platform Infrastructure
    → implements shared ITenantConfigurationPort

Composition Root
    → wiring only
```

Sales لا يستورد `platform/domain` أو `platform/application` أو `platform/infrastructure`. يقرأ Create Order السياسة مرة واحدة عند البداية، وتستقبل طبقة Sales Domain القيمة المحلولة فقط (`Strict | Warning | Ignore`) دون Promises أو Settings أو Platform أو `ITenantConfigurationPort`. القيمة الافتراضية `Warning`. لا يُنشأ حدث `NegativeStockPolicyChanged` ضمن هذا القرار.

**Capability Guard** يتحقق: هل الـ Capability ID المطلوب (مثال: `PAY.RunPayroll`) مُفعَّل لهذا الـ Tenant؟ لو لا → رفض صريح (RFC-003 §10 Rule 5)، وليس نتيجة فارغة صامتة.

---

## 7. Frontend Architecture

### 7.1 التنظيم Feature-First

```
apps/web/src/
├── features/
│   ├── sales/
│   │   ├── components/     # مكوّنات خاصة بهذا الـ Feature فقط
│   │   ├── hooks/           # React Query hooks (useCreateOrder, useCompleteSale...)
│   │   ├── api/              # دوال استدعاء الـ API، مُتحقَّقة بـ Zod من domain-contracts
│   │   └── routes/           # صفحات هذا الـ Feature
│   ├── inventory/
│   ├── menu/
│   └── ... (بنفس أسماء الـ 13 دومين)
├── shared/
│   ├── ui/                    # إعادة تصدير من packages/ui
│   ├── layouts/               # تخطيطات لكل دور (Cafe Owner, Cashier, Kitchen...)
│   └── hooks/                 # Hooks عامة (useAuth, useTenant...)
└── app/
    ├── routes.tsx              # تعريف الراوتينج الكلي
    └── providers.tsx            # React Query Provider, i18n Provider...
```

### 7.2 State Management — قاعدة واحدة واضحة

| نوع الحالة | الأداة | مثال |
|---|---|---|
| **بيانات من السيرفر** (أي شيء جاي من API) | **React Query حصريًا** | قائمة الطلبات، رصيد المخزون، كشف الرواتب |
| **حالة UI محلية بحتة** | **Zustand أو useState محلي** | فتح/قفل Modal، Tab نشط |
| **لا يوجد Global State Store للبيانات التجارية** | — | ممنوع تخزين نسخة من بيانات السيرفر في Zustand/Redux — React Query هو الـ Cache الوحيد |

### 7.3 الراوتينج

مسارات مُهيكَلة حسب الدور الوظيفي أولًا (تطابق Dashboards في Domain-Reporting.md §12)، ثم حسب الـ Feature:
```
/pos/*          → Cashier
/kitchen/*      → Kitchen Manager
/manager/*      → Branch Manager
/owner/*        → Cafe Owner (Executive Dashboard)
/accounting/*   → Accountant
/hr/*           → HR
```

### 7.4 طبقة الـ API والتحقق من الـ Capabilities في الواجهة

كل استدعاء API يمر بدالة `apiClient` موحَّدة تتحقق تلقائيًا من استجابة `403` (Capability/Permission مرفوضة) وتعرض حالة UI مناسبة. **عناصر الواجهة نفسها (أزرار، قوائم تنقل) تُخفى بناءً على الـ Capabilities المُفعَّلة للـ Tenant** (مُستلَمة عند تسجيل الدخول) — تطبيق مباشر لـ RFC-003 §10 Rule 4.

---

## 8. Coding Standards

| المبدأ | التطبيق العملي هنا |
|---|---|
| **Clean Architecture** | الطبقات الأربع في القسم 6.1 — الاعتماد يتجه للداخل دائمًا (API→Application→Domain، لا العكس) |
| **SOLID** | Single Responsibility: كل Use Case يفعل شيئًا واحدًا؛ Dependency Inversion: Domain Layer يعتمد على Interfaces (`IStockRepository`) لا تطبيقات مباشرة |
| **DRY** | `packages/domain-contracts` هو الحل الأساسي — لا تعريف Schema مرتين |
| **KISS / YAGNI** | لا Event Sourcing كامل، لا Redux، لا Microservices — القرار الأبسط اللي يفي بالغرض الموثَّق فعليًا |
| **DDD** | كل Domain Document هو المصدر المباشر لكود الـ Domain Layer — لا "تفسير" إضافي |
| **EDA** | القسم 3.2/6.4 |
| **Naming Conventions** | ملفات المكوّنات: `PascalCase.tsx`؛ الدوال/المتغيرات: `camelCase`؛ الأحداث والـ Capability IDs: **بنفس الاسم الحرفي من RFC-002/003، بدون ترجمة** |
| **File Size Limits** | حد إرشادي ~300 سطر لكل ملف — تجاوزه إشارة لضرورة تقسيم المسؤولية |
| **Error Handling** | كل Application Layer Use Case يُرجِع `Result<T, DomainError>` صريح بدل استثناءات غير متوقَّعة؛ رسائل الخطأ للمستخدم دائمًا مُترجَمة (ثنائية اللغة) |
| **Logging** | JSON مُهيكَل، يحمل `tenantId` و`correlationId` لكل طلب؛ **ممنوع تسجيل أي بيانات حساسة** (رواتب، بيانات دفع) في الـ Logs |
| **Testing Strategy** | هرم اختبارات: وحدة (Domain Layer، الأغلبية) → تكامل (Application + DB) → E2E (سيناريوهات كاملة عبر دومينز، عدد قليل ومُركَّز) |

---

## 9. Refactoring Standards

**المرجع الرسمي: Martin Fowler — Refactoring: Improving the Design of Existing Code.** هذا القسم فلسفة حاكمة، وليس تفاصيل تنفيذية أو كتالوج تقنيات (Fowler نفسه يوثِّق التقنيات التفصيلية — Extract Function، Extract Class، Replace Conditional with Polymorphism، وغيرها؛ هذه الوثيقة تُثبِّت *متى ولماذا* نستخدمها، لا *كيف* بالتفصيل).

### 9.1 تعريف Fowler الدقيق لـ Refactoring (يُطبَّق حرفيًا)

> "تغيير البنية الداخلية للكود دون تغيير سلوكه الخارجي الملحوظ."

**هذا التعريف قيد صارم:** أي تعديل يمس أي Business Rule موثَّق في أي Domain Document **ليس Refactoring** — هو تعديل معماري يحتاج مراجعة الـ Domain Document نفسه أولًا (نفس قاعدة القسم 11 Rule 9).

### 9.2 القبعتان (Two Hats) — مبدأ Fowler المحوري

Fowler يُميِّز بين قبعتين لا تُلبَسان معًا في نفس اللحظة:
- **قبعة "إضافة وظيفة"**: الكود يعمل بسلوك جديد، لا تلمس البنية أكثر من اللازم.
- **قبعة "Refactoring"**: البنية تتحسَّن، السلوك الخارجي **لا يتغيّر حرفًا واحدًا** — لا اختبار يفشل، ولا ينجح اختبار جديد.

**القاعدة العملية لأي AI Agent هنا:** لا تُبدِّل القبعتين في نفس الـ Commit. Commit "Refactor" نظيف يعني: كل الاختبارات القديمة لسه بتعدي بنفس النتائج بالظبط، بدون إضافة اختبار جديد لسلوك جديد.

### 9.3 دورة العمل الموصى بها (Red → Green → Refactor)

1. **Red**: اختبار يفشل يُثبِت الحاجة الجديدة (أو يُثبِت أن شبكة الأمان موجودة قبل التنظيف).
2. **Green**: أبسط تنفيذ يُنجِح الاختبار، حتى لو البنية مش مثالية بعد.
3. **Refactor**: تنظيف البنية الآن، والاختبارات (من خطوة Red/Green) هي شبكة الأمان التي تُثبِت عدم كسر أي سلوك.

### 9.4 متى نُنظِّف (Code Smells كإشارة، لا كقائمة جامدة)

Fowler يربط قرار التنظيف بـ **"روائح الكود" (Code Smells)** — إشارات تستدعي الانتباه، وليست أخطاءً بحد ذاتها: تكرار (Duplicated Code)، دالة طويلة جدًا، فئة تعرف عن دومين آخر أكثر مما يجب (خرق مباشر لقاعدة القسم 5)، تعليقات تُعوِّض عن كود غير واضح. **Rule of Three** (Fowler/Beck): أول مرة تنفّذ، ثاني مرة تكرر بضيق، ثالث مرة تُنظِّف.

### 9.5 خطوات صغيرة، قابلة للتراجع دائمًا

لا Refactoring ضخم دفعة واحدة (Big Bang) لأي Domain — كل خطوة صغيرة كفاية إن أمكن تشغيل الاختبارات بعدها مباشرة والتأكد من عدم الكسر. هذا هو جوهر منهج Fowler: **Refactoring آمن لأنه تراكمي، لا لأنه دقيق في التخطيط المسبق.**

### 9.6 قاعدة AI Agent الخاصة

**دائمًا Refactor قبل إضافة تعقيد** (القسم 11 Rule 4) يعني عمليًا: لو إضافة ميزة جديدة تتطلب "لَيّ" بنية موجودة بشكل غير طبيعي، الأولوية Refactor أولًا (بقبعته المنفصلة، Commit منفصل)، ثم إضافة الميزة (بقبعتها، Commit منفصل) — لا Commit واحد يخلط الاثنين.

---

## 10. Design System Foundation

> هذا **ليس** وثيقة Design System كاملة — فقط القواعد المعمارية الملزمة لأي UI.

| المبدأ | القاعدة |
|---|---|
| **Design Tokens** | كل الألوان/المسافات/الخطوط مُعرَّفة كـ CSS Variables في `packages/ui`، تُستهلَك عبر Tailwind Config — لا قيم "Magic Numbers" في أي مكوّن |
| **Component Consistency** | كل مكوّن UI متكرر (زر، حقل، جدول) له نسخة واحدة فقط في `packages/ui` — لا إعادة تنفيذ محلي داخل أي Feature |
| **Accessibility** | WCAG AA كحد أدنى؛ shadcn/ui (مبني على Radix) يوفر هذا افتراضيًا — لا تجاوز هذا الأساس بأي تخصيص |
| **Responsive-first** | Mobile-first دائمًا (خصوصًا Attendance عبر الموبايل، وPOS على أجهزة Tablet) |
| **Typography Hierarchy** | مقياس ثابت محدود (مثال: 5-6 أحجام فقط) — لا أحجام خط عشوائية |
| **Spacing System** | مقياس 4px/8px الأساسي (متوافق مع Tailwind الافتراضي) — لا Padding/Margin عشوائي |
| **Color Philosophy** | ألوان دلالية ثابتة (Success/Warning/Error/Info) تُستخدَم بنفس المعنى عبر كل الشاشات (مثال: أحمر لأي `AttendanceException` أو `NegativeStockPolicy=Strict` تنبيه) |
| **Dashboard Readability** | كثافة بيانات عالية لكن قابلة للمسح البصري السريع (تخدم KPIs من Domain-Reporting.md) — لا أكثر من 6-8 مؤشرات رئيسية في أي لوحة واحدة (نفس مبدأ Executive Summary) |
| **Forms** | React Hook Form + Zod دائمًا — نفس نمط رسائل الخطأ وحالة التحميل عبر كل نموذج |
| **Tables** | مكوّن جدول موحَّد (Pagination, Sorting, Filtering) — يُستخدَم لكل قائمة بيانات (طلبات، مخزون، موظفين...) |
| **Empty States** | كل شاشة قائمة فارغة تعرض رسالة واضحة + إجراء مقترح (مثال: "لا توجد أوامر شراء بعد → إنشاء أمر جديد") |
| **Error States** | رسائل خطأ ثنائية اللغة دائمًا، بدون رموز تقنية خام (Stack Traces) تظهر للمستخدم النهائي |

---

## 11. AI Development Rules

هذه القواعد **إلزامية** لأي AI Agent (Claude Code، Lovable، أو غيره) يعمل على هذا الكود:

1. **لا تخالف حدود الدومين أبدًا.** لو الكود محتاج بيانات من دومين تاني، الحل الوحيد: Read Model محلي مبني من الأحداث — مش استدعاء مباشر، ومش JOIN مباشر على جدول تاني.
2. **لا تُكرِّر منطق العمل.** لو قاعدة عمل موجودة في Domain Document، بتتنفذ **مرة واحدة** في الـ Domain Layer بتاع صاحبها. أي مكان تاني محتاجها بيستهلكها كحدث أو Read Model، مش بيعيد كتابتها.
3. **لا تتجاوز الأحداث (Events).** أي تأثير على دومين تاني **يجب** يمر عبر Outbox + Event Bus — لا استدعاء دالة مباشر عبر حدود الـ Module.
4. **دائمًا Refactor قبل إضافة تعقيد.** لو المهمة الجديدة صعب تتنفذ نظيف في البنية الحالية، الأولوية تنظيف البنية أولًا (القسم 9).
5. **دائمًا اتبع الـ RFCs حرفيًا.** أسماء الأحداث، الحقول، الـ Capability IDs — **بالحرف** زي RFC-002/003، بدون أي "تحسين" أو إعادة تسمية.
6. **دائمًا احافظ على قرارات الـ ADR.** أي ADR معتمد في Product Bible هو قيد ثابت، مش اقتراح.
7. **فضِّل التركيب (Composition) على التكرار (Duplication) دائمًا.**
8. **لو اكتشفت تعارضًا بين الكود المطلوب وأي RFC موجود — توقف واسأل، متفترضش.** هذا امتداد مباشر لقاعدة "Stop and report" المُتبَعة طول Phase 1.
9. **لو المهمة تتطلب قاعدة عمل جديدة فعليًا** (مش تفصيل تنفيذي) — التوقف، واقتراح تحديث الـ Domain Document المعني أولًا، قبل كتابة أي كود يطبّقها.

---

## 12. Git Repository Standards

| الجانب | القاعدة |
|---|---|
| **استراتيجية الفروع** | Trunk-based مع فروع قصيرة العمر (`feature/{domain}-{short-description}`) — يناسب فريقًا صغيرًا وسرعة التنفيذ (Product Bible: Speed over Enterprise Deployment) |
| **رسائل الـ Commit** | Conventional Commits + نطاق الدومين: `feat(inventory): add stock count finalization`، `fix(payroll): correct advance repayment calculation` |
| **قواعد الـ Pull Request** | PR صغير ومركَّز على دومين واحد؛ يذكر رقم قسم الـ Domain Document/RFC ذي الصلة في الوصف؛ يمر عبر CI (اختبارات + Lint) قبل الدمج |
| **الإصدارات (Versioning)** | SemVer لـ `packages/domain-contracts` تحديدًا (لأنه مُشترَك)؛ التطبيق نفسه بإصدارات مبنية على التاريخ (Continuous Deployment، لا حاجة لـ SemVer تقليدي لـ SaaS) |
| **توقعات المراجعة** | Checklist ثابت: هل احترم حدود الدومين؟ هل فيه اختبارات؟ هل فيه استدعاء مباشر ممنوع بين Modules؟ هل الـ Capability Gating موجود؟ |

---

## 13. Implementation Roadmap

الترتيب المقترح بعد اعتماد RFC-004:

1. **Repository Bootstrap** — إنشاء بنية Monorepo (القسم 4)، إعداد `packages/domain-contracts` بكل الـ Zod Schemas من RFC-002/003 كخطوة أولى قبل أي كود دومين.
2. **GitHub** — إعداد الـ Repo، الفروع، قواعد الحماية (Branch Protection)، CI الأساسي.
3. **Supabase** — إنشاء المشروع، أول Migration (`event_outbox` + جداول Platform Domains: Auth/Tenants/Branches)، إعداد RLS الأساسي.
4. **Claude Code** — بناء الدومينز الخلفية (Backend) **بترتيب System Freeze v1** (Sales → Order Fulfillment → Shift Management → Menu → Inventory → ... حتى Reporting)، دومين كامل (4 طبقات) قبل الانتقال للتالي.
5. **Lovable** — بناء واجهات الـ Frontend لكل دومين مكتمل خلفيًا، بالتوازي مع تقدُّم Claude Code.
6. **Testing** — اختبارات وحدة مع كل Domain Layer (فوري)، اختبارات E2E للسيناريوهات الحرجة (بعد اكتمال دورة تشغيلية كاملة، أول ما Sales+Inventory+Order Fulfillment تشتغل معًا).
7. **Deployment** — بيئة Staging أولًا، اختبار قبول كامل مقابل الـ Domain Documents، ثم Production.

---

## 14. Software Architecture Decisions (SA-ADR) — سجل منفصل عن ADRs العمل

> هذه قرارات **معمارية بحتة** (أنماط وحدود، وليست اختيارات أدوات محدَّدة) اتخذتها هذه الوثيقة، منفصلة عن ADRs العمل في Product Bible (لا تُعدِّل أيًا منها). كل قرار هنا يُفرِّق بين **"ما هو الالتزام المعماري"** (ثابت، يحكم الكود) و**"ما هي الأداة/الآلية التي تُحقِّقه اليوم"** (تفصيل بنية تحتية، قابل للتغيير بحرية دون نقض القرار نفسه — يُوثَّق في وثيقة Infrastructure مستقبلية منفصلة عن RFC-004).

| # | الالتزام المعماري (ثابت) | الآلية الحالية المُقترَحة (قابلة للتغيير، بنية تحتية) | الحالة |
|---|---|---|---|
| **SA-ADR-01** | **Backend Execution Independence:** منطق العمل (الطبقات الأربع، القسم 6) لا يفترض بيئة تشغيل مُحدَّدة — يجب أن يعمل بلا تعديل سواء استُضيف كدوال بلا حالة (Stateless Functions) أو كخدمة دائمة (Persistent Service) | دوال بلا حالة (Serverless) كخطوة أولى — تقلل البنية التحتية المطلوبة، تتماشى مع "سرعة التنفيذ" (Product Bible)؛ الانتقال لخدمة دائمة قرار بنية تحتية بحت لاحقًا لو قيود التنفيذ (مثل حدود زمن التنفيذ) أصبحت مشكلة فعلية | معتمد |
| **SA-ADR-02** | **Guaranteed Ordered Event Delivery عبر Outbox:** أي حدث في RFC-002 يُنشَر عبر Transactional Outbox (القسم 3.2)، لا استدعاء مباشر متزامن بين الدومينز تحت أي ظرف | آلية "تفريغ" الـ Outbox الفعلية (جدولة زمنية، استهلاك طابور، أو غيرها) تُختار لاحقًا بمعزل تام عن هذا الالتزام | معتمد |
| **SA-ADR-03** | **Schema-First Shared Contract:** شكل كل Event وCapability ID يُعرَّف **مرة واحدة** (`packages/domain-contracts`)، ويُشتَق منه كل من التحقق (Validation) في الـ Backend واستنتاج الأنواع (Types) في الـ Frontend — لا تعريف مزدوج لنفس الشكل بأي أداة | REST كأسلوب نقل حاليًا (الأبسط لهذا النمط)؛ اختيار بروتوكول النقل نفسه (REST/GraphQL/RPC) منفصل عن التزام "مصدر واحد للعقد" | معتمد |
| **SA-ADR-04** | **Command/Query Separation دون Event Sourcing كامل:** جهة الكتابة (تفرض Business Rules) منفصلة تمامًا عن جهة القراءة (Read Models/Projections)، لكن **لا** إعادة بناء الحالة بالكامل من الأحداث في كل قراءة — قرار نطاق (Scope)، وليس اختيار أداة | — (هذا القرار نفسه هو الآلية، لا أداة إضافية تحتاجه) | معتمد |
| **SA-ADR-05** | **حدود ملكية حالة السيرفر في الـ Frontend:** نسخة واحدة فقط من أي بيانات قادمة من الـ Backend تُخزَّن في الذاكرة (Single Server-State Cache) — لا تكرار لنفس البيانات في أداتين مختلفتين للحالة | React Query كتطبيق حالي لهذا الالتزام؛ أي حالة UI بحتة (لا تمثِّل بيانات سيرفر) تُدار بأداة منفصلة تمامًا لتجنّب الخلط | معتمد |
| **SA-ADR-06** | **Domain-Neutral Tenant Configuration Port:** الدومينز لا تستورد Platform للحصول على إعدادات Tenant. Shared يعرّف `ITenantConfigurationPort` محايدًا، وكل Domain يملك outbound port الخاص بحاجته؛ Sales يملك `INegativeStockPolicyProvider` في Application ويعطي Domain القيمة المحلولة فقط | Platform Infrastructure ينفّذ الـ shared port، وSales Infrastructure يكيّفه إلى port الخاص بـSales، والـComposition Root يربط التنفيذات فقط | معتمد |

---

## 15. Validation

راجعت هذه الوثيقة مقابل Product Bible وRFC-001/002/003 وMaster-System-Flow. **لا تعارض مُكتشَف.** يحتوي السجل على **6 SA-ADRs معتمدة**؛ أُضيف SA-ADR-06 عبر Issue #2 وفق RFC-005 Engineering Decision Process.

---

*نهاية RFC-004 — Software Architecture المعتمدة.*
