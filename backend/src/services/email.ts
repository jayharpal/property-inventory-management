import nodemailer from 'nodemailer';

// Configuration for email service
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'notifications@propskudemo.com';
const APP_URL = process.env.APP_URL || 'http://localhost:5000';

// Create a testing transport when SendGrid API key is not available
let transporter: nodemailer.Transporter;

if (SENDGRID_API_KEY) {
  // Configure nodemailer to use SendGrid
  transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'apikey',
      pass: SENDGRID_API_KEY
    }
  });
} else {
  // Use ethereal email for testing when no SendGrid API key is available
  console.warn('SENDGRID_API_KEY not configured, emails will be logged to console');
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: 'ethereal.user@ethereal.email',
      pass: 'etherealpass'
    }
  });
}

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: {
    filename: string;
    path: string;
    contentType?: string;
  }[];
}

/**
 * Send an email using the configured email service
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  console.log("send grid",SENDGRID_API_KEY);
  console.log("transporter",transporter);
  
  try {
    const emailResult = await transporter.sendMail({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments
    });

    console.log(`Email sent: ${emailResult.messageId}`);
    
    // If using ethereal email, log the preview URL
    if (!SENDGRID_API_KEY && emailResult.messageId) {
      console.log(`Ethereal email preview URL: ${nodemailer.getTestMessageUrl(emailResult)}`);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Send a monthly expense report email to an owner
 */
export async function sendMonthlyReportEmail(
  options: {
    ownerEmail: string;
    ownerName: string;
    reportName?: string;
    month: number;
    year: number;
    reportPath: string;
  } | string,
  ownerName?: string,
  month?: string,
  year?: string,
  reportFilePath?: string
): Promise<boolean> {
  // Handle both function signatures for backward compatibility
  let emailOptions: {
    ownerEmail: string;
    ownerName: string;
    month: string;
    year: string;
    reportPath: string;
  };
  
  if (typeof options === 'object') {
    // New interface with object parameter
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    emailOptions = {
      ownerEmail: options.ownerEmail,
      ownerName: options.ownerName,
      month: monthNames[options.month - 1],
      year: options.year.toString(),
      reportPath: options.reportPath
    };
  } else {
    // Legacy interface with positional parameters
    emailOptions = {
      ownerEmail: options,
      ownerName: ownerName!,
      month: month!,
      year: year!,
      reportPath: reportFilePath!
    };
  }
  
  const subject = `Monthly Expense Report - ${emailOptions.month} ${emailOptions.year}`;
  
  const text = `
    Hello ${emailOptions.ownerName},

    Your monthly expense report for ${emailOptions.month} ${emailOptions.year} is attached.

    This report includes a detailed breakdown of all expenses and inventory used across your properties.

    Thank you for your continued partnership.

    PropSku Team
  `;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3B82F6;">Monthly Expense Report</h2>
      <p>Hello ${emailOptions.ownerName},</p>
      <p>Your monthly expense report for <strong>${emailOptions.month} ${emailOptions.year}</strong> is attached.</p>
      <p>This report includes a detailed breakdown of all expenses and inventory used across your properties.</p>
      <p>Thank you for your continued partnership.</p>
      <p style="margin-top: 30px;">Best regards,<br>PropSku Team</p>
    </div>
  `;
  
  return sendEmail({
    to: emailOptions.ownerEmail,
    subject,
    text,
    html,
    attachments: [
      {
        filename: `${emailOptions.ownerName.replace(/\s+/g, '_')}_${emailOptions.month}_${emailOptions.year}_Expense_Report.pdf`,
        path: emailOptions.reportPath,
        contentType: 'application/pdf'
      }
    ]
  });
}

/**
 * Send an invitation email to a new user
 */
export async function sendInvitationEmail(options: {
  email: string;
  portfolioName: string;
  invitedByName: string;
  role: string;
  token: string;
}): Promise<boolean> {
  const { email, portfolioName, invitedByName, role, token } = options;
  
  const invitationLink = `${APP_URL}/invitation/${token}`;
  const roleName = role === 'standard_user' ? 'Standard User' : 'Standard Admin';
  
  const subject = `Invitation to join ${portfolioName} on PropSku`;
  
  const text = `
    Hello,

    You've been invited by ${invitedByName} to join ${portfolioName} on PropSku as a ${roleName}.
    
    PropSku helps property managers track expenses, manage inventory, and generate reports for property owners.

    To accept this invitation, please click the link below or copy and paste it into your browser:
    ${invitationLink}

    This invitation will expire in 7 days.

    Thank you,
    PropSku Team
  `;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3B82F6;">Invitation to PropSku</h2>
      <p>Hello,</p>
      <p>You've been invited by <strong>${invitedByName}</strong> to join <strong>${portfolioName}</strong> on PropSku as a <strong>${roleName}</strong>.</p>
      <p>PropSku helps property managers track expenses, manage inventory, and generate reports for property owners.</p>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${invitationLink}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
          Accept Invitation
        </a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="background-color: #f3f4f6; padding: 10px; word-break: break-all;">
        ${invitationLink}
      </p>
      
      <p><em>This invitation will expire in 7 days.</em></p>
      
      <p style="margin-top: 30px;">Best regards,<br>PropSku Team</p>
    </div>
  `;
  
  return sendEmail({
    to: email,
    subject,
    text,
    html,
  });
}
