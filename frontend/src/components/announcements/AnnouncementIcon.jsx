import {
  AlertOctagon,
  AlertCircle,
  Clock,
  Sparkles,
  GraduationCap,
  BookOpen,
  Zap,
  Calendar,
  Bell,
} from "lucide-react";

export default function AnnouncementIcon({ type, className = "w-4 h-4" }) {
  switch (type) {
    case "critical":
      return <AlertOctagon className={className} />;
    case "maintenance":
      return <Clock className={className} />;
    case "important":
      return <AlertCircle className={className} />;
    case "platform":
      return <Sparkles className={className} />;
    case "course":
      return <GraduationCap className={className} />;
    case "content":
      return <BookOpen className={className} />;
    case "feature":
      return <Zap className={className} />;
    case "event":
      return <Calendar className={className} />;
    case "general":
    default:
      return <Bell className={className} />;
  }
}
