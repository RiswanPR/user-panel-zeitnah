import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  Compass,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  FolderGit2,
  Briefcase,
  Layers,
  ChevronRight,
  Send,
  MessageSquare,
  HelpCircle,
  BarChart3,
  MapPin,
  Cpu,
  Target,
  ArrowUpRight,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import { careerIntelligenceService } from '../../services/careerIntelligenceService';

export default function CareerIntelligencePage() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'roles' | 'skills' | 'pathways' | 'market' | 'assistant'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Data states
  const [overview, setOverview] = useState(null);
  const [roleAlignments, setRoleAlignments] = useState([]);
  const [skillGaps, setSkillGaps] = useState(null);
  const [pathways, setPathways] = useState(null);
  const [marketBenchmarks, setMarketBenchmarks] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  // Selected target role for skill gaps & pathways
  const [selectedTargetRole, setSelectedTargetRole] = useState('');

  // Target role edit modal
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [newPrimaryRole, setNewPrimaryRole] = useState('');

  // Assistant state
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantMessages, setAssistantMessages] = useState([
    {
      sender: 'assistant',
      text: 'Hello! I am your Zeitnah Career Assistant. Based on your infrastructure profile and current market data, I can help answer questions about role alignment, required software, project evidence, and skill gaps.',
      profileRefs: [],
      marketRefs: [],
      actionItems: ['Ask about planning roles', 'Check missing profile details'],
    },
  ]);
  const [assistantLoading, setAssistantLoading] = useState(false);

  // Fetch initial data
  const loadCareerData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [overviewData, rolesData, benchmarksData, recsData] = await Promise.all([
        careerIntelligenceService.getOverview(),
        careerIntelligenceService.getRoleAlignments(),
        careerIntelligenceService.getMarketBenchmarks(),
        careerIntelligenceService.getProfileRecommendations(),
      ]);

      setOverview(overviewData);
      setRoleAlignments(rolesData.alignments || []);
      setMarketBenchmarks(benchmarksData);
      setRecommendations(recsData.recommendations || []);

      const primary = overviewData.primaryTargetRole || 'Planning Engineer';
      setSelectedTargetRole(primary);
      setNewPrimaryRole(primary);

      // Load skill gaps and pathways for primary role
      const [gapsData, pathwaysData] = await Promise.all([
        careerIntelligenceService.getSkillGaps(primary),
        careerIntelligenceService.getPathways(primary),
      ]);

      setSkillGaps(gapsData);
      setPathways(pathwaysData);
    } catch (err) {
      console.error('Failed loading career intelligence:', err);
      setError('Unable to load Career Intelligence data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCareerData();
  }, []);

  // Update target role selection
  const handleSelectRole = async (roleTitle) => {
    setSelectedTargetRole(roleTitle);
    try {
      const [gapsData, pathwaysData] = await Promise.all([
        careerIntelligenceService.getSkillGaps(roleTitle),
        careerIntelligenceService.getPathways(roleTitle),
      ]);
      setSkillGaps(gapsData);
      setPathways(pathwaysData);
    } catch (err) {
      console.error('Failed updating role view:', err);
    }
  };

  // Save new primary target role
  const handleSaveTargetRoles = async (e) => {
    e.preventDefault();
    if (!newPrimaryRole.trim()) return;
    try {
      setRefreshing(true);
      await careerIntelligenceService.setTargetRoles({
        primaryTargetRole: newPrimaryRole.trim(),
      });
      setShowTargetModal(false);
      await loadCareerData(true);
    } catch (err) {
      console.error('Failed saving target roles:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Assistant query handler
  const handleSendAssistantQuery = async (queryText) => {
    const textToSend = queryText || assistantInput;
    if (!textToSend.trim() || assistantLoading) return;

    const userMsg = { sender: 'user', text: textToSend };
    setAssistantMessages((prev) => [...prev, userMsg]);
    setAssistantInput('');
    setAssistantLoading(true);

    try {
      const res = await careerIntelligenceService.askAssistant(textToSend);
      setAssistantMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: res.answer,
          profileRefs: res.profileReferences || [],
          marketRefs: res.marketReferences || [],
          actionItems: res.suggestedActionItems || [],
        },
      ]);
    } catch (err) {
      console.error('Assistant error:', err);
      setAssistantMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'I encountered an error processing your query. Please check your network and try again.',
          profileRefs: [],
          marketRefs: [],
          actionItems: [],
        },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white p-6 md:p-10 flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-emerald-400 animate-spin" />
        </div>
        <p className="text-xs uppercase tracking-widest text-white/50 font-medium animate-pulse">
          Analyzing Infrastructure Profile & Market Signals...
        </p>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white p-6 md:p-10 flex flex-col items-center justify-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-400" />
        <h2 className="text-lg font-semibold">{error || 'Data Unavailable'}</h2>
        <button
          onClick={() => loadCareerData()}
          className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-sm font-medium transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  const {
    profileCompleteness,
    profileStrength,
    profileStrengthEvidence,
    careerSummary,
    primaryTargetRole,
  } = overview;

  return (
    <div className="min-h-screen bg-[#070b14] text-white pb-20">
      {/* ── HEADER HERO ──────────────────────────────────────────────────────── */}
      <div className="border-b border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="w-3 h-3" />
                  Infrastructure Career Decision Support
                </span>
                <span className="text-xs text-white/40">• Phase 5</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                Career Intelligence
              </h1>
              <p className="text-sm text-white/60 mt-1 max-w-2xl">
                Evidence-based role alignment, skill gap analysis, and infrastructure market benchmarks derived from your verified profile.
              </p>
            </div>

            {/* Quick Actions & Refresh */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => loadCareerData(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-xs font-medium text-white/80 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh Insights'}
              </button>

              <button
                onClick={() => setShowTargetModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black text-xs font-semibold hover:opacity-90 transition shadow-lg shadow-emerald-500/20"
              >
                <Target className="w-3.5 h-3.5" />
                Target: {primaryTargetRole || 'Set Target'}
              </button>
            </div>
          </div>

          {/* ── PROFILE STRENGTH & SUMMARY STRIP ─────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {/* 1. Profile Strength */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-white/50 font-medium">Profile Strength</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span
                  className={`text-xl font-bold ${
                    profileStrength === 'STRONG'
                      ? 'text-emerald-400'
                      : profileStrength === 'MODERATE'
                      ? 'text-amber-400'
                      : 'text-cyan-400'
                  }`}
                >
                  {profileStrength === 'STRONG'
                    ? 'Strong Evidence'
                    : profileStrength === 'MODERATE'
                    ? 'Moderate Evidence'
                    : 'Emerging Profile'}
                </span>
              </div>
              <p className="text-[11px] text-white/50 mt-1">
                {profileStrengthEvidence.filter((e) => e.verified).length} of 5 infrastructure benchmarks verified
              </p>
            </div>

            {/* 2. Profile Completeness */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-white/50 font-medium">Completeness</span>
                <span className="text-xs font-bold text-white/80">{profileCompleteness}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 mt-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-teal-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${profileCompleteness}%` }}
                />
              </div>
              <p className="text-[11px] text-white/50 mt-2">
                {profileCompleteness >= 80 ? 'Well documented profile' : 'Add projects and skills to complete'}
              </p>
            </div>

            {/* 3. Primary Discipline & Years */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-white/50 font-medium">Discipline & Field</span>
                <Briefcase className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="mt-2 text-sm font-bold text-white truncate">
                {careerSummary?.primaryDiscipline || 'Civil Engineering'}
              </div>
              <p className="text-[11px] text-white/50 mt-1">
                {careerSummary?.yearsOfExperience || 0} years documented experience
              </p>
            </div>

            {/* 4. Active Target Role */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-white/50 font-medium">Primary Goal</span>
                <Target className="w-4 h-4 text-purple-400" />
              </div>
              <div className="mt-2 text-sm font-bold text-white truncate">
                {primaryTargetRole}
              </div>
              <button
                onClick={() => setShowTargetModal(true)}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium mt-1 inline-flex items-center gap-1"
              >
                Change goal <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* ── NAVIGATION TABS ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-6 mt-2 border-t border-white/[0.06]">
            {[
              { id: 'overview', label: 'Overview', icon: Layers },
              { id: 'roles', label: 'Role Alignment', icon: Compass },
              { id: 'skills', label: 'Skill Gaps', icon: Award },
              { id: 'pathways', label: 'Career Pathways', icon: TrendingUp },
              { id: 'market', label: 'Market Benchmarks', icon: BarChart3 },
              { id: 'assistant', label: 'Career Assistant', icon: MessageSquare },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                    isActive
                      ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-white/50'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Profile Strength Evidence Breakdown */}
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.08]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-white">Profile Evidence Checklist</h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    How clearly your available profile information demonstrates relevant infrastructure capabilities.
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  {profileStrength} Strength
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4">
                {profileStrengthEvidence.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                      item.verified
                        ? 'bg-emerald-500/[0.03] border-emerald-500/20'
                        : 'bg-white/[0.01] border-white/[0.06]'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl mt-0.5 ${
                        item.verified
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-white/5 text-white/40'
                      }`}
                    >
                      {item.verified ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white">{item.label}</h4>
                      <p className="text-[11px] text-white/50 mt-0.5">{item.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Aligned Roles Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-white">Top Aligned Infrastructure Roles</h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    Evaluated against your technical discipline, documented software, and project experience.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('roles')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                >
                  View all roles <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {roleAlignments.slice(0, 3).map((role) => (
                  <div
                    key={role.roleId}
                    className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/20 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
                          {role.discipline}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            role.alignmentLevel === 'STRONG'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : role.alignmentLevel === 'MODERATE'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {role.alignmentScore}% Match
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white">{role.roleTitle}</h4>

                      <div className="mt-3 space-y-1.5">
                        {role.demonstratedReasons.slice(0, 2).map((r, i) => (
                          <div key={i} className="text-xs text-emerald-400/90 flex items-start gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{r}</span>
                          </div>
                        ))}
                        {role.developmentGaps.slice(0, 1).map((g, i) => (
                          <div key={i} className="text-xs text-amber-400/80 flex items-start gap-1.5">
                            <span className="text-amber-400">△</span>
                            <span>{g}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                      <span className="text-[11px] text-white/40">
                        {role.relevantJobCount} active jobs
                      </span>
                      <button
                        onClick={() => {
                          handleSelectRole(role.roleTitle);
                          setActiveTab('skills');
                        }}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1"
                      >
                        Skill Gaps <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Improvement Recommendations */}
            {recommendations.length > 0 && (
              <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.08]">
                <h3 className="text-base font-semibold text-white mb-1">Recommended Profile Enhancements</h3>
                <p className="text-xs text-white/50 mb-4">
                  Actionable suggestions to improve discovery across matching infrastructure employers.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                              rec.priority === 'HIGH'
                                ? 'bg-rose-500/10 text-rose-400'
                                : 'bg-amber-500/10 text-amber-400'
                            }`}
                          >
                            {rec.priority}
                          </span>
                          <h4 className="text-xs font-semibold text-white">{rec.title}</h4>
                        </div>
                        <p className="text-[11px] text-white/60 leading-relaxed">{rec.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ROLE ALIGNMENTS */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">Infrastructure Role Alignments</h3>
              <p className="text-xs text-white/50 mt-1">
                Comparing your structured profile with standard requirements across infrastructure engineering domains.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roleAlignments.map((role) => {
                const isCurrentTarget = role.roleTitle.toLowerCase() === selectedTargetRole.toLowerCase();
                return (
                  <div
                    key={role.roleId}
                    className={`p-5 rounded-2xl border transition flex flex-col justify-between ${
                      isCurrentTarget
                        ? 'bg-emerald-500/[0.03] border-emerald-500/30'
                        : 'bg-white/[0.02] border-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
                          {role.discipline}
                        </span>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                            role.alignmentLevel === 'STRONG'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : role.alignmentLevel === 'MODERATE'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {role.alignmentScore}% {role.alignmentLevel}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        {role.roleTitle}
                        {isCurrentTarget && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-normal">
                            Target
                          </span>
                        )}
                      </h4>

                      {/* Alignment Progress bar */}
                      <div className="w-full bg-white/10 rounded-full h-1.5 mt-3 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${
                            role.alignmentLevel === 'STRONG'
                              ? 'bg-emerald-400'
                              : role.alignmentLevel === 'MODERATE'
                              ? 'bg-amber-400'
                              : 'bg-blue-400'
                          }`}
                          style={{ width: `${role.alignmentScore}%` }}
                        />
                      </div>

                      {/* Reasons & Gaps */}
                      <div className="mt-4 space-y-2">
                        <div className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                          Why this matches
                        </div>
                        {role.demonstratedReasons.map((r, i) => (
                          <div key={i} className="text-xs text-white/80 flex items-start gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{r}</span>
                          </div>
                        ))}

                        {role.developmentGaps.length > 0 && (
                          <>
                            <div className="text-[11px] font-semibold text-white/40 uppercase tracking-wider pt-2">
                              Potential Development
                            </div>
                            {role.developmentGaps.map((g, i) => (
                              <div key={i} className="text-xs text-amber-400/90 flex items-start gap-1.5">
                                <span className="text-amber-400 font-bold">△</span>
                                <span>{g}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          handleSelectRole(role.roleTitle);
                          setActiveTab('skills');
                        }}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1"
                      >
                        Inspect Skill Gaps <ChevronRight className="w-3 h-3" />
                      </button>

                      {!isCurrentTarget && (
                        <button
                          onClick={() => {
                            setNewPrimaryRole(role.roleTitle);
                            setShowTargetModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-white/10 hover:bg-white/[0.06] text-[11px] text-white/70 transition"
                        >
                          Set Target
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: SKILL GAPS FOR TARGET ROLE */}
        {activeTab === 'skills' && skillGaps && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
              <div>
                <span className="text-xs uppercase tracking-wider text-emerald-400 font-medium">Target Role</span>
                <h3 className="text-lg font-bold text-white mt-0.5">{skillGaps.targetRole}</h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Tier: {skillGaps.roleTier} • Discipline: {skillGaps.discipline}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">Switch role:</span>
                <select
                  value={skillGaps.targetRole}
                  onChange={(e) => handleSelectRole(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {roleAlignments.map((r) => (
                    <option key={r.roleId} value={r.roleTitle} className="bg-[#0b1120]">
                      {r.roleTitle}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Demonstrated vs Gap Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Demonstrated Competencies */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Already Demonstrated ({skillGaps.demonstratedSkills.length})
                  </h4>
                  <span className="text-xs text-emerald-400/80 font-medium">Profile Grounded</span>
                </div>

                <div className="space-y-3">
                  {skillGaps.demonstratedSkills.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-emerald-500/[0.02] border border-emerald-500/10 flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-semibold text-white">{item.skill}</div>
                        <div className="text-[11px] text-white/50 mt-0.5 flex items-center gap-1.5">
                          <span>Evidence: {item.source}</span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium uppercase tracking-wider shrink-0">
                        {item.evidenceType.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Potential Gaps */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-amber-400 font-bold">△</span>
                    Not Currently Demonstrated ({skillGaps.gapSkills.length})
                  </h4>
                  <span className="text-xs text-amber-400/80 font-medium">Potential Areas to Strengthen</span>
                </div>

                <div className="space-y-3">
                  {skillGaps.gapSkills.map((gap, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-white/[0.01] border border-white/[0.06] flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">{gap.skill}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            gap.importance === 'REQUIRED'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {gap.importance}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/60 leading-relaxed">{gap.recommendedAction}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CAREER PATHWAYS & CAREER MAP */}
        {activeTab === 'pathways' && pathways && (
          <div className="space-y-8">
            {/* Progression Ladder */}
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.08]">
              <h3 className="text-base font-semibold text-white mb-1">Infrastructure Career Progression</h3>
              <p className="text-xs text-white/50 mb-6">
                Possible development trajectory for {pathways.currentPosition} towards {pathways.targetRole}.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                {/* 1. Predecessors */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
                  <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Foundation</span>
                  <div className="text-xs font-semibold text-white/70 mt-1">
                    {pathways.progressionLadder.predecessorRoles.slice(0, 2).join(' / ') || 'Graduate Engineer'}
                  </div>
                </div>

                {/* 2. Current Role */}
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center relative">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Current Level</span>
                  <div className="text-xs font-bold text-white mt-1">{pathways.currentPosition}</div>
                </div>

                {/* 3. Adjacent / Target */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/20 text-center">
                  <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">Target Role</span>
                  <div className="text-xs font-bold text-white mt-1">{pathways.targetRole}</div>
                </div>

                {/* 4. Successors */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
                  <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Advanced</span>
                  <div className="text-xs font-semibold text-white/70 mt-1">
                    {pathways.progressionLadder.successorRoles.slice(0, 2).join(' / ') || 'Project Director'}
                  </div>
                </div>
              </div>
            </div>

            {/* Step-by-Step Action Pathway */}
            <div>
              <h3 className="text-base font-semibold text-white mb-1">Recommended Pathway Steps</h3>
              <p className="text-xs text-white/50 mb-4">
                Concrete milestones to strengthen your candidacy for {pathways.targetRole}.
              </p>

              <div className="space-y-3.5">
                {pathways.pathwaySteps.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-4"
                  >
                    <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center font-bold text-xs text-emerald-400 shrink-0">
                      {step.stepNumber}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white">{step.title}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/50 font-medium">
                          {step.skillType.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-white/60 mt-1 leading-relaxed">{step.description}</p>
                      <div className="mt-2 text-[11px] text-emerald-400/90 font-medium flex items-center gap-1.5">
                        <span>Action: {step.actionItem}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MARKET BENCHMARKS */}
        {activeTab === 'market' && marketBenchmarks && (
          <div className="space-y-6">
            {/* Observation Window & Provenance Header */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-semibold text-white/90">
                    {marketBenchmarks.observationWindow || 'Infrastructure Market Intelligence'}
                  </span>
                </div>
                <span className="text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  Population: {marketBenchmarks.population || `${marketBenchmarks.totalActiveJobs} active jobs`}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] text-white/50 pt-2 border-t border-white/[0.06]">
                <div>
                  <span className="text-white/30 block uppercase tracking-wider text-[10px]">Source</span>
                  {marketBenchmarks.source || 'Zeitnah Infrastructure Network Platform'}
                </div>
                <div>
                  <span className="text-white/30 block uppercase tracking-wider text-[10px]">Observation Period</span>
                  {marketBenchmarks.observationPeriod || 'Previous 90 days'}
                </div>
                <div>
                  <span className="text-white/30 block uppercase tracking-wider text-[10px]">Calculation Method</span>
                  {marketBenchmarks.calculationMethod || 'Percentile aggregation of active postings'}
                </div>
              </div>
              {marketBenchmarks.disclaimer && (
                <p className="text-[11px] text-white/40 italic pt-1">
                  Note: {marketBenchmarks.disclaimer}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Software Demand */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" /> Top Requested Software
                </h4>
                <p className="text-xs text-white/50 mb-4">Frequency in currently published infrastructure openings.</p>

                <div className="space-y-3">
                  {marketBenchmarks.softwareDemand.map((sw, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">{sw.softwareName}</span>
                        <span className="text-white/50">{sw.percentage}% of jobs ({sw.frequency})</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-cyan-400 h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, sw.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skill Demand */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" /> High-Demand Technical Skills
                </h4>
                <p className="text-xs text-white/50 mb-4">Competencies most frequently required by EPC employers.</p>

                <div className="space-y-3">
                  {marketBenchmarks.skillDemand.map((sk, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">{sk.skillName}</span>
                        <span className="text-white/50">{sk.percentage}% of jobs ({sk.frequency})</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-400 h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, sk.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* In-Demand Roles */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-purple-400" /> Active Role Hiring Volume
                </h4>
                <p className="text-xs text-white/50 mb-4">Current open positions on Zeitnah.</p>

                <div className="space-y-2.5">
                  {marketBenchmarks.roleDemand.map((r, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white/[0.01] border border-white/[0.06] flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-white">{r.roleTitle}</span>
                      <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-medium">
                        {r.activeJobCount} openings
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Geographic Distribution */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-400" /> Opportunities by Location
                </h4>
                <p className="text-xs text-white/50 mb-4">Job volume across primary infrastructure corridors.</p>

                <div className="space-y-2.5">
                  {marketBenchmarks.locationDemand.map((loc, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white/[0.01] border border-white/[0.06] flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-white">{loc.location}</span>
                      <span className="text-white/60 font-medium">{loc.count} jobs</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: AI CAREER ASSISTANT */}
        {activeTab === 'assistant' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.08]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">AI Career Assistant</h3>
                  <p className="text-xs text-white/50">
                    Factual, grounded career decision support based on your verified profile and active Zeitnah jobs.
                  </p>
                </div>
              </div>

              {/* Prompt Suggestions */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/[0.06]">
                <span className="text-[11px] text-white/40 self-center">Try asking:</span>
                {[
                  'What skills should I strengthen for planning roles?',
                  'Which of my projects demonstrate planning experience?',
                  'What details are missing from my profile?',
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendAssistantQuery(prompt)}
                    className="text-[11px] px-3 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white/80 transition"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="space-y-4">
              {assistantMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl border ${
                    msg.sender === 'user'
                      ? 'bg-emerald-500/10 border-emerald-500/20 ml-12'
                      : 'bg-white/[0.02] border-white/[0.08] mr-12'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                      {msg.sender === 'user' ? 'You' : 'Zeitnah Career Assistant'}
                    </span>
                  </div>
                  <p className="text-xs text-white/90 leading-relaxed whitespace-pre-line">{msg.text}</p>

                  {/* Profile and Market Citations */}
                  {msg.profileRefs && msg.profileRefs.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06] flex flex-wrap gap-2 items-center">
                      <span className="text-[10px] uppercase font-bold text-white/40">Profile Evidence:</span>
                      {msg.profileRefs.map((ref, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/70">
                          {ref}
                        </span>
                      ))}
                    </div>
                  )}

                  {msg.marketRefs && msg.marketRefs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 items-center">
                      <span className="text-[10px] uppercase font-bold text-white/40">Market Grounding:</span>
                      {msg.marketRefs.map((ref, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300">
                          {ref}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action items */}
                  {msg.actionItems && msg.actionItems.length > 0 && (
                    <div className="mt-3 pt-2 flex flex-wrap gap-2">
                      {msg.actionItems.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendAssistantQuery(action)}
                          className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition font-medium"
                        >
                          → {action}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {assistantLoading && (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] mr-12 text-xs text-white/50 animate-pulse flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border border-emerald-400 border-t-transparent animate-spin" />
                  Grounded assistant is analyzing your profile and active job data...
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-2 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-2">
              <input
                type="text"
                value={assistantInput}
                onChange={(e) => setAssistantInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendAssistantQuery()}
                placeholder="Ask about required skills, project evidence, or software for roles..."
                className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none"
              />
              <button
                onClick={() => handleSendAssistantQuery()}
                disabled={!assistantInput.trim() || assistantLoading}
                className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 text-black transition"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: CHANGE TARGET ROLE ────────────────────────────────────────── */}
      {showTargetModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#0c1222] border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Set Target Career Goal</h3>
              <button
                onClick={() => setShowTargetModal(false)}
                className="p-1 rounded-lg text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-white/50 mb-4">
              Select the primary infrastructure role you are aiming for. Career Intelligence and Jobs For You will tailor skill gap recommendations to this target.
            </p>

            <form onSubmit={handleSaveTargetRoles} className="space-y-4">
              <div>
                <label className="text-xs text-white/70 font-medium block mb-1.5">Primary Target Role</label>
                <select
                  value={newPrimaryRole}
                  onChange={(e) => setNewPrimaryRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {roleAlignments.map((r) => (
                    <option key={r.roleId} value={r.roleTitle} className="bg-[#0b1120]">
                      {r.roleTitle} ({r.discipline})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTargetModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refreshing}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-black text-xs font-semibold hover:bg-emerald-400 transition"
                >
                  {refreshing ? 'Saving...' : 'Save Target Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
