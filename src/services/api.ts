import axios from 'axios';
import {
  User,
  School,
  Plan,
  SuperAdminStats,
  SubscriptionRequest,
  SchoolSubscriptionDetails,
  BookCategory,
  Book,
  Member,
  SchoolClass,
  SchoolSection,
  Assignment,
  LibrarySetting,
  DashboardData,
  RecentActivityItem,
  CheckLimitResult,
  LostDamageLog,
  LostDamageStats,
  Supplier,
  Shelf,
  BookAnalyticsData,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Intercept request to add JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('library_token');
    if (token && token !== 'undefined' && token !== 'null' && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept response to handle retries and catch 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (error.response && error.response.status === 401) {
      // If unauthorized on protected route, remove token
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('library_token');
        localStorage.removeItem('library_user');
      }
      return Promise.reject(error);
    }

    // Auto-retry for network errors or server booting states
    if (config && !config._retryCount) {
      config._retryCount = 0;
    }

    const isNetworkError =
      !error.response ||
      error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNABORTED' ||
      error.message?.includes('Network Error') ||
      (error.response && [502, 503, 504].includes(error.response.status));

    if (config && isNetworkError && config._retryCount < 3) {
      config._retryCount += 1;
      const delay = config._retryCount * 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return api(config);
    }

    return Promise.reject(error);
  }
);

// Auth Services
export const authService = {
  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  registerSchool: async (payload: {
    schoolName: string;
    libraryName?: string;
    schoolCode?: string;
    adminName: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
  }): Promise<{ token: string; user: User; message: string }> => {
    const res = await api.post('/auth/register', payload);
    return res.data;
  },
  getSchools: async (): Promise<{ schools: Array<{ _id: string; name: string; code: string; libraryName: string; city?: string }> }> => {
    const res = await api.get('/auth/schools');
    return res.data;
  },
  getMe: async (): Promise<{ user: User }> => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

// Category Services
export const categoryService = {
  getAll: async (includeInactive = false): Promise<BookCategory[]> => {
    const res = await api.get('/categories', { params: { includeInactive } });
    return res.data.data;
  },
  create: async (data: string | { name: string; description?: string; subCategories?: string[]; isActive?: boolean }): Promise<BookCategory> => {
    const payload = typeof data === 'string' ? { name: data } : data;
    const res = await api.post('/categories', payload);
    return res.data.data;
  },
  update: async (
    id: string,
    data: { name: string; description?: string; subCategories?: string[]; isActive?: boolean }
  ): Promise<BookCategory> => {
    const res = await api.put(`/categories/${id}`, data);
    return res.data.data;
  },
  toggleStatus: async (id: string): Promise<BookCategory> => {
    const res = await api.patch(`/categories/${id}/status`);
    return res.data.data;
  },
  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete(`/categories/${id}`);
    return res.data;
  },
};

// Book Services
export const bookService = {
  getAll: async (params?: {
    search?: string;
    category?: string;
    subCategory?: string;
    language?: string;
    status?: string;
    supplier?: string;
    shelfLocation?: string;
  }): Promise<Book[]> => {
    const res = await api.get('/books', { params });
    return res.data.data;
  },
  getAnalytics: async (): Promise<BookAnalyticsData> => {
    const res = await api.get('/books/analytics');
    return res.data.data;
  },
  getNextAccession: async (): Promise<string> => {
    const res = await api.get('/books/next-accession');
    return res.data.nextAccessionNumber;
  },
  getById: async (id: string): Promise<{ book: Book; assignments: Assignment[] }> => {
    const res = await api.get(`/books/${id}`);
    return res.data.data;
  },
  create: async (data: Partial<Book>): Promise<Book> => {
    const res = await api.post('/books', data);
    return res.data.data;
  },
  update: async (id: string, data: Partial<Book>): Promise<Book> => {
    const res = await api.put(`/books/${id}`, data);
    return res.data.data;
  },
  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete(`/books/${id}`);
    return res.data;
  },
  bulkImport: async (books: any[]): Promise<{
    success: boolean;
    message: string;
    importedCount: number;
    skippedCount: number;
    errors: string[];
  }> => {
    const res = await api.post('/books/bulk-import', { books });
    return res.data;
  },
};

// Supplier Services
export const supplierService = {
  getAll: async (includeInactive = false): Promise<Supplier[]> => {
    const res = await api.get('/suppliers', { params: { includeInactive } });
    return res.data.data;
  },
  getById: async (id: string): Promise<{ supplier: Supplier; books: Book[] }> => {
    const res = await api.get(`/suppliers/${id}`);
    return res.data.data;
  },
  create: async (data: Partial<Supplier>): Promise<Supplier> => {
    const res = await api.post('/suppliers', data);
    return res.data.data;
  },
  update: async (id: string, data: Partial<Supplier>): Promise<Supplier> => {
    const res = await api.put(`/suppliers/${id}`, data);
    return res.data.data;
  },
  toggleStatus: async (id: string): Promise<Supplier> => {
    const res = await api.patch(`/suppliers/${id}/status`);
    return res.data.data;
  },
  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete(`/suppliers/${id}`);
    return res.data;
  },
};

// Shelf Services
export const shelfService = {
  getAll: async (includeInactive = false): Promise<Shelf[]> => {
    const res = await api.get('/shelves', { params: { includeInactive } });
    return res.data.data;
  },
  getById: async (id: string): Promise<{ shelf: Shelf; books: Book[] }> => {
    const res = await api.get(`/shelves/${id}`);
    return res.data.data;
  },
  create: async (data: Partial<Shelf>): Promise<Shelf> => {
    const res = await api.post('/shelves', data);
    return res.data.data;
  },
  update: async (id: string, data: Partial<Shelf>): Promise<Shelf> => {
    const res = await api.put(`/shelves/${id}`, data);
    return res.data.data;
  },
  toggleStatus: async (id: string): Promise<Shelf> => {
    const res = await api.patch(`/shelves/${id}/status`);
    return res.data.data;
  },
  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete(`/shelves/${id}`);
    return res.data;
  },
};

// Member Services
export const memberService = {
  getAll: async (params?: { search?: string; className?: string; section?: string; status?: string; memberType?: string }): Promise<Member[]> => {
    const res = await api.get('/members', { params });
    return res.data.data;
  },
  getNextId: async (type: 'student' | 'teacher' = 'student'): Promise<string> => {
    const res = await api.get('/members/next-id', { params: { type } });
    return res.data.nextMemberId;
  },
  getById: async (id: string): Promise<{ member: Member; currentlyAssigned: any[]; previousHistory: any[] }> => {
    const res = await api.get(`/members/${id}`);
    return res.data.data;
  },
  create: async (data: Partial<Member>): Promise<Member> => {
    const res = await api.post('/members', data);
    return res.data.data;
  },
  update: async (id: string, data: Partial<Member>): Promise<Member> => {
    const res = await api.put(`/members/${id}`, data);
    return res.data.data;
  },
  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete(`/members/${id}`);
    return res.data;
  },
  bulkImport: async (members: any[], memberType: 'student' | 'teacher' = 'student'): Promise<{
    success: boolean;
    message: string;
    importedCount: number;
    updatedCount?: number;
    skippedCount: number;
    errors: string[];
  }> => {
    const res = await api.post('/members/bulk-import', { members, memberType });
    return res.data;
  },
};

// Master Services (Class & Section)
export const masterService = {
  getClasses: async (includeInactive = false): Promise<SchoolClass[]> => {
    const res = await api.get('/masters/classes', { params: { includeInactive } });
    return res.data.data;
  },
  createClass: async (data: { name: string; order?: number; sections?: string[] }): Promise<SchoolClass> => {
    const res = await api.post('/masters/classes', data);
    return res.data.data;
  },
  updateClass: async (id: string, data: { name?: string; order?: number; sections?: string[]; isActive?: boolean }): Promise<SchoolClass> => {
    const res = await api.put(`/masters/classes/${id}`, data);
    return res.data.data;
  },
  deleteClass: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete(`/masters/classes/${id}`);
    return res.data;
  },
  getSections: async (includeInactive = false): Promise<SchoolSection[]> => {
    const res = await api.get('/masters/sections', { params: { includeInactive } });
    return res.data.data;
  },
  createSection: async (data: { name: string; order?: number }): Promise<SchoolSection> => {
    const res = await api.post('/masters/sections', data);
    return res.data.data;
  },
  updateSection: async (id: string, data: { name?: string; order?: number; isActive?: boolean }): Promise<SchoolSection> => {
    const res = await api.put(`/masters/sections/${id}`, data);
    return res.data.data;
  },
  deleteSection: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete(`/masters/sections/${id}`);
    return res.data;
  },
};

// Assignment Services
export const assignmentService = {
  getAll: async (params?: {
    status?: string;
    memberId?: string;
    bookId?: string;
    categoryId?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<Assignment[]> => {
    const res = await api.get('/assignments', { params });
    return res.data.data;
  },
  getById: async (id: string): Promise<Assignment> => {
    const res = await api.get(`/assignments/${id}`);
    return res.data.data;
  },
  create: async (data: {
    memberId: string;
    bookId: string;
    copyNumber?: number;
    accessionNumber?: string;
    assignedDate?: string;
    dueDate: string;
    remarks?: string;
  }): Promise<Assignment> => {
    const res = await api.post('/assignments', data);
    return res.data.data;
  },
  returnBook: async (
    id: string,
    data: { returnDate?: string; finePaid?: boolean; remarks?: string }
  ): Promise<{ assignment: Assignment; lateDays: number; fineAmount: number; fineStatus: string; message?: string }> => {
    const res = await api.post(`/assignments/${id}/return`, data);
    return res.data.data;
  },
  reissue: async (
    id: string,
    data: {
      newDueDate: string;
      remarks?: string;
      finePaid?: boolean;
      fineAmount?: number;
      waivedAmount?: number;
      receiptNo?: string;
      paymentMethod?: string;
    }
  ): Promise<{ success: boolean; message: string; data: Assignment }> => {
    const res = await api.post(`/assignments/${id}/reissue`, data);
    return res.data;
  },
  reportLostOrDamaged: async (
    id: string,
    data: {
      type: 'lost' | 'damaged' | 'replaced';
      resolutionType?: 'cash_recovery' | 'book_replaced';
      replacementAccessionNo?: string;
      fineAmount: number;
      fineStatus?: 'none' | 'pending' | 'paid';
      paymentMethod?: string;
      receiptNo?: string;
      reason: string;
      reportedBy?: string;
      remarks?: string;
    }
  ): Promise<{ success: boolean; message: string; data: Assignment }> => {
    const res = await api.post(`/assignments/${id}/lost-damaged`, data);
    return res.data;
  },
  updateFineStatus: async (
    id: string,
    data: {
      fineStatus: 'none' | 'pending' | 'paid' | 'waived';
      fineAmount?: number;
      originalFine?: number;
      waivedAmount?: number;
      receiptNo?: string;
      paymentMethod?: string;
      remarks?: string;
    }
  ): Promise<Assignment> => {
    const res = await api.patch(`/assignments/${id}/fine`, data);
    return res.data.data;
  },
};

// Lost / Damaged Inventory Services
export const lostDamagedService = {
  getLogs: async (params?: { type?: string; bookId?: string; search?: string }): Promise<LostDamageLog[]> => {
    const res = await api.get('/books/lost-damaged-logs', { params });
    return res.data.data;
  },
  getStats: async (): Promise<LostDamageStats> => {
    const res = await api.get('/books/lost-damaged-stats');
    return res.data.data;
  },
  reportDirect: async (data: {
    bookId: string;
    memberId?: string;
    assignmentId?: string;
    source?: 'assignment' | 'inventory';
    type: 'lost' | 'damaged' | 'replaced';
    resolutionType?: 'cash_recovery' | 'book_replaced';
    replacementAccessionNo?: string;
    copiesCount: number;
    reason: string;
    reportedBy?: string;
    fineAmount?: number;
    fineStatus?: 'none' | 'pending' | 'paid';
    paymentMethod?: string;
    receiptNo?: string;
  }): Promise<{ success: boolean; message: string; data: { log: LostDamageLog; book: Book } }> => {
    const res = await api.post('/books/report-lost-damaged', data);
    return res.data;
  },
  updateLog: async (
    id: string,
    data: {
      memberId?: string;
      reason?: string;
      fineAmount?: number;
      fineStatus?: 'none' | 'pending' | 'paid';
      paymentMethod?: string;
      receiptNo?: string;
      reportedBy?: string;
    }
  ): Promise<{ success: boolean; message: string; data: LostDamageLog }> => {
    const res = await api.put(`/books/lost-damaged-logs/${id}`, data);
    return res.data;
  },
  deleteLog: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete(`/books/lost-damaged-logs/${id}`);
    return res.data;
  },
};

// Dashboard Services
export const dashboardService = {
  getAnalytics: async (categoryId?: string): Promise<DashboardData> => {
    const res = await api.get('/dashboard/analytics', { params: { categoryId } });
    return res.data.data;
  },
  getRecentActivity: async (): Promise<RecentActivityItem[]> => {
    const res = await api.get('/dashboard/recent-activity');
    return res.data.data;
  },
};

// Settings Services
export const settingService = {
  get: async (): Promise<LibrarySetting> => {
    const res = await api.get('/settings');
    return res.data.data;
  },
  checkMaxBooksLimit: async (limit: number): Promise<CheckLimitResult> => {
    const res = await api.get('/settings/check-limit', { params: { limit } });
    return res.data;
  },
  previewFineCalculation: async (data: {
    dueDate: string;
    targetDate?: string;
    finePerDay?: number;
    fineRules?: any[];
  }): Promise<{ lateDays: number; fineAmount: number; breakdown: any[]; appliedRulesCount: number }> => {
    const res = await api.post('/settings/calculate-fine-preview', data);
    return res.data.data;
  },
  update: async (data: Partial<LibrarySetting>): Promise<LibrarySetting> => {
    const res = await api.put('/settings', data);
    return res.data.data;
  },
  seedSampleData: async (): Promise<{ success: boolean; message: string }> => {
    const res = await api.post('/settings/seed');
    return res.data;
  },
};

// Subscription Services (For School Admin / Librarian)
export const subscriptionService = {
  getAvailablePlans: async (): Promise<Plan[]> => {
    const res = await api.get('/subscription/plans');
    return res.data.plans;
  },
  getCurrentSubscription: async (): Promise<SchoolSubscriptionDetails> => {
    const res = await api.get('/subscription/current');
    return res.data.subscription;
  },
  submitPurchaseRequest: async (data: {
    planId: string;
    billingCycle?: string;
    durationDays?: number;
    amount?: number;
    paymentMode?: string;
    transactionReference?: string;
    paymentReceiptUrl?: string;
    schoolNotes?: string;
  }): Promise<{ success: boolean; message: string; request: SubscriptionRequest }> => {
    const res = await api.post('/subscription/purchase-request', data);
    return res.data;
  },
  getMyRequests: async (): Promise<SubscriptionRequest[]> => {
    const res = await api.get('/subscription/my-requests');
    return res.data.requests;
  },
};

// Super Administrator Services
export const superAdminService = {
  getStats: async (): Promise<SuperAdminStats> => {
    const res = await api.get('/superadmin/stats');
    return res.data.stats;
  },
  getSchools: async (params?: { search?: string; status?: string; planId?: string }): Promise<School[]> => {
    const res = await api.get('/superadmin/schools', { params });
    return res.data.schools;
  },
  createSchool: async (
    data: any
  ): Promise<{ school: School; adminCredentials: { email: string; password: string } }> => {
    const res = await api.post('/superadmin/schools', data);
    return res.data;
  },
  updateSchool: async (id: string, data: any): Promise<School> => {
    const res = await api.put(`/superadmin/schools/${id}`, data);
    return res.data.school;
  },
  updateSchoolStatus: async (
    id: string,
    data: { isActive?: boolean; status?: string; deactivationReason?: string }
  ): Promise<School> => {
    const res = await api.patch(`/superadmin/schools/${id}/status`, data);
    return res.data.school;
  },
  impersonateSchool: async (id: string): Promise<{ token: string; user: User; message: string }> => {
    const res = await api.post(`/superadmin/schools/${id}/impersonate`);
    return res.data;
  },
  deleteSchool: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete(`/superadmin/schools/${id}`);
    return res.data;
  },
  getPlans: async (): Promise<Plan[]> => {
    const res = await api.get('/superadmin/plans');
    return res.data.plans;
  },
  createPlan: async (data: Partial<Plan>): Promise<Plan> => {
    const res = await api.post('/superadmin/plans', data);
    return res.data.plan;
  },
  updatePlan: async (id: string, data: Partial<Plan>): Promise<Plan> => {
    const res = await api.put(`/superadmin/plans/${id}`, data);
    return res.data.plan;
  },
  deletePlan: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete(`/superadmin/plans/${id}`);
    return res.data;
  },
  getSubscriptionRequests: async (params?: { status?: string; schoolId?: string }): Promise<SubscriptionRequest[]> => {
    const res = await api.get('/superadmin/subscription-requests', { params });
    return res.data.requests;
  },
  approveSubscriptionRequest: async (
    id: string,
    data?: { adminRemarks?: string; customExpiryDate?: string }
  ): Promise<{ success: boolean; message: string; request: SubscriptionRequest; school: School }> => {
    const res = await api.post(`/superadmin/subscription-requests/${id}/approve`, data || {});
    return res.data;
  },
  rejectSubscriptionRequest: async (
    id: string,
    data?: { adminRemarks?: string }
  ): Promise<{ success: boolean; message: string; request: SubscriptionRequest }> => {
    const res = await api.post(`/superadmin/subscription-requests/${id}/reject`, data || {});
    return res.data;
  },
};

// Upload Service for ImageKit
export const uploadService = {
  getImageKitAuth: async (): Promise<{ success: boolean; publicKey: string; urlEndpoint: string; token: string; expire: number; signature: string }> => {
    const res = await api.get('/upload/auth');
    return res.data;
  },
  uploadImage: async (file: string, fileName?: string): Promise<{ success: boolean; url: string; message: string }> => {
    const res = await api.post('/upload', { file, fileName });
    return res.data;
  },
};

export default api;
