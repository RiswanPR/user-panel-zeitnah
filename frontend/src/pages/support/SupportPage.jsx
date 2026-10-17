import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  LifeBuoy,
  Search,
  BookOpen,
  Video,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Bell,
  Cpu,
  Trash2,
  Mail,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ExternalLink,
  ArrowRight,
  HelpCircle,
  RefreshCw,
  Smartphone,
  Globe,
  Sparkles,
  Lock,
  Compass,
  Layers,
  Award,
  Building2,
} from "lucide-react";
import BRAND from "../../constants/brand";
import supportService from "../../services/supportService";
import ZeitnahZMotif from "../../components/courses/ZeitnahZMotif";
import { useToast } from "../../components/ui/Toast";

/**
 * ZEITNAH LMS — OFFICIAL PRODUCTION SUPPORT & HELP CENTER
 * Route: /support
 * Canonical: https://zeitnahacademy.com/support
 *
 * Designed to satisfy Apple App Store Connect Support URL requirements.
 * Features:
 * - Real-time keyword search across FAQs and help topics
 * - 9 verified platform support categories
 * - Practical troubleshooting matrix (playback, login, session conflicts)
 * - Live, authenticated & unauthenticated support ticket submission form
 * - Full compliance with Apple Guideline 5.1.1(v) account deletion pathways
 */

const CATEGORIES = [
  {
    id: "ACCOUNT_LOGIN",
    title: "Account & Login",
    icon: KeyRound,
    badge: "Auth",
    color: "text-brand-mint",
    bg: "bg-brand-mint/10 border-brand-mint/20",
    desc: "Passwordless OTP login, registration, verification codes, and email verification issues.",
  },
  {
    id: "ACCOUNT_RECOVERY",
    title: "Password & Account Recovery",
    icon: ShieldCheck,
    badge: "Recovery",
    color: "text-teal-400",
    bg: "bg-teal-400/10 border-teal-400/20",
    desc: "Email recovery, expired or delayed verification codes, session lockout, and device re-authentication.",
  },
  {
    id: "COURSE_ACCESS",
    title: "Courses & Curriculum",
    icon: BookOpen,
    badge: "Learning",
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/20",
    desc: "Curriculum navigation, lesson chapters, enrolled courses, attendance, and certificates.",
  },
  {
    id: "VIDEO_PLAYBACK",
    title: "Video Playback & DRM",
    icon: Video,
    badge: "Streaming",
    color: "text-purple-400",
    bg: "bg-purple-400/10 border-purple-400/20",
    desc: "VdoCipher DRM encrypted playback, dynamic watermark questions, buffering, and video stage controls.",
  },
  {
    id: "PAYMENTS_ENROLLMENT",
    title: "Admissions & Course Fees",
    icon: Layers,
    badge: "Admissions",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/20",
    desc: "Institutional admissions, batch enrollment requests, course fee records, and enquiry status.",
  },
  {
    id: "PROFILE_SETTINGS",
    title: "Profile & Portfolio",
    icon: UserCheck,
    badge: "Identity",
    color: "text-brand-yellow",
    bg: "bg-brand-yellow/10 border-brand-yellow/20",
    desc: "Professional identity, engineering titles, structured skills, resume upload, and public profile privacy.",
  },
  {
    id: "NOTIFICATIONS",
    title: "Notifications & Alerts",
    icon: Bell,
    badge: "Alerts",
    color: "text-amber-400",
    bg: "bg-amber-400/10 border-amber-400/20",
    desc: "Transactional email delivery, iOS APNs push notifications, and in-app message alerts.",
  },
  {
    id: "TECHNICAL_ISSUE",
    title: "Technical & Diagnostics",
    icon: Cpu,
    badge: "System",
    color: "text-sky-400",
    bg: "bg-sky-400/10 border-sky-400/20",
    desc: "Browser MSE/HLS support, device session conflicts, connection drops, and Web Vitals performance.",
  },
  {
    id: "ACCOUNT_DELETION",
    title: "Account Deletion & Privacy",
    icon: Trash2,
    badge: "Compliance",
    color: "text-rose-400",
    bg: "bg-rose-400/10 border-rose-400/20",
    desc: "Apple App Store Guideline 5.1.1(v) account deletion, data purge requests, and privacy policy inquiries.",
  },
];

const FAQS = [
  {
    id: "faq-login-otp",
    category: "ACCOUNT_LOGIN",
    question: "How do I log in or register for a Zeitnah LMS account?",
    answer:
      "Zeitnah LMS uses a secure, passwordless email OTP (One-Time Password) workflow. Simply enter your registered email address on the Login or Register page. A 6-digit verification code will be dispatched to your inbox. Enter the code within 10 minutes to verify your identity and access your dashboard. If you don't see the code, please verify your spam/junk folder.",
  },
  {
    id: "faq-account-recovery",
    category: "ACCOUNT_RECOVERY",
    question: "How do I recover access to my account or handle expired verification codes?",
    answer:
      "Because Zeitnah LMS uses email-based OTP verification, ensure your email provider is not filtering emails from noreply@zeitnahacademy.com into Spam, Junk, or Promotions. If your verification code has expired after 10 minutes, click 'Resend Code' on the login screen. If you have lost access to your registered email account, submit an account recovery ticket below or contact your academy coordinator.",
  },
  {
    id: "faq-video-watermark",
    category: "VIDEO_PLAYBACK",
    question: "Why is there a watermark moving across the video during class playback?",
    answer:
      "To protect instructor intellectual property, copyrighted engineering curricula, and prevent unauthorized video screen capture or rebroadcasting, class videos dynamically display a subtle, semi-transparent forensic watermark showing your name, email, device identifier, and the current timestamp. The watermark moves periodically and does not obscure key instructional graphics.",
  },
  {
    id: "faq-video-download",
    category: "VIDEO_PLAYBACK",
    question: "Can I download class recordings for offline viewing?",
    answer:
      "All lecture recordings are streamed through VdoCipher digital rights management (DRM) and encrypted HLS technology to prevent unauthorized distribution. Offline file downloading is not supported on the web portal. An active Internet connection with a minimum of 2 Mbps bandwidth is recommended for seamless 1080p and 720p playback.",
  },
  {
    id: "faq-device-limit",
    category: "TECHNICAL_ISSUE",
    question: "How many devices can I use simultaneously?",
    answer:
      "Zeitnah LMS monitors active device sessions to maintain account integrity and prevent credential sharing. If you sign in from a new computer or mobile device and exceed the allowed concurrent limit, you can terminate prior sessions by navigating to Profile > Account > Sessions and clicking 'Revoke' on obsolete devices.",
  },
  {
    id: "faq-course-enrollment",
    category: "PAYMENTS_ENROLLMENT",
    question: "How do I enroll in a course or pay course fees?",
    answer:
      "Course enrollments and batch assignments are administered directly by Zeitnah academic admissions. To register your interest or enquire about curriculum schedules and fees, click the 'Enquire' button on any course card in the Courses catalog. Self-service credit card billing is not directly processed on-site.",
  },
  {
    id: "faq-account-deletion",
    category: "ACCOUNT_DELETION",
    question: "How do I permanently delete my account and personal data (Apple Guideline 5.1.1(v))?",
    answer:
      "In accordance with Apple App Store Review Guideline 5.1.1(v), you can delete your account at any time. Option 1: Log in and navigate to Profile > Account > Security, then select 'Account Deletion'. Option 2: Send an email from your registered address to support@zeitnahacademy.com or privacy@zeitnahacademy.com with the subject line 'Account Deletion Request'. Your account, personal credentials, uploaded portfolio items, and active sessions will be permanently purged in accordance with our Privacy Policy.",
  },
  {
    id: "faq-profile-visibility",
    category: "PROFILE_SETTINGS",
    question: "Who can see my profile, portfolio, and resume?",
    answer:
      "You have granular privacy controls over your professional identity. In Profile > Edit Profile > Privacy, you can set the visibility of your experience, education, projects, certifications, and career preferences to Public, Network Connections Only, Verified Recruiters Only, or Private.",
  },
  {
    id: "faq-push-notifications",
    category: "NOTIFICATIONS",
    question: "How do I manage push notifications on my iOS or Android device?",
    answer:
      "Push notifications for direct messages, cohort space updates, and class reminders are delivered through Apple APNs on iOS and Google FCM on Android. You can toggle notification preferences in-app or adjust system permissions via your device Settings > Notifications > Zeitnah.",
  },
  {
    id: "faq-browser-support",
    category: "TECHNICAL_ISSUE",
    question: "What web browsers are officially supported?",
    answer:
      "Zeitnah LMS is optimized for modern evergreen browsers including Google Chrome (v100+), Apple Safari (v15+ on macOS/iOS), Mozilla Firefox (v100+), and Microsoft Edge. For the best video playback experience, ensure Media Source Extensions (MSE) and hardware acceleration are enabled.",
  },
];

const TROUBLESHOOTING_STEPS = [
  {
    title: "OTP Login Verification Code Not Received",
    problem: "You requested an OTP code but haven't received it in your inbox.",
    steps: [
      "Check your Spam, Junk, or Promotions folder for an email from noreply@zeitnahacademy.com.",
      "Verify that you entered your email address correctly without typos or extra whitespace.",
      "Wait for the 60-second cooldown timer before requesting a new OTP to avoid rate-limiting.",
      "Ensure your corporate or university email firewall allows incoming messages from @zeitnahacademy.com.",
    ],
  },
  {
    title: "Video Player Buffering or Stall",
    problem: "The video stage shows a spinning loader or fails to start playback.",
    steps: [
      "Confirm you have a steady internet connection with at least 2.5 Mbps download speed.",
      "Disable aggressive browser extensions (such as third-party ad-blockers or script filters) that may block DRM licensing handshakes.",
      "Click the video player gear icon to manually adjust the stream quality from Auto to 720p or 480p.",
      "Try refreshing the browser tab or opening the lesson in a private/incognito window to clear cached chunks.",
    ],
  },
  {
    title: "Session Expired or Multi-Device Conflict",
    problem: "You are repeatedly logged out or see a device authorization warning.",
    steps: [
      "Navigate to Profile > Account > Sessions to view all active browsers and mobile devices linked to your account.",
      "Click 'Revoke Session' or 'Log Out All Other Devices' to reset your active device registry.",
      "Log back in using a fresh OTP verification code to register your current device as the primary session.",
    ],
  },
  {
    title: "Browser Compatibility & Hardware Acceleration",
    problem: "The video stage shows a black screen or controls fail to respond.",
    steps: [
      "Ensure you are using a modern browser (Chrome 100+, Safari 15+, Firefox 100+, or Edge).",
      "Verify that Hardware Acceleration is turned ON in your browser settings (Settings > System > Use graphics acceleration).",
      "Ensure Media Source Extensions (MSE) and Encrypted Media Extensions (EME) are not disabled by privacy flags.",
      "Clear your browser cookies and site data for zeitnahacademy.com, then restart your browser.",
    ],
  },
];

export default function SupportPage() {
  const shouldReduceMotion = useReducedMotion();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [expandedFaqId, setExpandedFaqId] = useState(null);
  const [activeTroubleshootTab, setActiveTroubleshootTab] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    category: "TECHNICAL_ISSUE",
    subject: "",
    message: "",
    websiteUrl: "", // Honeypot field
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);

  const contactFormRef = useRef(null);

  // Dynamic SEO metadata
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Customer Support & Help Center — Zeitnah LMS";

    let metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc ? metaDesc.getAttribute("content") : "";
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Official Zeitnah LMS Support & Help Center. Get assistance with courses, video playback, OTP login, account recovery, and account deletion."
      );
    }

    let canonicalLink = document.querySelector('link[rel="canonical"]');
    const prevCanonical = canonicalLink ? canonicalLink.getAttribute("href") : "";
    if (canonicalLink) {
      canonicalLink.setAttribute("href", "https://zeitnahacademy.com/support");
    }

    return () => {
      document.title = prevTitle;
      if (metaDesc && prevDesc) metaDesc.setAttribute("content", prevDesc);
      if (canonicalLink && prevCanonical) canonicalLink.setAttribute("href", prevCanonical);
    };
  }, []);

  // Filter FAQs based on search and category
  const filteredFaqs = useMemo(() => {
    return FAQS.filter((faq) => {
      const matchesCategory =
        selectedCategory === "ALL" || faq.category === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q) ||
        faq.category.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const handleSelectCategory = (catId) => {
    setSelectedCategory((prev) => (prev === catId ? "ALL" : catId));
  };

  const toggleFaq = (id) => {
    setExpandedFaqId((prev) => (prev === id ? null : id));
  };

  const scrollToContactForm = (categoryPreset) => {
    if (categoryPreset) {
      setFormData((prev) => ({ ...prev, category: categoryPreset }));
    }
    contactFormRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Form validation
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = "Full name is required (minimum 2 characters).";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      errors.email = "Please provide a valid email address.";
    }
    if (!formData.subject.trim() || formData.subject.trim().length < 3) {
      errors.subject = "Subject must be at least 3 characters.";
    }
    if (!formData.message.trim() || formData.message.trim().length < 10) {
      errors.message = "Please describe your issue in detail (minimum 10 characters).";
    }
    return errors;
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      setFormErrors({});
      const res = await supportService.submitTicket(formData);
      setSubmissionSuccess({
        ticketNumber: res.ticketNumber,
        message: res.message,
      });
      setFormData({
        name: "",
        email: "",
        category: "TECHNICAL_ISSUE",
        subject: "",
        message: "",
        websiteUrl: "",
      });
      toast?.success?.("Support request submitted successfully!");
    } catch (err) {
      console.error("Support ticket submission failed:", err);
      const msg =
        err.response?.data?.message ||
        "Failed to submit support ticket. Please check your connection or contact support via email.";
      setFormErrors({ submit: msg });
      toast?.error?.(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-body antialiased relative selection:bg-brand-mint/30 selection:text-brand-mint pb-20">
      
      {/* ── BACKGROUND AMBIENT GLOWS ── */}
      <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-10 left-1/3 w-[600px] h-[600px] rounded-full bg-brand-mint/[0.04] blur-[160px]" />
        <div className="absolute top-[35%] right-0 w-[550px] h-[550px] rounded-full bg-[#12314C]/30 blur-[150px]" />
        <div className="absolute bottom-20 left-10 w-[500px] h-[500px] rounded-full bg-brand-yellow/[0.02] blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-10 sm:space-y-16">
        
        {/* ══════════════════════════════════════════════════════════
            01. SUPPORT HERO & SEARCH
            ══════════════════════════════════════════════════════════ */}
        <header className="relative overflow-hidden rounded-3xl border border-border bg-surface-card p-6 sm:p-12 lg:p-16 shadow-2xl text-center">
          {/* Subtle accent line */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-mint/40 to-transparent pointer-events-none" />

          {/* Decorative motif */}
          <div className="pointer-events-none absolute -right-16 -bottom-16 w-80 h-80 opacity-10 select-none hidden md:block" aria-hidden="true">
            <ZeitnahZMotif
              variant="gradient"
              animated={!shouldReduceMotion}
              glow={false}
              breathing={true}
              className="w-full h-full rotate-6"
            />
          </div>

          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider text-brand-mint bg-brand-mint/10 border border-brand-mint/25">
              <LifeBuoy className="w-3.5 h-3.5 text-brand-mint" />
              Official Customer Support & Knowledge Base
            </div>

            <div className="space-y-2.5">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black tracking-tight text-text-primary">
                How can we help you?
              </h1>
              <p className="text-sm sm:text-base text-text-secondary leading-relaxed max-w-2xl mx-auto">
                Find instant answers to questions regarding course enrollments, video playback DRM, login verification, account security, and iOS mobile features.
              </p>
            </div>

            {/* Live Search Field */}
            <div className="relative max-w-2xl mx-auto pt-2">
              <div className="relative flex items-center">
                <Search className="absolute left-4 w-5 h-5 text-text-muted pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search help topics (e.g., OTP login, video watermark, account deletion, certificate)..."
                  className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-surface-elevated border border-border text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-mint/60 focus:ring-2 focus:ring-brand-mint/20 transition-all shadow-inner"
                  aria-label="Search help topics and frequently asked questions"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 text-xs font-mono text-text-muted hover:text-text-primary cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-[11px] text-text-faint mt-2 font-mono text-left sm:text-center">
                Popular topics: <button type="button" onClick={() => setSearchQuery("OTP")} className="text-brand-mint hover:underline">OTP code</button> • <button type="button" onClick={() => setSearchQuery("watermark")} className="text-brand-mint hover:underline">Watermark</button> • <button type="button" onClick={() => setSearchQuery("deletion")} className="text-brand-mint hover:underline">Account deletion</button> • <button type="button" onClick={() => setSearchQuery("sessions")} className="text-brand-mint hover:underline">Device sessions</button>
              </p>
            </div>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════════
            02. HELP CATEGORIES (9 Verified Topic Clusters)
            ══════════════════════════════════════════════════════════ */}
        <section aria-labelledby="help-categories-heading" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 id="help-categories-heading" className="text-xl sm:text-2xl font-heading font-bold text-text-primary tracking-tight">
                Explore Help Topics
              </h2>
              <p className="text-xs sm:text-sm text-text-muted">
                Select a category to inspect relevant questions or submit a targeted ticket.
              </p>
            </div>

            {selectedCategory !== "ALL" && (
              <button
                type="button"
                onClick={() => setSelectedCategory("ALL")}
                className="text-xs font-mono font-bold text-brand-mint hover:underline self-start sm:self-auto cursor-pointer"
              >
                Reset Filter (Show All)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;

              return (
                <div
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleSelectCategory(cat.id);
                    }
                  }}
                  className={`relative text-left rounded-2xl border p-5 space-y-3 transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint/50 ${
                    isSelected
                      ? "border-brand-mint/40 bg-brand-mint/10 shadow-lg shadow-brand-mint/5"
                      : "border-border bg-surface-card hover:bg-surface-elevated hover:border-border-accent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${cat.bg}`}>
                      <Icon className={`w-4 h-4 ${cat.color}`} />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-text-faint">
                      {cat.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-heading font-bold text-sm text-white tracking-wide">
                      {cat.title}
                    </h3>
                    <p className="text-xs text-text-muted leading-relaxed mt-1">
                      {cat.desc}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-[11px] font-medium border-t border-white/[0.04]">
                    <span className={isSelected ? "text-brand-mint font-bold" : "text-text-muted"}>
                      {isSelected ? "Active Filter" : "Filter FAQs"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollToContactForm(cat.id === "PAYMENTS_ENROLLMENT" ? "OTHER" : cat.id);
                      }}
                      className="text-text-secondary hover:text-white flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <span>Ask team</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            03. INTERACTIVE FREQUENTLY ASKED QUESTIONS
            ══════════════════════════════════════════════════════════ */}
        <section aria-labelledby="faq-heading" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
                <HelpCircle className="w-4 h-4" />
                <span>Knowledge Base</span>
              </div>
              <h2 id="faq-heading" className="text-xl sm:text-2xl font-heading font-bold text-white tracking-tight mt-1">
                Frequently Asked Questions
              </h2>
            </div>
            <span className="text-xs font-mono text-text-muted">
              Showing {filteredFaqs.length} of {FAQS.length} answers
            </span>
          </div>

          {filteredFaqs.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface-card p-8 text-center space-y-3">
              <Search className="w-8 h-8 text-text-muted mx-auto" />
              <h3 className="text-base font-bold text-text-primary">No matching answers found</h3>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                We couldn&apos;t find an existing FAQ matching &ldquo;{searchQuery}&rdquo;. You can submit a support ticket below and our engineering team will answer you directly.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("ALL");
                }}
                className="zn-btn-secondary text-xs px-4 py-2 font-semibold"
              >
                Clear Search & Filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFaqs.map((faq) => {
                const isExpanded = expandedFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="rounded-2xl border border-border bg-surface-card overflow-hidden transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(faq.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`faq-answer-${faq.id}`}
                      className="w-full flex items-center justify-between p-5 text-left text-sm font-heading font-bold text-text-primary hover:text-brand-mint transition-colors cursor-pointer gap-4"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 ${
                          isExpanded ? "rotate-180 text-brand-mint" : ""
                        }`}
                      />
                    </button>

                    {isExpanded && (
                      <div
                        id={`faq-answer-${faq.id}`}
                        className="px-5 pb-5 text-xs text-text-secondary leading-relaxed border-t border-border pt-3"
                      >
                        <p>{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════
            04. STEP-BY-STEP TROUBLESHOOTING GUIDE
            ══════════════════════════════════════════════════════════ */}
        <section aria-labelledby="troubleshooting-heading" className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
              <Cpu className="w-4 h-4" />
              <span>Self-Service Diagnostics</span>
            </div>
            <h2 id="troubleshooting-heading" className="text-xl sm:text-2xl font-heading font-bold text-text-primary tracking-tight mt-1">
              Common Technical Troubleshooting Steps
            </h2>
            <p className="text-xs sm:text-sm text-text-muted">
              Quick resolutions for common client-side authentication, network, and video player issues.
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-surface-card p-6 sm:p-8 space-y-6">
            {/* Tab Buttons */}
            <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
              {TROUBLESHOOTING_STEPS.map((t, idx) => (
                <button
                  key={t.title}
                  type="button"
                  onClick={() => setActiveTroubleshootTab(idx)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTroubleshootTab === idx
                      ? "bg-brand-mint text-bg-dark font-bold shadow-md shadow-brand-mint/20"
                      : "bg-surface-elevated text-text-muted hover:text-text-primary hover:bg-surface-elevated/80"
                  }`}
                >
                  {t.title}
                </button>
              ))}
            </div>

            {/* Active Tab Content */}
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-faint font-bold">Problem Scenario</span>
                <p className="text-sm font-bold text-text-primary">
                  {TROUBLESHOOTING_STEPS[activeTroubleshootTab].problem}
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <span className="text-xs font-mono text-brand-mint uppercase tracking-wider font-bold block">
                  Recommended Action Steps:
                </span>
                <ol className="space-y-2 text-xs text-text-secondary">
                  {TROUBLESHOOTING_STEPS[activeTroubleshootTab].steps.map((step, sIdx) => (
                    <li key={sIdx} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-surface-elevated border border-border flex items-center justify-center font-mono text-[10px] font-bold text-brand-mint shrink-0 mt-0.5">
                        {sIdx + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            05. CONTACT CHANNELS & LIVE SUPPORT FORM
            ══════════════════════════════════════════════════════════ */}
        <section ref={contactFormRef} aria-labelledby="contact-support-heading" className="space-y-6 scroll-mt-24">
          <div>
            <div className="flex items-center gap-2 text-brand-mint font-mono text-xs font-bold uppercase tracking-widest">
              <Mail className="w-4 h-4" />
              <span>Direct Support</span>
            </div>
            <h2 id="contact-support-heading" className="text-xl sm:text-2xl font-heading font-bold text-text-primary tracking-tight mt-1">
              Contact the Zeitnah Support Team
            </h2>
            <p className="text-xs sm:text-sm text-text-muted">
              Submit a support ticket below or contact our verified channels directly.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Official Contact Cards (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* General Support Card */}
              <div className="rounded-2xl border border-border bg-surface-card p-5 space-y-3">
                <div className="w-9 h-9 rounded-xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <span className="font-mono text-[10px] uppercase font-bold text-text-faint tracking-wider">
                    Official Support Email
                  </span>
                  <a
                    href="mailto:support@zeitnahacademy.com"
                    className="text-sm font-heading font-bold text-brand-mint hover:underline font-mono block"
                  >
                    [Placeholder: support@zeitnahacademy.com]
                  </a>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Direct communication channel for learning issues, video access, and administrative enquiries.
                  </p>
                </div>
              </div>

              {/* Privacy & Account Deletion Card */}
              <div className="rounded-2xl border border-border bg-surface-card p-5 space-y-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <span className="font-mono text-[10px] uppercase font-bold text-text-faint tracking-wider">
                    Privacy & Account Deletion
                  </span>
                  <a
                    href="mailto:privacy@zeitnahacademy.com"
                    className="text-sm font-heading font-bold text-rose-400 hover:underline font-mono block"
                  >
                    [Placeholder: privacy@zeitnahacademy.com]
                  </a>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Compliant with Apple App Store Guideline 5.1.1(v). For complete details, review our{" "}
                    <Link to="/privacy-policy" className="text-brand-mint hover:underline font-semibold">
                      Privacy Policy
                    </Link>.
                  </p>
                </div>
              </div>

              {/* Operational Hours */}
              <div className="rounded-2xl border border-border bg-surface-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
                  <Clock className="w-4 h-4 text-brand-yellow shrink-0" />
                  <span>Support Availability & Hours</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Monday – Saturday: 9:00 AM – 6:00 PM IST (GMT+5:30).<br />
                  Typical response time: acknowledged within 24 to 48 business hours.
                </p>
              </div>

              {/* Operating Legal Entity & Address */}
              <div className="rounded-2xl border border-border bg-surface-card p-5 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
                  <Building2 className="w-4 h-4 text-brand-mint shrink-0" />
                  <span>Operating Legal Entity</span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-text-primary block">
                    ZEITNAH INSTITUTE OF SURVEY LLP
                  </span>
                  <span className="text-[11px] text-text-faint font-mono block">
                    Business Constitution: Limited Liability Partnership
                  </span>
                  <p className="text-xs text-text-muted leading-relaxed pt-1">
                    1st Floor, 34/1412, Babil Complex, Kovilakam Road, Mankavu, Kozhikode, Kerala 673007, India
                  </p>
                </div>
              </div>

            </div>

            {/* Right Column: Live Support Request Form (7 cols) */}
            <div className="lg:col-span-7">
              <div className="rounded-3xl border border-border bg-surface-card p-6 sm:p-8 space-y-6 shadow-xl">
                
                <div>
                  <h3 className="text-lg font-heading font-bold text-text-primary">
                    Submit a Support Request
                  </h3>
                  <p className="text-xs text-text-muted mt-1">
                    Complete the form below to generate an official support ticket in our queue.
                  </p>
                </div>

                {submissionSuccess ? (
                  <div className="rounded-2xl border border-brand-mint/30 bg-brand-mint/10 p-6 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-brand-mint/20 border border-brand-mint/40 flex items-center justify-center text-brand-mint mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5">
                      <span className="font-mono text-xs uppercase font-bold tracking-wider text-brand-mint block">
                        Ticket Created Successfully
                      </span>
                      <h4 className="text-xl font-heading font-black text-text-primary font-mono">
                        {submissionSuccess.ticketNumber}
                      </h4>
                      <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
                        {submissionSuccess.message}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSubmissionSuccess(null)}
                      className="zn-btn-secondary text-xs px-5 py-2 font-semibold"
                    >
                      Submit Another Ticket
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitTicket} className="space-y-4">
                    
                    {/* General Submit Error Notice */}
                    {formErrors.submit && (
                      <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{formErrors.submit}</span>
                      </div>
                    )}

                    {/* Honeypot field (hidden from humans) */}
                    <div className="hidden" aria-hidden="true">
                      <label htmlFor="websiteUrl">Leave this blank</label>
                      <input
                        type="text"
                        id="websiteUrl"
                        name="websiteUrl"
                        tabIndex={-1}
                        autoComplete="off"
                        value={formData.websiteUrl}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <label htmlFor="support-name" className="text-xs font-semibold text-text-primary block">
                          Full Name <span className="text-brand-mint">*</span>
                        </label>
                        <input
                          id="support-name"
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleFormChange}
                          placeholder="Your name"
                          className={`w-full px-3.5 py-2.5 rounded-xl bg-surface-elevated border text-xs text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 transition-all ${
                            formErrors.name
                              ? "border-rose-500 focus:ring-rose-500"
                              : "border-border focus:border-brand-mint focus:ring-brand-mint"
                          }`}
                        />
                        {formErrors.name && (
                          <p className="text-[11px] text-rose-400">{formErrors.name}</p>
                        )}
                      </div>

                      {/* Email */}
                      <div className="space-y-1.5">
                        <label htmlFor="support-email" className="text-xs font-semibold text-text-primary block">
                          Email Address <span className="text-brand-mint">*</span>
                        </label>
                        <input
                          id="support-email"
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleFormChange}
                          placeholder="name@example.com"
                          className={`w-full px-3.5 py-2.5 rounded-xl bg-surface-elevated border text-xs text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 transition-all ${
                            formErrors.email
                              ? "border-rose-500 focus:ring-rose-500"
                              : "border-border focus:border-brand-mint focus:ring-brand-mint"
                          }`}
                        />
                        {formErrors.email && (
                          <p className="text-[11px] text-rose-400">{formErrors.email}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Category */}
                      <div className="space-y-1.5">
                        <label htmlFor="support-category" className="text-xs font-semibold text-text-primary block">
                          Issue Category <span className="text-brand-mint">*</span>
                        </label>
                        <select
                          id="support-category"
                          name="category"
                          value={formData.category}
                          onChange={handleFormChange}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-border text-xs text-text-primary focus:outline-none focus:border-brand-mint focus:ring-1 focus:ring-brand-mint cursor-pointer"
                        >
                          <option value="ACCOUNT_LOGIN">Account & Login</option>
                          <option value="ACCOUNT_RECOVERY">Password & Account Recovery</option>
                          <option value="COURSE_ACCESS">Courses & Curriculum</option>
                          <option value="VIDEO_PLAYBACK">Video Playback & DRM</option>
                          <option value="PAYMENTS_ENROLLMENT">Admissions & Course Fees</option>
                          <option value="PROFILE_SETTINGS">Profile & Portfolio</option>
                          <option value="NOTIFICATIONS">Notifications & Alerts</option>
                          <option value="TECHNICAL_ISSUE">Technical Issue & Diagnostics</option>
                          <option value="ACCOUNT_DELETION">Account Deletion Request</option>
                          <option value="OTHER">Other Inquiry</option>
                        </select>
                      </div>

                      {/* Subject */}
                      <div className="space-y-1.5">
                        <label htmlFor="support-subject" className="text-xs font-semibold text-text-primary block">
                          Subject <span className="text-brand-mint">*</span>
                        </label>
                        <input
                          id="support-subject"
                          type="text"
                          name="subject"
                          value={formData.subject}
                          onChange={handleFormChange}
                          placeholder="Brief summary of the issue"
                          className={`w-full px-3.5 py-2.5 rounded-xl bg-surface-elevated border text-xs text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 transition-all ${
                            formErrors.subject
                              ? "border-rose-500 focus:ring-rose-500"
                              : "border-border focus:border-brand-mint focus:ring-brand-mint"
                          }`}
                        />
                        {formErrors.subject && (
                          <p className="text-[11px] text-rose-400">{formErrors.subject}</p>
                        )}
                      </div>
                    </div>

                    {/* Message */}
                    <div className="space-y-1.5">
                      <label htmlFor="support-message" className="text-xs font-semibold text-text-primary block">
                        Message Details <span className="text-brand-mint">*</span>
                      </label>
                      <textarea
                        id="support-message"
                        name="message"
                        rows={4}
                        value={formData.message}
                        onChange={handleFormChange}
                        placeholder="Please provide details regarding your browser, course, lesson, or account identifier..."
                        className={`w-full px-3.5 py-2.5 rounded-xl bg-surface-elevated border text-xs text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 transition-all ${
                          formErrors.message
                            ? "border-rose-500 focus:ring-rose-500"
                            : "border-border focus:border-brand-mint focus:ring-brand-mint"
                        }`}
                      />
                      {formErrors.message && (
                        <p className="text-[11px] text-rose-400">{formErrors.message}</p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2 flex items-center justify-between gap-4">
                      <span className="text-[11px] text-text-faint">
                        Protected by server-side rate limits & sanitization.
                      </span>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="zn-btn-primary px-6 py-2.5 text-xs font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Send Support Request</span>
                          </>
                        )}
                      </button>
                    </div>

                  </form>
                )}

              </div>
            </div>

          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            06. ADDITIONAL VERIFIED PLATFORM RESOURCES
            ══════════════════════════════════════════════════════════ */}
        <section aria-labelledby="resources-heading" className="rounded-3xl border border-border bg-surface-card p-6 sm:p-10 space-y-4">
          <h2 id="resources-heading" className="text-base font-heading font-bold text-text-primary">
            Additional Verified Resources
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <Link
              to="/privacy-policy"
              className="p-4 rounded-xl border border-border bg-surface-elevated hover:bg-surface-card transition-colors group space-y-1 block"
            >
              <div className="flex items-center justify-between text-brand-mint font-semibold">
                <span>Privacy Policy</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-text-muted text-[11px]">
                Apple Guideline 5.1.1 compliance, DRM disclosures, and data rights.
              </p>
            </Link>

            <Link
              to="/courses"
              className="p-4 rounded-xl border border-border bg-surface-elevated hover:bg-surface-card transition-colors group space-y-1 block"
            >
              <div className="flex items-center justify-between text-text-primary font-semibold">
                <span>Course Catalog</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-text-muted text-[11px]">
                Explore civil infrastructure, Primavera P6, and BIM curricula.
              </p>
            </Link>

            <Link
              to="/network"
              className="p-4 rounded-xl border border-border bg-surface-elevated hover:bg-surface-card transition-colors group space-y-1 block"
            >
              <div className="flex items-center justify-between text-text-primary font-semibold">
                <span>Global Civil Network</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-text-muted text-[11px]">
                Connect with mentors, peer engineers, and enterprise organizations.
              </p>
            </Link>

            <Link
              to="/about"
              className="p-4 rounded-xl border border-border bg-surface-elevated hover:bg-surface-card transition-colors group space-y-1 block"
            >
              <div className="flex items-center justify-between text-text-primary font-semibold">
                <span>About Zeitnah</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-text-muted text-[11px]">
                Brand identity, mission, and the freedom of knowledge movement.
              </p>
            </Link>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            07. SUPPORT PAGE FOOTER
            ══════════════════════════════════════════════════════════ */}
        <footer className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-surface-elevated border border-border flex items-center justify-center">
              <img src="/zeitnah-logo.png" alt="Zeitnah" className="w-4 h-4 object-contain" width={16} height={16} />
            </div>
            <span>&copy; {new Date().getFullYear()} {BRAND.name}. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Link to="/privacy-policy" className="hover:text-text-primary transition-colors">Privacy Policy</Link>
            <span className="text-text-faint">•</span>
            <Link to="/about" className="hover:text-text-primary transition-colors">About</Link>
            <span className="text-text-faint">•</span>
            <Link to="/courses" className="hover:text-text-primary transition-colors">Courses</Link>
            <span className="text-text-faint">•</span>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="hover:text-brand-mint transition-colors cursor-pointer font-medium"
            >
              Back to Top ↑
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
}
