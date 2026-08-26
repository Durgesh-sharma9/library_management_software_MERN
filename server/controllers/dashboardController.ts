import { Request, Response } from 'express';
import { Book } from '../models/Book.js';
import { BookCategory } from '../models/BookCategory.js';
import { Member } from '../models/Member.js';
import { Assignment } from '../models/Assignment.js';
import { LibrarySetting } from '../models/LibrarySetting.js';
import { calculateFineBreakdown } from '../services/fineCalculator.js';

export async function getDashboardAnalytics(req: Request, res: Response) {
  try {
    const { categoryId } = req.query;
    const setting = await LibrarySetting.findOne() || {
      libraryName: 'School Central Library',
      schoolName: 'International Public School',
      issueDuration: 14,
      finePerDay: 2,
      fineRules: [],
      maxBooksPerMember: 3,
    };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const threeDaysLater = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 23, 59, 59, 999);

    // Category filter condition
    const bookFilter: any = {};
    if (categoryId && categoryId !== 'all') {
      bookFilter.category = categoryId;
    }

    // 1. Book totals
    const books = await Book.find(bookFilter);
    const totalBookTitles = books.length;
    const totalCopies = books.reduce((acc, b) => acc + (b.totalCopies || 0), 0);
    const totalAvailableCopies = books.reduce((acc, b) => acc + (b.availableCopies || 0), 0);
    const totalAssignedCopies = books.reduce((acc, b) => acc + (b.assignedCopies || 0), 0);
    const totalLostCopies = books.reduce((acc, b) => acc + (b.lostCopies || 0), 0);
    const totalDamagedCopies = books.reduce((acc, b) => acc + (b.damagedCopies || 0), 0);

    // 2. Assignments
    let assignmentQuery: any = {};
    if (categoryId && categoryId !== 'all') {
      const bookIds = books.map((b) => b._id);
      assignmentQuery.book = { $in: bookIds };
    }

    const allAssignments = await Assignment.find(assignmentQuery).populate('book').populate('member');

    let dueTodayCount = 0;
    let dueSoonCount = 0;
    let overdueCount = 0;
    let currentlyAssignedCount = 0;
    let returnedCount = 0;
    let pendingFineAmount = 0;

    allAssignments.forEach((a) => {
      const isReturned = a.status === 'returned' || !!a.returnedDate;
      const isLost = a.status === 'lost' || a.lostOrDamaged === 'lost';
      const isDamaged = a.status === 'damaged' || a.lostOrDamaged === 'damaged';
      const dueDate = new Date(a.dueDate);

      if (!isReturned && !isLost && !isDamaged) {
        currentlyAssignedCount++;
        if (dueDate < todayStart) {
          overdueCount++;
          // Overdue fine calculation with effective date slabs
          const fineCalc = calculateFineBreakdown(dueDate, now, setting);
          pendingFineAmount += fineCalc.fineAmount;
        } else {
          if (dueDate >= todayStart && dueDate <= todayEnd) {
            dueTodayCount++;
          }
          if (dueDate >= todayStart && dueDate <= threeDaysLater) {
            dueSoonCount++;
          }
        }
      } else if (isReturned) {
        returnedCount++;
        if (a.fineStatus === 'pending') {
          pendingFineAmount += (a.fineAmount || 0);
        }
      }
    });

    // 3. Member Analytics
    const totalMembers = await Member.countDocuments();
    const activeMembers = await Member.countDocuments({ status: 'active' });

    // Distinct members with active assignments
    const activeAssignments = await Assignment.find({ status: { $in: ['assigned', 'overdue'] } });
    const membersWithActiveBooksSet = new Set(activeAssignments.map((a) => a.member.toString()));
    const membersWithActiveBooks = membersWithActiveBooksSet.size;

    const overdueAssignments = activeAssignments.filter((a) => new Date(a.dueDate) < todayStart);
    const membersWithOverdueBooksSet = new Set(overdueAssignments.map((a) => a.member.toString()));
    const membersWithOverdueBooks = membersWithOverdueBooksSet.size;

    // Members with pending fine
    const pendingFineAssignments = await Assignment.find({ fineStatus: 'pending' });
    const pendingFineMemberSet = new Set([
      ...overdueAssignments.map((a) => a.member.toString()),
      ...pendingFineAssignments.map((a) => a.member.toString()),
    ]);
    const membersWithPendingFine = pendingFineMemberSet.size;

    // 4. Category-wise breakdown (Chart data)
    const categories = await BookCategory.find().sort({ name: 1 });
    const categoryAnalytics = await Promise.all(
      categories.map(async (cat) => {
        const catBooks = await Book.find({ category: cat._id });
        const total = catBooks.reduce((s, b) => s + (b.totalCopies || 0), 0);
        const available = catBooks.reduce((s, b) => s + (b.availableCopies || 0), 0);
        const assigned = catBooks.reduce((s, b) => s + (b.assignedCopies || 0), 0);
        return {
          id: cat._id,
          name: cat.name,
          total,
          available,
          assigned,
          titleCount: catBooks.length,
          isActive: cat.isActive,
        };
      })
    );

    // 5. Most assigned / top books
    const topBooksAggregation = await Assignment.aggregate([
      { $group: { _id: '$book', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);

    const topBooks = await Promise.all(
      topBooksAggregation.map(async (item) => {
        const b = await Book.findById(item._id).populate('category', 'name');
        return {
          id: item._id,
          title: b ? b.title : 'Unknown Book',
          author: b ? b.author : 'Unknown Author',
          category: b && b.category ? (b.category as any).name : 'General',
          assignedTimes: item.count,
          availableCopies: b ? b.availableCopies : 0,
        };
      })
    );

    // 6. Class-wise assignment distribution
    const classDistributionMap: { [key: string]: number } = {};
    allAssignments.forEach((a) => {
      if (a.member && a.member.className) {
        const cls = a.member.className.trim() || 'General';
        classDistributionMap[cls] = (classDistributionMap[cls] || 0) + 1;
      }
    });

    const classDistribution = Object.entries(classDistributionMap).map(([name, value]) => ({
      name,
      value,
    }));

    return res.json({
      success: true,
      data: {
        summary: {
          totalBookTitles,
          totalBooks: totalCopies,
          availableBooks: totalAvailableCopies,
          assignedBooks: totalAssignedCopies,
          lostBooks: totalLostCopies,
          damagedBooks: totalDamagedCopies,
          dueToday: dueTodayCount,
          dueSoon: dueSoonCount,
          overdueBooks: overdueCount,
          totalMembers,
          activeMembers,
          pendingFine: pendingFineAmount,
          returnedBooks: returnedCount,
          totalAssignments: allAssignments.length,
        },
        memberAnalytics: {
          totalMembers,
          activeMembers,
          membersWithActiveBooks,
          membersWithOverdueBooks,
          membersWithPendingFine,
          classDistribution,
        },
        categoryAnalytics,
        topBooks: topBooks.filter((tb) => tb.title !== 'Unknown Book'),
        librarySettings: setting,
      },
    });
  } catch (error: any) {
    console.error('Get dashboard analytics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate dashboard analytics' });
  }
}

export async function getRecentActivity(req: Request, res: Response) {
  try {
    const recent = await Assignment.find()
      .populate('book', 'title author language')
      .populate('member', 'name memberId className section')
      .sort({ updatedAt: -1 })
      .limit(10);

    const activities = recent.map((item) => {
      const isReturn = item.status === 'returned';
      return {
        id: item._id,
        type: isReturn ? 'return' : 'assign',
        memberName: item.member ? item.member.name : 'Student',
        memberId: item.member ? item.member.memberId : '',
        bookTitle: item.book ? item.book.title : 'Book',
        timestamp: isReturn && item.returnedDate ? item.returnedDate : item.assignedDate,
        dueDate: item.dueDate,
        fineAmount: item.fineAmount || 0,
        fineStatus: item.fineStatus,
      };
    });

    return res.json({ success: true, data: activities });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch recent activity' });
  }
}
