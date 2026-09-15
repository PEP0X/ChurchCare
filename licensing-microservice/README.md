# 🛡️ ChurchCare Licensing & Security Microservice

مشروع مستقل عالي الأمان لإدارة التراخيص والسيريالات المقفلة بالعتاد (Hardware-Locked Licensing)، مبني وفق مبادئ **Clean Architecture** و **Design Patterns**.

---

## 🏗️ المعمارية الهندسية (Architecture & Design Patterns)

يتكون المشروع من طبقتين منفصلتين تماماً:

```text
licensing-microservice/
├── server/               # خادم Rust Microservice الخلفي (Axum + Tokio)
│   ├── src/
│   │   ├── domain/       # الكيانات (Entities) وواجهة المستودع (Repository Trait)
│   │   ├── infrastructure/ # تطبيق قاعدة بيانات Supabase + التشفير (Crypto Service)
│   │   ├── services/     # طبقة منطق العمل (Licensing Service & HWID Validation)
│   │   └── api/          # مسارات ومعالجات Axum HTTP Handlers + CORS
│   └── Cargo.toml
│
└── dashboard/            # لوحة التحكم الأمامية (Svelte 5 + Vite + TailwindCSS)
    ├── src/
    │   ├── lib/          # API Client & Data Types
    │   └── components/   # مكونات الواجهة التفاعلية (Stats, Table, Modal)
    └── package.json
```

### الأنماط التصميمية المطبقة (Design Patterns):
1. **Repository Pattern (`domain/repository.rs`):** فصل تام بين منطق العمل وقاعدة البيانات، بحيث يمكن استبدال Supabase بأي قاعدة بيانات أخرى (PostgreSQL, SQLite, Redis) دون لمس منطق التراخيص.
2. **Service Layer Pattern (`services/licensing_service.rs`):** عزل قواعد التحقق من السيريالات ومنع التزييف وربط الـ HWID والتوقيع الرقمي.
3. **Dependency Injection:** حقن الـ Repository داخل الـ LicensingService عبر مؤشرات الأمان `Arc<dyn LicenseRepository>`.
4. **Hexagonal Architecture (Ports and Adapters):** جعل النواة خالية من أي تبعيات خارجية غير ضرورية.

---

## 🚀 كيفية التشغيل بضغطة زر واحدة

اضغط مرتين على الملف:
```cmd
start_microservice.bat
```
سيبدأ تلقائياً:
1. خادم **Rust Microservice** على المنفذ: `http://localhost:4040`.
2. لوحة تحكم **Svelte 5** على المنفذ: `http://localhost:5173`، وسيفتح المتصفح تلقائياً أمامك!

---

## 📡 واجهات الـ REST API المتوفرة

| المسار | الطريقة | الوصف |
| :--- | :---: | :--- |
| `/health` | `GET` | فحص حالة عمل السيرفر |
| `/api/licenses` | `GET` | جلب قائمة جميع التراخيص والسيريالات للداشبورد |
| `/api/licenses` | `POST` | توليد سيريال جديد لكنيسة/عميل |
| `/api/licenses/:id/reset` | `POST` | فك ربط الجهاز (HWID) للسماح بنقل الترخيص لجهاز جديد |
| `/api/licenses/:id/status` | `POST` | تغيير حالة الترخيص (تفعيل / إلغاء Revoke) |
| `/api/licenses/:id` | `DELETE` | حذف ترخيص نهائياً من قاعدة البيانات |
| `/api/activate` | `POST` | نقطة تفعيل تطبيقات الديسكتوب والتحقق من الـ HWID والتوقيع المشفر |
