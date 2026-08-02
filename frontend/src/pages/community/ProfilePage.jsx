import React, { useState } from 'react';
import { useParams } from 'react';
import { motion } from 'framer-motion';
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
      <div className="min-h-screen bg-slate-950 text-white p-6 space-y-6 animate-pulse max-w-7xl mx-auto">
        <div className="w-full h-64 bg-slate-900 rounded-3xl" />
        <div className="w-full h-40 bg-slate-900 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-60 bg-slate-900 rounded-3xl" />
          <div className="h-60 bg-slate-900 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 bg-slate-950 text-white">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4 text-xl font-bold">
          !
        </div>
        <h2 className="text-2xl font-bold mb-2">Profile Not Found</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          {error || "The requested community profile could not be found or doesn't exist."}
        </p>
        <a
          href="/community"
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
        >
          Return to Community Feed
        </a>
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
    <div className="min-h-screen bg-slate-950 text-white pb-20 selection:bg-indigo-500 selection:text-white">
      <div className="max-w-7xl mx-auto space-y-6">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-3 sm:px-6">
          {/* Left Column: About & Analytics */}
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

      {/* MODALS */}
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
