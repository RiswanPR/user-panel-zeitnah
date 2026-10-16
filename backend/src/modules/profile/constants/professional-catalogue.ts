/**
 * ZEITNAH PROFESSIONAL IDENTITY CATALOGUE (PHASE 2)
 *
 * Authoritative, version-controlled catalogue of 18 engineering & infrastructure
 * departments and 254 department-scoped professional titles.
 *
 * DO NOT silently correct, rename, or omit titles. Every entry is preserved
 * verbatim from the Phase 1 specification.
 */

export const PROFESSIONAL_CATALOGUE_VERSION = '2026.1';

export type CatalogueItemStatus = 'active' | 'retired';

export interface CatalogueTitle {
  id: string;
  label: string;
  status: CatalogueItemStatus;
  aliases?: string[];
}

export interface CatalogueDepartment {
  id: string;
  name: string;
  status: CatalogueItemStatus;
  titles: CatalogueTitle[];
  aliases?: string[];
}

export const PROFESSIONAL_DEPARTMENTS: readonly CatalogueDepartment[] = [
  {
    id: 'architectural-design',
    name: "Architectural Design",
    status: 'active',
    titles: [
      { id: 'architectural-design:senior-architect', label: "Senior Architect", status: 'active' },
      { id: 'architectural-design:architect', label: "Architect", status: 'active' },
      { id: 'architectural-design:junior-architect', label: "Junior Architect", status: 'active' },
      { id: 'architectural-design:architectural-cad-draftsman', label: "Architectural CAD Draftsman", status: 'active' },
      { id: 'architectural-design:bim-modeler', label: "BIM Modeler", status: 'active' },
      { id: 'architectural-design:bim-architect', label: "BIM Architect", status: 'active' },
      { id: 'architectural-design:bim-coordinator', label: "BIM Coordinator", status: 'active' },
      { id: 'architectural-design:interior-designer', label: "Interior Designer", status: 'active' },
      { id: 'architectural-design:3d-visualizer', label: "3D Visualizer", status: 'active' },
      { id: 'architectural-design:space-planner', label: "Space Planner", status: 'active' },
      { id: 'architectural-design:architectural-design-coordinator', label: "Architectural Design Coordinator", status: 'active' },
    ],
  },
  {
    id: 'civil-engineering',
    name: "Civil Engineering",
    status: 'active',
    titles: [
      { id: 'civil-engineering:project-manager', label: "Project manager", status: 'active' },
      { id: 'civil-engineering:construction-manager-civil', label: "Construction Manager(civil)", status: 'active' },
      { id: 'civil-engineering:project-engineer-civil', label: "Project Engineer (civil)", status: 'active' },
      { id: 'civil-engineering:project-coordinator', label: "Project coordinator", status: 'active' },
      { id: 'civil-engineering:bridge-engineer', label: "Bridge engineer", status: 'active' },
      { id: 'civil-engineering:roads-and-highway-engineer', label: "Roads and highway engineer", status: 'active' },
      { id: 'civil-engineering:site-engineer-civil', label: "Site Engineer (civil)", status: 'active' },
      { id: 'civil-engineering:structural-engineer-civil', label: "Structural engineer (civil)", status: 'active' },
      { id: 'civil-engineering:structural-supervisor-civil', label: "Structural supervisor (civil)", status: 'active' },
      { id: 'civil-engineering:bridge-supervisor', label: "Bridge supervisor", status: 'active' },
      { id: 'civil-engineering:roads-and-highways-supervisor', label: "Roads and highways supervisor", status: 'active' },
      { id: 'civil-engineering:civil-supervisor', label: "civil Supervisor", status: 'active' },
    ],
  },
  {
    id: 'mechanical-engineering',
    name: "Mechanical Engineering",
    status: 'active',
    titles: [
      { id: 'mechanical-engineering:project-manager', label: "Project manager", status: 'active' },
      { id: 'mechanical-engineering:construction-manager-mech', label: "Construction Manager (Mech)", status: 'active' },
      { id: 'mechanical-engineering:project-engineer-mech', label: "Project Engineer (Mech)", status: 'active' },
      { id: 'mechanical-engineering:site-engineer-mech', label: "Site Engineer (Mech)", status: 'active' },
      { id: 'mechanical-engineering:structural-engineer-mech', label: "Structural engineer (Mech)", status: 'active' },
      { id: 'mechanical-engineering:structural-supervisor', label: "Structural supervisor", status: 'active' },
      { id: 'mechanical-engineering:piping-engineer', label: "Piping engineer", status: 'active' },
      { id: 'mechanical-engineering:piping-supervisor', label: "Piping supervisor", status: 'active' },
      { id: 'mechanical-engineering:corrosion-engineer', label: "Corrosion Engineer,", status: 'active' },
      { id: 'mechanical-engineering:corrosion-technician', label: "Corrosion Technician", status: 'active' },
      { id: 'mechanical-engineering:hydrotest-engineer', label: "Hydrotest Engineer", status: 'active' },
      { id: 'mechanical-engineering:pipeline-testing-technician', label: "Pipeline Testing Technician", status: 'active' },
      { id: 'mechanical-engineering:project-coordinator', label: "Project coordinator", status: 'active' },
      { id: 'mechanical-engineering:mechanical-supervisor', label: "mechanical Supervisor", status: 'active' },
      { id: 'mechanical-engineering:static-equipment-engineer', label: "Static Equipment Engineer", status: 'active' },
      { id: 'mechanical-engineering:rotating-equipment-engineer', label: "Rotating Equipment Engineer", status: 'active' },
      { id: 'mechanical-engineering:pressure-vessel-design-engineer', label: "Pressure Vessel Design Engineer", status: 'active' },
      { id: 'mechanical-engineering:heat-exchanger-engineer', label: "Heat Exchanger Engineer", status: 'active' },
      { id: 'mechanical-engineering:storage-tank-engineer', label: "Storage Tank Engineer", status: 'active' },
      { id: 'mechanical-engineering:welding-engineer', label: "Welding Engineer", status: 'active' },
      { id: 'mechanical-engineering:welding-inspector', label: "Welding Inspector", status: 'active' },
      { id: 'mechanical-engineering:mechanical-fabrication-supervisor', label: "Mechanical Fabrication Supervisor", status: 'active' },
      { id: 'mechanical-engineering:mechanical-maintenance-engineer', label: "Mechanical Maintenance Engineer", status: 'active' },
      { id: 'mechanical-engineering:reliability-engineer', label: "Reliability Engineer", status: 'active' },
      { id: 'mechanical-engineering:mechanical-inspector', label: "Mechanical Inspector", status: 'active' },
      { id: 'mechanical-engineering:equipment-inspector', label: "Equipment Inspector", status: 'active' },
    ],
  },
  {
    id: 'electrical-engineering',
    name: "Electrical Engineering",
    status: 'active',
    titles: [
      { id: 'electrical-engineering:project-manager', label: "Project manager", status: 'active' },
      { id: 'electrical-engineering:construction-manager-elect', label: "Construction Manager (Elect.)", status: 'active' },
      { id: 'electrical-engineering:project-engineer-elect', label: "Project Engineer (Elect.)", status: 'active' },
      { id: 'electrical-engineering:project-coordinator', label: "Project coordinator", status: 'active' },
      { id: 'electrical-engineering:site-engineer-elect', label: "Site Engineer (Elect.)", status: 'active' },
      { id: 'electrical-engineering:power-systems-engineer', label: "Power Systems Engineer", status: 'active' },
      { id: 'electrical-engineering:electrical-commissioning-engineer', label: "Electrical Commissioning Engineer", status: 'active' },
      { id: 'electrical-engineering:electrical-supervisor', label: "Electrical Supervisor", status: 'active' },
    ],
  },
  {
    id: 'instrumentation-engineering',
    name: "Instrumentation Engineering",
    status: 'active',
    titles: [
      { id: 'instrumentation-engineering:project-manager', label: "Project manager", status: 'active' },
      { id: 'instrumentation-engineering:site-engineer-inst', label: "Site Engineer (Inst.)", status: 'active' },
      { id: 'instrumentation-engineering:project-engineer-inst', label: "Project Engineer (Inst.)", status: 'active' },
      { id: 'instrumentation-engineering:manager-instrumentation', label: "Manager (Instrumentation)", status: 'active' },
      { id: 'instrumentation-engineering:project-coordinator', label: "Project coordinator", status: 'active' },
      { id: 'instrumentation-engineering:instrumentation-supervisor', label: "Instrumentation Supervisor", status: 'active' },
      { id: 'instrumentation-engineering:instrument-commissioning-engineer', label: "Instrument Commissioning Engineer", status: 'active' },
      { id: 'instrumentation-engineering:dcs-engineer', label: "DCS Engineer", status: 'active' },
      { id: 'instrumentation-engineering:plc-engineer', label: "PLC Engineer", status: 'active' },
      { id: 'instrumentation-engineering:instrument-designer', label: "Instrument Designer", status: 'active' },
      { id: 'instrumentation-engineering:instrument-cad-draftsman', label: "Instrument CAD Draftsman", status: 'active' },
      { id: 'instrumentation-engineering:instrument-calibration-technician', label: "Instrument Calibration Technician", status: 'active' },
    ],
  },
  {
    id: 'quantity-surveying-cost-management',
    name: "Quantity Surveying & Cost Management",
    status: 'active',
    titles: [
      { id: 'quantity-surveying-cost-management:quantity-surveyor', label: "Quantity Surveyor", status: 'active' },
      { id: 'quantity-surveying-cost-management:senior-qs', label: "Senior QS", status: 'active' },
      { id: 'quantity-surveying-cost-management:junior-qs', label: "Junior QS", status: 'active' },
      { id: 'quantity-surveying-cost-management:cost-estimator', label: "Cost Estimator", status: 'active' },
      { id: 'quantity-surveying-cost-management:billing-engineer', label: "Billing Engineer", status: 'active' },
      { id: 'quantity-surveying-cost-management:boq-engineer', label: "BOQ Engineer", status: 'active' },
      { id: 'quantity-surveying-cost-management:cost-control-engineer', label: "Cost Control Engineer", status: 'active' },
      { id: 'quantity-surveying-cost-management:cost-controller', label: "Cost Controller", status: 'active' },
      { id: 'quantity-surveying-cost-management:contracts-engineer', label: "Contracts Engineer", status: 'active' },
      { id: 'quantity-surveying-cost-management:contracts-administrator', label: "Contracts Administrator", status: 'active' },
      { id: 'quantity-surveying-cost-management:commercial-engineer', label: "Commercial Engineer", status: 'active' },
      { id: 'quantity-surveying-cost-management:commercial-manager', label: "Commercial Manager", status: 'active' },
      { id: 'quantity-surveying-cost-management:claims-consultant', label: "Claims Consultant", status: 'active' },
      { id: 'quantity-surveying-cost-management:delay-analyst', label: "Delay Analyst", status: 'active' },
    ],
  },
  {
    id: 'structural-engineering-design',
    name: "Structural Engineering (Design)",
    status: 'active',
    titles: [
      { id: 'structural-engineering-design:structural-designer', label: "Structural Designer", status: 'active' },
      { id: 'structural-engineering-design:structural-design-engineer', label: "Structural Design Engineer", status: 'active' },
      { id: 'structural-engineering-design:structural-analyst', label: "Structural Analyst", status: 'active' },
      { id: 'structural-engineering-design:structural-cad-draftsman', label: "Structural CAD Draftsman", status: 'active' },
      { id: 'structural-engineering-design:rebar-detailer', label: "Rebar Detailer", status: 'active' },
      { id: 'structural-engineering-design:structural-bim-modeler', label: "Structural BIM Modeler", status: 'active' },
      { id: 'structural-engineering-design:bim-structural-coordinator', label: "BIM Structural Coordinator", status: 'active' },
    ],
  },
  {
    id: 'qa-qc',
    name: "QA/QC",
    status: 'active',
    titles: [
      { id: 'qa-qc:qa-qc-manager', label: "QA/QC Manager", status: 'active' },
      { id: 'qa-qc:project-quality-manager', label: "Project Quality Manager", status: 'active' },
      { id: 'qa-qc:qa-qc-lead-engineer', label: "QA/QC Lead Engineer", status: 'active' },
      { id: 'qa-qc:qa-qc-engineer', label: "QA/QC Engineer", status: 'active' },
      { id: 'qa-qc:senior-qa-qc-engineer', label: "Senior QA/QC Engineer", status: 'active' },
      { id: 'qa-qc:qa-qc-inspector', label: "QA/QC Inspector", status: 'active' },
      { id: 'qa-qc:qc-inspector', label: "QC Inspector", status: 'active' },
      { id: 'qa-qc:senior-qc-inspector', label: "Senior QC Inspector", status: 'active' },
      { id: 'qa-qc:quality-inspector', label: "Quality Inspector", status: 'active' },
      { id: 'qa-qc:quality-engineer', label: "Quality Engineer", status: 'active' },
      { id: 'qa-qc:quality-control-supervisor', label: "Quality Control Supervisor", status: 'active' },
      { id: 'qa-qc:qa-qc-coordinator', label: "QA/QC Coordinator", status: 'active' },
      { id: 'qa-qc:materials-inspector', label: "Materials Inspector", status: 'active' },
      { id: 'qa-qc:materials-engineer', label: "Materials Engineer", status: 'active' },
      { id: 'qa-qc:laboratory-technician', label: "Laboratory Technician", status: 'active' },
      { id: 'qa-qc:laboratory-engineer', label: "Laboratory Engineer", status: 'active' },
      { id: 'qa-qc:ndt-technician', label: "NDT Technician", status: 'active' },
      { id: 'qa-qc:ndt-inspector', label: "NDT Inspector", status: 'active' },
      { id: 'qa-qc:welding-inspector', label: "Welding Inspector", status: 'active' },
      { id: 'qa-qc:coating-inspector', label: "Coating Inspector", status: 'active' },
      { id: 'qa-qc:civil-qa-qc-engineer', label: "Civil QA/QC Engineer", status: 'active' },
      { id: 'qa-qc:structural-qa-qc-engineer', label: "Structural QA/QC Engineer", status: 'active' },
      { id: 'qa-qc:geotechnical-qa-qc-engineer', label: "Geotechnical QA/QC Engineer", status: 'active' },
      { id: 'qa-qc:geotechnical-inspector', label: "Geotechnical Inspector", status: 'active' },
      { id: 'qa-qc:soil-testing-engineer', label: "Soil Testing Engineer", status: 'active' },
      { id: 'qa-qc:piling-inspector', label: "Piling Inspector", status: 'active' },
      { id: 'qa-qc:piping-qa-qc-engineer', label: "Piping QA/QC Engineer", status: 'active' },
      { id: 'qa-qc:piping-qa-qc-inspector', label: "Piping QA/QC Inspector", status: 'active' },
      { id: 'qa-qc:mechanical-qa-qc-engineer', label: "Mechanical QA/QC Engineer", status: 'active' },
      { id: 'qa-qc:mechanical-inspector', label: "Mechanical Inspector", status: 'active' },
      { id: 'qa-qc:pipeline-qa-qc-engineer', label: "Pipeline QA/QC Engineer", status: 'active' },
      { id: 'qa-qc:pipeline-inspector', label: "Pipeline Inspector", status: 'active' },
      { id: 'qa-qc:electrical-qa-qc-engineer', label: "Electrical QA/QC Engineer", status: 'active' },
      { id: 'qa-qc:instrumentation-qa-qc-engineer', label: "Instrumentation QA/QC Engineer", status: 'active' },
      { id: 'qa-qc:instrument-qa-qc-inspector', label: "Instrument QA/QC Inspector", status: 'active' },
      { id: 'qa-qc:vendor-inspector', label: "Vendor Inspector", status: 'active' },
    ],
  },
  {
    id: 'land-surveying-geomatics',
    name: "Land Surveying & Geomatics",
    status: 'active',
    titles: [
      { id: 'land-surveying-geomatics:survey-engineer', label: "Survey Engineer", status: 'active' },
      { id: 'land-surveying-geomatics:project-surveyor', label: "Project surveyor", status: 'active' },
      { id: 'land-surveying-geomatics:survey-manager', label: "Survey manager", status: 'active' },
      { id: 'land-surveying-geomatics:survey-coordinator', label: "Survey coordinator", status: 'active' },
      { id: 'land-surveying-geomatics:construction-surveyor', label: "Construction Surveyor", status: 'active' },
      { id: 'land-surveying-geomatics:land-surveyor', label: "Land Surveyor", status: 'active' },
      { id: 'land-surveying-geomatics:assistant-surveyor', label: "Assistant Surveyor", status: 'active' },
      { id: 'land-surveying-geomatics:gis-surveyor', label: "GIS Surveyor", status: 'active' },
      { id: 'land-surveying-geomatics:geodetic-surveyor', label: "Geodetic Surveyor", status: 'active' },
      { id: 'land-surveying-geomatics:marine-surveyor', label: "Marine surveyor", status: 'active' },
      { id: 'land-surveying-geomatics:total-station-surveyor', label: "Total Station Surveyor", status: 'active' },
      { id: 'land-surveying-geomatics:dgps-surveyor', label: "DGPS Surveyor", status: 'active' },
      { id: 'land-surveying-geomatics:hydrographic-surveyor', label: "Hydrographic Surveyor", status: 'active' },
      { id: 'land-surveying-geomatics:drone-survey-pilot', label: "Drone Survey Pilot", status: 'active' },
      { id: 'land-surveying-geomatics:uav-mapping-specialist', label: "UAV Mapping Specialist", status: 'active' },
      { id: 'land-surveying-geomatics:survey-data-processor', label: "Survey Data Processor", status: 'active' },
    ],
  },
  {
    id: 'gis-mapping',
    name: "GIS & Mapping",
    status: 'active',
    titles: [
      { id: 'gis-mapping:gis-engineer', label: "GIS Engineer", status: 'active' },
      { id: 'gis-mapping:gis-analyst', label: "GIS Analyst", status: 'active' },
      { id: 'gis-mapping:gis-technician', label: "GIS Technician", status: 'active' },
      { id: 'gis-mapping:gis-mapping-specialist', label: "GIS Mapping Specialist", status: 'active' },
      { id: 'gis-mapping:gis-data-analyst', label: "GIS Data Analyst", status: 'active' },
      { id: 'gis-mapping:geospatial-data-analyst', label: "Geospatial Data Analyst", status: 'active' },
      { id: 'gis-mapping:remote-sensing-analyst', label: "Remote Sensing Analyst", status: 'active' },
      { id: 'gis-mapping:photogrammetry-specialist', label: "Photogrammetry Specialist", status: 'active' },
      { id: 'gis-mapping:lidar-processing-specialist', label: "LiDAR Processing Specialist", status: 'active' },
      { id: 'gis-mapping:gis-developer', label: "GIS Developer", status: 'active' },
      { id: 'gis-mapping:web-gis-developer', label: "Web GIS Developer", status: 'active' },
      { id: 'gis-mapping:geospatial-engineer', label: "Geospatial Engineer", status: 'active' },
      { id: 'gis-mapping:utility-gis-analyst', label: "Utility GIS Analyst", status: 'active' },
      { id: 'gis-mapping:pipeline-gis-analyst', label: "Pipeline GIS Analyst", status: 'active' },
      { id: 'gis-mapping:gis-bim-specialist', label: "GIS BIM Specialist", status: 'active' },
      { id: 'gis-mapping:gis-project-manager', label: "GIS Project Manager", status: 'active' },
    ],
  },
  {
    id: 'planning-engineering',
    name: "Planning engineering",
    status: 'active',
    titles: [
      { id: 'planning-engineering:planning-engineer', label: "Planning Engineer", status: 'active' },
      { id: 'planning-engineering:junior-planning-engineer', label: "Junior Planning Engineer", status: 'active' },
      { id: 'planning-engineering:senior-planning-engineer', label: "Senior Planning Engineer", status: 'active' },
      { id: 'planning-engineering:project-planning-engineer', label: "Project Planning Engineer", status: 'active' },
      { id: 'planning-engineering:civil-planning-engineer', label: "Civil Planning Engineer", status: 'active' },
      { id: 'planning-engineering:mechanical-planning-engineer', label: "Mechanical Planning Engineer", status: 'active' },
      { id: 'planning-engineering:mep-planning-engineer', label: "MEP Planning Engineer", status: 'active' },
      { id: 'planning-engineering:oil-and-gas-planning-engineer', label: "Oil & Gas Planning Engineer", status: 'active' },
      { id: 'planning-engineering:planning-and-scheduling-engineer', label: "Planning & Scheduling Engineer", status: 'active' },
      { id: 'planning-engineering:project-controls-engineer', label: "Project Controls Engineer", status: 'active' },
      { id: 'planning-engineering:project-scheduler', label: "Project Scheduler", status: 'active' },
      { id: 'planning-engineering:project-controls-manager', label: "Project Controls Manager", status: 'active' },
      { id: 'planning-engineering:shutdown-turnaround-planner', label: "Shutdown / Turnaround Planner", status: 'active' },
    ],
  },
  {
    id: 'procurement-department',
    name: "Procurement Department",
    status: 'active',
    titles: [
      { id: 'procurement-department:procurement-engineer', label: "Procurement Engineer", status: 'active' },
      { id: 'procurement-department:procurement-officer', label: "Procurement Officer", status: 'active' },
      { id: 'procurement-department:procurement-coordinator', label: "Procurement Coordinator", status: 'active' },
      { id: 'procurement-department:purchase-engineer', label: "Purchase Engineer", status: 'active' },
      { id: 'procurement-department:purchase-executive', label: "Purchase Executive", status: 'active' },
      { id: 'procurement-department:civil-procurement-engineer', label: "Civil Procurement Engineer", status: 'active' },
      { id: 'procurement-department:mechanical-procurement-engineer', label: "Mechanical Procurement Engineer", status: 'active' },
      { id: 'procurement-department:electrical-procurement-engineer', label: "Electrical Procurement Engineer", status: 'active' },
      { id: 'procurement-department:mep-procurement-engineer', label: "MEP Procurement Engineer", status: 'active' },
      { id: 'procurement-department:oil-and-gas-procurement-engineer', label: "Oil & Gas Procurement Engineer", status: 'active' },
      { id: 'procurement-department:tendering-engineer', label: "Tendering Engineer", status: 'active' },
      { id: 'procurement-department:procurement-manager', label: "Procurement Manager", status: 'active' },
    ],
  },
  {
    id: 'mep-mechanical-electrical-plumbing',
    name: "MEP — Mechanical, Electrical & Plumbing",
    status: 'active',
    titles: [
      { id: 'mep-mechanical-electrical-plumbing:hvac-design-engineer', label: "HVAC Design Engineer", status: 'active' },
      { id: 'mep-mechanical-electrical-plumbing:hvac-draftsman', label: "HVAC Draftsman", status: 'active' },
      { id: 'mep-mechanical-electrical-plumbing:electrical-design-engineer', label: "Electrical Design Engineer", status: 'active' },
      { id: 'mep-mechanical-electrical-plumbing:electrical-draftsman', label: "Electrical Draftsman", status: 'active' },
      { id: 'mep-mechanical-electrical-plumbing:plumbing-design-engineer', label: "Plumbing Design Engineer", status: 'active' },
      { id: 'mep-mechanical-electrical-plumbing:plumbing-draftsman', label: "Plumbing Draftsman", status: 'active' },
      { id: 'mep-mechanical-electrical-plumbing:fire-protection-engineer', label: "Fire Protection Engineer", status: 'active' },
      { id: 'mep-mechanical-electrical-plumbing:fire-fighting-designer', label: "Fire Fighting Designer", status: 'active' },
      { id: 'mep-mechanical-electrical-plumbing:public-health-engineer', label: "Public Health Engineer", status: 'active' },
      { id: 'mep-mechanical-electrical-plumbing:drainage-designer', label: "Drainage Designer", status: 'active' },
      { id: 'mep-mechanical-electrical-plumbing:mep-bim-modeler', label: "MEP BIM Modeler", status: 'active' },
      { id: 'mep-mechanical-electrical-plumbing:mep-bim-coordinator', label: "MEP BIM Coordinator", status: 'active' },
      { id: 'mep-mechanical-electrical-plumbing:mep-testing-and-commissioning-engineer', label: "MEP Testing & Commissioning Engineer", status: 'active' },
      { id: 'mep-mechanical-electrical-plumbing:mep-site-engineer', label: "MEP Site Engineer", status: 'active' },
      { id: 'mep-mechanical-electrical-plumbing:mep-supervisor', label: "MEP Supervisor", status: 'active' },
    ],
  },
  {
    id: 'piping-pipeline-engineering-design',
    name: "Piping & Pipeline Engineering (Design)",
    status: 'active',
    titles: [
      { id: 'piping-pipeline-engineering-design:piping-design-engineer', label: "Piping Design Engineer", status: 'active' },
      { id: 'piping-pipeline-engineering-design:pipeline-design-engineer', label: "Pipeline Design Engineer", status: 'active' },
      { id: 'piping-pipeline-engineering-design:piping-layout-engineer', label: "Piping Layout Engineer", status: 'active' },
      { id: 'piping-pipeline-engineering-design:piping-designer', label: "Piping Designer", status: 'active' },
      { id: 'piping-pipeline-engineering-design:piping-cad-draftsman', label: "Piping CAD Draftsman", status: 'active' },
      { id: 'piping-pipeline-engineering-design:plant-3d-designer', label: "Plant 3D Designer", status: 'active' },
      { id: 'piping-pipeline-engineering-design:3d-piping-modeler', label: "3D Piping Modeler", status: 'active' },
      { id: 'piping-pipeline-engineering-design:piping-bim-modular', label: "Piping BIM modular", status: 'active' },
      { id: 'piping-pipeline-engineering-design:piping-isometric-designer', label: "Piping Isometric Designer", status: 'active' },
      { id: 'piping-pipeline-engineering-design:pipe-support-designer', label: "Pipe Support Designer", status: 'active' },
    ],
  },
  {
    id: 'process-engineering-department',
    name: "Process Engineering Department",
    status: 'active',
    titles: [
      { id: 'process-engineering-department:process-engineer', label: "Process Engineer", status: 'active' },
      { id: 'process-engineering-department:process-simulation-engineer', label: "Process Simulation Engineer", status: 'active' },
      { id: 'process-engineering-department:process-safety-engineer', label: "Process Safety Engineer", status: 'active' },
      { id: 'process-engineering-department:flow-assurance-engineer', label: "Flow Assurance Engineer", status: 'active' },
      { id: 'process-engineering-department:process-documentation-engineer', label: "Process Documentation Engineer", status: 'active' },
      { id: 'process-engineering-department:pid-designer', label: "P&ID Designer", status: 'active' },
      { id: 'process-engineering-department:process-cad-designer', label: "Process CAD Designer", status: 'active' },
      { id: 'process-engineering-department:technical-safety-engineer', label: "Technical Safety Engineer", status: 'active' },
      { id: 'process-engineering-department:hazop-facilitator', label: "HAZOP Facilitator", status: 'active' },
      { id: 'process-engineering-department:process-safety-specialist', label: "Process Safety Specialist", status: 'active' },
    ],
  },
  {
    id: 'hse-health-safety-environment',
    name: "HSE — Health, Safety & Environment",
    status: 'active',
    titles: [
      { id: 'hse-health-safety-environment:hse-officer', label: "HSE Officer", status: 'active' },
      { id: 'hse-health-safety-environment:hse-engineer', label: "HSE Engineer", status: 'active' },
      { id: 'hse-health-safety-environment:safety-officer', label: "Safety Officer", status: 'active' },
      { id: 'hse-health-safety-environment:safety-supervisor', label: "Safety Supervisor", status: 'active' },
      { id: 'hse-health-safety-environment:risk-engineer', label: "Risk Engineer", status: 'active' },
      { id: 'hse-health-safety-environment:risk-assessment-specialist', label: "Risk Assessment Specialist", status: 'active' },
      { id: 'hse-health-safety-environment:fire-safety-engineer', label: "Fire Safety Engineer", status: 'active' },
      { id: 'hse-health-safety-environment:hse-auditor', label: "HSE Auditor", status: 'active' },
      { id: 'hse-health-safety-environment:hse-inspector', label: "HSE Inspector", status: 'active' },
    ],
  },
  {
    id: 'construction-document-control',
    name: "Construction Document Control",
    status: 'active',
    titles: [
      { id: 'construction-document-control:document-controller', label: "Document Controller", status: 'active' },
      { id: 'construction-document-control:senior-document-controller', label: "Senior Document Controller", status: 'active' },
      { id: 'construction-document-control:lead-document-controller', label: "Lead Document Controller", status: 'active' },
      { id: 'construction-document-control:document-control-engineer', label: "Document Control Engineer", status: 'active' },
      { id: 'construction-document-control:document-control-coordinator', label: "Document Control Coordinator", status: 'active' },
      { id: 'construction-document-control:project-document-controller', label: "Project Document Controller", status: 'active' },
      { id: 'construction-document-control:construction-document-controller', label: "Construction Document Controller", status: 'active' },
      { id: 'construction-document-control:engineering-document-controller', label: "Engineering Document Controller", status: 'active' },
      { id: 'construction-document-control:qa-qc-document-controller', label: "QA/QC Document Controller", status: 'active' },
      { id: 'construction-document-control:bim-document-controller', label: "BIM Document Controller", status: 'active' },
      { id: 'construction-document-control:document-control-manager', label: "Document Control Manager", status: 'active' },
    ],
  },
  {
    id: 'offshore-operations-marine',
    name: "Offshore Operations & Marine",
    status: 'active',
    titles: [
      { id: 'offshore-operations-marine:offshore-operations-technician', label: "Offshore Operations Technician", status: 'active' },
      { id: 'offshore-operations-marine:drilling-engineer', label: "Drilling Engineer", status: 'active' },
      { id: 'offshore-operations-marine:drilling-supervisor', label: "Drilling Supervisor", status: 'active' },
      { id: 'offshore-operations-marine:well-services-engineer', label: "Well Services Engineer", status: 'active' },
      { id: 'offshore-operations-marine:well-services-technician', label: "Well Services Technician", status: 'active' },
      { id: 'offshore-operations-marine:marine-surveyor', label: "Marine Surveyor", status: 'active' },
      { id: 'offshore-operations-marine:offshore-surveyor', label: "Offshore Surveyor", status: 'active' },
      { id: 'offshore-operations-marine:offshore-positioning-surveyor', label: "Offshore Positioning Surveyor", status: 'active' },
      { id: 'offshore-operations-marine:rov-pilot-technician', label: "ROV Pilot Technician", status: 'active' },
      { id: 'offshore-operations-marine:rov-supervisor', label: "ROV Supervisor", status: 'active' },
      { id: 'offshore-operations-marine:subsea-engineer', label: "Subsea Engineer", status: 'active' },
      { id: 'offshore-operations-marine:subsea-survey-specialist', label: "Subsea Survey Specialist", status: 'active' },
      { id: 'offshore-operations-marine:rigger', label: "Rigger", status: 'active' },
      { id: 'offshore-operations-marine:rigging-supervisor', label: "Rigging Supervisor", status: 'active' },
      { id: 'offshore-operations-marine:lifting-supervisor', label: "Lifting Supervisor", status: 'active' },
      { id: 'offshore-operations-marine:lifting-equipment-inspector', label: "Lifting Equipment Inspector", status: 'active' },
    ],
  },
] as const;

// Helper lookup maps for O(1) server-side validation
const departmentMap = new Map<string, CatalogueDepartment>();
const departmentTitleMap = new Map<string, Map<string, CatalogueTitle>>();

for (const dept of PROFESSIONAL_DEPARTMENTS) {
  departmentMap.set(dept.id, dept as CatalogueDepartment);
  const titles = new Map<string, CatalogueTitle>();
  for (const title of dept.titles) {
    titles.set(title.id, title as CatalogueTitle);
  }
  departmentTitleMap.set(dept.id, titles);
}

export function getDepartmentById(deptId: string): CatalogueDepartment | undefined {
  if (!deptId) return undefined;
  return departmentMap.get(deptId.trim());
}

export function getTitleById(deptId: string, titleId: string): CatalogueTitle | undefined {
  if (!deptId || !titleId) return undefined;
  const titles = departmentTitleMap.get(deptId.trim());
  if (!titles) return undefined;
  return titles.get(titleId.trim());
}

export function isValidDepartmentId(deptId: string): boolean {
  if (!deptId) return false;
  const dept = departmentMap.get(deptId.trim());
  return Boolean(dept && dept.status === 'active');
}

export function isValidTitleForDepartment(deptId: string, titleId: string): boolean {
  if (!deptId || !titleId) return false;
  const titles = departmentTitleMap.get(deptId.trim());
  if (!titles) return false;
  const title = titles.get(titleId.trim());
  return Boolean(title && title.status === 'active');
}

export function getAllDepartments(): readonly CatalogueDepartment[] {
  return PROFESSIONAL_DEPARTMENTS;
}

export function getCatalogueSummary() {
  return {
    version: PROFESSIONAL_CATALOGUE_VERSION,
    totalDepartments: PROFESSIONAL_DEPARTMENTS.length,
    totalTitles: PROFESSIONAL_DEPARTMENTS.reduce((acc, d) => acc + d.titles.length, 0),
  };
}
