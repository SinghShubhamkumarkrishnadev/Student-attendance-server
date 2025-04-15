Setting Up Postman
Create a new Postman collection named "Student Attendance System"
Create environment variables to store tokens and IDs:
baseUrl: http://localhost:5000/api
hodToken
professorToken
hodId
professorId
classId
studentId
Testing Flow
1. HOD Authentication
1.1 Register HOD
Request:

Method: POST
URL: {{baseUrl}}/hods/register
Body (JSON):
{
  "collegeName": "Test College",
  "username": "testadmin",
  "password": "password123",
  "email": "your_real_email@example.com"
}

Expected Response:

Status: 201
Response contains hodId and email
Save the hodId to your environment variables
1.2 Verify OTP
After registration, check your email for the OTP.

Request:

Method: POST
URL: {{baseUrl}}/hods/verify-otp
Body (JSON):
{
  "email": "your_real_email@example.com",
  "otp": "123456"  // Replace with the OTP from your email
}

Expected Response:

Status: 200
Response contains token and hod object
Save the token to your hodToken environment variable
1.3 HOD Login
Request:

Method: POST
URL: {{baseUrl}}/hods/login
Body (JSON):
{
  "username": "testadmin",
  "password": "password123"
}

Expected Response:

Status: 200
Response contains token and hod object
Save the token to your hodToken environment variable
1.4 Get HOD Profile
Request:

Method: GET
URL: {{baseUrl}}/hods/profile
Headers:
Authorization: Bearer {{hodToken}}
Expected Response:

Status: 200
Response contains hod object
2. Professor Management
2.1 Add Professor
Request:

Method: POST
URL: {{baseUrl}}/professors
Headers:
Authorization: Bearer {{hodToken}}
Body (JSON):
{
  "name": "Professor Smith",
  "username": "profsmith",
  "password": "prof123456"
}

Expected Response:

Status: 201
Response contains professor object
Save the professor ID to your professorId environment variable
2.2 Get All Professors
Request:

Method: GET
URL: {{baseUrl}}/professors
Headers:
Authorization: Bearer {{hodToken}}
Expected Response:

Status: 200
Response contains professors array
2.3 Get Professor by ID
Request:

Method: GET
URL: {{baseUrl}}/professors/{{professorId}}
Headers:
Authorization: Bearer {{hodToken}}
Expected Response:

Status: 200
Response contains professor object
2.4 Update Professor
Request:

Method: PUT
URL: {{baseUrl}}/professors/{{professorId}}
Headers:
Authorization: Bearer {{hodToken}}
Body (JSON):
{
  "name": "Professor John Smith",
  "username": "profsmith"
}

Expected Response:

Status: 200
Response contains updated professor object
2.5 Professor Login
Request:

Method: POST
URL: {{baseUrl}}/professors/login
Body (JSON):
{
  "username": "profsmith",
  "password": "prof123456"
}

Expected Response:

Status: 200
Response contains token and professor object
Save the token to your professorToken environment variable
3. Class Management
3.1 Create Class
Request:

Method: POST
URL: {{baseUrl}}/classes
Headers:
Authorization: Bearer {{hodToken}}
Body (JSON):
{
  "classId": "CS101",
  "className": "Computer Science",
  "division": "A"
}

Expected Response:

Status: 201
Response contains class object
Save the class ID to your classId environment variable
3.2 Get All Classes
Request:

Method: GET
URL: {{baseUrl}}/classes
Headers:
Authorization: Bearer {{hodToken}}
Expected Response:

Status: 200
Response contains classes array
3.3 Get Class by ID
Request:

Method: GET
URL: {{baseUrl}}/classes/CS101
Headers:
Authorization: Bearer {{hodToken}}
Expected Response:

Status: 200
Response contains class object
3.4 Update Class
Request:

Method: PUT
URL: {{baseUrl}}/classes/CS101
Headers:
Authorization: Bearer {{hodToken}}
Body (JSON):
{
  "className": "Introduction to Computer Science",
  "division": "A"
}

Expected Response:

Status: 200
Response contains updated class object
4. Student Management
4.1 Bulk Upload Students
Create an Excel file with the following columns:

EnrollmentNumber
Name
Semester
Request:

Method: POST
URL: {{baseUrl}}/students/bulk-upload
Headers:
Authorization: Bearer {{hodToken}}
Body (form-data):
Key: file
Value: [Select your Excel file]
Type: File
Expected Response:

Status: 201
Response contains totalUploaded and totalSkipped
4.2 Get All Students
Request:

Method: GET
URL: {{baseUrl}}/students
Headers:
Authorization: Bearer {{hodToken}}
Expected Response:

Status: 200
Response contains students array
Save one student ID to your studentId environment variable
4.3 Get Students with Filters
Request:

Method: GET
URL: {{baseUrl}}/students?semester=1
Headers:
Authorization: Bearer {{hodToken}}
Expected Response:

Status: 200
Response contains filtered students array
4.4 Get Student by ID
Request:

Method: GET
URL: {{baseUrl}}/students/{{studentId}}
Headers:
Authorization: Bearer {{hodToken}}
Expected Response:

Status: 200
Response contains student object
4.5 Update Student
Request:

Method: PUT
URL: {{baseUrl}}/students/{{studentId}}
Headers:
Authorization: Bearer {{hodToken}}
Body (JSON):
{
  "name": "Updated Student Name",
  "semester": 2
}

Expected Response:

Status: 200
Response contains updated student object
5. Class-Student-Professor Relationships
5.1 Assign Students to Class
Request:

Method: POST
URL: {{baseUrl}}/classes/CS101/students
Headers:
Authorization: Bearer {{hodToken}}
Body (JSON):
{
  "studentIds": ["{{studentId}}"]
}

Expected Response:

Status: 200
Response contains success message
5.2 Assign Professors to Class
Request:

Method: POST
URL: {{baseUrl}}/classes/CS101/professors
Headers:
Authorization: Bearer {{hodToken}}
Body (JSON):
{
  "professorIds": ["{{professorId}}"]
}

Expected Response:

Status: 200
Response contains success message
5.3 Get Professor's Classes
Request:

Method: GET
URL: {{baseUrl}}/professors/classes
Headers:
Authorization: Bearer {{professorToken}}
Expected Response:

Status: 200
Response contains classes array with assigned students
5.4 Remove Students from Class
Request:

Method: DELETE
URL: {{baseUrl}}/classes/CS101/students
Headers:
Authorization: Bearer {{hodToken}}
Body (JSON):
{
  "studentIds": ["{{studentId}}"]
}

Expected Response:

Status: 200
Response contains success message
5.5 Remove Professors from Class
Request:

Method: DELETE
URL: {{baseUrl}}/classes/CS101/professors
Headers:
Authorization: Bearer {{hodToken}}
Body (JSON):
{
  "professorIds": ["{{professorId}}"]
}

Expected Response:

Status: 200
Response contains success message
6. Cleanup (Optional)
6.1 Delete Student
Request:

Method: DELETE
URL: {{baseUrl}}/students/{{studentId}}
Headers:
Authorization: Bearer {{hodToken}}
Expected Response:

Status: 200
Response contains success message
6.2 Delete Professor
Request:

Method: DELETE
URL: {{baseUrl}}/professors/{{professorId}}
Headers:
Authorization: Bearer {{hodToken}}
Expected Response:

Status: 200
Response contains success message
6.3 Delete Class
Request:

Method: DELETE
URL: {{baseUrl}}/classes/CS101
Headers:
Authorization: Bearer {{hodToken}}
Expected Response:

Status: 200
Response contains success message
