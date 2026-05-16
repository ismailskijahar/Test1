import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInAnonymously
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  collectionGroup
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, OperationType, FirestoreErrorInfo, Student } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  teacherLogin: (username: string, password: string) => Promise<boolean>;
  parentLogin: (studentName: string, studentId: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authOperationPending, setAuthOperationPending] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        
        try {
          let docSnap = await getDoc(docRef);
          let retries = 0;
          
          while (!docSnap.exists() && retries < 3) {
            await new Promise(r => setTimeout(r, 500));
            docSnap = await getDoc(docRef);
            retries++;
          }
          
          if (!docSnap.exists()) {
            const cachedParent = localStorage.getItem('aerovax_parent_profile');
            const cachedTeacher = localStorage.getItem('aerovax_teacher_profile');
            
            let initialProfile = null;
            if (user.isAnonymous && cachedParent) {
              const p = JSON.parse(cachedParent);
              if (p.uid === user.uid) initialProfile = p;
            } else if (user.isAnonymous && cachedTeacher) {
              const t = JSON.parse(cachedTeacher);
              if (t.uid === user.uid) initialProfile = t;
            }

            if (initialProfile) {
              await setDoc(docRef, initialProfile);
              docSnap = await getDoc(docRef);
            }
          }

          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setProfile(data);
            if (data.role === 'teacher') localStorage.setItem('aerovax_teacher_profile', JSON.stringify(data));
            if (data.role === 'parent') localStorage.setItem('aerovax_parent_profile', JSON.stringify(data));
          } else {
            if (!user.isAnonymous) {
              const newProfile: UserProfile = {
                uid: user.uid,
                email: user.email || '',
                role: 'admin' as any, // Using 'admin' as requested
                name: user.displayName || 'New Admin',
                school_id: '', // Leave empty to force setup
                createdAt: new Date().toISOString(),
              };
              await setDoc(docRef, newProfile);
              setProfile(newProfile);
            }
          }
        } catch (error: any) {
          if (!(user.isAnonymous && error.code === 'permission-denied')) {
            console.error("Auth sync error:", error);
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    if (authOperationPending) return;
    setAuthOperationPending(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        throw error;
      }
    } finally {
      setAuthOperationPending(false);
    }
  };

  const teacherLogin = async (username: string, password: string) => {
    if (authOperationPending) return false;
    setAuthOperationPending(true);
    try {
      const anonUserResult = await signInAnonymously(auth);
      const anonUid = anonUserResult.user.uid;

      const q = query(
        collection(db, 'users'), 
        where('username', '==', username),
        where('role', '==', 'teacher')
      );
      const snapshot = await getDocs(q);
      const teacherDoc = snapshot.docs.find(doc => doc.data().password === password);
      
      if (teacherDoc) {
        const teacherData = teacherDoc.data() as UserProfile;
        const teacherProfile: UserProfile = {
          ...teacherData,
          uid: anonUid,
          is_session: true
        };
        
        await setDoc(doc(db, 'users', anonUid), teacherProfile);
        setProfile(teacherProfile);
        localStorage.setItem('aerovax_teacher_profile', JSON.stringify(teacherProfile));
        return true;
      } else {
        await signOut(auth);
        return false;
      }
    } catch (error) {
      console.error("Teacher login error:", error);
      await signOut(auth).catch(() => {});
      return false;
    } finally {
      setAuthOperationPending(false);
    }
  };

  const parentLogin = async (studentName: string, studentId: string) => {
    if (authOperationPending) return false;
    setAuthOperationPending(true);
    try {
      const anonUserResult = await signInAnonymously(auth);
      const anonUid = anonUserResult.user.uid;

      const q = query(
        collectionGroup(db, 'students'), 
        where('custom_id', '==', studentId)
      );
      const snapshot = await getDocs(q);
      const studentDoc = snapshot.docs.find(doc => doc.data().name === studentName);
      
      if (studentDoc) {
        const studentData = { id: studentDoc.id, ...studentDoc.data() } as Student;
        const parentProfile: UserProfile = {
          uid: anonUid,
          email: '',
          role: 'parent',
          name: studentName,
          school_id: studentData.school_id,
          linked_student_id: studentData.id,
          createdAt: new Date().toISOString(),
          is_session: true
        };
        
        await setDoc(doc(db, 'users', anonUid), parentProfile);
        setProfile(parentProfile);
        localStorage.setItem('aerovax_parent_profile', JSON.stringify(parentProfile));
        localStorage.setItem('aerovax_parent_student_id', studentData.id);
        return true;
      } else {
        await signOut(auth);
        return false;
      }
    } catch (error) {
      console.error("Parent login error:", error);
      await signOut(auth).catch(() => {});
      return false;
    } finally {
      setAuthOperationPending(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem('aerovax_parent_profile');
    localStorage.removeItem('aerovax_parent_student_id');
    localStorage.removeItem('aerovax_teacher_profile');
    await signOut(auth);
    setProfile(null);
  };

  const updateProfile = (data: Partial<UserProfile>) => {
    if (!profile) return;
    const newProfile = { ...profile, ...data };
    setProfile(newProfile);
    if (newProfile.role === 'teacher') localStorage.setItem('aerovax_teacher_profile', JSON.stringify(newProfile));
    else if (newProfile.role === 'parent') localStorage.setItem('aerovax_parent_profile', JSON.stringify(newProfile));
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, teacherLogin, parentLogin, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
