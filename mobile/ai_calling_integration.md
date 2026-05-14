# AerovaX AI Calling System - Flutter Integration

The AI calling system is mostly automated via Firebase Cloud Functions. The mobile application primarily needs to display the status and possibly allow admins to manually re-trigger calls from student profiles.

## 1. Firebase Service (Cloud Firestore)

Ensure your `student` documents contain the parent phone numbers.

```dart
class Student {
  final String id;
  final String name;
  final String fatherPhone;
  final String motherPhone;
  // ... existing fields

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'father_phone': fatherPhone,
      'mother_phone': motherPhone,
      // ...
    };
  }
}
```

## 2. Viewing Call History in Mobile

Listen to the `calls` collection for a specific student to show parents or teachers the automated log.

```dart
Stream<List<CallLog>> getStudentCalls(String schoolId, String studentId) {
  return FirebaseFirestore.instance
      .collection('schools/$schoolId/calls')
      .where('student_id', 'isEqualTo', studentId)
      .orderBy('timestamp', descending: true)
      .snapshots()
      .map((snapshot) => snapshot.docs.map((doc) => CallLog.fromFirestore(doc)).toList());
}
```

## 3. UI Component (Call Log Card)

```dart
class CallLogCard extends StatelessWidget {
  final CallLog log;

  const CallLogCard({Key? key, required this.log}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(
        log.status == 'answered' ? Icons.call : Icons.call_missed,
        color: log.status == 'answered' ? Colors.green : Colors.red,
      ),
      title: Text('Automated Attendance Call'),
      subtitle: Text('Status: ${log.status} • ${timeago.format(log.timestamp)}'),
    );
  }
}
```

## 4. Triggering Logic

No specific Flutter code is needed to *start* the call, as the system triggers automatically when `attendance` is saved:

```dart
// Mark student absent in Flutter
await FirebaseFirestore.instance
    .collection('schools/$schoolId/attendance')
    .add({
      'student_id': studentId,
      'date': '2023-10-27',
      'status': 'absent',
      'school_id': schoolId,
      'marked_by': teacherUid,
    });
// -> This will automatically trigger detectAbsentStudents() Cloud Function
```
