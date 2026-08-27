import { Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { AuthRequest } from '../middleware/auth.js';
import { Plan } from '../models/Plan.js';
import { School } from '../models/School.js';
import { Book } from '../models/Book.js';
import { Member } from '../models/Member.js';
import { Assignment } from '../models/Assignment.js';
import { SubscriptionRequest } from '../models/SubscriptionRequest.js';

// 1. Get all public / active plans for school view
export async function getAvailablePlans(req: AuthRequest, res: Response) {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ price: 1 });
    return res.json({ success: true, plans });
  } catch (error: any) {
    console.error('Error fetching available plans:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch subscription plans' });
  }
}

// 2. Get current school subscription status & usage analytics
export async function getCurrentSchoolSubscription(req: AuthRequest, res: Response) {
  try {
    if (!req.schoolId) {
      return res.status(400).json({ success: false, message: 'No school associated with this user' });
    }

    const school = await School.findById(req.schoolId).populate('plan');
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    // Calculate usage statistics
    const booksCount = await Book.countDocuments({ school: school._id });
    const membersCount = await Member.countDocuments({ school: school._id });
    const activeAssignmentsCount = await Assignment.countDocuments({
      school: school._id,
      status: { $in: ['assigned', 'overdue'] },
    });

    // Calculate days remaining
    let daysRemaining = null;
    let isExpired = false;
    if (school.planExpiresAt) {
      const now = new Date();
      const expiry = new Date(school.planExpiresAt);
      const diffTime = expiry.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (daysRemaining < 0) {
        daysRemaining = 0;
        isExpired = true;
      }
    }

    // Check if there are any pending upgrade requests
    const pendingRequest = await SubscriptionRequest.findOne({
      school: school._id,
      status: 'pending',
    }).populate('plan', 'name code price billingCycle');

    return res.json({
      success: true,
      subscription: {
        school: {
          id: school._id,
          name: school.name,
          code: school.code,
          libraryName: school.libraryName,
          status: school.status,
          isActive: school.isActive,
        },
        currentPlan: school.plan,
        planExpiresAt: school.planExpiresAt,
        daysRemaining,
        isExpired,
        usage: {
          booksCount,
          membersCount,
          activeAssignmentsCount,
          maxBooks: school.plan && typeof school.plan === 'object' ? (school.plan as any).maxBooks : -1,
          maxMembers: school.plan && typeof school.plan === 'object' ? (school.plan as any).maxMembers : -1,
          maxIssuedPerStudent:
            school.plan && typeof school.plan === 'object' ? (school.plan as any).maxIssuedPerStudent : 3,
        },
        pendingRequest,
      },
    });
  } catch (error: any) {
    console.error('Error fetching current subscription:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch subscription details' });
  }
}

// 3. Submit a new subscription purchase / renewal / upgrade request
export async function submitPurchaseRequest(req: AuthRequest, res: Response) {
  try {
    if (!req.schoolId) {
      return res.status(400).json({ success: false, message: 'No school associated with this user' });
    }

    const {
      planId,
      billingCycle = 'yearly',
      durationDays = 365,
      amount,
      paymentMode = 'upi',
      transactionReference = '',
      paymentReceiptUrl = '',
      schoolNotes = '',
    } = req.body;

    if (!planId) {
      return res.status(400).json({ success: false, message: 'Please select a subscription plan' });
    }

    const targetPlan = await Plan.findById(planId);
    if (!targetPlan) {
      return res.status(404).json({ success: false, message: 'Selected plan not found' });
    }

    // Check if there is already a pending request for this school
    const existingPending = await SubscriptionRequest.findOne({
      school: req.schoolId,
      status: 'pending',
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message:
          'You already have a pending plan purchase request awaiting Super Admin approval. Please wait for review or contact platform support.',
      });
    }

    const calculatedAmount = amount !== undefined ? Number(amount) : targetPlan.price;

    const request = await SubscriptionRequest.create({
      school: req.schoolId,
      plan: targetPlan._id,
      requestedBy: req.user?._id,
      billingCycle: billingCycle || targetPlan.billingCycle,
      durationDays: Number(durationDays),
      amount: calculatedAmount,
      paymentMode,
      transactionReference: transactionReference?.trim() || '',
      paymentReceiptUrl: paymentReceiptUrl?.trim() || '',
      schoolNotes: schoolNotes?.trim() || '',
      status: 'pending',
    });

    const populatedRequest = await SubscriptionRequest.findById(request._id)
      .populate('plan', 'name code price billingCycle features maxBooks maxMembers')
      .populate('school', 'name code libraryName email');

    return res.status(201).json({
      success: true,
      message: `Purchase request for '${targetPlan.name}' submitted successfully! Super Admin will review and approve your subscription shortly.`,
      request: populatedRequest,
    });
  } catch (error: any) {
    console.error('Error submitting purchase request:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to submit purchase request' });
  }
}

// 4. Get list of all past and current subscription requests for this school
export async function getSchoolRequestHistory(req: AuthRequest, res: Response) {
  try {
    if (!req.schoolId) {
      return res.status(400).json({ success: false, message: 'No school associated with this user' });
    }

    const requests = await SubscriptionRequest.find({ school: req.schoolId })
      .populate('plan', 'name code price billingCycle features maxBooks maxMembers')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.json({ success: true, requests });
  } catch (error: any) {
    console.error('Error fetching request history:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch request history' });
  }
}

// 5. Initialize Razorpay Order for Plan Purchase
export async function createRazorpayOrder(req: AuthRequest, res: Response) {
  try {
    if (!req.schoolId) {
      return res.status(400).json({ success: false, message: 'No school associated with this user' });
    }

    const { planId, billingCycle = 'yearly' } = req.body;
    if (!planId) {
      return res.status(400).json({ success: false, message: 'Plan ID is required' });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_TNFrLSunBdtmcv';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'rYqvnc8Q8GqIpXT6ZSNKp7Ly';

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const amountInPaise = Math.round((plan.price || 1) * 100);

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_plan_${Date.now()}`,
      notes: {
        schoolId: req.schoolId.toString(),
        planId: plan._id.toString(),
        planName: plan.name,
        billingCycle,
      },
    };

    const order = await razorpay.orders.create(options);

    return res.json({
      success: true,
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      plan: {
        id: plan._id,
        name: plan.name,
        price: plan.price,
        description: plan.description,
      },
    });
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to initialize Razorpay order',
    });
  }
}

// 6. Verify Razorpay Payment Signature & Upgrade School Subscription
export async function verifyRazorpayPayment(req: AuthRequest, res: Response) {
  try {
    if (!req.schoolId) {
      return res.status(400).json({ success: false, message: 'No school associated with this user' });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, billingCycle = 'yearly' } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planId) {
      return res.status(400).json({ success: false, message: 'Invalid payment verification parameters' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'rYqvnc8Q8GqIpXT6ZSNKp7Ly';
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment signature verification failed!' });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    // Immediately activate/upgrade subscription for school
    const now = new Date();
    const durationDays = billingCycle === 'monthly' ? 30 : 365;
    const planExpiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const updatedSchool = await School.findByIdAndUpdate(
      req.schoolId,
      {
        plan: plan._id,
        planExpiresAt,
        status: 'active',
        isActive: true,
      },
      { new: true }
    ).populate('plan');

    // Create completed subscription request record for history audit
    await SubscriptionRequest.create({
      school: req.schoolId,
      plan: plan._id,
      requestedBy: req.user?._id,
      billingCycle,
      durationDays,
      amount: plan.price,
      paymentMode: 'razorpay',
      transactionReference: razorpay_payment_id,
      schoolNotes: `Razorpay Payment Successful (Order ID: ${razorpay_order_id})`,
      status: 'approved',
      reviewedBy: req.user?._id,
      reviewedAt: new Date(),
      adminRemarks: 'Auto-approved upon verified Razorpay online payment',
    });

    return res.json({
      success: true,
      message: `🎉 Payment Successful! Your subscription has been upgraded to '${plan.name}'!`,
      school: updatedSchool,
    });
  } catch (error: any) {
    console.error('Error verifying Razorpay payment:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Payment verification failed',
    });
  }
}

