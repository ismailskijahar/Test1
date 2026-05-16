import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  setDoc,
  updateDoc, 
  doc, 
  deleteDoc, 
  serverTimestamp,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  increment,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Student, 
  AttendanceRecord, 
  FeeDefinition, 
  Payment, 
  Announcement, 
  Homework,
  FeeStructure,
  DueRecord,
  FeeTransaction,
  Receipt,
  OperationType,
  FirestoreErrorInfo,
  UserProfile,
  LeaveRequest,
  Timetable,
  GalleryImage,
  HomeworkSubmission,
  StudentIdSettings
} from '../types';
import { auth } from '../lib/firebase';

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const dataService = {
  // Students
  getStudents: async (schoolId: string) => {
    const path = `schools/${schoolId}/students`;
    try {
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Student[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  getStudent: async (schoolId: string, studentId: string) => {
    const path = `schools/${schoolId}/students/${studentId}`;
    try {
      const snap = await getDoc(doc(db, `schools/${schoolId}/students`, studentId));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as Student;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  // Student ID Settings & Generation
  getStudentIdSettings: async (schoolId: string) => {
    const path = `schools/${schoolId}/settings/student_id`;
    try {
      const snap = await getDoc(doc(db, `schools/${schoolId}/settings`, 'student_id'));
      if (!snap.exists()) {
        // Default settings
        return {
          format: '{SCHOOL}-{YEAR}-{SERIAL}',
          prefix: 'LES',
          yearFormat: 'YYYY',
          serialLength: 4,
          useClassBasedSerial: false,
          useSectionBasedSerial: false,
          school_id: schoolId
        } as StudentIdSettings;
      }
      return snap.data() as StudentIdSettings;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  updateStudentIdSettings: async (schoolId: string, data: Partial<StudentIdSettings>) => {
    const path = `schools/${schoolId}/settings/student_id`;
    try {
      await setDoc(doc(db, `schools/${schoolId}/settings`, 'student_id'), data, { merge: true });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      return false;
    }
  },

  peekNextStudentSerial: async (schoolId: string, studentData: { class: string; section: string }) => {
    const path = `schools/${schoolId}/system_counters`;
    const settings = await dataService.getStudentIdSettings(schoolId);
    if (!settings) return 1;

    let counterId = 'global';
    if (settings.useClassBasedSerial) {
      counterId = `class_${studentData.class}`;
      if (settings.useSectionBasedSerial) {
        counterId = `class_${studentData.class}_section_${studentData.section}`;
      }
    }

    try {
      const counterRef = doc(db, path, counterId);
      const snap = await getDoc(counterRef);
      if (!snap.exists()) return 1;
      return (snap.data().value || 0) + 1;
    } catch (error) {
      console.warn("peekNextStudentSerial error:", error);
      return 1;
    }
  },

  generateStudentId: async (schoolId: string, studentData: { class: string; section: string; roll_no: string }) => {
    const pathCounters = `schools/${schoolId}/system_counters`;
    const pathStudents = `schools/${schoolId}/students`;
    
    try {
      const settings = await dataService.getStudentIdSettings(schoolId);
      if (!settings) throw new Error("Could not fetch Student ID settings");

      const now = new Date();
      const yearStr = settings.yearFormat === 'YYYY' ? now.getFullYear().toString() : now.getFullYear().toString().slice(-2);
      
      // Determine counter path
      let counterId = 'global';
      if (settings.useClassBasedSerial) {
        counterId = `class_${studentData.class}`;
        if (settings.useSectionBasedSerial) {
          counterId = `class_${studentData.class}_section_${studentData.section}`;
        }
      }

      const counterRef = doc(db, pathCounters, counterId);
      
      let studentId = '';
      let isUnique = false;
      let attempts = 0;

      while (!isUnique && attempts < 5) {
        const serialValue = await runTransaction(db, async (transaction) => {
          const counterSnap = await transaction.get(counterRef);
          let nextVal = 1;
          if (counterSnap.exists()) {
            nextVal = (counterSnap.data().value || 0) + 1;
          }
          transaction.set(counterRef, { value: nextVal }, { merge: true });
          return nextVal;
        });

        const serialStr = serialValue.toString().padStart(settings.serialLength, '0');
        
        studentId = settings.format
          .replace('{SCHOOL}', settings.prefix)
          .replace('{YEAR}', yearStr)
          .replace('{CLASS}', studentData.class)
          .replace('{SECTION}', studentData.section)
          .replace('{ROLL}', studentData.roll_no)
          .replace('{SERIAL}', serialStr);

        // Verify uniqueness across the collection
        const q = query(
          collection(db, pathStudents),
          where('custom_id', '==', studentId)
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) throw new Error("Failed to generate a unique Student ID after multiple attempts. Please check counter settings.");

      return studentId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, pathCounters);
      throw error; // keep throwing for UI catch
    }
  },

  subscribeToStudents: (schoolId: string, callback: (students: Student[]) => void) => {
    const path = `schools/${schoolId}/students`;
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Student[];
      callback(students);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  addStudent: async (schoolId: string, student: Omit<Student, 'id' | 'createdAt'>) => {
    const path = `schools/${schoolId}/students`;
    try {
      return await addDoc(collection(db, path), {
        ...student,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  updateStudent: async (schoolId: string, studentId: string, data: Partial<Student>) => {
    const path = `schools/${schoolId}/students/${studentId}`;
    try {
      await updateDoc(doc(db, `schools/${schoolId}/students`, studentId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  deleteStudent: async (schoolId: string, studentId: string) => {
    const path = `schools/${schoolId}/students/${studentId}`;
    try {
      await deleteDoc(doc(db, `schools/${schoolId}/students`, studentId));
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      return false;
    }
  },

  getTeacherForClass: async (schoolId: string, className: string, section: string) => {
    const path = `users`;
    try {
      const q = query(
        collection(db, path), 
        where('school_id', '==', schoolId),
        where('role', '==', 'teacher'),
        where('class_assigned', '==', className),
        where('section_assigned', '==', section)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return { uid: snapshot.docs[0].id, ...snapshot.docs[0].data() } as UserProfile;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return null;
    }
  },

  updateUserProfile: async (uid: string, data: Partial<UserProfile>) => {
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  deleteUser: async (uid: string) => {
    const path = `users/${uid}`;
    try {
      await deleteDoc(doc(db, 'users', uid));
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      return false;
    }
  },

  deleteTeachersByEmail: async (schoolId: string, email: string) => {
    const path = `users`;
    try {
      const q = query(
        collection(db, path), 
        where('school_id', '==', schoolId),
        where('email', '==', email),
        where('role', '==', 'teacher')
      );
      const snapshot = await getDocs(q);
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      return false;
    }
  },

  // Leave Requests
  applyLeave: async (schoolId: string, data: Omit<LeaveRequest, 'id' | 'createdAt' | 'school_id'>) => {
    const path = `schools/${schoolId}/leaves`;
    try {
      const docRef = await addDoc(collection(db, path), {
        ...data,
        school_id: schoolId,
        createdAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return null;
    }
  },

  getLeaveHistory: async (schoolId: string, studentId: string) => {
    const path = `schools/${schoolId}/leaves`;
    try {
      const q = query(collection(db, path), where('student_id', '==', studentId), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  getLeaveRequestsBySchool: async (schoolId: string) => {
    const path = `schools/${schoolId}/leaves`;
    try {
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  updateLeaveRequestStatus: async (schoolId: string, leaveId: string, data: { status: 'approved' | 'rejected', remarks: string, processed_by: string }) => {
    const path = `schools/${schoolId}/leaves/${leaveId}`;
    try {
      await updateDoc(doc(db, `schools/${schoolId}/leaves`, leaveId), data);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      return false;
    }
  },

  // Gallery
  getGallery: async (schoolId: string) => {
    const path = `schools/${schoolId}/gallery`;
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryImage));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  addGalleryImage: async (schoolId: string, data: Omit<GalleryImage, 'id' | 'school_id'>) => {
    const path = `schools/${schoolId}/gallery`;
    try {
      return await addDoc(collection(db, path), {
        ...data,
        school_id: schoolId
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // Timetable
  getTimetable: async (schoolId: string, className: string, section: string) => {
    const path = `schools/${schoolId}/timetables`;
    try {
      const q = query(
        collection(db, path), 
        where('class', '==', className),
        where('section', '==', section)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Timetable;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return null;
    }
  },

  getAttendanceByClassAndDate: async (schoolId: string, className: string, date: string) => {
    const path = `schools/${schoolId}/attendance`;
    try {
      const q = query(
        collection(db, path), 
        where('class', '==', className),
        where('date', '==', date)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  saveAttendanceBatch: async (schoolId: string, records: Omit<AttendanceRecord, 'id'>[]) => {
    const path = `schools/${schoolId}/attendance`;
    try {
      const { writeBatch, doc, collection } = await import('firebase/firestore');
      const batch = writeBatch(db);
      
      for (const record of records) {
        // We use a deterministic ID: studentId_date to allow easy overwriting/updates
        const recordId = `${record.student_id}_${record.date}`;
        const docRef = doc(db, path, recordId);
        batch.set(docRef, record);
      }
      
      await batch.commit();
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      return false;
    }
  },

  getAttendanceForDate: async (schoolId: string, date: string) => {
    const path = `schools/${schoolId}/attendance`;
    try {
      const q = query(collection(db, path), where('date', '==', date));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AttendanceRecord[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  markAttendance: async (schoolId: string, record: Omit<AttendanceRecord, 'id'>) => {
    const path = `schools/${schoolId}/attendance`;
    try {
      return await addDoc(collection(db, path), record);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  getAttendance: async (schoolId: string, studentId?: string) => {
    const path = `schools/${schoolId}/attendance`;
    try {
      let q;
      if (studentId) {
        q = query(collection(db, path), where('student_id', '==', studentId), orderBy('date', 'desc'), limit(100));
      } else {
        q = query(collection(db, path), orderBy('date', 'desc'), limit(100));
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) })) as AttendanceRecord[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  // Fees & Payments
  getFees: async (schoolId: string, studentId?: string) => {
    const path = `schools/${schoolId}/fees`;
    try {
      // In this app, fees are class-based. 
      // For security rules to pass, we might need a sid filter or just follow school rules
      const q = query(collection(db, path));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) })) as FeeDefinition[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  getPayments: async (schoolId: string, studentId?: string) => {
    const path = `schools/${schoolId}/payments`;
    try {
      let q;
      if (studentId) {
        q = query(collection(db, path), where('student_id', '==', studentId), orderBy('payment_date', 'desc'));
      } else {
        q = query(collection(db, path), orderBy('payment_date', 'desc'));
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) })) as Payment[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  // Parents
  getParents: async (schoolId: string): Promise<(UserProfile & { id: string })[]> => {
    const path = `schools/${schoolId}/parents`;
    try {
      const q = query(collection(db, path), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile & { id: string }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  // Teachers (Stored as Users with role 'teacher')
  getTeachers: async (schoolId: string) => {
    const path = `users`;
    try {
      const q = query(
        collection(db, path), 
        where('school_id', '==', schoolId),
        where('role', '==', 'teacher'),
        orderBy('name', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as unknown as UserProfile[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  subscribeToTeachers: (schoolId: string, callback: (teachers: UserProfile[]) => void) => {
    const path = `users`;
    const q = query(
      collection(db, path), 
      where('school_id', '==', schoolId),
      where('role', '==', 'teacher'),
      orderBy('name', 'asc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const teachers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as unknown as UserProfile[];
      callback(teachers);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  addTeacher: async (schoolId: string, teacher: Omit<UserProfile, 'uid' | 'createdAt'>) => {
    const path = `users`;
    const trimmedEmail = (teacher.email || '').trim();
    try {
      // Basic deduplication check
      const q = query(
        collection(db, path), 
        where('school_id', '==', schoolId),
        where('email', '==', trimmedEmail)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        throw new Error('A teacher with this email already exists in this school.');
      }

      const docData = {
        ...teacher,
        email: trimmedEmail,
        school_id: schoolId,
        createdAt: new Date().toISOString()
      };
      
      console.log("Saving teacher to Firestore:", JSON.stringify(docData));
      
      return await addDoc(collection(db, path), docData);
    } catch (error) {
      console.error("Firestore Add Teacher Error:", error);
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // Homework
  getHomework: async (schoolId: string, className?: string, section?: string) => {
    const path = `schools/${schoolId}/homework`;
    try {
      let q = query(collection(db, path), orderBy('createdAt', 'desc'));
      if (className) q = query(q, where('class', '==', className));
      if (section) q = query(q, where('section', '==', section));
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Homework[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  addHomework: async (schoolId: string, homework: Omit<Homework, 'id' | 'createdAt'>) => {
    const path = `schools/${schoolId}/homework`;
    try {
      return await addDoc(collection(db, path), {
        ...homework,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  updateHomework: async (schoolId: string, homeworkId: string, data: Partial<Homework>) => {
    const path = `schools/${schoolId}/homework/${homeworkId}`;
    try {
      await updateDoc(doc(db, `schools/${schoolId}/homework`, homeworkId), data);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      return false;
    }
  },

  deleteHomework: async (schoolId: string, homeworkId: string) => {
    const path = `schools/${schoolId}/homework/${homeworkId}`;
    try {
      await deleteDoc(doc(db, `schools/${schoolId}/homework`, homeworkId));
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      return false;
    }
  },

  markHomeworkAsSeen: async (schoolId: string, homeworkId: string, studentId: string, studentName: string) => {
    const path = `schools/${schoolId}/homework/${homeworkId}/views/${studentId}`;
    try {
      await setDoc(doc(db, `schools/${schoolId}/homework/${homeworkId}/views`, studentId), {
        student_id: studentId,
        student_name: studentName,
        viewed_at: serverTimestamp(),
        school_id: schoolId
      });
      return true;
    } catch (error) {
      // Silently fail if it's just a view tracking error to avoid interrupting user experience
      console.warn("View tracking failed:", error);
      return false;
    }
  },

  getHomeworkViews: async (schoolId: string, homeworkId: string) => {
    const path = `schools/${schoolId}/homework/${homeworkId}/views`;
    try {
      const q = query(collection(db, path));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as { student_id: string; student_name: string; viewed_at: any });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  submitHomework: async (schoolId: string, submission: Omit<HomeworkSubmission, 'id' | 'submittedAt'>) => {
    const path = `schools/${schoolId}/homework_submissions`;
    try {
      return await addDoc(collection(db, path), {
        ...submission,
        submittedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  getHomeworkSubmissions: async (schoolId: string, homeworkId: string) => {
    const path = `schools/${schoolId}/homework_submissions`;
    try {
      const q = query(collection(db, path), where('homework_id', '==', homeworkId), orderBy('submittedAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HomeworkSubmission[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  getStudentSubmissions: async (schoolId: string, studentId: string) => {
    const path = `schools/${schoolId}/homework_submissions`;
    try {
      const q = query(collection(db, path), where('student_id', '==', studentId), orderBy('submittedAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HomeworkSubmission[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  // Announcements
  getAnnouncements: async (schoolId: string) => {
    const path = `schools/${schoolId}/announcements`;
    try {
      const q = query(collection(db, path), orderBy('date', 'desc'), limit(10));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Announcement[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  addAnnouncement: async (schoolId: string, announcement: Omit<Announcement, 'id'>) => {
    const path = `schools/${schoolId}/announcements`;
    try {
      return await addDoc(collection(db, path), {
        ...announcement,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // AI Calls
  getCalls: async (schoolId: string) => {
    const path = `schools/${schoolId}/calls`;
    try {
      const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  getCallQueue: async (schoolId: string) => {
    const path = `schools/${schoolId}/call_queue`;
    try {
      const q = query(collection(db, path), where('status', 'in', ['pending', 'processing']), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  getCallStats: async (schoolId: string) => {
    const path = `schools/${schoolId}/calls`;
    try {
      const snapshot = await getDocs(collection(db, path));
      const calls = snapshot.docs.map(doc => doc.data());
      
      const today = new Date().toISOString().split('T')[0];
      const todayCalls = calls.filter(c => c.timestamp.startsWith(today));
      
      return {
        totalToday: todayCalls.length,
        answered: todayCalls.filter(c => c.status === 'answered').length,
        failed: todayCalls.filter(c => c.status === 'failed').length,
        missed: todayCalls.filter(c => c.status === 'missed').length
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return { totalToday: 0, answered: 0, failed: 0, missed: 0 };
    }
  },

  getStudentAttendanceForMonth: async (schoolId: string, studentId: string, month: string) => {
    const path = `schools/${schoolId}/attendance`;
    try {
      // Query for records matching student_id and starting with the month prefix (YYYY-MM)
      const q = query(
        collection(db, path),
        where('student_id', '==', studentId),
        where('date', '>=', `${month}-01`),
        where('date', '<=', `${month}-31`)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  getSchoolAttendanceForMonth: async (schoolId: string, month: string) => {
    const path = `schools/${schoolId}/attendance`;
    try {
      const q = query(
        collection(db, path),
        where('date', '>=', `${month}-01`),
        where('date', '<=', `${month}-31`)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  getTodayPresentStudents: async (schoolId: string) => {
    const path = `schools/${schoolId}/attendance`;
    try {
      const today = new Date().toISOString().split('T')[0];
      const q = query(
        collection(db, path), 
        where('date', '==', today),
        where('status', '==', 'present')
      );
      const snapshot = await getDocs(q);
      const presentRecords = snapshot.docs.map(doc => doc.data());
      
      // Fetch student details for these records
      const students = await Promise.all(
        presentRecords.map(async (record) => {
          const studentDoc = await getDocs(query(
            collection(db, `schools/${schoolId}/students`),
            where('id', '==', record.student_id)
          ));
          return studentDoc.docs[0]?.data();
        })
      );

      return students.filter(Boolean);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  getWhatsAppLogs: async (schoolId: string) => {
    const path = `schools/${schoolId}/whatsapp_logs`;
    try {
      const q = query(collection(db, path), orderBy('sent_at', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  getWhatsAppStats: async (schoolId: string) => {
    const path = `schools/${schoolId}/whatsapp_logs`;
    try {
      const snapshot = await getDocs(collection(db, path));
      const logs = snapshot.docs.map(doc => doc.data());
      
      const today = new Date().toISOString().split('T')[0];
      const todayLogs = logs.filter(l => {
        const timestamp = l.sent_at?.toDate ? l.sent_at.toDate() : new Date(l.sent_at);
        return timestamp.toISOString().startsWith(today);
      });
      
      return {
        totalToday: todayLogs.length,
        delivered: todayLogs.filter(l => l.status === 'sent' || l.status === 'delivered').length,
        failed: todayLogs.filter(l => l.status === 'failed').length
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return { totalToday: 0, delivered: 0, failed: 0 };
    }
  },

  // Fee Structures
  getFeeStructures: async (schoolId: string) => {
    const path = `schools/${schoolId}/fee_structures`;
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeStructure));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  addFeeStructure: async (schoolId: string, data: Omit<FeeStructure, 'id' | 'createdAt'>) => {
    const path = `schools/${schoolId}/fee_structures`;
    try {
      return await addDoc(collection(db, path), {
        ...data,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  updateFeeStructure: async (schoolId: string, id: string, data: Partial<FeeStructure>) => {
    const path = `schools/${schoolId}/fee_structures/${id}`;
    try {
      await updateDoc(doc(db, `schools/${schoolId}/fee_structures`, id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Due Records
  getDueRecords: async (schoolId: string, studentId?: string) => {
    const path = `schools/${schoolId}/due_records`;
    try {
      let q = query(collection(db, path), orderBy('month', 'desc'));
      if (studentId) q = query(q, where('student_id', '==', studentId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DueRecord));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  saveDueRecord: async (schoolId: string, data: Omit<DueRecord, 'id'>) => {
    const path = `schools/${schoolId}/due_records`;
    try {
      // Deterministic ID for month-student combo to avoid duplicates
      const id = `${data.student_id}_${data.month}`;
      const docRef = doc(db, path, id);
      const { setDoc } = await import('firebase/firestore');
      await setDoc(docRef, data, { merge: true });
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Transactions & Receipts
  collectPayment: async (schoolId: string, txData: Omit<FeeTransaction, 'id' | 'receipt_id' | 'student_metadata' | 'monthly_breakdown' | 'total_fee_due' | 'remaining_due' | 'payment_status'>) => {
    try {
      const { writeBatch, doc, collection, getDocs, query, orderBy, limit } = await import('firebase/firestore');
      const batch = writeBatch(db);
      
      // 1. Fetch FULL Student Data
      const student = await dataService.getStudent(schoolId, txData.student_id);
      if (!student) throw new Error('Student not found');

      // 2. Fetch Fee Structure
      const structures = await dataService.getFeeStructures(schoolId);
      const classKey = student.class_key || `class_${student.class.toLowerCase().replace(/\s+/g, '_')}`;
      const structure = structures.find(s => s.class_key === classKey);
      
      if (!structure) throw new Error(`No fee structure found for class: ${student.class}`);

      // 3. Generate Receipt Number (ARX-Year-Sequence)
      const year = new Date().getFullYear();
      const receiptsQuery = query(
        collection(db, `schools/${schoolId}/receipts`),
        orderBy('receipt_no', 'desc'),
        limit(1)
      );
      const lastReceiptSnap = await getDocs(receiptsQuery);
      let sequence = 1;
      if (!lastReceiptSnap.empty) {
        const lastNo = lastReceiptSnap.docs[0].data().receipt_no;
        if (lastNo && String(lastNo).startsWith(`ARX-${year}-`)) {
          const lastSeq = parseInt(lastNo.split('-').pop());
          if (!isNaN(lastSeq)) sequence = lastSeq + 1;
        }
      }
      const receiptNo = `ARX-${year}-${sequence.toString().padStart(6, '0')}`;

      // 4. Calculate Payment Breakdown & Dues
      const duesSnap = await dataService.getDueRecords(schoolId, txData.student_id);
      const sortedDues = [...duesSnap].sort((a,b) => a.month.localeCompare(b.month));
      
      const { feeEngine } = await import('./feeEngine');
      const totalOverdueBefore = feeEngine.calculateTotalOverdue(sortedDues);
      
      let remainingPayment = txData.amount;
      const breakdown: FeeTransaction['monthly_breakdown'] = [];

      // We need to know which months this tx is covering
      for (const monthStr of txData.months) {
        const due = sortedDues.find(d => d.month === monthStr);
        if (due) {
          const currentMonthDue = Number(due.amount || 0) - Number(due.paid_amount || 0);
          const payAmount = Math.min(remainingPayment, currentMonthDue);
          
          const newPaidAmount = Number(due.paid_amount || 0) + payAmount;
          const status = newPaidAmount >= Number(due.amount) ? 'Paid' : (newPaidAmount > 0 ? 'Partially Paid' : 'Due');

          // Update Due Record in Batch
          const dueRef = doc(db, `schools/${schoolId}/due_records`, due.id);
          batch.update(dueRef, {
            paid_amount: newPaidAmount,
            remaining_amount: Number(due.amount) - newPaidAmount,
            status: status,
            lastPaymentDate: new Date().toISOString()
          });

          breakdown.push({
            month: monthStr,
            fee: Number(due.amount),
            paid: payAmount,
            due: Number(due.amount) - newPaidAmount
          });
          remainingPayment -= payAmount;
        }
      }

      // Calculate overdue balance after this payment
      const overdueMonths = feeEngine.getOverdueMonthsList();
      const totalOverdueAfter = sortedDues.reduce((sum, d) => {
        // If this month was updated in the breakdown, use the updated paid_amount
        const item = breakdown.find(b => b.month === d.month);
        const paidAmount = item ? (Number(d.paid_amount || 0) + item.paid) : Number(d.paid_amount || 0);
        
        if (overdueMonths.includes(d.month) && paidAmount < Number(d.amount)) {
          return sum + (Number(d.amount) - paidAmount);
        }
        return sum;
      }, 0);

      const txRef = doc(collection(db, `schools/${schoolId}/fee_transactions`));
      const receiptRef = doc(collection(db, `schools/${schoolId}/receipts`));
      
      const studentMetadata = {
        name: student.name,
        class: student.class,
        section: student.section,
        roll_no: student.roll_no,
        father_name: student.father_name,
        mother_name: student.mother_name,
        parent_phone: student.father_phone || student.mother_phone || 'N/A',
        address: student.address,
        fee_structure_id: student.fee_structure_id || ''
      };

      const transaction: FeeTransaction = {
        ...txData,
        id: txRef.id,
        receipt_id: receiptRef.id,
        student_metadata: studentMetadata,
        monthly_breakdown: breakdown,
        total_fee_due: totalOverdueBefore,
        remaining_due: totalOverdueAfter,
        payment_status: totalOverdueAfter <= 0 ? 'PAID' : 'PARTIALLY PAID',
        school_id: schoolId
      };

      const receipt: Receipt = {
        id: receiptRef.id,
        receipt_no: receiptNo,
        transaction_id: txRef.id,
        student_id: txData.student_id,
        student_metadata: {
          name: studentMetadata.name,
          class: studentMetadata.class,
          section: studentMetadata.section,
          roll_no: studentMetadata.roll_no,
          father_name: studentMetadata.father_name,
          mother_name: studentMetadata.mother_name,
          parent_phone: studentMetadata.parent_phone,
          address: studentMetadata.address,
        },
        months_paid: txData.months,
        monthly_breakdown: breakdown,
        amount: txData.amount,
        remaining_due: totalOverdueAfter,
        total_session_due: totalOverdueBefore,
        payment_status: totalOverdueAfter <= 0 ? 'PAID' : 'PARTIALLY PAID',
        payment_method: txData.method,
        date: txData.payment_date,
        school_id: schoolId,
        created_by: txData.recorded_by
      };
      
      batch.set(txRef, transaction);
      batch.set(receiptRef, receipt);
      
      await batch.commit();
      return { transaction, receipt };
    } catch (error) {
      console.error('Payment Collection Error:', error);
      handleFirestoreError(error, OperationType.WRITE, `schools/${schoolId}/payments`);
      return null;
    }
  },

  getReceipts: async (schoolId: string, studentId?: string) => {
    const path = `schools/${schoolId}/receipts`;
    try {
      let q = query(collection(db, path), orderBy('date', 'desc'));
      if (studentId) q = query(q, where('student_id', '==', studentId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Receipt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  getTransactionHistory: async (schoolId: string, studentId?: string) => {
    const path = `schools/${schoolId}/fee_transactions`;
    try {
      let q = query(collection(db, path), orderBy('payment_date', 'desc'));
      if (studentId) q = query(q, where('student_id', '==', studentId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeTransaction));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  resetFeesSystem: async (schoolId: string) => {
    try {
      const { writeBatch, getDocs, collection } = await import('firebase/firestore');
      const { feeEngine } = await import('./feeEngine');
      
      // 1. Delete Financial Collections
      const financialCollections = [
        `schools/${schoolId}/fee_transactions`,
        `schools/${schoolId}/receipts`,
        `schools/${schoolId}/due_records`,
        `schools/${schoolId}/payments`,
        `schools/${schoolId}/payment_history`,
        `schools/${schoolId}/partial_payments`,
        `schools/${schoolId}/prepaid_balances`
      ];

      for (const path of financialCollections) {
        let snap = await getDocs(collection(db, path));
        if (!snap.empty) {
          // Process in batches of 450 to stay under Firestore's 500 limit
          let docs = snap.docs;
          while (docs.length > 0) {
            const batch = writeBatch(db);
            const chunk = docs.splice(0, 450);
            chunk.forEach(d => batch.delete(d.ref));
            await batch.commit();
          }
        }
      }

      // 2. Regenerate Fresh Dues
      await feeEngine.syncStudentDues(schoolId);

      return true;
    } catch (error) {
      console.error('Fees System Reset Error:', error);
      handleFirestoreError(error, OperationType.DELETE, `schools/${schoolId}/fees-reset`);
      return false;
    }
  }
};
