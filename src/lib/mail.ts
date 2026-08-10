import nodemailer from "nodemailer";

/**
 * Creates a Nodemailer SMTP transporter using environment variables.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || "localhost";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587 or other ports
    auth: user && pass ? { user, pass } : undefined,
  });
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends an email using Nodemailer SMTP transport.
 */
export async function sendEmail({ to, subject, html, text }: SendMailOptions): Promise<boolean> {
  const from = process.env.EMAIL_FROM || '"Innonsh Edu" <noreply@innonsh.edu>';

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send email via SMTP:", error);
    // In production or dev without configured SMTP, log details safely without crashing
    return false;
  }
}

/**
 * Sends a password reset email to a user with a secure reset link.
 */
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  userName?: string
): Promise<boolean> {
  const subject = "Reset your Innonsh Edu password";
  const greeting = userName ? `Hello ${userName},` : "Hello,";

  const textContent = `
${greeting}

We received a request to reset the password for your Innonsh Edu account.

To reset your password, please click the link below or copy and paste it into your browser:
${resetUrl}

This link is valid for 1 hour.

If you did not request a password reset, please ignore this email or contact support. Your password will remain unchanged.

Best regards,
The Innonsh Edu Team
`.trim();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .logo { text-align: center; margin-bottom: 24px; }
    .logo-text { font-size: 24px; font-weight: 800; color: #2563eb; letter-spacing: -0.5px; }
    .h1 { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
    .p { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 12px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2); }
    .link-box { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; font-size: 12px; color: #334155; word-break: break-all; margin-bottom: 24px; }
    .notice { font-size: 12px; color: #64748b; border-t: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <span class="logo-text">Innonsh Edu</span>
    </div>
    
    <div class="h1">${greeting}</div>
    
    <p class="p">We received a request to reset the password for your Innonsh Edu account. Click the button below to choose a new password:</p>
    
    <div class="btn-container">
      <a href="${resetUrl}" class="btn" target="_blank" rel="noopener noreferrer">Reset Password</a>
    </div>
    
    <p class="p">If the button doesn't work, copy and paste this link into your web browser:</p>
    <div class="link-box">${resetUrl}</div>
    
    <p class="p" style="font-weight: 600; color: #dc2626;">⏱️ This reset link will expire in 1 hour.</p>
    
    <div class="notice">
      If you did not request a password reset, you can safely ignore this email. Your account password will remain unchanged.
    </div>
  </div>
</body>
</html>
`.trim();

  return sendEmail({
    to: email,
    subject,
    text: textContent,
    html: htmlContent,
  });
}
