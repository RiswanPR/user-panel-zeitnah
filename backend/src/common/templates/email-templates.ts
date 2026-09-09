/**
 * Zeitnah Academy — Professional HTML Email Templates
 */

export function escapeHtml(str?: string | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Base Wrapper for all Zeitnah Academy emails
 */
function wrapInEmailBase(
  contentHtml: string,
  previewText: string = 'Zeitnah Academy Notification',
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zeitnah Academy</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse: collapse;}
    .fallback-font {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #f8fafc;">
  
  <!-- Hidden Preview Text -->
  <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #0b0f19; opacity: 0;">
    ${escapeHtml(previewText)}
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b0f19; width: 100%; padding: 40px 16px;">
    <tr>
      <td align="center">
        
        <!-- Main Email Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 32px 24px 32px; border-bottom: 1px solid #1e293b; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; padding: 10px 18px; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 12px; margin-bottom: 8px;">
                      <span style="font-size: 20px; font-weight: 900; letter-spacing: 2px; color: #38bdf8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-transform: uppercase;">
                        ZEITNAH
                      </span>
                      <span style="font-size: 11px; font-weight: 700; letter-spacing: 3px; color: #94a3b8; text-transform: uppercase; margin-left: 6px; display: inline-block;">
                        ACADEMY
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #080c14; padding: 28px 32px; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #64748b;">
                Zeitnah Academy — Premium Learning Platform
              </p>
              <p style="margin: 0 0 12px 0; font-size: 11px; color: #475569; line-height: 1.5;">
                Please do not reply directly to this message.
              </p>
              <p style="margin: 0; font-size: 11px; color: #334155;">
                &copy; ${new Date().getFullYear()} Zeitnah Academy. All rights reserved.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `;
}

/**
 * 1. OTP Verification Email Template (Login / Register)
 */
export function generateOtpEmailHtml(
  otp: string,
  type: 'Login' | 'Registration',
): string {
  const isLogin = type === 'Login';
  const title = isLogin ? 'Login Verification' : 'Welcome to Zeitnah Academy';
  const subtitle = isLogin
    ? 'Use the code below to complete your login securely.'
    : 'Use the code below to verify your email address and activate your account.';

  const bodyHtml = `
    <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 800; color: #f8fafc; letter-spacing: -0.5px; text-align: center;">
      ${title}
    </h2>
    <p style="margin: 0 0 28px 0; font-size: 14px; color: #94a3b8; text-align: center; line-height: 1.6;">
      ${subtitle}
    </p>

    <!-- OTP Code Display Card -->
    <div style="background-color: #0b0f19; border: 1px dashed #38bdf8; border-radius: 14px; padding: 28px 20px; text-align: center; margin-bottom: 28px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.4);">
      <span style="font-size: 11px; font-weight: 700; color: #38bdf8; letter-spacing: 2px; text-transform: uppercase; display: block; margin-bottom: 12px;">
        One-Time Verification Code
      </span>
      <div style="font-size: 40px; font-weight: 900; letter-spacing: 14px; color: #ffffff; font-family: 'Courier New', Courier, monospace; line-height: 1; padding-left: 14px;">
        ${escapeHtml(otp)}
      </div>
    </div>

    <!-- Timer Indicator -->
    <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 28px; text-align: center;">
      <span style="display: inline-block; padding: 6px 14px; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 20px; font-size: 12px; font-weight: 600; color: #fbbf24;">
        ⏱️ Valid for 3 minutes only
      </span>
    </div>

    <!-- Security Warning Box -->
    <div style="background: rgba(30, 41, 59, 0.7); border-left: 4px solid #38bdf8; border-radius: 0 8px 8px 0; padding: 16px 20px;">
      <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #e2e8f0; display: flex; align-items: center;">
        🔒 Security Reminder
      </h4>
      <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
        Never share this code with anyone. Zeitnah Academy support personnel will never request your OTP. If you did not initiate this request, please ignore this email.
      </p>
    </div>
  `;

  return wrapInEmailBase(bodyHtml, `Your Zeitnah ${type} OTP is ${otp}`);
}

/**
 * 2. Suspicious Login Warning Email Template
 */
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
      <span style="display: inline-block; padding: 6px 16px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 20px; font-size: 12px; font-weight: 700; color: #f87171; letter-spacing: 1px; text-transform: uppercase;">
        🛡️ Security Alert
      </span>
    </div>

    <h2 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 800; color: #f8fafc; text-align: center; letter-spacing: -0.5px;">
      Suspicious Login Attempt Detected
    </h2>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #94a3b8; text-align: center; line-height: 1.6;">
      We noticed a sign-in to your Zeitnah Academy account (<strong style="color: #e2e8f0;">${escapeHtml(userEmail)}</strong>) that differs from your typical login patterns.
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
        <strong style="color: #34d399;">Was this you?</strong> If you just logged in from a new browser or location, no further action is required.
      </p>
      <p style="margin: 0; color: #f87171;">
        <strong>Wasn't you?</strong> We strongly recommend revoking active sessions and changing your account credentials immediately.
      </p>
    </div>
  `;

  return wrapInEmailBase(
    bodyHtml,
    `Security Alert: Suspicious login detected for ${userEmail}`,
  );
}

/**
 * 3. Production Error Alert Email Template (For Dev/Admin Team)
 */
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
  const adminUrl =
    report.adminUrl || 'https://beta.zeitnahacademy.com/admin/error-reports';

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
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">TIMESTAMP:</td>
          <td style="padding: 6px 0; color: #e2e8f0;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
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
      <a href="${escapeHtml(adminUrl)}" target="_blank" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 10px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
        View Full Incident in Admin Panel &rarr;
      </a>
    </div>
  `;

  return wrapInEmailBase(
    bodyHtml,
    `🚨 Production Error [${source}] - ${errorDetails}`,
  );
}

/**
 * 4. Troubleshoot Incident Report Email Template
 */
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

  const unhandledHtml =
    report.unhandledErrors && report.unhandledErrors.length > 0
      ? report.unhandledErrors
          .slice(0, 10)
          .map(
            (e: any) =>
              `<li style="margin-bottom: 6px; color: #fca5a5; font-size: 12px; font-family: monospace;">[${escapeHtml(
                e.type,
              )}] ${escapeHtml(e.message?.substring(0, 200))}</li>`,
          )
          .join('')
      : '<li style="color: #64748b; font-size: 12px;">None</li>';

  const browserInfo = report.browserInfo || {};

  const bodyHtml = `
    <!-- Header Title -->
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
      <span style="font-size: 32px; line-height: 1;">${sev.emoji}</span>
      <div>
        <h2 style="margin: 0; font-size: 22px; font-weight: 800; color: #f8fafc; letter-spacing: -0.5px;">
          Troubleshoot Report
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
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">TIMESTAMP:</td>
          <td style="padding: 6px 0; color: #e2e8f0;">${new Date(
            report['createdAt'],
          ).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
          })} IST</td>
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

    <!-- Unhandled Errors -->
    <div>
      <h4 style="margin: 0 0 10px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
        Unhandled Exceptions (${report.unhandledErrors?.length || 0})
      </h4>
      <ul style="margin: 0; padding-left: 20px;">${unhandledHtml}</ul>
    </div>
  `;

  return wrapInEmailBase(
    bodyHtml,
    `${sev.emoji} [${sev.label}] Troubleshoot Report — ${report.title}`,
  );
}

/**
 * 5. Course Enquiry Notification Email Template
 */
export function generateCourseEnquiryNotificationEmailHtml(data: {
  courseName: string;
  name: string;
  email: string;
  phone: string;
  message?: string;
}): string {
  const bodyHtml = `
    <!-- Header Badge -->
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="display: inline-block; padding: 6px 16px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 20px; font-size: 12px; font-weight: 700; color: #38bdf8; letter-spacing: 1px; text-transform: uppercase;">
        🎓 New Course Enquiry
      </span>
    </div>

    <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 800; color: #f8fafc; text-align: center; letter-spacing: -0.5px;">
      Inquiry Received
    </h2>
    <p style="margin: 0 0 28px 0; font-size: 14px; color: #94a3b8; text-align: center; line-height: 1.6;">
      A student has submitted an inquiry for <strong style="color: #f8fafc;">${escapeHtml(data.courseName)}</strong>.
    </p>

    <!-- Course Banner Card -->
    <div style="background: linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
      <span style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px;">Target Course</span>
      <h3 style="margin: 4px 0 0 0; font-size: 18px; font-weight: 800; color: #ffffff;">${escapeHtml(data.courseName)}</h3>
    </div>

    <!-- Student Details Card -->
    <div style="background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 12px; padding: 22px; margin-bottom: 28px;">
      <h4 style="margin: 0 0 16px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">
        Student Contact Details
      </h4>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 130px;">Student Name:</td>
          <td style="padding: 8px 0; color: #f8fafc; font-weight: 700;">${escapeHtml(data.name)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Email Address:</td>
          <td style="padding: 8px 0;">
            <a href="mailto:${escapeHtml(data.email)}" style="color: #38bdf8; text-decoration: none; font-weight: 600;">${escapeHtml(data.email)}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Phone Number:</td>
          <td style="padding: 8px 0;">
            <a href="tel:${escapeHtml(data.phone)}" style="color: #34d399; text-decoration: none; font-weight: 700;">${escapeHtml(data.phone)}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Date Submitted:</td>
          <td style="padding: 8px 0; color: #e2e8f0;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
        </tr>
      </table>
    </div>

    ${
      data.message
        ? `
    <!-- Additional Message Box -->
    <div style="background-color: #1e293b; border-left: 4px solid #38bdf8; border-radius: 0 10px 10px 0; padding: 18px 20px; margin-bottom: 28px;">
      <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px;">
        Student's Message / Notes
      </h4>
      <p style="margin: 0; font-size: 14px; color: #f1f5f9; line-height: 1.6; font-style: italic;">
        "${escapeHtml(data.message)}"
      </p>
    </div>
    `
        : ''
    }

    <!-- Follow Up Note -->
    <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 10px; padding: 16px 20px; text-align: center;">
      <p style="margin: 0; font-size: 13px; color: #34d399; font-weight: 600;">
        💡 Recommended Action: Please follow up with ${escapeHtml(data.name)} via phone or email to assist with course enrollment.
      </p>
    </div>
  `;

  return wrapInEmailBase(
    bodyHtml,
    `New Course Enquiry for ${data.courseName} from ${data.name}`,
  );
}
