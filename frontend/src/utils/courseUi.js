const apiBaseUrl =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:3000/api"
    : "https://zeitnahacademy.com/api");

const uploadBaseUrl = apiBaseUrl.replace(/\/api\/?$/, "");
const bunnyLibraryId = (typeof import.meta !== "undefined" && import.meta.env?.VITE_BUNNY_LIBRARY_ID)?.trim();

export function getUploadUrl(path) {
  if (!path) {
    return null;
  }

  if (typeof path === "object" && path !== null) {
    path = path.url || path.path || path.src || "";
    if (!path) return null;
  }

  if (typeof path !== "string") {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${uploadBaseUrl}/uploads/${path}`;
}

export function formatDuration(duration) {
  if (!duration) {
    return "Self paced";
  }

  const value = String(duration).trim();

  if (/^\d+$/.test(value)) {
    const totalSeconds = Number.parseInt(value, 10);

    if (totalSeconds < 60) {
      return `${totalSeconds} sec`;
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      return minutes > 0
        ? `${hours} hr ${minutes} min`
        : `${hours} hr`;
    }

    return `${minutes} min`;
  }

  return value;
}

export function parseDurationToSeconds(duration) {
  if (!duration) return 0;
  if (typeof duration === "number") return duration;
  const value = String(duration).trim();
  if (/^\d+$/.test(value)) return Number.parseInt(value, 10);

  const parts = value.split(":").map((p) => Number.parseInt(p, 10) || 0);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  const hourMatch = value.match(/(\d+)\s*h/i);
  const minMatch = value.match(/(\d+)\s*m/i);
  const secMatch = value.match(/(\d+)\s*s/i);
  if (hourMatch || minMatch || secMatch) {
    const hours = hourMatch ? Number.parseInt(hourMatch[1], 10) : 0;
    const mins = minMatch ? Number.parseInt(minMatch[1], 10) : 0;
    const secs = secMatch ? Number.parseInt(secMatch[1], 10) : 0;
    return hours * 3600 + mins * 60 + secs;
  }

  return 0;
}

export function getCourseTypeLabel(type) {
  return (type || "").toLowerCase() === "recording"
    ? "Recording Class"
    : "Online Class";
}

export function getClassVideoSource(courseType, videoSource) {
  const explicitSource = String(videoSource || "").trim().toLowerCase();

  if (explicitSource === "s3" || explicitSource === "aws") {
    return "s3";
  }

  if (explicitSource === "vdocipher" || explicitSource === "vdo") {
    return "vdocipher";
  }

  return String(courseType || "").trim().toLowerCase() === "recording"
    ? "s3"
    : "vdocipher";
}

export function getVdoCipherEmbedUrl(vdoCipher) {
  if (!vdoCipher) {
    return null;
  }

  if (typeof vdoCipher === "string" && vdoCipher.startsWith("http")) {
    return vdoCipher;
  }

  if (
    !vdoCipher?.otp ||
    !vdoCipher?.playbackInfo
  ) {
    return null;
  }

  const params = new URLSearchParams({
    otp: vdoCipher.otp,
    playbackInfo: vdoCipher.playbackInfo,
  });

  return `https://player.vdocipher.com/v2/?${params.toString()}`;
}

export function getBunnyEmbedUrl(videoReference) {
  if (!videoReference) {
    return null;
  }

  const value = String(videoReference).trim();

  if (!value) {
    return null;
  }

  const match =
    value.match(/(?:embed|play)\/([^/?#]+)\/([^/?#]+)/i) ||
    value.match(/^([^/?#]+)\/([^/?#]+)$/);

  if (match) {
    const [, libraryId, videoId] = match;
    return `https://player.mediadelivery.net/embed/${libraryId}/${videoId}`;
  }

  if (bunnyLibraryId) {
    return `https://player.mediadelivery.net/embed/${bunnyLibraryId}/${value}`;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://iframe.mediadelivery.net/play/${value}`;
}
