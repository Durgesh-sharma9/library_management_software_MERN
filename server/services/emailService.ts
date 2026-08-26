import nodemailer from 'nodemailer';

const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || 'ss6587493@gmail.com';
  const pass = process.env.SMTP_PASS || 'gxxtesjbcrnevlqp';

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

export async function sendVerificationOTPEmail(email: string, otp: string, schoolName: string) {
  try {
    const transporter = createTransporter();
    const mailFrom = process.env.MAIL_FROM || process.env.SMTP_USER || 'ss6587493@gmail.com';

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">📚 School Library System</h1>
          <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Email Verification Code for School Registration</p>
        </div>
        
        <div style="padding: 32px 24px; color: #1e293b;">
          <p style="margin-top: 0; font-size: 15px; line-height: 1.6; color: #334155;">
            Thank you for registering <strong>${schoolName || 'your school'}</strong> on our Library Management Software!
          </p>
          <p style="font-size: 14px; color: #64748b; margin-bottom: 24px;">
            Please use the 6-digit verification code below to verify your email address and complete your school registration:
          </p>

          <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #4f46e5;">
              ${otp}
            </span>
          </div>

          <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-bottom: 0;">
            ⏰ This code will expire in <strong>10 minutes</strong>. Do not share this OTP with anyone.
          </p>
        </div>

        <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0;">Sent via School Library SaaS Platform • Need help? Contact support</p>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"School Library System" <${mailFrom}>`,
      to: email,
      subject: `${otp} is your School Registration Verification Code`,
      html: htmlContent,
    });

    console.log('✅ OTP Email sent successfully to', email, 'MessageId:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('❌ Failed to send OTP email via SMTP:', error);
    throw new Error(error.message || 'SMTP Email delivery failed');
  }
}
