export const INFRASTRUCTURE_DISCIPLINES = [
  "Civil Engineering",
  "Structural Engineering",
  "Architecture",
  "Construction",
  "Project Management",
  "Quantity Surveying",
  "BIM",
  "MEP",
  "Geotechnical Engineering",
  "Transportation",
  "Surveying",
  "Planning & Scheduling",
  "Estimation & Costing",
  "Site Engineering",
  "Safety / HSE",
  "Contracts & Procurement",
  "Infrastructure Consultancy",
];

export const INFRASTRUCTURE_SECTORS = [
  "Buildings",
  "Highways",
  "Roads",
  "Bridges",
  "Railways",
  "Metro",
  "Water & Wastewater",
  "Urban Infrastructure",
  "Industrial Infrastructure",
  "Ports",
  "Airports",
  "Energy Infrastructure",
  "Real Estate Development",
];

export const INFRASTRUCTURE_SOFTWARE = [
  "AutoCAD",
  "Civil 3D",
  "Revit",
  "Navisworks",
  "Primavera P6",
  "MS Project",
  "STAAD.Pro",
  "ETABS",
  "SAP2000",
  "Tekla",
  "GIS",
  "CostX",
  "Synchro 4D",
  "Bluebeam Revu",
  "OpenRoads",
  "Infraworks",
  "MicroStation",
];

export const PROFILE_ROLES = [
  { value: "STUDENT", label: "Student", description: "Studying civil, structural, BIM, architecture, or infrastructure disciplines." },
  { value: "PROFESSIONAL", label: "Professional", description: "Currently working in infrastructure engineering or construction." },
  { value: "MENTOR", label: "Mentor", description: "Experienced infrastructure leader guiding emerging talent." },
  { value: "RECRUITER", label: "Recruiter", description: "Hiring talent for infrastructure, AEC, EPC, and engineering firms." },
  { value: "FOUNDER", label: "Founder", description: "Founder of an infrastructure, construction, or AEC startup/enterprise." },
  { value: "EDUCATOR", label: "Educator", description: "Faculty or institutional trainer (Assigned by Zeitnah administrators only).", adminOnly: true },
];

export const USER_SELECTABLE_ROLES = PROFILE_ROLES.filter((r) => !r.adminOnly);

export const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Freelance",
];

export const AVAILABILITY_OPTIONS = [
  { value: "NOT_CURRENTLY_AVAILABLE", label: "Not Currently Available" },
  { value: "OPEN_TO_OPPORTUNITIES", label: "Open to Opportunities" },
  { value: "AVAILABLE_FOR_MENTORSHIP", label: "Available for Mentorship" },
  { value: "AVAILABLE_FOR_COLLABORATION", label: "Available for Collaboration" },
];

export const VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "Public (Everyone)" },
  { value: "NETWORK", label: "Network Only (Connections)" },
  { value: "PRIVATE", label: "Private (Only You)" },
];

export const DISCIPLINE_SPECIALIZATIONS = {
  "Civil Engineering": ["Highway Engineering", "Geotechnical Site Investigation", "Drainage Systems", "Earthworks", "Urban Infrastructure"],
  "Structural Engineering": ["Reinforced Concrete Design", "Steel Structures", "High-Rise Design", "Bridge Engineering", "Seismic Analysis"],
  "Architecture": ["Architectural Concept Design", "Façade Engineering", "Sustainable Architecture", "Urban Planning", "Interior Architecture"],
  "Construction": ["Site Supervision", "Construction Methods", "Subcontractor Coordination", "Heavy Equipment Management", "Constructability Reviews"],
  "Project Management": ["Project Controls", "Earned Value Management", "Resource Leveling", "Critical Path Method", "Project Risk Management"],
  "Quantity Surveying": ["Bill of Quantities (BOQ)", "Cost Estimation", "Variation Claims", "Interim Valuations", "Rate Analysis"],
  "BIM": ["4D Construction Simulation", "5D Cost Integration", "Clash Detection", "BIM Execution Plans (BEP)", "Revit Family Creation"],
  "MEP": ["HVAC Design", "Fire Protection Systems", "Electrical Distribution", "Plumbing & Public Health", "Building Management Systems (BMS)"],
  "Geotechnical Engineering": ["Deep Foundation Design", "Slope Stability", "Soil Mechanics", "Retaining Structures", "Ground Improvement"],
  "Transportation": ["Traffic Modeling", "Geometric Road Design", "Pavement Design", "Transit Planning", "Intersection Design"],
  "Surveying": ["Total Station Surveying", "GPS/GNSS Geodesy", "Topographic Mapping", "Drone Photogrammetry", "LiDAR Data Processing"],
  "Planning & Scheduling": ["Primavera P6 Scheduling", "Baseline Program Preparation", "Delay Analysis (EOT)", "Milestone Tracking", "Resource Scheduling"],
  "Estimation & Costing": ["Pre-tender Estimation", "Material Takeoffs (MTO)", "Unit Costing", "Subcontractor Bid Analysis", "Value Engineering"],
  "Site Engineering": ["Daily Site Inspection", "Bar Bending Schedules (BBS)", "Concrete Pour Management", "Survey Verification", "Setting Out"],
  "Safety / HSE": ["OSHA Compliance", "Site Safety Audits", "Toolbox Talks", "Hazard Identification (HAZID)", "Environmental Management"],
  "Contracts & Procurement": ["FIDIC Conditions of Contract", "Tender Evaluation", "Vendor Pre-qualification", "Subcontract Agreements", "Dispute Avoidance"],
  "Infrastructure Consultancy": ["Feasibility Studies", "Technical Due Diligence", "Master Planning", "Regulatory Approval Liaison", "Environmental Impact Assessment"],
};

export const DEFAULT_STRUCTURED_SKILLS = {
  software: [
    "AutoCAD", "Civil 3D", "Revit", "Navisworks", "Primavera P6",
    "MS Project", "STAAD.Pro", "ETABS", "SAP2000", "Tekla", "GIS", "CostX", "Synchro 4D"
  ],
  technical: [
    "Structural Analysis", "Reinforced Concrete Design", "Quantity Takeoffs",
    "Geotechnical Modeling", "Highway Geometry", "Hydrology & Drainage", "BIM Modeling"
  ],
  industry: [
    "FIDIC Contracts", "Site Supervision", "QA/QC Procedures",
    "Bar Bending Schedule (BBS)", "Bill of Quantities (BOQ)", "Safety / OSHA Standards"
  ],
  professional: [
    "Project Leadership", "Stakeholder Management", "Team Coordination",
    "Risk Mitigation", "Technical Reporting", "Client Negotiation"
  ],
};

export const INFRASTRUCTURE_SPECIALIZATIONS = [
  "Construction",
  "Engineering Consultancy",
  "Infrastructure Development",
  "EPC",
  "Real Estate Development",
  "Architecture",
  "BIM",
  "Infrastructure Technology",
  "Project Management",
  "Quantity Surveying",
  "Transportation",
  "Roads & Highways",
  "Railways",
  "Bridges",
  "Water Infrastructure",
  "Energy Infrastructure",
];

export const JOB_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Freelance",
  "Temporary",
  "Apprenticeship",
];

export const WORK_MODES = [
  "On-site",
  "Hybrid",
  "Remote",
];

export const BUSINESS_TYPES = [
  { value: "COMPANY", label: "Company / Enterprise" },
  { value: "STARTUP", label: "Startup / Scaleup" },
  { value: "CONSULTANCY", label: "Engineering Consultancy" },
  { value: "CONTRACTOR", label: "General / EPC Contractor" },
  { value: "SCHOOL", label: "School" },
  { value: "COLLEGE", label: "College" },
  { value: "UNIVERSITY", label: "University" },
  { value: "TRAINING_INSTITUTE", label: "Training Institute" },
  { value: "NONPROFIT", label: "Non-profit / NGO" },
  { value: "OTHER", label: "Other" },
];

export const BUSINESS_STATUSES = {
  DRAFT: "draft",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
};
