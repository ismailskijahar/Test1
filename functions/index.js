const functions = require('firebase-functions');
const admin = require('firebase-admin');
const twilio = require('twilio');
const textToSpeech = require('@google-cloud/text-to-speech');

admin.initializeApp();

// Configuration (should be set via environment variables)
// firebase functions:config:set twilio.sid="xxx" twilio.token="xxx" twilio.number="+123"
const TWILIO_SID = functions.config().twilio.sid;
const TWILIO_TOKEN = functions.config().twilio.token;
const TWILIO_NUMBER = functions.config().twilio.number;

const client = twilio(TWILIO_SID, TWILIO_TOKEN);
const ttsClient = new textToSpeech.TextToSpeechClient();

/**
 * 1. ABSENT DETECTION LOGIC
 * When an attendance record is created with status "absent", 
 * add the student to the CallQueue.
 */
exports.detectAbsentStudents = functions.firestore
  .document('schools/{schoolId}/attendance/{attendanceId}')
  .onCreate(async (snapshot, context) => {
    const data = snapshot.data();
    const { schoolId } = context.params;

    if (data.status !== 'absent') return null;

    const studentId = data.student_id;
    
    // Fetch student and parent details
    const studentDoc = await admin.firestore()
      .doc(`schools/${schoolId}/students/${studentId}`)
      .get();
    
    if (!studentDoc.exists) {
      console.error('Student not found:', studentId);
      return null;
    }

    const studentData = studentDoc.data();
    const parentPhone = studentData.father_phone || studentData.mother_phone;

    if (!parentPhone) {
      console.error('No parent phone found for student:', studentId);
      return null;
    }

    // Add to CallQueue
    return admin.firestore()
      .collection(`schools/${schoolId}/call_queue`)
      .add({
        student_id: studentId,
        student_name: studentData.name,
        parent_phone: parentPhone,
        status: 'pending',
        retries: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        school_id: schoolId
      });
  });

/**
 * 2. AI VOICE GENERATION & CALLING SYSTEM
 * Processes items in the CallQueue by generating voice message and initiating call via Twilio.
 */
exports.processCallQueue = functions.firestore
  .document('schools/{schoolId}/call_queue/{queueId}')
  .onCreate(async (snapshot, context) => {
    const { queueId, schoolId } = context.params;
    const data = snapshot.data();

    // Update status to processing
    await snapshot.ref.update({ status: 'processing' });

    try {
      const message = `Hello, this is AerovaX automated attendance system. Your child ${data.student_name} is marked absent today. Please contact the school if necessary. Thank you.`;
      
      // Use Twilio <Say> for simple Text-to-Speech or Google TTS for high-quality
      // We will use Twilio <Say> for robustness, but I'll describe how to use Google TTS below
      
      const call = await client.calls.create({
        twiml: `<Response><Say voice="alice">${message}</Say></Response>`,
        to: data.parent_phone,
        from: TWILIO_NUMBER,
        statusCallback: `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/updateCallLogs?queueId=${queueId}&schoolId=${schoolId}`,
        statusCallbackEvent: ['completed']
      });

      console.log(`Call initiated: ${call.sid}`);
      return null;
    } catch (error) {
      console.error('Call failed:', error);
      return snapshot.ref.update({ 
        status: 'failed', 
        error: error.message,
        retries: (data.retries || 0) + 1
      });
    }
  });

/**
 * 3. UPDATE CALL LOGS
 * Webhook called by Twilio when the call is finished.
 */
exports.updateCallLogs = functions.https.onRequest(async (req, res) => {
  const { queueId, schoolId } = req.query;
  const { CallStatus, CallDuration, CallSid } = req.body;

  try {
    const queueRef = admin.firestore().doc(`schools/${schoolId}/call_queue/${queueId}`);
    const queueDoc = await queueRef.get();
    const queueData = queueDoc.data();

    // Determine final status
    let finalStatus = 'failed';
    if (CallStatus === 'completed') finalStatus = 'answered';
    else if (CallStatus === 'no-answer') finalStatus = 'missed';

    // 1. Move to Calls collection (Log)
    await admin.firestore().collection(`schools/${schoolId}/calls`).add({
      student_id: queueData.student_id,
      student_name: queueData.student_name,
      parent_phone: queueData.parent_phone,
      status: finalStatus,
      duration: parseInt(CallDuration) || 0,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      school_id: schoolId,
      twilio_sid: CallSid
    });

    // 2. Remove from Queue or mark completed
    await queueRef.delete(); // Delete processed queue item

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error updating call logs:', error);
    res.status(500).send('Error');
  }
});

/**
 * 4. WHATSAPP NOTIFICATION LOGIC
 * When an attendance record is created with status "absent", 
 * send a bilingual WhatsApp message to the parent.
 */
exports.sendWhatsAppNotification = functions.firestore
  .document('schools/{schoolId}/attendance/{attendanceId}')
  .onCreate(async (snapshot, context) => {
    const data = snapshot.data();
    const { schoolId } = context.params;

    if (data.status !== 'absent') return null;

    const studentId = data.student_id;
    
    // Fetch student and parent details
    const studentDoc = await admin.firestore()
      .doc(`schools/${schoolId}/students/${studentId}`)
      .get();
    
    if (!studentDoc.exists) {
      console.error('Student not found for WhatsApp:', studentId);
      return null;
    }

    const studentData = studentDoc.data();
    const parentPhone = studentData.father_phone || studentData.mother_phone;

    if (!parentPhone) {
      console.error('No parent phone found for student (WhatsApp):', studentId);
      return null;
    }

    // Formatting for WhatsApp (Twilio requires "whatsapp:+1234567890")
    const formattedPhone = parentPhone.startsWith('whatsapp:') ? parentPhone : `whatsapp:${parentPhone.startsWith('+') ? parentPhone : '+' + parentPhone}`;

    const message = `Hello, this is an automated message from AerovaX School Management System.\n\nYour child ${studentData.name} from Class ${studentData.class || 'N/A'} was marked absent today.\n\nIf this is due to illness or emergency, please inform the school.\n\nThank you.\n\n---\n\nহ্যালো, এটি AerovaX স্কুল ম্যানেজমেন্ট সিস্টেম থেকে একটি স্বয়ংক্রিয় বার্তা।\n\nআপনার সন্তান ${studentData.name}, শ্রেণী ${studentData.class || 'N/A'}, আজ স্কুলে অনুপস্থিত হিসেবে চিহ্নিত হয়েছে।\n\nযদি অসুস্থতা বা অন্য কোনো জরুরি কারণ থাকে, অনুগ্রহ করে স্কুলকে জানান।\n\nধন্যবাদ।`;

    const whatsappFrom = functions.config().twilio.whatsapp_number || `whatsapp:${TWILIO_NUMBER}`;

    try {
      const response = await client.messages.create({
        body: message,
        from: whatsappFrom,
        to: formattedPhone
      });

      console.log(`WhatsApp sent: ${response.sid}`);

      // Log to WhatsAppLogs
      return admin.firestore().collection(`schools/${schoolId}/whatsapp_logs`).add({
        student_id: studentId,
        student_name: studentData.name,
        parent_phone: parentPhone,
        message: message,
        status: 'sent',
        twilio_sid: response.sid,
        sent_at: admin.firestore.FieldValue.serverTimestamp(),
        school_id: schoolId
      });
    } catch (error) {
      console.error('WhatsApp failed:', error);
      return admin.firestore().collection(`schools/${schoolId}/whatsapp_logs`).add({
        student_id: studentId,
        student_name: studentData.name,
        parent_phone: parentPhone,
        message: message,
        status: 'failed',
        error: error.message,
        sent_at: admin.firestore.FieldValue.serverTimestamp(),
        school_id: schoolId
      });
    }
  });
