import { School } from '../models/School.js';
import { User } from '../models/User.js';
import { BookCategory } from '../models/BookCategory.js';
import { Book } from '../models/Book.js';
import { Member } from '../models/Member.js';
import { Assignment } from '../models/Assignment.js';
import { LibrarySetting } from '../models/LibrarySetting.js';
import { SchoolClass } from '../models/SchoolClass.js';
import { SchoolSection } from '../models/SchoolSection.js';
import { Supplier } from '../models/Supplier.js';
import { Shelf } from '../models/Shelf.js';
import { Plan } from '../models/Plan.js';

export async function seedNewSchoolDefaults(
  schoolId: any,
  schoolName: string,
  libraryName: string,
  email: string,
  phone?: string
) {
  try {
    // 1. Create Library Settings for this school
    await LibrarySetting.create({
      school: schoolId,
      libraryName: libraryName || `${schoolName} Central Library`,
      schoolName: schoolName,
      issueDuration: 14,
      finePerDay: 2,
      fineEffectiveDate: new Date('2020-01-01'),
      fineRules: [
        {
          effectiveDate: new Date('2020-01-01'),
          finePerDay: 2,
          note: 'Initial default rate',
        },
      ],
      maxBooksPerMember: 3,
      accessionPrefix: 'ACC',
      accessionStartNumber: 1,
      accessionPadding: 4,
      accessionSeparator: '-',
      contactEmail: email,
      contactPhone: phone || '+91 98765 43210',
      currency: '₹',
    });

    // 2. Predefined Classes
    const defaultClasses = [
      { name: 'Nursery', order: 1, sections: ['A', 'B'] },
      { name: 'LKG', order: 2, sections: ['A', 'B', 'C'] },
      { name: 'UKG', order: 3, sections: ['A', 'B', 'C'] },
      { name: 'Class 1', order: 4, sections: ['A', 'B', 'C', 'D'] },
      { name: 'Class 2', order: 5, sections: ['A', 'B', 'C', 'D'] },
      { name: 'Class 3', order: 6, sections: ['A', 'B', 'C', 'D'] },
      { name: 'Class 4', order: 7, sections: ['A', 'B', 'C', 'D'] },
      { name: 'Class 5', order: 8, sections: ['A', 'B', 'C', 'D'] },
      { name: 'Class 6', order: 9, sections: ['A', 'B', 'C', 'D'] },
      { name: 'Class 7', order: 10, sections: ['A', 'B', 'C', 'D'] },
      { name: 'Class 8', order: 11, sections: ['A', 'B', 'C', 'D'] },
      { name: 'Class 9', order: 12, sections: ['A', 'B', 'C', 'D'] },
      { name: 'Class 10', order: 13, sections: ['A', 'B', 'C', 'D'] },
      { name: 'Class 11', order: 14, sections: ['A', 'B', 'C', 'D', 'Science', 'Commerce', 'Humanities'] },
      { name: 'Class 12', order: 15, sections: ['A', 'B', 'C', 'D', 'Science', 'Commerce', 'Humanities'] },
    ];

    await SchoolClass.insertMany(
      defaultClasses.map((c) => ({
        school: schoolId,
        name: c.name,
        order: c.order,
        sections: c.sections,
        isActive: true,
      }))
    );

    // 3. Predefined Sections
    const sectionsList = ['A', 'B', 'C', 'D', 'E', 'F'];
    await SchoolSection.insertMany(
      sectionsList.map((name, idx) => ({
        school: schoolId,
        name,
        order: idx + 1,
        isActive: true,
      }))
    );

    // 4. Predefined Book Categories
    const categoriesDefinition = [
      {
        name: 'Story Books',
        description: 'Fiction, Novels, and Folktales for all age groups',
        subCategories: ['Fiction', 'Classic', 'Fantasy', 'Mystery', 'Adventure', 'Comics', 'Folktales'],
      },
      {
        name: 'Science',
        description: 'Physics, Chemistry, Biology, Environmental science and space',
        subCategories: ['Physics', 'Chemistry', 'Biology', 'Astronomy', 'Environment', 'Experiments'],
      },
      {
        name: 'Mathematics',
        description: 'Applied, theoretical, and recreational mathematics',
        subCategories: ['Algebra', 'Geometry', 'Arithmetic', 'Statistics', 'Trigonometry', 'Vedic Math'],
      },
      {
        name: 'English',
        description: 'English Grammar, Literature, Comprehension and Vocab',
        subCategories: ['Grammar', 'Prose & Poetry', 'Vocabulary', 'Drama', 'Short Stories'],
      },
      {
        name: 'Hindi',
        description: 'Hindi Vyakaran, Sahitya and Kavita collections',
        subCategories: ['Vyakaran', 'Sahitya', 'Kahaniyan', 'Kavita', 'Natak', 'Nibandh'],
      },
      {
        name: 'Social Science',
        description: 'History, Civics, Geography and Economics',
        subCategories: ['History', 'Geography', 'Civics', 'Economics', 'World History'],
      },
      {
        name: 'Computer',
        description: 'Coding, Computer Fundamentals, AI and Robotics',
        subCategories: ['Coding & Python', 'Artificial Intelligence', 'Web Development', 'Fundamentals', 'Robotics'],
      },
      {
        name: 'General Knowledge',
        description: 'Current Affairs, Quiz, Encyclopedia and Facts',
        subCategories: ['Current Affairs', 'India & World', 'Quiz & Trivia', 'Science Facts', 'Encyclopedia'],
      },
      {
        name: 'Literature & Arts',
        description: 'Art, Drawing, Music, Biographies and Poetry',
        subCategories: ['Poetry', 'Drama', 'Biographies', 'Art & Painting', 'Music'],
      },
    ];

    await BookCategory.insertMany(
      categoriesDefinition.map((cat) => ({
        school: schoolId,
        name: cat.name,
        description: cat.description,
        subCategories: cat.subCategories,
        isActive: true,
      }))
    );
  } catch (error) {
    console.error('Error seeding new school defaults:', error);
  }
}

export async function seedDatabase(force: boolean = false) {
  try {
    // 0. Ensure Default Subscription Plans exist
    let starterPlan = await Plan.findOne({ code: 'STARTER' });
    if (!starterPlan) {
      starterPlan = await Plan.create({
        name: 'Starter School',
        code: 'STARTER',
        description: 'Ideal for small schools, primary branches, and early digital library setups.',
        price: 0,
        billingCycle: 'yearly',
        maxBooks: 500,
        maxMembers: 200,
        maxIssuedPerStudent: 2,
        isPopular: false,
        isActive: true,
        features: [
          'Up to 500 Catalog Book Titles',
          'Up to 200 Student & Faculty Members',
          'Standard Barcode Generator & Scanner',
          'Book Issue, Return & Reissue Management',
          'Dynamic Daily Fine Ledger',
          'Pre-configured Class & Section Masters',
          'Email & Ticket Support',
        ],
      });
    }

    let proCampusPlan = await Plan.findOne({ code: 'PRO_CAMPUS' });
    if (!proCampusPlan) {
      proCampusPlan = await Plan.create({
        name: 'Pro Campus Suite',
        code: 'PRO_CAMPUS',
        description: 'Full-featured powerhouse for CBSE/ICSE schools, high schools, and progressive academies.',
        price: 3499,
        billingCycle: 'yearly',
        maxBooks: 5000,
        maxMembers: 1500,
        maxIssuedPerStudent: 5,
        isPopular: true,
        isActive: true,
        features: [
          'Up to 5,000 Catalog Book Titles',
          'Up to 1,500 Student & Teacher Members',
          'Ultra-Fast 3-Second Barcode Circulation',
          'Digital Member ID Card Generator with Photo Barcode',
          'Warehouse Rack & Shelf Physical Location Mapping',
          'Zero-Fee Book Replacement & Lost Book Ledger',
          'Bulk Excel / CSV Multi-Catalog Importer',
          'Granular Fine Rules with Multi-date Grace Periods',
          'Priority WhatsApp & Phone Desk Support',
        ],
      });
    }

    let enterprisePlan = await Plan.findOne({ code: 'ENTERPRISE' });
    if (!enterprisePlan) {
      enterprisePlan = await Plan.create({
        name: 'Enterprise Multi-Campus',
        code: 'ENTERPRISE',
        description: 'Unlimited capacity with multi-branch management, custom API feeds, and priority SLAs.',
        price: 7999,
        billingCycle: 'yearly',
        maxBooks: -1,
        maxMembers: -1,
        maxIssuedPerStudent: 10,
        isPopular: false,
        isActive: true,
        features: [
          'Unlimited Book Titles & Physical Copies',
          'Unlimited Students, Teachers & Alumni Members',
          'Custom Accession Number Format & Prefix Logic',
          'Real-time WhatsApp / SMS Overdue Broadcasts',
          'Multi-School Campus Centralized Directory',
          'Automated Daily Cloud Backups & Export Vault',
          'Custom Library Rules & Multiple Fine Schedules',
          'Dedicated 24/7 Account Manager & SLA Guarantee',
        ],
      });
    }

    // 0b. Ensure Platform Super Administrator exists
    let superAdmin = await User.findOne({ email: 'superadmin@platform.com' });
    if (!superAdmin) {
      superAdmin = await User.create({
        name: 'Platform Super Administrator',
        email: 'superadmin@platform.com',
        password: 'superadmin123',
        role: 'superadmin',
        isActive: true,
      });
    }

    let defaultSchool = await School.findOne({ code: 'IPS' });
    if (!defaultSchool) {
      defaultSchool = await School.create({
        name: 'International Public School',
        code: 'IPS',
        libraryName: 'Central Public School Library',
        adminName: 'Mrs. Ananya Sharma (Head Librarian)',
        email: 'admin@school.edu',
        phone: '+91 98765 43210',
        address: 'Civil Lines, Knowledge Park',
        city: 'New Delhi',
        state: 'Delhi',
        isActive: true,
        status: 'active',
        plan: proCampusPlan._id,
        planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });
    } else if (!defaultSchool.plan) {
      defaultSchool.plan = proCampusPlan._id;
      defaultSchool.status = 'active';
      defaultSchool.planExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      await defaultSchool.save();
    }

    const studentCount = await Member.countDocuments({ school: defaultSchool._id, memberType: 'student' });
    const supplierCount = await Supplier.countDocuments({ school: defaultSchool._id });
    if (!force && studentCount >= 30 && supplierCount >= 3) {
      console.log('Database already populated with sufficient demo data. Skipping seed.');
      return;
    }

    console.log('🌱 Seeding extensive school library dataset...');

    // Clear existing collections if forcing or re-seeding for default school
    await Assignment.deleteMany({ school: defaultSchool._id });
    await Book.deleteMany({ school: defaultSchool._id });
    await Member.deleteMany({ school: defaultSchool._id });
    await BookCategory.deleteMany({ school: defaultSchool._id });
    await User.deleteMany({ school: defaultSchool._id });
    await LibrarySetting.deleteMany({ school: defaultSchool._id });
    await SchoolClass.deleteMany({ school: defaultSchool._id });
    await SchoolSection.deleteMany({ school: defaultSchool._id });
    await Supplier.deleteMany({ school: defaultSchool._id });
    await Shelf.deleteMany({ school: defaultSchool._id });

    // 1. Create Default Admin & Staff Accounts
    await User.create([
      {
        name: 'Mrs. Ananya Sharma (Head Librarian)',
        email: 'admin@school.edu',
        password: 'admin123',
        role: 'admin',
        school: defaultSchool._id,
        isActive: true,
      },
      {
        name: 'Mr. Rajesh Verma (Assistant Librarian)',
        email: 'assistant@school.edu',
        password: 'admin123',
        role: 'admin',
        school: defaultSchool._id,
        isActive: true,
      },
    ]);

    // 2. Create Library Settings
    await LibrarySetting.create({
      school: defaultSchool._id,
      libraryName: 'Central Public School Library',
      schoolName: 'International Public School',
      issueDuration: 14,
      finePerDay: 2,
      maxBooksPerMember: 3,
      contactEmail: 'library@school.edu',
      contactPhone: '+91 98765 43210',
      currency: '₹',
    });

    // 3. Create Predefined Classes & Sections Master
    const classConfigs = [
      { name: 'Nursery', order: 1, sections: ['A', 'B'] },
      { name: 'LKG', order: 2, sections: ['A', 'B', 'C'] },
      { name: 'UKG', order: 3, sections: ['A', 'B', 'C'] },
      { name: 'Class 1', order: 4, sections: ['A', 'B', 'C', 'D'] },
      { name: 'Class 2', order: 5, sections: ['A', 'B', 'C', 'D'] },
      { name: 'Class 3', order: 6, sections: ['A', 'B', 'C', 'D'] },
      { name: 'Class 4', order: 7, sections: ['A', 'B', 'C', 'D'] },
      { name: 'Class 5', order: 8, sections: ['A', 'B', 'C', 'D'] },
      { name: 'Class 6', order: 9, sections: ['A', 'B', 'C', 'D'] },
      { name: 'Class 7', order: 10, sections: ['A', 'B', 'C', 'D'] },
      { name: 'Class 8', order: 11, sections: ['A', 'B', 'C', 'D'] },
      { name: 'Class 9', order: 12, sections: ['A', 'B', 'C', 'D'] },
      { name: 'Class 10', order: 13, sections: ['A', 'B', 'C', 'D'] },
      { name: 'Class 11', order: 14, sections: ['A', 'B', 'C', 'D', 'Science', 'Commerce', 'Humanities'] },
      { name: 'Class 12', order: 15, sections: ['A', 'B', 'C', 'D', 'Science', 'Commerce', 'Humanities'] },
    ];

    await SchoolClass.insertMany(
      classConfigs.map((c) => ({
        school: defaultSchool._id,
        name: c.name,
        order: c.order,
        sections: c.sections,
        isActive: true,
      }))
    );

    const sectionsList = ['A', 'B', 'C', 'D', 'E', 'F'];
    await SchoolSection.insertMany(
      sectionsList.map((name, idx) => ({
        school: defaultSchool._id,
        name,
        order: idx + 1,
        isActive: true,
      }))
    );

    // 4. Create Book Categories with Sub-Categories
    const categoriesDefinition = [
      {
        name: 'Story Books',
        description: 'Fiction, Novels, and Folktales for all age groups',
        subCategories: ['Fiction', 'Classic', 'Fantasy', 'Mystery', 'Adventure', 'Comics', 'Folktales'],
      },
      {
        name: 'Science',
        description: 'Physics, Chemistry, Biology, Environmental science and space',
        subCategories: ['Physics', 'Chemistry', 'Biology', 'Astronomy', 'Environment', 'Experiments'],
      },
      {
        name: 'Mathematics',
        description: 'Applied, theoretical, and recreational mathematics',
        subCategories: ['Algebra', 'Geometry', 'Arithmetic', 'Statistics', 'Trigonometry', 'Vedic Math'],
      },
      {
        name: 'English',
        description: 'English Grammar, Literature, Comprehension and Vocab',
        subCategories: ['Grammar', 'Prose & Poetry', 'Vocabulary', 'Drama', 'Short Stories'],
      },
      {
        name: 'Hindi',
        description: 'Hindi Vyakaran, Sahitya and Kavita collections',
        subCategories: ['Vyakaran', 'Sahitya', 'Kahaniyan', 'Kavita', 'Natak', 'Nibandh'],
      },
      {
        name: 'Social Science',
        description: 'History, Civics, Geography and Economics',
        subCategories: ['History', 'Geography', 'Civics', 'Economics', 'World History'],
      },
      {
        name: 'Computer',
        description: 'Coding, Computer Fundamentals, AI and Robotics',
        subCategories: ['Coding & Python', 'Artificial Intelligence', 'Web Development', 'Fundamentals', 'Robotics'],
      },
      {
        name: 'General Knowledge',
        description: 'Current Affairs, Quiz, Encyclopedia and Facts',
        subCategories: ['Current Affairs', 'India & World', 'Quiz & Trivia', 'Science Facts', 'Encyclopedia'],
      },
      {
        name: 'Literature & Arts',
        description: 'Art, Drawing, Music, Biographies and Poetry',
        subCategories: ['Poetry', 'Drama', 'Biographies', 'Art & Painting', 'Music'],
      },
    ];

    const categoryDocs: { [key: string]: any } = {};
    for (const catData of categoriesDefinition) {
      const cat = await BookCategory.create({
        school: defaultSchool._id,
        name: catData.name,
        description: catData.description,
        subCategories: catData.subCategories,
        isActive: true,
      });
      categoryDocs[catData.name] = cat;
    }

    // 5. Create 50+ Detailed Student Members across all Classes and Sections
    const rawStudents = [
      // Nursery & Kindergarten
      { memberId: 'LIB-0001', name: 'Aarav Gupta', admissionNo: 'ADM-2024-001', className: 'Nursery', section: 'A', whatsapp: '9876543201', email: 'aarav.g@cps.edu' },
      { memberId: 'LIB-0002', name: 'Anvi Saxena', admissionNo: 'ADM-2024-002', className: 'Nursery', section: 'B', whatsapp: '9876543202', email: 'anvi.s@cps.edu' },
      { memberId: 'LIB-0003', name: 'Kabir Singhania', admissionNo: 'ADM-2024-003', className: 'LKG', section: 'A', whatsapp: '9876543203', email: 'kabir.s@cps.edu' },
      { memberId: 'LIB-0004', name: 'Myra Malhotra', admissionNo: 'ADM-2024-004', className: 'LKG', section: 'B', whatsapp: '9876543204', email: 'myra.m@cps.edu' },
      { memberId: 'LIB-0005', name: 'Advik Sen', admissionNo: 'ADM-2024-005', className: 'UKG', section: 'A', whatsapp: '9876543205', email: 'advik.s@cps.edu' },
      { memberId: 'LIB-0006', name: 'Ira Trivedi', admissionNo: 'ADM-2024-006', className: 'UKG', section: 'B', whatsapp: '9876543206', email: 'ira.t@cps.edu' },

      // Primary (Classes 1 - 5)
      { memberId: 'LIB-0007', name: 'Reyansh Kapoor', admissionNo: 'ADM-2024-007', className: 'Class 1', section: 'A', whatsapp: '9876543207', email: 'reyansh.k@cps.edu' },
      { memberId: 'LIB-0008', name: 'Aditi Joshi', admissionNo: 'ADM-2024-008', className: 'Class 1', section: 'B', whatsapp: '9876543208', email: 'aditi.j@cps.edu' },
      { memberId: 'LIB-0009', name: 'Vivaan Agarwal', admissionNo: 'ADM-2024-009', className: 'Class 2', section: 'A', whatsapp: '9876543209', email: 'vivaan.a@cps.edu' },
      { memberId: 'LIB-0010', name: 'Siya Verma', admissionNo: 'ADM-2024-010', className: 'Class 2', section: 'C', whatsapp: '9876543210', email: 'siya.v@cps.edu' },
      { memberId: 'LIB-0011', name: 'Dhruv Pandey', admissionNo: 'ADM-2024-011', className: 'Class 3', section: 'A', whatsapp: '9876543211', email: 'dhruv.p@cps.edu' },
      { memberId: 'LIB-0012', name: 'Kavya Nair', admissionNo: 'ADM-2024-012', className: 'Class 3', section: 'B', whatsapp: '9876543212', email: 'kavya.n@cps.edu' },
      { memberId: 'LIB-0013', name: 'Atharv Kulkarni', admissionNo: 'ADM-2024-013', className: 'Class 4', section: 'A', whatsapp: '9876543213', email: 'atharv.k@cps.edu' },
      { memberId: 'LIB-0014', name: 'Ishita Sharma', admissionNo: 'ADM-2024-014', className: 'Class 4', section: 'B', whatsapp: '9876543214', email: 'ishita.s@cps.edu' },
      { memberId: 'LIB-0015', name: 'Shaurya Pratap', admissionNo: 'ADM-2024-015', className: 'Class 5', section: 'A', whatsapp: '9876543215', email: 'shaurya.p@cps.edu' },
      { memberId: 'LIB-0016', name: 'Ananya Roy', admissionNo: 'ADM-2024-016', className: 'Class 5', section: 'C', whatsapp: '9876543216', email: 'ananya.r@cps.edu' },

      // Middle School (Classes 6 - 8)
      { memberId: 'LIB-0017', name: 'Pooja Bhatt', admissionNo: 'ADM-2024-017', className: 'Class 6', section: 'A', whatsapp: '9876543217', email: 'pooja.b@cps.edu' },
      { memberId: 'LIB-0018', name: 'Neha Bansal', admissionNo: 'ADM-2024-018', className: 'Class 6', section: 'B', whatsapp: '9876543218', email: 'neha.b@cps.edu' },
      { memberId: 'LIB-0019', name: 'Yash Vardhan', admissionNo: 'ADM-2024-019', className: 'Class 7', section: 'A', whatsapp: '9876543219', email: 'yash.v@cps.edu' },
      { memberId: 'LIB-0020', name: 'Aditya Joshi', admissionNo: 'ADM-2024-020', className: 'Class 7', section: 'B', whatsapp: '9876543220', email: 'aditya.j@cps.edu' },
      { memberId: 'LIB-0021', name: 'Samar Patel', admissionNo: 'ADM-2024-021', className: 'Class 7', section: 'C', whatsapp: '9876543221', email: 'samar.p@cps.edu' },
      { memberId: 'LIB-0022', name: 'Rohan Gupta', admissionNo: 'ADM-2024-022', className: 'Class 8', section: 'A', whatsapp: '9876543222', email: 'rohan.g@cps.edu' },
      { memberId: 'LIB-0023', name: 'Divya Khurana', admissionNo: 'ADM-2024-023', className: 'Class 8', section: 'B', whatsapp: '9876543223', email: 'divya.k@cps.edu' },
      { memberId: 'LIB-0024', name: 'Siddharth Sen', admissionNo: 'ADM-2024-024', className: 'Class 8', section: 'C', whatsapp: '9876543224', email: 'siddharth.s@cps.edu' },
      { memberId: 'LIB-0025', name: 'Rashi Agarwal', admissionNo: 'ADM-2024-025', className: 'Class 8', section: 'D', whatsapp: '9876543225', email: 'rashi.a@cps.edu' },

      // High School (Class 9 & 10)
      { memberId: 'LIB-0026', name: 'Aman Verma', admissionNo: 'ADM-2024-026', className: 'Class 9', section: 'A', whatsapp: '9876543226', email: 'aman.v@cps.edu' },
      { memberId: 'LIB-0027', name: 'Gaurav Gill', admissionNo: 'ADM-2024-027', className: 'Class 9', section: 'A', whatsapp: '9876543227', email: 'gaurav.g@cps.edu' },
      { memberId: 'LIB-0028', name: 'Tanmay Saxena', admissionNo: 'ADM-2024-028', className: 'Class 9', section: 'B', whatsapp: '9876543228', email: 'tanmay.s@cps.edu' },
      { memberId: 'LIB-0029', name: 'Sneha Roy', admissionNo: 'ADM-2024-029', className: 'Class 9', section: 'C', whatsapp: '9876543229', email: 'sneha.r@cps.edu' },
      { memberId: 'LIB-0030', name: 'Nikhil Kashyap', admissionNo: 'ADM-2024-030', className: 'Class 9', section: 'D', whatsapp: '9876543230', email: 'nikhil.k@cps.edu' },
      { memberId: 'LIB-0031', name: 'Rahul Sharma', admissionNo: 'ADM-2024-031', className: 'Class 10', section: 'A', whatsapp: '9876543231', email: 'rahul.s@cps.edu' },
      { memberId: 'LIB-0032', name: 'Riya Sengupta', admissionNo: 'ADM-2024-032', className: 'Class 10', section: 'A', whatsapp: '9876543232', email: 'riya.sg@cps.edu' },
      { memberId: 'LIB-0033', name: 'Priya Patel', admissionNo: 'ADM-2024-033', className: 'Class 10', section: 'B', whatsapp: '9876543233', email: 'priya.p@cps.edu' },
      { memberId: 'LIB-0034', name: 'Vikram Sethi', admissionNo: 'ADM-2024-034', className: 'Class 10', section: 'B', whatsapp: '9876543234', email: 'vikram.s@cps.edu' },
      { memberId: 'LIB-0035', name: 'Kabir Mehta', admissionNo: 'ADM-2024-035', className: 'Class 10', section: 'C', whatsapp: '9876543235', email: 'kabir.m@cps.edu' },
      { memberId: 'LIB-0036', name: 'Alok Mishra', admissionNo: 'ADM-2024-036', className: 'Class 10', section: 'D', whatsapp: '9876543236', email: 'alok.m@cps.edu' },

      // Senior Secondary (Class 11 & 12)
      { memberId: 'LIB-0037', name: 'Kavita Singh', admissionNo: 'ADM-2024-037', className: 'Class 11', section: 'Science', whatsapp: '9876543237', email: 'kavita.s@cps.edu' },
      { memberId: 'LIB-0038', name: 'Aryan Choudhary', admissionNo: 'ADM-2024-038', className: 'Class 11', section: 'Science', whatsapp: '9876543238', email: 'aryan.c@cps.edu' },
      { memberId: 'LIB-0039', name: 'Arjun Das', admissionNo: 'ADM-2024-039', className: 'Class 11', section: 'Commerce', whatsapp: '9876543239', email: 'arjun.d@cps.edu' },
      { memberId: 'LIB-0040', name: 'Zoya Khan', admissionNo: 'ADM-2024-040', className: 'Class 11', section: 'Commerce', whatsapp: '9876543240', email: 'zoya.k@cps.edu' },
      { memberId: 'LIB-0041', name: 'Ananya Deshmukh', admissionNo: 'ADM-2024-041', className: 'Class 11', section: 'Humanities', whatsapp: '9876543241', email: 'ananya.d@cps.edu' },
      { memberId: 'LIB-0042', name: 'Harshit Tyagi', admissionNo: 'ADM-2024-042', className: 'Class 11', section: 'A', whatsapp: '9876543242', email: 'harshit.t@cps.edu' },
      { memberId: 'LIB-0043', name: 'Meera Nair', admissionNo: 'ADM-2024-043', className: 'Class 12', section: 'Science', whatsapp: '9876543243', email: 'meera.n@cps.edu' },
      { memberId: 'LIB-0044', name: 'Devendra Pandey', admissionNo: 'ADM-2024-044', className: 'Class 12', section: 'Science', whatsapp: '9876543244', email: 'devendra.p@cps.edu' },
      { memberId: 'LIB-0045', name: 'Isha Reddy', admissionNo: 'ADM-2024-045', className: 'Class 12', section: 'Commerce', whatsapp: '9876543245', email: 'isha.r@cps.edu' },
      { memberId: 'LIB-0046', name: 'Tushar Bajaj', admissionNo: 'ADM-2024-046', className: 'Class 12', section: 'Commerce', whatsapp: '9876543246', email: 'tushar.b@cps.edu' },
      { memberId: 'LIB-0047', name: 'Bhavna Kulkarni', admissionNo: 'ADM-2024-047', className: 'Class 12', section: 'Humanities', whatsapp: '9876543247', email: 'bhavna.k@cps.edu' },
      { memberId: 'LIB-0048', name: 'Pranav Saxena', admissionNo: 'ADM-2024-048', className: 'Class 12', section: 'A', whatsapp: '9876543248', email: 'pranav.s@cps.edu' },
      { memberId: 'LIB-0049', name: 'Deepika Saini', admissionNo: 'ADM-2024-049', className: 'Class 12', section: 'B', whatsapp: '9876543249', email: 'deepika.s@cps.edu' },
      { memberId: 'LIB-0050', name: 'Kartik Bhardwaj', admissionNo: 'ADM-2024-050', className: 'Class 10', section: 'A', whatsapp: '9876543250', email: 'kartik.b@cps.edu' },
    ];

    const studentMembersToInsert = rawStudents.map((s) => ({
      ...s,
      school: defaultSchool._id,
      memberType: 'student' as const,
      status: 'active' as const,
    }));

    // 6. Create 6 Teacher Members
    const teacherMembersToInsert = [
      {
        school: defaultSchool._id,
        memberId: 'TCH-0001',
        name: 'Dr. Suresh Chandra',
        memberType: 'teacher' as const,
        whatsapp: '9811223344',
        email: 'suresh.c@cps.edu',
        designation: 'PGT Physics / HOD',
        department: 'Science',
        status: 'active' as const,
      },
      {
        school: defaultSchool._id,
        memberId: 'TCH-0002',
        name: 'Mrs. Sunita Mathur',
        memberType: 'teacher' as const,
        whatsapp: '9811223345',
        email: 'sunita.m@cps.edu',
        designation: 'PGT Mathematics',
        department: 'Mathematics',
        status: 'active' as const,
      },
      {
        school: defaultSchool._id,
        memberId: 'TCH-0003',
        name: 'Mr. Arvind Saxena',
        memberType: 'teacher' as const,
        whatsapp: '9811223346',
        email: 'arvind.s@cps.edu',
        designation: 'TGT Computer Science',
        department: 'Computer',
        status: 'active' as const,
      },
      {
        school: defaultSchool._id,
        memberId: 'TCH-0004',
        name: 'Mrs. Vandana Tripathi',
        memberType: 'teacher' as const,
        whatsapp: '9811223347',
        email: 'vandana.t@cps.edu',
        designation: 'TGT English Literature',
        department: 'English',
        status: 'active' as const,
      },
      {
        school: defaultSchool._id,
        memberId: 'TCH-0005',
        name: 'Mr. Manoj Kumar Tiwari',
        memberType: 'teacher' as const,
        whatsapp: '9811223348',
        email: 'manoj.t@cps.edu',
        designation: 'TGT Hindi Sahitya',
        department: 'Hindi',
        status: 'active' as const,
      },
      {
        school: defaultSchool._id,
        memberId: 'TCH-0006',
        name: 'Mrs. Ritu Chawla',
        memberType: 'teacher' as const,
        whatsapp: '9811223349',
        email: 'ritu.c@cps.edu',
        designation: 'TGT Social Science',
        department: 'Social Science',
        status: 'active' as const,
      },
    ];

    const createdMembers = await Member.insertMany([
      ...studentMembersToInsert,
      ...teacherMembersToInsert,
    ]);

    // 6.5 Create Suppliers & Vendor Master
    const suppliersDefinition = [
      {
        school: defaultSchool._id,
        name: 'Bharati Bhawan Publishers & Distributors',
        contactPerson: 'Mr. Ramesh Chandra',
        phone: '+91 98310 12345',
        email: 'sales@bharatibhawan.in',
        address: 'Ansari Road, Daryaganj, New Delhi - 110002',
        gstNumber: '07AAACB1234F1Z1',
        notes: 'Primary vendor for CBSE Physics, Math & Science textbooks',
        isActive: true,
      },
      {
        school: defaultSchool._id,
        name: 'Oxford University Press India',
        contactPerson: 'Ms. Meenakshi Sundaram',
        phone: '+91 98100 54321',
        email: 'custserv.in@oup.com',
        address: 'YMCA Library Building, 1 Jai Singh Road, New Delhi - 110001',
        gstNumber: '07AAACU2345G2Z2',
        notes: 'English Literature, Dictionaries, Atlas & International editions',
        isActive: true,
      },
      {
        school: defaultSchool._id,
        name: 'S. Chand & Company Ltd',
        contactPerson: 'Mr. Virender Kapoor',
        phone: '+91 98111 98765',
        email: 'info@schandpublishing.com',
        address: '7361, Ram Nagar, Qutab Road, New Delhi - 110055',
        gstNumber: '07AAACS3456H3Z3',
        notes: 'Grammar, Biology and Secondary standard reference guides',
        isActive: true,
      },
      {
        school: defaultSchool._id,
        name: 'National Book Depot & School Supplies',
        contactPerson: 'Mr. Pradeep Agarwal',
        phone: '+91 98200 45678',
        email: 'nbdbooks@gmail.com',
        address: '12 Station Road, Civil Lines, Prayagraj - 211001',
        gstNumber: '09AABPN4567J4Z4',
        notes: 'General story books, Computer guides, NCERT distributors',
        isActive: true,
      },
      {
        school: defaultSchool._id,
        name: 'Lokbharti & Rajkamal Hindi Prakashan',
        contactPerson: 'Mr. Shashi Kant Mishra',
        phone: '+91 98450 78901',
        email: 'contact@lokbharti.co.in',
        address: '15-A, Mahatma Gandhi Marg, Prayagraj - 211001',
        gstNumber: '09AAACL5678K5Z5',
        notes: 'Hindi Sahitya, Premchand classics, Kavita & Natak publisher',
        isActive: true,
      },
    ];

    const createdSuppliers = await Supplier.insertMany(suppliersDefinition);
    const supplierDocs: { [key: string]: any } = {};
    createdSuppliers.forEach((s) => {
      supplierDocs[s.name] = s;
    });

    // 6.6 Create Shelf & Rack Locations Master
    const shelvesDefinition = [
      { school: defaultSchool._id, name: 'Shelf A-1', floorOrRoom: 'Ground Floor (Main Reading Room)', capacity: 120, description: 'Classics, Fiction & Young Adult Novels', isActive: true },
      { school: defaultSchool._id, name: 'Shelf A-2', floorOrRoom: 'Ground Floor (Main Reading Room)', capacity: 100, description: 'Folktales, Children Literature & Picture Books', isActive: true },
      { school: defaultSchool._id, name: 'Shelf B-1', floorOrRoom: 'First Floor (Science Wing)', capacity: 90, description: 'Physics, Mechanics & Astronomy', isActive: true },
      { school: defaultSchool._id, name: 'Shelf B-2', floorOrRoom: 'First Floor (Science Wing)', capacity: 90, description: 'Chemistry, Biology & Environmental Science', isActive: true },
      { school: defaultSchool._id, name: 'Shelf C-1', floorOrRoom: 'First Floor (Math & Tech Wing)', capacity: 100, description: 'Mathematics, Algebra, Calculus & Statistics', isActive: true },
      { school: defaultSchool._id, name: 'Shelf D-1', floorOrRoom: 'Ground Floor (Language Corner)', capacity: 110, description: 'English Grammar, Drama, Shakespeare & Poetry', isActive: true },
      { school: defaultSchool._id, name: 'Shelf D-2', floorOrRoom: 'Ground Floor (Language Corner)', capacity: 100, description: 'Hindi Sahitya, Vyakaran, Novels & Dinkar Works', isActive: true },
      { school: defaultSchool._id, name: 'Shelf E-1', floorOrRoom: 'First Floor (Social Studies)', capacity: 95, description: 'World History, Geography, Atlas & Civics', isActive: true },
      { school: defaultSchool._id, name: 'Shelf F-1', floorOrRoom: 'Ground Floor (IT Lab Reference)', capacity: 80, description: 'Computer Science, Python, AI & Coding manuals', isActive: true },
      { school: defaultSchool._id, name: 'Shelf G-1', floorOrRoom: 'Ground Floor (Reference Desk)', capacity: 100, description: 'Encyclopedias, Year Books, Quiz & Art Biographies', isActive: true },
    ];

    await Shelf.insertMany(shelvesDefinition);

    // 7. Create 32+ Rich Books Across All Categories with Price, Supplier & Shelf Location
    const rawBooks = [
      // Story Books & Literature
      {
        title: 'The Alchemist',
        author: 'Paulo Coelho',
        language: 'English',
        publisher: 'HarperCollins',
        publisherNumber: 'HC-978-00623',
        category: categoryDocs['Story Books']._id,
        price: 350,
        supplier: supplierDocs['National Book Depot & School Supplies']._id,
        shelfLocation: 'Shelf A-1',
        totalCopies: 15,
        availableCopies: 11,
        assignedCopies: 4,
      },
      {
        title: 'Wings of Fire: An Autobiography',
        author: 'Dr. A.P.J. Abdul Kalam',
        language: 'English',
        publisher: 'Universities Press',
        publisherNumber: 'UP-BIO-2002',
        category: categoryDocs['Story Books']._id,
        price: 295,
        supplier: supplierDocs['Oxford University Press India']._id,
        shelfLocation: 'Shelf A-1',
        totalCopies: 14,
        availableCopies: 9,
        assignedCopies: 5,
      },
      {
        title: 'Malgudi Days',
        author: 'R. K. Narayan',
        language: 'English',
        publisher: 'Indian Thought Publications',
        publisherNumber: 'ITP-RKN-12',
        category: categoryDocs['Story Books']._id,
        price: 220,
        supplier: supplierDocs['National Book Depot & School Supplies']._id,
        shelfLocation: 'Shelf A-1',
        totalCopies: 16,
        availableCopies: 12,
        assignedCopies: 4,
      },
      {
        title: 'The Blue Umbrella',
        author: 'Ruskin Bond',
        language: 'English',
        publisher: 'Rupa Publications',
        publisherNumber: 'RUPA-RB-01',
        category: categoryDocs['Story Books']._id,
        price: 150,
        supplier: supplierDocs['National Book Depot & School Supplies']._id,
        shelfLocation: 'Shelf A-2',
        totalCopies: 12,
        availableCopies: 9,
        assignedCopies: 3,
      },
      {
        title: "Grandma's Bag of Stories",
        author: 'Sudha Murty',
        language: 'English',
        publisher: 'Puffin Books',
        publisherNumber: 'PUF-SM-2015',
        category: categoryDocs['Story Books']._id,
        price: 250,
        supplier: supplierDocs['National Book Depot & School Supplies']._id,
        shelfLocation: 'Shelf A-2',
        totalCopies: 14,
        availableCopies: 11,
        assignedCopies: 3,
      },
      {
        title: 'Harry Potter and the Sorcerer’s Stone',
        author: 'J.K. Rowling',
        language: 'English',
        publisher: 'Bloomsbury',
        publisherNumber: 'BLM-HP-01',
        category: categoryDocs['Story Books']._id,
        price: 499,
        supplier: supplierDocs['Oxford University Press India']._id,
        shelfLocation: 'Shelf A-1',
        totalCopies: 10,
        availableCopies: 6,
        assignedCopies: 4,
      },

      // Science
      {
        title: 'Concepts of Physics (Vol 1)',
        author: 'Dr. H.C. Verma',
        language: 'English',
        publisher: 'Bharati Bhawan',
        publisherNumber: 'BB-PHY-01',
        category: categoryDocs['Science']._id,
        price: 460,
        supplier: supplierDocs['Bharati Bhawan Publishers & Distributors']._id,
        shelfLocation: 'Shelf B-1',
        totalCopies: 18,
        availableCopies: 12,
        assignedCopies: 6,
      },
      {
        title: 'Concepts of Physics (Vol 2)',
        author: 'Dr. H.C. Verma',
        language: 'English',
        publisher: 'Bharati Bhawan',
        publisherNumber: 'BB-PHY-02',
        category: categoryDocs['Science']._id,
        price: 475,
        supplier: supplierDocs['Bharati Bhawan Publishers & Distributors']._id,
        shelfLocation: 'Shelf B-1',
        totalCopies: 15,
        availableCopies: 10,
        assignedCopies: 5,
      },
      {
        title: 'Pradeep Fundamental Physics - Class 11',
        author: 'K.L. Gomber & K.L. Gogia',
        language: 'English',
        publisher: 'Pradeep Publications',
        publisherNumber: 'PP-SCI-112',
        category: categoryDocs['Science']._id,
        price: 850,
        supplier: supplierDocs['Bharati Bhawan Publishers & Distributors']._id,
        shelfLocation: 'Shelf B-1',
        totalCopies: 12,
        availableCopies: 8,
        assignedCopies: 4,
      },
      {
        title: 'A Textbook of CBSE Biology - Class 12',
        author: 'Dr. P.S. Verma & V.K. Agarwal',
        language: 'English',
        publisher: 'S. Chand & Company',
        publisherNumber: 'SCH-BIO-12',
        category: categoryDocs['Science']._id,
        price: 680,
        supplier: supplierDocs['S. Chand & Company Ltd']._id,
        shelfLocation: 'Shelf B-2',
        totalCopies: 14,
        availableCopies: 10,
        assignedCopies: 4,
      },
      {
        title: 'Concise Chemistry - Class 10',
        author: 'Dr. S.P. Singh',
        language: 'English',
        publisher: 'Selina Publishers',
        publisherNumber: 'SEL-CHEM-10',
        category: categoryDocs['Science']._id,
        price: 390,
        supplier: supplierDocs['S. Chand & Company Ltd']._id,
        shelfLocation: 'Shelf B-2',
        totalCopies: 15,
        availableCopies: 11,
        assignedCopies: 4,
      },

      // Mathematics
      {
        title: 'Mathematics Exemplar - Class 10',
        author: 'R.D. Sharma',
        language: 'English',
        publisher: 'Dhanpat Rai Publications',
        publisherNumber: 'DR-2024-MATH',
        category: categoryDocs['Mathematics']._id,
        price: 520,
        supplier: supplierDocs['National Book Depot & School Supplies']._id,
        shelfLocation: 'Shelf C-1',
        totalCopies: 22,
        availableCopies: 16,
        assignedCopies: 6,
      },
      {
        title: 'Secondary School Mathematics - Class 9',
        author: 'R.S. Aggarwal',
        language: 'English',
        publisher: 'Bharati Bhawan',
        publisherNumber: 'BB-MATH-09',
        category: categoryDocs['Mathematics']._id,
        price: 430,
        supplier: supplierDocs['Bharati Bhawan Publishers & Distributors']._id,
        shelfLocation: 'Shelf C-1',
        totalCopies: 18,
        availableCopies: 13,
        assignedCopies: 5,
      },
      {
        title: 'Vedic Mathematics Made Easy',
        author: 'Dhaval Bathia',
        language: 'English',
        publisher: 'Jaico Publishing House',
        publisherNumber: 'JAI-VM-88',
        category: categoryDocs['Mathematics']._id,
        price: 275,
        supplier: supplierDocs['Oxford University Press India']._id,
        shelfLocation: 'Shelf C-1',
        totalCopies: 10,
        availableCopies: 8,
        assignedCopies: 2,
      },
      {
        title: 'Senior Secondary Mathematics - Class 12',
        author: 'R.D. Sharma',
        language: 'English',
        publisher: 'Dhanpat Rai Publications',
        publisherNumber: 'DR-2025-M12',
        category: categoryDocs['Mathematics']._id,
        price: 790,
        supplier: supplierDocs['National Book Depot & School Supplies']._id,
        shelfLocation: 'Shelf C-1',
        totalCopies: 14,
        availableCopies: 10,
        assignedCopies: 4,
      },

      // English Language & Literature
      {
        title: 'High School English Grammar and Composition',
        author: 'Wren & Martin (Revised by N.D.V. Prasada Rao)',
        language: 'English',
        publisher: 'S. Chand Publishing',
        publisherNumber: 'SCH-WM-GRAM',
        category: categoryDocs['English']._id,
        price: 360,
        supplier: supplierDocs['S. Chand & Company Ltd']._id,
        shelfLocation: 'Shelf D-1',
        totalCopies: 20,
        availableCopies: 14,
        assignedCopies: 6,
      },
      {
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        language: 'English',
        publisher: 'J. B. Lippincott & Co.',
        publisherNumber: 'JB-LIT-1960',
        category: categoryDocs['English']._id,
        price: 399,
        supplier: supplierDocs['Oxford University Press India']._id,
        shelfLocation: 'Shelf D-1',
        totalCopies: 10,
        availableCopies: 8,
        assignedCopies: 2,
      },
      {
        title: 'The Merchant of Venice (ICSE Edition)',
        author: 'William Shakespeare',
        language: 'English',
        publisher: 'Oxford University Press',
        publisherNumber: 'OUP-SHAK-MOV',
        category: categoryDocs['English']._id,
        price: 240,
        supplier: supplierDocs['Oxford University Press India']._id,
        shelfLocation: 'Shelf D-1',
        totalCopies: 15,
        availableCopies: 12,
        assignedCopies: 3,
      },
      {
        title: 'Animal Farm',
        author: 'George Orwell',
        language: 'English',
        publisher: 'Secker and Warburg',
        publisherNumber: 'SW-AF-1945',
        category: categoryDocs['English']._id,
        price: 195,
        supplier: supplierDocs['Oxford University Press India']._id,
        shelfLocation: 'Shelf D-1',
        totalCopies: 10,
        availableCopies: 8,
        assignedCopies: 2,
      },

      // Hindi Sahitya
      {
        title: 'Godaan (गोदान)',
        author: 'Munshi Premchand',
        language: 'Hindi',
        publisher: 'Lokbharti Prakashan',
        publisherNumber: 'LP-HIN-901',
        category: categoryDocs['Hindi']._id,
        price: 180,
        supplier: supplierDocs['Lokbharti & Rajkamal Hindi Prakashan']._id,
        shelfLocation: 'Shelf D-2',
        totalCopies: 15,
        availableCopies: 11,
        assignedCopies: 4,
      },
      {
        title: 'Madhushala (मधुशाला)',
        author: 'Harivansh Rai Bachchan',
        language: 'Hindi',
        publisher: 'Rajpal and Sons',
        publisherNumber: 'RS-HIN-442',
        category: categoryDocs['Hindi']._id,
        price: 160,
        supplier: supplierDocs['Lokbharti & Rajkamal Hindi Prakashan']._id,
        shelfLocation: 'Shelf D-2',
        totalCopies: 12,
        availableCopies: 9,
        assignedCopies: 3,
      },
      {
        title: 'Rashmirathi (रश्मिरथी)',
        author: 'Ramdhari Singh Dinkar',
        language: 'Hindi',
        publisher: 'Lokbharti Prakashan',
        publisherNumber: 'LP-HIN-RASH',
        category: categoryDocs['Hindi']._id,
        price: 190,
        supplier: supplierDocs['Lokbharti & Rajkamal Hindi Prakashan']._id,
        shelfLocation: 'Shelf D-2',
        totalCopies: 14,
        availableCopies: 10,
        assignedCopies: 4,
      },
      {
        title: 'Nirmala (निर्मला)',
        author: 'Munshi Premchand',
        language: 'Hindi',
        publisher: 'Rajkamal Prakashan',
        publisherNumber: 'RKP-NIR-11',
        category: categoryDocs['Hindi']._id,
        price: 150,
        supplier: supplierDocs['Lokbharti & Rajkamal Hindi Prakashan']._id,
        shelfLocation: 'Shelf D-2',
        totalCopies: 10,
        availableCopies: 7,
        assignedCopies: 3,
      },

      // Social Science
      {
        title: 'India and the Contemporary World - Class 10',
        author: 'NCERT Editorial Board',
        language: 'English',
        publisher: 'NCERT',
        publisherNumber: 'NCERT-SST-10',
        category: categoryDocs['Social Science']._id,
        price: 125,
        supplier: supplierDocs['National Book Depot & School Supplies']._id,
        shelfLocation: 'Shelf E-1',
        totalCopies: 24,
        availableCopies: 18,
        assignedCopies: 6,
      },
      {
        title: 'The Discovery of India',
        author: 'Jawaharlal Nehru',
        language: 'English',
        publisher: 'Penguin Books India',
        publisherNumber: 'PEN-DOI-1946',
        category: categoryDocs['Social Science']._id,
        price: 599,
        supplier: supplierDocs['Oxford University Press India']._id,
        shelfLocation: 'Shelf E-1',
        totalCopies: 12,
        availableCopies: 9,
        assignedCopies: 3,
      },
      {
        title: 'Oxford Student Atlas for India (4th Edition)',
        author: 'Oxford Cartographers',
        language: 'English',
        publisher: 'Oxford University Press',
        publisherNumber: 'OUP-ATL-IND4',
        category: categoryDocs['Social Science']._id,
        price: 380,
        supplier: supplierDocs['Oxford University Press India']._id,
        shelfLocation: 'Shelf E-1',
        totalCopies: 16,
        availableCopies: 12,
        assignedCopies: 4,
      },

      // Computer & IT
      {
        title: 'Computer Science with Python - Class 12',
        author: 'Sumita Arora',
        language: 'English',
        publisher: 'Dhanpat Rai & Co',
        publisherNumber: 'DR-CS-PY-12',
        category: categoryDocs['Computer']._id,
        price: 650,
        supplier: supplierDocs['National Book Depot & School Supplies']._id,
        shelfLocation: 'Shelf F-1',
        totalCopies: 18,
        availableCopies: 12,
        assignedCopies: 6,
      },
      {
        title: 'Information Technology Code 402 - Class 10',
        author: 'Kips Editorial Board',
        language: 'English',
        publisher: 'Kips Learning Solutions',
        publisherNumber: 'KIPS-IT-402',
        category: categoryDocs['Computer']._id,
        price: 420,
        supplier: supplierDocs['National Book Depot & School Supplies']._id,
        shelfLocation: 'Shelf F-1',
        totalCopies: 20,
        availableCopies: 14,
        assignedCopies: 6,
      },
      {
        title: 'Let Us C (19th Edition)',
        author: 'Yashavant Kanetkar',
        language: 'English',
        publisher: 'BPB Publications',
        publisherNumber: 'BPB-LUC-19',
        category: categoryDocs['Computer']._id,
        price: 375,
        supplier: supplierDocs['National Book Depot & School Supplies']._id,
        shelfLocation: 'Shelf F-1',
        totalCopies: 12,
        availableCopies: 8,
        assignedCopies: 4,
      },

      // General Knowledge & Reference
      {
        title: 'Manorama Year Book 2026',
        author: 'Mammen Mathew',
        language: 'English',
        publisher: 'Malayala Manorama',
        publisherNumber: 'MM-GK-2026',
        category: categoryDocs['General Knowledge']._id,
        price: 320,
        supplier: supplierDocs['National Book Depot & School Supplies']._id,
        shelfLocation: 'Shelf G-1',
        totalCopies: 15,
        availableCopies: 11,
        assignedCopies: 4,
      },
      {
        title: 'Lucent General Knowledge (Latest Edition)',
        author: 'Dr. Binay Karna & Manwendra Mukul',
        language: 'English',
        publisher: 'Lucent Publications',
        publisherNumber: 'LUC-GK-2026',
        category: categoryDocs['General Knowledge']._id,
        price: 210,
        supplier: supplierDocs['National Book Depot & School Supplies']._id,
        shelfLocation: 'Shelf G-1',
        totalCopies: 16,
        availableCopies: 12,
        assignedCopies: 4,
      },

      // Literature & Arts
      {
        title: 'Gitanjali (Song Offerings)',
        author: 'Rabindranath Tagore',
        language: 'English',
        publisher: 'Macmillan & Co.',
        publisherNumber: 'MAC-GIT-1913',
        category: categoryDocs['Literature & Arts']._id,
        price: 195,
        supplier: supplierDocs['Oxford University Press India']._id,
        shelfLocation: 'Shelf G-1',
        totalCopies: 10,
        availableCopies: 8,
        assignedCopies: 2,
      },
      {
        title: 'The Story of Art',
        author: 'E.H. Gombrich',
        language: 'English',
        publisher: 'Phaidon Press',
        publisherNumber: 'PHAI-ART-16',
        category: categoryDocs['Literature & Arts']._id,
        price: 1450,
        supplier: supplierDocs['Oxford University Press India']._id,
        shelfLocation: 'Shelf G-1',
        totalCopies: 8,
        availableCopies: 6,
        assignedCopies: 2,
      },
    ];

    const createdBooks = await Book.insertMany(
      rawBooks.map((b) => ({
        ...b,
        school: defaultSchool._id,
      }))
    );

    // 8. Generate 50+ Realistic Assignments across timeline
    const now = new Date();
    const assignmentsToInsert: any[] = [];

    const createDates = (daysAgoAssigned: number, durationDays = 14) => {
      const assigned = new Date(now);
      assigned.setDate(assigned.getDate() - daysAgoAssigned);
      const due = new Date(assigned);
      due.setDate(due.getDate() + durationDays);
      return { assigned, due };
    };

    // ACTIVE ISSUED BOOKS
    const activeAssignments = [
      { memberIdx: 30, bookIdx: 0, daysAgo: 4, remarks: 'Class 10 English literature project' },
      { memberIdx: 31, bookIdx: 11, daysAgo: 6, remarks: 'Class 10 CBSE Math syllabus preparation' },
      { memberIdx: 32, bookIdx: 6, daysAgo: 3, remarks: 'Kinematics & Optics assignments' },
      { memberIdx: 33, bookIdx: 19, daysAgo: 5, remarks: 'Hindi Sahitya essay contest' },
      { memberIdx: 34, bookIdx: 26, daysAgo: 2, remarks: 'Python data structures practicals' },
      { memberIdx: 36, bookIdx: 1, daysAgo: 7, remarks: 'Reading recommendation by science teacher' },
      { memberIdx: 37, bookIdx: 23, daysAgo: 4, remarks: 'History map and chronology work' },
      { memberIdx: 38, bookIdx: 29, daysAgo: 1, remarks: 'Current affairs quiz preparation' },
      { memberIdx: 39, bookIdx: 2, daysAgo: 8, remarks: 'Weekend leisure reading' },
      { memberIdx: 40, bookIdx: 15, daysAgo: 5, remarks: 'Grammar and comprehension practice' },
      { memberIdx: 42, bookIdx: 3, daysAgo: 3, remarks: 'Short stories reading club' },
      { memberIdx: 43, bookIdx: 31, daysAgo: 6, remarks: 'Bengali/English poetry analysis' },
      { memberIdx: 44, bookIdx: 12, daysAgo: 4, remarks: 'Algebra and geometry practice' },
      { memberIdx: 45, bookIdx: 27, daysAgo: 2, remarks: 'Employability skills and IT practical' },
      { memberIdx: 25, bookIdx: 4, daysAgo: 5, remarks: 'Moral stories assignment' },
      { memberIdx: 26, bookIdx: 16, daysAgo: 3, remarks: 'Classic English literature study' },
      { memberIdx: 27, bookIdx: 20, daysAgo: 6, remarks: 'Hindi recitation preparation' },
      { memberIdx: 28, bookIdx: 7, daysAgo: 4, remarks: 'Thermodynamics problem solving' },
      { memberIdx: 21, bookIdx: 24, daysAgo: 7, remarks: 'Freedom movement history reference' },
      { memberIdx: 22, bookIdx: 30, daysAgo: 2, remarks: 'Competitive exam general studies' },
      { memberIdx: 18, bookIdx: 13, daysAgo: 5, remarks: 'Speed calculation techniques' },
      { memberIdx: 16, bookIdx: 5, daysAgo: 3, remarks: 'Fiction fantasy series study' },
      { memberIdx: 14, bookIdx: 8, daysAgo: 6, remarks: 'Units and measurements reference' },
      { memberIdx: 12, bookIdx: 25, daysAgo: 4, remarks: 'Geography world atlas assignment' },
      { memberIdx: 10, bookIdx: 28, daysAgo: 2, remarks: 'Algorithms and C programming' },
      { memberIdx: 8, bookIdx: 3, daysAgo: 4, remarks: 'Primary reader activity' },
      { memberIdx: 6, bookIdx: 4, daysAgo: 3, remarks: 'Picture story book loan' },
      { memberIdx: 4, bookIdx: 4, daysAgo: 2, remarks: 'Kindergarten storytelling session' },
      { memberIdx: 50, bookIdx: 10, daysAgo: 5, remarks: 'Teacher reference copy for Grade 10' },
      { memberIdx: 51, bookIdx: 14, daysAgo: 3, remarks: 'Teacher mathematics textbook reference' },
    ];

    for (const a of activeAssignments) {
      if (createdMembers[a.memberIdx] && createdBooks[a.bookIdx]) {
        const { assigned, due } = createDates(a.daysAgo);
        assignmentsToInsert.push({
          school: defaultSchool._id,
          member: createdMembers[a.memberIdx]._id,
          book: createdBooks[a.bookIdx]._id,
          assignedDate: assigned,
          dueDate: due,
          status: 'assigned',
          fineAmount: 0,
          fineStatus: 'none',
          remarks: a.remarks,
        });
      }
    }

    // OVERDUE ASSIGNMENTS (Late with pending fines)
    const overdueAssignments = [
      { memberIdx: 29, bookIdx: 0, daysAgo: 20, overdueDays: 6, remarks: 'SMS reminder sent to parent regarding return' },
      { memberIdx: 43, bookIdx: 9, daysAgo: 22, overdueDays: 8, remarks: 'Biology botany chapter notes preparation' },
      { memberIdx: 35, bookIdx: 21, daysAgo: 19, overdueDays: 5, remarks: 'First overdue notice sent to student' },
      { memberIdx: 23, bookIdx: 17, daysAgo: 24, overdueDays: 10, remarks: 'Drama script practice overdue' },
      { memberIdx: 38, bookIdx: 10, daysAgo: 21, overdueDays: 7, remarks: 'Chemistry reactions test overdue' },
      { memberIdx: 46, bookIdx: 11, daysAgo: 18, overdueDays: 4, remarks: 'Accountancy ledger practice late' },
    ];

    for (const o of overdueAssignments) {
      if (createdMembers[o.memberIdx] && createdBooks[o.bookIdx]) {
        const { assigned, due } = createDates(o.daysAgo);
        assignmentsToInsert.push({
          school: defaultSchool._id,
          member: createdMembers[o.memberIdx]._id,
          book: createdBooks[o.bookIdx]._id,
          assignedDate: assigned,
          dueDate: due,
          status: 'overdue',
          fineAmount: o.overdueDays * 2,
          fineStatus: 'pending',
          remarks: o.remarks,
        });
      }
    }

    // RETURNED ON TIME ASSIGNMENTS
    const returnedOnTime = [
      { memberIdx: 30, bookIdx: 11, daysAgoAssigned: 35, returnAfter: 10, remarks: 'Returned on time in pristine condition' },
      { memberIdx: 31, bookIdx: 6, daysAgoAssigned: 40, returnAfter: 12, remarks: 'Returned on time, verified barcode' },
      { memberIdx: 32, bookIdx: 15, daysAgoAssigned: 30, returnAfter: 13, remarks: 'Returned before due date' },
      { memberIdx: 36, bookIdx: 20, daysAgoAssigned: 28, returnAfter: 9, remarks: 'Hindi prose return completed' },
      { memberIdx: 39, bookIdx: 29, daysAgoAssigned: 45, returnAfter: 11, remarks: 'Quiz concluded, book returned' },
      { memberIdx: 25, bookIdx: 2, daysAgoAssigned: 32, returnAfter: 8, remarks: 'Short stories reading completed' },
      { memberIdx: 44, bookIdx: 26, daysAgoAssigned: 38, returnAfter: 14, remarks: 'Returned on exact due date' },
      { memberIdx: 16, bookIdx: 1, daysAgoAssigned: 50, returnAfter: 10, remarks: 'Biography returned safely' },
      { memberIdx: 21, bookIdx: 12, daysAgoAssigned: 36, returnAfter: 12, remarks: 'Class 8 Math homework complete' },
    ];

    for (const r of returnedOnTime) {
      if (createdMembers[r.memberIdx] && createdBooks[r.bookIdx]) {
        const { assigned, due } = createDates(r.daysAgoAssigned);
        const retDate = new Date(assigned);
        retDate.setDate(retDate.getDate() + r.returnAfter);

        assignmentsToInsert.push({
          school: defaultSchool._id,
          member: createdMembers[r.memberIdx]._id,
          book: createdBooks[r.bookIdx]._id,
          assignedDate: assigned,
          dueDate: due,
          returnedDate: retDate,
          status: 'returned',
          fineAmount: 0,
          fineStatus: 'none',
          remarks: r.remarks,
        });
      }
    }

    // RETURNED LATE WITH FINE PAID
    const returnedFinePaid = [
      { memberIdx: 33, bookIdx: 6, daysAgoAssigned: 45, lateDays: 4, remarks: '4 days late - ₹8 fine paid in cash at counter' },
      { memberIdx: 37, bookIdx: 26, daysAgoAssigned: 50, lateDays: 6, remarks: '6 days late - ₹12 fine settled via UPI' },
      { memberIdx: 28, bookIdx: 18, daysAgoAssigned: 42, lateDays: 3, remarks: '3 days late - fine paid in full' },
      { memberIdx: 47, bookIdx: 23, daysAgoAssigned: 60, lateDays: 5, remarks: '5 days late - ₹10 fine cleared' },
    ];

    for (const f of returnedFinePaid) {
      if (createdMembers[f.memberIdx] && createdBooks[f.bookIdx]) {
        const { assigned, due } = createDates(f.daysAgoAssigned);
        const retDate = new Date(due);
        retDate.setDate(retDate.getDate() + f.lateDays);

        assignmentsToInsert.push({
          school: defaultSchool._id,
          member: createdMembers[f.memberIdx]._id,
          book: createdBooks[f.bookIdx]._id,
          assignedDate: assigned,
          dueDate: due,
          returnedDate: retDate,
          status: 'returned',
          fineAmount: f.lateDays * 2,
          fineStatus: 'paid',
          remarks: f.remarks,
        });
      }
    }

    // RETURNED LATE WITH FINE PENDING
    const returnedFinePending = [
      { memberIdx: 29, bookIdx: 1, daysAgoAssigned: 30, lateDays: 5, remarks: '5 days late - fine ₹10 pending collection' },
      { memberIdx: 22, bookIdx: 2, daysAgoAssigned: 26, lateDays: 3, remarks: '3 days late - ₹6 fine pending' },
      { memberIdx: 24, bookIdx: 3, daysAgoAssigned: 32, lateDays: 4, remarks: '4 days late - fine pending' },
    ];

    for (const p of returnedFinePending) {
      if (createdMembers[p.memberIdx] && createdBooks[p.bookIdx]) {
        const { assigned, due } = createDates(p.daysAgoAssigned);
        const retDate = new Date(due);
        retDate.setDate(retDate.getDate() + p.lateDays);

        assignmentsToInsert.push({
          school: defaultSchool._id,
          member: createdMembers[p.memberIdx]._id,
          book: createdBooks[p.bookIdx]._id,
          assignedDate: assigned,
          dueDate: due,
          returnedDate: retDate,
          status: 'returned',
          fineAmount: p.lateDays * 2,
          fineStatus: 'pending',
          remarks: p.remarks,
        });
      }
    }

    await Assignment.insertMany(assignmentsToInsert);

    // Sync available / assigned copies on all books accurately
    for (const book of createdBooks) {
      const assignedCount = await Assignment.countDocuments({
        book: book._id,
        status: { $in: ['assigned', 'overdue'] },
      });
      book.assignedCopies = assignedCount;
      book.availableCopies = Math.max(0, book.totalCopies - assignedCount);
      await book.save();
    }

    console.log(
      `✅ Database seeded successfully: ${classConfigs.length} classes, ${createdMembers.length} members (students & teachers), ${createdBooks.length} books, and ${assignmentsToInsert.length} circulation records!`
    );
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
