/**
 * Official Zeitnah Brand Configuration — Single Source of Truth
 *
 * Brand Name: Zeitnah
 * Tagline: See the unseen
 * Vision: Build, connect, discover
 * Mission: To build the best global civil community where people can enjoy progress, network, opportunities, and success through the freedom of knowledge.
 */

export const BRAND = Object.freeze({
  name: "Zeitnah",
  tagline: "See the unseen",
  vision: "Build, connect, discover",
  mission:
    "To build the best global civil community where people can enjoy progress, network, opportunities, and success through the freedom of knowledge.",
  summary:
    "Zeitnah — See the unseen. Build, connect, discover through knowledge, community, and opportunity.",
  seo: {
    title: "Zeitnah — See the unseen",
    description:
      "Zeitnah — See the unseen. Build, connect, discover through knowledge, community, and opportunity.",
    openGraph: {
      type: "website",
      title: "Zeitnah — See the unseen",
      description:
        "Build, connect, discover across a global civil community enjoying progress, network, and opportunities through the freedom of knowledge.",
      siteName: "Zeitnah",
      image: "/icons/icon-512.png",
    },
    twitter: {
      card: "summary_large_image",
      title: "Zeitnah — See the unseen",
      description:
        "Build, connect, discover across a global civil community enjoying progress, network, and opportunities through the freedom of knowledge.",
      image: "/icons/icon-512.png",
    },
  },
  pillars: {
    build: {
      title: "Build",
      tagline: "Construct durable capabilities and careers",
      items: [
        "knowledge",
        "skills",
        "projects",
        "careers",
        "communities",
      ],
      description:
        "Empowering individuals to engineer lasting skills, launch ambitious projects, and establish resilient career trajectories.",
    },
    connect: {
      title: "Connect",
      tagline: "Bridge peers, mentors, and global industry",
      items: [
        "people",
        "students",
        "educators",
        "organizations",
        "opportunities",
      ],
      description:
        "Linking ambitious practitioners, forward-thinking mentors, academic leaders, and high-impact engineering enterprises.",
    },
    discover: {
      title: "Discover",
      tagline: "Uncover unseen pathways and breakthrough ideas",
      items: [
        "knowledge",
        "opportunities",
        "communities",
        "ideas",
        "possibilities",
      ],
      description:
        "Revealing hidden opportunities, open architectural knowledge, and transformative frontiers across the civil landscape.",
    },
  },
  ecosystem: {
    community: "Global Civil Community",
    foundation: "Freedom of Knowledge",
    outcomes: ["Progress", "Network", "Opportunities", "Success"],
  },
});

export default BRAND;
