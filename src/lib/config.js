export const ROLE_LABELS = {
  teacher: { en: 'Teacher', vi: 'Giáo viên' },
  cmo: { en: 'Centre Management Officer', vi: 'Quản lý Trung tâm (CMO / QLTT)' },
  centre_director: { en: 'Centre Director', vi: 'Giám đốc Trung tâm' },
  regional_director: { en: 'Regional Director', vi: 'Giám đốc Khu vực' },
  csr: { en: 'CSR Department', vi: 'Phòng CSR' },
  rnd: { en: 'R&D', vi: 'R&D' },
  bod: { en: 'Board of Directors', vi: 'BOD' },
  academic_supervisor: { en: 'Academic Supervisor', vi: 'Giám sát Học thuật' },
  ptns: { en: 'HR Development', vi: 'Phát triển Nhân sự (PTNS)' }
}

export const HEAD_OFFICE_ROLES = ['csr','rnd','bod','academic_supervisor','ptns']
export const GLOBAL_VIEW_ROLES = HEAD_OFFICE_ROLES
export const REGION_SCOPE_ROLES = ['regional_director']
export const CENTRE_SCOPE_ROLES = ['cmo','centre_director']
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
  {domain:'Preparation',domain_vi:'Chuẩn bị',weight:5,criterion:'The teacher is well-prepared for the lesson, including materials, teaching aids, technology and backup.',criterion_vi:'Giáo viên chuẩn bị đầy đủ bài dạy, học liệu, thiết bị, công nghệ và phương án dự phòng.'},
  {domain:'Preparation',domain_vi:'Chuẩn bị',weight:5,criterion:'The teacher arrives at least five minutes before the class starts and the class is ready on time.',criterion_vi:'Giáo viên có mặt ít nhất 5 phút trước giờ học và lớp sẵn sàng đúng giờ.'},
  {domain:'Teaching Methodology & Skills',domain_vi:'Phương pháp & Kỹ năng giảng dạy',weight:5,criterion:'Objectives and success criteria are presented clearly throughout the lesson.',criterion_vi:'Mục tiêu và tiêu chí thành công được thể hiện rõ trong suốt bài học.'},
  {domain:'Teaching Methodology & Skills',domain_vi:'Phương pháp & Kỹ năng giảng dạy',weight:5,criterion:'The teacher checks learners’ understanding of instructions effectively using ICQs.',criterion_vi:'Giáo viên kiểm tra mức độ hiểu hướng dẫn hiệu quả bằng ICQs.'},
  {domain:'Teaching Methodology & Skills',domain_vi:'Phương pháp & Kỹ năng giảng dạy',weight:5,criterion:'The lesson follows the approved VMG lesson structure.',criterion_vi:'Bài học tuân theo cấu trúc bài dạy VMG đã được phê duyệt.'},
  {domain:'Teaching Methodology & Skills',domain_vi:'Phương pháp & Kỹ năng giảng dạy',weight:5,criterion:'Activities are varied, purposeful, appropriately challenging and used efficiently.',criterion_vi:'Hoạt động đa dạng, có mục đích, độ thử thách phù hợp và được sử dụng hiệu quả.'},
  {domain:'Teaching Methodology & Skills',domain_vi:'Phương pháp & Kỹ năng giảng dạy',weight:10,criterion:'Teacher talk time is minimised and learners receive substantial practice and production time.',criterion_vi:'Giảm thời lượng giáo viên nói và tăng đáng kể thời gian học viên luyện tập, sản sinh ngôn ngữ.'},
  {domain:'Teaching Methodology & Skills',domain_vi:'Phương pháp & Kỹ năng giảng dạy',weight:5,criterion:'The teacher uses spontaneous S–T and S–S exchanges to empower meaningful learner language use.',criterion_vi:'Giáo viên tạo các tương tác S–T và S–S tự nhiên để học viên sử dụng ngôn ngữ có ý nghĩa.'},
  {domain:'Teaching Methodology & Skills',domain_vi:'Phương pháp & Kỹ năng giảng dạy',weight:10,criterion:'Use of English is accurate and appropriate to learner needs and level.',criterion_vi:'Tiếng Anh của giáo viên chính xác và phù hợp với nhu cầu, trình độ học viên.'},
  {domain:'Classroom Management',domain_vi:'Quản lý lớp học',weight:10,criterion:'All learners are involved and participation is active, broad and visible.',criterion_vi:'Tất cả học viên được tham gia; mức độ tham gia tích cực, rộng và quan sát được.'},
  {domain:'Classroom Management',domain_vi:'Quản lý lớp học',weight:5,criterion:'Order, routines, dignity and discipline are maintained.',criterion_vi:'Duy trì trật tự, nề nếp lớp học, sự tôn trọng và kỷ luật phù hợp.'},
  {domain:'Classroom Management',domain_vi:'Quản lý lớp học',weight:10,criterion:'Learners complete the tasks and demonstrate the intended learner outcomes.',criterion_vi:'Học viên hoàn thành nhiệm vụ và thể hiện được đầu ra mong đợi.'},
  {domain:'Classroom Management',domain_vi:'Quản lý lớp học',weight:5,criterion:'Scaffolding and differentiation respond effectively to mixed needs and levels.',criterion_vi:'Hỗ trợ từng bước và phân hóa hoạt động đáp ứng hiệu quả nhu cầu, trình độ khác nhau.'},
  {domain:'Classroom Management',domain_vi:'Quản lý lớp học',weight:5,criterion:'Learner questions and concerns are addressed effectively.',criterion_vi:'Câu hỏi và băn khoăn của học viên được xử lý hiệu quả.'},
  {domain:'Classroom Management',domain_vi:'Quản lý lớp học',weight:10,criterion:'The teacher creates a safe, inclusive and supportive learning environment.',criterion_vi:'Giáo viên tạo môi trường học an toàn, hòa nhập và hỗ trợ.'}
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
