import nodemailer from 'nodemailer';

const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD;

let transporter = null;

// Initialize nodemailer only if credentials are provided
if (emailUser && emailPassword) {
  try {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword
      }
    });
    console.log('✓ Email service initialized');
  } catch (error) {
    console.warn('⚠️ Email service initialization failed:', error.message);
  }
}

export const sendEmail = async (to, subject, text) => {
  if (!transporter) {
    console.warn('⚠️ Email service not configured');
    console.log('📧 Email would be sent to:', to);
    console.log('📝 Subject:', subject);
    // Don't throw error, just log
    return { success: false, message: 'Email service not configured' };
  }

  try {
    const mailOptions = {
      from: `SafeHer Safety <${emailUser}>`,
      to,
      subject,
      text,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff3f3; border: 2px solid #ef4444; border-radius: 10px;">
          <h2 style="color: #dc2626; margin-top: 0;">🚨 SafeHer Emergency Alert</h2>
          <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <pre style="white-space: pre-wrap; font-family: inherit;">${text}</pre>
          </div>
          <p style="color: #666; font-size: 12px; text-align: center; margin-bottom: 0;">
            This is an automated emergency alert from SafeHer
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✓ Email sent to ${to}, ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email service error:', error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};