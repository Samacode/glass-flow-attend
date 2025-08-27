import Dexie, { Table } from 'dexie';

// User Types
export interface User {
  id?: number;
  email: string;
  password: string; // In production, this would be hashed
  role: 'admin' | 'instructor' | 'student';
  firstName: string;
  lastName: string;
  department?: string;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

// Course Types
export interface Course {
  id?: number;
  name: string;
  code: string;
  description?: string;
  instructorId: number;
  departmentId?: number;
  createdAt: string;
  updatedAt: string;
}

// Department Types
export interface Department {
  id?: number;
  name: string;
  code: string;
  createdAt: string;
  updatedAt: string;
}

// Class Session Types
export interface ClassSession {
  id?: number;
  courseId: number;
  instructorId: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  checkInMethod: 'qr' | 'gps' | 'ip';
  attendanceZone?: {
    latitude?: number;
    longitude?: number;
    radius?: number; // in meters
    ipRange?: string[];
  };
  qrToken?: string;
  qrExpiry?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Attendance Record Types
export interface AttendanceRecord {
  id?: number;
  sessionId: number;
  studentId: number;
  status: 'present' | 'absent' | 'late';
  checkInTime?: string;
  checkInMethod?: 'qr' | 'gps' | 'ip' | 'manual';
  location?: {
    latitude: number;
    longitude: number;
  };
  ipAddress?: string;
  isManualOverride: boolean;
  createdAt: string;
  updatedAt: string;
}

// Question Bank Types
export interface QuestionBank {
  id?: number;
  instructorId: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Question Types
export interface Question {
  id?: number;
  bankId: number;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  options?: string[]; // For multiple choice
  correctAnswer: string;
  points: number;
  createdAt: string;
  updatedAt: string;
}

// Quiz Types
export interface Quiz {
  id?: number;
  sessionId: number;
  instructorId: number;
  title: string;
  timeLimit: number; // in minutes
  isRandomized: boolean;
  isActive: boolean;
  questions: number[]; // Question IDs
  createdAt: string;
  updatedAt: string;
}

// Quiz Submission Types
export interface QuizSubmission {
  id?: number;
  quizId: number;
  studentId: number;
  answers: {
    questionId: number;
    answer: string;
    isCorrect?: boolean;
    points?: number;
  }[];
  startedAt: string;
  submittedAt?: string;
  totalScore?: number;
  maxScore: number;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// Settings Types
export interface Settings {
  id?: number;
  key: string;
  value: string;
  updatedAt: string;
}

// Database Class
export class AttendanceDB extends Dexie {
  users!: Table<User>;
  courses!: Table<Course>;
  departments!: Table<Department>;
  classSessions!: Table<ClassSession>;
  attendanceRecords!: Table<AttendanceRecord>;
  questionBanks!: Table<QuestionBank>;
  questions!: Table<Question>;
  quizzes!: Table<Quiz>;
  quizSubmissions!: Table<QuizSubmission>;
  settings!: Table<Settings>;

  constructor() {
    super('AttendanceDB');
    
    this.version(1).stores({
      users: '++id, email, role, isApproved, createdAt',
      courses: '++id, instructorId, departmentId, createdAt',
      departments: '++id, name, code, createdAt',
      classSessions: '++id, courseId, instructorId, date, isActive, createdAt',
      attendanceRecords: '++id, sessionId, studentId, status, createdAt',
      questionBanks: '++id, instructorId, createdAt',
      questions: '++id, bankId, type, createdAt',
      quizzes: '++id, sessionId, instructorId, isActive, createdAt',
      quizSubmissions: '++id, quizId, studentId, isCompleted, createdAt',
      settings: '++id, key, updatedAt'
    });

    // Hook to automatically add timestamps
    this.users.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = new Date().toISOString();
      obj.updatedAt = new Date().toISOString();
    });

    this.users.hook('updating', (modifications, primKey, obj, trans) => {
      (modifications as any).updatedAt = new Date().toISOString();
    });

    // Similar hooks for other tables
    [this.courses, this.departments, this.classSessions, this.attendanceRecords, 
     this.questionBanks, this.questions, this.quizzes, this.quizSubmissions].forEach(table => {
      table.hook('creating', (primKey, obj, trans) => {
        obj.createdAt = new Date().toISOString();
        obj.updatedAt = new Date().toISOString();
      });

      table.hook('updating', (modifications, primKey, obj, trans) => {
        (modifications as any).updatedAt = new Date().toISOString();
      });
    });

    this.settings.hook('creating', (primKey, obj, trans) => {
      obj.updatedAt = new Date().toISOString();
    });

    this.settings.hook('updating', (modifications, primKey, obj, trans) => {
      (modifications as any).updatedAt = new Date().toISOString();
    });
  }

  // Initialize default settings and admin user
  async initializeDefaults() {
    const userCount = await this.users.count();
    
    if (userCount === 0) {
      // Create default admin user
      await this.users.add({
        email: 'admin@attendance.local',
        password: 'admin123', // In production, this would be hashed
        role: 'admin',
        firstName: 'System',
        lastName: 'Administrator',
        isApproved: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Create default settings
      await this.settings.bulkAdd([
        {
          key: 'at_risk_threshold',
          value: '3',
          updatedAt: new Date().toISOString()
        },
        {
          key: 'qr_rotation_interval',
          value: '20',
          updatedAt: new Date().toISOString()
        }
      ]);
    }
  }
}

// Create and export database instance
export const db = new AttendanceDB();

// Initialize defaults when the database opens
db.on('ready', () => {
  return db.initializeDefaults();
});