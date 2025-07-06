

### 📌 **Context:**

You are a senior backend engineer working on a FHIR-compliant EHR system. The current flow has issues with coupling and violating role-based responsibilities. You need to:

* Securely handle **authentication/authorization**
* Implement a **decoupled patient creation flow**
* Refactor user signup based on **access code** sent via email
* Ensure the system integrates with a FHIR server and supports **admin**, **practitioner**, and **patient** roles
* Prepare full **auth integration documentation for frontend**

---

## ✅ **NEXT STEPS & TASKS TO COMPLETE**

### 🧱 1. **Refactor Auth Flow Based on the Following Requirements**

#### 🔐 **Admin Flow**

* Admin logs in via `POST /auth/login` using **email** and **password**
* JWT issued with role-based claims (e.g., `role: admin`)
* Admin creates **Patient** and **Practitioner** FHIR resources via backend:

  * `POST /fhir/patient`
  * `POST /fhir/practitioner`
  * The `email` is **required** for both resources
* Backend generates a **secure access code** and sends it via email (for signup)
* No more use of `/users/patients` or `/users/practitioners` endpoints for creation

#### 🔁 **Refactor this logic**:

```diff
- Create Patient and User in one call (/users/patients)
+ Create Patient resource in FHIR server → Then create User (inactive) in DB linked to FHIR resource ID → Send access code to email
```

---

### 👤 2. **Signup with Access Code**

* Endpoint: `POST /auth/signup`
* Accepts:

  * `email`
  * `access_code`
  * `password` (to be hashed using bcrypt or Argon2)
  * `additional_profile_fields`
* Validates access code and email
* Activates the user and links to the FHIR resource ID
* Issues JWT token after successful signup

---

### 🔄 3. **Restructure Data Model for Auth and FHIR User**

* `User` model includes:

  * `email`
  * `role` (enum: admin, patient, practitioner)
  * `fhir_resource_id`
  * `access_code`
  * `is_registered` (bool)
  * `password_hash`
  * `created_by_admin` (bool)

---

### 🔒 4. **Hash Password and Handle Auth Securely**

* Use **bcrypt** or **Argon2**
* Hash password before saving it to DB
* Validate credentials in login endpoint (`auth/login`)
* Use JWT with claims (`role`, `sub`, `fhir_id`, etc.)

---

### 📬 5. **Send Access Code via Email**

* Use a mail service (SendGrid, Mailgun, or SMTP)
* Compose a clear email:

  * Subject: "Your Access Code to Register on \[Your System]"
  * Body: includes access code, expiration time, and signup link

---

### 🧪 6. **Testing Instructions**

* Write tests for:

  * Creating patient via admin and checking DB for `is_registered: false`
  * Sending access code and capturing email
  * Signing up using access code
  * Preventing reuse of access code
  * Logging in after signup

---

### 🧾 7. **Auth Integration Documentation for Frontend**

Create a **markdown file** `auth_integration.md` with the following sections:

#### 🔐 `POST /auth/login`

* Input: `{ email, password }`
* Output: `{ token, user }`

#### 👥 `POST /fhir/patient` (admin only)

* Input: `{ name, email, dob, ... }`
* Output: `{ fhir_id, message }`
* Side effect: Sends email with access code

#### 🆔 `POST /auth/signup`

* Input: `{ email, access_code, password }`
* Output: `{ token, user }`

#### ✅ `GET /patient/observations` (after login)

* Requires Bearer token
* Returns patient’s Observations linked to FHIR ID

#### 📌 Token Claims (JWT)

```json
{
  "sub": "user_id",
  "role": "patient",
  "fhir_id": "abc-123",
  "iat": 1234567890,
  "exp": 1234569999
}
```

---

## 💡 Best Practices to Follow

* ✅ Use **RBAC** middleware for route protection
* ✅ Use **controller/service** architecture (e.g., `authController.ts`, `userService.ts`)
* ✅ Separate **FHIR API logic** in service layer (`fhirService.ts`)
* ✅ Avoid exposing raw FHIR details to frontend directly
* ✅ Maintain **audit logs** for admin actions (resource creation)

---

