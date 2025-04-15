---

### 📘 Student Attendance System – Postman API Testing Guide

---

#### 🔧 Postman Setup

1. **Create a new Postman Collection**  
   Name it: `Student Attendance System`

2. **Set Environment Variables** in Postman:

| Variable        | Value                          |
|----------------|----------------------------------|
| `baseUrl`       | `http://localhost:5000/api`     |
| `hodToken`      | *(To be set after login)*        |
| `professorToken`| *(To be set after login)*        |
| `hodId`         | *(To be set after registration)* |
| `professorId`   | *(To be set after creation)*     |
| `classId`       | *(To be set after creation)*     |
| `studentId`     | *(To be set after creation)*     |

---

### 🧪 API Testing Flow

---

#### 1. HOD Authentication

**1.1 Register HOD**

- **POST** `{{baseUrl}}/hods/register`  
- **Body (JSON)**:
```json
{
  "collegeName": "Test College",
  "username": "testadmin",
  "password": "password123",
  "email": "your_real_email@example.com"
}
```
- **Expected**: `201 Created`, contains `hodId` and `email`  
- 🔧 Save `hodId` to environment.

---

**1.2 Verify OTP**

- **POST** `{{baseUrl}}/hods/verify-otp`  
- **Body (JSON)**:
```json
{
  "email": "your_real_email@example.com",
  "otp": "123456" // Replace with actual OTP
}
```
- **Expected**: `200 OK`, contains token and `hod` object  
- 🔧 Save `hodToken` to environment.

---

**1.3 HOD Login**

- **POST** `{{baseUrl}}/hods/login`  
- **Body (JSON)**:
```json
{
  "username": "testadmin",
  "password": "password123"
}
```
- **Expected**: `200 OK`, contains token  
- 🔧 Save `hodToken` to environment.

---

**1.4 Get HOD Profile**

- **GET** `{{baseUrl}}/hods/profile`  
- **Headers**:
  - `Authorization: Bearer {{hodToken}}`

---

#### 2. Professor Management

**2.1 Add Professor**

- **POST** `{{baseUrl}}/professors`  
- **Headers**: `Authorization: Bearer {{hodToken}}`  
- **Body (JSON)**:
```json
{
  "name": "Professor Smith",
  "username": "profsmith",
  "password": "prof123456"
}
```
- 🔧 Save `professorId` to environment.

---

**2.2 Get All Professors**

- **GET** `{{baseUrl}}/professors`  
- **Headers**: `Authorization: Bearer {{hodToken}}`

---

**2.3 Get Professor by ID**

- **GET** `{{baseUrl}}/professors/{{professorId}}`  
- **Headers**: `Authorization: Bearer {{hodToken}}`

---

**2.4 Update Professor**

- **PUT** `{{baseUrl}}/professors/{{professorId}}`  
- **Headers**: `Authorization: Bearer {{hodToken}}`  
- **Body (JSON)**:
```json
{
  "name": "Professor John Smith",
  "username": "profsmith"
}
```

---

**2.5 Professor Login**

- **POST** `{{baseUrl}}/professors/login`  
- **Body (JSON)**:
```json
{
  "username": "profsmith",
  "password": "prof123456"
}
```
- 🔧 Save `professorToken` to environment.

---

#### 3. Class Management

**3.1 Create Class**

- **POST** `{{baseUrl}}/classes`  
- **Headers**: `Authorization: Bearer {{hodToken}}`  
- **Body (JSON)**:
```json
{
  "classId": "CS101",
  "className": "Computer Science",
  "division": "A"
}
```
- 🔧 Save `classId` to environment.

---

**3.2 Get All Classes**  
**3.3 Get Class by ID**  
**3.4 Update Class**

> Follow same `GET` and `PUT` structure using `{{baseUrl}}/classes` endpoints.

---

#### 4. Student Management

**4.1 Bulk Upload Students**

- **POST** `{{baseUrl}}/students/bulk-upload`  
- **Headers**: `Authorization: Bearer {{hodToken}}`  
- **Body (form-data)**:
  - `file`: Upload Excel file with columns: `EnrollmentNumber`, `Name`, `Semester`

---

**4.2 Get All Students**  
**4.3 Filter Students by Semester**  
**4.4 Get Student by ID**  
**4.5 Update Student**

> Use relevant `GET`, `PUT`, and query param calls.

- 🔧 Save one `studentId` to environment.

---

#### 5. Relationships – Class ↔ Students ↔ Professors

**5.1 Assign Students to Class**

- **POST** `{{baseUrl}}/classes/CS101/students`  
- **Body (JSON)**:
```json
{
  "studentIds": ["{{studentId}}"]
}
```

---

**5.2 Assign Professors to Class**

- **POST** `{{baseUrl}}/classes/CS101/professors`  
- **Body (JSON)**:
```json
{
  "professorIds": ["{{professorId}}"]
}
```

---

**5.3 Get Professor's Classes**

- **GET** `{{baseUrl}}/professors/classes`  
- **Headers**: `Authorization: Bearer {{professorToken}}`

---

**5.4 Remove Students from Class**  
**5.5 Remove Professors from Class**

> Use `DELETE` with respective body JSONs like in assign steps above.

---

#### 6. Cleanup (Optional)

- **DELETE Student** → `{{baseUrl}}/students/{{studentId}}`  
- **DELETE Professor** → `{{baseUrl}}/professors/{{professorId}}`  
- **DELETE Class** → `{{baseUrl}}/classes/CS101`

All require `Authorization: Bearer {{hodToken}}`

---
