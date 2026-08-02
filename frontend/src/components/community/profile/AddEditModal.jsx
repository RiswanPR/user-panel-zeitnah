import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Save, Upload } from 'lucide-react';
import { profileApi } from '../../../services/profileApi';
import toast from 'react-hot-toast';

export default function AddEditModal({
  type, // 'skill' | 'project' | 'experience' | 'education' | 'certificate'
  isOpen,
  onClose,
  onSubmit,
}) {
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: inputType === 'checkbox' ? checked : value,
    }));
  };

  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setUploadingMedia(true);
      const uploadedUrls = [];
      for (const file of files) {
        const data = new FormData();
        data.append('file', file);
        const res = await profileApi.uploadMedia(data);
        uploadedUrls.push(res.url);
      }
      setFormData((prev) => ({
        ...prev,
        mediaUrls: [...(prev.mediaUrls || []), ...uploadedUrls],
      }));
      toast.success('Media uploaded!');
    } catch (err) {
      toast.error('Failed to upload project media asset');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await onSubmit(formData);
      onClose();
    } catch (err) {
      // error handled by parent hook
    } finally {
      setSubmitting(false);
    }
  };

  const titles = {
    skill: 'Add New Technical Skill',
    project: 'Add Featured Project / Portfolio',
    experience: 'Add Work Experience',
    education: 'Add Educational Background',
    certificate: 'Add Professional Certificate',
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white">
              {titles[type] || 'Add Section'}
            </h2>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {/* SKILL FORM */}
            {type === 'skill' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Skill Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. React, NestJS, Docker, PyTorch"
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      name="category"
                      placeholder="Frontend, Backend, AI"
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Proficiency Level
                    </label>
                    <select
                      name="proficiencyLevel"
                      onChange={handleChange}
                      defaultValue="Intermediate"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* PROJECT FORM */}
            {type === 'project' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Project Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="Zeitnah Social Platform"
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    placeholder="Short description of technical architecture & key features..."
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      GitHub URL
                    </label>
                    <input
                      type="url"
                      name="githubUrl"
                      placeholder="https://github.com/org/repo"
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Live Demo URL
                    </label>
                    <input
                      type="url"
                      name="liveDemoUrl"
                      placeholder="https://zeitnah.app"
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tech Stack / Tags (Comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="React, NestJS, MongoDB, WebSockets"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        tags: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Upload Screenshots/Video */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Project Screenshots / Demo Videos
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/mp4"
                    onChange={handleMediaUpload}
                    className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer"
                  />
                  {uploadingMedia && (
                    <span className="text-[11px] text-indigo-400 mt-1 block">
                      Uploading assets to S3...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="featured"
                    name="featured"
                    onChange={handleChange}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                  />
                  <label
                    htmlFor="featured"
                    className="text-xs text-slate-300 font-medium"
                  >
                    Feature this project on top of portfolio
                  </label>
                </div>
              </>
            )}

            {/* EXPERIENCE FORM */}
            {type === 'experience' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Company / Organization
                    </label>
                    <input
                      type="text"
                      name="company"
                      required
                      placeholder="Google"
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Role / Position
                    </label>
                    <input
                      type="text"
                      name="role"
                      required
                      placeholder="Software Engineer Intern"
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      required
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      disabled={formData.isCurrent}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white disabled:opacity-40 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isCurrent"
                    name="isCurrent"
                    onChange={handleChange}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                  />
                  <label
                    htmlFor="isCurrent"
                    className="text-xs text-slate-300 font-medium"
                  >
                    I currently work here
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    placeholder="Key responsibilities & accomplishments..."
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
              </>
            )}

            {/* EDUCATION FORM */}
            {type === 'education' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Institution / University
                  </label>
                  <input
                    type="text"
                    name="institution"
                    required
                    placeholder="NIT Calicut"
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Degree
                    </label>
                    <input
                      type="text"
                      name="degree"
                      required
                      placeholder="Bachelor of Technology"
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Field of Study
                    </label>
                    <input
                      type="text"
                      name="fieldOfStudy"
                      placeholder="Computer Science & Engineering"
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      required
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Grade / CGPA
                  </label>
                  <input
                    type="text"
                    name="grade"
                    placeholder="8.8 CGPA"
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </>
            )}

            {/* CERTIFICATE FORM */}
            {type === 'certificate' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Certificate Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="AWS Certified Developer"
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Issuing Organization
                  </label>
                  <input
                    type="text"
                    name="issuingOrganization"
                    required
                    placeholder="Amazon Web Services"
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Issue Date
                    </label>
                    <input
                      type="date"
                      name="issueDate"
                      required
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Credential Verification URL
                    </label>
                    <input
                      type="url"
                      name="credentialUrl"
                      placeholder="https://aws.amazon.com/verify"
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg transition-all"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{submitting ? 'Saving...' : 'Add Entry'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
