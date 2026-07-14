# Domain Document: Attendance

**Type:** Domain Document
**Domain Classification:** Core Business Domain (Cafe Engine) — Operational Facts Only
**Depends on:** RFC-001 (Context Map), RFC-002 (Event Catalog), System Freeze v1, Master-System-Flow.md
**Reference Template:** Domain-Sales.md, Domain-Menu.md, Domain-Inventory.md, Domain-Suppliers-Business-Accounts.md, Domain-Purchasing.md, Domain-Order-Fulfillment.md, Domain-CRM.md
**Status:** Draft v1

---

## 1. Domain Purpose

تسجيل حقائق حضور وانصراف الموظفين التشغيلية بدقة: من دخل، متى، من أين (تحقق GPS)، من أي جهاز، ومتى انصرف. Attendance **لا يعرف ولا يهتم بأي أثر مالي** لهذه الحقائق — هو مصدر الحقيقة الوحيد لـ"ماذا حدث فعليًا"، وليس لـ"ماذا يعني هذا ماليًا".

---

## 2. Responsibilities

- تسجيل Check-in / Check-out مع طابع زمني دقيق
- التحقق من الموقع الجغرافي وقت التسجيل (GPS Verification) مقابل نطاق الفرع المسموح به
- التحقق من هوية الجهاز المُستخدَم (Device Verification) لمنع تسجيل حضور موظف من جهاز موظف آخر
- حساب ساعات العمل الفعلية لكل شيفت مكتمل (Check-in + Check-out متطابقين)
- اكتشاف وتصنيف الانحرافات: تأخير (Late)، انصراف مبكر (Early Leave)، غياب (Absence)، خروج عن النطاق الجغرافي، عدم تطابق الجهاز
- إتاحة اعتماد يدوي لحالات استثنائية (مثال: نسيان Check-out، عطل تقني في الموقع الجغرافي)

---

## 3. Out of Scope

| المفهوم | لماذا خارج النطاق | من يملكه |
|---------|---------------------|----------|
| **أي حساب مالي مهما كان بسيطًا** | لا خصم، لا مكافأة، لا حتى "تقدير" أثر مالي — Attendance لا يعرف حتى بوجود مفهوم "راتب" | Payroll |
| بيانات الموظف الأساسية (الاسم، الفرع، الدور الوظيفي، تاريخ التعيين) | Attendance يشير لـ `employeeId` كمرجع خارجي فقط | Staff |
| جدولة الشيفتات المتوقَّعة مسبقًا (من يجب أن يحضر متى) | Attendance يقيس الحضور الفعلي مقابل جدول مُعرَّف مسبقًا، لكن لا يُنشئ الجدول نفسه | Staff |
| قرار "هل هذا التأخير له عواقب؟" | هذا تفسير له أثر (مالي أو غير مالي) — قرار يعود لـ Payroll أو للإدارة، وليس لـ Attendance | Payroll |

---

## 4. Business Concepts

| المفهوم | التعريف |
|---------|---------|
| **AttendanceRecord** | سجل حضور يوم/شيفت واحد لموظف: وقت الدخول، وقت الخروج، ساعات العمل المحسوبة |
| **CheckInEvent** | لحظة تسجيل الدخول، مع الموقع الجغرافي وبصمة الجهاز |
| **CheckOutEvent** | لحظة تسجيل الخروج، بنفس التحقق |
| **WorkingHoursSummary** | إجمالي ساعات العمل المحسوبة والمعتمدة لشيفت مكتمل |
| **GPSVerification** | نتيجة مطابقة موقع الـ Check-in/Check-out بنطاق الفرع الجغرافي المسموح به (Geofence) |
| **DeviceVerification** | نتيجة مطابقة الجهاز المُستخدَم ببصمة الجهاز المُسجَّلة مسبقًا لهذا الموظف |
| **AttendanceException** | انحراف مصنَّف عن الحضور المتوقَّع: `Late` / `EarlyLeave` / `Absent` / `OutOfGeofence` / `DeviceMismatch` |

---

## 5. Business Rules

1. لا يُحسَب `WorkingHoursSummary` إلا لشيفت له Check-in **و** Check-out مكتملان معًا — شيفت بـ Check-in فقط دون Check-out لا يُحتسَب تلقائيًا (يحتاج اعتمادًا يدويًا استثنائيًا).
2. لا يجوز احتساب نفس الشيفت مرتين لنفس الموظف لنفس اليوم (منع الازدواج — Idempotency على `employeeId + date + shiftId`).
3. **Check-in خارج النطاق الجغرافي المسموح (Geofence) يُسجَّل دائمًا كـ `AttendanceException` من نوع `OutOfGeofence`** — لا يُرفَض تلقائيًا (القرار بقبوله أو رفضه يعود لمراجعة يدوية، ليس لـ Attendance نفسه أن يمنع تسجيل الحضور بشكل صارم).
4. **عدم تطابق الجهاز يُسجَّل كـ `AttendanceException` من نوع `DeviceMismatch`** بنفس المنطق — تنبيه، وليس منعًا صارمًا تلقائيًا.
5. التأخير (`Late`) يُحسَب بمقارنة وقت Check-in الفعلي بوقت بداية الشيفت المُجدوَل (من Staff) — Attendance يحتاج معرفة الجدول المتوقَّع، لكن لا يملكه.
6. **Attendance لا يُرجِّح أو يُفسِّر أي انحراف ماليًا بأي شكل** — ينشر الحقيقة المصنَّفة فقط (`AttendanceExceptionRaised`)، وينتهي دوره هناك.
7. كل حدث مُصدَر من Attendance يحمل `employeeId` كمرجع خارجي فقط — لا بيانات موظف مُضمَّنة (اسم، دور...) داخل الـ Payload.

---

## 6. Use Cases / Business Flows

### 6.1 دورة حضور طبيعية كاملة

1. الموظف يفتح تطبيق الموبايل ويُسجِّل Check-in.
2. Attendance يتحقق من الموقع الجغرافي (GPS Verification) وهوية الجهاز (Device Verification).
3. عند بداية الشيفت المُجدوَل، يُقارَن وقت الدخول الفعلي بالمتوقَّع — إن كان متأخرًا، تُنشر `AttendanceExceptionRaised` بنوع `Late`.
4. في نهاية الشيفت، الموظف يُسجِّل Check-out.
5. Attendance يحسب `WorkingHoursSummary` وينشر `WorkingHoursCalculated`.

### 6.2 محاولة Check-in خارج نطاق الفرع الجغرافي

1. الموظف يحاول تسجيل الحضور من موقع خارج Geofence الفرع.
2. Attendance **يسجل المحاولة** (لا يمنعها تلقائيًا) وينشر `AttendanceExceptionRaised` بنوع `OutOfGeofence`.
3. المدير يراجع لاحقًا ويقرر: قبول الحضور، أو اعتباره غيابًا، أو أي إجراء آخر — هذا القرار **خارج حدود Attendance**.

### 6.3 انصراف مبكر

1. الموظف يُسجِّل Check-out قبل نهاية الشيفت المُجدوَل بفارق يتجاوز الحد المسموح (مُهيَّأ في الإعدادات).
2. تُنشر `AttendanceExceptionRaised` بنوع `EarlyLeave`، بالتوازي مع `WorkingHoursCalculated` العادي (الاثنان لا يتعارضان — الساعات تُحسَب بغض النظر عن التصنيف الاستثنائي).

### 6.4 غياب كامل

1. لا يوجد أي Check-in لموظف له شيفت مُجدوَل في اليوم المحدد.
2. عملية دورية (Scheduled Check نهاية اليوم) تكتشف الغياب وتنشر `AttendanceExceptionRaised` بنوع `Absent`.

---

## 7. Aggregate Roots & Entities

| الكيان | النوع | ملاحظات |
|--------|-------|---------|
| **AttendanceRecord** | Aggregate Root | يضبط دورة حياة شيفت حضور واحد: من Check-in حتى الاعتماد النهائي لساعات العمل |
| CheckInEvent | Entity (جزء من AttendanceRecord) | Immutable بعد التسجيل |
| CheckOutEvent | Entity (جزء من AttendanceRecord) | Immutable بعد التسجيل |
| GPSVerification / DeviceVerification | Value Objects (جزء من CheckInEvent/CheckOutEvent) | نتائج تحقق مرتبطة بلحظة التسجيل نفسها، لا كيان مستقل |
| AttendanceException | Entity منفصل (مرتبط بـ AttendanceRecord عبر مرجع) | له سجل تاريخي مستقل قابل للمراجعة، وليس جزءًا حصريًا من دورة حياة AttendanceRecord فقط (قد يُكتشَف الغياب دون وجود AttendanceRecord أصلًا) |

---

## 8. Published Events

(تفاصيل كاملة موثّقة في RFC-002 §11 — هنا فقط قائمة مرجعية)

| الحدث | متى |
|-------|-----|
| `WorkingHoursCalculated` | عند اعتماد ساعات عمل موظف لشيفت مكتمل (Check-in + Check-out) |
| `AttendanceExceptionRaised` | عند اكتشاف أي انحراف: تأخير، انصراف مبكر، غياب، خروج عن النطاق الجغرافي، أو عدم تطابق الجهاز |

---

## 9. Consumed Events

| الحدث | من | كيف يُستخدَم داخل Attendance |
|-------|-----|--------------------------------|
| `EmployeeCreated` | Staff | يُحدِّث Read Model محلي بالموظفين الصالحين لتسجيل الحضور، بما يشمل الفرع الافتراضي (للتحقق الجغرافي) والشيفت الافتراضي (لحساب التأخير المتوقَّع) |
| `EmployeeUpdated` | Staff | يُحدِّث نفس الـ Read Model عند تغيّر بيانات وصفية (قد تشمل تغيّر الشيفت الافتراضي) |
| `EmployeeActivated` | Staff | يُعيد تفعيل الموظف في الـ Read Model — يُسمَح بتسجيل حضوره من جديد |
| `EmployeeDeactivated` | Staff | يُعطِّل الموظف في الـ Read Model — لا يُقبَل أي Check-in جديد له طالما مُعطَّل |
| `EmployeeTransferred` | Staff | يُحدِّث الفرع المرجعي المُستخدَم للتحقق الجغرافي (Geofence) في عمليات الحضور المستقبلية فقط — لا أثر رجعي |
| `EmployeeTerminated` | Staff | يُزيل الموظف نهائيًا من قائمة المسموح لهم بتسجيل حضور جديد؛ السجلات التاريخية تبقى دون تغيير |

> **✅ تحديث (فجوة سابقة مُغلَقة):** هذا القسم كان يحتوي ملاحظة صريحة بعدم قابلية تنفيذ التحقق المرجعي من Staff بسبب غياب أحداثه. **تم حل هذا بالكامل** ببناء Domain-Staff.md ونشر 6 أحداث دورة حياة كاملة — راجع RFC-002 §11.

---

## 10. Permissions

| الصلاحية (Atomic) | الوصف |
|---------------------|-------|
| `Attendance.CheckInOut` | تسجيل حضور/انصراف شخصي (للموظف نفسه) |
| `Attendance.View` | استعراض سجلات الحضور |
| `Attendance.ViewExceptions` | استعراض الانحرافات المُكتشَفة |
| `Attendance.Approve` | اعتماد حالات استثنائية يدويًا (مثال: نسيان Check-out) |
| `Attendance.ManageGeofence` | إدارة نطاق الموقع الجغرافي المسموح لكل فرع |

---

## 11. Data Model

> **ملاحظة معمارية:** مستوى عالٍ فقط (High-Level Schema Direction)، اتساقًا مع باقي Domain Documents.

جداول مرشحة (اتجاه عام فقط):
- `attendance_records` (tenant_id, branch_id, employee_id, check_in_at, check_out_at, worked_hours, status, ...)
- `check_in_events` / `check_out_events` (attendance_record_id, timestamp, gps_lat, gps_lng, gps_verified, device_id, device_verified, ...)
- `attendance_exceptions` (tenant_id, employee_id, exception_type, date, details, ...)

كل الجداول تحمل `tenant_id` إلزاميًا وفق سياسة RLS المُقرَّرة في Product Bible.

---

## 12. Public APIs

> **ملاحظة:** تصميم الـ API التفصيلي يُؤجَّل لوثيقة API Design منفصلة. هنا فقط قائمة القدرات المتوقعة:

- تسجيل Check-in / Check-out (من تطبيق الموبايل)
- استعراض سجل حضور موظف لفترة معيّنة
- استعراض قائمة الانحرافات المُكتشَفة (لكل فرع/موظف)
- اعتماد يدوي لحالة استثنائية

---

## 13. Future Extensions

- **Leave Management:** طلبات إجازة (سنوية، مرضية، طارئة) مع دورة اعتماد — يبني فوق نفس مفهوم `AttendanceException` أو كيان مستقل `LeaveRequest`.
- **Shift Scheduling الكامل:** جدولة استباقية للشيفتات المتوقَّعة (حاليًا مُفترَضة كمُعرَّفة في Staff دون تفاصيل).
- **Performance Reviews:** ربط بيانات الحضور طويلة المدى بتقييمات الأداء — يخدم AI-Readiness المذكور في Product Bible.
- **Biometric Verification:** تحقق بصمة/وجه بدل الاعتماد فقط على GPS + Device Verification.
- ~~**Staff Read Model**~~ — **تم الحل بالكامل** ببناء Domain-Staff.md (راجع القسم 9 المُحدَّث).
- **Schedule-Aware Late Calculation:** استخدام `DefaultShiftAssignment` من Staff Read Model (المتاح الآن) لحساب التأخير بدقة أكبر بناءً على الشيفت الفعلي المُتوقَّع لكل موظف، بدل قيمة عامة ثابتة.

---

## 14. Commercial Packaging Recommendation

> ملاحظة: هذه التوصية معلوماتية بحتة، وليست قيدًا معماريًا (راجع RFC-003). تغييرها لا يتطلب أي تعديل على تصميم هذا الدومين.

**Capability: تسجيل الحضور والانصراف**
Capability ID: `ATT.CheckInOut`
Recommended Packaging: Starter ❌ | Growth ✅ | Professional ✅ | Enterprise ✅

**Capability: تتبع الانحرافات**
Capability ID: `ATT.ExceptionTracking`
Recommended Packaging: Starter ❌ | Growth ✅ | Professional ✅ | Enterprise ✅

---

*نهاية Domain Document: Attendance — v1.*
