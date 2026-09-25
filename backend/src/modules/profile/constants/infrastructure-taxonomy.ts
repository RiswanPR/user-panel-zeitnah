export const INFRASTRUCTURE_DISCIPLINES = [
  'Civil Engineering',
  'Structural Engineering',
  'Architecture',
  'Construction',
  'Project Management',
  'Quantity Surveying',
  'BIM',
  'MEP',
  'Geotechnical Engineering',
  'Transportation',
  'Surveying',
  'Planning & Scheduling',
  'Estimation & Costing',
  'Site Engineering',
  'Safety / HSE',
  'Contracts & Procurement',
  'Infrastructure Consultancy',
] as const;

export type InfrastructureDiscipline = typeof INFRASTRUCTURE_DISCIPLINES[number];

export const INFRASTRUCTURE_SECTORS = [
  'Buildings',
  'Highways',
  'Roads',
  'Bridges',
  'Railways',
  'Metro',
  'Water & Wastewater',
  'Urban Infrastructure',
  'Industrial Infrastructure',
  'Ports',
  'Airports',
  'Energy Infrastructure',
  'Real Estate Development',
] as const;

export type InfrastructureSector = typeof INFRASTRUCTURE_SECTORS[number];

export const INFRASTRUCTURE_SOFTWARE = [
  'AutoCAD',
  'Civil 3D',
  'Revit',
  'Navisworks',
  'Primavera P6',
  'MS Project',
  'STAAD.Pro',
  'ETABS',
  'SAP2000',
  'Tekla',
  'GIS',
  'CostX',
  'Synchro 4D',
  'Bluebeam Revu',
  'OpenRoads',
  'Infraworks',
  'MicroStation',
] as const;

export type InfrastructureSoftware = typeof INFRASTRUCTURE_SOFTWARE[number];

export const PROFILE_ROLES = [
  'student',
  'educator',
  'professional',
  'mentor',
  'recruiter',
  'founder',
] as const;

export type ProfileRole = typeof PROFILE_ROLES[number];

export const USER_SELECTABLE_ROLES: ProfileRole[] = [
  'student',
  'professional',
  'mentor',
  'recruiter',
  'founder',
];

export const WORK_MODES = ['On-site', 'Hybrid', 'Remote'] as const;
export type WorkMode = typeof WORK_MODES[number];

export const EMPLOYMENT_TYPES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Internship',
  'Freelance',
] as const;
export type EmploymentType = typeof EMPLOYMENT_TYPES[number];

export const VISIBILITY_LEVELS = ['PUBLIC', 'NETWORK', 'PRIVATE'] as const;
export type VisibilityLevel = typeof VISIBILITY_LEVELS[number];

export const INFRASTRUCTURE_SPECIALIZATIONS = [
  'Construction',
  'Engineering Consultancy',
  'Infrastructure Development',
  'EPC',
  'Real Estate Development',
  'Architecture',
  'BIM',
  'Infrastructure Technology',
  'Project Management',
  'Quantity Surveying',
  'Transportation',
  'Roads & Highways',
  'Railways',
  'Bridges',
  'Water Infrastructure',
  'Energy Infrastructure',
] as const;
export type InfrastructureSpecialization =
  typeof INFRASTRUCTURE_SPECIALIZATIONS[number];

export const JOB_TYPES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Internship',
  'Freelance',
  'Temporary',
  'Apprenticeship',
] as const;
export type JobType = typeof JOB_TYPES[number];

