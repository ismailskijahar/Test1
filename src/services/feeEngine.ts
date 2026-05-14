import { 
  collection, 
  getDocs, 
  query, 
  where, 
  writeBatch, 
  doc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { dataService } from './dataService';
import { Student, FeeStructure, DueRecord, PaymentStatus } from '../types';

export const feeEngine = {
  /**
   * Syncs dues for all students in a school.
   * Scans students, matches with fee structure, and generates missing DueRecords.
   */
  syncStudentDues: async (schoolId: string) => {
    console.log('[FeeEngine] Starting sync for school:', schoolId);
    
    try {
      // 1. Fetch data
      const [students, feeStructures, existingDues] = await Promise.all([
        dataService.getStudents(schoolId),
        dataService.getFeeStructures(schoolId),
        dataService.getDueRecords(schoolId)
      ]);

      const structuresMap = new Map(feeStructures.map(s => [s.class_key, s]));
      const duesMap = new Map<string, DueRecord>(); // key: studentId_YYYY-MM
      existingDues.forEach(d => duesMap.set(`${d.student_id}_${d.month}`, d));

      let batch = writeBatch(db);
      let batchSize = 0;
      const MAX_BATCH_SIZE = 450;
      let totalCreated = 0;

      const now = new Date();
      const currentYear = now.getFullYear();

      for (const student of students) {
        if (student.is_dropout) continue;

        const classKey = student.class_key || `class_${student.class.toLowerCase().replace(/\s+/g, '_')}`;
        const structure = structuresMap.get(classKey);

        if (!structure) continue;

        const enrolledDateStr = student.createdAt || new Date().toISOString();
        const enrolledDate = new Date(enrolledDateStr);
        let iterYear = isNaN(enrolledDate.getFullYear()) ? currentYear : enrolledDate.getFullYear();
        let iterMonth = 0; // January

        const targetYear = currentYear;
        const targetMonth = 11; // December

        while (iterYear < targetYear || (iterYear === targetYear && iterMonth <= targetMonth)) {
          const monthStr = `${iterYear}-${(iterMonth + 1).toString().padStart(2, '0')}`;
          const dueKey = `${student.id}_${monthStr}`;

          if (!duesMap.has(dueKey)) {
            const dueDate = new Date(iterYear, iterMonth, 10).toISOString();
            const newDue: DueRecord = {
              id: dueKey,
              student_id: student.id,
              month: monthStr,
              amount: structure.monthly_fee,
              paid_amount: 0,
              remaining_amount: structure.monthly_fee,
              status: 'Due',
              school_id: schoolId,
              dueDate
            };

            const dueRef = doc(db, `schools/${schoolId}/due_records`, dueKey);
            batch.set(dueRef, newDue);
            batchSize++;
            totalCreated++;

            if (batchSize >= MAX_BATCH_SIZE) {
              await batch.commit();
              batch = writeBatch(db);
              batchSize = 0;
            }
          }

          iterMonth++;
          if (iterMonth > 11) {
            iterMonth = 0;
            iterYear++;
          }
        }
      }

      if (batchSize > 0) {
        await batch.commit();
      }

      console.log(`[FeeEngine] Sync complete. Created ${totalCreated} records.`);
      return true;
    } catch (error) {
      console.error('[FeeEngine] Sync Error:', error);
      return false;
    }
  },

  /**
   * Recalculates status for a specific due record based on transactions.
   */
  recalculateDueStatus: (amount: number, paid: number): PaymentStatus => {
    if (paid <= 0) return 'Due';
    if (paid >= amount) return 'Paid';
    return 'Partially Paid';
  },

  /**
   * Returns a list of months (YYYY-MM) that are considered "Due" based on the current date.
   * Following the user's rule: if month 5 check Jan,Feb,Mar,Apr (months 1-4).
   */
  getOverdueMonthsList: () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed, so May is 4. User says May (5) check last 4 months.
    
    // In JS Date, Jan is 0, Feb is 1, Mar is 2, Apr is 3, May is 4.
    // If month is 4 (May), we check 0, 1, 2, 3.
    const overdueMonths: string[] = [];
    for (let i = 0; i < month; i++) {
       overdueMonths.push(`${year}-${(i + 1).toString().padStart(2, '0')}`);
    }
    return overdueMonths;
  },

  /**
   * Calculates the total overdue balance for a set of due records.
   */
  calculateTotalOverdue: (dues: DueRecord[]) => {
    const overdueList = feeEngine.getOverdueMonthsList();
    return dues
      .filter(d => overdueList.includes(d.month) && d.status !== 'Paid')
      .reduce((sum, d) => sum + (d.amount - d.paid_amount), 0);
  }
};
