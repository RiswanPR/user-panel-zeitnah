import { useState, useEffect, useCallback } from 'react';
import { profileApi } from '../services/profileApi';
import toast from 'react-hot-toast';

export function useCommunityProfile(username = null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let res;
      if (username) {
        res = await profileApi.getProfileByUsername(username);
        setIsOwnProfile(false);
      } else {
        res = await profileApi.getMyProfile();
        setIsOwnProfile(true);
      }
      setData(res);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError(err.response?.data?.message || 'Failed to load profile');
      toast.error('Failed to load profile details');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (formData) => {
    try {
      const updated = await profileApi.updateProfile(formData);
      setData((prev) => ({
        ...prev,
        profile: updated,
      }));
      toast.success('Profile updated successfully!');
      return updated;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
      throw err;
    }
  };

  const addSkill = async (skillData) => {
    try {
      const newSkill = await profileApi.addSkill(skillData);
      setData((prev) => ({
        ...prev,
        skills: [...(prev?.skills || []), newSkill],
      }));
      toast.success('Skill added!');
      fetchProfile(); // refresh completion score
      return newSkill;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add skill');
      throw err;
    }
  };

  const deleteSkill = async (skillId) => {
    try {
      await profileApi.deleteSkill(skillId);
      setData((prev) => ({
        ...prev,
        skills: prev.skills.filter((s) => s._id !== skillId),
      }));
      toast.success('Skill deleted');
      fetchProfile();
    } catch (err) {
      toast.error('Failed to delete skill');
    }
  };

  const addProject = async (projData) => {
    try {
      const newProj = await profileApi.addProject(projData);
      setData((prev) => ({
        ...prev,
        projects: [newProj, ...(prev?.projects || [])],
      }));
      toast.success('Project added to portfolio!');
      fetchProfile();
      return newProj;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add project');
      throw err;
    }
  };

  const deleteProject = async (projectId) => {
    try {
      await profileApi.deleteProject(projectId);
      setData((prev) => ({
        ...prev,
        projects: prev.projects.filter((p) => p._id !== projectId),
      }));
      toast.success('Project removed');
      fetchProfile();
    } catch (err) {
      toast.error('Failed to delete project');
    }
  };

  const addExperience = async (expData) => {
    try {
      const newExp = await profileApi.addExperience(expData);
      setData((prev) => ({
        ...prev,
        experiences: [newExp, ...(prev?.experiences || [])],
      }));
      toast.success('Experience added!');
      fetchProfile();
      return newExp;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add experience');
      throw err;
    }
  };

  const deleteExperience = async (expId) => {
    try {
      await profileApi.deleteExperience(expId);
      setData((prev) => ({
        ...prev,
        experiences: prev.experiences.filter((e) => e._id !== expId),
      }));
      toast.success('Experience entry deleted');
      fetchProfile();
    } catch (err) {
      toast.error('Failed to delete experience');
    }
  };

  const addEducation = async (eduData) => {
    try {
      const newEdu = await profileApi.addEducation(eduData);
      setData((prev) => ({
        ...prev,
        educations: [newEdu, ...(prev?.educations || [])],
      }));
      toast.success('Education entry added!');
      fetchProfile();
      return newEdu;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add education');
      throw err;
    }
  };

  const deleteEducation = async (eduId) => {
    try {
      await profileApi.deleteEducation(eduId);
      setData((prev) => ({
        ...prev,
        educations: prev.educations.filter((e) => e._id !== eduId),
      }));
      toast.success('Education entry deleted');
      fetchProfile();
    } catch (err) {
      toast.error('Failed to delete education');
    }
  };

  const addCertificate = async (certData) => {
    try {
      const newCert = await profileApi.addCertificate(certData);
      setData((prev) => ({
        ...prev,
        certificates: [newCert, ...(prev?.certificates || [])],
      }));
      toast.success('Certificate added!');
      fetchProfile();
      return newCert;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add certificate');
      throw err;
    }
  };

  const deleteCertificate = async (certId) => {
    try {
      await profileApi.deleteCertificate(certId);
      setData((prev) => ({
        ...prev,
        certificates: prev.certificates.filter((c) => c._id !== certId),
      }));
      toast.success('Certificate removed');
      fetchProfile();
    } catch (err) {
      toast.error('Failed to delete certificate');
    }
  };

  return {
    profile: data?.profile,
    skills: data?.skills || [],
    projects: data?.projects || [],
    experiences: data?.experiences || [],
    educations: data?.educations || [],
    certificates: data?.certificates || [],
    isFollowing: data?.isFollowing || false,
    isOwnProfile,
    loading,
    error,
    refreshProfile: fetchProfile,
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
  };
}
