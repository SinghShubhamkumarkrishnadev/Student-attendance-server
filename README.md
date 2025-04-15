
# Student Attendance System – Postman Collection Setup & API Testing Guide

## 📦 Collection Setup

1. **Create a Postman Collection** named:  
   `Student Attendance System`

2. **Create Environment Variables** in Postman:
   | Variable         | Value (Initial)                  |
   |------------------|----------------------------------|
   | `baseUrl`        | `http://localhost:5000/api`      |
   | `hodToken`       | *(Will be updated after login)*  |
   | `professorToken` | *(Will be updated after login)*  |
   | `hodId`          | *(Saved after HOD registration)* |
   | `professorId`    | *(Saved after professor creation)*|
   | `classId`        | *(Saved after class creation)*   |
   | `studentId`      | *(Saved after student upload)*   |

---

## 🧪 Testing Flow

### 1. HOD Authentication

#### 1.1 Register HOD

- **Method:** POST  
- **URL:** `{{baseUrl}}/hods/register`  
- **Body (JSON):**
```json
{
  "collegeName": "Test College",
  "username": "testadmin",
  "password": "password123",
  "email": "your_real_email@example.com"
}
```
- **Expected Response:**  
  - **Status:** `201`  
  - Contains `hodId` and `email`  
  - **Save `hodId`** to environment

---

#### 1.2 Verify OTP

- **Method:** POST  
- **URL:** `{{baseUrl}}/hods/verify-otp`  
- **Body (JSON):**
```json
{
  "email": "your_real_email@example.com",
  "otp": "123456"
}
```
- **Expected Response:**  
  - **Status:** `200`  
  - Contains `token` and `hod` object  
  - **Save `hodToken`** to environment

---

#### 1.3 HOD Login

- **Method:** POST  
- **URL:** `{{baseUrl}}/hods/login`  
- **Body (JSON):**
```json
{
  "username": "testadmin",
  "password": "password123"
}
```
- **Expected Response:**  
  - **Status:** `200`  
  - Contains `token` and `hod` object  
  - **Save `hodToken`** to environment

---

#### 1.4 Get HOD Profile

- **Method:** GET  
- **URL:** `{{baseUrl}}/hods/profile`  
- **Headers:**
  - `Authorization: Bearer {{hodToken}}`
- **Expected Response:**  
  - **Status:** `200`  
  - Contains `hod` object

---

### 2. Professor Management

#### 2.1 Add Professor

- **Method:** POST  
- **URL:** `{{baseUrl}}/professors`  
- **Headers:**
  - `Authorization: Bearer {{hodToken}}`
- **Body (JSON):**
```json
{
  "name": "Professor Smith",
  "username": "profsmith",
  "password": "prof123456"
}
```
- **Expected Response:**  
  - **Status:** `201`  
  - Contains professor object  
  - **Save `professorId`** to environment

---

#### 2.2 Get All Professors

- **Method:** GET  
- **URL:** `{{baseUrl}}/professors`  
- **Headers:**
  - `Authorization: Bearer {{hodToken}}`
- **Expected Response:**  
  - **Status:** `200`  
  - Contains professors array

---

#### 2.3 Get Professor by ID

- **Method:** GET  
- **URL:** `{{baseUrl}}/professors/{{professorId}}`  
- **Headers:**
  - `Authorization: Bearer {{hodToken}}`
- **Expected Response:**  
  - **Status:** `200`  
  - Contains professor object

---

#### 2.4 Update Professor

- **Method:** PUT  
- **URL:** `{{baseUrl}}/professors/{{professorId}}`  
- **Headers:**
  - `Authorization: Bearer {{hodToken}}`
- **Body (JSON):**
```json
{
  "name": "Professor John Smith",
  "username": "profsmith"
}
```
- **Expected Response:**  
  - **Status:** `200`  
  - Contains updated professor object

---

#### 2.5 Professor Login

- **Method:** POST  
- **URL:** `{{baseUrl}}/professors/login`  
- **Body (JSON):**
```json
{
  "username": "profsmith",
  "password": "prof123456"
}
```
- **Expected Response:**  
  - **Status:** `200`  
  - Contains `token` and professor object  
  - **Save `professorToken`** to environment

---

### 3. Class Management

#### 3.1 Create Class

- **Method:** POST  
- **URL:** `{{baseUrl}}/classes`  
- **Headers:**
  - `Authorization: Bearer {{hodToken}}`
- **Body (JSON):**
```json
{
  "classId": "CS101",
  "className": "Computer Science",
  "division": "A"
}
```
- **Expected Response:**  
  - **Status:** `201`  
  - Contains class object  
  - **Save `classId`** to environment

---

#### 3.2 Get All Classes

- **Method:** GET  
- **URL:** `{{baseUrl}}/classes`  
- **Headers:**
  - `Authorization: Bearer {{hodToken}}`
- **Expected Response:**  
  - **Status:** `200`  
  - Contains classes array

---

#### 3.3 Get Class by ID

- **Method:** GET  
- **URL:** `{{baseUrl}}/classes/CS101`  
- **Headers:**
  - `Authorization: Bearer {{hodToken}}`
- **Expected Response:**  
  - **Status:** `200`  
  - Contains class object

---

#### 3.4 Update Class

- **Method:** PUT  
- **URL:** `{{baseUrl}}/classes/CS101`  
- **Headers:**
  - `Authorization: Bearer {{hodToken}}`
- **Body (JSON):**
```json
{
  "className": "Introduction to Computer Science",
  "division": "A"
}
```
- **Expected Response:**  
  - **Status:** `200`  
  - Contains updated class object

---

### 4. Student Management

#### 4.1 Bulk Upload Students

- Create an Excel file with columns:
  - `EnrollmentNumber`
  - `Name`
  - `Semester`

- **Method:** POST  
- **URL:** `{{baseUrl}}/students/bulk-upload`  
- **Headers:**
  - `Authorization: Bearer {{hodToken}}`
- **Body (form-data):**
  - `file`: `[Select Excel file]` (Type: File)

- **Expected Response:**  
  - **Status:** `201`  
  - Contains `totalUploaded` and `totalSkipped`

---

#### 4.2 Get All Students

- **Method:** GET  
- **URL:** `{{baseUrl}}/students`  
- **Headers:**
  - `Authorization: Bearer {{hodToken}}`
- **Expected Response:**  
  - **Status:** `200`  
  - Contains students array  
  - **Save one `studentId`** to environment

---

#### 4.3 Get Students with Filters

- **Method:** GET  
- **URL:** `{{baseUrl}}/students?semester=1`  
- **Headers:**
  - `Authorization: Bearer {{hodToken}}`
- **Expected Response:**  
  - **Status:** `200`  
  - Contains filtered students array

---

#### 4.4 Get Student by ID

- **Method:** GET  
- **URL:** `{{baseUrl}}/students/{{studentId}}`  
- **Headers:**
  - `Authorization: Bearer {{hodToken}}`
- **Expected Response:**  
  - **Status:** `200`  
  - Contains student object

---

#### 4.5 Update Student

- **Method:** PUT  
- **URL:** `{{baseUrl}}/students/{{studentId}}`  
- **Headers:**
  - `Authorization: Bearer {{hodToken}}`
- **Body (JSON):**
```json
{
  "name": "Updated Student Name",
  "semester": 2
}
```
- **Expected Response:**  
  - **Status:** `200`  
  - Contains updated student object

---

### 5. Class-Student-Professor Relationships

#### 5.1 Assign Students to Class

- **Method:** POST  
- **URL:** `{{baseUrl}}/classes/CS101/students`  
- **Headers:**
  - `Authorization: Bearer {{hodToken}}`
- **Body (JSON):**
```json
{
  "studentIds": ["{{studentId}}"]
}
```
- **Expected Response:**  
  - **Status:** `200`  
  - Success message

---

#### 5.2 Assign Professors to Class

- **Method:** POST  
- **URL:** `{{baseUrl}}/classes/CS101/professors`  
- **Headers:**
  - `Authorization: Bearer {{hodToken}}`
- **Body (JSON):**
```json
{
  "professorIds": ["{{professorId}}"]
}
```
- **Expected Response:**  
  - **Status:** `200`  
  - Success message

---

#### 5.3 Get Professor's Classes

- **Method:** GET  
- **URL:** `{{baseUrl}}/professors/classes`  
- **Headers:**
  - `Authorization: Bearer {{professorToken}}`
- **Expected Response:**  
  - **Status:** `200`  
  - Classes array with assigned students

---

#### 5.4 Remove Students from Class

- **Method:** DELETE  
- **URL:** `{{baseUrl}}/classes/CS101/students`  
- **Headers:**
  - `Authorization: Bearer {{hodToken}}`
- **Body (JSON):**
```json
{
  "studentIds": ["{{studentId}}"]
}
```
- **Expected Response:**  
  - **Status:** `200`  
  - Success message

---

#### 5.5 Remove Professors from Class

- **Method:** DELETE  
- **URL:** `{{baseUrl}}/classes/CS101/professors`  
- **Headers:**
  - `Authorization: Bearer {{hodToken}}`
- **Body (JSON):**
```json
{
  "professorIds": ["{{professorId}}"]
}
```
- **Expected Response:**  
  - **Status:** `200`  
  - Success message

---

### 6. Cleanup (Optional)

#### 6.1 Delete Student

- **Method:** DELETE  
- **URL:** `{{baseUrl}}/students/{{studentId}}`  
- **Headers:**
  - `Authorization: Bearer {{hodToken}}`
- **Expected Response:**  
  - **Status:** `200`  
  - Success message

---

#### 6.2 Delete Professor

- **Method:** DELETE  
- **URL:** `{{baseUrl}}/professors/{{professorId}}`  
- **Headers:**
  - `Authorization: Bearer {{hodToken}}`
- **Expected Response:**  
  - **Status:** `200`  
  - Success message

---

#### 6.3 Delete Class

- **Method:** DELETE  
- **URL:** `{{baseUrl}}/classes/CS101`  
- **Headers:**
  - `Authorization: Bearer {{hodToken}}`
- **Expected Response:**  
  - **Status:** `200`  
  - Success message
