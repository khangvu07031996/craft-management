# Troubleshooting Guide

## Issue: Empty page after successful login

### Possible Causes:
1. User does not have admin role
2. Backend needs to be restarted to apply changes
3. API errors when fetching employees

### Solutions:

#### 1. Create an Admin User

If your user doesn't have admin role, create one using the script:

```bash
# Create admin user with default credentials
npm run create-admin

# Or specify custom credentials
npm run create-admin admin@example.com password123 Admin User
```

This will create/update a user with admin role.

#### 2. Update Existing User to Admin

You can also update an existing user to admin using SQL:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

#### 3. Restart Backend

After making changes to backend code, restart the server:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

#### 4. Check Browser Console

Open browser developer tools (F12) and check:
- Console logs for errors
- Network tab for failed API requests
- Check if user object has the correct role

#### 5. Verify Backend is Running

```bash
curl http://localhost:3000/api/health
```

Should return: `{"success":true,"message":"Server is running",...}`

#### 6. Check Database Connection

Make sure PostgreSQL is running:

```bash
npm run docker:db
```

#### 7. Clear Browser Cache

Clear localStorage and cookies, then try logging in again.

## Debugging Steps

1. **Check User Role**: After login, check browser console for logged user object
2. **Check API Response**: Verify login API returns user with `role: 'admin'`
3. **Check Network Requests**: See if `/api/employees` request succeeds
4. **Check Redux State**: Use Redux DevTools to see auth state

## Common Errors

### "Access Denied" message
- User doesn't have admin role
- Solution: Create admin user or update existing user role

### Empty page / Blank screen
- Check browser console for JavaScript errors
- Check if API requests are failing
- Verify backend is running and accessible

### 401 Unauthorized
- Token expired or invalid
- Solution: Logout and login again

### 403 Forbidden
- User doesn't have required permissions
- Solution: Ensure user has admin role

