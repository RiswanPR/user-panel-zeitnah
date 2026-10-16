import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ShieldCheck,
  Scale,
  FileText,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Lock,
  Video,
  KeyRound,
  Trash2,
  Building2,
  Mail,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Clock,
  Printer,
  ChevronRight,
  Layers,
  Search,
} from "lucide-react";
import BRAND from "../../constants/brand";
import ZeitnahZMotif from "../../components/courses/ZeitnahZMotif";

/**
 * ZEITNAH LMS — OFFICIAL TERMS OF SERVICE
 * Route: /terms-of-service
 * Canonical URL: https://zeitnahacademy.com/terms-of-service
 *
 * Operating Legal Entity:
 * ZEITNAH INSTITUTE OF SURVEY LLP (Limited Liability Partnership)
 * 1st Floor, 34/1412, Babil Complex, Kovilakam Road, Mankavu, Kozhikode, Kerala 673007, India
 */

const SECTIONS = [
  { id: "acceptance", number: "01", title: "Acceptance of Terms & Operating Entity" },
  { id: "account-registration", number: "02", title: "Account Registration, OTP & Security" },
  { id: "educational-services", number: "03", title: "Educational Services, Curriculum & Attendance" },
  { id: "intellectual-property", number: "04", title: "Proprietary Rights, DRM & Forensic Watermarking" },
  { id: "user-conduct", number: "05", title: "Acceptable Use & Prohibited Conduct" },
  { id: "admissions-fees", number: "06", title: "Admissions, Course Fees & Enquiry Policy" },
  { id: "user-contributions", number: "07", title: "Portfolios, Resumes & Community Messaging" },
  { id: "third-party-services", number: "08", title: "Third-Party Infrastructure & Technical Limitations" },
  { id: "disclaimers", number: "09", title: "Disclaimers of Warranties & Educational Outcomes" },
  { id: "limitation-liability", number: "10", title: "Limitation of Liability & Indemnification" },
  { id: "termination", number: "11", title: "Suspension, Termination & Apple Guideline 5.1.1(v) Deletion" },
  { id: "governing-law", number: "12", title: "Governing Law & Exclusive Jurisdiction" },
  { id: "modifications-contact", number: "13", title: "Modifications to Terms & Legal Notices" },
];

export default function TermsOfServicePage() {
  const shouldReduceMotion = useReducedMotion();
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    document.title = "Terms of Service — Zeitnah LMS | ZeitnahAcademy";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Official Terms of Service for Zeitnah LMS operated by ZEITNAH INSTITUTE OF SURVEY LLP. Review student terms, course access, DRM video protections, and acceptable use."
      );
    }
    window.scrollTo(0, 0);
  }, []);

  // Scroll-spy observer for table of contents
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible?.target?.id) {
          setActiveSection(visible.target.id);
        }
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: 0.1 }
    );

    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const filteredSections = SECTIONS.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.number.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-[#070B14] text-text-primary selection:bg-brand-mint/20 selection:text-brand-mint pt-20 pb-24">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 -left-48 w-96 h-96 rounded-full bg-brand-mint/[0.03] blur-[120px]" />
        <div className="absolute bottom-1/3 -right-48 w-96 h-96 rounded-full bg-blue-500/[0.03] blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-text-muted font-mono">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-text-faint" />
          <span className="text-text-faint">Legal</span>
          <ChevronRight className="w-3.5 h-3.5 text-text-faint" />
          <span className="text-brand-mint font-semibold">Terms of Service</span>
        </nav>

        {/* Hero Header */}
        <div className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#0C1220]/90 to-[#070B14]/90 p-8 sm:p-12 mb-10 overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="absolute -right-16 -top-16 w-80 h-80 opacity-15 pointer-events-none">
            <ZeitnahZMotif />
          </div>

          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-mint/10 border border-brand-mint/20 text-brand-mint text-xs font-mono font-bold tracking-wider uppercase">
              <Scale className="w-3.5 h-3.5" />
              <span>Official Legal Agreement</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-heading font-extrabold text-white tracking-tight leading-tight">
              Terms of Service
            </h1>

            <p className="text-sm sm:text-base text-text-muted leading-relaxed">
              These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you and{" "}
              <strong className="text-white">ZEITNAH INSTITUTE OF SURVEY LLP</strong> (&ldquo;Zeitnah,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;),
              governing your access to and use of the Zeitnah Learning Management System (LMS), mobile applications, and instructional engineering curricula.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-text-secondary">
              <span className="inline-flex items-center gap-1.5 bg-white/[0.04] px-3 py-1 rounded-lg border border-white/[0.06]">
                <Clock className="w-3.5 h-3.5 text-brand-mint" />
                <span>Effective Date: October 16, 2026</span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/[0.04] px-3 py-1 rounded-lg border border-white/[0.06]">
                <Building2 className="w-3.5 h-3.5 text-brand-yellow" />
                <span>Operating Entity: ZEITNAH INSTITUTE OF SURVEY LLP</span>
              </span>
              <button
                type="button"
                onClick={handlePrint}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-white transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid: Sidebar (4 cols) + Content (8 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Table of Contents Sticky Sidebar */}
          <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0A0F1A]/80 backdrop-blur-md p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase font-bold text-text-secondary tracking-wider">
                  Table of Contents
                </span>
                <span className="font-mono text-[11px] text-text-faint">{SECTIONS.length} Sections</span>
              </div>

              {/* Quick Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter sections..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-text-faint focus:outline-none focus:border-brand-mint transition-colors"
                />
              </div>

              {/* Navigation Items */}
              <nav className="space-y-1 max-h-[55vh] overflow-y-auto pr-1">
                {filteredSections.map((section) => {
                  const isActive = activeSection === section.id;
                  return (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className={`group flex items-start gap-2.5 px-3 py-2 rounded-xl text-xs transition-all ${
                        isActive
                          ? "bg-brand-mint/10 text-brand-mint font-semibold border border-brand-mint/20"
                          : "text-text-muted hover:text-white hover:bg-white/[0.03]"
                      }`}
                    >
                      <span className={`font-mono text-[10px] shrink-0 mt-0.5 ${isActive ? "text-brand-mint font-bold" : "text-text-faint"}`}>
                        {section.number}
                      </span>
                      <span className="leading-snug">{section.title}</span>
                    </a>
                  );
                })}
              </nav>

              {/* Cross-Link Legal Cards */}
              <div className="pt-3 border-t border-white/[0.08] space-y-2">
                <Link
                  to="/privacy-policy"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] text-xs text-text-secondary hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-brand-mint" />
                    <span>Privacy Policy</span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-text-faint" />
                </Link>
                <Link
                  to="/support"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] text-xs text-text-secondary hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-3.5 h-3.5 text-brand-yellow" />
                    <span>Help & Support Center</span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-text-faint" />
                </Link>
              </div>
            </div>

            {/* Entity Verification Notice Box */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0A0F1A]/80 p-5 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 font-bold text-white">
                <Building2 className="w-4 h-4 text-brand-mint shrink-0" />
                <span>Operating Legal Entity</span>
              </div>
              <p className="text-text-secondary leading-relaxed">
                <strong className="text-white">ZEITNAH INSTITUTE OF SURVEY LLP</strong><br />
                Business Constitution: Limited Liability Partnership<br />
                1st Floor, 34/1412, Babil Complex, Kovilakam Road, Mankavu, Kozhikode, Kerala 673007, India
              </p>
            </div>
          </aside>

          {/* Legal Content Body (8 cols) */}
          <main className="lg:col-span-8 space-y-12">
            {/* ═══════════════════════════════════════════════════════
                SECTION 1: ACCEPTANCE OF TERMS & OPERATING ENTITY
                ═══════════════════════════════════════════════════════ */}
            <section id="acceptance" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <Scale className="w-4 h-4" />
                <span>Section 01</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                1. Acceptance of Terms & Operating Entity
              </h2>
              <div className="space-y-3.5 text-sm leading-relaxed text-text-secondary">
                <p>
                  Welcome to the Zeitnah Learning Management System (&ldquo;Zeitnah LMS&rdquo;), hosted at{" "}
                  <a href="https://zeitnahacademy.com" className="text-brand-mint hover:underline font-mono">
                    https://zeitnahacademy.com
                  </a>{" "}
                  and delivered via our associated mobile applications (including the official iOS application, bundle identifier:{" "}
                  <code className="font-mono text-text-primary">com.zeitnahacademy.app</code>).
                </p>
                <p>
                  These Terms of Service are entered into by and between you and <strong className="text-white">ZEITNAH INSTITUTE OF SURVEY LLP</strong>,
                  a Limited Liability Partnership registered and operating under the laws of India, having its principal place of business at:
                </p>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs font-mono text-white/90 space-y-1">
                  <p className="font-bold text-brand-mint">ZEITNAH INSTITUTE OF SURVEY LLP</p>
                  <p>1st Floor, 34/1412, Babil Complex, Kovilakam Road</p>
                  <p>Mankavu, Kozhikode, Kerala 673007, India</p>
                  <p className="text-text-faint text-[11px] pt-1">Official Website: https://zeitnahacademy.com</p>
                </div>
                <p>
                  By registering an account, accessing course modules, streaming recorded lectures, contributing to peer discussions, or otherwise utilizing any services provided on the platform, you acknowledge that you have read, understood, and agree to be bound by these Terms and our incorporated{" "}
                  <Link to="/privacy-policy" className="text-brand-mint hover:underline font-semibold">
                    Privacy Policy
                  </Link>. If you do not agree to these Terms, you must immediately discontinue use of the platform.
                </p>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 2: ACCOUNT REGISTRATION, OTP & SECURITY
                ═══════════════════════════════════════════════════════ */}
            <section id="account-registration" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <KeyRound className="w-4 h-4" />
                <span>Section 02</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                2. Account Registration, OTP & Security
              </h2>
              <div className="space-y-3.5 text-sm leading-relaxed text-text-secondary">
                <p>
                  <strong className="text-white">Passwordless Authentication:</strong> To enhance account security and prevent brute-force attacks, Zeitnah LMS utilizes a passwordless email verification architecture. Login and registration requests issue a time-sensitive One-Time Password (OTP) dispatched from our verified transactional relay (<code className="font-mono text-brand-mint">noreply@zeitnahacademy.com</code>). You are responsible for ensuring your registered email address remains secure.
                </p>
                <p>
                  <strong className="text-white">Single-User License:</strong> Accounts are issued on a strictly personal, non-transferable, single-user basis. You may not sell, lease, share, assign, or sublicense your account credentials or enrolled course access to any third party.
                </p>
                <p>
                  <strong className="text-white">Active Device Limits:</strong> To protect licensed curricula and institutional assets, the platform monitors active device sessions. You may inspect and revoke authorizations for obsolete devices at any time by navigating to <strong className="text-white">Profile &gt; Account &gt; Sessions</strong>. Simultaneous logins exceeding established safety thresholds may trigger automated session invalidation.
                </p>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 3: EDUCATIONAL SERVICES & ATTENDANCE
                ═══════════════════════════════════════════════════════ */}
            <section id="educational-services" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <Layers className="w-4 h-4" />
                <span>Section 03</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                3. Educational Services, Curriculum & Attendance
              </h2>
              <div className="space-y-3.5 text-sm leading-relaxed text-text-secondary">
                <p>
                  Zeitnah LMS provides professional survey engineering, geomatics, industrial design, and technical workforce curricula. We grant you a limited, non-exclusive, revocable, non-transferable license to access enrolled educational content solely for your personal academic and skill development.
                </p>
                <p>
                  <strong className="text-white">Class Progress & Attendance:</strong> The platform programmatically measures curriculum consumption, including playback timestamps, completed chapters, interactive attendance markers, and weekly learning streaks. Verified attendance metrics and completion criteria are prerequisites for institutional certificates of completion.
                </p>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 4: PROPRIETARY RIGHTS, DRM & FORENSIC WATERMARKING
                ═══════════════════════════════════════════════════════ */}
            <section id="intellectual-property" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <Lock className="w-4 h-4" />
                <span>Section 04</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                4. Proprietary Rights, DRM & Forensic Watermarking
              </h2>
              <div className="space-y-3.5 text-sm leading-relaxed text-text-secondary">
                <p>
                  All course recordings, instructional videos, lecture notes, diagrams, blueprints, software demonstrations, quizzes, and brand trademarks are the exclusive intellectual property of <strong className="text-white">ZEITNAH INSTITUTE OF SURVEY LLP</strong> or our contributing instructors.
                </p>
                <div className="rounded-xl border border-brand-mint/20 bg-brand-mint/[0.04] p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-brand-mint">
                    <Video className="w-4 h-4 shrink-0" />
                    <span>Digital Rights Management (DRM) & Anti-Piracy Protection</span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Class videos are delivered via VdoCipher encrypted streaming and secure Amazon Web Services (AWS S3) infrastructure. Downloading, saving, capturing, screen-recording, rebroadcasting, scraping, or decrypting lecture streams is strictly prohibited under Indian and international copyright law.
                  </p>
                </div>
                <p>
                  <strong className="text-white">Forensic Dynamic Watermark:</strong> You expressly acknowledge and consent that during video playback, our player renders a subtle, dynamic forensic watermark displaying your full name, registered email address, device identifier, and the current timestamp across the video canvas. This forensic marker operates as a tamper-evident mechanism to trace unauthorized screen captures.
                </p>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 5: ACCEPTABLE USE & PROHIBITED CONDUCT
                ═══════════════════════════════════════════════════════ */}
            <section id="user-conduct" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <AlertCircle className="w-4 h-4" />
                <span>Section 05</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                5. Acceptable Use & Prohibited Conduct
              </h2>
              <div className="space-y-3.5 text-sm leading-relaxed text-text-secondary">
                <p>When utilizing Zeitnah LMS, you agree not to engage in any of the following prohibited activities:</p>
                <ul className="space-y-2 text-xs text-text-muted list-disc list-inside">
                  <li>Attempting to probe, scan, or breach the vulnerability of any Zeitnah system, network, or authentication layer;</li>
                  <li>Using automated bots, crawlers, spiders, or scrapers to extract student profiles, course catalogs, or discussion feeds;</li>
                  <li>Sharing, publishing, or broadcasting login verification OTP codes or active authentication tokens;</li>
                  <li>Uploading malicious code, trojans, worms, or disruptive scripts through profile fields, project submissions, or direct messages;</li>
                  <li>Harassing, threatening, defaming, or impersonating instructors, fellow students, or platform administrators;</li>
                  <li>Posting unsolicited commercial promotions, pyramid schemes, or unverified job recruitments outside authorized partner workflows.</li>
                </ul>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 6: ADMISSIONS, COURSE FEES & ENQUIRIES
                ═══════════════════════════════════════════════════════ */}
            <section id="admissions-fees" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <FileText className="w-4 h-4" />
                <span>Section 06</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                6. Admissions, Course Fees & Enquiry Policy
              </h2>
              <div className="space-y-3.5 text-sm leading-relaxed text-text-secondary">
                <p>
                  Course admissions, enrollment clearances, and tuition schedules are coordinated through Zeitnah&apos;s institutional admissions department. Submitting an enquiry through the platform registers your interest for an upcoming academic cohort.
                </p>
                <p>
                  Tuition invoices, fee receipts, and payment schedules are issued formally by ZEITNAH INSTITUTE OF SURVEY LLP in accordance with Indian taxation standards (GST). We do not store raw credit card credentials on platform web servers.
                </p>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 7: USER CONTRIBUTIONS & COMMUNITY MESSAGING
                ═══════════════════════════════════════════════════════ */}
            <section id="user-contributions" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <Layers className="w-4 h-4" />
                <span>Section 07</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                7. Portfolios, Resumes & Community Messaging
              </h2>
              <div className="space-y-3.5 text-sm leading-relaxed text-text-secondary">
                <p>
                  You retain ownership of any original works, portfolio artifacts, survey diagrams, and resumes that you upload to your student profile. By submitting content to public community sections (such as discussion rooms or shared project feeds), you grant Zeitnah a non-exclusive, worldwide, royalty-free license to host, display, and format your contributions for platform educational operations.
                </p>
                <p>
                  Direct messaging is provided solely for academic collaboration, peer networking, and authorized mentorship. Zeitnah reserves the right to review reported conversations for violations of safety or community policies.
                </p>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 8: THIRD-PARTY INFRASTRUCTURE
                ═══════════════════════════════════════════════════════ */}
            <section id="third-party-services" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <Building2 className="w-4 h-4" />
                <span>Section 08</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                8. Third-Party Infrastructure & Technical Limitations
              </h2>
              <div className="space-y-3.5 text-sm leading-relaxed text-text-secondary">
                <p>
                  Zeitnah LMS relies on industry-standard infrastructure vendors, including Amazon Web Services (AWS) for cloud storage, VdoCipher for encrypted video streaming, Resend for transactional OTP delivery, and Apple Push Notification service (APNs) for mobile alerts.
                </p>
                <p>
                  While we maintain 99.9% target system availability, we are not liable for temporary service interruptions caused by internet transit congestion, third-party cloud outages, scheduled maintenance windows, or local client browser incompatibilities.
                </p>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 9: DISCLAIMERS OF WARRANTIES
                ═══════════════════════════════════════════════════════ */}
            <section id="disclaimers" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <AlertCircle className="w-4 h-4" />
                <span>Section 09</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                9. Disclaimers of Warranties & Educational Outcomes
              </h2>
              <div className="space-y-3.5 text-sm leading-relaxed text-text-secondary">
                <p>
                  The platform, courses, career intelligence tools, and instructional materials are provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind, either express or implied.
                </p>
                <p>
                  While Zeitnah curricula are designed to cultivate high-demand engineering proficiencies, completion of a course or program does not guarantee employment, licensure, or specific salary outcomes. Career opportunities depend on individual effort, interview merit, and external employer hiring standards.
                </p>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 10: LIMITATION OF LIABILITY
                ═══════════════════════════════════════════════════════ */}
            <section id="limitation-liability" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <Scale className="w-4 h-4" />
                <span>Section 10</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                10. Limitation of Liability & Indemnification
              </h2>
              <div className="space-y-3.5 text-sm leading-relaxed text-text-secondary">
                <p>
                  To the maximum extent permitted by applicable law, in no event shall ZEITNAH INSTITUTE OF SURVEY LLP, its partners, designated partners, officers, employees, or instructors be liable for any indirect, punitive, incidental, special, or consequential damages arising out of your access to or inability to use the platform.
                </p>
                <p>
                  You agree to defend, indemnify, and hold harmless ZEITNAH INSTITUTE OF SURVEY LLP from and against any third-party claims, liabilities, damages, and expenses (including reasonable legal fees) resulting from your violation of these Terms or unauthorized redistribution of course materials.
                </p>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 11: SUSPENSION, TERMINATION & ACCOUNT DELETION
                ═══════════════════════════════════════════════════════ */}
            <section id="termination" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <Trash2 className="w-4 h-4" />
                <span>Section 11</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                11. Suspension, Termination & Apple Guideline 5.1.1(v) Deletion
              </h2>
              <div className="space-y-3.5 text-sm leading-relaxed text-text-secondary">
                <p>
                  <strong className="text-white">Suspension by Zeitnah:</strong> We reserve the right to suspend or terminate your account immediately if you breach these Terms, record or distribute DRM-protected lectures, or engage in malicious platform behavior.
                </p>
                <div className="rounded-xl border border-white/[0.08] bg-[#0A0F1A] p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-rose-400">
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <span>Voluntary Account Deletion (Apple App Store Guideline 5.1.1(v))</span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    You have the unreserved right to permanently delete your account and associated personal data at any time without fees or delays:
                  </p>
                  <ul className="space-y-1.5 text-xs text-text-muted list-disc list-inside pt-1">
                    <li><strong className="text-white">In-App Pathway:</strong> Navigate to <code className="font-mono text-brand-mint">Profile &gt; Account &gt; Security</code> and select &ldquo;Delete Account&rdquo;.</li>
                    <li><strong className="text-white">Email Pathway:</strong> Send a written deletion request from your registered email address to <code className="font-mono text-brand-mint">[Placeholder: support@zeitnahacademy.com]</code> with the subject &ldquo;Account Deletion Request&rdquo;.</li>
                  </ul>
                  <p className="text-[11px] text-text-faint pt-1">
                    Upon account deletion, all active authentication sessions, profile portfolios, and cached tokens will be purged in accordance with our Privacy Policy.
                  </p>
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 12: GOVERNING LAW & JURISDICTION
                ═══════════════════════════════════════════════════════ */}
            <section id="governing-law" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <Scale className="w-4 h-4" />
                <span>Section 12</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                12. Governing Law & Exclusive Jurisdiction
              </h2>
              <div className="space-y-3.5 text-sm leading-relaxed text-text-secondary">
                <p>
                  These Terms, their interpretation, and any contractual or non-contractual disputes arising out of or in connection with the platform shall be governed by, construed, and enforced in accordance with the substantive laws of <strong className="text-white">India</strong>.
                </p>
                <p>
                  Any legal suit, action, arbitration, or proceeding arising out of or relating to these Terms or Zeitnah LMS shall be instituted exclusively in the competent courts located in <strong className="text-white">Kozhikode (Calicut), Kerala, India</strong>. Both parties irrevocably submit to the exclusive personal jurisdiction of such courts.
                </p>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 13: MODIFICATIONS & OFFICIAL CONTACT
                ═══════════════════════════════════════════════════════ */}
            <section id="modifications-contact" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <Mail className="w-4 h-4" />
                <span>Section 13</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                13. Modifications to Terms & Legal Notices
              </h2>
              <div className="space-y-3.5 text-sm leading-relaxed text-text-secondary">
                <p>
                  We may periodically revise these Terms to reflect technical enhancements, statutory amendments, or curriculum expansions. Substantial revisions will be announced via platform banners or email notices dispatched to registered users. The updated version date at the top of this document indicates when changes take effect.
                </p>

                <div className="rounded-2xl border border-white/[0.08] bg-[#0A0F1A]/90 p-5 space-y-3">
                  <span className="font-mono text-xs uppercase font-bold text-white tracking-wider block">
                    Official Legal Notice Address
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-text-faint font-mono uppercase text-[10px] block">Corporate Entity</span>
                      <strong className="text-white block">ZEITNAH INSTITUTE OF SURVEY LLP</strong>
                      <span className="text-text-muted block">Business Constitution: Limited Liability Partnership</span>
                    </div>
                    <div>
                      <span className="text-text-faint font-mono uppercase text-[10px] block">Principal Business Address</span>
                      <p className="text-white">
                        1st Floor, 34/1412, Babil Complex, Kovilakam Road, Mankavu, Kozhikode, Kerala 673007, India
                      </p>
                    </div>
                    <div>
                      <span className="text-text-faint font-mono uppercase text-[10px] block">Electronic Legal Communication</span>
                      <a href="mailto:support@zeitnahacademy.com" className="text-brand-mint hover:underline font-mono">
                        [Placeholder: support@zeitnahacademy.com]
                      </a>
                    </div>
                    <div>
                      <span className="text-text-faint font-mono uppercase text-[10px] block">Support & Help Desk</span>
                      <Link to="/support" className="text-brand-yellow hover:underline font-semibold flex items-center gap-1">
                        <span>Visit Support Portal</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
