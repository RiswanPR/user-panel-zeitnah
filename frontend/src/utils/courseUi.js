const apiBaseUrl =
  // import.meta.env.VITE_API_BASE_URL || "https://api.your-domain.com/api";
  import.meta.env.VITE_API_BASE_URL || "http://<SERVER_IP>:3000/api";

const uploadBaseUrl = apiBaseUrl.replace(/\/api\/?$/, "");
const bunnyLibraryId = import.meta.env.VITE_BUNNY_LIBRARY_ID?.trim();

export function getUploadUrl(path) {
  if (!path) {
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

export function getCourseTypeLabel(type) {
  return (type || "").toLowerCase() === "recording"
    ? "Studio Class"
    : "Zoom Recording";
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
