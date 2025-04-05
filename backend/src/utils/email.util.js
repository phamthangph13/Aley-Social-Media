const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_SERVER,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Send email verification link
 * @param {string} to Recipient email
 * @param {string} token Verification token
 * @param {string} name User's name
 */
const sendVerificationEmail = async (to, token, name) => {
  const verificationLink = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Verify Your Aley Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #3b5998;">Aley Email Verification</h2>
        <p>Hello ${name},</p>
        <p>Thank you for registering with Aley. To complete your registration, please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #3b5998; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email Address</a>
        </div>
        <p>If the button doesn't work, please copy and paste the following link into your browser:</p>
        <p>${verificationLink}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not sign up for an Aley account, please ignore this email.</p>
        <p>Best regards,<br>The Aley Team</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};

/**
 * Send password reset link
 * @param {string} to Recipient email
 * @param {string} token Reset password token
 * @param {string} name User's name
 */
const sendPasswordResetEmail = async (to, token, name) => {
  const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Reset Your Aley Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #3b5998;">Aley Password Reset</h2>
        <p>Hello ${name},</p>
        <p>You recently requested to reset your password for your Aley account. Click the button below to reset it:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #3b5998; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
        </div>
        <p>If the button doesn't work, please copy and paste the following link into your browser:</p>
        <p>${resetLink}</p>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
        <p>Best regards,<br>The Aley Team</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
}; 