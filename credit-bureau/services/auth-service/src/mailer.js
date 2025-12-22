import nodemailer from 'nodemailer';
import { config } from './config.js';

let transporter;
if (config.mail.enabled) {
  transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure,
    auth: {
      user: config.mail.user,
      pass: config.mail.pass
    }
  });
}

export async function sendInviteEmail({ email, token, role, institutionName, tempPassword }) {
  if (!config.mail.enabled || !transporter) {
    console.log('SMTP not configured; skipping invite email. Token:', token, 'TempPassword:', tempPassword);
    return;
  }
  const loginUrl = `${config.mail.inviteBaseUrl || ''}/login`;
  const subject = 'Your portal access invitation';
  const body = `
Hello,

You have been invited to the credit bureau portal as ${role}${institutionName ? ` for ${institutionName}` : ''}.

Temporary password: ${tempPassword}
Login here: ${loginUrl}

On first sign-in you will be asked to change your password.

If you did not expect this invitation, you can ignore this email.
`;
  await transporter.sendMail({
    to: email,
    from: config.mail.from,
    subject,
    text: body
  });
}

export async function sendResetEmail({ email, tempPassword }) {
  if (!config.mail.enabled || !transporter) {
    console.log('SMTP not configured; temp password for reset:', tempPassword);
    return;
  }
  const resetUrl = `${config.mail.resetBaseUrl || ''}/reset-password`;
  const subject = 'Your password reset';
  const body = `
Hello,

You requested a password reset. Use the temporary password below to sign in, then change your password:

Temporary password: ${tempPassword}
Reset here: ${resetUrl}

If you did not request this, you can ignore this email.
`;
  await transporter.sendMail({
    to: email,
    from: config.mail.from,
    subject,
    text: body
  });
}
