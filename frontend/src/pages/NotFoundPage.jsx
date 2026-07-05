import { motion } from 'framer-motion';
import { ArrowLeft, Home, BookOpen, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center relative overflow-hidden px-6">
      {/* Ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-brand-mint/4 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-brand-yellow/3 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative text-center max-w-lg mx-auto"
      >
        {/* Large 404 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="mb-8"
        >
          <span className="text-gradient font-heading font-extrabold text-[120px] sm:text-[160px] leading-none select-none">
            404
          </span>
        </motion.div>

        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight mb-3">
          Page Not Found
        </h1>
        <p className="text-sm font-medium text-text-muted leading-relaxed mb-8 max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn-primary py-3 px-6 w-full sm:w-auto"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </button>
          <button
            type="button"
            onClick={() => navigate('/courses')}
            className="btn-secondary py-3 px-6 w-full sm:w-auto"
          >
            <BookOpen className="w-4 h-4" />
            Browse Courses
          </button>
        </div>

        {/* Back link */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-brand-mint transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Go Back
        </button>
      </motion.div>
    </div>
  );
}
