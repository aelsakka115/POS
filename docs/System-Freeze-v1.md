# System Freeze v1 — Cafe Engine Operational Core

**Type:** Architecture Freeze Record
**Status:** **FROZEN**
**Covers:** RFC-001, RFC-002, وجميع Domain Documents المعتمدة حتى تاريخه
**Scope:** الدورة التشغيلية الكاملة الأولى للكافيه (Setup → Sale → Fulfillment → Inventory Deduction → Reporting Hooks)

> **Deployment addendum (Issue #5):** تجميد قواعد العمل أدناه لا يتغير، لكن الدورة التشغيلية نفسها يجب أن تعمل على Branch Edge عبر LAN لأيام دون Internet، ثم تتزامن مع Cloud وفق RFC-006. Edge/Sync بنية تحتية ولا تغيّر ملكية أي Domain أو Event من هذا الـFreeze.

---

## 1. الغرض من هذه الوثيقة

تثبيت **الحالة النهائية والمُعتمَدة** لكل الدومينز والأحداث والقواعد التي بُنيت حتى الآن، بعد اجتيازها **جولتين تحقق مستقلتين**:

1. **End-to-End Walkthrough** (سيناريو تشغيلي كامل، 18 خطوة) — كشف 5 فجوات، جميعها سُدَّت.
2. **System Freeze v1 Deep Validation Pass** (سيناريوهات Edge Cases مستهدفة) — كشف 4 فجوات إضافية، جميعها سُدَّت.

أي تعديل على أي مفهوم أو قاعدة أو حدث موثَّق هنا بعد هذا التاريخ **يجب أن يُعامَل كـ Breaking Change** يتطلب RFC تعديل صريح، وليس تعديلًا هامشيًا.

---

## 2. الدومينز المُجمَّدة (9 من أصل 13)

| # | Domain | التصنيف | الحالة |
|---|--------|---------|--------|
| 1 | Sales | Core Business | ✅ Frozen |
| 2 | Order Fulfillment | Core Business | ✅ Frozen |
| 3 | Shift Management | Core Business | ✅ Frozen (حدود فقط، لا Domain Document كامل — بقرار مسبق) |
| 4 | Menu | Core Business | ✅ Frozen |
| 5 | Inventory | Core Business | ✅ Frozen |
| 6 | Suppliers & Business Accounts | Core Business | ✅ Frozen |
| 7 | Purchasing | Core Business | ✅ Frozen |
| — | CRM | Core Business | ⏳ لم يبدأ بعد |
| — | Staff | Core Business | ⏳ لم يبدأ بعد |
| — | Attendance | Core Business | ⏳ لم يبدأ بعد |
| — | Expenses | Core Business | ⏳ لم يبدأ بعد |
| — | Payroll | Core Business (Phase 2) | ⏳ مؤجَّل |
| — | Reporting | Core Business | ⏳ لم يبدأ بعد (يستهلك من الجميع) |

---

## 3. سجل الفجوات المكتشفة والمُغلَقة (Gap Closure Log)

### من End-to-End Walkthrough

| # | الفجوة | الحل النهائي |
|---|--------|--------------|
| W1 | لا ربط صريح بين Order وSale | كيانان منفصلان؛ Sale تحمل `orderId` كمرجع صريح (يسمح بـ Split Payments/Table Transfer مستقبلًا) |
| W2 | لا يوجد حدث `StockItemCreated` | أُضيف + Menu وPurchasing يحتفظان بـ Read Model محلي |
| W3 | `OrderPlaced` بلا شرط شيفت مفتوح | نفس شرط `SaleCompleted` طُبِّق من اللحظة الأولى |
| W4 | تسمية `POS.CreateSale` غير دقيقة | أُعيدت التسمية لـ `POS.CreateOrder` |
| W5 | ترتيب الأحداث افتراض غير موثَّق | قاعدة صريحة: Event Bus يضمن ترتيبًا حتميًا محليًا؛ وبعد RFC-006 يحافظ Sync على Per-Origin ordering بـ`originSequence` دون ادعاء ترتيب كلي بين الفروع |

### من System Freeze v1 Deep Validation Pass

| # | الفجوة | الحل النهائي |
|---|--------|--------------|
| F1 | `SupplierDeactivated` بقرار معلَّق بخصوص أوامر الشراء المفتوحة | أوامر الشراء المفتوحة تبقى سارية بالكامل؛ التعطيل يمنع أوامر جديدة فقط |
| F2 | استرجاع مخزون عند Refund يعتمد على "سياسة فرع" غير معرَّفة | استُبدلت بـ `disposition` Enum لكل بند مرتجع على حدة (`Restock`/`Discard`/`InspectionRequired`) |
| F3 | **(حرجة)** `NegativeStockPolicy=Strict` مستحيلة التنفيذ بعد إتمام معاملة مالية | نظام دفاعي بطبقتين: Sales تمنع استباقيًا عبر `ItemAvailabilityChanged` (Eventually Consistent)؛ Inventory Backstop نهائي بتصعيد Critical للحالات النادرة |
| F4 | قفل شيفت لا يتحقق من طلبات مفتوحة | Shift Management يستمع لأحداث Sales/Order Fulfillment ويحتفظ بعدّاد محلي يمنع `ShiftClosed` طالما العدّاد > صفر |

**إجمالي: 9 فجوات مكتشَفة، 9 مُغلَقة. لا توجد فجوة معلَّقة حاليًا.**

---

## 4. القرارات المعمارية الحاكمة (مُثبَّتة نهائيًا)

هذه المبادئ حُكمت عبر التجربة الفعلية (وليس فقط التصميم النظري) وأثبتت اتساقها:

1. **Cross-domain = Events فقط، لا استدعاءات مباشرة** — صمد حتى في أصعب حالة اختبار (Strict Policy)، عبر حل بـ Read Models بدل كسر القاعدة.
2. **Immutability المعاملات المالية** — لا شيء يُلغي `SaleCompleted` بأثر رجعي؛ أي تصحيح يمر عبر `SaleRefunded` صراحة.
3. **Read Models محلية كنمط متكرر** — Sales (Shift, Availability)، Menu (StockItem)، Purchasing (Supplier, StockItem)، Shift Management (Open Orders Counter) — نفس النمط يُعاد استخدامه بدل اختراع حلول مختلفة لكل حالة.
4. **الفصل بين الالتزام المالي والأثر الفعلي** — فاتورة الشراء لا تزيد المخزون؛ فقط `GoodsReceived`. نفس الفلسفة طُبِّقت على الـ Refund (`disposition` لكل بند).
5. **Eventual Consistency كـ Trade-off موثَّق وليس ثغرة مخفية** — أينما وُجد (Availability Read Model)، وُثِّق صراحة بدل الادعاء بضمان مطلق غير موجود فعليًا.

---

## 5. إحصائيات الحالة المُجمَّدة

- **13** Domain مُعرَّف الحدود في RFC-001 (9 مكتملة بالتفصيل، 4 قيد الانتظار)
- **35** Domain Event موثَّق بالكامل في RFC-002 (Publisher/Subscribers/Trigger/Payload/Business Meaning/Preconditions/Idempotency/Classification)
- **7** Domain Documents كاملة بالقالب المعياري 13 قسم
- **25+** ADR مُسجَّلة في Product Bible

---

## 6. ماذا يعني "Frozen" عمليًا؟

- أي Domain Document جديد (CRM، Attendance...) **يستهلك** الأحداث والمفاهيم الموثَّقة هنا كـ "عقد ثابت" — لا يُعاد فتح نقاشها إلا لسبب قاهر.
- أي اكتشاف مستقبلي لفجوة في هذه الدومينز **لا يُصلَح ارتجاليًا** — يُوثَّق كـ RFC تعديل صريح يشير لهذه الوثيقة.
- الدومينز التالية في الترتيب (**CRM** فالباقي) تُبنى بافتراض أن كل ما هنا صحيح ومستقر.

---

*نهاية System Freeze v1. الأساس التشغيلي للـ Cafe Engine مستقر ومعتمد.*

---

## Addendum (بعد التجميد — لا يُعدِّل محتوى الـ Freeze الأصلي)

**تاريخ الإضافة:** بعد إكمال CRM Domain Document.

هذا الملحق **لا يُعيد فتح** أي قرار من التجميد الأصلي أعلاه (القسم 1-6 يبقى كما هو، سجل تاريخي دقيق لحالة النظام وقت التجميد). فقط يُسجِّل تحديثًا لاحقًا مباشرًا:

- **القرار السابق بتأجيل Payroll لـ Phase 2 (مذكور في القسم 2 أعلاه ضمن جدول الدومينز غير المكتملة) أُلغي رسميًا** بعد مراجعة السوق المستهدف. راجع Product Bible ADR-26، RFC-001 §4.12، وDomain-Payroll.md للتفاصيل الكاملة.
- **Attendance وPayroll أصبحا الآن دومينين مكتملين بالتفصيل** (Domain-Attendance.md، Domain-Payroll.md)، بنموذج معماري جديد (Suggested Adjustments) لم يكن موجودًا وقت هذا التجميد.
- **Staff** (كان بلا أي Domain Document وقت هذا التجميد، مذكور فقط كحدود في RFC-001) **اكتمل بالتفصيل** أيضًا (Domain-Staff.md)، وأغلق فجوة `employeeId` كانت موثَّقة صراحة في Attendance وPayroll.
- **Expenses** (كان أيضًا بلا Domain Document وقت هذا التجميد) **اكتمل بالتفصيل** (Domain-Expenses.md)، بنموذج تسجيل مباشر بدون اعتماد، ومسار تصحيح مُتحكَّم به (Immutable + Correction).
- هذا التغيير **لا يمس أي دومين من الـ 7 المُجمَّدة أصلًا** في هذه الوثيقة (Sales, Order Fulfillment, Shift Management, Menu, Inventory, Suppliers & Business Accounts, Purchasing) — لا تعارض معهم.

للحالة الكاملة المُحدَّثة لكل الدومينز، راجع **Master-System-Flow.md** (وثيقة حية يجب تحديثها مع كل دومين جديد، بخلاف هذه الوثيقة التي تبقى سجلًا تاريخيًا لحظيًا).
