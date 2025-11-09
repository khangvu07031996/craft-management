# Employee Management System

## Overview

Complete employee management module with full CRUD operations, separate from the user system. Only admins can manage employees.

## Database Schema

### Employees Table

```sql
CREATE TABLE employees (
    id UUID PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(50),
    position VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    salary DECIMAL(12, 2),
    hire_date DATE NOT NULL,
    manager_id UUID REFERENCES employees(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Key Features

- **Auto-generated Employee ID**: Format `EMP-YYYY-XXXXXX` (e.g., `EMP-2025-000001`)
- **Self-referential Manager**: Employees can have managers (also employees)
- **Indexes**: On employee_id, email, department, manager_id, position
- **Auto-timestamps**: created_at and updated_at automatically managed

## API Endpoints

All endpoints require:
- ✅ Authentication (JWT token)
- ✅ Admin role

### 1. Get All Employees

```http
GET /api/employees
Authorization: Bearer <admin_token>
```

**Query Parameters (optional):**
- `department` - Filter by department
- `managerId` - Filter by manager ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "employeeId": "EMP-2025-000001",
      "firstName": "John",
      "lastName": "Smith",
      "email": "john.smith@company.com",
      "phoneNumber": "+1234567890",
      "position": "Software Engineer",
      "department": "Engineering",
      "salary": 75000.00,
      "hireDate": "2025-01-15",
      "managerId": null,
      "manager": null,
      "created_at": "2025-11-07T10:00:00.000Z",
      "updated_at": "2025-11-07T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

### 2. Get Employee by ID

```http
GET /api/employees/:id
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "employeeId": "EMP-2025-000001",
    "firstName": "John",
    "lastName": "Smith",
    ...
  }
}
```

### 3. Create Employee

```http
POST /api/employees
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.smith@company.com",
  "phoneNumber": "+1234567890",
  "position": "Software Engineer",
  "department": "Engineering",
  "salary": 75000.00,
  "hireDate": "2025-01-15",
  "managerId": "uuid" // optional
}
```

**Required Fields:**
- `firstName`
- `lastName`
- `email`
- `position`
- `department`
- `hireDate` (format: YYYY-MM-DD)

**Optional Fields:**
- `employeeId` (auto-generated if not provided)
- `phoneNumber`
- `salary`
- `managerId`

**Response:**
```json
{
  "success": true,
  "message": "Employee created successfully",
  "data": { ... }
}
```

### 4. Update Employee

```http
PUT /api/employees/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "position": "Senior Software Engineer",
  "salary": 90000.00
}
```

**All fields optional** - only provided fields will be updated.

**Response:**
```json
{
  "success": true,
  "message": "Employee updated successfully",
  "data": { ... }
}
```

### 5. Delete Employee

```http
DELETE /api/employees/:id
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Employee deleted successfully"
}
```

## Field Details

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| firstName | string | Employee first name | "John" |
| lastName | string | Employee last name | "Smith" |
| email | string | Employee email (unique) | "john@company.com" |
| position | string | Job position | "Software Engineer" |
| department | string | Department name | "Engineering" |
| hireDate | string | Hire date (YYYY-MM-DD) | "2025-01-15" |

### Optional Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| employeeId | string | Employee ID (auto-generated) | "EMP-2025-000001" |
| phoneNumber | string | Phone number | "+1234567890" |
| salary | number | Annual salary | 75000.00 |
| managerId | uuid | Manager's employee ID | "uuid" |

### Auto-Generated Fields

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Unique identifier |
| employeeId | string | Auto-generated if not provided |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

## Validation Rules

### Email
- ✅ Must be valid email format
- ✅ Must be unique across all employees

### Employee ID
- ✅ Must be unique if provided
- ✅ Auto-generated if not provided (format: `EMP-YYYY-XXXXXX`)

### Hire Date
- ✅ Format: `YYYY-MM-DD`
- ✅ Required field

### Manager ID
- ✅ Must reference existing employee
- ✅ Cannot be employee's own ID
- ✅ Optional field

### Salary
- ✅ Decimal number (12,2 precision)
- ✅ Optional field

## Manager Relationship

Employees can have managers (also employees):

```json
{
  "id": "employee-uuid",
  "firstName": "Jane",
  "lastName": "Doe",
  "managerId": "manager-uuid",
  "manager": {
    "id": "manager-uuid",
    "firstName": "John",
    "lastName": "Smith",
    "employeeId": "EMP-2025-000001"
  }
}
```

**Features:**
- Self-referential relationship
- Manager info included in responses
- Cascade delete: Setting manager_id to NULL if manager is deleted

## Filtering

### By Department

```bash
GET /api/employees?department=Engineering
```

### By Manager

```bash
GET /api/employees?managerId=uuid
```

### Combined

```bash
GET /api/employees?department=Engineering&managerId=uuid
```

## Access Control

### Admin Only

All employee endpoints require:
1. Valid JWT token
2. Admin role

**Error Responses:**

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "No token provided. Please authenticate."
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Access denied. Required role: admin",
  "currentRole": "member"
}
```

## Usage Examples

### Create Employee with All Fields

```bash
curl -X POST http://localhost:3000/api/employees \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Smith",
    "email": "john.smith@company.com",
    "phoneNumber": "+1234567890",
    "position": "Software Engineer",
    "department": "Engineering",
    "salary": 75000.00,
    "hireDate": "2025-01-15"
  }'
```

### Create Employee with Manager

```bash
curl -X POST http://localhost:3000/api/employees \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane.doe@company.com",
    "position": "Junior Developer",
    "department": "Engineering",
    "hireDate": "2025-02-01",
    "managerId": "MANAGER_UUID"
  }'
```

### Update Employee

```bash
curl -X PUT http://localhost:3000/api/employees/EMPLOYEE_UUID \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "position": "Senior Software Engineer",
    "salary": 90000.00
  }'
```

### Get All Employees

```bash
curl http://localhost:3000/api/employees \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Filter by Department

```bash
curl "http://localhost:3000/api/employees?department=Engineering" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Delete Employee

```bash
curl -X DELETE http://localhost:3000/api/employees/EMPLOYEE_UUID \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "firstName, lastName, email, position, department, and hireDate are required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "No token provided. Please authenticate."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. Required role: admin",
  "currentRole": "member"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Employee not found with ID: uuid"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "Email is already registered"
}
```

## Testing with Swagger UI

1. Open http://localhost:3000/api-docs
2. Register/Login as admin user
3. Copy the token
4. Click "Authorize" and enter: `Bearer YOUR_TOKEN`
5. Navigate to "Employees" section
6. Test all endpoints interactively

## Database Queries

### Get Employees by Department

```sql
SELECT * FROM employees WHERE department = 'Engineering';
```

### Get Employees by Manager

```sql
SELECT e.*, m.first_name as manager_name
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id
WHERE e.manager_id = 'uuid';
```

### Get All Managers

```sql
SELECT DISTINCT m.*
FROM employees e
JOIN employees m ON e.manager_id = m.id;
```

## Future Enhancements

Potential features to add:
- [ ] Employee search by name
- [ ] Pagination for employee list
- [ ] Employee photo upload
- [ ] Employment history
- [ ] Skills and certifications
- [ ] Performance reviews
- [ ] Leave management
- [ ] Department hierarchy
- [ ] Export to CSV/Excel
- [ ] Bulk import employees

---

**Last Updated**: November 7, 2025
**Version**: 1.0.0

