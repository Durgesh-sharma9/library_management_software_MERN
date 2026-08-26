import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { User } from '../models/User.js';
import { School } from '../models/School.js';
import { PendingRegistration } from '../models/PendingRegistration.js';
import { AuthRequest, getDefaultSchool } from '../middleware/auth.js';
import { seedNewSchoolDefaults } from '../services/seed.js';
import { sendVerificationOTPEmail } from '../services/emailService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'school_library_jwt_secret_key_2026';

export async function registerSchool(req: Request, res: Response) {
  try {
    const {
      schoolName,
      libraryName,
      schoolCode,
      adminName,
      email,
      password,
      phone,
      address,
      city,
      state,
    } = req.body;

    if (!schoolName || !adminName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide school name, librarian/admin name, email, and password.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please login instead.',
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Save pending registration
    await PendingRegistration.deleteMany({ email: normalizedEmail });
    await PendingRegistration.create({
      email: normalizedEmail,
      otp,
      otpExpiresAt,
      registrationData: {
        schoolName: schoolName.trim(),
        libraryName: libraryName?.trim() || '',
        schoolCode: schoolCode?.trim() || '',
        adminName: adminName.trim(),
        email: normalizedEmail,
        password,
        phone: phone?.trim() || '',
        address: address?.trim() || '',
        city: city?.trim() || '',
        state: state?.trim() || '',
      },
    });

    // Try sending email via SMTP
    try {
      await sendVerificationOTPEmail(normalizedEmail, otp, schoolName.trim());
    } catch (mailError: any) {
      console.error('SMTP Email Send Error:', mailError);
      return res.status(500).json({
        success: false,
        message: `Failed to send verification email to ${normalizedEmail}. Error: ${mailError.message || 'SMTP Connection Failed'}`,
      });
    }

    return res.status(200).json({
      success: true,
      requiresOTP: true,
      email: normalizedEmail,
      message: `Verification code sent to ${normalizedEmail}. Please check your email inbox to verify.`,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Server error during school registration. Please try again.',
    });
  }
}

export async function verifySignupOTP(req: Request, res: Response) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and 6-digit OTP code are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanOTP = otp.trim();

    const pending = await PendingRegistration.findOne({ email: normalizedEmail });
    if (!pending) {
      return res.status(400).json({
        success: false,
        message: 'No pending registration found for this email address or OTP expired. Please signup again.',
      });
    }

    if (pending.otpExpiresAt < new Date()) {
      await PendingRegistration.deleteOne({ _id: pending._id });
      return res.status(400).json({
        success: false,
        message: 'Verification OTP code has expired. Please request a new code.',
      });
    }

    if (pending.otp !== cleanOTP) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP code. Please enter the correct 6-digit code sent to your email.',
      });
    }

    // OTP verified! Now create School & User
    const reg = pending.registrationData;

    // Generate unique school code
    let generatedCode = (reg.schoolCode || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    if (!generatedCode) {
      const words = reg.schoolName.trim().split(/\s+/);
      if (words.length >= 2) {
        generatedCode = words.map((w: string) => w[0]).join('').toUpperCase().slice(0, 6);
      } else {
        generatedCode = reg.schoolName.slice(0, 4).toUpperCase();
      }
    }

    let finalCode = generatedCode;
    let counter = 1;
    while (await School.findOne({ code: finalCode })) {
      finalCode = `${generatedCode}${counter++}`;
    }

    const effectiveLibraryName = reg.libraryName?.trim() || `${reg.schoolName.trim()} Central Library`;

    // 1. Create School
    const school = await School.create({
      name: reg.schoolName.trim(),
      code: finalCode,
      libraryName: effectiveLibraryName,
      adminName: reg.adminName.trim(),
      email: normalizedEmail,
      phone: reg.phone || '',
      address: reg.address || '',
      city: reg.city || '',
      state: reg.state || '',
      isActive: true,
    });

    // 2. Create Admin User
    const user = await User.create({
      name: reg.adminName.trim(),
      email: normalizedEmail,
      password: reg.password,
      role: 'admin',
      school: school._id,
      isActive: true,
    });

    // 3. Seed isolated default settings, classes, sections, and categories for this new school
    await seedNewSchoolDefaults(
      school._id,
      school.name,
      school.libraryName,
      normalizedEmail,
      reg.phone
    );

    // Remove pending registration record
    await PendingRegistration.deleteOne({ _id: pending._id });

    // 4. Generate JWT
    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        schoolId: school._id.toString(),
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Email verified successfully! School registered and library activated.',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
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
    console.error('Verify OTP Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during OTP verification' });
  }
}

export async function resendSignupOTP(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required to resend OTP.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const pending = await PendingRegistration.findOne({ email: normalizedEmail });

    if (!pending) {
      return res.status(400).json({ success: false, message: 'No pending registration found for this email.' });
    }

    const newOTP = Math.floor(100000 + Math.random() * 900000).toString();
    pending.otp = newOTP;
    pending.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await pending.save();

    await sendVerificationOTPEmail(normalizedEmail, newOTP, pending.registrationData.schoolName);

    return res.json({
      success: true,
      message: `A new 6-digit verification code has been sent to ${normalizedEmail}.`,
    });
  } catch (error: any) {
    console.error('Resend OTP Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to resend OTP email.' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Instant Super Admin demo bypass & auto-provisioning
    if (
      (normalizedEmail === 'superadmin@platform.com' ||
        normalizedEmail === 'superadmin@school.edu' ||
        normalizedEmail === 'superadmin') &&
      (password === 'superadmin123' || password === 'admin123' || password === 'superadmin')
    ) {
      let superUser = await User.findOne({ email: 'superadmin@platform.com' });
      if (!superUser) {
        superUser = await User.create({
          name: 'Platform Super Administrator',
          email: 'superadmin@platform.com',
          password: 'superadmin123',
          role: 'superadmin',
          isActive: true,
        });
      }

      const token = jwt.sign(
        {
          id: superUser._id.toString(),
          email: superUser.email,
          role: 'superadmin',
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        message: 'Super Administrator logged in successfully',
        token,
        user: {
          id: superUser._id.toString(),
          name: superUser.name,
          email: superUser.email,
          role: 'superadmin',
          school: null,
        },
      });
    }

    // 2. Instant bypass & provisioning for default demo librarian credentials
    if (
      (normalizedEmail === 'admin@school.edu' || normalizedEmail === 'admin' || normalizedEmail === 'librarian@school.edu') &&
      (password === 'admin123' || password === 'admin')
    ) {
      const defaultSchool = await getDefaultSchool();
      let adminUser = await User.findOne({ email: 'admin@school.edu' });
      if (!adminUser) {
        adminUser = await User.create({
          name: 'Mrs. Ananya Sharma (Head Librarian)',
          email: 'admin@school.edu',
          password: 'admin123',
          role: 'admin',
          school: defaultSchool._id,
          isActive: true,
        });
      } else if (!adminUser.school) {
        adminUser.school = defaultSchool._id;
        await adminUser.save();
      }

      const token = jwt.sign(
        {
          id: adminUser._id.toString(),
          email: adminUser.email,
          role: adminUser.role,
          schoolId: defaultSchool._id.toString(),
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: adminUser._id.toString(),
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
          school: {
            id: defaultSchool._id.toString(),
            name: defaultSchool.name,
            code: defaultSchool.code,
            libraryName: defaultSchool.libraryName,
            adminName: defaultSchool.adminName,
            phone: defaultSchool.phone,
            city: defaultSchool.city,
          },
        },
      });
    }

    // 3. Standard database user check
    const user = await User.findOne({ email: normalizedEmail }).populate('school');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact admin.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // If Super Admin user
    if (user.role === 'superadmin') {
      const token = jwt.sign(
        {
          id: user._id.toString(),
          email: user.email,
          role: 'superadmin',
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        message: 'Super Administrator logged in successfully',
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: 'superadmin',
          school: null,
        },
      });
    }

    let schoolData = user.school;
    if (!schoolData) {
      schoolData = await getDefaultSchool();
      await User.findByIdAndUpdate(user._id, { school: schoolData._id });
    }

    // Check if school is active
    if (schoolData && (schoolData.isActive === false || schoolData.status === 'suspended' || schoolData.status === 'inactive')) {
      const reason = schoolData.deactivationReason ? ` Reason: ${schoolData.deactivationReason}` : '';
      return res.status(403).json({
        success: false,
        message: `Your school workspace (${schoolData.name}) is currently inactive or suspended.${reason} Please contact Platform Super Administrator.`,
      });
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        schoolId: (schoolData._id || schoolData).toString(),
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        school: {
          id: schoolData._id.toString(),
          name: schoolData.name,
          code: schoolData.code,
          libraryName: schoolData.libraryName,
          adminName: schoolData.adminName,
          phone: schoolData.phone,
          city: schoolData.city,
        },
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (req.user.role === 'superadmin') {
      return res.json({
        success: true,
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: 'superadmin',
          school: null,
        },
      });
    }

    let school = req.school;
    if (!school && req.user.school) {
      school = await School.findById(req.user.school);
    }
    if (!school) {
      school = await getDefaultSchool();
    }

    return res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        school: school
          ? {
              id: school._id.toString(),
              name: school.name,
              code: school.code,
              libraryName: school.libraryName,
              adminName: school.adminName,
              phone: school.phone,
              city: school.city,
            }
          : null,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error retrieving user profile' });
  }
}

export async function getSchoolsList(req: Request, res: Response) {
  try {
    const schools = await School.find({ isActive: true }).select('name code libraryName city state');
    return res.json({ success: true, schools });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error retrieving schools list' });
  }
}

export async function googleAuth(req: Request, res: Response) {
  try {
    const { credential, idToken, email: bodyEmail, name: bodyName } = req.body;

    let userEmail = '';
    let userName = '';

    const tokenToVerify = credential || idToken;

    if (tokenToVerify) {
      try {
        const googleRes = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${tokenToVerify}`);
        if (googleRes.data && googleRes.data.email) {
          userEmail = googleRes.data.email.toLowerCase().trim();
          userName = googleRes.data.name || userEmail.split('@')[0];
        }
      } catch (verifyError) {
        console.warn('Google tokeninfo verification fallback:', verifyError);
      }
    }

    if (!userEmail && bodyEmail) {
      userEmail = bodyEmail.toLowerCase().trim();
      userName = bodyName || userEmail.split('@')[0];
    }

    if (!userEmail) {
      return res.status(400).json({ success: false, message: 'Could not verify Google account details.' });
    }

    // Check if user exists
    let user = await User.findOne({ email: userEmail }).populate('school');

    if (!user) {
      // Auto-register user with a default school workspace
      const defaultSchool = await getDefaultSchool();
      user = await User.create({
        name: userName || 'Google User',
        email: userEmail,
        password: `google_oauth_${Date.now()}_${Math.random()}`,
        role: 'admin',
        school: defaultSchool._id,
        isActive: true,
      });
      user = await User.findById(user._id).populate('school').select('-password');
    }

    if (!user || !user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account is deactivated.' });
    }

    let schoolData = user.school;
    if (!schoolData) {
      schoolData = await getDefaultSchool();
      await User.findByIdAndUpdate(user._id, { school: schoolData._id });
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        schoolId: (schoolData._id || schoolData).toString(),
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Google Sign-In successful!',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        school: {
          id: schoolData._id.toString(),
          name: schoolData.name,
          code: schoolData.code,
          libraryName: schoolData.libraryName,
          adminName: schoolData.adminName,
          phone: schoolData.phone,
          city: schoolData.city,
        },
      },
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    return res.status(500).json({ success: false, message: 'Google Authentication failed. Please try again.' });
  }
}
