import { Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.js';
import { School, ISchool } from '../models/School.js';
import { User } from '../models/User.js';
import { Plan } from '../models/Plan.js';
import { Book } from '../models/Book.js';
import { Member } from '../models/Member.js';
import { Assignment } from '../models/Assignment.js';
import { SubscriptionRequest } from '../models/SubscriptionRequest.js';
import { seedNewSchoolDefaults } from '../services/seed.js';

const JWT_SECRET = process.env.JWT_SECRET || 'school_library_jwt_secret_key_2026';

// 1. Get Platform-wide Super Admin Stats
export async function getSuperAdminStats(req: AuthRequest, res: Response) {
  try {
    const totalSchools = await School.countDocuments();
    const activeSchools = await School.countDocuments({
      isActive: true,
      status: { $in: ['active', 'trial'] },
    });
    const inactiveSchools = totalSchools - activeSchools;

    const totalBooks = await Book.countDocuments();
    const totalCopiesResult = await Book.aggregate([
      { $group: { _id: null, totalCopies: { $sum: '$totalCopies' } } },
    ]);
    const totalPhysicalCopies = totalCopiesResult[0]?.totalCopies || 0;

    const totalMembers = await Member.countDocuments();
    const totalCirculations = await Assignment.countDocuments();
    const activeAssignments = await Assignment.countDocuments({
      status: { $in: ['assigned', 'overdue'] },
    });

    const finesAgg = await Assignment.aggregate([
      { $group: { _id: null, totalFine: { $sum: '$fineAmount' } } },
    ]);
    const totalFinesCollected = finesAgg[0]?.totalFine || 0;

    const totalPlans = await Plan.countDocuments({ isActive: true });

    // Pending Subscription Requests count & list
    const pendingRequestsCount = await SubscriptionRequest.countDocuments({ status: 'pending' });
    const recentRequests = await SubscriptionRequest.find()
      .populate('school', 'name code libraryName email')
      .populate('plan', 'name code price billingCycle')
      .sort({ createdAt: -1 })
      .limit(5);

    // Plan distribution
    const planDistribution = await School.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'plans',
          localField: '_id',
          foreignField: '_id',
          as: 'planInfo',
        },
      },
      { $unwind: { path: '$planInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          planName: { $ifNull: ['$planInfo.name', 'Unassigned / Custom'] },
          planCode: { $ifNull: ['$planInfo.code', 'NONE'] },
          count: 1,
        },
      },
    ]);

    // Recent Schools
    const recentSchools = await School.find()
      .populate('plan', 'name code price billingCycle')
      .sort({ createdAt: -1 })
      .limit(6);

    return res.json({
      success: true,
      stats: {
        totalSchools,
        activeSchools,
        inactiveSchools,
        totalBooks,
        totalPhysicalCopies,
        totalMembers,
        totalCirculations,
        activeAssignments,
        totalFinesCollected,
        totalPlans,
        pendingRequestsCount,
        recentRequests,
        planDistribution,
        recentSchools,
      },
    });
  } catch (error: any) {
    console.error('SuperAdmin stats error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching platform statistics' });
  }
}

// 2. Get All Schools with enriched live counts
export async function getAllSchools(req: AuthRequest, res: Response) {
  try {
    const { search, status, planId } = req.query;

    const filter: any = {};
    if (search) {
      const searchStr = String(search).trim();
      filter.$or = [
        { name: { $regex: searchStr, $options: 'i' } },
        { code: { $regex: searchStr, $options: 'i' } },
        { libraryName: { $regex: searchStr, $options: 'i' } },
        { adminName: { $regex: searchStr, $options: 'i' } },
        { email: { $regex: searchStr, $options: 'i' } },
        { city: { $regex: searchStr, $options: 'i' } },
      ];
    }

    if (status && status !== 'all') {
      if (status === 'active') {
        filter.isActive = true;
        filter.status = { $in: ['active', 'trial'] };
      } else if (status === 'inactive') {
        filter.$or = [{ isActive: false }, { status: { $in: ['inactive', 'suspended'] } }];
      } else {
        filter.status = status;
      }
    }

    if (planId && planId !== 'all') {
      filter.plan = planId;
    }

    const schools = await School.find(filter)
      .populate('plan')
      .sort({ createdAt: -1 });

    // Aggregate counts for each school
    const enrichedSchools = await Promise.all(
      schools.map(async (school) => {
        const [booksCount, membersCount, activeAssignmentsCount, overdueCount] = await Promise.all([
          Book.countDocuments({ school: school._id }),
          Member.countDocuments({ school: school._id }),
          Assignment.countDocuments({ school: school._id, status: { $in: ['assigned', 'overdue'] } }),
          Assignment.countDocuments({ school: school._id, status: 'overdue' }),
        ]);

        return {
          ...school.toObject(),
          booksCount,
          membersCount,
          activeAssignmentsCount,
          overdueCount,
        };
      })
    );

    return res.json({
      success: true,
      schools: enrichedSchools,
    });
  } catch (error: any) {
    console.error('Error fetching schools:', error);
    return res.status(500).json({ success: false, message: 'Error retrieving schools list' });
  }
}

// 3. Create a New School (by SuperAdmin)
export async function createSchool(req: AuthRequest, res: Response) {
  try {
    const {
      name,
      code,
      libraryName,
      adminName,
      email,
      password,
      phone,
      address,
      city,
      state,
      planId,
      planDurationDays = 365,
      notes,
    } = req.body;

    if (!name || !adminName || !email) {
      return res.status(400).json({
        success: false,
        message: 'School name, admin name, and email are required.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists.',
      });
    }

    let finalCode = (code || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    if (!finalCode) {
      const words = name.trim().split(/\s+/);
      finalCode = (words.length >= 2 ? words.map((w: string) => w[0]).join('') : name.slice(0, 4)).toUpperCase();
    }

    let checkCode = finalCode;
    let counter = 1;
    while (await School.findOne({ code: checkCode })) {
      checkCode = `${finalCode}${counter++}`;
    }
    finalCode = checkCode;

    // Resolve plan
    let assignedPlan = null;
    if (planId && mongoose.Types.ObjectId.isValid(planId)) {
      assignedPlan = await Plan.findById(planId);
    }
    if (!assignedPlan) {
      assignedPlan = (await Plan.findOne({ isPopular: true })) || (await Plan.findOne());
    }

    const expiresAt = new Date(Date.now() + Number(planDurationDays) * 24 * 60 * 60 * 1000);

    const school = await School.create({
      name: name.trim(),
      code: finalCode,
      libraryName: libraryName?.trim() || `${name.trim()} Library`,
      adminName: adminName.trim(),
      email: normalizedEmail,
      phone: phone?.trim() || '',
      address: address?.trim() || '',
      city: city?.trim() || '',
      state: state?.trim() || '',
      isActive: true,
      status: 'active',
      plan: assignedPlan?._id,
      planExpiresAt: expiresAt,
      notes: notes?.trim() || '',
    });

    const user = await User.create({
      name: adminName.trim(),
      email: normalizedEmail,
      password: password?.trim() || 'school123',
      role: 'admin',
      school: school._id,
      isActive: true,
    });

    // Seed defaults
    await seedNewSchoolDefaults(
      school._id,
      school.name,
      school.libraryName,
      normalizedEmail,
      phone?.trim()
    );

    const populated = await School.findById(school._id).populate('plan');

    return res.status(201).json({
      success: true,
      message: `School '${school.name}' created and provisioned successfully!`,
      school: populated,
      adminCredentials: {
        email: normalizedEmail,
        password: password?.trim() || 'school123',
      },
    });
  } catch (error: any) {
    console.error('Error creating school:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create school' });
  }
}

// 4. Update School Details & Plan
export async function updateSchool(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const {
      name,
      libraryName,
      adminName,
      email,
      phone,
      address,
      city,
      state,
      planId,
      planExpiresAt,
      notes,
    } = req.body;

    const school = await School.findById(id);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    if (name) school.name = name.trim();
    if (libraryName) school.libraryName = libraryName.trim();
    if (adminName) school.adminName = adminName.trim();
    if (phone !== undefined) school.phone = phone.trim();
    if (address !== undefined) school.address = address.trim();
    if (city !== undefined) school.city = city.trim();
    if (state !== undefined) school.state = state.trim();
    if (notes !== undefined) school.notes = notes.trim();

    if (email && email.toLowerCase().trim() !== school.email) {
      school.email = email.toLowerCase().trim();
    }

    if (planId && mongoose.Types.ObjectId.isValid(planId)) {
      school.plan = planId;
    }

    if (planExpiresAt) {
      school.planExpiresAt = new Date(planExpiresAt);
    }

    await school.save();

    const populated = await School.findById(school._id).populate('plan');
    return res.json({
      success: true,
      message: 'School details updated successfully',
      school: populated,
    });
  } catch (error: any) {
    console.error('Error updating school:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update school' });
  }
}

// 5. Toggle / Update School Active / Suspended Status
export async function updateSchoolStatus(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { isActive, status, deactivationReason } = req.body;

    const school = await School.findById(id);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    if (isActive !== undefined) {
      school.isActive = Boolean(isActive);
      if (!school.isActive && (!status || status === 'active')) {
        school.status = 'inactive';
      } else if (school.isActive && (!status || status === 'inactive' || status === 'suspended')) {
        school.status = 'active';
      }
    }

    if (status) {
      school.status = status;
      if (status === 'inactive' || status === 'suspended') {
        school.isActive = false;
      } else if (status === 'active' || status === 'trial') {
        school.isActive = true;
      }
    }

    if (deactivationReason !== undefined) {
      school.deactivationReason = deactivationReason;
    }

    await school.save();

    // Also sync users of this school if deactivated
    if (!school.isActive) {
      await User.updateMany({ school: school._id }, { isActive: false });
    } else {
      await User.updateMany({ school: school._id }, { isActive: true });
    }

    return res.json({
      success: true,
      message: `School status updated to '${school.status}' (Active: ${school.isActive ? 'Yes' : 'No'})`,
      school,
    });
  } catch (error: any) {
    console.error('Error updating school status:', error);
    return res.status(500).json({ success: false, message: 'Failed to update school status' });
  }
}

// 6. Impersonate / Switch into School View
export async function impersonateSchool(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const school = await School.findById(id);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    let adminUser = await User.findOne({ school: school._id, role: 'admin' });
    if (!adminUser) {
      adminUser = await User.findOne({ school: school._id });
    }

    if (!adminUser) {
      adminUser = await User.create({
        name: `${school.adminName || 'School Admin'} (Delegate)`,
        email: school.email,
        password: 'temporary-delegate-pass',
        role: 'admin',
        school: school._id,
        isActive: true,
      });
    }

    const token = jwt.sign(
      {
        id: adminUser._id.toString(),
        email: adminUser.email,
        role: adminUser.role,
        schoolId: school._id.toString(),
        isImpersonated: true,
        impersonatedBy: req.user?.email,
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      success: true,
      message: `Switched into school workspace '${school.name}'`,
      token,
      user: {
        id: adminUser._id.toString(),
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        school: {
          id: school._id.toString(),
          name: school.name,
          code: school.code,
          libraryName: school.libraryName,
          adminName: school.adminName,
          phone: school.phone,
          city: school.city,
        },
      },
    });
  } catch (error: any) {
    console.error('Impersonation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to switch into school workspace' });
  }
}

// 7. Delete a School & Isolated Records
export async function deleteSchool(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const school = await School.findById(id);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    if (school.code === 'IPS') {
      return res.status(400).json({
        success: false,
        message: 'The default demonstration school (IPS) cannot be deleted.',
      });
    }

    // Clean up isolated data
    await Promise.all([
      Book.deleteMany({ school: school._id }),
      Member.deleteMany({ school: school._id }),
      Assignment.deleteMany({ school: school._id }),
      User.deleteMany({ school: school._id }),
      School.findByIdAndDelete(school._id),
    ]);

    return res.json({
      success: true,
      message: `School '${school.name}' and all associated records deleted successfully.`,
    });
  } catch (error: any) {
    console.error('Delete school error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete school' });
  }
}

// 8. Subscription Plans: Get All Plans
export async function getAllPlans(req: AuthRequest, res: Response) {
  try {
    const plans = await Plan.find().sort({ price: 1 });

    const enrichedPlans = await Promise.all(
      plans.map(async (plan) => {
        const schoolsCount = await School.countDocuments({ plan: plan._id });
        return {
          ...plan.toObject(),
          schoolsCount,
        };
      })
    );

    return res.json({
      success: true,
      plans: enrichedPlans,
    });
  } catch (error: any) {
    console.error('Error fetching plans:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve subscription plans' });
  }
}

// 9. Create a New Subscription Plan
export async function createPlan(req: AuthRequest, res: Response) {
  try {
    const {
      name,
      code,
      description,
      price,
      billingCycle = 'yearly',
      maxBooks = 2000,
      maxMembers = 500,
      maxIssuedPerStudent = 3,
      features = [],
      isPopular = false,
      isActive = true,
    } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Plan name and price are required.',
      });
    }

    let planCode = (code || name.replace(/[^A-Za-z0-9]/g, '_').toUpperCase()).trim();
    if (await Plan.findOne({ code: planCode })) {
      planCode = `${planCode}_${Date.now().toString().slice(-4)}`;
    }

    const cleanFeatures = Array.isArray(features)
      ? features.map((f: string) => f.trim()).filter(Boolean)
      : String(features)
          .split('\n')
          .map((f) => f.trim())
          .filter(Boolean);

    const plan = await Plan.create({
      name: name.trim(),
      code: planCode,
      description: description?.trim() || '',
      price: Number(price),
      billingCycle,
      maxBooks: Number(maxBooks),
      maxMembers: Number(maxMembers),
      maxIssuedPerStudent: Number(maxIssuedPerStudent),
      features: cleanFeatures,
      isPopular: Boolean(isPopular),
      isActive: Boolean(isActive),
    });

    return res.status(201).json({
      success: true,
      message: `Plan '${plan.name}' created successfully!`,
      plan,
    });
  } catch (error: any) {
    console.error('Create plan error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create plan' });
  }
}

// 10. Update Plan
export async function updatePlan(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      billingCycle,
      maxBooks,
      maxMembers,
      maxIssuedPerStudent,
      features,
      isPopular,
      isActive,
    } = req.body;

    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    if (name) plan.name = name.trim();
    if (description !== undefined) plan.description = description.trim();
    if (price !== undefined) plan.price = Number(price);
    if (billingCycle) plan.billingCycle = billingCycle;
    if (maxBooks !== undefined) plan.maxBooks = Number(maxBooks);
    if (maxMembers !== undefined) plan.maxMembers = Number(maxMembers);
    if (maxIssuedPerStudent !== undefined) plan.maxIssuedPerStudent = Number(maxIssuedPerStudent);
    if (isPopular !== undefined) plan.isPopular = Boolean(isPopular);
    if (isActive !== undefined) plan.isActive = Boolean(isActive);

    if (features !== undefined) {
      plan.features = Array.isArray(features)
        ? features.map((f: string) => f.trim()).filter(Boolean)
        : String(features)
            .split('\n')
            .map((f) => f.trim())
            .filter(Boolean);
    }

    await plan.save();

    return res.json({
      success: true,
      message: `Plan '${plan.name}' updated successfully!`,
      plan,
    });
  } catch (error: any) {
    console.error('Update plan error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update plan' });
  }
}

// 11. Delete Plan
export async function deletePlan(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const assignedCount = await School.countDocuments({ plan: plan._id });
    if (assignedCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete plan '${plan.name}' because ${assignedCount} school(s) are currently subscribed to it. Please reassign those schools first.`,
      });
    }

    await Plan.findByIdAndDelete(plan._id);
    return res.json({
      success: true,
      message: `Plan '${plan.name}' deleted successfully`,
    });
  } catch (error: any) {
    console.error('Delete plan error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete plan' });
  }
}

// 12. Get All Subscription Requests (Super Admin)
export async function getAllSubscriptionRequests(req: AuthRequest, res: Response) {
  try {
    const { status, schoolId } = req.query;
    const filter: any = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (schoolId) {
      filter.school = schoolId;
    }

    const requests = await SubscriptionRequest.find(filter)
      .populate('school', 'name code libraryName email city state status isActive planExpiresAt')
      .populate('plan', 'name code price billingCycle features maxBooks maxMembers maxIssuedPerStudent')
      .populate('requestedBy', 'name email')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.json({ success: true, requests });
  } catch (error: any) {
    console.error('Error fetching subscription requests:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch subscription requests' });
  }
}

// 13. Approve Subscription Request
export async function approveSubscriptionRequest(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { adminRemarks = '', customExpiryDate } = req.body;

    const request = await SubscriptionRequest.findById(id)
      .populate('school')
      .populate('plan');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Subscription request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}. Cannot re-approve.`,
      });
    }

    const school = await School.findById(request.school._id || request.school);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    const plan = await Plan.findById(request.plan._id || request.plan);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    // Calculate new expiry date
    let newExpiry: Date;
    if (customExpiryDate) {
      newExpiry = new Date(customExpiryDate);
    } else {
      const durationDays = request.durationDays > 0 ? request.durationDays : 365;
      const baseDate =
        school.planExpiresAt && new Date(school.planExpiresAt).getTime() > Date.now()
          ? new Date(school.planExpiresAt)
          : new Date();
      newExpiry = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    }

    // Update school plan and activation status
    school.plan = plan._id;
    school.planExpiresAt = newExpiry;
    school.isActive = true;
    school.status = 'active';
    school.deactivationReason = '';
    await school.save();

    // Mark request as approved
    request.status = 'approved';
    request.reviewedBy = req.user?._id;
    request.reviewedAt = new Date();
    request.adminRemarks = adminRemarks?.trim() || 'Approved by Super Admin';
    await request.save();

    return res.json({
      success: true,
      message: `Subscription request approved! '${school.name}' is now active on the '${plan.name}' plan until ${newExpiry.toLocaleDateString('en-IN')}.`,
      request,
      school,
    });
  } catch (error: any) {
    console.error('Approve subscription request error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to approve request' });
  }
}

// 14. Reject Subscription Request
export async function rejectSubscriptionRequest(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { adminRemarks = 'Request declined by Super Administrator' } = req.body;

    const request = await SubscriptionRequest.findById(id).populate('school plan');
    if (!request) {
      return res.status(404).json({ success: false, message: 'Subscription request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}. Cannot reject.`,
      });
    }

    request.status = 'rejected';
    request.reviewedBy = req.user?._id;
    request.reviewedAt = new Date();
    request.adminRemarks = adminRemarks?.trim() || 'Request declined by Super Administrator';
    await request.save();

    return res.json({
      success: true,
      message: 'Subscription request has been rejected.',
      request,
    });
  } catch (error: any) {
    console.error('Reject subscription request error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to reject request' });
  }
}
