# RFC-002: Cafe Engine — Event Catalog

**Status:** **Approved — Event Contract changes require RFC-005 Change Management**
**Type:** RFC (Architecture — Stable Reference Document)
**Depends on:** RFC-001 (Cafe Engine Context Map)

---

## 1. Purpose

هذه الوثيقة ليست مجرد قائمة أحداث — هي **العقد المعماري (Architectural Contract)** الذي يحكم كل تواصل بين الـ Domains. أي Domain Document لاحق (بدءًا من Sales) **يجب أن يلتزم حرفيًا** بما هو مُعرَّف هنا: لا حدث جديد يُضاف، ولا Payload يتغيّر، دون تعديل هذه الوثيقة أولًا.

كل حدث موثَّق هنا يتضمن الآن حقل **Business Preconditions**: الشروط التجارية التي يجب أن تكون محقَّقة *قبل* نشر الحدث. هذا الحقل ليس تكرارًا لـ Idempotency (الذي يمنع إعادة المعالجة)، بل يُغذّي مباشرة قسم **Business Rules** في كل Domain Document لاحق.

## 2. Event Classification Legend

| النوع | التعريف |
|-------|---------|
| **Internal Domain Event** | يُنشر ويُستهلك فقط داخل حدود الـ Cafe Engine (بين Domains المنصة نفسها). لا يُكشف خارج النظام. |
| **Public Integration Event** | حدث مرشّح مستقبلًا للكشف خارج المنصة (Webhooks, Public API Subscriptions, تكاملات طرف ثالث). **لا يُنفَّذ في MVP** حتى لو صُنِّف كذلك الآن — التصنيف هنا استباقي فقط لتفادي إعادة تصميم لاحقة. |

---

## 3. Shift Management Domain — Published Events

### 3.1 `ShiftOpened`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Shift Management |
| **Subscribers** | Sales (Read Model لحالة الشيفت), Reporting |
| **Trigger** | فتح جلسة شيفت جديدة من قِبل الكاشير/المدير |
| **Payload (High-Level)** | `shiftId, tenantId, branchId, openedBy, openingCashAmount, openedAt` |
| **Business Meaning** | "بدأت جلسة عمل جديدة على هذا الكاشير/الفرع؛ المعاملات المالية أصبحت مسموحة الآن" |
| **Business Preconditions** | لا يوجد شيفت آخر مفتوح بالفعل لنفس الكاشير/الفرع في نفس اللحظة; `openingCashAmount` قيمة صفر أو موجبة |
| **Idempotency** | نعم — `shiftId` كمفتاح؛ يمنع فتح شيفتين بنفس المعرّف |
| **Classification** | Internal Domain Event |

### 3.2 `ShiftClosed`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Shift Management |
| **Subscribers** | Sales (Read Model لحالة الشيفت), Reporting, Notifications |
| **Trigger** | قفل جلسة الشيفت وتسوية الدرج النقدي |
| **Payload (High-Level)** | `shiftId, tenantId, branchId, closedBy, closingCashAmount, expectedCashAmount, cashDifference, salesSummaryRef, closedAt` |
| **Business Meaning** | "انتهت جلسة العمل؛ لا معاملات بيع جديدة مسموحة على هذا الشيفت اعتبارًا من الآن، والفرق النقدي (إن وُجد) أصبح رسميًا" |
| **Business Preconditions** | الشيفت (`shiftId`) كان في حالة مفتوحة قبل القفل; `expectedCashAmount` مُحتسَب بناءً على `openingCashAmount` + إجمالي المبيعات النقدية خلال الشيفت (من Sales); **لا يوجد طلب مفتوح (`Order` نُشِر عبر `OrderPlaced` ولم يُغلَق بعد بـ `SaleCompleted`/`OrderCancelled`/`OrderRejected`) مرتبط بهذا الشيفت** — Shift Management يحتفظ بعدّاد محلي مُحدَّث من هذه الأحداث الأربعة لضمان هذا الشرط |
| **Idempotency** | نعم — `shiftId` كمفتاح؛ يمنع قفل نفس الشيفت مرتين |
| **Classification** | Internal Domain Event |

---

## 4. Sales Domain — Published Events

### 4.1 `OrderPlaced`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Sales |
| **Subscribers** | Order Fulfillment, Shift Management (عدّاد الطلبات المفتوحة) |
| **Trigger** | العميل/الكاشير يُنشئ طلبًا جديدًا ببنوده (Order Lines) ويُرسله للتنفيذ |
| **Payload (High-Level)** | `orderId, tenantId, branchId, shiftId, createdByEmployeeId?, orderLines[{menuItemId, quantity, unitPrice: Money, selectedModifierIds[], notes?}], createdAt` |
| **Business Meaning** | "هذا الطلب مُعتمَد للبيع ويحتاج تنفيذًا فعليًا في المطبخ/محطة العمل" |
| **Business Preconditions** | Order يحتوي على `OrderLine` صالح واحد على الأقل؛ كل كمية موجبة، وكل `menuItemId` فعّال في `MenuItemSalesReadModel` وله `currentBasePrice` موجب صالح يُنسخ إلى `unitPrice`; كل البنود تستخدم عملة واحدة; الطلب لم يُنشر مسبقًا; **`shiftId` إلزامي ويشير لشيفت مفتوح**. `createdByEmployeeId?` اختياري ولا يُستخدم لاستنتاج الشيفت |
| **Idempotency** | نعم — `orderId` فريد؛ استهلاك مكرر لنفس `orderId` يجب أن يُتجاهَل من قِبل Order Fulfillment (Idempotent Consumer) |
| **Classification** | Internal Domain Event |

### 4.2 `SaleCompleted`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Sales |
| **Subscribers** | Inventory, CRM, Reporting, Notifications, Shift Management (عدّاد الطلبات المفتوحة) |
| **Trigger** | إتمام عملية البيع ماليًا (الدفع + تأكيد المعاملة) |
| **Payload (High-Level)** | `saleId, orderId, tenantId, branchId, shiftId, customerId?, completedByEmployeeId?, orderLines[{menuItemId, quantity, unitPrice: Money, selectedModifierIds[]}], discountApplied?, totalAmount: Money, paymentStatus, paymentMethod, completedAt` |
| **Business Meaning** | "معاملة بيع مكتملة ماليًا ومُعتمَدة كمصدر حقيقة للإيراد، ومرتبطة إلزاميًا بجلسة شيفت مفتوحة وبالطلب التشغيلي الأصلي (`orderId`) الذي نشأت منه" |
| **Business Preconditions** | Payment Approved (تم تأكيد السداد أو اعتماد طريقة الدفع); Sale موجودة وصالحة (لم تُلغَ قبل الإتمام); لم تُصنَّف هذه المعاملة كـ Refunded مسبقًا; إجمالي المبلغ يطابق مجموع البنود بعد الخصم (إن وُجد); يوجد شيفت (`shiftId`) مفتوح فعليًا للفرع/الكاشير وقت إتمام المعاملة; **يوجد `orderId` صالح ومرجعي لطلب سابق (`OrderPlaced`)** |
| **Idempotency** | نعم — إلزامية، لأن Inventory سيخصم مخزونًا بناءً عليه؛ معالجة مكررة = خصم مضاعف خاطئ. يجب استخدام `saleId` كمفتاح Idempotency لدى كل مستهلك |
| **Classification** | Internal Domain Event (مرشّح مستقبلًا لـ Public Integration عند بناء تكاملات محاسبية خارجية — غير مُفعّل الآن) |

### 4.3 `SaleRefunded`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Sales |
| **Subscribers** | Inventory (لاسترجاع المخزون إن انطبق), CRM, Reporting, Notifications |
| **Trigger** | اعتماد مرتجع كامل أو جزئي لمعاملة بيع سابقة (`POS.Refund`) |
| **Payload (High-Level)** | `saleId, refundId, tenantId, branchId, refundedLines[{menuItemId, quantity, disposition (Restock/Discard/InspectionRequired)}], refundedAmount, reason, approvedBy, refundedAt` |
| **Business Meaning** | "جزء أو كل معاملة بيع سابقة أُلغيت ماليًا ويجب عكس أثرها على الأنظمة الأخرى. **الأثر المخزني الفعلي لكل بند يعتمد على `disposition`** المُحدَّد وقت التسجيل — وليس افتراضًا عامًا واحدًا لكل الحالات: `Restock` (يعود فعليًا كحركة إدخال)، `Discard` (لا يعود — أصبح هدرًا)، `InspectionRequired` (حالة مُعلَّقة تحتاج مراجعة يدوية لاحقة قبل تحديد المصير النهائي)" |
| **Business Preconditions** | SaleCompleted سابق موجود لنفس `saleId`; لم يتجاوز المبلغ المُسترجَع إجمالي المعاملة الأصلية; لا يوجد Refund مكتمل سابق لنفس البنود (منع الاسترجاع المزدوج); المُعتمِد (`approvedBy`) يملك صلاحية `POS.Refund` |
| **Idempotency** | نعم — `refundId` فريد؛ يمنع تكرار عكس نفس المرتجع مرتين |
| **Classification** | Internal Domain Event |

### 4.4 `DiscountApplied`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Sales |
| **Subscribers** | Reporting, CRM (اختياري — لتحديث سجل استخدام الخصومات) |
| **Trigger** | تطبيق خصم فعليًا على معاملة بيع (سواء يدوي من الكاشير أو بناءً على اقتراح CRM) |
| **Payload (High-Level)** | `saleId, discountType, discountValue, appliedBy, source (manual/crm_suggestion), appliedAt` |
| **Business Meaning** | "قرار مالي نهائي بتطبيق خصم — Sales وحدها من اتخذت هذا القرار" |
| **Business Preconditions** | المستخدم يملك صلاحية `POS.ApplyDiscount`; قيمة الخصم لا تتجاوز الحد الأقصى المسموح به في إعدادات الفرع; المعاملة (Sale) لم تُكتمَل ماليًا بعد وقت تطبيق الخصم |
| **Idempotency** | غير حرج بشكل مستقل — يُعامَل كجزء من idempotency الخاص بـ `SaleCompleted` |
| **Classification** | Internal Domain Event |

---

## 5. Order Fulfillment Domain — Published Events

### 5.1 `OrderReady`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Order Fulfillment |
| **Subscribers** | Notifications, Reporting |
| **Trigger** | انتهاء تحضير كل بنود الطلب في محطة العمل (مطبخ/باريستا) |
| **Payload (High-Level)** | `orderId, tenantId, branchId, preparedByEmployeeId?, readyAt, station?` |
| **Business Meaning** | "الطلب جاهز للتسليم للعميل، ويحتاج تنبيهًا تشغيليًا" |
| **Business Preconditions** | OrderPlaced سابق موجود لنفس `orderId`; الطلب في حالة `Preparing` وليس `Cancelled` أو `Rejected`; كل بنود الطلب أُنجزت من محطات العمل المعنية |
| **Idempotency** | نعم — `orderId` كمفتاح؛ عدم إعادة إرسال تنبيهات مكررة |
| **Classification** | Internal Domain Event |

### 5.2 `OrderServed`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Order Fulfillment |
| **Subscribers** | Sales (لإغلاق دورة الطلب), Reporting |
| **Trigger** | تسليم الطلب فعليًا للعميل |
| **Payload (High-Level)** | `orderId, tenantId, branchId, servedByEmployeeId?, servedAt` |
| **Business Meaning** | "اكتملت دورة تنفيذ الطلب تشغيليًا؛ لا علاقة له بإتمام الدفع (ذلك من مسؤولية Sales/SaleCompleted بشكل مستقل)" |
| **Business Preconditions** | الطلب في حالة `Ready` قبل الانتقال لـ `Served`; لم يُسجَّل تسليم سابق لنفس `orderId` (منع الازدواج) |
| **Idempotency** | نعم — `orderId` كمفتاح |
| **Classification** | Internal Domain Event |

### 5.3 `OrderCancelled`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Order Fulfillment |
| **Subscribers** | Sales, Notifications, Reporting, Shift Management (عدّاد الطلبات المفتوحة) |
| **Trigger** | إلغاء الطلب قبل أو أثناء التحضير (نفاد صنف، طلب العميل، خطأ إدخال) |
| **Payload (High-Level)** | `orderId, tenantId, branchId, cancelledBy, reason, cancelledAt` |
| **Business Meaning** | "الطلب لن يُنفَّذ؛ إن كانت هناك معاملة بيع مرتبطة، على Sales اتخاذ القرار المالي المناسب (مثل عدم إتمام الدفع أو بدء مرتجع)" |
| **Business Preconditions** | الطلب لم يصل بعد لحالة `Served`; يوجد سبب إلغاء مسجَّل (`reason`); المُلغي (`cancelledBy`) يملك صلاحية تشغيلية مناسبة لإلغاء الطلبات |
| **Idempotency** | نعم — `orderId` كمفتاح |
| **Classification** | Internal Domain Event |

### 5.4 `OrderRejected`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Order Fulfillment |
| **Subscribers** | Sales, Notifications, Shift Management (عدّاد الطلبات المفتوحة) |
| **Trigger** | رفض محطة العمل تنفيذ الطلب (مثال: نفاد مكوّن أساسي مكتشف وقت التحضير) |
| **Payload (High-Level)** | `orderId, tenantId, branchId, rejectedReason, rejectedAt` |
| **Business Meaning** | "تعذّر تنفيذ الطلب تشغيليًا رغم قبوله ماليًا من Sales — يحتاج تدخلًا فوريًا" |
| **Business Preconditions** | الطلب في حالة `Preparing` وقت الرفض; يوجد سبب رفض واضح (`rejectedReason`) مرتبط بنقص فعلي في التنفيذ |
| **Idempotency** | نعم — `orderId` كمفتاح |
| **Classification** | Internal Domain Event |

---

## 6. Inventory Domain — Published Events

### 6.1 `StockLevelLow`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Inventory |
| **Subscribers** | Notifications, Reporting |
| **Trigger** | انخفاض رصيد صنف/مكوّن عن حد أدنى مُعرَّف (Reorder Threshold) |
| **Payload (High-Level)** | `stockItemId, tenantId, branchId, currentQuantity, threshold, unit, detectedAt` |
| **Business Meaning** | "تنبيه استباقي لتفادي نفاد المخزون قبل حدوثه" |
| **Business Preconditions** | الرصيد الحالي (`currentQuantity`) أقل من أو يساوي `threshold` المُعرَّف لهذا الصنف; لا يوجد تنبيه مماثل نشط لنفس `stockItemId` خلال نافذة Debouncing الزمنية |
| **Idempotency** | مطلوب على مستوى منع التنبيه المتكرر خلال فترة زمنية قصيرة (Debouncing)، وليس idempotency صارم بمعنى المعاملات المالية |
| **Classification** | Internal Domain Event |

### 6.2 `StockCountFinalized`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Inventory |
| **Subscribers** | Reporting |
| **Trigger** | اعتماد نتيجة جرد مخزون (Stock Count) وتسوية الفروقات |
| **Payload (High-Level)** | `stockCountId, tenantId, branchId, adjustments[{stockItemId, expectedQty, actualQty, variance}], finalizedBy, finalizedAt` |
| **Business Meaning** | "الرصيد الدفتري تمت مطابقته مع الرصيد الفعلي؛ أي فروقات أصبحت رسمية" |
| **Business Preconditions** | عملية الجرد (`stockCountId`) في حالة مكتملة الإدخال قبل الاعتماد; المُعتمِد (`finalizedBy`) يملك صلاحية اعتماد الجرد; لم يُعتمَد نفس الجرد (`stockCountId`) مسبقًا |
| **Idempotency** | نعم — `stockCountId` كمفتاح؛ يمنع تطبيق نفس التسوية مرتين |
| **Classification** | Internal Domain Event |

### 6.3 `StockAdjusted`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Inventory |
| **Subscribers** | Reporting |
| **Trigger** | أي تعديل يدوي على المخزون خارج البيع/الشراء/الجرد (مثل: هدر — Waste) |
| **Payload (High-Level)** | `adjustmentId, tenantId, branchId, stockItemId, quantityChange, reason (waste/damage/manual), adjustedBy, adjustedAt` |
| **Business Meaning** | "تغيّر في رصيد المخزون له سبب تشغيلي محدد يجب تتبعه في التقارير (خصوصًا الهدر)" |
| **Business Preconditions** | يوجد سبب تعديل مصنَّف (`reason`); الكمية الناتجة بعد التعديل لا تقل عن صفر; المُعدِّل (`adjustedBy`) يملك صلاحية `Inventory.Adjust` |
| **Idempotency** | نعم — `adjustmentId` كمفتاح |
| **Classification** | Internal Domain Event |

### 6.4 `StockItemCreated`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Inventory |
| **Subscribers** | Menu (Read Model للتحقق المرجعي عند بناء الوصفات), Purchasing (Read Model للتحقق المرجعي عند إنشاء بنود أوامر الشراء), Reporting |
| **Trigger** | تعريف صنف مخزون جديد (StockItem) |
| **Payload (High-Level)** | `stockItemId, tenantId, name, unitOfMeasureId, reorderLevel, createdAt` |
| **Business Meaning** | "أصبح هذا الصنف مرجعًا صالحًا يمكن لأي Domain آخر الإشارة إليه (في وصفة، أو بند أمر شراء)" |
| **Business Preconditions** | لا يوجد صنف مكرر بنفس الاسم داخل نفس الـ Tenant; وحدة القياس (`unitOfMeasureId`) معرَّفة مسبقًا |
| **Idempotency** | نعم — `stockItemId` كمفتاح |
| **Classification** | Internal Domain Event |

### 6.5 `StockItemDeactivated`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Inventory |
| **Subscribers** | Menu (Read Model), Purchasing (Read Model), Reporting |
| **Trigger** | تعطيل صنف مخزون (توقف استخدامه) |
| **Payload (High-Level)** | `stockItemId, tenantId, reason, deactivatedAt` |
| **Business Meaning** | "هذا الصنف لم يعد مرجعًا صالحًا لأي وصفة جديدة أو بند أمر شراء جديد اعتبارًا من الآن" |
| **Business Preconditions** | الصنف كان في حالة نشطة قبل التعطيل |
| **Idempotency** | نعم — `stockItemId` كمفتاح |
| **Classification** | Internal Domain Event |

### 6.6 `ItemAvailabilityChanged`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Inventory |
| **Subscribers** | Sales (Read Model — بوابة تحقق عند `NegativeStockPolicy=Strict`), Order Fulfillment, Reporting |
| **Trigger** | تغيّر قابلية بيع منتج معيّن (`menuItemId`) نتيجة تغيّر مستوى مخزون أحد مكوناته — يُحسَب بواسطة Inventory باستخدام نسخته المحلية من Recipe + ModifierRecipeImpact (مفهرسة عكسيًا: `stockItemId → menuItemIds المتأثرة`) |
| **Payload (High-Level)** | `menuItemId, tenantId, isAvailable, reason (insufficient_stock/restored), changedAt` |
| **Business Meaning** | "هل هذا المنتج قابل للبيع فعليًا الآن بناءً على المخزون المتاح؟ — هذا **ليس** قرارًا تجاريًا من Menu (مثل `MenuItemDeactivated`)، بل حالة تشغيلية مُشتقة تلقائيًا وقد تتغيّر عدة مرات في اليوم" |
| **Business Preconditions** | يوجد تغيّر فعلي في القابلية للبيع (لا يُنشَر الحدث لو الحالة لم تتغيّر — لتفادي ضوضاء الأحداث) |
| **Idempotency** | نعم — يُدار عبر مقارنة الحالة السابقة، ليس عبر مفتاح معاملة |
| **Classification** | Internal Domain Event |

> **ملاحظة معمارية مهمة (Eventual Consistency Trade-off):** Sales تعتمد على نسخة محلية من هذا الحدث لمنع `OrderPlaced` لصنف غير متاح عند `Strict` — لكن هذه النسخة **متأخرة بالضرورة** (Eventually Consistent)، وليست قراءة فورية للمخزون الفعلي. في حالات نادرة جدًا (طلبان متزامنان تمامًا للحظة واحدة)، قد يُقبَل طلب قبل وصول تحديث الحالة. هذا Trade-off مقصود ومُوثَّق: **`Strict` يقلل احتمالية الرصيد السالب بشكل كبير، لكنه لا يضمنها بنسبة 100%** دون كسر مبدأ "لا استدعاءات مباشرة بين الـ Domains". Inventory نفسها تبقى خط الدفاع الأخير (Backstop) عند معالجة `SaleCompleted` الفعلي.

### 6.7 `InventoryMovementRecorded`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Inventory |
| **Subscribers** | Reporting |
| **Trigger** | **أي** حركة مخزون تُنشئها Inventory داخليًا (خصم بيع، معالجة استلام، تسوية يدوية، هدر، تسوية جرد) — حدث موحَّد يغطي كل أنواع `StockMovement` بتفاصيل التقييم المالي الكاملة |
| **Payload (High-Level)** | `movementId, tenantId, branchId, stockItemId, movementSource (Sale/Purchase/Adjustment/StockCount/Refund), reason? (waste/damage/manual — فقط عند movementSource=Adjustment), quantityDelta, unitCostUsed, newAvgCost, newTotalValue, sourceReference (saleId/goodsReceiptId/adjustmentId/stockCountId), recordedAt` |
| **Business Meaning** | "حقيقة مخزنية موحَّدة بالتقييم المالي الكامل لكل حركة — هذا هو **المصدر الوحيد** الذي يسمح لأي دومين خارجي (خصوصًا Reporting) بحساب Food Cost، Inventory Valuation، أو Waste % بالقيمة، دون إعادة تنفيذ منطق Inventory الداخلي في مكان آخر. حقل `reason` الاختياري يسمح لـ Reporting بتمييز الهدر عن باقي التسويات **دون الرجوع لحدث `StockAdjusted` المرتبط** — تبسيطًا متعمَّدًا" |
| **Business Preconditions** | `quantityDelta` ≠ صفر; الحركة الأصلية (بيع/استلام/تسوية/جرد) اكتملت ومُعتمَدة بالفعل — هذا الحدث دائمًا نتيجة لاحقة، وليس مُحرِّكًا لأي قرار |
| **Idempotency** | نعم — `movementId` كمفتاح |
| **Classification** | Internal Domain Event |

> **ملاحظة على العلاقة بالأحداث الأخرى:** هذا الحدث **مكمِّل، وليس بديلًا**، لـ `StockAdjusted`/`StockCountFinalized`/`GoodsReceived` — تلك الأحداث تحمل المعنى التجاري المحدَّد لكل حالة (سبب الهدر، تفاصيل الجرد...) وتُستهلَك لأغراضها الخاصة (Notifications، إلخ). `InventoryMovementRecorded` يُنشَر **بالإضافة إليها** لكل حركة، كسجل موحَّد بالتقييم المالي الكامل، مُخصَّص أساسًا لـ Reporting. **هذا هو الحدث الوحيد الذي يجعل خصم المخزون الناتج عن `SaleCompleted` مرئيًا خارج Inventory** — لم يكن له أي أثر خارجي قبل إضافة هذا الحدث (Gap مُكتشَف أثناء تصميم Reporting).

---

## 7. Suppliers & Business Accounts Domain — Published Events

### 7.1 `SupplierCreated`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Suppliers & Business Accounts |
| **Subscribers** | Purchasing (Read Model للتحقق المرجعي), Reporting |
| **Trigger** | تسجيل مورد جديد في النظام |
| **Payload (High-Level)** | `supplierId, tenantId, name, paymentTermsDays, createdAt` |
| **Business Meaning** | "مورد جديد أصبح متاحًا لإنشاء أوامر شراء ضده" |
| **Business Preconditions** | لا يوجد مورد مكرر بنفس بيانات التعريف الأساسية داخل نفس الـ Tenant |
| **Idempotency** | نعم — `supplierId` كمفتاح |
| **Classification** | Internal Domain Event |

### 7.2 `SupplierDeactivated`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Suppliers & Business Accounts |
| **Subscribers** | Purchasing (Read Model), Reporting |
| **Trigger** | تعطيل مورد (توقف تعامل، بيانات خاطئة...) |
| **Payload (High-Level)** | `supplierId, tenantId, reason, deactivatedAt` |
| **Business Meaning** | "هذا المورد لم يعد متاحًا لإنشاء أوامر شراء **جديدة** ضده. أوامر الشراء المفتوحة بالفعل تبقى سارية ويمكن استلام بضاعة ضدها بشكل طبيعي (نفس مبدأ السماح بسداد فواتير مورد مُعطَّل — راجع Business Rule #9 في Domain-Suppliers-Business-Accounts.md)" |
| **Business Preconditions** | المورد كان في حالة نشطة قبل التعطيل |
| **Idempotency** | نعم — `supplierId` كمفتاح |
| **Classification** | Internal Domain Event |

### 7.3 `PurchaseInvoiceRecorded`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Suppliers & Business Accounts |
| **Subscribers** | Reporting |
| **Trigger** | تسجيل فاتورة شراء من مورد كالتزام مالي (Accounts Payable) |
| **Payload (High-Level)** | `invoiceId, tenantId, supplierId, amount, dueDate, relatedGoodsReceiptId?, recordedAt` |
| **Business Meaning** | "التزام مالي جديد تجاه المورد — **لا يؤثر على المخزون بأي شكل**، بغض النظر عن وجود أو عدم وجود استلام فعلي مرتبط وقت التسجيل" |
| **Business Preconditions** | المورد (`supplierId`) نشط وموجود; `amount` قيمة موجبة; `dueDate` مبني على شروط الدفع (`paymentTermsDays`) الخاصة بالمورد |
| **Idempotency** | نعم — `invoiceId` كمفتاح |
| **Classification** | Internal Domain Event |

### 7.4 `PaymentRecorded`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Suppliers & Business Accounts |
| **Subscribers** | Reporting |
| **Trigger** | تسجيل دفعة (كاملة أو جزئية) تجاه رصيد مورد |
| **Payload (High-Level)** | `paymentId, tenantId, supplierId, amount, allocatedInvoiceIds[], paymentMethod, recordedAt` |
| **Business Meaning** | "انخفض الرصيد المستحق للمورد بمقدار الدفعة، سواء بالكامل أو جزئيًا موزّعة على فاتورة/فواتير محددة" |
| **Business Preconditions** | `amount` لا يتجاوز إجمالي الرصيد المستحق على الفواتير المُخصَّصة (`allocatedInvoiceIds`); لا يوجد دفع مكرر بنفس `paymentId` |
| **Idempotency** | نعم — `paymentId` كمفتاح |
| **Classification** | Internal Domain Event |

### 7.5 `SupplierPaymentOverdue`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Suppliers & Business Accounts |
| **Subscribers** | Notifications, Reporting |
| **Trigger** | تجاوز فاتورة غير مسددة تاريخ الاستحقاق (`dueDate`) دون سداد كامل |
| **Payload (High-Level)** | `invoiceId, tenantId, supplierId, overdueAmount, daysPastDue, detectedAt` |
| **Business Meaning** | "التزام مالي تجاوز موعد استحقاقه ويحتاج متابعة أو تذكيرًا للسداد" |
| **Business Preconditions** | الفاتورة (`invoiceId`) لم تُسدَّد بالكامل بعد; التاريخ الحالي يتجاوز `dueDate` |
| **Idempotency** | نعم — يُدار عبر Debouncing لمنع تكرار نفس التنبيه يوميًا لنفس الفاتورة |
| **Classification** | Internal Domain Event |

---

## 8. Purchasing Domain — Published Events

### 8.1 `GoodsReceived`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Purchasing |
| **Subscribers** | Inventory, Reporting, Suppliers & Business Accounts (اختياري — للمطابقة الثلاثية Three-Way Match) |
| **Trigger** | استلام بضاعة فعليًا مقابل أمر شراء (كليًا أو جزئيًا) |
| **Payload (High-Level)** | `goodsReceiptId, purchaseOrderId, tenantId, branchId, receivedLines[{stockItemId, quantityOrdered, quantityReceived, unitCostExpected, unitCostActual, varianceType?, varianceReason?}], supplierId, receivedAt` |
| **Business Meaning** | "دخول بضاعة فعلي للمخزون بتكلفة معروفة — يُستخدم لتحديث الرصيد والتقييم المالي. **هذا هو المسار الوحيد لزيادة المخزون فعليًا** — لا فاتورة ولا مورد يزيد المخزون مباشرة. أي فرق في الكمية أو السعر عن المتوقع **لا يمنع الاستلام** — يُسجَّل كفرق واضح (Variance) ضمن نفس الحدث" |
| **Business Preconditions** | يوجد أمر شراء (`purchaseOrderId`) صالح ومُعتمَد لنفس المورّد; لم يُسجَّل استلام مكرر بنفس `goodsReceiptId`; **لا يُشترط تطابق الكمية أو السعر مع المتوقع** — أي فرق يُسجَّل كـ `varianceType`/`priceVariance` دون منع العملية |
| **Idempotency** | نعم — `goodsReceiptId` كمفتاح؛ إلزامي لأن Inventory سيُنشئ حركة إدخال بناءً عليه |
| **Classification** | Internal Domain Event |

### 8.2 `PurchaseOrderCreated`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Purchasing |
| **Subscribers** | Reporting |
| **Trigger** | إنشاء أمر شراء جديد لمورد نشط |
| **Payload (High-Level)** | `purchaseOrderId, tenantId, branchId, supplierId, lines[{stockItemId, quantityOrdered, expectedUnitCost}], createdAt` |
| **Business Meaning** | "التزام تشغيلي بشراء كميات محددة من مورد؛ لا يمثّل التزامًا ماليًا بعد (ذلك يبدأ فقط عند تسجيل فاتورة في Suppliers & Business Accounts)" |
| **Business Preconditions** | المورد (`supplierId`) نشط وموجود (عبر Read Model محلي مُحدَّث من `SupplierCreated`/`SupplierDeactivated`); يحتوي على بند واحد على الأقل |
| **Idempotency** | نعم — `purchaseOrderId` كمفتاح |
| **Classification** | Internal Domain Event |

### 8.3 `PurchaseOrderCancelled`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Purchasing |
| **Subscribers** | Reporting |
| **Trigger** | إلغاء أمر شراء قبل اكتمال استلامه بالكامل |
| **Payload (High-Level)** | `purchaseOrderId, tenantId, reason, cancelledAt` |
| **Business Meaning** | "لم يعد هذا الأمر ساريًا؛ لا استلام إضافي مسموح ضده" |
| **Business Preconditions** | أمر الشراء لم يُستلَم بالكامل بعد (Received) |
| **Idempotency** | نعم — `purchaseOrderId` كمفتاح |
| **Classification** | Internal Domain Event |

---

## 9. Menu Domain — Published Events

### 9.1 `RecipeUpdated`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Menu |
| **Subscribers** | Inventory |
| **Trigger** | تعديل مكونات/كميات وصفة منتج قائم |
| **Payload (High-Level)** | `recipeId, recipeVersion, menuItemId, tenantId, ingredients[{stockItemId, quantityRequired}], updatedAt` |
| **Business Meaning** | "تغيّرت متطلبات الإنتاج لهذا الصنف؛ عمليات الخصم المستقبلية عند البيع يجب أن تستخدم النسخة الجديدة. **لا تؤثر بأي شكل على حركات مخزون سابقة** — تلك تحتفظ بالكميات الفعلية كأرقام ثابتة (Immutable Snapshot) بغض النظر عن أي تعديل لاحق" |
| **Business Preconditions** | الوصفة (`recipeId`) موجودة ومرتبطة بمنتج فعّال في Menu; كل المكونات المُشار إليها (`stockItemId`) معرَّفة في Inventory كـ Master Data (وليس Menu) |
| **Idempotency** | نعم — `recipeId + recipeVersion` لضمان تطبيق آخر نسخة فقط |
| **Classification** | Internal Domain Event |

### 9.2 `MenuItemPriceChanged`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Menu |
| **Subscribers** | Sales (Read Model), Reporting |
| **Trigger** | وصول تغيير مجدول للسعر الأساسي إلى وقت نفاذه |
| **Payload (High-Level)** | `tenantId, priceChangeId, menuItemId, oldPrice: Money, newPrice: Money, effectiveFrom, changedAt` |
| **Business Meaning** | "أصبح هذا السعر هو السعر الحالي النافذ؛ تحدّث Sales نسختها الحالية فقط، ولا تُعاد تسعير Orders قائمة" |
| **Business Preconditions** | المنتج (`menuItemId`) موجود وفعّال; `newPrice` قيمة موجبة صالحة; `effectiveFrom` تاريخ مستقبلي أو حالي، وليس تاريخًا ماضيًا |
| **Idempotency** | نعم — `priceChangeId` هو مفتاح الـ Idempotency؛ يُنشر الحدث idempotently مرة نفاذ التغيير المجدول |
| **Classification** | Internal Domain Event |

### 9.3 `MenuItemActivated`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Menu |
| **Subscribers** | Sales, Order Fulfillment, Reporting |
| **Trigger** | تفعيل منتج جديد أو إعادة تفعيل منتج مُعطَّل مسبقًا، فيصبح متاحًا للبيع |
| **Payload (High-Level)** | `tenantId, menuItemId, categoryId, basePrice: Money, priceEffectiveFrom, activatedAt` |
| **Business Meaning** | "هذا المنتج أصبح قابلًا للإضافة لأي طلب بيع جديد" |
| **Business Preconditions** | المنتج يملك وصفة (Recipe) مُعرَّفة إن كان منتجًا يحتاج تحضيرًا; المنتج يملك سعرًا أساسيًا صالحًا; المنتج مرتبط بفئة (Category) موجودة |
| **Idempotency** | نعم — `menuItemId` كمفتاح؛ تفعيل مكرر لمنتج مُفعَّل بالفعل يُتجاهَل |
| **Classification** | Internal Domain Event |

### 9.4 `MenuItemDeactivated`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Menu |
| **Subscribers** | Sales, Order Fulfillment, Reporting |
| **Trigger** | تعطيل منتج (نفاد موسمي، إيقاف دائم، تعديل قيد الإجراء) فيصبح غير متاح للبيع |
| **Payload (High-Level)** | `menuItemId, tenantId, reason, deactivatedAt` |
| **Business Meaning** | "هذا المنتج لم يعد متاحًا للإضافة لأي طلب بيع جديد اعتبارًا من الآن" |
| **Business Preconditions** | المنتج كان في حالة مُفعَّلة قبل التعطيل |
| **Idempotency** | نعم — `menuItemId` كمفتاح |
| **Classification** | Internal Domain Event |

### 9.5 `ModifierRecipeImpactUpdated`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Menu |
| **Subscribers** | Inventory |
| **Trigger** | تعريف أو تعديل تأثير Modifier معيّن على الوصفة (استبدال مكوّن أو إضافة كمية) |
| **Payload (High-Level)** | `modifierId, tenantId, impactType (substitute/addition), targetStockItemId, substituteStockItemId?, quantityDelta, updatedAt` |
| **Business Meaning** | "اختيار هذا الـ Modifier وقت البيع يجب أن يُغيّر فعليًا استهلاك المخزون المتوقع لهذا المنتج" |
| **Business Preconditions** | الـ Modifier موجود ومرتبط بمجموعة تخصيص فعّالة; كل `stockItemId` مُشار إليه (سواء الأصلي أو البديل) معرَّف في Inventory كـ Master Data; في حالة `substitute`: يوجد مكوّن أصلي (`targetStockItemId`) ومكوّن بديل (`substituteStockItemId`) كلاهما محدَّدان |
| **Idempotency** | نعم — `modifierId` كمفتاح؛ آخر نسخة فقط هي السارية |
| **Classification** | Internal Domain Event |

---

## 10. CRM Domain — Published Events

### 10.1 `CustomerCreated`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | CRM |
| **Subscribers** | Reporting |
| **Trigger** | تسجيل عميل جديد في النظام |
| **Payload (High-Level)** | `customerId, tenantId, createdAt, source (pos/manual)` |
| **Business Meaning** | "عميل جديد أصبح جزءًا من قاعدة بيانات المنشأة" |
| **Business Preconditions** | لا يوجد عميل مكرر بنفس بيانات التعريف الأساسية (رقم هاتف/معرّف) داخل نفس الـ Tenant |
| **Idempotency** | نعم — `customerId` كمفتاح |
| **Classification** | Internal Domain Event |

### 10.2 `DiscountEligibilityFlagged`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | CRM |
| **Subscribers** | Sales |
| **Trigger** | استيفاء العميل لشرط أهلية خصم (بناءً على قواعد CRM — تاريخ شراء، ولاء...) |
| **Payload (High-Level)** | `customerId, tenantId, eligibleDiscountType, eligibleValue, validUntil?, reason` |
| **Business Meaning** | **اقتراح فقط، وليس قرارًا** — "هذا العميل مؤهَّل لخصم كذا، والقرار النهائي بالتطبيق أو الرفض يعود حصريًا لـ Sales" |
| **Business Preconditions** | العميل (`customerId`) مسجَّل ونشط; قاعدة الأهلية (مثل عدد الزيارات أو نقاط الولاء) مستوفاة فعليًا وقت النشر; لم تنتهِ صلاحية العرض (`validUntil`) إن وُجدت |
| **Idempotency** | غير حرج — Sales تتعامل معه كمعلومة استشارية لحظة البيع، لا حالة تراكمية |
| **Classification** | Internal Domain Event |

---

## 11. Staff Domain — Published Events

### 11.1 `EmployeeCreated`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Staff |
| **Subscribers** | Attendance (Read Model), Payroll (Read Model), Expenses (Read Model), Reporting |
| **Trigger** | تعيين موظف جديد |
| **Payload (High-Level)** | `employeeId, tenantId, staffNumber, fullName, jobTitle, department, employmentType, defaultBranchId, managerEmployeeId?, hireDate, baseSalaryReference?, defaultShiftAssignment?, createdAt` |
| **Business Meaning** | "موظف جديد أصبح مرجعًا صالحًا يمكن لأي دومين آخر (Attendance، Payroll) الإشارة إليه" |
| **Business Preconditions** | `staffNumber` فريد داخل نفس الـ Tenant; `defaultBranchId` صالح; `managerEmployeeId` (إن وُجد) يشير لموظف نشط آخر داخل نفس الـ Tenant |
| **Idempotency** | نعم — `employeeId` كمفتاح |
| **Classification** | Internal Domain Event |

### 11.2 `EmployeeUpdated`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Staff |
| **Subscribers** | Attendance (Read Model), Payroll (Read Model), Expenses (Read Model), Reporting |
| **Trigger** | تعديل بيانات وصفية (مسمى وظيفي، قسم، مدير مباشر...) دون تغيير الحالة أو الفرع |
| **Payload (High-Level)** | `employeeId, tenantId, updatedFields{...}, updatedAt` |
| **Business Meaning** | "تغيّرت بيانات وصفية للموظف؛ لا تأثير على حالته الوظيفية أو فرعه" |
| **Business Preconditions** | الموظف (`employeeId`) موجود وليس `Terminated` |
| **Idempotency** | غير حرج — تحديث توصيفي غير تراكمي |
| **Classification** | Internal Domain Event |

### 11.3 `EmployeeActivated`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Staff |
| **Subscribers** | Attendance (Read Model), Payroll (Read Model), Expenses (Read Model), Reporting |
| **Trigger** | إعادة تفعيل موظف كان في حالة `Inactive` |
| **Payload (High-Level)** | `employeeId, tenantId, activatedAt` |
| **Business Meaning** | "الموظف عاد لحالة نشطة — يمكنه تسجيل حضور من جديد، وتُستأنَف أي اقتراحات راتب متعلقة به" |
| **Business Preconditions** | الموظف كان في حالة `Inactive` (وليس `Terminated` — راجع Domain-Staff.md Business Rule #3) |
| **Idempotency** | نعم — `employeeId` كمفتاح |
| **Classification** | Internal Domain Event |

### 11.4 `EmployeeDeactivated`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Staff |
| **Subscribers** | Attendance (Read Model), Payroll (Read Model), Expenses (Read Model), Reporting |
| **Trigger** | تعطيل مؤقت لموظف (إجازة بدون أجر، إيقاف تأديبي مؤقت) |
| **Payload (High-Level)** | `employeeId, tenantId, reason, deactivatedAt` |
| **Business Meaning** | "الموظف مُعطَّل مؤقتًا — قابل للعكس عبر `EmployeeActivated` لاحقًا" |
| **Business Preconditions** | الموظف كان في حالة `Active` |
| **Idempotency** | نعم — `employeeId` كمفتاح |
| **Classification** | Internal Domain Event |

### 11.5 `EmployeeTransferred`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Staff |
| **Subscribers** | Attendance (Read Model), Payroll (Read Model), Expenses (Read Model), Reporting |
| **Trigger** | نقل موظف بشكل دائم من فرع لآخر |
| **Payload (High-Level)** | `employeeId, tenantId, oldBranchId, newBranchId, transferredAt` |
| **Business Meaning** | "الفرع الافتراضي للموظف تغيّر؛ عمليات الحضور المستقبلية تُتحقَّق مقابل الفرع الجديد فقط — لا أثر رجعي على سجلات سابقة" |
| **Business Preconditions** | `newBranchId` مختلف عن `oldBranchId` وصالح |
| **Idempotency** | نعم — `employeeId + transferredAt` كمفتاح مركّب |
| **Classification** | Internal Domain Event |

### 11.6 `EmployeeTerminated`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Staff |
| **Subscribers** | Attendance (Read Model), Payroll (Read Model), Expenses (Read Model), Reporting |
| **Trigger** | إنهاء خدمة موظف نهائيًا |
| **Payload (High-Level)** | `employeeId, tenantId, terminationDate, reason, terminatedAt` |
| **Business Meaning** | "انتهت علاقة التوظيف نهائيًا — حالة غير قابلة للعكس؛ لا `EmployeeActivated` مقبول لاحقًا لنفس `employeeId`" |
| **Business Preconditions** | `terminationDate >= hireDate`; الموظف لم يكن `Terminated` بالفعل |
| **Idempotency** | نعم — `employeeId` كمفتاح |
| **Classification** | Internal Domain Event |

---

## 12. Attendance Domain — Published Events

### 12.1 `WorkingHoursCalculated`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Attendance |
| **Subscribers** | Reporting, Payroll |
| **Trigger** | اعتماد ساعات عمل موظف عن يوم/شيفت مكتمل |
| **Payload (High-Level)** | `employeeId, tenantId, branchId, shiftId, date, workedHours, lateMinutes, status (present/late/absent), approvedBy?` |
| **Business Meaning** | "قياس نهائي ومعتمد لساعات عمل الموظف الفعلية — لا يتضمن أي حساب مالي" |
| **Business Preconditions** | يوجد تسجيل Check-in وCheck-out مكتمل لنفس الشيفت; الموظف (`employeeId`) مرتبط بشيفت (`shiftId`) صالح لهذا التاريخ; لم يُحتسَب هذا الشيفت مسبقًا (منع الاحتساب المزدوج) |
| **Idempotency** | نعم — `employeeId + date + shiftId` كمفتاح مركّب؛ يمنع ازدواج الحساب |
| **Classification** | Internal Domain Event |

### 12.2 `AttendanceExceptionRaised`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Attendance |
| **Subscribers** | Notifications, Reporting, Payroll |
| **Trigger** | تسجيل تأخير، انصراف مبكر، غياب، Check-in خارج نطاق الموقع الجغرافي المسموح، أو من جهاز غير مُصرَّح به |
| **Payload (High-Level)** | `employeeId, tenantId, branchId, exceptionType (late/early_leave/absent/out_of_geofence/device_mismatch), date, details` |
| **Business Meaning** | "انحراف تشغيلي عن الحضور المتوقع يحتاج انتباه المدير، بغض النظر عن أي حساب مالي لاحق" |
| **Business Preconditions** | الشيفت المتوقع للموظف مُعرَّف مسبقًا في Staff; الانحراف (تأخير/غياب/خروج عن النطاق الجغرافي) تجاوز الحد المسموح به في الإعدادات |
| **Idempotency** | نعم — `employeeId + date + exceptionType` كمفتاح |
| **Classification** | Internal Domain Event |

---

## 13. Expenses Domain — Published Events

### 13.1 `ExpenseRecorded`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Expenses |
| **Subscribers** | Reporting |
| **Trigger** | تسجيل مصروف تشغيلي جديد مباشرة (لا اعتماد مسبق في MVP) |
| **Payload (High-Level)** | `expenseId, tenantId, branchId, categoryId, amount, expenseDate, description?, attachmentRefs[], recordedBy, status (Recorded), recordedAt` |
| **Business Meaning** | "خروج مالي فعلي مُسجَّل ومُصنَّف، منفصل تمامًا عن دورة Purchasing، ولا يمثِّل سدادًا فعليًا — فقط توثيقًا لحدوث المصروف" |
| **Business Preconditions** | يوجد تصنيف (`categoryId`) صالح للمصروف; المبلغ (`amount`) قيمة موجبة; `recordedBy` يشير لموظف نشط (`Active`) في Staff |
| **Idempotency** | نعم — `expenseId` كمفتاح |
| **Classification** | Internal Domain Event |

### 13.2 `ExpenseCancelled`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Expenses |
| **Subscribers** | Reporting |
| **Trigger** | إلغاء مصروف مُسجَّل بالكامل (خطأ في التسجيل، تكرار غير مقصود) |
| **Payload (High-Level)** | `expenseId, tenantId, cancelledBy, reason, cancelledAt` |
| **Business Meaning** | "هذا المصروف لم يعد ساريًا؛ السجل يبقى ظاهرًا للتدقيق لكن لا يُحتسَب ضمن إجمالي المصروفات الفعّالة" |
| **Business Preconditions** | المصروف (`expenseId`) في حالة `Recorded` (وليس `Cancelled` بالفعل) |
| **Idempotency** | نعم — `expenseId` كمفتاح؛ يمنع إلغاء مزدوج |
| **Classification** | Internal Domain Event |

### 13.3 `ExpenseCorrected`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Expenses |
| **Subscribers** | Reporting |
| **Trigger** | تسجيل تصحيح لمصروف سابق (خطأ في المبلغ أو الفئة) دون تعديل السجل الأصلي مباشرة |
| **Payload (High-Level)** | `correctionId, originalExpenseId, tenantId, correctedFields{amount?, categoryId?, ...}, correctedBy, reason, correctedAt` |
| **Business Meaning** | "تصحيح رسمي لمصروف سابق، يبقى الأصل دون تغيير (Immutable) — التصحيح سجل منفصل قابل للتتبع" |
| **Business Preconditions** | المصروف الأصلي (`originalExpenseId`) في حالة `Recorded` (وليس `Cancelled`) |
| **Idempotency** | نعم — `correctionId` كمفتاح |
| **Classification** | Internal Domain Event |

---

## 14. Payroll Domain — Published Events

> **تحديث:** Payroll أصبح Domain كامل **Must-Have في MVP** (قرار سابق بتأجيله لـ Phase 2 أُلغي — راجع Product Bible ADR-26). كل الأحداث أدناه **مُنفَّذة فعليًا في MVP**، وليست توثيقًا استباقيًا فقط.

### 14.1 `EmployeeAdvanceIssued`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Payroll |
| **Subscribers** | Reporting |
| **Trigger** | صرف سلفة أو قرض لموظف، مع خطة سداد عبر دورات رواتب مستقبلية |
| **Payload (High-Level)** | `advanceId, tenantId, employeeId, amount, installmentsCount, installmentAmount, issuedBy, issuedAt` |
| **Business Meaning** | "التزام مالي جديد على الموظف تجاه المنشأة، سيُسدَّد تدريجيًا عبر خصومات مقترحة في دورات رواتب قادمة" |
| **Business Preconditions** | `amount` قيمة موجبة; `installmentsCount` عدد صحيح موجب; الموظف (`employeeId`) نشط |
| **Idempotency** | نعم — `advanceId` كمفتاح |
| **Classification** | Internal Domain Event |

### 14.2 `PayrollAdjustmentSuggested`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Payroll |
| **Subscribers** | Reporting, Notifications (لتنبيه المدير بوجود اقتراحات تحتاج مراجعة) |
| **Trigger** | استيفاء قاعدة مُهيَّأة (`PayrollAdjustmentRule`) بناءً على حدث Attendance مُستهلَك، أو استحقاق قسط سلفة، أو إدخال يدوي من مدير |
| **Payload (High-Level)** | `adjustmentId, tenantId, employeeId, payrollPeriodId, adjustmentType (Deduction/Bonus/Overtime/Penalty), amount, reasonCode (LateAttendance/PerfectAttendance/OvertimeHours/AdvanceRepayment/ManualEntry), sourceReference?, status (Pending), suggestedAt` |
| **Business Meaning** | "اقتراح مالي — **وليس قرارًا نهائيًا** — ناتج عن قاعدة آلية أو إدخال يدوي؛ لن يدخل حساب الراتب الفعلي إلا بعد اعتماد صريح" |
| **Business Preconditions** | الموظف (`employeeId`) نشط وله `SalaryProfile` معرَّف; `payrollPeriodId` لم يُغلَق بعد (`PayrollRunCompleted` لم يُنشَر له بعد); المصدر (`sourceReference`) صالح إن كان مبنيًا على حدث Attendance أو `EmployeeAdvanceIssued` |
| **Idempotency** | نعم — `adjustmentId` كمفتاح؛ يمنع اقتراح نفس التعديل مرتين لنفس المصدر (`sourceReference`) في نفس الفترة |
| **Classification** | Internal Domain Event |

### 14.3 `PayrollAdjustmentApproved`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Payroll |
| **Subscribers** | Reporting |
| **Trigger** | اعتماد مدير لاقتراح تعديل راتب معلَّق |
| **Payload (High-Level)** | `adjustmentId, tenantId, approvedBy, approvedAt` |
| **Business Meaning** | "هذا الاقتراح أصبح رسميًا وسيُحتسَب ضمن دورة الراتب القادمة" |
| **Business Preconditions** | الاقتراح (`adjustmentId`) في حالة `Pending`; المُعتمِد (`approvedBy`) يملك صلاحية اعتماد تعديلات الرواتب |
| **Idempotency** | نعم — `adjustmentId` كمفتاح؛ لا اعتماد مزدوج |
| **Classification** | Internal Domain Event |

### 14.4 `PayrollAdjustmentRejected`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Payroll |
| **Subscribers** | Reporting |
| **Trigger** | رفض مدير لاقتراح تعديل راتب معلَّق |
| **Payload (High-Level)** | `adjustmentId, tenantId, rejectedBy, rejectionReason?, rejectedAt` |
| **Business Meaning** | "هذا الاقتراح لن يُحتسَب ضمن الراتب — يبقى في السجل التاريخي كاقتراح مرفوض لأغراض التدقيق" |
| **Business Preconditions** | الاقتراح (`adjustmentId`) في حالة `Pending` |
| **Idempotency** | نعم — `adjustmentId` كمفتاح |
| **Classification** | Internal Domain Event |

### 14.5 `PayrollRunCompleted`

| الحقل | التفاصيل |
|-------|----------|
| **Publisher** | Payroll |
| **Subscribers** | Reporting, Notifications |
| **Trigger** | اعتماد دورة رواتب كاملة لفترة محددة، بعد مراجعة كل الاقتراحات المعلَّقة (Approve/Reject لكل منها) |
| **Payload (High-Level)** | `payrollRunId, tenantId, period, employeePayslips[{employeeId, baseSalary, totalApprovedAdjustments, netAmount}], completedAt` |
| **Business Meaning** | "دورة رواتب مُعتمَدة ماليًا وجاهزة للصرف — كل مبلغ فيها إما راتب أساسي أو تعديل مُعتمَد صراحة، لا اقتراحات معلَّقة" |
| **Business Preconditions** | كل الموظفين المشمولين لديهم `WorkingHoursCalculated` مكتمل للفترة المعنية; **لا يوجد أي `PayrollAdjustmentSuggested` بحالة `Pending`** مرتبط بهذه الفترة (كل الاقتراحات إما `Approved` أو `Rejected`); لا توجد دورة رواتب (`payrollRunId`) مُعتمَدة مسبقًا لنفس الفترة لنفس الموظفين |
| **Idempotency** | نعم — `payrollRunId` كمفتاح |
| **Classification** | Internal Domain Event |

---

## 15. Reporting Domain — Events

**لا تُصدر Reporting أي Domain Event تجاريًا.** هي دائمًا **مستهلك نهائي (Terminal Consumer)** لكل الأحداث أعلاه، وتبني منها Read Models/Dashboards. لا يوجد Domain آخر يستمع لأي شيء من Reporting.

---

## 16. Full Subscription Matrix (ملخص شامل)

| الحدث | الناشر | المستمعون |
|-------|--------|-----------|
| ShiftOpened | Shift Management | Sales (Read Model), Reporting |
| ShiftClosed | Shift Management | Sales (Read Model), Reporting, Notifications |
| OrderPlaced | Sales | Order Fulfillment, Shift Management |
| SaleCompleted | Sales | Inventory, CRM, Reporting, Notifications, Shift Management |
| SaleRefunded | Sales | Inventory, CRM, Reporting, Notifications |
| DiscountApplied | Sales | Reporting, CRM |
| OrderReady | Order Fulfillment | Notifications, Reporting |
| OrderServed | Order Fulfillment | Sales, Reporting |
| OrderCancelled | Order Fulfillment | Sales, Notifications, Reporting, Shift Management |
| OrderRejected | Order Fulfillment | Sales, Notifications, Shift Management |
| StockLevelLow | Inventory | Notifications, Reporting |
| StockCountFinalized | Inventory | Reporting |
| StockAdjusted | Inventory | Reporting |
| StockItemCreated | Inventory | Menu (Read Model), Purchasing (Read Model), Reporting |
| StockItemDeactivated | Inventory | Menu (Read Model), Purchasing (Read Model), Reporting |
| ItemAvailabilityChanged | Inventory | Sales (Read Model), Order Fulfillment, Reporting |
| InventoryMovementRecorded | Inventory | Reporting |
| GoodsReceived | Purchasing | Inventory, Reporting, Suppliers & Business Accounts (اختياري) |
| PurchaseOrderCreated | Purchasing | Reporting |
| PurchaseOrderCancelled | Purchasing | Reporting |
| SupplierCreated | Suppliers & Business Accounts | Purchasing (Read Model), Reporting |
| SupplierDeactivated | Suppliers & Business Accounts | Purchasing (Read Model), Reporting |
| PurchaseInvoiceRecorded | Suppliers & Business Accounts | Reporting |
| PaymentRecorded | Suppliers & Business Accounts | Reporting |
| SupplierPaymentOverdue | Suppliers & Business Accounts | Notifications, Reporting |
| RecipeUpdated | Menu | Inventory |
| ModifierRecipeImpactUpdated | Menu | Inventory |
| MenuItemPriceChanged | Menu | Sales (Read Model), Reporting |
| MenuItemActivated | Menu | Sales, Order Fulfillment, Reporting |
| MenuItemDeactivated | Menu | Sales, Order Fulfillment, Reporting |
| CustomerCreated | CRM | Reporting |
| DiscountEligibilityFlagged | CRM | Sales |
| EmployeeCreated | Staff | Attendance (Read Model), Payroll (Read Model), Expenses (Read Model), Reporting |
| EmployeeUpdated | Staff | Attendance (Read Model), Payroll (Read Model), Expenses (Read Model), Reporting |
| EmployeeActivated | Staff | Attendance (Read Model), Payroll (Read Model), Expenses (Read Model), Reporting |
| EmployeeDeactivated | Staff | Attendance (Read Model), Payroll (Read Model), Expenses (Read Model), Reporting |
| EmployeeTransferred | Staff | Attendance (Read Model), Payroll (Read Model), Expenses (Read Model), Reporting |
| EmployeeTerminated | Staff | Attendance (Read Model), Payroll (Read Model), Expenses (Read Model), Reporting |
| WorkingHoursCalculated | Attendance | Reporting, Payroll |
| AttendanceExceptionRaised | Attendance | Notifications, Reporting, Payroll |
| ExpenseRecorded | Expenses | Reporting |
| ExpenseCancelled | Expenses | Reporting |
| ExpenseCorrected | Expenses | Reporting |
| EmployeeAdvanceIssued | Payroll | Reporting |
| PayrollAdjustmentSuggested | Payroll | Reporting, Notifications |
| PayrollAdjustmentApproved | Payroll | Reporting |
| PayrollAdjustmentRejected | Payroll | Reporting |
| PayrollRunCompleted | Payroll | Reporting, Notifications |

---

## 17. Cross-Cutting Rules (تنطبق على كل الأحداث أعلاه)

1. **كل حدث يحمل دائمًا:** `tenantId` (إلزامي في كل Payload لضمان العزل بين المستأجرين حتى على مستوى الـ Event Bus).
2. **كل حدث ماليًا حساس** (SaleCompleted, SaleRefunded, GoodsReceived, StockCountFinalized, PurchaseInvoiceRecorded, PaymentRecorded, EmployeeAdvanceIssued, PayrollAdjustmentApproved, PayrollRunCompleted) **يجب أن يكون Idempotent إلزاميًا** — لا استثناءات.
3. **لا حدث يحمل منطق قرار** — الأحداث تُخبر بما حدث (Fact)، ولا تأمر مستهلكًا بفعل شيء (لا Commands، فقط Events).
4. **كل الأحداث حاليًا Internal Domain Events.** أي ترقية لـ Public Integration Event مستقبلًا تتطلب RFC منفصل لمراجعة تبعات الأمان وإصدارات الـ Payload (Versioning).
5. **Audit Logs (Supporting Domain)** يستمع ضمنيًا لكل الأحداث أعلاه دون استثناء لغرض التدقيق، ولم يُذكر صراحة في كل صف تفاديًا للتكرار.
6. **Recipe/Consumption Immutability:** أي حركة مخزون ناتجة عن استهلاك (بيع) تُخزَّن بكمياتها الفعلية كأرقام ثابتة وقت الحدوث، مع الاحتفاظ بمرجع لنسخة الوصفة المُستخدَمة (`recipeVersionUsed`) لأغراض التدقيق فقط. لا يوجد أي مسار يُعيد حساب استهلاك سابق بناءً على وصفة مُحدَّثة لاحقًا.
7. **Tenant-Level Policies:** أي سياسة قابلة للتهيئة تؤثر على قرار Domain تشغيلي (مثل `NegativeStockPolicy`) تُدار عبر **Settings** (Platform Domain)، وتصل للدومين المعني عبر الـports المعتمدة في RFC-004 SA-ADR-06 — وليست جزءًا من منطق العمل المُرمَّز ولا سببًا لاستيراد Platform. يقرأ Create Order السياسة مرة واحدة عند البداية.
8. **Event Ordering Guarantee:** داخل بنية Modular Monolith الحالية، يضمن الـ Event Bus **تسليم الأحداث بنفس ترتيب نشرها لكل Tenant على حدة** (Per-Tenant Ordered Delivery). هذا الضمان هو الأساس الذي تعتمد عليه كل قواعد الـ Immutability والـ Read Models المحلية (مثل: `RecipeUpdated` يصل دائمًا قبل أي `SaleCompleted` يستخدم تلك النسخة، و`SupplierCreated` يصل قبل أي `PurchaseOrderCreated` يشير له). أي انتقال مستقبلي لبنية موزَّعة (Microservices) **يجب أن يحافظ على هذا الضمان صراحة** (مثال: عبر Partitioning بالـ `tenantId` في طابور الرسائل)، وإلا فكل الـ Business Rules المبنية عليه تحتاج مراجعة كاملة.
9. **Employee Attribution Fields اختيارية دائمًا:** `createdByEmployeeId` (OrderPlaced)، `completedByEmployeeId` (SaleCompleted)، `preparedByEmployeeId` (OrderReady)، `servedByEmployeeId` (OrderServed) — كلها حقول **اختيارية (Nullable)**، وليست شرطًا مسبقًا (Business Precondition) لأي من هذه الأحداث. كافيه بموظف واحد أو بيئة لا تتطلب إسنادًا فرديًا دقيقًا يمكنها تجاهلها دون كسر أي Business Rule. الغرض الوحيد منها تحليلي (Reporting KPIs مثل Top Cashiers/Baristas)، وليس تشغيليًا.
10. **Canonical Money:** كل حقل مالي مشار إليه كـ `Money` يستخدم `amountMinor` كـ safe integer و`currencyCode` كرمز ISO-4217 uppercase متحقق منه. تُمنع قيم Floating-Point والعمليات بين عملات مختلفة. قد تكون Money العامة signed حين يسمح المفهوم؛ أما `BasePrice` و`OrderLine.unitPrice` فموجبان حتمًا.
11. **Shift Binding:** `OrderPlaced.shiftId` إلزامي، ويستخدمه Shift Management مباشرة لتحديث Open Orders Counter. لا يجوز استخدام `createdByEmployeeId?` لاستنتاج الشيفت.

---

## 18. Next Steps

### Consistency Summary

- يحتوي الكتالوج على **48 Event contracts** فعلية.
- تحتوي Full Subscription Matrix (§16) على **48 صفًا**، صف واحد لكل Event contract.
- تغييرات Issue #2 لا تضيف Event جديدًا؛ تحدّث Payloads وSubscribers للأحداث المعتمدة فقط.

مع اعتماد RFC-002، الحدود والعقود الحدثية أصبحت مستقرة بما يكفي للبدء في:

**Domain Document: Sales** — أول وثيقة تفصيلية، وفق القالب الثابت:
Purpose · Responsibilities · Out of Scope · Business Concepts · Business Rules · Domain Events (Published) · Domain Events (Subscribed) · Public APIs · Permissions · Future Extensions

---

*نهاية RFC-002.*
