import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ShieldCheck,
  Shield,
  Lock,
  Eye,
  Server,
  Bell,
  Trash2,
  FileText,
  Mail,
  ExternalLink,
  ChevronRight,
  ArrowUp,
  AlertCircle,
  CheckCircle2,
  Database,
  Smartphone,
  Video,
  Globe2,
  Sparkles,
  HelpCircle,
  Copy,
  Check,
  Printer,
} from "lucide-react";
import BRAND from "../../constants/brand";
import ZeitnahZMotif from "../../components/courses/ZeitnahZMotif";

/**
 * ZEITNAH LMS — OFFICIAL PRODUCTION PRIVACY POLICY
 * Route: /privacy-policy
 * Canonical: https://zeitnahacademy.com/privacy-policy
 *
 * Designed for full compliance with:
 * - Apple App Store Review Guidelines (Guideline 5.1.1 - Data Collection and Storage & 5.1.1(v) Account Deletion)
 * - Transparent disclosure of verified third-party integrations (AWS S3, VdoCipher DRM, Resend, Upstash Redis, Apple APNs)
 * - Forensic dynamic watermarking and educational DRM disclosures
 * - High-accessibility editorial layout with interactive table of contents, working anchor links, and print stylesheets
 */

const SECTIONS = [
  { id: "introduction", title: "1. Introduction & Scope", icon: Globe2 },
  { id: "information-collected", title: "2. Information We Collect", icon: Database },
  { id: "how-we-use-information", title: "3. How We Use Information", icon: Eye },
  { id: "cookies-analytics", title: "4. Cookies, Analytics & Local Storage", icon: FileText },
  { id: "educational-content-drm", title: "5. Educational Content, Video Playback & Watermarking", icon: Video },
  { id: "notifications-communications", title: "6. Notifications & Communications", icon: Bell },
  { id: "third-party-service-providers", title: "7. Third-Party Service Providers", icon: Server },
  { id: "information-sharing", title: "8. How Information Is Shared", icon: ShieldCheck },
  { id: "data-storage-security", title: "9. Data Storage, Security & Retention", icon: Lock },
  { id: "user-rights-account-deletion", title: "10. User Rights & Account/Data Deletion (Apple Guidelines)", icon: Trash2 },
  { id: "children-privacy", title: "11. Children's Privacy & Age Protections", icon: Shield },
  { id: "international-transfers", title: "12. International Data Transfers", icon: Globe2 },
  { id: "changes-to-policy", title: "13. Changes to this Policy", icon: Sparkles },
  { id: "contact-information", title: "14. Contact Information & Privacy Requests", icon: Mail },
];

export default function PrivacyPolicyPage() {
  const shouldReduceMotion = useReducedMotion();
  const [activeSection, setActiveSection] = useState("introduction");
  const [copiedLink, setCopiedLink] = useState(false);
  const [isTocMobileOpen, setIsTocMobileOpen] = useState(false);

  // Dynamic SEO & Metadata management
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Privacy Policy — Zeitnah LMS";

    // Set meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc ? metaDesc.getAttribute("content") : "";
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Official Privacy Policy for Zeitnah LMS and Zeitnah iOS mobile application. Learn how we handle account data, video playback, security, and data deletion requests."
      );
    }

    // Set canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    const prevCanonical = canonicalLink ? canonicalLink.getAttribute("href") : "";
    if (canonicalLink) {
      canonicalLink.setAttribute("href", "https://zeitnahacademy.com/privacy-policy");
    }

    return () => {
      document.title = prevTitle;
      if (metaDesc && prevDesc) metaDesc.setAttribute("content", prevDesc);
      if (canonicalLink && prevCanonical) canonicalLink.setAttribute("href", prevCanonical);
    };
  }, []);

  // Intersection Observer for active TOC highlighting
  useEffect(() => {
    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -70% 0px",
      threshold: 0,
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText("https://zeitnahacademy.com/privacy-policy");
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen text-white font-body antialiased relative selection:bg-brand-mint/30 selection:text-white pb-20">
      
      {/* ── AMBIENT BACKGROUND ATMOSPHERE ── */}
      <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-[650px] h-[650px] rounded-full bg-brand-mint/[0.04] blur-[150px]" />
        <div className="absolute top-[40%] right-[-100px] w-[550px] h-[550px] rounded-full bg-[#12314C]/25 blur-[160px]" />
        <div className="absolute bottom-10 left-10 w-[500px] h-[500px] rounded-full bg-brand-yellow/[0.02] blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-8 sm:space-y-12">
        
        {/* ══════════════════════════════════════════════════════════
            01. HERO / EDITORIAL HEADER
            ══════════════════════════════════════════════════════════ */}
        <header className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#0E1726]/95 via-[#0A0F1A]/95 to-[#070B14]/95 p-6 sm:p-10 lg:p-12 shadow-2xl">
          {/* Subtle top accent line */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-mint/40 to-transparent pointer-events-none" />

          {/* Decorative motif */}
          <div className="pointer-events-none absolute -right-16 -bottom-16 w-80 h-80 opacity-10 select-none hidden md:block" aria-hidden="true">
            <ZeitnahZMotif
              variant="gradient"
              animated={!shouldReduceMotion}
              glow={false}
              breathing={true}
              className="w-full h-full rotate-12"
            />
          </div>

          <div className="relative z-10 max-w-3xl space-y-5">
            {/* Badges strip */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider text-brand-mint bg-brand-mint/10 border border-brand-mint/25 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-mint" />
                Official Legal Documentation
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold uppercase tracking-wider text-white/70 bg-white/[0.04] border border-white/10">
                <Smartphone className="w-3 h-3 text-brand-mint" />
                Web & iOS Application
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black tracking-tight text-white">
                Privacy Policy
              </h1>
              <p className="text-sm sm:text-base text-text-secondary leading-relaxed max-w-2xl">
                This Privacy Policy describes how <strong className="text-white">{BRAND.name}</strong> (&ldquo;Zeitnah&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collects, uses, protects, and discloses your personal information when you access or use the Zeitnah Learning Management System (LMS), our official website at <a href="https://zeitnahacademy.com" className="text-brand-mint hover:underline">zeitnahacademy.com</a>, and the Zeitnah mobile application (including our iOS app registered under identifier <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-white/[0.06] text-white">com.zeitnahacademy.app</code>).
              </p>
            </div>

            {/* Publication Metadata & Action Pill Bar */}
            <div className="pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-text-muted">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-text-faint block">Last Updated</span>
                  <span className="font-mono text-white font-medium">October 16, 2026</span>
                </div>
                <div className="hidden sm:block w-px h-6 bg-white/[0.08]" aria-hidden="true" />
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-text-faint block">Effective Date</span>
                  <span className="font-mono text-white font-medium">October 16, 2026</span>
                </div>
                <div className="hidden sm:block w-px h-6 bg-white/[0.08]" aria-hidden="true" />
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-text-faint block">Status</span>
                  <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Published & Active
                  </span>
                </div>
              </div>

              {/* Utility buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  aria-label="Copy policy URL"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-text-secondary hover:text-white transition-all cursor-pointer text-xs"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-brand-mint" />
                      <span className="text-brand-mint font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  aria-label="Print policy document"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-text-secondary hover:text-white transition-all cursor-pointer text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print / Save PDF</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════════
            02. CORE AT-A-GLANCE SUMMARY CARDS
            ══════════════════════════════════════════════════════════ */}
        <section aria-label="Privacy Highlights" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0A0F1A]/70 p-4.5 space-y-2 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-heading font-bold text-white">No Ad Tracking</h2>
            <p className="text-xs text-text-muted leading-relaxed">
              We do not track you across other apps or websites, and we never sell your personal data to data brokers or advertising networks.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#0A0F1A]/70 p-4.5 space-y-2 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-heading font-bold text-white">Account Deletion</h2>
            <p className="text-xs text-text-muted leading-relaxed">
              In accordance with Apple App Store rules, you can initiate complete account and personal data deletion directly via in-app settings or email.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#0A0F1A]/70 p-4.5 space-y-2 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Video className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-heading font-bold text-white">Forensic Watermarking</h2>
            <p className="text-xs text-text-muted leading-relaxed">
              Class video streams display a dynamic watermark with your identifier to safeguard instructors&apos; intellectual property against piracy.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#0A0F1A]/70 p-4.5 space-y-2 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-xl bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center text-brand-yellow">
              <Lock className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-heading font-bold text-white">Granular Visibility</h2>
            <p className="text-xs text-text-muted leading-relaxed">
              You decide who sees your portfolio, resume, certifications, and career preferences (Public, Network Connections, Recruiters, or Private).
            </p>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            03. MAIN BODY WITH TWO-COLUMN EDITORIAL LAYOUT
            Left/Right: Sticky Table of Contents
            Center: Semantic Article Content
            ══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* ── STICKY TABLE OF CONTENTS (Desktop) ── */}
          <aside className="lg:col-span-4 sticky top-24 hidden lg:block">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0A0F1A]/90 backdrop-blur-xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-brand-mint" />
                  Contents Table
                </span>
                <span className="text-[10px] font-mono text-text-faint">14 Sections</span>
              </div>

              <nav aria-label="Table of Contents" className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                {SECTIONS.map((sec) => {
                  const isActive = activeSection === sec.id;
                  const Icon = sec.icon;
                  return (
                    <a
                      key={sec.id}
                      href={`#${sec.id}`}
                      className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all duration-150 ${
                        isActive
                          ? "bg-brand-mint/15 text-brand-mint font-semibold border border-brand-mint/25 shadow-sm"
                          : "text-text-muted hover:text-white hover:bg-white/[0.03]"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 transition-colors ${isActive ? "text-brand-mint" : "text-text-faint group-hover:text-white/70"}`} />
                      <span className="truncate">{sec.title}</span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0 text-brand-mint" />}
                    </a>
                  );
                })}
              </nav>

              <div className="pt-3 border-t border-white/[0.06] space-y-2">
                <a
                  href="#contact-information"
                  className="w-full zn-btn-secondary text-xs py-2 px-3 text-center block font-semibold"
                >
                  Contact Privacy Team
                </a>
              </div>
            </div>
          </aside>

          {/* ── MOBILE COLLAPSIBLE TABLE OF CONTENTS ── */}
          <div className="lg:hidden col-span-1">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0A0F1A]/90 p-4 space-y-3">
              <button
                type="button"
                onClick={() => setIsTocMobileOpen(!isTocMobileOpen)}
                className="w-full flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-text-secondary cursor-pointer"
                aria-expanded={isTocMobileOpen}
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-mint" />
                  Jump to Section ({SECTIONS.find((s) => s.id === activeSection)?.title || "Table of Contents"})
                </span>
                <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isTocMobileOpen ? "rotate-90" : ""}`} />
              </button>

              {isTocMobileOpen && (
                <nav className="pt-3 border-t border-white/[0.06] space-y-1 max-h-72 overflow-y-auto">
                  {SECTIONS.map((sec) => (
                    <a
                      key={sec.id}
                      href={`#${sec.id}`}
                      onClick={() => setIsTocMobileOpen(false)}
                      className={`block px-3 py-2 rounded-lg text-xs ${
                        activeSection === sec.id
                          ? "bg-brand-mint/15 text-brand-mint font-semibold"
                          : "text-text-muted hover:text-white"
                      }`}
                    >
                      {sec.title}
                    </a>
                  ))}
                </nav>
              )}
            </div>
          </div>

          {/* ── SEMANTIC POLICY ARTICLE CONTENT (Desktop 8 cols) ── */}
          <article className="lg:col-span-8 space-y-12 sm:space-y-16 text-sm text-text-secondary leading-relaxed">
            
            {/* ═══════════════════════════════════════════════════════
                SECTION 1: INTRODUCTION & SCOPE
                ═══════════════════════════════════════════════════════ */}
            <section id="introduction" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <Globe2 className="w-4 h-4" />
                <span>Section 01</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                1. Introduction and Scope
              </h2>
              <div className="space-y-3 text-text-muted">
                <p>
                  Welcome to <strong className="text-white">{BRAND.name}</strong> (&ldquo;Zeitnah&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). Zeitnah operates an advanced technical learning management system (LMS), professional civil engineering community, and career discovery ecosystem designed to empower engineers, architects, educators, and organizations.
                </p>
                <p>
                  This Privacy Policy applies to personal information gathered through:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 marker:text-brand-mint">
                  <li>Our primary web application and website accessible at <a href="https://zeitnahacademy.com" className="text-white hover:underline font-mono">https://zeitnahacademy.com</a>;</li>
                  <li>Our native mobile applications, specifically including the official iOS application registered with Apple App Store Bundle ID <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-white/[0.06] text-white">com.zeitnahacademy.app</code>;</li>
                  <li>Our backend application programming interfaces (APIs), authentication portals, and real-time streaming infrastructure;</li>
                  <li>Direct messages, interactive learning spaces, discussion forums, and community channels hosted on the platform.</li>
                </ul>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-2 mt-4 text-xs">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <AlertCircle className="w-4 h-4 text-brand-yellow shrink-0" />
                    <span>Entity Registration & Notice</span>
                  </div>
                  <p className="text-text-muted leading-relaxed">
                    Operating Organization: <strong className="text-white">{BRAND.name} / Zeitnah LMS</strong>. Registered Legal Entity: <strong className="text-white">ZEITNAH INSTITUTE OF SURVEY LLP</strong> (Business Constitution: Limited Liability Partnership). Principal Business Address: <span className="text-white">1st Floor, 34/1412, Babil Complex, Kovilakam Road, Mankavu, Kozhikode, Kerala 673007, India</span>.
                  </p>
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 2: INFORMATION WE COLLECT
                ═══════════════════════════════════════════════════════ */}
            <section id="information-collected" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <Database className="w-4 h-4" />
                <span>Section 02</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                2. Information We Collect
              </h2>
              <p className="text-text-muted">
                We collect information directly from you when you interact with our platform, automatically as you navigate our apps, and through authorized integrations. We do not collect personal information that is not connected to legitimate educational, credentialing, or networking functionality.
              </p>

              <div className="space-y-4 pt-2">
                
                {/* 2.1 Account and Registration */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-2">
                  <h3 className="text-base font-heading font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-mint" />
                    2.1 Account and Registration Information
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    When you sign up or authenticate with Zeitnah, we collect:
                  </p>
                  <ul className="list-disc pl-5 text-xs text-text-muted space-y-1">
                    <li><strong className="text-white">Email Address:</strong> Your primary communication identifier used for passwordless OTP authentication, session recovery, and important service updates.</li>
                    <li><strong className="text-white">Full Name & Chosen Username:</strong> Your preferred public or internal name and unique identifier handle (e.g., <code className="font-mono text-text-secondary">@engineer</code>).</li>
                    <li><strong className="text-white">Account Persona & Role:</strong> Your platform designation, such as Student, Professional, Educator, Recruiter, or Founder.</li>
                    <li><strong className="text-white">Authentication Artifacts:</strong> Cryptographic password hashes (where passwords are configured), temporary one-time password (OTP) validity timestamps, and short-lived JSON Web Tokens (JWTs).</li>
                  </ul>
                </div>

                {/* 2.2 Profile & Professional Identity */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-2">
                  <h3 className="text-base font-heading font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-mint" />
                    2.2 Profile and Professional Identity
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Users may voluntarily enrich their profile to participate in networking and career discovery:
                  </p>
                  <ul className="list-disc pl-5 text-xs text-text-muted space-y-1">
                    <li>Profile avatar and background banner image URLs;</li>
                    <li>Professional headline, current job title, department taxonomy, and bio;</li>
                    <li>Infrastructure disciplines (e.g., Structural Engineering, Transportation, Geotechnical), industry sectors, and years of experience;</li>
                    <li>Structured skills taxonomy (technical skills, software proficiencies, industry capabilities);</li>
                    <li>Work history, educational qualifications, licenses, and verified certifications;</li>
                    <li>Career preferences (preferred work modes, employment types, geographic locations, and target salary ranges).</li>
                  </ul>
                </div>

                {/* 2.3 Verification Documents */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-2">
                  <h3 className="text-base font-heading font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-mint" />
                    2.3 Verification Records and Identity Documents (Verification Center)
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    To maintain institutional trust and verify professional credentials, users may voluntarily submit documents through the Verification Center:
                  </p>
                  <ul className="list-disc pl-5 text-xs text-text-muted space-y-1">
                    <li>Identity verification documents (e.g., Passport, National ID, or Driver&apos;s License);</li>
                    <li>Professional licensing credentials (e.g., Council of Engineers registration, Chartered Engineer certificates);</li>
                    <li>Institutional or corporate affiliation proof (e.g., employment verification letter, corporate email);</li>
                    <li>Software and industry vendor diplomas (e.g., Oracle Primavera P6, Autodesk BIM).</li>
                  </ul>
                  <p className="text-xs text-text-faint italic pt-1">
                    Notice: Submitted verification documents are stored securely with restricted administrative access and are solely utilized to confirm authenticity before awarding verification badges.
                  </p>
                </div>

                {/* 2.4 Learning Activity & Progress */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-2">
                  <h3 className="text-base font-heading font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-mint" />
                    2.4 Learning Activity, Video Playback & Attendance
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    As an educational LMS, we record your interaction with learning materials:
                  </p>
                  <ul className="list-disc pl-5 text-xs text-text-muted space-y-1">
                    <li>Courses enrolled in, batch assignments, and course completion status;</li>
                    <li>Granular class progress, including start times, last watched timestamps, seconds watched, covered duration, and completion milestones;</li>
                    <li>Learning streaks, activity dates, gamification points, level progression, and leaderboard positions;</li>
                    <li>Certificate issuance records and course completion eligibility.</li>
                  </ul>
                </div>

                {/* 2.5 Uploaded Content & Communications */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-2">
                  <h3 className="text-base font-heading font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-mint" />
                    2.5 Uploaded Content and Community Communications
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    We process and store files and messages you actively publish:
                  </p>
                  <ul className="list-disc pl-5 text-xs text-text-muted space-y-1">
                    <li>Portfolio files, resumes (PDF/DOCX), project media, architectural drawings, and demonstrations;</li>
                    <li>Community posts, short-form reels, stories, comments, discussion board topics, and reactions;</li>
                    <li>One-to-one direct messages, group chats, message attachments, and read receipt timestamps.</li>
                  </ul>
                </div>

                {/* 2.6 Device & Diagnostic Information */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-2">
                  <h3 className="text-base font-heading font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-mint" />
                    2.6 Device, Diagnostic and Telemetry Information
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    To authenticate sessions, prevent multi-device account sharing, enforce DRM protection, and monitor service stability, our systems collect technical diagnostics:
                  </p>
                  <ul className="list-disc pl-5 text-xs text-text-muted space-y-1">
                    <li><strong className="text-white">Device Identifiers:</strong> A pseudonymous device identifier (<code className="font-mono text-text-secondary">dev_...</code>) generated from browser or application environment properties, stored in local storage or native secure preferences.</li>
                    <li><strong className="text-white">Hardware & Software Environment:</strong> Device model, operating system (e.g., iOS, macOS, Android, Windows) and version, browser engine and version, screen resolution, and language settings.</li>
                    <li><strong className="text-white">Network & Connection:</strong> IP address, approximate geographic location deduced from IP, connection type, and access timestamps.</li>
                    <li><strong className="text-white">Application Diagnostics:</strong> Crash logs, network latency metrics, client-side error telemetry, and Core Web Vitals (CLS, FCP, LCP, TTFB, INP). Sensitive parameters (passwords, tokens, OTP codes) are strictly scrubbed prior to error transmission.</li>
                    <li><strong className="text-white">Push Tokens:</strong> Device tokens assigned by Apple Push Notification service (APNs) on iOS devices or Firebase Cloud Messaging (FCM) on Android, used solely to route incoming messages and notifications to your device.</li>
                  </ul>
                </div>

                {/* 2.7 Transaction Information */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-2">
                  <h3 className="text-base font-heading font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-mint" />
                    2.7 Course Enquiries and Transaction Records
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    When you submit a course enquiry or request institutional enrollment, we record the course of interest, your contact phone number, and any custom message submitted. Course fees and access permissions are managed directly by Zeitnah admissions.
                  </p>
                  <p className="text-xs text-text-muted leading-relaxed">
                    <strong className="text-white">Payment Processing Statement:</strong> If online payment processing is enabled for specific offerings, payments will be handled exclusively by PCI-DSS certified payment processors. Zeitnah servers do not store or process raw credit card numbers or banking secrets.
                  </p>
                </div>

              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 3: HOW WE USE INFORMATION
                ═══════════════════════════════════════════════════════ */}
            <section id="how-we-use-information" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <Eye className="w-4 h-4" />
                <span>Section 03</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                3. How We Use Information
              </h2>
              <p className="text-text-muted">
                We process your personal information based on legitimate educational purposes, the performance of our contract with you, and your explicit consent:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs text-text-muted">
                <li><strong className="text-white">Delivering LMS Educational Services:</strong> Facilitating course enrollments, class video streaming, interactive coding or design exercises, and tracking curriculum progress.</li>
                <li><strong className="text-white">Account Authentication & Security:</strong> Generating and delivering one-time login codes, maintaining secure persistent sessions, authenticating API requests, and managing connected devices.</li>
                <li><strong className="text-white">Anti-Piracy & Content Protection:</strong> Enforcing digital rights management (DRM) and generating dynamic on-screen watermarks during video playback to prevent unauthorized capture and distribution.</li>
                <li><strong className="text-white">Professional Networking & Career Matching:</strong> Connecting learners with mentors, peers, and verified recruiters in the infrastructure and engineering sectors in accordance with your privacy settings.</li>
                <li><strong className="text-white">Verification & Trust:</strong> Reviewing submitted professional certifications and licenses to validate credentials and award verified trust badges.</li>
                <li><strong className="text-white">Platform Health & Telemetry:</strong> Debugging software errors, optimizing media delivery speed, and maintaining system availability.</li>
                <li><strong className="text-white">Communications:</strong> Sending account notices, service announcements, direct message alerts, and technical support responses.</li>
              </ul>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 4: COOKIES, ANALYTICS & LOCAL STORAGE
                ═══════════════════════════════════════════════════════ */}
            <section id="cookies-analytics" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <FileText className="w-4 h-4" />
                <span>Section 04</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                4. Cookies, Analytics & Local Storage
              </h2>
              <p className="text-text-muted">
                Zeitnah utilizes browser storage technologies (such as cookies, <code className="font-mono text-xs px-1 rounded bg-white/[0.06] text-white">localStorage</code>, and native app preferences) to operate smoothly. We provide an integrated Cookie Consent Banner allowing users to control non-essential categories.
              </p>

              <div className="overflow-x-auto rounded-xl border border-white/[0.08] mt-4">
                <table className="w-full text-left text-xs text-text-muted">
                  <thead className="bg-white/[0.03] text-white font-mono uppercase text-[11px] border-b border-white/[0.08]">
                    <tr>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Purpose & Examples</th>
                      <th className="p-3.5">Mandatory</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    <tr>
                      <td className="p-3.5 font-bold text-white">Strictly Necessary</td>
                      <td className="p-3.5">
                        Stores authentication access tokens (<code className="font-mono text-[11px] text-brand-mint">jwt_token</code>), session expiration timestamps, device identifiers for session authorization, and security nonces.
                      </td>
                      <td className="p-3.5 text-brand-mint font-semibold">Yes (Always Active)</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-white">Functional Preferences</td>
                      <td className="p-3.5">
                        Remembers your interface preferences, video player volume level, playback speed, and cookie consent choices (<code className="font-mono text-[11px] text-text-secondary">zeitnah_cookie_consent</code>).
                      </td>
                      <td className="p-3.5 text-text-secondary">Optional</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-white">Performance & Diagnostics</td>
                      <td className="p-3.5">
                        Measures video playback buffer health, stream stalls, rendering performance (Core Web Vitals), and client-side error telemetry.
                      </td>
                      <td className="p-3.5 text-text-secondary">Optional</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 text-xs space-y-1.5 mt-3">
                <div className="flex items-center gap-2 font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>No Cross-App or Cross-Site Advertising Tracking</span>
                </div>
                <p className="text-text-muted leading-relaxed">
                  Zeitnah does NOT embed third-party advertising trackers, Facebook Pixel, Google AdMob, or commercial retargeting cookies. We do not track your activity across third-party websites or services for behavioral advertising.
                </p>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 5: VIDEO PLAYBACK & WATERMARKING
                ═══════════════════════════════════════════════════════ */}
            <section id="educational-content-drm" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <Video className="w-4 h-4" />
                <span>Section 05</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                5. Educational Content, Video Playback & Watermarking
              </h2>
              <div className="space-y-3 text-text-muted">
                <p>
                  Zeitnah courses feature specialized engineering and civil design lectures, recorded classes, and instructional materials that represent protected intellectual property.
                </p>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3 text-xs">
                  <h3 className="text-sm font-heading font-bold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-brand-mint" />
                    DRM Video Streaming & Dynamic Forensic Watermark
                  </h3>
                  <p className="leading-relaxed">
                    To deliver secure playback and deter piracy:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li><strong className="text-white">Encrypted Delivery:</strong> Course video streams are delivered via digital rights management (DRM) technologies and encrypted HTTP Live Streaming (HLS) protocols powered by VdoCipher and Amazon Web Services (AWS S3).</li>
                    <li><strong className="text-white">Forensic Watermark:</strong> During playback, an unobtrusive, dynamic semi-transparent watermark moves across the video stage at periodic intervals. This watermark renders the authenticated viewer&apos;s name, email or user ID, system timestamp, and unique device identifier.</li>
                    <li><strong className="text-white">Purpose:</strong> The watermark serves strictly as a deterrent against unauthorized screen-recording, rebroadcasting, or piracy of copyrighted curriculum. Watermark data is rendered locally on your device during an active authenticated session.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 6: NOTIFICATIONS & COMMUNICATIONS
                ═══════════════════════════════════════════════════════ */}
            <section id="notifications-communications" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <Bell className="w-4 h-4" />
                <span>Section 06</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                6. Notifications and Communications
              </h2>
              <div className="space-y-3 text-text-muted text-xs">
                <p className="text-sm">
                  We communicate with you through transactional email, mobile push notifications, and in-app updates:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-2">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4 text-brand-mint" />
                      Transactional Email
                    </h3>
                    <p className="leading-relaxed">
                      Sent via the Resend API (from <code className="font-mono text-text-secondary">noreply@zeitnahacademy.com</code>) for login OTP codes, password resets, enrollment confirmations, and critical security notices. These operational emails cannot be opted out of while maintaining an active account.
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-2">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-brand-mint" />
                      Mobile Push Notifications (iOS APNs)
                    </h3>
                    <p className="leading-relaxed">
                      On iOS, push notifications are delivered through the Apple Push Notification service (APNs). Push alerts notify you of direct messages, class schedules, and connection requests. You can disable push notifications anytime in iOS Settings &gt; Notifications &gt; Zeitnah.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 7: THIRD-PARTY SERVICE PROVIDERS
                ═══════════════════════════════════════════════════════ */}
            <section id="third-party-service-providers" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <Server className="w-4 h-4" />
                <span>Section 07</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                7. Service Providers and Third-Party Integrations
              </h2>
              <p className="text-text-muted">
                We engage verified third-party technology providers to perform infrastructure and application functions on our behalf. These service providers process data strictly according to our instructions and under appropriate confidentiality obligations:
              </p>

              <div className="overflow-x-auto rounded-xl border border-white/[0.08] mt-4">
                <table className="w-full text-left text-xs text-text-muted">
                  <thead className="bg-white/[0.03] text-white font-mono uppercase text-[11px] border-b border-white/[0.08]">
                    <tr>
                      <th className="p-3.5">Provider & Service</th>
                      <th className="p-3.5">Role in Platform</th>
                      <th className="p-3.5">Data Processed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    <tr>
                      <td className="p-3.5 font-bold text-white">Amazon Web Services (AWS)</td>
                      <td className="p-3.5">Cloud object storage (S3 bucket: <code className="font-mono text-text-secondary">zeitnahacademy-production</code> in Asia Pacific Mumbai <code className="font-mono text-text-secondary">ap-south-1</code> region).</td>
                      <td className="p-3.5">Uploaded course media, lesson assets, portfolio files, and user documents.</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-white">VdoCipher</td>
                      <td className="p-3.5">DRM-protected video hosting, transcoding, and secure streaming.</td>
                      <td className="p-3.5">Video playback streaming tokens and watermark overlay viewer identifiers.</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-white">Resend</td>
                      <td className="p-3.5">Transactional email delivery infrastructure.</td>
                      <td className="p-3.5">Recipient email address, name, and transactional email content (e.g., OTP login codes).</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-white">Upstash (Redis)</td>
                      <td className="p-3.5">High-speed server-side caching and API rate limiting.</td>
                      <td className="p-3.5">IP addresses and session keys for abuse prevention.</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-white">Apple APNs</td>
                      <td className="p-3.5">Apple Push Notification service for iOS devices.</td>
                      <td className="p-3.5">Device push token and notification payload data.</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-white">Cloudinary</td>
                      <td className="p-3.5">Media optimization and profile image transformations.</td>
                      <td className="p-3.5">User avatar and public banner media files.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 8: HOW INFORMATION IS SHARED
                ═══════════════════════════════════════════════════════ */}
            <section id="information-sharing" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4" />
                <span>Section 08</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                8. How Information Is Shared
              </h2>
              <div className="space-y-3 text-text-muted text-xs">
                <p className="text-sm">
                  We believe in member sovereignty over personal data. Information is shared strictly under the following scenarios:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong className="text-white">Granular Profile Visibility:</strong> You control the visibility of your portfolio, career preferences, experience, and contact info via your profile settings (Options include: <code className="font-mono text-brand-mint">PUBLIC</code>, <code className="font-mono text-brand-mint">NETWORK</code>, <code className="font-mono text-brand-mint">VERIFIED_RECRUITERS</code>, or <code className="font-mono text-brand-mint">PRIVATE</code>).</li>
                  <li><strong className="text-white">With Verified Recruiters:</strong> If you explicitly enable recruiter discoverability (<code className="font-mono text-text-secondary">discoverableToRecruiters: true</code>), verified talent acquisition teams can discover your candidate profile and invite you to opportunities.</li>
                  <li><strong className="text-white">In Community Spaces:</strong> Posts, stories, discussion comments, and project highlights published to public community spaces are visible to other logged-in members.</li>
                  <li><strong className="text-white">Legal Obligations:</strong> We may disclose information if required to do so by applicable law, court summons, governmental order, or to protect the vital safety of individuals.</li>
                  <li><strong className="text-white">Zero Sale of Data:</strong> Zeitnah has never sold and will never sell personal information to commercial data brokers.</li>
                </ul>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 9: DATA STORAGE, SECURITY & RETENTION
                ═══════════════════════════════════════════════════════ */}
            <section id="data-storage-security" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <Lock className="w-4 h-4" />
                <span>Section 09</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                9. Data Storage, Security and Retention
              </h2>
              <div className="space-y-3 text-text-muted text-xs">
                <p className="text-sm">
                  We employ technical, physical, and administrative safeguards designed to protect personal data against accidental loss, unauthorized access, and alteration:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-1.5">
                    <h3 className="font-bold text-white text-sm">Encryption in Transit</h3>
                    <p>All web and API traffic is strictly enforced over HTTPS using modern Transport Layer Security (TLS 1.2+).</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-1.5">
                    <h3 className="font-bold text-white text-sm">Tokenized Authentication</h3>
                    <p>We utilize cryptographically signed JSON Web Tokens (JWTs) with automated session expiry and token rotation.</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-1.5">
                    <h3 className="font-bold text-white text-sm">Active Session Control</h3>
                    <p>Users can view all connected device sessions and revoke unauthorized devices instantly via Account &gt; Sessions.</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-1.5">
                    <h3 className="font-bold text-white text-sm">Geographic Storage Location</h3>
                    <p>Primary data stores and media buckets are hosted in secure AWS Asia Pacific (Mumbai) cloud facilities.</p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-2 mt-2">
                  <h3 className="font-bold text-white text-sm">Data Retention Timeline</h3>
                  <p className="leading-relaxed">
                    We retain your personal information for as long as your account remains active to provide continuous access to your educational courses, earned certificates, and community connections. 
                    <span className="block mt-1 text-brand-yellow font-mono">[Placeholder: Retention Period Confirmation — e.g., Upon account deletion request, user data is purged or irrevocably anonymized within 30 days, except where retention is legally mandated for accounting, tax, or legal dispute compliance.]</span>
                  </p>
                  <p className="text-text-faint italic pt-1">
                    Security Disclaimer: While we enforce modern security controls, no method of transmission over the Internet or electronic storage is completely impenetrable.
                  </p>
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 10: USER RIGHTS & ACCOUNT DELETION (APPLE)
                ═══════════════════════════════════════════════════════ */}
            <section id="user-rights-account-deletion" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <Trash2 className="w-4 h-4" />
                <span>Section 10</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                10. User Rights & Account/Data Deletion Requests
              </h2>
              <p className="text-text-muted">
                Regardless of your geographic location, Zeitnah honors fundamental privacy rights, including your right to access, rectify, export, and permanently erase your personal data.
              </p>

              {/* Apple Specific Account Deletion Box */}
              <div className="rounded-2xl border border-brand-mint/30 bg-gradient-to-r from-brand-mint/10 via-brand-mint/5 to-transparent p-6 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-brand-mint/20 border border-brand-mint/30 flex items-center justify-center text-brand-mint">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-heading font-bold text-white">
                      Apple App Store Guideline 5.1.1(v) — Complete Account Deletion
                    </h3>
                    <p className="text-xs text-text-muted">Direct mechanisms to delete your account and associated personal data</p>
                  </div>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed">
                  In compliance with Apple App Store Review Guidelines, any user who creates an account on Zeitnah has the right to easily initiate complete deletion of their account and all associated personal information.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                  <div className="rounded-xl border border-white/10 bg-[#070B14]/70 p-4 space-y-2">
                    <span className="font-mono text-[10px] uppercase font-bold text-brand-mint tracking-wider block">Option A: In-App Self-Service</span>
                    <ol className="list-decimal pl-4 space-y-1.5 text-text-muted">
                      <li>Log in to your Zeitnah account on the web or in the iOS app;</li>
                      <li>Navigate to <strong className="text-white">Profile &gt; Account &gt; Security</strong>;</li>
                      <li>Locate the <strong className="text-white">Account Deletion & Data Request</strong> section;</li>
                      <li>Confirm your request to deactivate and schedule your account data for permanent removal.</li>
                    </ol>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#070B14]/70 p-4 space-y-2">
                    <span className="font-mono text-[10px] uppercase font-bold text-brand-mint tracking-wider block">Option B: Direct Email Request</span>
                    <p className="text-text-muted leading-relaxed">
                      Send an email directly to our dedicated privacy contact at:
                    </p>
                    <div className="font-mono text-brand-mint bg-white/[0.05] p-2 rounded-lg text-center font-bold">
                      [Placeholder: privacy@zeitnahacademy.com]
                    </div>
                    <p className="text-[11px] text-text-faint">
                      Please send the request from the email address registered with your account using the subject line: <span className="text-white">&ldquo;Account Deletion Request&rdquo;</span>.
                    </p>
                  </div>
                </div>

                <div className="text-xs text-text-muted pt-2 border-t border-white/[0.08] space-y-1">
                  <p><strong className="text-white">What Happens When Your Account Is Deleted:</strong></p>
                  <ul className="list-disc pl-5 space-y-1 text-text-muted">
                    <li>Your profile, avatar, resume, and credentials are permanently purged or disassociated from your identity.</li>
                    <li>Active authentication tokens and connected device records are revoked immediately.</li>
                    <li>Your private messages and direct communications are rendered inaccessible.</li>
                    <li>Course completion and certificate records may be retained in anonymized form to uphold accreditation integrity.</li>
                  </ul>
                </div>
              </div>

              {/* Other Rights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 space-y-1">
                  <span className="font-bold text-white block">Right of Access</span>
                  <p className="text-text-muted">Request a copy of the personal data we maintain about you.</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 space-y-1">
                  <span className="font-bold text-white block">Right to Rectify</span>
                  <p className="text-text-muted">Update inaccurate profile, education, or contact details directly in-app.</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 space-y-1">
                  <span className="font-bold text-white block">Right to Restrict</span>
                  <p className="text-text-muted">Restrict recruiter visibility or revoke optional cookie consent anytime.</p>
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 11: CHILDREN'S PRIVACY
                ═══════════════════════════════════════════════════════ */}
            <section id="children-privacy" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <Shield className="w-4 h-4" />
                <span>Section 11</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                11. Children&apos;s Privacy and Age-Related Protections
              </h2>
              <div className="space-y-3 text-text-muted text-xs leading-relaxed">
                <p className="text-sm">
                  Zeitnah is designed and marketed exclusively for adult university students, engineering practitioners, educational professionals, and corporate organizations.
                </p>
                <p>
                  Our services are not intended for children under 13 years of age (or under 16/18 where specified by local data protection legislation). We do not knowingly solicit or collect personal information from minors. If we discover that a child under the relevant age of consent has provided us with personal information without verified parental or guardian consent, we take immediate administrative action to delete that information and terminate the account.
                </p>
                <p>
                  If you believe that a minor has submitted personal data to Zeitnah without proper authorization, please contact us immediately at <span className="font-mono text-brand-mint">[Placeholder: privacy@zeitnahacademy.com]</span>.
                </p>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 12: INTERNATIONAL TRANSFERS
                ═══════════════════════════════════════════════════════ */}
            <section id="international-transfers" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <Globe2 className="w-4 h-4" />
                <span>Section 12</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                12. International Data Transfers
              </h2>
              <div className="space-y-3 text-text-muted text-xs leading-relaxed">
                <p className="text-sm">
                  Zeitnah serves a global civil community. Your personal data may be transferred to, stored, and processed on servers located outside of your state, province, or country of residence, primarily within the Asia Pacific (Mumbai) cloud region hosted by Amazon Web Services.
                </p>
                <p>
                  Whenever we transfer personal information internationally, we take appropriate contractual and technical steps to ensure your data receives protection equivalent to the standards outlined in this policy and required by applicable international data transfer frameworks.
                </p>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 13: CHANGES TO THIS POLICY
                ═══════════════════════════════════════════════════════ */}
            <section id="changes-to-policy" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <Sparkles className="w-4 h-4" />
                <span>Section 13</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                13. Changes to this Policy
              </h2>
              <div className="space-y-3 text-text-muted text-xs leading-relaxed">
                <p className="text-sm">
                  We may periodically revise this Privacy Policy to reflect enhancements to our platform features, native mobile applications, regulatory updates, or changes in data practices.
                </p>
                <p>
                  When changes are made, we will update the &ldquo;Last Updated&rdquo; and &ldquo;Effective Date&rdquo; fields at the top of this page. For significant material revisions that impact your privacy rights, we will provide prominent notice through an in-app platform banner or by sending an advisory email to your registered email address prior to the change taking effect.
                </p>
                <p>
                  We encourage you to review this page periodically to stay informed about how we protect your personal information.
                </p>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 14: CONTACT INFORMATION & PRIVACY REQUESTS
                ═══════════════════════════════════════════════════════ */}
            <section id="contact-information" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <Mail className="w-4 h-4" />
                <span>Section 14</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                14. Contact Information and Privacy Requests
              </h2>
              <p className="text-text-muted">
                If you have questions, feedback, or wish to exercise your rights regarding this Privacy Policy or your personal data, please contact our privacy compliance team using the details below:
              </p>

              {/* Contact Card */}
              <div className="rounded-2xl border border-white/[0.1] bg-gradient-to-b from-[#0E1726] to-[#070B14] p-6 sm:p-8 space-y-6 shadow-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="space-y-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-text-faint block">Official Platform</span>
                    <span className="text-sm font-heading font-bold text-white block">{BRAND.name} / Zeitnah LMS</span>
                    <a href="https://zeitnahacademy.com" className="text-brand-mint hover:underline font-mono inline-flex items-center gap-1">
                      <span>https://zeitnahacademy.com</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="space-y-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-text-faint block">Dedicated Privacy Email</span>
                    <a
                      href="mailto:privacy@zeitnahacademy.com"
                      className="text-sm font-heading font-bold text-brand-mint hover:underline font-mono block"
                    >
                      [Placeholder: privacy@zeitnahacademy.com]
                    </a>
                    <span className="text-[11px] text-text-muted">Direct inbox for deletion, export, and compliance inquiries</span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-text-faint block">Registered Legal Entity</span>
                    <span className="font-bold text-white block">
                      ZEITNAH INSTITUTE OF SURVEY LLP
                    </span>
                    <span className="text-[11px] text-text-faint">Business Constitution: Limited Liability Partnership</span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-text-faint block">Postal & Registered Address</span>
                    <span className="text-white block">
                      1st Floor, 34/1412, Babil Complex, Kovilakam Road, Mankavu, Kozhikode, Kerala 673007, India
                    </span>
                    <span className="text-[11px] text-text-faint">Principal business address and legal notice destination</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-2 text-text-muted">
                    <HelpCircle className="w-4 h-4 text-brand-mint shrink-0" />
                    <span>Response timeframe: Privacy inquiries are acknowledged within 48 business hours.</span>
                  </div>

                  <a
                    href="mailto:privacy@zeitnahacademy.com?subject=Privacy%20Inquiry%20-%20Zeitnah%20LMS"
                    className="zn-btn-primary px-5 py-2.5 text-xs font-bold inline-flex items-center gap-2"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email Privacy Officer</span>
                  </a>
                </div>
              </div>

              {/* Legal Review Disclaimer */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-[11px] text-text-faint space-y-1">
                <p className="font-semibold text-text-muted">Notice to Platform Owner & Legal Counsel:</p>
                <p>
                  This Privacy Policy has been compiled based upon verified technological implementations within the Zeitnah LMS codebase (including AWS S3, VdoCipher DRM video playback, Upstash Redis, Resend email dispatch, and Apple APNs notifications). Before formal submission to Apple App Store Connect or promotional distribution, legal counsel should verify applicable local statutory notices (such as the Indian Digital Personal Data Protection Act 2023 or EU GDPR) and populate all bracketed <code className="font-mono text-brand-yellow">[Placeholder: ...]</code> items with exact corporate registration data.
                </p>
              </div>
            </section>

          </article>
        </div>

        {/* ══════════════════════════════════════════════════════════
            04. DEDICATED BOTTOM FOOTER FOR PRIVACY POLICY PAGE
            ══════════════════════════════════════════════════════════ */}
        <footer className="mt-16 pt-10 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center">
              <img src="/zeitnah-logo.png" alt="Zeitnah" className="w-4 h-4 object-contain" width={16} height={16} />
            </div>
            <span>&copy; {new Date().getFullYear()} {BRAND.name}. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Link to="/about" className="hover:text-white transition-colors">About Zeitnah</Link>
            <span className="text-white/20">•</span>
            <Link to="/courses" className="hover:text-white transition-colors">Courses</Link>
            <span className="text-white/20">•</span>
            <Link to="/network" className="hover:text-white transition-colors">Network</Link>
            <span className="text-white/20">•</span>
            <button
              type="button"
              onClick={scrollToTop}
              className="hover:text-brand-mint transition-colors inline-flex items-center gap-1 cursor-pointer font-medium"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Back to Top</span>
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
}
