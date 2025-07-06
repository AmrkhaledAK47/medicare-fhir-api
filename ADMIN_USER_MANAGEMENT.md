# Admin User Management for MediCare FHIR API

This document outlines the admin user management system for the MediCare FHIR API, focusing on how to create, manage, and maintain admin accounts.

## Overview

The admin user management system follows these key principles:

1. **First Admin Exception**: The first user to register without an access code is automatically assigned the admin role.
2. **Admin Creation Script**: A script is provided to reset the database and create a new admin user with predefined credentials.
3. **Admin-to-Admin Creation**: Existing admins can create new admin users directly through an API endpoint without requiring access codes.

## Admin User Creation Methods

### 1. Reset and Create Admin Script

The `reset-and-create-admin.js` script provides a way to reset the database and create a new admin user with predefined credentials. This is useful for initial setup or when you need to reset the system.

```bash
# Run the script
node scripts/reset-and-create-admin.js
```

The script will:
- Delete all existing users from the database (after confirmation)
- Create a new admin user with the following default credentials:
  - Email: admin@medicare.com
  - Password: AdminPass123!
  - Name: System Administrator

You can customize these values using environment variables:
```bash
ADMIN_EMAIL=custom@example.com ADMIN_PASSWORD=CustomPass123! ADMIN_NAME="Custom Admin" node scripts/reset-and-create-admin.js
```

### 2. Admin-to-Admin Creation API

Existing admin users can create new admin users directly through the API without requiring access codes:

```
POST /api/users/admin
```

With payload:
```json
{
  "name": "New Admin",
  "email": "newadmin@example.com",
  "password": "SecurePassword123!"
}
```

This endpoint:
- Requires authentication with an admin token
- Creates a new admin user with ACTIVE status
- Returns the newly created admin user details

### 3. First User Exception

The first user to register in the system (when no other users exist) is automatically assigned the admin role, even without an access code. This allows for initial system setup.

```
POST /api/auth/register
```

With payload:
```json
{
  "name": "First Admin",
  "email": "firstadmin@example.com",
  "password": "SecurePassword123!"
}
```

## Testing Admin User Creation

A test script is provided to verify the admin user creation functionality:

```bash
# Run the test script
./scripts/test-admin-creation.sh
```

The script tests:
1. Login with the default admin account
2. Creating a new admin user via the API
3. Login with the newly created admin account
4. Verifying admin permissions by listing all users

## Security Considerations

- Admin accounts have full system access, so they should be created with care
- Use strong passwords for admin accounts
- Regularly audit the list of admin users
- Consider implementing additional security measures like two-factor authentication for admin accounts

## API Endpoints for Admin Management

- `POST /api/users/admin`: Create a new admin user (Admin only)
- `GET /api/users?role=admin`: List all admin users (Admin only)
- `DELETE /api/users/:id`: Delete a user, including admins (Admin only)
- `PUT /api/users/:id`: Update a user, including admins (Admin only) 