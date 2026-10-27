/**
 * Synthetic Test Fixtures for Zeitnah Premium Email Preview Gallery
 *
 * Guarantees:
 * - 100% synthetic test data (RFC 2606 example.test domains, synthetic OTPs).
 * - Zero production PII, real secrets, or active tokens.
 * - Covers hostile-looking strings, long strings, multiline formatting, and missing optional fields.
 */

import {
  generateOtpEmailHtml,
  generateOtpEmailText,
  generateSuspiciousLoginEmailHtml,
  generateSuspiciousLoginEmailText,
  generateSupportTicketEmailHtml,
  generateSupportTicketEmailText,
  generateCourseEnquiryNotificationEmailHtml,
  generateCourseEnquiryNotificationEmailText,
  generateTroubleshootEmailHtml,
  generateTroubleshootEmailText,
  generateProductionErrorReportEmailHtml,
  generateProductionErrorReportEmailText,
} from './email-templates';

export interface TemplatePreviewItem {
  id: string;
  name: string;
  category:
    | 'Authentication'
    | 'Security Alert'
    | 'Support'
    | 'Admissions'
    | 'System Diagnostics'
    | 'Admin Onboarding';
  variant: 'light' | 'dark';
  trigger: string;
  recipient: string;
  subject: string;
  html: string;
  text: string;
  notes?: string;
}

export const SYNTHETIC_FIXTURES = {
  // Authentication codes
  otp: {
    standard: '482910',
    admin: '719304',
    edgeCase: '000001',
  },

  // User identity fixtures
  users: {
    standard: {
      name: 'Alexander Wright',
      email: 'alexander.wright@student.example.test',
    },
    longName: {
      name: 'Dr. Elizabeth Charlotte Montgomery-Fitzgerald III',
      email: 'e.charlotte.montgomery.fitzgerald@research.example.test',
    },
    hostileString: {
      name: '<script>alert("XSS")</script> & "special" \'quotes\'',
      email: 'attacker"onmouseover="alert(1)@security-audit.example.test',
    },
  },

  // Security alert details
  suspiciousLogin: {
    deviceType: 'MacBook Pro 16" (Apple Silicon M3 Max)',
    browser: 'Safari 18.1 (WebKit 605.1.15)',
    os: 'macOS 15.1 Sequoia',
    ip: '198.51.100.42 (Synthetic Documentation IP)',
    location: 'Frankfurt am Main, Hesse, Germany',
    reasons: [
      'New device fingerprint unrecognized in last 90 days',
      'Geographical distance anomaly: 8,420 km from previous active session',
      'Operating system family changed from Windows NT to Darwin/macOS',
      '<script>alert("injected-reason")</script> (Neutralized trigger parameter)',
    ],
  },

  // Support ticket details
  supportTicket: {
    ticketNumber: 'ZN-SUP-7F9B-2026',
    name: 'Sarah Connor & Associates',
    email: 'sarah.connor@cyberdyne.example.test',
    category: 'VIDEO_PLAYBACK',
    subject: 'DRM license initialization timeout on Firefox Developer Edition <img src=x onerror=1>',
    message: [
      'Hello Support Team,',
      '',
      'When accessing lecture 4 in "Advanced Cloud Architecture", the VdoCipher player initializes for 25 seconds before triggering error code DRM_LIC_REJECT.',
      '',
      'Diagnostic Context:',
      '- Browser: Firefox Developer Edition 132.0b9',
      '- OS: macOS 14.7 Sonoma',
      '- Network: 100 Mbps fiber connection',
      '',
      'Looking forward to your guidance,\nSarah Connor',
    ].join('\n'),
  },

  // Course enquiry details
  courseEnquiry: {
    courseName: 'Full-Stack Distributed Systems Engineering & Cloud Architecture',
    name: 'Maximilian Sterling Jr.',
    email: 'maximilian.sterling@fintech.example.test',
    phone: '+49 151 23456789',
    message:
      'We would like to enroll 12 staff engineers from our platform team in the upcoming Q4 cohort. Does the curriculum cover distributed consensus algorithms and Kafka partitioning?',
  },

  // Troubleshoot report details
  troubleshoot: {
    _id: 'rep_syn_6720f4c91a0b',
    title: 'VdoCipher HTML5 DRM Decryption Crash during Fullscreen Switch',
    severity: 'critical' as const,
    pageUrl: 'https://zeitnahacademy.com/courses/distributed-systems/learn',
    description:
      'Player crashed immediately upon pressing native fullscreen button on external 4K monitor. Hardware-accelerated DRM pipeline reset.',
    consoleErrors: [
      {
        type: 'error',
        message: 'DOMException: Failed to execute "requestMediaKeySystemAccess" on "MediaDevices"',
        timestamp: '14:22:01.402 UTC',
      },
      {
        type: 'warn',
        message: 'WebGLContextLost: Context lost on device reset event',
        timestamp: '14:22:01.455 UTC',
      },
      {
        type: 'error',
        message: '<script>alert("hostile-console-log")</script>',
        timestamp: '14:22:01.510 UTC',
      },
    ],
    networkErrors: [
      {
        method: 'POST',
        url: 'https://license.vdocipher.com/auth/playback/token?id=c123&test="xss"',
        status: 504,
        message: 'Gateway Timeout (CloudFront edge failure)',
      },
      {
        method: 'GET',
        url: 'https://cdn.zeitnahacademy.com/hls/master.m3u8',
        status: 200,
        message: 'OK',
      },
    ],
    unhandledErrors: [
      {
        type: 'UncaughtError',
        message: 'MediaKeySession.update failed: InvalidStateError',
      },
    ],
    browserInfo: {
      browser: 'Chrome 130.0.6723.70',
      os: 'macOS 14.7.0',
      screenSize: '3840x2160 (Retina 2x)',
    },
  },

  // Production error report details
  productionError: {
    source: 'PaymentWebhookService',
    correlationId: 'req_live_synth_89e4b7c1',
    errorDetails:
      'SignatureVerificationException: Stripe webhook signature mismatch for event evt_test_123456. Timestamp drift exceeded 300s window.',
    feedback: {
      whatHappened:
        'Checkout was completed on Stripe payment sheet, but enrollment confirmation screen never unlocked.',
    },
    adminUrl: 'https://zeitnahacademy.com/admin/incidents/req_live_synth_89e4b7c1',
  },

  // Admin panel details
  adminWelcome: {
    Name: 'Priya Sharma, Lead Researcher',
    name: 'Priya Sharma, Lead Researcher',
    email: 'priya.sharma@research.example.test',
  },

  adminCourseAssigned: {
    student: {
      Name: 'Marcus Aurelius Vance',
      email: 'marcus.vance@engineering.example.test',
    },
    courses: [
      { courseName: 'Advanced Microservices with NestJS & Apache Kafka' },
      { courseName: 'High-Concurrency Database Optimization with MongoDB 8.0' },
      { courseName: 'Secure Cloud Infrastructure with AWS & Terraform' },
    ],
  },
};

/**
 * Renders all 11 active email templates with synthetic fixtures
 */
export function renderAllTemplatePreviews(): TemplatePreviewItem[] {
  const f = SYNTHETIC_FIXTURES;

  return [
    // ------------------------------------------------------------------------
    // T1: Registration OTP
    // ------------------------------------------------------------------------
    {
      id: 'T1',
      name: 'Registration OTP Verification',
      category: 'Authentication',
      variant: 'light',
      trigger: 'User completes registration form on web or mobile',
      recipient: f.users.standard.email,
      subject: `${f.otp.standard} is your Registration Code - Zeitnah`,
      html: generateOtpEmailHtml(f.otp.standard, 'Registration'),
      text: generateOtpEmailText(f.otp.standard, 'Registration'),
      notes: 'Premium light design with solid OTP card, 3-minute expiry badge, and tap-to-select CSS.',
    },

    // ------------------------------------------------------------------------
    // T2: Login OTP
    // ------------------------------------------------------------------------
    {
      id: 'T2',
      name: 'Passwordless Login OTP',
      category: 'Authentication',
      variant: 'light',
      trigger: 'User requests passwordless email authentication on login page',
      recipient: f.users.standard.email,
      subject: `${f.otp.standard} is your Login Verification Code - Zeitnah`,
      html: generateOtpEmailHtml(f.otp.standard, 'Login'),
      text: generateOtpEmailText(f.otp.standard, 'Login'),
      notes: 'Clean editorial light aesthetic with prominent verification card.',
    },

    // ------------------------------------------------------------------------
    // T3: Suspicious Login Security Alert
    // ------------------------------------------------------------------------
    {
      id: 'T3',
      name: 'Suspicious Login Security Alert',
      category: 'Security Alert',
      variant: 'dark',
      trigger: 'Login attempt from new IP, new device, or suspicious location',
      recipient: f.users.standard.email,
      subject: 'Security Alert: Suspicious login detected',
      html: generateSuspiciousLoginEmailHtml(
        f.users.standard.email,
        f.suspiciousLogin,
        f.suspiciousLogin.reasons,
      ),
      text: generateSuspiciousLoginEmailText(
        f.users.standard.email,
        f.suspiciousLogin,
        f.suspiciousLogin.reasons,
      ),
      notes: 'Dark security variant with high-contrast parameters table and clear remediation advice.',
    },

    // ------------------------------------------------------------------------
    // T4: Support Ticket Notification
    // ------------------------------------------------------------------------
    {
      id: 'T4',
      name: 'Support Ticket Team Alert',
      category: 'Support',
      variant: 'light',
      trigger: 'Student submits support ticket via Help & Support modal',
      recipient: 'support-ops@zeitnah.example.test',
      subject: `[Zeitnah Support] ${f.supportTicket.category}: ${f.supportTicket.subject} (${f.supportTicket.ticketNumber})`,
      html: generateSupportTicketEmailHtml(f.supportTicket),
      text: generateSupportTicketEmailText(f.supportTicket),
      notes: 'Editorial light overview with sanitized student message block preserving line breaks.',
    },

    // ------------------------------------------------------------------------
    // T5: Course Enquiry Notification
    // ------------------------------------------------------------------------
    {
      id: 'T5',
      name: 'Course Enquiry Admission Alert',
      category: 'Admissions',
      variant: 'light',
      trigger: 'Prospect submits enquiry form on public course syllabus page',
      recipient: 'admissions-team@zeitnah.example.test',
      subject: `🎓 New Course Enquiry: ${f.courseEnquiry.courseName} - ${f.courseEnquiry.name}`,
      html: generateCourseEnquiryNotificationEmailHtml(f.courseEnquiry),
      text: generateCourseEnquiryNotificationEmailText(f.courseEnquiry),
      notes: 'Course banner card with student contact table and telephone/email action links.',
    },

    // ------------------------------------------------------------------------
    // T6: Troubleshoot Incident Report
    // ------------------------------------------------------------------------
    {
      id: 'T6',
      name: 'Troubleshoot Incident Report',
      category: 'System Diagnostics',
      variant: 'dark',
      trigger: 'Client video player or network error captured via diagnostic reporter',
      recipient: 'dev-alerts@zeitnah.example.test',
      subject: `🔴 [CRITICAL] Troubleshoot Report — ${f.troubleshoot.title.substring(0, 60)}`,
      html: generateTroubleshootEmailHtml(f.troubleshoot, f.users.standard.email, {
        label: 'CRITICAL',
        color: '#ef4444',
        emoji: '🔴',
      }),
      text: generateTroubleshootEmailText(f.troubleshoot, f.users.standard.email, {
        label: 'CRITICAL',
      }),
      notes: 'Dark incident report with structured table rows for console and network errors.',
    },

    // ------------------------------------------------------------------------
    // T7: Production Error Report
    // ------------------------------------------------------------------------
    {
      id: 'T7',
      name: 'Production Error Incident Report [Unused / Preview-Only]',
      category: 'System Diagnostics',
      variant: 'dark',
      trigger: 'Standby / Preview-Only (No active dispatch call site in production runtime)',
      recipient: 'dev-ops@zeitnah.example.test',
      subject: `🚨 Production Error in ${f.productionError.source}`,
      html: generateProductionErrorReportEmailHtml(f.productionError),
      text: generateProductionErrorReportEmailText(f.productionError),
      notes: 'Standby template designed for unhandled backend exceptions. Currently unused in production runtime with no active dispatch caller; retained as preview-only reference.',
    },

    // ------------------------------------------------------------------------
    // T8: Admin Login OTP
    // ------------------------------------------------------------------------
    {
      id: 'T8',
      name: 'Admin Panel Login OTP',
      category: 'Admin Onboarding',
      variant: 'light',
      trigger: 'Administrator signs into Admin Panel at /login',
      recipient: 'admin@zeitnahacademy.com',
      subject: 'Your Admin Login OTP • Zeitnah',
      html: (() => {
        // Render with admin-panel mail-helper layout logic
        const content = `
          <div style="text-align:center; margin-bottom:20px;">
              <span style="display:inline-block; padding:6px 16px; background:rgba(18,49,76,.08); border:1px solid #cbd5e1; border-radius:20px; font-size:12px; font-weight:700; color:#12314c; letter-spacing:1px; text-transform:uppercase;">
                  🔒 Administrator Security
              </span>
          </div>

          <h1 style="margin:0 0 10px 0; color:#0f172a; font-size:24px; font-weight:800; letter-spacing:-0.5px; text-align:center;">
              Admin Login Verification
          </h1>
          <p style="margin:0 0 28px 0; color:#475569; font-size:15px; text-align:center; line-height:1.6;">
              Use the following one-time password to complete your administrator sign-in.
          </p>

          <div style="background-color:#f8fafc; border:1px solid #cbd5e1; border-radius:14px; padding:28px 24px; text-align:center; margin:24px 0 28px 0;">
              <span style="font-size:11px; font-weight:800; color:#12314c; letter-spacing:2px; text-transform:uppercase; display:block; margin-bottom:12px;">
                  One-Time Administrator Code
              </span>
              <div style="font-size:38px; font-weight:800; letter-spacing:12px; color:#0f172a; font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,Courier,monospace; line-height:1; padding-left:12px; -webkit-user-select:all; user-select:all;">
                  ${f.otp.admin}
              </div>
          </div>

          <div style="text-align:center; margin-bottom:28px;">
              <span style="display:inline-block; padding:6px 16px; background:rgba(245,158,11,.12); border:1px solid rgba(245,158,11,.3); border-radius:20px; font-size:12px; font-weight:700; color:#b45309;">
                  ⏱️ Valid for 5 minutes only
              </span>
          </div>

          <div style="background:#f1f5f9; border-left:4px solid #12314c; border-radius:0 8px 8px 0; padding:16px 20px;">
              <h4 style="margin:0 0 6px 0; font-size:13px; font-weight:700; color:#0f172a;">
                  🔒 Administrator Security Notice
              </h4>
              <p style="margin:0; font-size:13px; color:#475569; line-height:1.5;">
                  Never share this authentication code with anyone. Zeitnah personnel will never request your administrator OTP. If you did not initiate this login request, please verify your account credentials immediately.
              </p>
          </div>
        `;
        const { wrapInEmailBase } = require('./email-templates');
        return wrapInEmailBase(content, `Your Admin Login OTP is ${f.otp.admin}`, 'light');
      })(),
      text: [
        `Your OTP for admin login is ${f.otp.admin}. It will expire in 5 minutes. Never share this code with anyone.`,
        ``,
        `--`,
        `Zeitnah • See the unseen`,
        `Build, connect, discover`,
      ].join('\n'),
      notes: 'Matches actual 5-minute admin OTP validity with solid card styling.',
    },

    // ------------------------------------------------------------------------
    // T9: Admin Student Welcome
    // ------------------------------------------------------------------------
    {
      id: 'T9',
      name: 'Admin Student Welcome & Onboarding',
      category: 'Admin Onboarding',
      variant: 'light',
      trigger: 'Admin creates a new student in Admin Panel',
      recipient: f.adminWelcome.email,
      subject: 'Welcome to Zeitnah LMS – Your Learning Account is Ready',
      html: (() => {
        const content = `
          <div style="text-align:center; margin-bottom:20px;">
              <span style="display:inline-block; padding:6px 16px; background:rgba(18,49,76,.08); border:1px solid #cbd5e1; border-radius:20px; font-size:12px; font-weight:700; color:#12314c; letter-spacing:1px; text-transform:uppercase;">
                  🎓 Student Onboarding
              </span>
          </div>

          <h1 style="margin:0 0 10px 0; color:#0f172a; font-size:24px; font-weight:800; letter-spacing:-0.5px; text-align:center;">Welcome to Zeitnah LMS</h1>
          <p style="margin:0 0 28px 0; color:#475569; font-size:15px; text-align:center; line-height:1.6;">Your learning account has been successfully configured.</p>

          <p style="margin:0 0 18px; color:#334155; font-size:15px; line-height:1.6;">Hello <strong>${f.adminWelcome.name}</strong>,</p>
          <p style="margin:0 0 24px; color:#475569; font-size:15px; line-height:1.6;">We are pleased to welcome you to the Zeitnah learning platform. Your student account is active and ready for coursework access.</p>

          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:24px; margin:28px 0;">
              <h2 style="margin:0 0 12px; color:#12314c; font-size:17px; font-weight:700;">Passwordless Email &amp; OTP Login</h2>
              <p style="margin:0 0 12px; color:#475569; font-size:14px; line-height:1.6;">Access your learning portal securely with zero password friction:</p>
              <ol style="margin:0 0 16px 0; padding-left:20px; color:#475569; font-size:14px; line-height:1.7;">
                  <li>Enter your registered email on the login screen</li>
                  <li>Receive a 6-digit One-Time Password (OTP) in your inbox</li>
                  <li>Verify the code to access your curriculum dashboard</li>
              </ol>
              <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; font-size:13px; color:#0f172a;">
                  <strong>Registered Email:</strong> <span style="color:#004ce8;">${f.adminWelcome.email}</span>
              </div>
          </div>

          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:32px auto 20px auto;">
              <tr>
                  <td align="center" bgcolor="#12314c" style="border-radius:10px;">
                      <a href="https://zeitnahacademy.com/login" target="_blank" style="font-size:15px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; font-weight:700; color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:10px; display:inline-block; box-shadow:0 4px 14px rgba(18,49,76,.25);">
                          Access Your Dashboard &rarr;
                      </a>
                  </td>
              </tr>
          </table>
        `;
        const { wrapInEmailBase } = require('./email-templates');
        return wrapInEmailBase(content, 'Welcome to Zeitnah LMS — Your Learning Account is Ready', 'light');
      })(),
      text: [
        `Welcome to Zeitnah LMS`,
        ``,
        `Hello ${f.adminWelcome.name},`,
        `Welcome to Zeitnah LMS. Your learning account has been created successfully.`,
        ``,
        `Secure Login via Email & OTP:`,
        `You can access your dashboard using your registered email address (${f.adminWelcome.email}). No password is required.`,
        ``,
        `Access Your Dashboard: https://zeitnahacademy.com/login`,
        ``,
        `--`,
        `Zeitnah • See the unseen`,
        `Build, connect, discover`,
      ].join('\n'),
      notes: 'Expressive editorial layout welcoming new student with login guide and dashboard CTA.',
    },

    // ------------------------------------------------------------------------
    // T10: Admin Course Assigned
    // ------------------------------------------------------------------------
    {
      id: 'T10',
      name: 'Admin Course Assigned Notification',
      category: 'Admin Onboarding',
      variant: 'light',
      trigger: 'Admin assigns new courses to existing student',
      recipient: f.adminCourseAssigned.student.email,
      subject: 'A New Course Has Been Added to Your Account',
      html: (() => {
        const courseItems = f.adminCourseAssigned.courses
          .map((c) => `<li style="margin-bottom:8px; color:#0f172a; font-size:14px;"><strong>${c.courseName}</strong></li>`)
          .join('');

        const content = `
          <div style="text-align:center; margin-bottom:20px;">
              <span style="display:inline-block; padding:6px 16px; background:rgba(18,49,76,.08); border:1px solid #cbd5e1; border-radius:20px; font-size:12px; font-weight:700; color:#12314c; letter-spacing:1px; text-transform:uppercase;">
                  📚 Curriculum Update
              </span>
          </div>

          <h1 style="margin:0 0 10px 0; color:#0f172a; font-size:24px; font-weight:800; letter-spacing:-0.5px; text-align:center;">New Courses Assigned</h1>
          <p style="margin:0 0 28px 0; color:#475569; font-size:15px; text-align:center; line-height:1.6;">Your learning journey continues with updated course enrollments.</p>

          <p style="margin:0 0 18px; color:#334155; font-size:15px; line-height:1.6;">Hello <strong>${f.adminCourseAssigned.student.Name}</strong>,</p>
          <p style="margin:0 0 24px; color:#475569; font-size:15px; line-height:1.6;">New curriculum modules have been provisioned to your learning account:</p>

          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:22px 24px; margin:24px 0;">
              <h2 style="margin:0 0 14px; color:#12314c; font-size:16px; font-weight:700;">Enrolled Coursework:</h2>
              <ul style="margin:0; padding-left:20px; line-height:1.7;">
                  ${courseItems}
              </ul>
          </div>

          <p style="margin:0 0 24px; color:#475569; font-size:14px; line-height:1.6;">
              Log in with your registered email (<strong>${f.adminCourseAssigned.student.email}</strong>) to stream lectures, review instructional materials, and track your learning progress.
          </p>

          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:32px auto 20px auto;">
              <tr>
                  <td align="center" bgcolor="#12314c" style="border-radius:10px;">
                      <a href="https://zeitnahacademy.com/login" target="_blank" style="font-size:15px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; font-weight:700; color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:10px; display:inline-block; box-shadow:0 4px 14px rgba(18,49,76,.25);">
                          Access Your Dashboard &rarr;
                      </a>
                  </td>
              </tr>
          </table>
        `;
        const { wrapInEmailBase } = require('./email-templates');
        return wrapInEmailBase(content, 'New Courses Added to Your Zeitnah Account', 'light');
      })(),
      text: [
        `New Course Assigned`,
        ``,
        `Hello ${f.adminCourseAssigned.student.Name},`,
        `New courses have been added to your Zeitnah learning account:`,
        ``,
        f.adminCourseAssigned.courses.map((c) => `- ${c.courseName}`).join('\n'),
        ``,
        `Log in with your registered email (${f.adminCourseAssigned.student.email}) to access your learning dashboard.`,
        ``,
        `Access Your Dashboard: https://zeitnahacademy.com/login`,
        ``,
        `--`,
        `Zeitnah • See the unseen`,
        `Build, connect, discover`,
      ].join('\n'),
      notes: 'Curriculum update card with enrolled coursework bullet list and dashboard CTA button.',
    },

    // ------------------------------------------------------------------------
    // T11: Admin Diagnostic Test Email
    // ------------------------------------------------------------------------
    {
      id: 'T11',
      name: 'Admin Subsystem Diagnostic Test',
      category: 'System Diagnostics',
      variant: 'light',
      trigger: 'Superadmin triggers manual test email from Admin Panel',
      recipient: 'superadmin@zeitnahacademy.com',
      subject: 'Zeitnah Admin • Email Diagnostic Test',
      html: (() => {
        const content = `
          <div style="text-align:center; margin-bottom:20px;">
              <span style="display:inline-block; padding:6px 14px; background:rgba(159,213,178,.2); border:1px solid rgba(159,213,178,.4); border-radius:20px; font-size:12px; font-weight:700; color:#0f172a; text-transform:uppercase;">
                  DIAGNOSTIC TEST
              </span>
          </div>

          <h1 style="margin:0 0 10px 0; color:#0f172a; font-size:22px; font-weight:800; text-align:center;">Email Integration Verified</h1>
          <p style="margin:0 0 24px 0; color:#475569; font-size:14px; line-height:1.6; text-align:center;">
              This automated diagnostic message confirms that the Zeitnah Admin email subsystem is operational.
          </p>

          <div style="background:#f8fafc; border-left:4px solid #12314c; border-radius:0 8px 8px 0; padding:16px 20px; margin:24px 0;">
              <p style="margin:0; color:#0f172a; font-size:14px;"><strong>Provider:</strong> Resend API</p>
              <p style="margin:6px 0 0 0; color:#64748b; font-size:13px;"><strong>Timestamp:</strong> 2026-10-28T01:50:00.000Z</p>
          </div>
          <p style="margin:0; color:#94a3b8; font-size:12px; text-align:center;">If you received this message, SMTP and Resend API communication is healthy.</p>
        `;
        const { wrapInEmailBase } = require('./email-templates');
        return wrapInEmailBase(content, 'Zeitnah Admin • Email Diagnostic Test', 'light');
      })(),
      text: [
        `Zeitnah Admin • Email Diagnostic Test`,
        ``,
        `This automated diagnostic test confirms that the Zeitnah Admin email subsystem is operational.`,
        ``,
        `Provider: Resend API`,
        `Timestamp: 2026-10-28T01:50:00.000Z`,
        ``,
        `--`,
        `Zeitnah • See the unseen`,
        `Build, connect, discover`,
      ].join('\n'),
      notes: 'Clean diagnostic test verification card with timestamp and provider info.',
    },
  ];
}
