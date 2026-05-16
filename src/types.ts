export interface StudentIdSettings {
  format: string;
  prefix: string;
  yearFormat: 'YYYY' | 'YY';
  serialLength: number;
  useClassBasedSerial: boolean;
  useSectionBasedSerial: boolean;
  school_id: string;
}

export type UserRole = 'super_admin' | 'school_admin' | 'accountant' | 'teacher' | 'parent';

export interface TeacherAssignment {
  class: string;
  section: string;
  subject: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  phone?: string;
  avatar_url?: string;
  school_id: string;
  school_name?: string;
  linked_student_id?: string;
  createdAt: string;
  // Fields for Teacher Login
  username?: string;
  password?: string;
  class_assigned?: string;
  section_assigned?: string;
  subject_assigned?: string;
  assignments?: TeacherAssignment[];
  class_teacher_of?: {
    class: string;
    section: string;
  };
  is_session?: boolean;
}

export interface Student {
  id: string;
  custom_id: string;
  name: string;
  roll_no: string;
  class: string;
  section: string;
  dob: string;
  father_name: string;
  mother_name: string;
  address: string;
  father_phone: string;
  mother_phone: string;
  avatar_url?: string;
  admission_fee?: number;
  monthly_fee?: number;
  school_id: string;
  parent_id?: string;
  fee_structure_id?: string;
  class_key?: string;
  is_dropout: boolean;
  createdAt: string;
}

export interface ParentProfile {
  uid: string;
  name: string;
  phone: string;
  linked_student_ids: string[];
  school_id: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string; // ISO date YYYY-MM-DD
  status: 'present' | 'absent';
  marked_by: string;
  school_id: string;
}

export interface FeeDefinition {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  class: string;
  school_id: string;
}

export interface Payment {
  id: string;
  student_id: string;
  fee_id: string;
  amount_paid: number;
  payment_date: string;
  method: 'cash' | 'upi' | 'bank';
  recorded_by: string;
  school_id: string;
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  date: string;
  image_url?: string;
  school_id: string;
  target_roles?: UserRole[];
}

export interface Attachment {
  url: string;
  name: string;
  type: string;
}

export interface Homework {
  id: string;
  title: string;
  description: string;
  subject: string;
  class: string;
  section: string;
  due_date: string;
  attachments?: (string | Attachment)[];
  teacher_id: string;
  school_id: string;
  is_holiday_homework?: boolean;
  createdAt: string;
}

export interface HomeworkSubmission {
  id: string;
  homework_id: string;
  student_id: string;
  student_name: string;
  content: string;
  attachments?: (string | Attachment)[];
  school_id: string;
  submittedAt: string;
}

export interface LeaveRequest {
  id: string;
  student_id: string;
  parent_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  remarks?: string;
  processed_by?: string;
  school_id: string;
  createdAt: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  caption: string;
  date: string;
  school_id: string;
}

export interface TimetableEntry {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  periods: {
    time: string;
    subject: string;
    teacher: string;
  }[];
}

export interface Timetable {
  id: string;
  class: string;
  section: string;
  entries: TimetableEntry[];
  school_id: string;
}

export interface FeeStructure {
  id: string;
  class_name: string;
  class_key: string; // e.g., class_1
  admission_fee: number;
  monthly_fee: number;
  transport_fee: number;
  exam_fee: number;
  school_id: string;
  active: boolean;
  createdAt: string;
}

export type PaymentStatus = 'Paid' | 'Due' | 'Overdue' | 'Partially Paid' | 'Prepaid';

export interface DueRecord {
  id: string;
  student_id: string;
  month: string; // YYYY-MM
  amount: number;
  paid_amount: number;
  status: PaymentStatus;
  school_id: string;
  dueDate: string; // ISO date
  lastPaymentDate?: string;
  remaining_amount?: number;
}

export interface FeeTransaction {
  id: string;
  student_id: string;
  student_metadata: {
    name: string;
    class: string;
    section: string;
    roll_no: string;
    father_name: string;
    mother_name: string;
    parent_phone: string;
    address: string;
    fee_structure_id: string;
  };
  amount: number;
  payment_date: string;
  method: 'cash' | 'upi' | 'bank' | 'card';
  months: string[]; // List of months being paid/partially paid
  monthly_breakdown: {
    month: string;
    fee: number;
    paid: number;
    due: number;
  }[];
  total_fee_due: number;
  remaining_due: number;
  payment_status: 'PAID' | 'PARTIALLY PAID' | 'DUE' | 'OVERDUE';
  remarks?: string;
  recorded_by: string;
  school_id: string;
  receipt_id: string;
}

export interface Receipt {
  id: string;
  receipt_no: string;
  transaction_id: string;
  student_id: string;
  student_metadata: {
    name: string;
    class: string;
    section: string;
    roll_no: string;
    father_name: string;
    mother_name: string;
    parent_phone: string;
    address: string;
  };
  months_paid: string[];
  monthly_breakdown: {
    month: string;
    fee: number;
    paid: number;
    due: number;
  }[];
  amount: number;
  remaining_due: number;
  total_session_due?: number;
  payment_status: 'PAID' | 'PARTIALLY PAID' | 'DUE';
  payment_method: 'cash' | 'upi' | 'bank' | 'card';
  date: string;
  school_id: string;
  created_by: string;
}

export interface PrepaidBalance {
  id: string;
  student_id: string;
  amount: number;
  school_id: string;
  updatedAt: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}
