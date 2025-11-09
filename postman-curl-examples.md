# Postman cURL Examples for Employee API

## How to Import into Postman

1. Copy the cURL command below
2. Open Postman
3. Click **Import** button (top left)
4. Select **Raw text** tab
5. Paste the cURL command
6. Click **Import**
7. Replace `YOUR_TOKEN_HERE` with your actual JWT token (get it from login endpoint)

## Get Token First

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

Copy the `token` value from the response.

---

## 1. Get All Employees (Default Pagination)

```bash
curl -X GET 'http://localhost:3000/api/employees' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -H 'Content-Type: application/json'
```

## 2. Get Employees with Pagination

```bash
curl -X GET 'http://localhost:3000/api/employees?page=1&pageSize=10' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -H 'Content-Type: application/json'
```

## 3. Get Employees - Page 2

```bash
curl -X GET 'http://localhost:3000/api/employees?page=2&pageSize=5' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -H 'Content-Type: application/json'
```

## 4. Filter by Email

```bash
curl -X GET 'http://localhost:3000/api/employees?email=john.doe&page=1&pageSize=10' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -H 'Content-Type: application/json'
```

## 5. Filter by Name

```bash
curl -X GET 'http://localhost:3000/api/employees?name=John&page=1&pageSize=10' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -H 'Content-Type: application/json'
```

## 6. Filter by Phone Number

```bash
curl -X GET 'http://localhost:3000/api/employees?phoneNumber=1234&page=1&pageSize=10' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -H 'Content-Type: application/json'
```

## 7. Filter by Department

```bash
curl -X GET 'http://localhost:3000/api/employees?department=Engineering&page=1&pageSize=10' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -H 'Content-Type: application/json'
```

## 8. Combined Filters (Email + Name + Pagination)

```bash
curl -X GET 'http://localhost:3000/api/employees?email=company&name=John&page=1&pageSize=5' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -H 'Content-Type: application/json'
```

## 9. Filter by Manager ID

```bash
curl -X GET 'http://localhost:3000/api/employees?managerId=YOUR_MANAGER_UUID&page=1&pageSize=10' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -H 'Content-Type: application/json'
```

---

## Response Format

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "employeeId": "EMP-2025-000001",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@company.com",
      "phoneNumber": "+1234567890",
      "position": "Software Engineer",
      "department": "Engineering",
      "salary": 75000,
      "hireDate": "2025-01-15T00:00:00.000Z",
      "managerId": null,
      "manager": null,
      "created_at": "2025-11-07T10:00:00.000Z",
      "updated_at": "2025-11-07T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 25,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

## Quick Test Script

Save this as a script and replace `YOUR_TOKEN_HERE`:

```bash
#!/bin/bash
TOKEN="YOUR_TOKEN_HERE"
BASE_URL="http://localhost:3000"

# Get all employees
curl -X GET "${BASE_URL}/api/employees?page=1&pageSize=10" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" | jq .
```

