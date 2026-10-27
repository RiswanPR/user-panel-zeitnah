/**
 * Zeitnah — Professional HTML & Plain-Text Email Templates (Phase 2)
 *
 * Implements the approved Zeitnah Premium Email Experience design system:
 * - Premium Light as default for authentication, transactional, support, and administrative emails.
 * - Dark Security Variant for security alerts, suspicious logins, and system error incident reports.
 * - 100% table-based structure for cross-client resilience (Outlook, Gmail, Apple Mail, Yahoo).
 * - Tap-to-select OTP cards with accessible contrast and exact backend expiry synchronization.
 * - Strict HTML-escaping boundary and URL sanitization.
 */

import {
  ZEITNAH_BRAND,
  EMAIL_LAYOUT,
  EMAIL_LIGHT_PALETTE,
  EMAIL_DARK_PALETTE,
} from './email-design-tokens';

/**
 * HTML escaping utility for rendering untrusted strings safely in emails
 */
export function escapeHtml(str?: string | null): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates and sanitizes URLs before inserting into email anchor hrefs
 */
export function sanitizeUrl(
  url?: string | null,
  fallback: string = ZEITNAH_BRAND.domains.web,
): string {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (/^https?:\/\/[^\s"'<>]+$/i.test(trimmed)) {
    return escapeHtml(trimmed);
  }
  return fallback;
}

/**
 * Base Wrapper for all Zeitnah emails (Light and Dark variants)
 */
export function wrapInEmailBase(
  contentHtml: string,
  previewText: string = 'Zeitnah — See the unseen',
  variant: 'light' | 'dark' = 'light',
): string {
  const isLight = variant === 'light';
  const palette = isLight ? EMAIL_LIGHT_PALETTE : EMAIL_DARK_PALETTE;
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Zeitnah</title>
  <!--[if mso]>
  <style type="text/css">
    table, td, div, p, a, span { font-family: Arial, sans-serif !important; }
    table { border-collapse: collapse; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${palette.canvasBg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: ${palette.textPrimary};">
  
  <!-- Preheader preview text (hidden) -->
  <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: ${palette.canvasBg}; opacity: 0; mso-hide: all;">
    ${escapeHtml(previewText)}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${palette.canvasBg}; width: 100%; padding: ${EMAIL_LAYOUT.outerPadding};">
    <tr>
      <td align="center" style="padding: 0;">
        
        <!-- Main Email Container (600px Max) -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: ${EMAIL_LAYOUT.maxContainerWidth}; background-color: ${palette.containerBg}; border: 1px solid ${palette.cardBorder}; border-radius: ${EMAIL_LAYOUT.borderRadius.card}; overflow: hidden; box-shadow: ${isLight ? '0 10px 30px rgba(0, 0, 0, 0.08)' : '0 20px 40px rgba(0, 0, 0, 0.5)'};">
          
          <!-- Brand Header Banner -->
          <tr>
            <td align="center" style="background: ${palette.headerBgSolid}; background: ${palette.headerGradient}; padding: ${EMAIL_LAYOUT.headerPadding}; text-align: center; border-bottom: 1px solid ${palette.divider};">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; padding: 8px 18px; background: ${palette.brandMintSubtle}; border: 1px solid rgba(159, 213, 178, 0.28); border-radius: ${EMAIL_LAYOUT.borderRadius.nestedCard}; text-align: center;">
                      <span style="font-size: 20px; font-weight: 900; letter-spacing: 3px; color: ${palette.brandMint}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-transform: uppercase;">ZEITNAH</span>
                      <span style="font-size: 11px; font-weight: 700; letter-spacing: 2px; color: ${palette.textMuted}; text-transform: uppercase; margin-left: 10px; display: inline-block;">SEE THE UNSEEN</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: ${EMAIL_LAYOUT.bodyPadding}; color: ${palette.textPrimary}; font-size: 15px; line-height: 1.6;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Standardized Brand Footer -->
          <tr>
            <td style="background-color: ${palette.footerBg}; padding: ${EMAIL_LAYOUT.footerPadding}; border-top: 1px solid ${palette.footerBorder}; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 800; color: ${isLight ? '#12314c' : palette.brandMint}; letter-spacing: 1px; text-transform: uppercase;">
                ${ZEITNAH_BRAND.name} &bull; ${ZEITNAH_BRAND.tagline}
              </p>
              <p style="margin: 0 0 10px 0; font-size: 12px; color: ${palette.textMuted}; line-height: 1.6; max-width: 480px; margin-left: auto; margin-right: auto;">
                ${ZEITNAH_BRAND.mission}
              </p>
              <p style="margin: 0 0 6px 0; font-size: 11px; color: ${palette.textSubtle};">
                Need assistance? Contact our support team at <a href="mailto:${ZEITNAH_BRAND.domains.support}" style="color: ${isLight ? '#004ce8' : '#38bdf8'}; text-decoration: none; font-weight: 600;">${ZEITNAH_BRAND.domains.support}</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: ${palette.textSubtle};">
                &copy; ${currentYear} ${ZEITNAH_BRAND.name}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ============================================================================
// 1. OTP Verification Email Template (Registration & Login)
// ============================================================================

export function generateOtpEmailHtml(
  otp: string,
  type: 'Login' | 'Registration',
): string {
  const isLogin = type === 'Login';
  const title = isLogin ? 'Login Verification' : 'Welcome to Zeitnah';
  const subtitle = isLogin
    ? 'Use the verification code below to securely complete your login.'
    : 'Use the verification code below to verify your email address and activate your account.';

  const bodyHtml = `
    <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; text-align: center;">
      ${title}
    </h2>
    <p style="margin: 0 0 28px 0; font-size: 15px; color: #475569; text-align: center; line-height: 1.6;">
      ${subtitle}
    </p>

    <!-- OTP Code Display Card (Prime Video inspired: solid subtle border, tap-to-select) -->
    <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 14px; padding: 28px 24px; text-align: center; margin: 24px 0 28px 0;">
      <span style="font-size: 11px; font-weight: 800; color: #12314c; letter-spacing: 2px; text-transform: uppercase; display: block; margin-bottom: 12px;">
        One-Time Verification Code
      </span>
      <div style="font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #0f172a; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; line-height: 1; padding-left: 12px; -webkit-user-select: all; user-select: all;">
        ${escapeHtml(otp)}
      </div>
    </div>

    <!-- Timer Indicator (Strict 3-minute validity) -->
    <div style="text-align: center; margin-bottom: 28px;">
      <span style="display: inline-block; padding: 6px 16px; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 20px; font-size: 12px; font-weight: 700; color: #b45309;">
        ⏱️ Valid for 3 minutes only
      </span>
    </div>

    <!-- Security Warning Card -->
    <div style="background: #f1f5f9; border-left: 4px solid #12314c; border-radius: 0 8px 8px 0; padding: 16px 20px;">
      <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #0f172a;">
        🔒 Security Reminder
      </h4>
      <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
        Never share this code with anyone. Zeitnah support personnel will never request your verification code. If you did not initiate this request, you can safely ignore this email.
      </p>
    </div>
  `;

  return wrapInEmailBase(bodyHtml, `Your Zeitnah ${type} Code is ${otp}`, 'light');
}

export function generateOtpEmailText(
  otp: string,
  type: 'Login' | 'Registration',
): string {
  const isLogin = type === 'Login';
  return [
    `Zeitnah — ${isLogin ? 'Login Verification' : 'Welcome to Zeitnah'}`,
    ``,
    `Your one-time ${type.toLowerCase()} verification code is:`,
    otp,
    ``,
    `Valid for 3 minutes only.`,
    ``,
    `Security Reminder: Never share this code with anyone. Zeitnah personnel will never ask for your code. If you did not initiate this request, please ignore this email.`,
    ``,
    `--`,
    `${ZEITNAH_BRAND.name} • ${ZEITNAH_BRAND.tagline}`,
    `${ZEITNAH_BRAND.mission}`,
  ].join('\n');
}

// ============================================================================
// 2. Suspicious Login Warning Email Template (Dark Security Variant)
// ============================================================================

export function generateSuspiciousLoginEmailHtml(
  userEmail: string,
  loginDetails: {
    deviceType?: string;
    browser?: string;
    os?: string;
    ip?: string;
    location?: string;
  },
  reasons: string[],
): string {
  const reasonsListHtml = reasons
    .map(
      (r) =>
        `<li style="margin-bottom: 6px; color: #fca5a5; font-size: 13px;">${escapeHtml(r)}</li>`,
    )
    .join('');

  const bodyHtml = `
    <!-- Warning Badge -->
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="display: inline-block; padding: 6px 16px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 20px; font-size: 12px; font-weight: 800; color: #f87171; letter-spacing: 1px; text-transform: uppercase;">
        🛡️ Security Alert
      </span>
    </div>

    <h2 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 800; color: #f8fafc; text-align: center; letter-spacing: -0.5px;">
      Suspicious Login Attempt Detected
    </h2>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #94a3b8; text-align: center; line-height: 1.6;">
      We detected a sign-in to your Zeitnah account (<strong style="color: #e2e8f0;">${escapeHtml(userEmail)}</strong>) that differs from your typical login patterns.
    </p>

    <!-- Trigger Reasons Card -->
    ${
      reasons.length > 0
        ? `
    <div style="background: rgba(225, 29, 72, 0.08); border: 1px solid rgba(225, 29, 72, 0.25); border-radius: 10px; padding: 16px 20px; margin-bottom: 24px;">
      <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #f87171; text-transform: uppercase; letter-spacing: 1px;">
        Flagged Detection Triggers
      </h4>
      <ul style="margin: 0; padding-left: 20px;">
        ${reasonsListHtml}
      </ul>
    </div>
    `
        : ''
    }

    <!-- Device Info Table -->
    <div style="background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
      <h4 style="margin: 0 0 14px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #1e293b; padding-bottom: 8px;">
        Session Overview
      </h4>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 120px;">Device Type:</td>
          <td style="padding: 6px 0; color: #f8fafc; font-weight: 600;">${escapeHtml(loginDetails.deviceType || 'Unknown')}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Browser:</td>
          <td style="padding: 6px 0; color: #e2e8f0;">${escapeHtml(loginDetails.browser || 'Unknown')}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Operating System:</td>
          <td style="padding: 6px 0; color: #e2e8f0;">${escapeHtml(loginDetails.os || 'Unknown')}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">IP Address:</td>
          <td style="padding: 6px 0; color: #38bdf8; font-family: monospace;">${escapeHtml(loginDetails.ip || 'Unknown')}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Approx Location:</td>
          <td style="padding: 6px 0; color: #e2e8f0;">${escapeHtml(loginDetails.location || 'Unknown')}</td>
        </tr>
      </table>
    </div>

    <!-- Recommendations Box -->
    <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 20px; line-height: 1.6; font-size: 13px; color: #cbd5e1;">
      <p style="margin: 0 0 10px 0;">
        <strong style="color: #34d399;">Was this you?</strong> If you just logged in from a new browser, device, or location, no further action is required.
      </p>
      <p style="margin: 0; color: #f87171;">
        <strong>Wasn't you?</strong> We strongly recommend revoking active sessions and changing your account credentials immediately.
      </p>
    </div>
  `;

  return wrapInEmailBase(
    bodyHtml,
    `Security Alert: Suspicious login detected for ${userEmail}`,
    'dark',
  );
}

export function generateSuspiciousLoginEmailText(
  userEmail: string,
  loginDetails: {
    deviceType?: string;
    browser?: string;
    os?: string;
    ip?: string;
    location?: string;
  },
  reasons: string[],
): string {
  return [
    `Security Alert: Suspicious login attempt detected for ${userEmail}.`,
    ``,
    `Session Overview:`,
    `- Device Type: ${loginDetails.deviceType || 'Unknown'}`,
    `- Browser: ${loginDetails.browser || 'Unknown'}`,
    `- Operating System: ${loginDetails.os || 'Unknown'}`,
    `- IP Address: ${loginDetails.ip || 'Unknown'}`,
    `- Location: ${loginDetails.location || 'Unknown'}`,
    ...(reasons.length > 0 ? [``, `Triggers:`, ...reasons.map((r) => `- ${r}`)] : []),
    ``,
    `Was this you? If you just logged in from a new browser or location, no further action is required.`,
    `Wasn't you? Please revoke active sessions and secure your account immediately.`,
    ``,
    `--`,
    `${ZEITNAH_BRAND.name} • ${ZEITNAH_BRAND.tagline}`,
  ].join('\n');
}

// ============================================================================
// 3. Support Ticket Staff Alert Email Template (Premium Light)
// ============================================================================

export function generateSupportTicketEmailHtml(ticket: {
  ticketNumber: string;
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
}): string {
  const safeTicketNumber = escapeHtml(ticket.ticketNumber);
  const safeName = escapeHtml(ticket.name);
  const safeEmail = escapeHtml(ticket.email);
  const safeCategory = escapeHtml(ticket.category);
  const safeSubject = escapeHtml(ticket.subject);
  const safeMessage = escapeHtml(ticket.message).replace(/\r\n|\r|\n/g, '<br />');

  const bodyHtml = `
    <!-- Header Badge -->
    <div style="margin-bottom: 20px;">
      <span style="display: inline-block; padding: 6px 14px; background: rgba(18, 49, 76, 0.08); border: 1px solid #cbd5e1; border-radius: 20px; font-size: 12px; font-weight: 700; color: #12314c; text-transform: uppercase; letter-spacing: 1px;">
        🎫 Support Ticket &bull; ${safeTicketNumber}
      </span>
    </div>

    <h2 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
      New Ticket Created
    </h2>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #475569; line-height: 1.6;">
      A student has submitted a new support request requiring team review.
    </p>

    <!-- Ticket Metadata Grid -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 110px;">From:</td>
          <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${safeName} (<a href="mailto:${safeEmail}" style="color: #004ce8; text-decoration: none;">${safeEmail}</a>)</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Category:</td>
          <td style="padding: 6px 0; color: #0f172a;"><span style="display: inline-block; padding: 2px 8px; background: #e2e8f0; border-radius: 6px; font-size: 12px; font-weight: 600;">${safeCategory}</span></td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Subject:</td>
          <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${safeSubject}</td>
        </tr>
      </table>
    </div>

    <!-- Student Message Card -->
    <div style="margin-bottom: 24px;">
      <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
        Ticket Message
      </h4>
      <div style="background-color: #f1f5f9; border-left: 4px solid #12314c; border-radius: 0 8px 8px 0; padding: 18px 20px; color: #1e293b; font-size: 14px; line-height: 1.6;">
        ${safeMessage}
      </div>
    </div>
  `;

  return wrapInEmailBase(
    bodyHtml,
    `[Zeitnah Support] ${ticket.category}: ${ticket.subject} (${ticket.ticketNumber})`,
    'light',
  );
}

export function generateSupportTicketEmailText(ticket: {
  ticketNumber: string;
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
}): string {
  return [
    `New Support Ticket: ${ticket.ticketNumber}`,
    `From: ${ticket.name} <${ticket.email}>`,
    `Category: ${ticket.category}`,
    `Subject: ${ticket.subject}`,
    ``,
    `Message:`,
    ticket.message,
    ``,
    `--`,
    `Zeitnah LMS Platform Support Notification Engine`,
  ].join('\n');
}

// ============================================================================
// 4. Course Enquiry Notification Email Template (Premium Light)
// ============================================================================

export function generateCourseEnquiryNotificationEmailHtml(data: {
  courseName: string;
  name: string;
  email: string;
  phone: string;
  message?: string;
}): string {
  const safeCourseName = escapeHtml(data.courseName);
  const safeName = escapeHtml(data.name);
  const safeEmail = escapeHtml(data.email);
  const safePhone = escapeHtml(data.phone);

  const bodyHtml = `
    <!-- Header Badge -->
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="display: inline-block; padding: 6px 16px; background: rgba(18, 49, 76, 0.08); border: 1px solid #cbd5e1; border-radius: 20px; font-size: 12px; font-weight: 700; color: #12314c; letter-spacing: 1px; text-transform: uppercase;">
        🎓 Course Lead Notification
      </span>
    </div>

    <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 800; color: #0f172a; text-align: center; letter-spacing: -0.5px;">
      New Course Enquiry Received
    </h2>
    <p style="margin: 0 0 28px 0; font-size: 15px; color: #475569; text-align: center; line-height: 1.6;">
      A prospective student submitted an enquiry for <strong style="color: #0f172a;">${safeCourseName}</strong>.
    </p>

    <!-- Target Course Banner -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
      <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Target Course</span>
      <h3 style="margin: 4px 0 0 0; font-size: 18px; font-weight: 800; color: #12314c;">${safeCourseName}</h3>
    </div>

    <!-- Student Details Card -->
    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 22px; margin-bottom: 28px;">
      <h4 style="margin: 0 0 16px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px;">
        Student Contact Information
      </h4>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 130px;">Student Name:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${safeName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Email Address:</td>
          <td style="padding: 8px 0;">
            <a href="mailto:${safeEmail}" style="color: #004ce8; text-decoration: none; font-weight: 600;">${safeEmail}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Phone Number:</td>
          <td style="padding: 8px 0;">
            <a href="tel:${safePhone}" style="color: #059669; text-decoration: none; font-weight: 700;">${safePhone}</a>
          </td>
        </tr>
      </table>
    </div>

    ${
      data.message
        ? `
    <!-- Additional Message Box -->
    <div style="background-color: #f8fafc; border-left: 4px solid #12314c; border-radius: 0 8px 8px 0; padding: 18px 20px; margin-bottom: 28px;">
      <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #12314c; text-transform: uppercase; letter-spacing: 1px;">
        Student's Message / Notes
      </h4>
      <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6; font-style: italic;">
        "${escapeHtml(data.message)}"
      </p>
    </div>
    `
        : ''
    }

    <!-- Follow Up Note -->
    <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 10px; padding: 16px 20px; text-align: center;">
      <p style="margin: 0; font-size: 13px; color: #047857; font-weight: 600;">
        💡 Recommended Action: Follow up with ${safeName} via phone or email to assist with course enrollment.
      </p>
    </div>
  `;

  return wrapInEmailBase(
    bodyHtml,
    `New Course Enquiry for ${data.courseName} from ${data.name}`,
    'light',
  );
}

export function generateCourseEnquiryNotificationEmailText(data: {
  courseName: string;
  name: string;
  email: string;
  phone: string;
  message?: string;
}): string {
  return [
    `New Course Enquiry Received`,
    `Course: ${data.courseName}`,
    `Student: ${data.name}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone}`,
    ...(data.message ? [``, `Message:`, data.message] : []),
    ``,
    `Recommended Action: Please follow up with ${data.name} to assist with course enrollment.`,
    ``,
    `--`,
    `${ZEITNAH_BRAND.name} • ${ZEITNAH_BRAND.tagline}`,
  ].join('\n');
}

// ============================================================================
// 5. Troubleshoot Incident Report Email Template (Dark Incident Variant)
// ============================================================================

export function generateTroubleshootEmailHtml(
  report: any,
  userEmail: string,
  sev: { label: string; color: string; emoji: string },
): string {
  const consoleErrorsHtml =
    report.consoleErrors && report.consoleErrors.length > 0
      ? report.consoleErrors
          .slice(0, 15)
          .map(
            (e: any, i: number) => `
            <tr style="border-bottom: 1px solid #1e293b;">
              <td style="padding: 8px 12px; color: #94a3b8; font-size: 12px;">${i + 1}</td>
              <td style="padding: 8px 12px;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: ${
                  e.type === 'error'
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(245, 158, 11, 0.2)'
                }; color: ${e.type === 'error' ? '#fca5a5' : '#fde68a'};">${escapeHtml(e.type)}</span>
              </td>
              <td style="padding: 8px 12px; color: #e2e8f0; font-size: 12px; font-family: monospace; word-break: break-all;">${escapeHtml(
                e.message?.substring(0, 200),
              )}</td>
              <td style="padding: 8px 12px; color: #64748b; font-size: 11px; white-space: nowrap;">${escapeHtml(
                e.timestamp,
              )}</td>
            </tr>`,
          )
          .join('')
      : '<tr><td colspan="4" style="padding: 16px; color: #64748b; text-align: center; font-size: 12px;">No console errors captured</td></tr>';

  const networkErrorsHtml =
    report.networkErrors && report.networkErrors.length > 0
      ? report.networkErrors
          .slice(0, 10)
          .map(
            (e: any, i: number) => `
            <tr style="border-bottom: 1px solid #1e293b;">
              <td style="padding: 8px 12px; color: #94a3b8; font-size: 12px;">${i + 1}</td>
              <td style="padding: 8px 12px;">
                <span style="font-weight: 700; color: #38bdf8; font-size: 12px;">${escapeHtml(e.method)}</span>
              </td>
              <td style="padding: 8px 12px; color: #e2e8f0; font-size: 12px; font-family: monospace; word-break: break-all;">${escapeHtml(
                e.url?.substring(0, 150),
              )}</td>
              <td style="padding: 8px 12px;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: rgba(239, 68, 68, 0.2); color: #fca5a5;">${
                  e.status || 0
                }</span>
              </td>
              <td style="padding: 8px 12px; color: #94a3b8; font-size: 12px;">${escapeHtml(
                e.message?.substring(0, 100),
              )}</td>
            </tr>`,
          )
          .join('')
      : '<tr><td colspan="5" style="padding: 16px; color: #64748b; text-align: center; font-size: 12px;">No network errors captured</td></tr>';

  const browserInfo = report.browserInfo || {};

  const bodyHtml = `
    <!-- Header Title -->
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
      <span style="font-size: 32px; line-height: 1;">${sev.emoji}</span>
      <div>
        <h2 style="margin: 0; font-size: 22px; font-weight: 800; color: #f8fafc; letter-spacing: -0.5px;">
          Troubleshoot Incident Report
        </h2>
        <span style="display: inline-block; margin-top: 4px; font-size: 11px; font-weight: 800; color: ${sev.color}; text-transform: uppercase; letter-spacing: 1px;">
          ${sev.label} SEVERITY
        </span>
      </div>
    </div>

    <!-- Metadata Grid -->
    <div style="background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 100px;">TITLE:</td>
          <td style="padding: 6px 0; color: #f8fafc; font-weight: 700;">${escapeHtml(report.title)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">USER:</td>
          <td style="padding: 6px 0; color: #e2e8f0;">${escapeHtml(userEmail)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">PAGE:</td>
          <td style="padding: 6px 0; color: #38bdf8; font-family: monospace; word-break: break-all;">${escapeHtml(
            report.pageUrl || 'N/A',
          )}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">BROWSER:</td>
          <td style="padding: 6px 0; color: #e2e8f0;">${escapeHtml(browserInfo.browser || 'Unknown')} | ${escapeHtml(
            browserInfo.os || 'Unknown',
          )} | ${escapeHtml(browserInfo.screenSize || 'Unknown')}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">REPORT ID:</td>
          <td style="padding: 6px 0; color: #94a3b8; font-size: 11px; font-family: monospace;">${report._id}</td>
        </tr>
      </table>
    </div>

    ${
      report.description
        ? `
    <!-- User Description Box -->
    <div style="margin-bottom: 24px;">
      <h4 style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
        User Description
      </h4>
      <div style="background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 8px; padding: 14px 16px; color: #e2e8f0; font-size: 13px; line-height: 1.6;">
        ${escapeHtml(report.description)}
      </div>
    </div>
    `
        : ''
    }

    <!-- Console Errors Section -->
    <div style="margin-bottom: 24px;">
      <h4 style="margin: 0 0 10px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
        Console Errors (${report.consoleErrors?.length || 0})
      </h4>
      <div style="overflow-x: auto; background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 8px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <thead>
            <tr style="border-bottom: 2px solid #1e293b; background: rgba(30, 41, 59, 0.5);">
              <th style="padding: 8px 12px; text-align: left; color: #475569; font-size: 10px; font-weight: 700; text-transform: uppercase;">#</th>
              <th style="padding: 8px 12px; text-align: left; color: #475569; font-size: 10px; font-weight: 700; text-transform: uppercase;">Type</th>
              <th style="padding: 8px 12px; text-align: left; color: #475569; font-size: 10px; font-weight: 700; text-transform: uppercase;">Message</th>
              <th style="padding: 8px 12px; text-align: left; color: #475569; font-size: 10px; font-weight: 700; text-transform: uppercase;">Time</th>
            </tr>
          </thead>
          <tbody>${consoleErrorsHtml}</tbody>
        </table>
      </div>
    </div>

    <!-- Network Failures Section -->
    <div style="margin-bottom: 24px;">
      <h4 style="margin: 0 0 10px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
        Network Failures (${report.networkErrors?.length || 0})
      </h4>
      <div style="overflow-x: auto; background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 8px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <thead>
            <tr style="border-bottom: 2px solid #1e293b; background: rgba(30, 41, 59, 0.5);">
              <th style="padding: 8px 12px; text-align: left; color: #475569; font-size: 10px; font-weight: 700; text-transform: uppercase;">#</th>
              <th style="padding: 8px 12px; text-align: left; color: #475569; font-size: 10px; font-weight: 700; text-transform: uppercase;">Method</th>
              <th style="padding: 8px 12px; text-align: left; color: #475569; font-size: 10px; font-weight: 700; text-transform: uppercase;">URL</th>
              <th style="padding: 8px 12px; text-align: left; color: #475569; font-size: 10px; font-weight: 700; text-transform: uppercase;">Status</th>
              <th style="padding: 8px 12px; text-align: left; color: #475569; font-size: 10px; font-weight: 700; text-transform: uppercase;">Message</th>
            </tr>
          </thead>
          <tbody>${networkErrorsHtml}</tbody>
        </table>
      </div>
    </div>
  `;

  return wrapInEmailBase(
    bodyHtml,
    `[${sev.label}] Troubleshoot Incident Report: ${report.title}`,
    'dark',
  );
}

export function generateTroubleshootEmailText(
  report: any,
  userEmail: string,
  sev: { label: string },
): string {
  return [
    `[${sev.label}] Troubleshoot Incident Report`,
    `Title: ${report.title}`,
    `User: ${userEmail}`,
    `Severity: ${sev.label}`,
    `Page: ${report.pageUrl || 'N/A'}`,
    `Report ID: ${report._id}`,
    ...(report.description ? [``, `User Description:`, report.description] : []),
    ``,
    `Console Errors: ${report.consoleErrors?.length || 0}`,
    `Network Failures: ${report.networkErrors?.length || 0}`,
    `Unhandled Exceptions: ${report.unhandledErrors?.length || 0}`,
    ``,
    `--`,
    `Zeitnah Operational Alert System`,
  ].join('\n');
}

// ============================================================================
// 6. Production Error Incident Report Email Template (Dark Variant)
// ============================================================================

export function generateProductionErrorReportEmailHtml(report: {
  source?: string;
  correlationId?: string;
  errorDetails?: string;
  feedback?: { whatHappened?: string };
  adminUrl?: string;
}): string {
  const source = report.source || 'Backend';
  const correlationId = report.correlationId || 'N/A';
  const errorDetails = report.errorDetails || 'Unknown Error';
  const feedbackText = report.feedback?.whatHappened;
  const adminUrl = sanitizeUrl(report.adminUrl, 'https://zeitnahacademy.com/admin');

  const bodyHtml = `
    <!-- Header Badge -->
    <div style="margin-bottom: 20px;">
      <span style="display: inline-block; padding: 4px 12px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 6px; font-size: 11px; font-weight: 800; color: #fca5a5; letter-spacing: 1px; text-transform: uppercase;">
        🚨 CRITICAL SYSTEM INCIDENT
      </span>
    </div>

    <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #f8fafc; letter-spacing: -0.5px;">
      Production Error Report
    </h2>
    <p style="margin: 0 0 24px 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
      An unhandled application error occurred on production. Technical parameters are captured below.
    </p>

    <!-- Parameters Card -->
    <div style="background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 10px; padding: 18px 20px; margin-bottom: 24px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 130px;">SOURCE:</td>
          <td style="padding: 6px 0; color: #38bdf8; font-weight: 700;">${escapeHtml(source)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">CORRELATION ID:</td>
          <td style="padding: 6px 0; color: #94a3b8; font-family: monospace;">${escapeHtml(correlationId)}</td>
        </tr>
      </table>
    </div>

    <!-- Error Detail Box -->
    <div style="background: rgba(15, 23, 42, 0.9); border: 1px solid #334155; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px;">
      <h4 style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: #f87171; text-transform: uppercase; letter-spacing: 1px;">
        Error Details
      </h4>
      <div style="font-family: monospace; font-size: 13px; color: #fca5a5; word-break: break-all; white-space: pre-wrap; line-height: 1.5;">
        ${escapeHtml(errorDetails)}
      </div>
    </div>

    ${
      feedbackText
        ? `
    <!-- User Feedback Callout -->
    <div style="background: rgba(56, 189, 248, 0.08); border-left: 4px solid #38bdf8; border-radius: 0 8px 8px 0; padding: 14px 18px; margin-bottom: 28px;">
      <h4 style="margin: 0 0 4px 0; font-size: 12px; font-weight: 700; color: #38bdf8;">
        User Provided Feedback
      </h4>
      <p style="margin: 0; font-size: 13px; color: #e2e8f0; font-style: italic;">
        "${escapeHtml(feedbackText)}"
      </p>
    </div>
    `
        : ''
    }

    <!-- CTA Button -->
    <div style="text-align: center; margin-top: 28px;">
      <a href="${adminUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 10px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
        View Incident in Admin Panel &rarr;
      </a>
    </div>
  `;

  return wrapInEmailBase(bodyHtml, `🚨 Production Error in ${source}`, 'dark');
}

export function generateProductionErrorReportEmailText(report: {
  source?: string;
  correlationId?: string;
  errorDetails?: string;
  feedback?: { whatHappened?: string };
  adminUrl?: string;
}): string {
  return [
    `[CRITICAL] Production Error Report`,
    `Source: ${report.source || 'Backend'}`,
    `Correlation ID: ${report.correlationId || 'N/A'}`,
    ``,
    `Error Details:`,
    report.errorDetails || 'Unknown Error',
    ...(report.feedback?.whatHappened ? [``, `User Feedback:`, report.feedback.whatHappened] : []),
    ``,
    `Admin URL: ${report.adminUrl || 'https://zeitnahacademy.com/admin'}`,
    ``,
    `--`,
    `Zeitnah Operational Alert System`,
  ].join('\n');
}
