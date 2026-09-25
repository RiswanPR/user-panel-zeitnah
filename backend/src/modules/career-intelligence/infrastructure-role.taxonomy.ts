/**
 * ZEITNAH LMS NETWORK — INFRASTRUCTURE ROLE TAXONOMY & CAREER PATHWAYS
 * Canonical domain definitions connecting:
 * Role -> Discipline -> Specialization -> Sectors -> Skills -> Software -> Experience -> Certifications -> Career Ladder
 */

export interface InfrastructureRoleDefinition {
  id: string;
  title: string;
  discipline: string;
  specializations: string[];
  sectors: string[];
  tier: 'ENTRY_LEVEL' | 'MID_LEVEL' | 'SENIOR_LEVEL' | 'EXECUTIVE';
  experienceRange: {
    min: number;
    max: number;
    typical: string;
  };
  requiredSkills: string[];
  preferredSkills: string[];
  requiredSoftware: string[];
  preferredSoftware: string[];
  commonCertifications: string[];
  careerProgression: {
    predecessorRoles: string[];
    adjacentRoles: string[];
    successorRoles: string[];
  };
  description: string;
}

export const INFRASTRUCTURE_DISCIPLINES = [
  'Civil Engineering',
  'Structural Engineering',
  'Transportation & Highways',
  'Geotechnical Engineering',
  'Environmental & Water Resources',
  'MEP & Building Services',
  'Project & Construction Management',
  'Digital Construction & BIM',
] as const;

export const INFRASTRUCTURE_ROLE_TAXONOMY: InfrastructureRoleDefinition[] = [
  // ── 1. Planning & Scheduling Track ──────────────────────────────────────────
  {
    id: 'junior-planning-engineer',
    title: 'Junior Planning Engineer',
    discipline: 'Civil Engineering',
    specializations: ['Project Planning', 'Construction Scheduling'],
    sectors: ['Highways', 'Buildings', 'Civil Infrastructure'],
    tier: 'ENTRY_LEVEL',
    experienceRange: { min: 0, max: 2, typical: '0–2 years' },
    requiredSkills: ['Planning & Scheduling', 'Quantity Surveying', 'Progress Monitoring'],
    preferredSkills: ['BOQ Monitoring', 'Site Supervision', 'Bar Bending Schedule (BBS)'],
    requiredSoftware: ['AutoCAD', 'MS Excel'],
    preferredSoftware: ['Primavera P6', 'MS Project'],
    commonCertifications: [],
    careerProgression: {
      predecessorRoles: ['Graduate Civil Engineer', 'Site Trainee'],
      adjacentRoles: ['Junior Site Engineer', 'Junior Quantity Surveyor'],
      successorRoles: ['Planning Engineer', 'Project Controls Engineer'],
    },
    description: 'Assists senior planning personnel in drafting baseline schedules, updating daily work logs, and tracking equipment and labor productivity on infrastructure sites.',
  },
  {
    id: 'planning-engineer',
    title: 'Planning Engineer',
    discipline: 'Civil Engineering',
    specializations: ['Highway Engineering', 'Project Planning', 'Infrastructure EPC'],
    sectors: ['Highways', 'Roads & Bridges', 'Urban Transit', 'Civil Infrastructure'],
    tier: 'MID_LEVEL',
    experienceRange: { min: 3, max: 7, typical: '3–6 years' },
    requiredSkills: [
      'Planning & Scheduling',
      'Quantity Surveying',
      'Progress Monitoring',
      'BOQ Monitoring',
      'Delay Analysis',
    ],
    preferredSkills: [
      'Contract Administration',
      'Cost Control',
      'Risk Management',
      'FIDIC Contracts',
      'EOT Claims',
    ],
    requiredSoftware: ['Primavera P6', 'AutoCAD'],
    preferredSoftware: ['MS Project', 'Civil 3D', 'Power BI'],
    commonCertifications: ['PMP', 'PMI-SP', 'Chartered Engineer (CEng)'],
    careerProgression: {
      predecessorRoles: ['Junior Planning Engineer', 'Site Engineer'],
      adjacentRoles: ['Project Engineer', 'Quantity Surveyor'],
      successorRoles: ['Senior Planning Engineer', 'Planning Manager', 'Project Controls Manager'],
    },
    description: 'Responsible for master project schedule preparation (WBS, CPM, Resource Loading), critical path monitoring, and progress reporting on complex infrastructure projects.',
  },
  {
    id: 'senior-planning-engineer',
    title: 'Senior Planning Engineer',
    discipline: 'Civil Engineering',
    specializations: ['Project Controls', 'Claims & Delay Analysis', 'Mega Infrastructure'],
    sectors: ['Highways', 'Airports', 'Metros & Rail', 'Ports & Marine'],
    tier: 'SENIOR_LEVEL',
    experienceRange: { min: 8, max: 14, typical: '8–12 years' },
    requiredSkills: [
      'Planning & Scheduling',
      'Delay Analysis',
      'Cost Control',
      'Risk Management',
      'Contract Administration',
      'FIDIC Contracts',
    ],
    preferredSkills: ['Arbitration Support', 'Earned Value Management (EVM)', 'Executive Reporting'],
    requiredSoftware: ['Primavera P6', 'MS Project', 'Power BI'],
    preferredSoftware: ['Synchro 4D', 'Acumen Fuse', 'TILOS'],
    commonCertifications: ['PMP', 'PMI-SP', 'AACE PSP', 'FICE / CEng'],
    careerProgression: {
      predecessorRoles: ['Planning Engineer', 'Project Controls Engineer'],
      adjacentRoles: ['Senior Project Engineer', 'Commercial Manager'],
      successorRoles: ['Planning Manager', 'Head of Project Controls', 'Project Director'],
    },
    description: 'Oversees multi-package project controls, schedule forensic analysis, delay claim defenses, and earned value performance metrics across major infrastructure assets.',
  },
  {
    id: 'planning-manager',
    title: 'Planning Manager',
    discipline: 'Project & Construction Management',
    specializations: ['Corporate Project Controls', 'Multi-Project Governance'],
    sectors: ['Civil Infrastructure', 'Transport Corridors', 'EPC Turnkey'],
    tier: 'EXECUTIVE',
    experienceRange: { min: 14, max: 25, typical: '14+ years' },
    requiredSkills: [
      'Planning & Scheduling',
      'Project Leadership',
      'Contract Administration',
      'Risk Management',
      'Financial Budgeting',
    ],
    preferredSkills: ['Strategic Capital Planning', 'Joint Venture Governance', 'Dispute Adjudication'],
    requiredSoftware: ['Primavera P6', 'Power BI'],
    preferredSoftware: ['Oracle Primavera Cloud', 'SAP PS'],
    commonCertifications: ['PMP', 'AACE PSP / CEP', 'Fellow of Institution of Engineers (FIE)'],
    careerProgression: {
      predecessorRoles: ['Senior Planning Engineer', 'Project Controls Manager'],
      adjacentRoles: ['Commercial Director', 'Technical Director'],
      successorRoles: ['Project Director', 'Chief Operating Officer (Infrastructure)'],
    },
    description: 'Directs the overall scheduling and project controls strategy for enterprise infrastructure portfolios, ensuring contractual milestone adherence and delay mitigation.',
  },

  // ── 2. Site & Field Construction Track ──────────────────────────────────────
  {
    id: 'site-engineer',
    title: 'Site Engineer',
    discipline: 'Civil Engineering',
    specializations: ['Highway Engineering', 'Site Supervision', 'Earthworks & Pavement'],
    sectors: ['Highways', 'Roads & Bridges', 'Industrial Infrastructure'],
    tier: 'MID_LEVEL',
    experienceRange: { min: 2, max: 6, typical: '2–5 years' },
    requiredSkills: [
      'Site Supervision',
      'Quality Control / QA/QC',
      'Bar Bending Schedule (BBS)',
      'Subcontractor Management',
      'Safety / OSHA Standards',
    ],
    preferredSkills: ['Quantity Surveying', 'Setting Out & Surveying', 'BOQ Monitoring'],
    requiredSoftware: ['AutoCAD'],
    preferredSoftware: ['Total Station Software', 'Civil 3D', 'Primavera P6'],
    commonCertifications: ['OSHA Construction Safety', 'ISO 9001 Lead Auditor'],
    careerProgression: {
      predecessorRoles: ['Junior Site Engineer', 'Site Trainee'],
      adjacentRoles: ['Planning Engineer', 'QA/QC Engineer', 'Quantity Surveyor'],
      successorRoles: ['Senior Site Engineer', 'Construction Manager', 'Project Engineer'],
    },
    description: 'Directs field execution, structural shuttering, concrete pouring, setting out, and quality inspections in accordance with approved EPC shop drawings.',
  },
  {
    id: 'construction-manager',
    title: 'Construction Manager',
    discipline: 'Civil Engineering',
    specializations: ['Heavy Civil Construction', 'EPC Site Delivery', 'Resource Mobilization'],
    sectors: ['Highways', 'Bridges & Flyovers', 'Ports & Marine', 'Water & Wastewater'],
    tier: 'SENIOR_LEVEL',
    experienceRange: { min: 8, max: 15, typical: '8–14 years' },
    requiredSkills: [
      'Site Supervision',
      'Project Leadership',
      'Subcontractor Management',
      'Safety / OSHA Standards',
      'Resource Planning',
      'Client Coordination',
    ],
    preferredSkills: ['Equipment Management', 'Method Statement Formulation', 'Value Engineering'],
    requiredSoftware: ['AutoCAD', 'MS Excel'],
    preferredSoftware: ['Primavera P6', 'Procore'],
    commonCertifications: ['PMP', 'NEBOSH IGC', 'Certified Construction Manager (CCM)'],
    careerProgression: {
      predecessorRoles: ['Senior Site Engineer', 'Project Engineer'],
      adjacentRoles: ['Planning Manager', 'Contracts Manager'],
      successorRoles: ['Project Manager', 'Project Director', 'General Manager (Operations)'],
    },
    description: 'Oversees on-site heavy construction operations, plant and machinery deployment, subcontractors, safety governance, and handover milestones.',
  },

  // ── 3. Quantity Surveying & Commercial Track ────────────────────────────────
  {
    id: 'quantity-surveyor',
    title: 'Quantity Surveyor',
    discipline: 'Civil Engineering',
    specializations: ['Quantity Surveying', 'Cost Estimation', 'BOQ & Billing'],
    sectors: ['Civil Infrastructure', 'Highways', 'Water & Wastewater', 'Buildings'],
    tier: 'MID_LEVEL',
    experienceRange: { min: 3, max: 7, typical: '3–6 years' },
    requiredSkills: [
      'Bill of Quantities (BOQ)',
      'Quantity Surveying',
      'Bar Bending Schedule (BBS)',
      'Subcontractor Billing',
      'Cost Estimation',
    ],
    preferredSkills: ['FIDIC Contracts', 'Variation Management', 'Rate Analysis', 'Cost Control'],
    requiredSoftware: ['AutoCAD', 'MS Excel'],
    preferredSoftware: ['CostX', 'PlanSwift', 'Candy CCS'],
    commonCertifications: ['MRICS / AssocRICS', 'Chartered Quantity Surveyor'],
    careerProgression: {
      predecessorRoles: ['Junior Quantity Surveyor', 'Site Engineer'],
      adjacentRoles: ['Planning Engineer', 'Estimator'],
      successorRoles: ['Senior Quantity Surveyor', 'Contracts Manager', 'Commercial Manager'],
    },
    description: 'Prepares comprehensive bills of quantities, interim payment certificates (IPC), sub-contractor measurement reconciliations, and material takeoffs.',
  },
  {
    id: 'contracts-manager',
    title: 'Contracts Manager',
    discipline: 'Project & Construction Management',
    specializations: ['FIDIC EPC Contracts', 'Claims & Variations', 'Dispute Resolution'],
    sectors: ['Transport Infrastructure', 'Power & Energy', 'Urban EPC'],
    tier: 'SENIOR_LEVEL',
    experienceRange: { min: 9, max: 18, typical: '10–16 years' },
    requiredSkills: [
      'FIDIC Contracts',
      'Contract Administration',
      'Variation Management',
      'Dispute Resolution',
      'Negotiation',
      'Legal & Risk Compliance',
    ],
    preferredSkills: ['Arbitration Proceedings', 'EOT Claims Defense', 'Joint Venture Agreements'],
    requiredSoftware: ['MS Word / Excel', 'Contract Management Systems'],
    preferredSoftware: ['Aconex', 'Procore'],
    commonCertifications: ['MRICS', 'LLM in Construction Law', 'Chartered Arbitrator (CIArb)'],
    careerProgression: {
      predecessorRoles: ['Senior Quantity Surveyor', 'Commercial Lead'],
      adjacentRoles: ['Project Manager', 'Claims Consultant'],
      successorRoles: ['Commercial Director', 'Head of Legal & Contracts'],
    },
    description: 'Drafts, negotiates, and administers contractual terms, subcontractor packages, change orders, extension of time (EOT) claims, and dispute mitigation.',
  },

  // ── 4. Project Engineering & Delivery Track ─────────────────────────────────
  {
    id: 'project-engineer',
    title: 'Project Engineer',
    discipline: 'Civil Engineering',
    specializations: ['EPC Coordination', 'Technical Interface', 'Site Execution'],
    sectors: ['Highways', 'Bridges & Tunnels', 'Water & Wastewater', 'Railways'],
    tier: 'MID_LEVEL',
    experienceRange: { min: 4, max: 8, typical: '4–7 years' },
    requiredSkills: [
      'Site Supervision',
      'Quality Control / QA/QC',
      'Technical Submittals',
      'Subcontractor Management',
      'Progress Monitoring',
    ],
    preferredSkills: ['Planning & Scheduling', 'Value Engineering', 'Design Coordination'],
    requiredSoftware: ['AutoCAD'],
    preferredSoftware: ['Primavera P6', 'Civil 3D', 'Navisworks'],
    commonCertifications: ['PMP', 'LEED Green Associate'],
    careerProgression: {
      predecessorRoles: ['Site Engineer', 'Planning Engineer'],
      adjacentRoles: ['BIM Coordinator', 'Quantity Surveyor'],
      successorRoles: ['Senior Project Engineer', 'Project Manager', 'Construction Manager'],
    },
    description: 'Serves as the key technical bridge between consultant design teams, client representatives, and site execution crews, expediting RFIs and material submittals.',
  },
  {
    id: 'project-manager',
    title: 'Project Manager',
    discipline: 'Project & Construction Management',
    specializations: ['Full EPC Lifecycle', 'Budget & P&L Ownership', 'Stakeholder Management'],
    sectors: ['Highways', 'Bridges', 'Metros & Urban Transit', 'Airport Infrastructure'],
    tier: 'SENIOR_LEVEL',
    experienceRange: { min: 10, max: 20, typical: '10–18 years' },
    requiredSkills: [
      'Project Leadership',
      'Financial Budgeting',
      'Contract Administration',
      'Safety / OSHA Standards',
      'Risk Management',
      'Client Coordination',
    ],
    preferredSkills: ['P&L Management', 'Cross-Disciplinary Coordination', 'Government Authority Liaison'],
    requiredSoftware: ['MS Project', 'AutoCAD'],
    preferredSoftware: ['Primavera P6', 'Power BI', 'ERP Systems (SAP/Oracle)'],
    commonCertifications: ['PMP', 'PRINCE2 Practitioner', 'FIE / CEng'],
    careerProgression: {
      predecessorRoles: ['Project Engineer', 'Construction Manager', 'Senior Planning Engineer'],
      adjacentRoles: ['Contracts Manager', 'Technical Director'],
      successorRoles: ['Project Director', 'Vice President (Infrastructure)'],
    },
    description: 'Holds full profit and loss (P&L), schedule, quality, and contractual responsibility for the turnkey delivery of major infrastructure packages.',
  },

  // ── 5. Digital Construction & BIM Track ─────────────────────────────────────
  {
    id: 'bim-engineer',
    title: 'BIM Engineer',
    discipline: 'Digital Construction & BIM',
    specializations: ['Infrastructure BIM', 'Revit Civil Modeling', 'Clash Detection'],
    sectors: ['Metros & Rail', 'Bridges', 'Highways', 'Smart Cities'],
    tier: 'MID_LEVEL',
    experienceRange: { min: 2, max: 6, typical: '2–5 years' },
    requiredSkills: [
      'BIM Modeling',
      'Clash Detection',
      'Shop Drawing Generation',
      'Design Coordination',
      'Level of Detail (LOD 300–400)',
    ],
    preferredSkills: ['Dynamo Scripting', 'Point Cloud Modeling', '4D BIM Scheduling'],
    requiredSoftware: ['Revit', 'Navisworks', 'AutoCAD'],
    preferredSoftware: ['Civil 3D', 'InfraWorks', 'Synchro 4D'],
    commonCertifications: ['Autodesk Certified Professional (Revit)', 'buildingSMART BIM Certified'],
    careerProgression: {
      predecessorRoles: ['BIM Modeler', 'Junior CAD Engineer'],
      adjacentRoles: ['Design Engineer', 'Site Engineer'],
      successorRoles: ['BIM Coordinator', 'BIM Manager', 'Digital Delivery Lead'],
    },
    description: 'Develops parametric 3D models for bridges, tunnels, transit stations, and utility corridors while executing automated clash detection reports.',
  },
  {
    id: 'bim-coordinator',
    title: 'BIM Coordinator',
    discipline: 'Digital Construction & BIM',
    specializations: ['Multi-Disciplinary Federation', 'Common Data Environment (CDE)'],
    sectors: ['Metros & Rail', 'Airports', 'Complex Infrastructure EPC'],
    tier: 'SENIOR_LEVEL',
    experienceRange: { min: 6, max: 12, typical: '6–10 years' },
    requiredSkills: [
      'Clash Detection',
      'BIM Execution Planning (BEP)',
      'Multi-Disciplinary Coordination',
      'ISO 19650 Standards',
      '4D Scheduling Integration',
    ],
    preferredSkills: ['Python / Dynamo Automation', 'OpenBIM IFC Standards', 'Asset Information Modeling (AIM)'],
    requiredSoftware: ['Navisworks', 'Revit', 'BIM 360 / ACC'],
    preferredSoftware: ['Synchro 4D', 'Solibri', 'Civil 3D'],
    commonCertifications: ['BRE Global BIM Certified', 'Autodesk Certified Professional'],
    careerProgression: {
      predecessorRoles: ['BIM Engineer', 'Senior BIM Modeler'],
      adjacentRoles: ['Project Engineer', 'Design Lead'],
      successorRoles: ['BIM Manager', 'Head of Digital Construction'],
    },
    description: 'Coordinates model federation across civil, structural, geotechnical, and MEP consultants using ISO 19650 guidelines and common data environments.',
  },

  // ── 6. Structural & Geotechnical Design Track ───────────────────────────────
  {
    id: 'structural-engineer',
    title: 'Structural Engineer',
    discipline: 'Structural Engineering',
    specializations: ['Bridge Design', 'Reinforced Concrete & Steel', 'Seismic Analysis'],
    sectors: ['Highways', 'Bridges & Flyovers', 'Metros & Rail', 'Industrial'],
    tier: 'MID_LEVEL',
    experienceRange: { min: 3, max: 8, typical: '3–7 years' },
    requiredSkills: [
      'Structural Analysis & Design',
      'IS / IRC / Eurocode Standards',
      'Foundation Design',
      'Finite Element Analysis (FEA)',
      'Bar Bending Schedule (BBS)',
    ],
    preferredSkills: ['Prestressed Concrete Design', 'Seismic Retrofitting', 'Dynamic Analysis'],
    requiredSoftware: ['STAAD.Pro', 'AutoCAD'],
    preferredSoftware: ['ETABS', 'MIDAS Civil', 'SAFE'],
    commonCertifications: ['Chartered Structural Engineer (IStructE / CEng)'],
    careerProgression: {
      predecessorRoles: ['Junior Structural Engineer', 'Graduate Design Trainee'],
      adjacentRoles: ['Geotechnical Engineer', 'BIM Engineer'],
      successorRoles: ['Senior Structural Engineer', 'Chief Bridge Engineer', 'Engineering Manager'],
    },
    description: 'Carries out rigorous mathematical analysis, foundation stability calculations, and structural detailing for flyovers, retaining walls, and culverts.',
  },
  {
    id: 'geotechnical-engineer',
    title: 'Geotechnical Engineer',
    discipline: 'Geotechnical Engineering',
    specializations: ['Slope Stability', 'Deep Foundations', 'Soil Mechanics & Ground Improvement'],
    sectors: ['Highways', 'Tunnels', 'Marine & Ports', 'Dams & Reservoirs'],
    tier: 'MID_LEVEL',
    experienceRange: { min: 3, max: 8, typical: '3–7 years' },
    requiredSkills: [
      'Soil Investigation Analysis',
      'Bearing Capacity Calculation',
      'Pile Foundation Design',
      'Slope Stability Analysis',
      'Ground Improvement Techniques',
    ],
    preferredSkills: ['Tunnel Lining Design', 'Geosynthetics Application', 'Groundwater Seepage Modeling'],
    requiredSoftware: ['GeoStudio', 'AutoCAD'],
    preferredSoftware: ['PLAXIS 2D/3D', 'Slide2', 'FLAC'],
    commonCertifications: ['Chartered Geologist / Engineer (CEng)'],
    careerProgression: {
      predecessorRoles: ['Junior Geotechnical Engineer', 'Site Investigation Engineer'],
      adjacentRoles: ['Structural Engineer', 'Materials Engineer'],
      successorRoles: ['Senior Geotechnical Engineer', 'Chief Tunnel Engineer'],
    },
    description: 'Interprets borehole investigation reports, designs retaining piling systems, and resolves soil liquefaction and embankment settlement challenges.',
  },
];

// ── Helper Lookup Functions ───────────────────────────────────────────────────

export function getRoleByTitle(title: string): InfrastructureRoleDefinition | undefined {
  if (!title) return undefined;
  const normalized = title.trim().toLowerCase();
  const slug = normalized.replace(/\s+/g, '-');

  // 1. Exact match first
  const exact = INFRASTRUCTURE_ROLE_TAXONOMY.find(
    (r) => r.title.toLowerCase() === normalized || r.id === slug,
  );
  if (exact) return exact;

  // 2. Starts-with match
  const startsWith = INFRASTRUCTURE_ROLE_TAXONOMY.find(
    (r) => r.title.toLowerCase().startsWith(normalized),
  );
  if (startsWith) return startsWith;

  // 3. Fallback partial includes
  return INFRASTRUCTURE_ROLE_TAXONOMY.find(
    (r) =>
      r.title.toLowerCase().includes(normalized) ||
      normalized.includes(r.title.toLowerCase()),
  );
}

export function getAllRoles(): InfrastructureRoleDefinition[] {
  return [...INFRASTRUCTURE_ROLE_TAXONOMY];
}

export function getRolesByDiscipline(discipline: string): InfrastructureRoleDefinition[] {
  if (!discipline) return [];
  const normalized = discipline.trim().toLowerCase();
  return INFRASTRUCTURE_ROLE_TAXONOMY.filter(
    (r) =>
      r.discipline.toLowerCase().includes(normalized) ||
      normalized.includes(r.discipline.toLowerCase()),
  );
}

export function getCareerProgression(currentRoleTitle: string) {
  const role = getRoleByTitle(currentRoleTitle);
  if (!role) {
    return {
      currentRole: currentRoleTitle,
      predecessorRoles: [],
      adjacentRoles: ['Site Engineer', 'Planning Engineer', 'Quantity Surveyor'],
      successorRoles: ['Project Engineer', 'Construction Manager'],
    };
  }
  return {
    currentRole: role.title,
    tier: role.tier,
    discipline: role.discipline,
    predecessorRoles: role.careerProgression.predecessorRoles,
    adjacentRoles: role.careerProgression.adjacentRoles,
    successorRoles: role.careerProgression.successorRoles,
  };
}

export function getInfrastructureCareerMap() {
  const map: Record<string, { discipline: string; roles: InfrastructureRoleDefinition[] }> = {};
  for (const discipline of INFRASTRUCTURE_DISCIPLINES) {
    map[discipline] = {
      discipline,
      roles: INFRASTRUCTURE_ROLE_TAXONOMY.filter((r) => r.discipline === discipline),
    };
  }
  return map;
}
