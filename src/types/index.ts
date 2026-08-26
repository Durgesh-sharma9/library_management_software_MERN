export interface Plan {
  _id: string;
  id?: string;
  name: string;
  code: string;
  description?: string;
  price: number;
  billingCycle: 'monthly' | 'yearly' | 'lifetime';
  maxBooks: number;
  maxMembers: number;
  maxIssuedPerStudent?: number;
  features: string[];
  isPopular?: boolean;
  isActive: boolean;
  schoolsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface School {
  id?: string;
  _id?: string;
  name: string;
  code: string;
  libraryName: string;
  adminName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  logoUrl?: string;
  isActive?: boolean;
  status?: 'active' | 'inactive' | 'suspended' | 'trial';
  deactivationReason?: string;
  plan?: Plan | string | any;
  planExpiresAt?: string;
  notes?: string;
  booksCount?: number;
  membersCount?: number;
  activeAssignmentsCount?: number;
  overdueCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'librarian';
  school?: School | null;
}

export interface SuperAdminStats {
  totalSchools: number;
  activeSchools: number;
  inactiveSchools: number;
  totalBooks: number;
  totalPhysicalCopies: number;
  totalMembers: number;
  totalCirculations: number;
  activeAssignments: number;
  totalFinesCollected: number;
  totalPlans: number;
  pendingRequestsCount?: number;
  recentRequests?: SubscriptionRequest[];
  planDistribution: Array<{
    planName: string;
    planCode: string;
    count: number;
  }>;
  recentSchools: School[];
}

export interface SubscriptionRequest {
  _id: string;
  id?: string;
  school: School | string | any;
  plan: Plan | string | any;
  requestedBy?: User | string | any;
  billingCycle: 'monthly' | 'yearly' | 'lifetime';
  durationDays: number;
  amount: number;
  paymentMode: 'upi' | 'bank_transfer' | 'cheque' | 'cash' | 'online' | 'po';
  transactionReference: string;
  paymentReceiptUrl?: string;
  schoolNotes?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: User | string | any;
  reviewedAt?: string;
  adminRemarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolSubscriptionDetails {
  school: {
    id: string;
    name: string;
    code: string;
    libraryName: string;
    status: string;
    isActive: boolean;
  };
  currentPlan?: Plan | null;
  planExpiresAt?: string;
  daysRemaining?: number | null;
  isExpired?: boolean;
  usage: {
    booksCount: number;
    membersCount: number;
    activeAssignmentsCount: number;
    maxBooks: number;
    maxMembers: number;
    maxIssuedPerStudent: number;
  };
  pendingRequest?: SubscriptionRequest | null;
}

export interface BookCategory {
  _id: string;
  name: string;
  description?: string;
  subCategories?: string[];
  isActive: boolean;
  bookCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Supplier {
  _id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  notes?: string;
  isActive: boolean;
  booksCount?: number;
  totalCopiesSupplied?: number;
  totalSpend?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Shelf {
  _id: string;
  name: string;
  floorOrRoom?: string;
  capacity?: number;
  description?: string;
  isActive: boolean;
  booksCount?: number;
  totalCopiesStored?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BookCopy {
  copyNumber: number;
  accessionNumber: string;
  status: 'available' | 'assigned' | 'lost' | 'damaged';
  assignedTo?: Member | string | null;
  assignedToName?: string;
  assignedToId?: string;
  assignedDate?: string | null;
  dueDate?: string | null;
  assignmentId?: string | null;
  shelfLocation?: string;
}

export interface Book {
  _id: string;
  accessionNumber?: string;
  title: string;
  author: string;
  language: 'Hindi' | 'English' | 'Other';
  publisher?: string;
  publisherNumber?: string;
  category: BookCategory | string;
  subCategory?: string;
  price?: number;
  supplier?: Supplier | string | null;
  shelfLocation?: string;
  coverImage?: string;
  totalCopies: number;
  availableCopies: number;
  assignedCopies: number;
  lostCopies?: number;
  damagedCopies?: number;
  copiesList?: BookCopy[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Member {
  _id: string;
  memberId: string;
  memberType?: 'student' | 'teacher';
  name: string;
  whatsapp: string;
  email?: string;
  className?: string;
  section?: string;
  designation?: string;
  department?: string;
  admissionNo?: string;
  status: 'active' | 'inactive';
  assignedBooksCount?: number;
  overdueBooksCount?: number;
  pendingFine?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SchoolClass {
  _id: string;
  name: string;
  order: number;
  sections?: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SchoolSection {
  _id: string;
  name: string;
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FineRule {
  effectiveDate: string;
  finePerDay: number;
  note?: string;
}

export interface FineBreakdownItem {
  fromDate: string;
  toDate: string;
  days: number;
  ratePerDay: number;
  amount: number;
}

export interface ReissueHistoryItem {
  reissuedAt: string;
  previousDueDate: string;
  newDueDate: string;
  remarks?: string;
}

export interface Assignment {
  _id: string;
  member: Member;
  book: Book;
  copyNumber?: number;
  accessionNumber?: string;
  assignedDate: string;
  dueDate: string;
  originalDueDate?: string;
  returnedDate?: string | null;
  status: 'assigned' | 'returned' | 'overdue' | 'lost' | 'damaged' | 'replaced';
  lostOrDamaged?: 'lost' | 'damaged' | 'replaced' | null;
  damageOrLostFine?: number;
  damageOrLostReason?: string;
  damageOrLostDate?: string | null;
  fineAmount: number;
  originalFine?: number;
  waivedAmount?: number;
  fineStatus: 'none' | 'pending' | 'paid';
  fineBreakdown?: FineBreakdownItem[];
  reissueCount?: number;
  reissueHistory?: ReissueHistoryItem[];
  receiptNo?: string;
  paymentMethod?: string;
  remarks?: string;
  calculatedStatus?: 'assigned' | 'returned' | 'overdue' | 'due_today' | 'lost' | 'damaged' | 'replaced';
  lateDays?: number;
  currentFine?: number;
  isDueToday?: boolean;
  isOverdue?: boolean;
  isLost?: boolean;
  isDamaged?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LostDamageLog {
  _id: string;
  book: Book;
  assignment?: Assignment | string;
  member?: Member;
  type: 'lost' | 'damaged' | 'replaced';
  resolutionType?: 'cash_recovery' | 'book_replaced';
  replacementAccessionNo?: string;
  copiesCount: number;
  fineAmount: number;
  fineStatus: 'none' | 'pending' | 'paid';
  paymentMethod?: string;
  receiptNo?: string;
  reason: string;
  reportedBy?: string;
  source: 'assignment' | 'inventory';
  stockDeducted: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface LostDamageStats {
  totalLostCopies: number;
  totalDamagedCopies: number;
  totalIncidents: number;
  totalFinesAssessed: number;
  totalFinesCollected: number;
  pendingFines: number;
}

export interface LibrarySetting {
  _id?: string;
  libraryName: string;
  schoolName?: string;
  issueDuration: number;
  finePerDay: number;
  fineEffectiveDate?: string;
  fineRules?: FineRule[];
  maxBooksPerMember: number;
  accessionPrefix?: string;
  accessionStartNumber?: number;
  accessionPadding?: number;
  accessionSeparator?: string;
  contactEmail?: string;
  contactPhone?: string;
  currency?: string;
  updatedAt?: string;
}

export interface DashboardSummary {
  totalBookTitles: number;
  totalBooks: number;
  availableBooks: number;
  assignedBooks: number;
  lostBooks?: number;
  damagedBooks?: number;
  dueToday: number;
  dueSoon?: number;
  overdueBooks: number;
  totalMembers: number;
  activeMembers: number;
  pendingFine: number;
  returnedBooks: number;
  totalAssignments: number;
}

export interface CategoryAnalyticsItem {
  id: string;
  name: string;
  total: number;
  available: number;
  assigned: number;
  titleCount: number;
  isActive: boolean;
}

export interface TopBookItem {
  id: string;
  title: string;
  author: string;
  category: string;
  assignedTimes: number;
  availableCopies: number;
}

export interface RecentActivityItem {
  id: string;
  type: 'assign' | 'return';
  memberName: string;
  memberId: string;
  bookTitle: string;
  timestamp: string;
  dueDate?: string;
  fineAmount?: number;
  fineStatus?: 'none' | 'pending' | 'paid';
}

export interface MemberAnalytics {
  totalMembers: number;
  activeMembers: number;
  membersWithActiveBooks: number;
  membersWithOverdueBooks: number;
  membersWithPendingFine: number;
  classDistribution: Array<{ name: string; value: number }>;
}

export interface DashboardData {
  summary: DashboardSummary;
  memberAnalytics: MemberAnalytics;
  categoryAnalytics: CategoryAnalyticsItem[];
  topBooks: TopBookItem[];
  librarySettings: LibrarySetting;
}

export interface ViolatingMemberBook {
  assignmentId: string;
  bookId: string;
  title: string;
  author: string;
  accessionNumber: string;
  assignedDate: string;
  dueDate: string;
  status: string;
}

export interface ViolatingMember {
  memberId: string;
  memberCode: string;
  name: string;
  memberType?: 'student' | 'teacher';
  admissionNo?: string;
  className?: string;
  section?: string;
  department?: string;
  designation?: string;
  activeBooksCount: number;
  books: ViolatingMemberBook[];
}

export interface CheckLimitResult {
  allowed: boolean;
  proposedLimit: number;
  violatingCount: number;
  violatingMembers: ViolatingMember[];
  message?: string;
}

export interface BookAnalyticsSummary {
  totalTitles: number;
  totalCopies: number;
  availableCopies: number;
  assignedCopies: number;
  lostCopies: number;
  damagedCopies: number;
  availabilityRate: number;
  totalCatalogValuation: number;
  availableStockValuation: number;
  averagePrice: number;
}

export interface BookAnalyticsItem {
  name: string;
  titleCount: number;
  totalCopies: number;
  availableCopies: number;
  totalValuation?: number;
  totalSpend?: number;
}

export interface BookAnalyticsData {
  summary: BookAnalyticsSummary;
  suppliers: BookAnalyticsItem[];
  shelves: BookAnalyticsItem[];
  categories: BookAnalyticsItem[];
  languages: BookAnalyticsItem[];
  priceDistribution: Array<{ range: string; count: number }>;
  topExpensiveBooks: Array<{
    id: string;
    title: string;
    author: string;
    price: number;
    totalCopies: number;
    availableCopies: number;
    shelfLocation: string;
    supplierName: string;
  }>;
}


