import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Globe, User, ShieldCheck } from 'lucide-react';
import { useCommunityProfile } from '../../hooks/useCommunityProfile';
import CoverBanner from '../../components/community/profile/CoverBanner';
import ProfileHeader from '../../components/community/profile/ProfileHeader';
import AboutCard from '../../components/community/profile/AboutCard';
import AnalyticsCard from '../../components/community/profile/AnalyticsCard';
import SkillsCard from '../../components/community/profile/SkillsCard';
import ProjectCard from '../../components/community/profile/ProjectCard';
import ExperienceCard from '../../components/community/profile/ExperienceCard';
import EducationCard from '../../components/community/profile/EducationCard';
import CertificatesCard from '../../components/community/profile/CertificatesCard';
import ActivityCard from '../../components/community/profile/ActivityCard';
import EditProfileModal from '../../components/community/profile/EditProfileModal';
import UploadResumeModal from '../../components/community/profile/UploadResumeModal';
import AddEditModal from '../../components/community/profile/AddEditModal';
import FollowersCard from '../../components/community/profile/FollowersCard';
import ProfileNav from '../../components/profile/ProfileNav';
import EmptyState from '../../components/ui/EmptyState';

export default function ProfilePage() {
  const { username } = useParams();
  const {
    profile,
    skills,
    projects,
    experiences,
    educations,
    certificates,
    isFollowing,
    isOwnProfile,
    loading,
    error,
    refreshProfile,
    updateProfile,
    addSkill,
    deleteSkill,
    addProject,
    deleteProject,
    addExperience,
    deleteExperience,
    addEducation,
    deleteEducation,
    addCertificate,
    deleteCertificate,
  } = useCommunityProfile(username);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [followersModalState, setFollowersModalState] = useState({
    isOpen: false,
    tab: 'followers',
  });
  const [addModalState, setAddModalState] = useState({
    isOpen: false,
    type: null,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base text-white p-4 sm:p-6 space-y-6 animate-pulse max-w-7xl mx-auto">
        <div className="w-full h-14 bg-bg-card rounded-2xl border border-border-default" />
        <div className="w-full h-64 bg-bg-card rounded-3xl border border-border-default" />
        <div className="w-full h-44 bg-bg-card rounded-3xl border border-border-default" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-bg-card rounded-3xl border border-border-default lg:col-span-1" />
          <div className="h-96 bg-bg-card rounded-3xl border border-border-default lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 bg-bg-base text-white max-w-7xl mx-auto">
        <EmptyState
          icon={User}
          title="Student Portfolio Not Found"
          description={error || "The requested student profile could not be found or does not exist."}
          action={() => (window.location.href = "/community")}
          actionLabel="Return to Community Feed"
        />
      </div>
    );
  }

  const handleAddSubmit = async (formData) => {
    switch (addModalState.type) {
      case 'skill':
        await addSkill(formData);
        break;
      case 'project':
        await addProject(formData);
        break;
      case 'experience':
        await addExperience(formData);
        break;
      case 'education':
        await addEducation(formData);
        break;
      case 'certificate':
        await addCertificate(formData);
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-bg-base text-white pb-20 selection:bg-brand-mint selection:text-black">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation & Context Banner */}
        {isOwnProfile ? (
          <div className="space-y-4">
            <ProfileNav />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-brand-mint/8 border border-brand-mint/20 text-xs font-medium text-brand-mint">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-brand-mint shrink-0" />
                <span>
                  Public Professional Portfolio · This page is visible to peer students and instructors.
                </span>
              </div>
              <Link
                to="/profile"
                className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-brand-mint hover:underline shrink-0"
              >
                <User className="w-3.5 h-3.5" />
                Manage Account Hub
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between py-2">
            <Link
              to="/community"
              className="btn-secondary text-xs uppercase tracking-wider inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Community
            </Link>
            <span className="text-xs text-text-muted font-medium">
              Student Public Profile
            </span>
          </div>
        )}

        {/* Cover Banner */}
        <CoverBanner
          coverUrl={profile.coverBanner}
          isOwnProfile={isOwnProfile}
          onCoverUpdated={refreshProfile}
        />

        {/* Profile Header */}
        <ProfileHeader
          profile={profile}
          isOwnProfile={isOwnProfile}
          isFollowing={isFollowing}
          onOpenEditModal={() => setIsEditModalOpen(true)}
          onOpenFollowersModal={(tab) =>
            setFollowersModalState({ isOpen: true, tab })
          }
          onAvatarUpdated={refreshProfile}
        />

        {/* Main Grid Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-1 sm:px-2">
          {/* Left Column: About, Analytics, Skills */}
          <div className="space-y-6 lg:col-span-1">
            <AboutCard
              bio={profile.bio}
              socialLinks={profile.socialLinks}
              resumeUrl={profile.resumeUrl}
              completionPercentage={profile.completionPercentage}
              isOwnProfile={isOwnProfile}
              onOpenUploadResume={() => setIsResumeModalOpen(true)}
            />

            <AnalyticsCard profile={profile} />

            <SkillsCard
              skills={skills}
              isOwnProfile={isOwnProfile}
              onOpenAddSkillModal={() =>
                setAddModalState({ isOpen: true, type: 'skill' })
              }
              onDeleteSkill={deleteSkill}
            />
          </div>

          {/* Right Column: Portfolio Projects, Experience, Education, Certificates, Activity */}
          <div className="space-y-6 lg:col-span-2">
            <ProjectCard
              projects={projects}
              isOwnProfile={isOwnProfile}
              onOpenAddProjectModal={() =>
                setAddModalState({ isOpen: true, type: 'project' })
              }
              onDeleteProject={deleteProject}
            />

            <ExperienceCard
              experiences={experiences}
              isOwnProfile={isOwnProfile}
              onOpenAddExperienceModal={() =>
                setAddModalState({ isOpen: true, type: 'experience' })
              }
              onDeleteExperience={deleteExperience}
            />

            <EducationCard
              educations={educations}
              isOwnProfile={isOwnProfile}
              onOpenAddEducationModal={() =>
                setAddModalState({ isOpen: true, type: 'education' })
              }
              onDeleteEducation={deleteEducation}
            />

            <CertificatesCard
              certificates={certificates}
              isOwnProfile={isOwnProfile}
              onOpenAddCertificateModal={() =>
                setAddModalState({ isOpen: true, type: 'certificate' })
              }
              onDeleteCertificate={deleteCertificate}
            />

            <ActivityCard />
          </div>
        </div>
      </div>

      {/* Modals */}
      {isOwnProfile && (
        <>
          <EditProfileModal
            profile={profile}
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSave={updateProfile}
          />

          <UploadResumeModal
            resumeUrl={profile.resumeUrl}
            isOpen={isResumeModalOpen}
            onClose={() => setIsResumeModalOpen(false)}
            onResumeUpdated={refreshProfile}
          />

          <AddEditModal
            type={addModalState.type}
            isOpen={addModalState.isOpen}
            onClose={() => setAddModalState({ isOpen: false, type: null })}
            onSubmit={handleAddSubmit}
          />
        </>
      )}

      <FollowersCard
        userId={profile.userId}
        initialTab={followersModalState.tab}
        isOpen={followersModalState.isOpen}
        onClose={() => setFollowersModalState({ isOpen: false, tab: 'followers' })}
      />
    </div>
  );
}
