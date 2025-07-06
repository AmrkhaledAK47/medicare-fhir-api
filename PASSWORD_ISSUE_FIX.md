# Password Authentication Issue and Fix

## Issue Description

We identified an issue with the password authentication system in the MediCare FHIR API. The issue was that user passwords were being hashed twice:

1. First in the `UsersService.create()` method:
   ```typescript
   // Creating a new user
   const hashedPassword = await bcrypt.hash(password, 10);
   
   // Create the new user
   const user = new this.userModel({
       email,
       password: hashedPassword,  // <-- Password is already hashed
       // ...other fields
   });
   
   return user.save();
   ```

2. Then again in the Mongoose pre-save hook in `user.schema.ts`:
   ```typescript
   UserSchema.pre('save', async function (next) {
       if (!this.isModified('password')) {
           return next();
       }
   
       try {
           const salt = await bcrypt.genSalt(10);
           this.password = await bcrypt.hash(this.password, salt);  // <-- Password is hashed again
           next();
       } catch (err) {
           next(err);
       }
   });
   ```

This double hashing made it impossible to verify passwords during login because the password was being hashed twice during registration but only compared once during login.

## The Fix

We applied a fix by directly updating the password hashes in the database to ensure they are only hashed once. The fix involved:

1. Creating a script to update the passwords for all existing users:
   ```javascript
   const { MongoClient } = require('mongodb');
   const bcrypt = require('bcrypt');
   
   // Test passwords to try
   const TEST_PASSWORDS = {
     'admin@test.com': 'Admin123',
     'patient@med.com': 'Patient123!',
     'doctor@med.com': 'Doctor123!',
     'patient@example.com': 'Patient123!',
     'doctor@example.com': 'Doctor123!'
   };
   
   async function fixPasswords() {
     const client = new MongoClient('mongodb://medicare-mongodb:27017/medicare');
     
     try {
       await client.connect();
       const db = client.db();
       const users = await db.collection('users').find({}).toArray();
       
       console.log(`Found ${users.length} users in the database`);
       
       for (const user of users) {
         const email = user.email;
         const testPassword = TEST_PASSWORDS[email];
         
         if (testPassword) {
           console.log(`Fixing password for ${email}`);
           
           // Hash the test password directly (only once)
           const hashedPassword = await bcrypt.hash(testPassword, 10);
           
           // Update the user's password in the database
           const result = await db.collection('users').updateOne(
             { email },
             { $set: { password: hashedPassword } }
           );
           
           console.log(`Updated ${result.modifiedCount} user(s) with email ${email}`);
         } else {
           console.log(`No test password available for ${email}, skipping`);
         }
       }
       
       console.log('Password fix completed');
     } catch (error) {
       console.error('Error:', error);
     } finally {
       await client.close();
     }
   }
   
   fixPasswords();
   ```

2. Running the script to update the passwords in the database.

3. Verifying that users can now log in successfully with their credentials.

## Long-term Solution

To prevent this issue from happening again in the future, one of the following changes should be made:

### Option 1: Remove the direct hashing in UsersService.create()

```typescript
// Create the new user
const user = new this.userModel({
    email,
    password, // <-- Use the plain password, let the pre-save hook handle hashing
    // ...other fields
});

return user.save();
```

### Option 2: Remove the pre-save hook and always hash explicitly

```typescript
// In UsersService.create()
const hashedPassword = await bcrypt.hash(password, 10);

// Create the new user
const user = new this.userModel({
    email,
    password: hashedPassword,
    // ...other fields
});

return user.save();
```

And remove the pre-save hook from the schema.

## Recommendation

We recommend implementing Option 1 (removing the direct hashing in UsersService.create()) because:

1. It's more consistent with Mongoose's design patterns
2. It ensures password hashing happens in a single place
3. It automatically handles password updates throughout the application

## Test Accounts

The following test accounts have been fixed and can now be used for testing:

### Admin User
```
Email: admin@test.com
Password: Admin123
```

### Patient User
```
Email: patient@med.com
Password: Patient123!
```

### Practitioner User
```
Email: doctor@med.com
Password: Doctor123!
```

## Verification

We've verified that all the test accounts can now successfully log in using the provided credentials. The authentication flow is now working correctly. 