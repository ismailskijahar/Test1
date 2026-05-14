# AerovaX Bilingual WhatsApp System - Flutter Integration

The WhatsApp system is fully automated via Firebase Cloud Functions. It detects student absences and sends a bilingual (English & Bengali) message to parents automatically.

## 1. Data Store
WhatsApp message history is stored in the `whatsapp_logs` collection under each school.

```dart
// Fetch WhatsApp logs for a school
Stream<List<WhatsAppLog>> getWhatsAppLogs(String schoolId) {
  return FirebaseFirestore.instance
      .collection('schools/$schoolId/whatsapp_logs')
      .orderBy('sent_at', descending: true)
      .limit(20)
      .snapshots()
      .map((snapshot) => snapshot.docs.map((doc) => WhatsAppLog.fromFirestore(doc)).toList());
}
```

## 2. Message Format
The system sends the following bilingual format:

**English:**
Hello, this is an automated message from AerovaX. Your child [Name] was marked absent...

**Bengali:**
হ্যালো, এটি AerovaX থেকে একটি স্বয়ংক্রিয় বার্তা। আপনার সন্তান [Name] আজ অনুপস্থিত...

## 3. UI Implementation
In the mobile app, you can show a "Notification Bell" icon that links to a WhatsApp history page where parents or teachers can see the delivery status of alerts.

```dart
class WhatsAppLogTile extends StatelessWidget {
  final WhatsAppLog log;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(Icons.message, color: Colors.green),
      title: Text('WhatsApp Alert: ${log.studentName}'),
      subtitle: Text('Status: ${log.status} • ${log.sentAt}'),
      trailing: log.status == 'failed' ? Icon(Icons.error, color: Colors.red) : null,
    );
  }
}
```

## 4. Environment Config
Ensure the following variables are set in your backend environment if using a custom Firebase setup:
- `twilio.sid`: Twilio Account SID
- `twilio.token`: Twilio Auth Token
- `twilio.whatsapp_number`: Twilio WhatsApp Number (e.g., `whatsapp:+14155238886`)
