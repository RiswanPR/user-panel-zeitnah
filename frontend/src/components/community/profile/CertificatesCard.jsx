import React from 'react';
import { motion } from 'framer-motion';
import { Award, ExternalLink, Plus, Trash2, Calendar } from 'lucide-react';
import dayjs from 'dayjs';

export default function CertificatesCard({
  certificates = [],
  isOwnProfile,
  onOpenAddCertificateModal,
  onDeleteCertificate,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          <span>Certificates & Badges</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
            {certificates.length}
          </span>
        </h2>

        {isOwnProfile && (
          <button
            onClick={onOpenAddCertificateModal}
            className="flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-full border border-amber-500/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Certificate</span>
          </button>
        )}
      </div>

      {certificates.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {certificates.map((cert) => (
            <div
              key={cert._id || cert.title}
              className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex items-start gap-4 shadow-md group relative hover:border-amber-500/40 transition-all"
            >
              {cert.certificateImage ? (
                <img
                  src={cert.certificateImage}
                  alt={cert.title}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-800 flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <Award className="w-6 h-6" />
                </div>
              )}

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-1">
                  <h3 className="text-sm font-bold text-white truncate">
                    {cert.title}
                  </h3>
                  {isOwnProfile && onDeleteCertificate && (
                    <button
                      onClick={() => onDeleteCertificate(cert._id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity p-0.5"
                      title="Delete Certificate"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-xs font-medium text-amber-300/80">
                  {cert.issuingOrganization}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                  {cert.issueDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      Issued {dayjs(cert.issueDate).format('MMM YYYY')}
                    </span>
                  )}

                  {cert.credentialUrl && (
                    <a
                      href={cert.credentialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-indigo-400 hover:underline font-semibold"
                    >
                      <span>Verify</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic">
          {isOwnProfile
            ? 'Add professional certifications (AWS, Google, Coursera, Hackathons)!'
            : 'No certificates added.'}
        </p>
      )}
    </motion.div>
  );
}
