# Domain Document: CRM

**Type:** Domain Document
**Domain Classification:** Core Business Domain (Cafe Engine) — Customer Relationship & Engagement
**Depends on:** RFC-001 (Context Map), RFC-002 (Event Catalog), System Freeze v1, Master-System-Flow.md
**Reference Template:** Domain-Sales.md, Domain-Menu.md, Domain-Inventory.md, Domain-Suppliers-Business-Accounts.md, Domain-Purchasing.md, Domain-Order-Fulfillment.md
**Status:** Draft v1

---

## 1. Domain Purpose

إدارة علاقة الكافيه بعملائه: هويتهم الأساسية، تاريخ تعاملهم، برامج الولاء والعروض الترويجية (Phase 2)، والتحليلات الخاصة بسلوكهم كعملاء. CRM **لا يملك أي معاملة مالية أو مبيعات** — هو مستهلك لأحداث Sales لبناء صورة العميل، وليس مصدرًا لأي قرار مالي.

---

## 2. Responsibilities

- إدارة سجلات العملاء الأساسية (Customer Master Data)
- تسجيل تاريخ الشراء لكل عميل (بالاستماع لأحداث Sales)
- اقتراح أهلية الخصومات بناءً على قواعد الولاء أو سلوك الشراء (اقتراح فقط، وليس قرارًا)
- إدارة برامج الولاء والنقاط (Phase 2)
- إدارة الحملات والعروض الترويجية (Phase 2/3)
- توفير تحليلات سلوك العملاء (تكرار الزيارة، متوسط الإنفاق...) كمدخل لـ Reporting

---

## 3. Out of Scope

| المفهوم | لماذا خارج النطاق | من يملكه |
|---------|---------------------|----------|
| معاملات البيع نفسها (Sale، Order) | CRM يستهلك `SaleCompleted` فقط لتحديث سجل العميل، لا يُنشئ أو يُعدّل أي معاملة | Sales |
| تطبيق الخصم فعليًا | CRM يقترح الأهلية فقط عبر `DiscountEligibilityFlagged`؛ القرار النهائي دائمًا لـ Sales | Sales |
| أي سجل مالي (فاتورة، رصيد، دفعة) | لا علاقة لـ CRM بأي التزام مالي — لا تجاه العميل ولا تجاه أي طرف آخر | Sales / Suppliers & Business Accounts |
| بيانات الموظف (حتى لو كان "عميلًا" لبرنامج ولاء داخلي مستقبلًا) | خارج النطاق تمامًا في MVP | Staff |
| قنوات التواصل الفعلية (إرسال SMS/WhatsApp فعليًا) | CRM يُقرِّر "من يُرسَل له ماذا"، لكن الإرسال الفعلي عبر قناة خارجية مسؤولية منفصلة | Notifications (Phase 3: Communication Hub) |

---

## 4. Business Concepts

| المفهوم | التعريف |
|---------|---------|
| **Customer** | سجل أساسي لعميل: الاسم، بيانات التواصل (اختيارية)، تاريخ التسجيل |
| **CustomerPurchaseHistory** | سجل تراكمي لكل معاملات الشراء المرتبطة بعميل معيّن، مبني بالكامل من أحداث `SaleCompleted` المُستهلَكة — CRM لا يُعيد حساب أو يُعدّل أي رقم مالي فيه، فقط يعكس ما وصله |
| **DiscountEligibilityRule** | قاعدة داخلية تُحدِّد متى يُعتبَر عميل مؤهَّلًا لخصم (مثال: بعد 10 زيارات، أو إنفاق تراكمي معيّن) |
| **LoyaltyAccount** *(Phase 2)* | رصيد نقاط ولاء متراكم لعميل، يُكتسَب من الشراء ويُستهلَك في مكافآت |
| **Campaign** *(Phase 2/3)* | حملة ترويجية موجَّهة لشريحة عملاء معيّنة |

---

## 5. Business Rules

1. **CRM لا يُنشئ أو يُعدّل أي رقم مالي.** كل بيانات `CustomerPurchaseHistory` مُشتقة حصريًا من أحداث `SaleCompleted` المُستهلَكة — لا إدخال يدوي لمبالغ شراء تاريخية.
2. `DiscountEligibilityFlagged` **اقتراح استشاري فقط** — Sales وحدها من تقرر التطبيق أو الرفض النهائي (مبدأ مُثبَّت منذ Domain-Sales.md، لا تغيير هنا).
3. لا يجوز إنشاء سجل عميل مكرر بنفس بيانات التعريف الأساسية (رقم هاتف/معرّف) داخل نفس الـ Tenant.
4. عميل غير مسجَّل (Guest/Walk-in) **يمكن أن تكتمل معاملة بيع من أجله دون أي سجل CRM** — `customerId` في `SaleCompleted` اختياري بالفعل (موثَّق في RFC-002 §4.2)؛ CRM لا يفرض وجود عميل مسجَّل كشرط لإتمام أي بيع.
5. قواعد أهلية الخصم (`DiscountEligibilityRule`) تُقيَّم فقط عند وجود `customerId` معروف مرتبط بعملية بيع جارية — لا تقييم لعملاء Guest.
6. نقاط الولاء (`LoyaltyAccount`, Phase 2) تُكتسَب فقط من معاملات `SaleCompleted` فعلية، ولا تتأثر بمعاملات مُسترجَعة بالكامل عبر `SaleRefunded` — يجب عكس النقاط المكتسبة بما يتناسب مع الجزء المُسترجَع (تفصيل التنفيذ يُترك لـ Phase 2).

---

## 6. Use Cases / Business Flows

### 6.1 تسجيل عميل جديد

1. الكاشير أو العميل نفسه (عبر واجهة مستقبلية) يُسجِّل بيانات أساسية.
2. CRM يتحقق من عدم وجود تكرار (Business Rule #3).
3. تُنشر `CustomerCreated`.

### 6.2 تحديث تاريخ الشراء تلقائيًا بعد كل بيع

1. Sales تُكمِل معاملة بيع مرتبطة بعميل مسجَّل (`customerId` موجود في `SaleCompleted`).
2. CRM يستهلك الحدث ويُضيف سجلًا جديدًا لـ `CustomerPurchaseHistory` الخاص بهذا العميل.
3. لا تعديل على أي بيانات مالية — فقط انعكاس لما وصل من Sales.

### 6.3 اقتراح خصم بناءً على سلوك الشراء

1. عميل مسجَّل يصل لعتبة معيّنة (مثال: عاشر زيارة) بناءً على `CustomerPurchaseHistory` المُحدَّث.
2. CRM يُقيِّم `DiscountEligibilityRule` المطابقة.
3. عند الاستيفاء: تُنشر `DiscountEligibilityFlagged` — Sales تعرضها كخيار للكاشير، دون أي إلزام.

### 6.4 بيع لعميل غير مسجَّل (Guest)

1. عملية بيع كاملة تتم دون أي `customerId`.
2. CRM لا يستقبل أي حدث خاص بهذه المعاملة تحديدًا من منظور "عميل" (لأن `SaleCompleted` هنا لا يحمل `customerId`)، رغم أن نفس الحدث يصل لـ Reporting بشكل طبيعي لأغراض أخرى.
3. لا يوجد أي أثر على CRM — سلوك متوقَّع وليس استثناءً يحتاج معالجة خاصة.

---

## 7. Aggregate Roots & Entities

| الكيان | النوع | ملاحظات |
|--------|-------|---------|
| **Customer** | Aggregate Root | يضبط بياناته الأساسية وحالته فقط |
| CustomerPurchaseHistory | Entity (جزء من Customer Aggregate، أو Read Model منفصل حسب قرار التنفيذ) | Immutable — كل سجل يعكس معاملة ماضية بالضبط كما وصلت من Sales، لا تعديل رجعي |
| DiscountEligibilityRule | Entity مستقل (Master Data) | تُدار مركزيًا، تُطبَّق على كل العملاء المؤهَّلين |
| LoyaltyAccount *(Phase 2)* | Aggregate Root مستقل | مرتبط بـ Customer عبر مرجع، وليس جزءًا من نفس الـ Aggregate (يسمح بتطور مستقل لبرنامج الولاء لاحقًا) |

---

## 8. Published Events

(تفاصيل كاملة موثّقة في RFC-002 §10 — هنا فقط قائمة مرجعية، **بدون أي إضافة جديدة**)

| الحدث | متى |
|-------|-----|
| `CustomerCreated` | عند تسجيل عميل جديد |
| `DiscountEligibilityFlagged` | عند استيفاء عميل مسجَّل لقاعدة أهلية خصم |

> **لا يوجد أي حدث جديد مُقتَرَح في هذه الوثيقة.** كل الأحداث أعلاه موثَّقة بالفعل في RFC-002 قبل كتابة هذا الـ Domain Document.

---

## 9. Consumed Events

| الحدث | من | كيف يُستخدَم داخل CRM |
|-------|-----|---------------------------|
| `SaleCompleted` | Sales | يُحدِّث `CustomerPurchaseHistory` للعميل المرتبط (إن وُجد `customerId`)؛ يُقيَّم أيضًا مقابل `DiscountEligibilityRule` لتحديد الحاجة لنشر `DiscountEligibilityFlagged` مستقبلًا |
| `SaleRefunded` | Sales | يُحدِّث `CustomerPurchaseHistory` بعكس الأثر (وBusiness Rule #6 بخصوص نقاط الولاء في Phase 2) |

---

## 10. Permissions

| الصلاحية (Atomic) | الوصف |
|---------------------|-------|
| `CRM.View` | استعراض بيانات العملاء وتاريخ شرائهم |
| `CRM.Manage` | إنشاء/تعديل بيانات عميل |
| `CRM.ManageDiscountRules` | إدارة قواعد أهلية الخصم |
| `CRM.ManageLoyalty` *(Phase 2)* | إدارة برنامج الولاء والنقاط |

---

## 11. Data Model

> **ملاحظة معمارية:** مستوى عالٍ فقط (High-Level Schema Direction)، اتساقًا مع باقي Domain Documents.

جداول مرشحة (اتجاه عام فقط):
- `customers` (tenant_id, name, contact_info?, created_at, ...)
- `customer_purchase_history` (customer_id, sale_id, total_amount, purchased_at, ...) — Read-only reflection من Sales
- `discount_eligibility_rules` (tenant_id, rule_type, threshold, discount_value, ...)
- `loyalty_accounts` *(Phase 2)* (customer_id, points_balance, ...)

كل الجداول تحمل `tenant_id` إلزاميًا وفق سياسة RLS المُقرَّرة في Product Bible.

---

## 12. Public APIs

> **ملاحظة:** تصميم الـ API التفصيلي يُؤجَّل لوثيقة API Design منفصلة. هنا فقط قائمة القدرات المتوقعة:

- إنشاء/تعديل/استعلام عن سجل عميل
- استعراض تاريخ شراء عميل معيّن
- إدارة قواعد أهلية الخصم
- استعلام عن العملاء المؤهَّلين لعرض معيّن (لأغراض تحليلية/تسويقية)

---

## 13. Future Extensions

- **Loyalty Program الكامل (Phase 2):** نقاط، مكافآت، مستويات عضوية — مذكور بالفعل في Product Bible كـ Phase 2 Must-Have التالي.
- **Campaign Management (Phase 3):** حملات ترويجية موجَّهة، مرتبطة بـ Communication Hub (WhatsApp/Email/SMS) المذكور في Product Bible Phase 3.
- **Customer Segmentation:** تصنيف العملاء آليًا (VIP، متكرر، خامل...) بناءً على `CustomerPurchaseHistory` — يخدم AI-Readiness المذكور في Product Bible دون الحاجة لأي بنية AI فعلية في MVP.
- **Guest-to-Registered Linking:** ربط معاملات Guest سابقة بعميل يُسجِّل لاحقًا (مطابقة برقم هاتف مثلًا) — غير مدعوم في MVP (راجع Use Case 6.4).
- **Refund Impact on Loyalty Points (تفصيل التنفيذ):** آلية دقيقة لعكس نقاط الولاء عند استرجاع جزئي، مذكورة كمبدأ في Business Rule #6 لكن التفاصيل الحسابية تحتاج تصميمًا إضافيًا عند تفعيل Phase 2.

---

## 14. Commercial Packaging Recommendation

> ملاحظة: هذه التوصية معلوماتية بحتة، وليست قيدًا معماريًا (راجع RFC-003). تغييرها لا يتطلب أي تعديل على تصميم هذا الدومين.

**Capability: بيانات العملاء الأساسية**
Capability ID: `CRM.Customer`
Recommended Packaging: Starter ❌ | Growth ✅ | Professional ✅ | Enterprise ✅

**Capability: قواعد أهلية الخصم**
Capability ID: `CRM.DiscountRules`
Recommended Packaging: Starter ❌ | Growth ✅ | Professional ✅ | Enterprise ✅

**Capability: برنامج الولاء** *(Phase 2)*
Capability ID: `CRM.Loyalty`
Recommended Packaging: Starter ❌ | Growth ❌ | Professional ✅ | Enterprise ✅

**Capability: التسويق والحملات** *(Phase 3)*
Capability ID: `CRM.Marketing`
Recommended Packaging: Starter ❌ | Growth ❌ | Professional ❌ | Enterprise ✅

---

*نهاية Domain Document: CRM — v1.*
