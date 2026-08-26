import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  BookOpen,
  AlertCircle,
  School as SchoolIcon,
  CheckCircle2,
  Building2,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/api';
import { School } from '../../types';

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_CLIENT_ID = '708110054977-m02s1ndnufls51hld0u0cgn61haou50q.apps.googleusercontent.com';

interface LoginPageProps {
  initialMode?: 'login' | 'register';
  onBackToLanding?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  initialMode = 'login',
  onBackToLanding,
}) => {
  const { login, loginWithGoogle, registerSchool, verifyOTP } = useAuth();
  const [activeMode, setActiveMode] = useState<'login' | 'register'>(initialMode);

  // OTP Verification state
  const [showOTPVerification, setShowOTPVerification] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>('');
  const [pendingEmail, setPendingEmail] = useState<string>('');
  const [resendingOTP, setResendingOTP] = useState<boolean>(false);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // School registration form state
  const [schoolName, setSchoolName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [board, setBoard] = useState('CBSE');
  const [city, setCity] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Available registered schools list for demo/quick selection
  const [registeredSchools, setRegisteredSchools] = useState<School[]>([]);

  useEffect(() => {
    loadSchools();

    // Dynamically load Google Identity Services Script
    const existingScript = document.getElementById('google-gsi-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initGoogleGIS();
      };
      document.body.appendChild(script);
    } else {
      initGoogleGIS();
    }
  }, []);

  const initGoogleGIS = () => {
    if (window.google && window.google.accounts) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
      });

      const container = document.getElementById('google-btn-container');
      if (container) {
        window.google.accounts.id.renderButton(container, {
          theme: 'outline',
          size: 'medium',
          width: 280,
          shape: 'pill',
          text: 'signin_with',
        });
      }
    }
  };

  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response || !response.credential) return;
    try {
      setError('');
      setSuccessMessage('');
      setLoading(true);
      await loginWithGoogle({ credential: response.credential });
      setSuccessMessage('Google Sign-In successful!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Google Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadSchools = async () => {
    try {
      const res = await authService.getSchools();
      if (res && res.schools) {
        setRegisteredSchools(res.schools as any);
      }
    } catch {
      // ignore
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await login(email, password);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Invalid credentials. Please check your email and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim()) {
      setError('School name is required.');
      return;
    }
    if (!adminName.trim()) {
      setError('Administrator name is required.');
      return;
    }
    if (!adminEmail.trim()) {
      setError('Admin email address is required.');
      return;
    }
    if (adminPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (adminPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setError('');
      setSuccessMessage('');
      setLoading(true);
      const res = await registerSchool({
        schoolName: schoolName.trim(),
        schoolCode: schoolCode.trim() || undefined,
        adminName: adminName.trim(),
        email: adminEmail.trim().toLowerCase(),
        password: adminPassword,
        affiliation: board,
        city: city.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
      });

      if (res && res.requiresOTP) {
        setPendingEmail(adminEmail.trim().toLowerCase());
        setShowOTPVerification(true);
        setSuccessMessage(`Verification 6-digit OTP sent to ${adminEmail}. Please check your email inbox!`);
      } else {
        setSuccessMessage(`School "${schoolName}" registered successfully! Redirecting...`);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to register school. Please check your input and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setError('Please enter the complete 6-digit verification code sent to your email.');
      return;
    }

    try {
      setError('');
      setSuccessMessage('');
      setLoading(true);
      await verifyOTP(pendingEmail, otpCode.trim());
      setSuccessMessage('Email verified successfully! Welcome to your library portal.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setError('');
      setSuccessMessage('');
      setResendingOTP(true);
      const res = await authService.resendOTP(pendingEmail);
      setSuccessMessage(res.message || 'A new verification code has been sent to your email.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend verification code.');
    } finally {
      setResendingOTP(false);
    }
  };

  const handleQuickSchoolSelect = (schoolEmail: string, schoolPass: string = 'admin123') => {
    setEmail(schoolEmail);
    setPassword(schoolPass);
    setError('');
  };

  const handleInstantDemoLogin = async () => {
    try {
      setError('');
      setLoading(true);
      setEmail('admin@school.edu');
      setPassword('admin123');
      await login('admin@school.edu', 'admin123');
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to login with demo credentials. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen lg:h-screen relative flex flex-col justify-center py-3 sm:py-4 lg:py-2 bg-slate-900 ${activeMode === 'register' ? 'overflow-y-auto' : 'lg:overflow-hidden'}`}>
      {/* Background Library Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 filter brightness-95 contrast-105 transition-all duration-700"
        style={{ 
          backgroundImage: `url('https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=2000&q=80')` 
        }}
      />

      {/* Soft light glassmorphism overlay for optimal contrast & legibility */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100/92 via-slate-50/88 to-blue-50/85 backdrop-blur-xs" />
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#64748b_1px,transparent_1px)] [background-size:24px_24px] opacity-25"></div>

      <div className={`sm:mx-auto sm:w-full transition-all duration-300 relative z-10 ${activeMode === 'register' ? 'sm:max-w-xl' : 'sm:max-w-md'}`}>
        {onBackToLanding && (
          <div className="mb-2 text-center">
            <button
              type="button"
              id="back-to-landing-btn"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white hover:bg-slate-100 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 transition-all cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Granthshala Homepage</span>
            </button>
          </div>
        )}

        <div className="flex justify-center">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 ring-3 ring-white">
            <BookOpen className="w-6 h-6 sm:w-6 sm:h-6" />
          </div>
        </div>
        <h2 className="mt-2 text-center text-xl sm:text-2xl font-black tracking-tight text-slate-900">
          Multi-School Library ERP
        </h2>
        <p className="mt-0.5 text-center text-xs text-slate-600 font-medium px-4">
          Isolated school catalog, student circulation & fines system
        </p>

        {/* Tab switch for Login vs School Signup */}
        <div className="mt-3 mx-4 sm:mx-0 flex p-1 bg-slate-200/80 border border-slate-300/80 rounded-xl shadow-inner">
          <button
            type="button"
            id="tab-login-btn"
            onClick={() => {
              setActiveMode('login');
              setError('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'login'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>School Login</span>
          </button>
          <button
            type="button"
            id="tab-register-btn"
            onClick={() => {
              setActiveMode('register');
              setError('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'register'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Register New School</span>
          </button>
        </div>
      </div>

      <div className={`mt-3 sm:mx-auto sm:w-full transition-all duration-300 relative z-10 px-4 ${activeMode === 'register' ? 'sm:max-w-xl' : 'sm:max-w-md'}`}>
        <div className="bg-white/95 backdrop-blur-xl py-4 sm:py-5 px-4 sm:px-6 shadow-xl shadow-slate-200/60 rounded-2xl border border-slate-200/80">
          {error && (
            <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 shadow-2xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {showOTPVerification ? (
            /* ================= EMAIL OTP VERIFICATION FORM ================= */
            <form className="space-y-4" onSubmit={handleVerifyOTPSubmit}>
              <div className="p-3 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 text-center">
                <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                  <Mail className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Verify Your Email Address</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  We sent a 6-digit OTP verification code via Gmail SMTP to:
                </p>
                <p className="text-xs font-mono font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 inline-block mt-1">
                  {pendingEmail}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 text-center">
                  Enter 6-Digit Verification Code
                </label>
                <input
                  id="otp-input"
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 584920"
                  className="block w-full px-3 py-2.5 bg-slate-50 border-2 border-indigo-200 rounded-xl text-center text-xl tracking-[8px] font-mono font-extrabold text-indigo-900 focus:bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <button
                id="verify-otp-btn"
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-70 cursor-pointer"
              >
                {loading ? (
                  <span>Verifying Code...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify Email & Complete Registration</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resendingOTP}
                  className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer disabled:opacity-50"
                >
                  {resendingOTP ? 'Sending Code...' : 'Resend OTP Email'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowOTPVerification(false);
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
                >
                  Edit Email Address
                </button>
              </div>
            </form>
          ) : activeMode === 'login' ? (
            /* ================= LOGIN FORM ================= */
            <form className="space-y-3" onSubmit={handleLoginSubmit}>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  School Staff / Admin Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@school.edu"
                    className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 font-medium transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Password</label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 font-medium transition-all"
                  />
                </div>
              </div>

              <div className="pt-1">
                <button
                  id="login-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 transition-all shadow-md shadow-blue-500/20 disabled:opacity-75 cursor-pointer"
                >
                  {loading ? (
                    <span>Signing in...</span>
                  ) : (
                    <>
                      <span>Sign In to School Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Google Sign-In Divider & Official GIS Button */}
              <div className="relative my-2.5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
                  <span className="bg-white px-2">Or Login With</span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center min-h-[40px]">
                <div id="google-btn-container" className="flex justify-center w-full"></div>
              </div>

              {/* Quick Demo Credentials */}
              <div className="mt-3 pt-3 border-t border-slate-100 text-center">
                <p className="text-[11px] text-slate-500 mb-1.5 font-semibold">Instant Access & Role Testing</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-1.5">
                  <button
                    id="demo-superadmin-login-btn"
                    type="button"
                    disabled={loading}
                    onClick={async () => {
                      try {
                        setError('');
                        setLoading(true);
                        setEmail('superadmin@platform.com');
                        setPassword('superadmin123');
                        await login('superadmin@platform.com', 'superadmin123');
                      } catch (err: any) {
                        setError(err.response?.data?.message || 'SuperAdmin login failed.');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="inline-flex items-center justify-center gap-1 py-1.5 px-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs shadow-purple-500/20 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-200" />
                    <span>👑 Super Admin Login</span>
                  </button>

                  <button
                    id="demo-instant-login-btn"
                    type="button"
                    disabled={loading}
                    onClick={handleInstantDemoLogin}
                    className="inline-flex items-center justify-center gap-1 py-1.5 px-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-800 rounded-lg text-xs font-bold transition-all border border-blue-200/80 shadow-2xs cursor-pointer"
                  >
                    <SchoolIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>🏫 School Librarian Login</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-1 text-[10px] text-slate-500 font-mono">
                  <span className="bg-purple-50 text-purple-800 border border-purple-200/70 py-0.5 px-2 rounded-md">
                    SuperAdmin: <strong>superadmin@platform.com</strong>
                  </span>
                  <span className="bg-slate-100 text-slate-700 border border-slate-200/70 py-0.5 px-2 rounded-md">
                    Librarian: <strong>admin@school.edu</strong>
                  </span>
                </div>

                {registeredSchools.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 text-left">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                      <SchoolIcon className="w-3 h-3 text-indigo-600" />
                      <span>Quick Select School Account</span>
                    </p>
                    <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
                      {registeredSchools.map((sch) => (
                        <div
                          key={sch._id}
                          onClick={() => {
                            if (sch.email) handleQuickSchoolSelect(sch.email, 'admin123');
                          }}
                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-200 transition-all cursor-pointer flex items-center justify-between text-[11px]"
                        >
                          <div className="truncate pr-2">
                            <div className="font-bold text-slate-800 truncate">{sch.name}</div>
                            <div className="text-[9px] text-slate-500 font-mono truncate">{sch.email}</div>
                          </div>
                          <span className="text-[9px] font-semibold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full shrink-0">
                            Select
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </form>
          ) : (
            /* ================= REGISTER NEW SCHOOL FORM ================= */
            <form className="space-y-2.5" onSubmit={handleRegisterSubmit}>
              <div className="p-2.5 bg-indigo-50/70 rounded-xl border border-indigo-100 flex items-start gap-2 text-[11px] text-indigo-900 font-medium mb-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  Registering creates a brand new isolated database environment for your school.
                </span>
              </div>

              {/* School Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-0.5">
                    School / College Name *
                  </label>
                  <input
                    id="reg-school-name"
                    type="text"
                    required
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="e.g. St. Xavier's International School"
                    className="block w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-0.5">
                    School Code (Optional)
                  </label>
                  <input
                    id="reg-school-code"
                    type="text"
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SXIS"
                    className="block w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-0.5">
                    Affiliation / Board
                  </label>
                  <select
                    id="reg-school-board"
                    value={board}
                    onChange={(e) => setBoard(e.target.value)}
                    className="block w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600 font-medium"
                  >
                    <option value="CBSE">CBSE</option>
                    <option value="ICSE">ICSE / ISC</option>
                    <option value="State Board">State Board</option>
                    <option value="IB">IB (International Baccalaureate)</option>
                    <option value="Cambridge">Cambridge / IGCSE</option>
                    <option value="University/Other">University / College / Other</option>
                  </select>
                </div>
              </div>

              {/* Admin Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-0.5">
                    Head Librarian / Admin Name *
                  </label>
                  <input
                    id="reg-admin-name"
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    className="block w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-0.5">
                    Official Admin Email *
                  </label>
                  <input
                    id="reg-admin-email"
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="e.g. librarian@stxaviers.edu"
                    className="block w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-0.5">
                    Password (min 6 chars) *
                  </label>
                  <input
                    id="reg-admin-password"
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-0.5">
                    Confirm Password *
                  </label>
                  <input
                    id="reg-confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-0.5">
                    City / Location
                  </label>
                  <input
                    id="reg-city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. New Delhi"
                    className="block w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-0.5">
                    Contact Phone
                  </label>
                  <input
                    id="reg-phone"
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="block w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600 font-medium"
                  />
                </div>
              </div>

              <div className="pt-1">
                <button
                  id="register-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 transition-all shadow-md shadow-indigo-500/20 disabled:opacity-75 cursor-pointer"
                >
                  {loading ? (
                    <span>Setting Up Workspace...</span>
                  ) : (
                    <>
                      <span>Complete Registration & Launch ERP</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};


