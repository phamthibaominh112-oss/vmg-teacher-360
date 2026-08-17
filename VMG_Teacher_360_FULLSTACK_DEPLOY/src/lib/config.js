export const ROLE_LABELS = {
  teacher: { en: 'Teacher', vi: 'Giáo viên' },
  cmo: { en: 'Centre Management Officer', vi: 'CMO / QLTT' },
  centre_director: { en: 'Centre Director', vi: 'Giám đốc Trung tâm' },
  csr: { en: 'CSR Department', vi: 'P. CSR' },
  rnd: { en: 'R&D', vi: 'R&D' },
  bod: { en: 'Board of Directors', vi: 'BOD' },
  academic_supervisor: { en: 'Academic Supervisor', vi: 'Academic Supervisor' },
  ptns: { en: 'HR Development', vi: 'P. PTNS' }
}

export const GLOBAL_VIEW_ROLES = ['csr','rnd','bod','academic_supervisor','ptns']
export const DELETE_ROLES = ['rnd','bod']
export const USER_ADMIN_ROLES = ['rnd','bod']

export const REGION_CENTRES = {
  1: ['PVT','VTS','NKN','TBM'],
  2: ['LDN','HVG','TPU','NTI','PTA'],
  3: ['BPC']
}

export const INCIDENT_CATEGORIES = [
  'Punctuality & Attendance',
  'Academic Delivery',
  'Classroom Management',
  'Learner Care / Service',
  'Documentation & Compliance',
  'Communication & Conduct',
  'Safeguarding / Ethics',
  'Technology / Operational Readiness',
  'Other'
]

export const OBSERVATION_RUBRIC = [
  {domain:'Preparation', weight:5, criterion:'The teacher is well-prepared for the lesson, including materials, teaching aids, technology and backup.'},
  {domain:'Preparation', weight:5, criterion:'The teacher arrives at least five minutes before the class starts and the class is ready on time.'},
  {domain:'Teaching Methodology & Skills', weight:5, criterion:'Objectives and success criteria are presented clearly throughout the lesson.'},
  {domain:'Teaching Methodology & Skills', weight:5, criterion:'The teacher checks learners’ understanding of instructions effectively using ICQs.'},
  {domain:'Teaching Methodology & Skills', weight:5, criterion:'The lesson follows the approved VMG lesson structure.'},
  {domain:'Teaching Methodology & Skills', weight:5, criterion:'Activities are varied, purposeful, appropriately challenging and used efficiently.'},
  {domain:'Teaching Methodology & Skills', weight:10, criterion:'Teacher talk time is minimised and learners receive substantial practice and production time.'},
  {domain:'Teaching Methodology & Skills', weight:5, criterion:'The teacher uses spontaneous S–T and S–S exchanges to empower meaningful learner language use.'},
  {domain:'Teaching Methodology & Skills', weight:10, criterion:'Use of English is accurate and appropriate to learner needs and level.'},
  {domain:'Classroom Management', weight:10, criterion:'All learners are involved and participation is active, broad and visible.'},
  {domain:'Classroom Management', weight:5, criterion:'Order, routines, dignity and discipline are maintained.'},
  {domain:'Classroom Management', weight:10, criterion:'Learners complete the tasks and demonstrate the intended learner outcomes.'},
  {domain:'Classroom Management', weight:5, criterion:'Scaffolding and differentiation respond effectively to mixed needs and levels.'},
  {domain:'Classroom Management', weight:5, criterion:'Learner questions and concerns are addressed effectively.'},
  {domain:'Classroom Management', weight:10, criterion:'The teacher creates a safe, inclusive and supportive learning environment.'}
]

export function scoreBand(score){
  if(score > 90) return 'Excellent'
  if(score >= 81) return 'Very good'
  if(score >= 70) return 'Good'
  if(score >= 60) return 'Satisfactory'
  return 'Improvement / Training needed'
}

export function incidentRisk({weekly=0, monthly=0, critical=false}){
  if(critical) return {level:'Critical', tone:'critical', action:'Immediate escalation and formal review'}
  if(weekly >= 3 || monthly >= 4) return {level:'Danger', tone:'danger', action:'Formal review, retraining and reassignment consideration'}
  if(weekly >= 2 || monthly >= 3) return {level:'Watch', tone:'watch', action:'Coaching plus targeted observation'}
  return {level:'Stable', tone:'stable', action:'Routine monitoring'}
}
