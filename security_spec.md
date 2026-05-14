# Security Specification: ScholarSync SMS

## Data Invariants
1. A Student must belong to a valid School.
2. Attendance records must be linked to a valid Student and School.
3. Fee payments must match the amount specified in Fee definitions or be partial.
4. Only designated roles (super_admin, school_admin, teacher) can mark attendance.
5. Only designated roles (super_admin, school_admin, accountant) can manage fees and payments.
6. Parents can only view data for students listed in their `linked_student_ids` array.
7. Users cannot change their own roles.

## The "Dirty Dozen" Payloads (Red Team Test Cases)

1. **Identity Theft**: Parent attempting to read attendance of a student not in their `linked_student_ids`.
2. **Privilege Escalation**: Teacher attempting to change their role to `super_admin`.
3. **Ghost Writes**: Student attempting to mark themselves as `present`.
4. **Shadow Payments**: Accountant attempting to record a payment for a different school.
5. **Data Poisoning**: Injecting a 1MB string into a student's `name` or `roll_no`.
6. **Orphaned Records**: Creating an attendance record for a student ID that doesn't exist.
7. **Identity Spoofing**: Admin of School A trying to edit students of School B.
8. **Recursive Cost Attack**: Requesting a list of all users as an unauthenticated user.
9. **PII Leak**: Unauthenticated user trying to read user profiles containing emails/phones.
10. **State Shortcut**: Changing a payment status directly without a valid payment date.
11. **Immutable Field Write**: Attempting to change the `createdAt` timestamp of a student.
12. **Bulk Scrape**: Parent attempting to list all students in the school collection.

## Test Runner (Firestore Rules Verification)
*Implementation of tests would follow in `firestore.rules.test.ts` using the Firebase Emulator Suite logic.*
