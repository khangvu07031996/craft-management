# User Fields Documentation

## 📋 User Schema

The User model now includes detailed user information with the following fields:

### Required Fields (Must provide during registration)
- ✅ **email** - User email address (unique)
- ✅ **password** - User password (min 6 characters, hashed with bcrypt)
- ✅ **firstName** - User first name
- ✅ **lastName** - User last name

### Optional Fields
- ⭕ **phoneNumber** - User phone number (format: +1234567890)
- ⭕ **address** - User physical address (text)
- ⭕ **age** - User age (integer)
- ⭕ **role** - User role (defaults to 'member' if not specified)

### Auto-Generated Fields
- 🔒 **id** - UUID, auto-generated
- 🔒 **created_at** - Timestamp, auto-generated
- 🔒 **updated_at** - Timestamp, auto-updated

## 🗃️ Database Schema

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    address TEXT,
    role user_role DEFAULT 'member' NOT NULL,
    age INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 📝 Field Details

### email
- **Type**: String (VARCHAR 255)
- **Required**: Yes
- **Unique**: Yes
- **Validation**: Must be valid email format
- **Example**: `"alice@example.com"`

### password
- **Type**: String (VARCHAR 255)
- **Required**: Yes
- **Hashed**: Yes (bcrypt with 10 salt rounds)
- **Validation**: Minimum 6 characters
- **Example**: `"password123"`
- **Note**: Never returned in API responses

### firstName
- **Type**: String (VARCHAR 255)
- **Required**: Yes
- **Example**: `"Alice"`

### lastName
- **Type**: String (VARCHAR 255)
- **Required**: Yes
- **Example**: `"Johnson"`

### phoneNumber
- **Type**: String (VARCHAR 50)
- **Required**: No
- **Format**: International format recommended (+country_code)
- **Example**: `"+1234567890"`
- **Default**: `null`

### address
- **Type**: Text
- **Required**: No
- **Format**: Free text
- **Example**: `"123 Main Street, New York, NY 10001"`
- **Default**: `null`

### role
- **Type**: Enum (user_role)
- **Required**: No
- **Values**: `admin` | `member`
- **Default**: `member`
- **Example**: `"member"`

### age
- **Type**: Integer
- **Required**: No
- **Example**: `28`
- **Default**: `null`

### id
- **Type**: UUID
- **Auto-generated**: Yes
- **Example**: `"84dc9734-b1a6-47d3-8bbb-ca7a0ee0eddb"`

### created_at
- **Type**: Timestamp
- **Auto-generated**: Yes
- **Example**: `"2025-11-07T09:37:51.425Z"`

### updated_at
- **Type**: Timestamp
- **Auto-generated**: Yes
- **Auto-updated**: Yes (on every update)
- **Example**: `"2025-11-07T09:37:51.425Z"`

## 🚀 Usage Examples

### Example 1: Register with All Fields

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "alice123",
    "firstName": "Alice",
    "lastName": "Johnson",
    "phoneNumber": "+1234567890",
    "address": "123 Main Street, New York, NY 10001",
    "age": 28
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "84dc9734-b1a6-47d3-8bbb-ca7a0ee0eddb",
      "email": "alice@example.com",
      "firstName": "Alice",
      "lastName": "Johnson",
      "phoneNumber": "+1234567890",
      "address": "123 Main Street, New York, NY 10001",
      "role": "member",
      "age": 28,
      "created_at": "2025-11-07T09:37:51.425Z",
      "updated_at": "2025-11-07T09:37:51.425Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Example 2: Register with Only Required Fields

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bob@example.com",
    "password": "bob123",
    "firstName": "Bob",
    "lastName": "Smith"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "3199fe62-e21b-4dbc-a254-f827496d8d83",
      "email": "bob@example.com",
      "firstName": "Bob",
      "lastName": "Smith",
      "phoneNumber": null,
      "address": null,
      "role": "member",
      "age": null,
      "created_at": "2025-11-07T09:38:18.379Z",
      "updated_at": "2025-11-07T09:38:18.379Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Example 3: Update User Fields (Admin only)

```bash
curl -X PUT http://localhost:3000/api/users/USER_ID \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+9876543210",
    "address": "456 New Avenue, Los Angeles, CA 90001",
    "age": 29
  }'
```

## ✅ Validation Rules

### Registration Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| email | Required | "Email, password, firstName, and lastName are required" |
| email | Valid format | "Invalid email format" |
| email | Unique | "Email is already registered" |
| password | Required | "Email, password, firstName, and lastName are required" |
| password | Min length 6 | "Password must be at least 6 characters long" |
| firstName | Required | "Email, password, firstName, and lastName are required" |
| lastName | Required | "Email, password, firstName, and lastName are required" |
| phoneNumber | Optional | N/A |
| address | Optional | N/A |
| age | Optional | N/A |
| role | Optional | Defaults to 'member' |

## 🔄 Migration from Old Schema

If you had existing users with a single `name` field, the migration automatically:

1. ✅ Creates new columns (firstName, lastName, phoneNumber, address)
2. ✅ Splits existing `name` into firstName and lastName
   - "John Doe" → firstName: "John", lastName: "Doe"
   - "Alice" → firstName: "Alice", lastName: "Alice"
3. ✅ Makes new columns NOT NULL
4. ✅ Removes old `name` column
5. ✅ Creates indexes for performance

## 📊 Database Indexes

The following indexes are created for optimal query performance:

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_first_name ON users(first_name);
CREATE INDEX idx_users_last_name ON users(last_name);
CREATE INDEX idx_users_phone_number ON users(phone_number);
```

## 🎯 Common Use Cases

### Use Case 1: Basic Registration
User provides only essential information:
- ✅ email
- ✅ password
- ✅ firstName
- ✅ lastName

### Use Case 2: Complete Profile
User provides all available information:
- ✅ All required fields
- ✅ phoneNumber
- ✅ address
- ✅ age

### Use Case 3: Admin Creation
Admin creates a user with admin role:
- ✅ All required fields
- ✅ role: "admin"

### Use Case 4: Profile Update
User/Admin updates contact information:
- ⭕ phoneNumber
- ⭕ address
- ⭕ age

## 📱 Phone Number Format

Recommended formats:
- International: `"+1234567890"`
- US: `"+1-234-567-8900"`
- UK: `"+44-20-1234-5678"`

**Note**: No validation is enforced - you can store any format.

## 🏠 Address Format

Free-text field supporting any address format:
- Simple: `"123 Main St"`
- Detailed: `"123 Main Street, Apt 4B, New York, NY 10001, USA"`
- International: `"221B Baker Street, London, NW1 6XE, United Kingdom"`

## 🔍 Search & Filter (Future Enhancement)

With the indexed fields, you can add search functionality:

```sql
-- Search by name
SELECT * FROM users 
WHERE first_name ILIKE '%alice%' 
   OR last_name ILIKE '%johnson%';

-- Filter by role
SELECT * FROM users WHERE role = 'admin';

-- Search by phone
SELECT * FROM users WHERE phone_number LIKE '%1234%';
```

## 🧪 Testing with Swagger

1. Open http://localhost:3000/api-docs
2. Go to `POST /api/auth/register`
3. Click "Try it out"
4. Use this example:

```json
{
  "email": "test@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "address": "123 Main St, City, State",
  "age": 30
}
```

## 📚 TypeScript Interfaces

```typescript
export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  address?: string;
  role: UserRole;
  age?: number;
  created_at: Date;
  updated_at: Date;
}

export interface RegisterDto {
  email: string;              // Required
  password: string;           // Required
  firstName: string;          // Required
  lastName: string;           // Required
  phoneNumber?: string;       // Optional
  address?: string;           // Optional
  role?: UserRole;            // Optional (defaults to 'member')
  age?: number;               // Optional
}
```

## 💡 Best Practices

1. **Always provide firstName and lastName** during registration
2. **Collect phoneNumber** for better user communication
3. **Collect address** if shipping/billing is needed
4. **Don't expose password** in any API response
5. **Use international phone format** (+country_code)
6. **Validate email** on client-side before submission
7. **Store address** in standardized format if possible

## 🚧 Future Enhancements

Potential improvements:
- [ ] Phone number validation (libphonenumber)
- [ ] Address validation/autocomplete (Google Maps API)
- [ ] Profile picture upload
- [ ] Multiple addresses (billing/shipping)
- [ ] Multiple phone numbers
- [ ] Email verification
- [ ] Phone verification (SMS)
- [ ] Custom fields per tenant
- [ ] Address geocoding

---

**Last Updated**: November 7, 2025
**Version**: 2.0.0 - Enhanced User Fields

