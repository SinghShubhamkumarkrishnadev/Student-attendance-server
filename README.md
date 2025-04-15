---

# 📘 Student Attendance System – Postman Setup & API Testing Guide

## 📁 Collection Setup

1. **Create a new Postman collection** named `Student Attendance System`.
2. **Create Environment Variables** in Postman:
   - `baseUrl`: `http://localhost:5000/api`
   - `hodToken`
   - `professorToken`
   - `hodId`
   - `professorId`
   - `classId`
   - `studentId`

---

## 🔐 1. HOD Authentication

### 1.1 Register HOD

- **Method**: `POST`  
- **URL**: `{{baseUrl}}/hods/register`  
- **Body (JSON)**:
  ```json
  {
    "collegeName": "Test College",
    "username": "testadmin",
    "password": "password123",
    "email": "your_real_email@example.com"
  }
  ```
- **Expected**:
  - `Status`: `201`
  - Response contains `hodId` → Save to `hodId` variable

---

### 1.2 Verify OTP

- **Method**: `POST`  
- **URL**: `{{baseUrl}}/hods/verify-otp`  
- **Body (JSON)**:
  ```json
  {
    "email": "your_real_email@example.com",
    "otp": "123456"  // Replace with actual OTP
  }
  ```
- **Expected**:
  - `Status`: `200`
  - Response contains `token`, `hod` → Save token to `hodToken`

---

### 1.3 HOD Login

- **Method**: `POST`  
- **URL**: `{{baseUrl}}/hods/login`  
- **Body (JSON)**:
  ```json
  {
    "username": "testadmin",
    "password": "password123"
  }
  ```
- **Expected**:
  - `Status`: `200`
  - Response contains `token`, `hod` → Save to `hodToken`

---

### 1.4 Get HOD Profile

- **Method**: `GET`  
- **URL**: `{{baseUrl}}/hods/profile`  
- **Headers**:
  - `Authorization`: `Bearer {{hodToken}}`  
- **Expected**: `200`, HOD object

---

## 👨‍🏫 2. Professor Management

### 2.1 Add Professor

- **Method**: `POST`  
- **URL**: `{{baseUrl}}/professors`  
- **Headers**: `Authorization: Bearer {{hodToken}}`  
- **Body (JSON)**:
  ```json
  {
    "name": "Professor Smith",
    "username": "profsmith",
    "password": "prof123456"
  }
  ```
- **Expected**:
  - `Status`: `201`
  - Save `professorId`

---

### 2.2 Get All Professors

- **Method**: `GET`  
- **URL**: `{{baseUrl}}/professors`  
- **Headers**: `Authorization: Bearer {{hodToken}}`  
- **Expected**: `200`, list of professors

---

### 2.3 Get Professor by ID

- **Method**: `GET`  
- **URL**: `{{baseUrl}}/professors/{{professorId}}`  
- **Headers**: `Authorization: Bearer {{hodToken}}`  
- **Expected**: `200`, professor details

---

### 2.4 Update Professor

- **Method**: `PUT`  
- **URL**: `{{baseUrl}}/professors/{{professorId}}`  
- **Headers**: `Authorization: Bearer {{hodToken}}`  
- **Body (JSON)**:
  ```json
  {
    "name": "Professor John Smith",
    "username": "profsmith"
  }
  ```
- **Expected**: `200`, updated professor object

---

### 2.5 Professor Login

- **Method**: `POST`  
- **URL**: `{{baseUrl}}/professors/login`  
- **Body (JSON)**:
  ```json
  {
    "username": "profsmith",
    "password": "prof123456"
  }
  ```
- **Expected**:
  - `Status`: `200`
  - Save `professorToken`

---

## 🏫 3. Class Management

### 3.1 Create Class

- **Method**: `POST`  
- **URL**: `{{baseUrl}}/classes`  
- **Headers**: `Authorization: Bearer {{hodToken}}`  
- **Body (JSON)**:
  ```json
  {
    "classId": "CS101",
    "className": "Computer Science",
    "division": "A"
  }
  ```
- **Expected**: `201`, save `classId`

---

### 3.2 Get All Classes

- **Method**: `GET`  
- **URL**: `{{baseUrl}}/classes`  
- **Headers**: `Authorization: Bearer {{hodToken}}`  
- **Expected**: `200`, list of classes

---

### 3.3 Get Class by ID

- **Method**: `GET`  
- **URL**: `{{baseUrl}}/classes/CS101`  
- **Headers**: `Authorization: Bearer {{hodToken}}`  
- **Expected**: `200`, class object

---

### 3.4 Update Class

- **Method**: `PUT`  
- **URL**: `{{baseUrl}}/classes/CS101`  
- **Headers**: `Authorization: Bearer {{hodToken}}`  
- **Body (JSON)**:
  ```json
  {
    "className": "Introduction to Computer Science",
    "division": "A"
  }
  ```
- **Expected**: `200`, updated class object

---

## 👨‍🎓 4. Student Management

### 4.1 Bulk Upload Students

- **Method**: `POST`  
- **URL**: `{{baseUrl}}/students/bulk-upload`  
- **Headers**: `Authorization: Bearer {{hodToken}}`  
- **Body (form-data)**:
  - `file`: (Select Excel File with columns: `EnrollmentNumber`, `Name`, `Semester`)  
- **Expected**: `201`, success + skip count

---

### 4.2 Get All Students

- **Method**: `GET`  
- **URL**: `{{baseUrl}}/students`  
- **Headers**: `Authorization: Bearer {{hodToken}}`  
- **Expected**: `200`, students array  
- Save a `studentId`

---

### 4.3 Get Students with Filter

- **Method**: `GET`  
- **URL**: `{{baseUrl}}/students?semester=1`  
- **Headers**: `Authorization: Bearer {{hodToken}}`  
- **Expected**: `200`, filtered list

---

### 4.4 Get Student by ID

- **Method**: `GET`  
- **URL**: `{{baseUrl}}/students/{{studentId}}`  
- **Headers**: `Authorization: Bearer {{hodToken}}`  
- **Expected**: `200`, student object

---

### 4.5 Update Student

- **Method**: `PUT`  
- **URL**: `{{baseUrl}}/students/{{studentId}}`  
- **Headers**: `Authorization: Bearer {{hodToken}}`  
- **Body (JSON)**:
  ```json
  {
    "name": "Updated Student Name",
    "semester": 2
  }
  ```
- **Expected**: `200`, updated object

---

## 🔁 5. Class ↔ Student ↔ Professor Relationships

### 5.1 Assign Students to Class

- **Method**: `POST`  
- **URL**: `{{baseUrl}}/classes/CS101/students`  
- **Headers**: `Authorization: Bearer {{hodToken}}`  
- **Body (JSON)**:
  ```json
  {
    "studentIds": ["{{studentId}}"]
  }
  ```
- **Expected**: `200`, success message

---

### 5.2 Assign Professors to Class

- **Method**: `POST`  
- **URL**: `{{baseUrl}}/classes/CS101/professors`  
- **Headers**: `Authorization: Bearer {{hodToken}}`  
- **Body (JSON)**:
  ```json
  {
    "professorIds": ["{{professorId}}"]
  }
  ```
- **Expected**: `200`, success message

---

### 5.3 Get Professor's Classes

- **Method**: `GET`  
- **URL**: `{{baseUrl}}/professors/classes`  
- **Headers**: `Authorization: Bearer {{professorToken}}`  
- **Expected**: `200`, list of classes with students

---

### 5.4 Remove Students from Class

- **Method**: `DELETE`  
- **URL**: `{{baseUrl}}/classes/CS101/students`  
- **Headers**: `Authorization: Bearer {{hodToken}}`  
- **Body (JSON)**:
  ```json
  {
    "studentIds": ["{{studentId}}"]
  }
  ```
- **Expected**: `200`, success message

---

### 5.5 Remove Professors from Class

- **Method**: `DELETE`  
- **URL**: `{{baseUrl}}/classes/CS101/professors`  
- **Headers**: `Authorization: Bearer {{hodToken}}`  
- **Body (JSON)**:
  ```json
  {
    "professorIds": ["{{professorId}}"]
  }
  ```
- **Expected**: `200`, success message

---

## 🧹 6. Cleanup (Optional)

### 6.1 Delete Student

- **Method**: `DELETE`  
- **URL**: `{{baseUrl}}/students/{{studentId}}`  
- **Headers**: `Authorization: Bearer {{hodToken}}`  
- **Expected**: `200`, success message

---

### 6.2 Delete Professor

- **Method**: `DELETE`  
- **URL**: `{{baseUrl}}/professors/{{professorId}}`  
- **Headers**: `Authorization: Bearer {{hodToken}}`  
- **Expected**: `200`, success message

---

### 6.3 Delete Class

- **Method**: `DELETE`  
- **URL**: `{{baseUrl}}/classes/CS101`  
- **Headers**: `Authorization: Bearer {{hodToken}}`  
- **Expected**: `200`, success message

---
