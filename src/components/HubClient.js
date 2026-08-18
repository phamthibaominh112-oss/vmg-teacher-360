'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { t } from '@/lib/i18n'
import RESOURCE_CATALOG from '@/data/resources.json'
import { ROLE_LABELS, DELETE_ROLES, USER_ADMIN_ROLES, REGION_CENTRES, HEAD_OFFICE_ROLES, REGION_SCOPE_ROLES, CENTRE_SCOPE_ROLES, INCIDENT_CATEGORIES, OBSERVATION_RUBRIC, scoreBand, incidentRisk } from '@/lib/config'

const NAV = {
  teacher:['overview','portfolio','growth','observations','training','resources','bulletin','documents','support'],
  cmo:['overview','teachers','performance','incidents','training','resources','touchpoints','upgrades','documents','support'],
  centre_director:['overview','teachers','performance','incidents','training','resources','touchpoints','upgrades','documents','support'],
  regional_director:['overview','teachers','performance','incidents','training','resources','touchpoints','upgrades','documents','support'],
  csr:['overview','teachers','incidents','coordination','training','resources','touchpoints','performance','documents','support'],
  rnd:['overview','teachers','performance','observations','training','touchpoints','upgrades','incidents','documents','support','resources','bulletin','access','imports','governance'],
  bod:['overview','teachers','performance','observations','training','touchpoints','upgrades','incidents','documents','support','resources','bulletin','access','imports','governance'],
  academic_supervisor:['overview','teachers','performance','observations','training','calendar','touchpoints','upgrades','documents','support','resources','imports'],
  ptns:['overview','teachers','documents','training','bulletin','support','kpi','performance','touchpoints','resources','imports']
}
const GLYPHS={overview:'⌂',teachers:'◎',portfolio:'◉',growth:'▦',resources:'⌕',support:'?',bulletin:'▤',training:'△',calendar:'□',observations:'✓',incidents:'!',performance:'↗',touchpoints:'↻',upgrades:'↑',documents:'▱',kpi:'%',coordination:'⇄',access:'◇',governance:'◆',imports:'⇩'}
const LABEL_KEY={overview:'overview',teachers:'teachers',portfolio:'myPortfolio',growth:'growthMatrix',resources:'resources',support:'support',bulletin:'bulletin',training:'training',calendar:'calendar',observations:'observations',incidents:'incidents',performance:'performance',touchpoints:'touchpoints',upgrades:'upgrades',documents:'documents',kpi:'kpi',coordination:'coordination',access:'access',governance:'governance',imports:'imports'}
const nowDate=()=>new Date().toISOString().slice(0,10)
const initials=n=>(n||'VMG').trim().split(/\s+/).slice(-2).map(x=>x[0]).join('').toUpperCase()
const fmt=(d,lang='en')=>d?new Intl.DateTimeFormat(lang==='vi'?'vi-VN':'en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(d)):'—'
const relative=(d,lang='en')=>{if(!d)return '—';const delta=Math.ceil((new Date(d)-new Date())/86400000);if(lang==='vi')return delta===0?'Hôm nay':delta===1?'Ngày mai':delta>1?`Còn ${delta} ngày`:`${Math.abs(delta)} ngày trước`;return delta===0?'Today':delta===1?'Tomorrow':delta>1?`In ${delta} days`:`${Math.abs(delta)} days ago`}
const bi=(lang,en,vi)=>lang==='vi'?vi:en
const TERM_VI={
  'Full Observation':'Dự giờ đầy đủ','Re-observation':'Dự giờ lại','Pop-up Check':'Kiểm tra nhanh',
  'Retraining':'Đào tạo lại','Upgrade Training':'Đào tạo nâng level','Methodology':'Phương pháp giảng dạy','Classroom Management':'Quản lý lớp học','Compliance':'Tuân thủ','Product / Programme':'Sản phẩm / Chương trình','Academic Accuracy':'Độ chính xác học thuật','Learner Care':'Chăm sóc học viên','Other':'Khác',
  'Catch-up':'Trao đổi định kỳ','Teacher Meeting':'Họp giáo viên','Performance Meeting':'Trao đổi hiệu suất',
  'Observation':'Dự giờ','Feedback / coaching':'Phản hồi / hướng dẫn','Catch-up meeting':'Họp trao đổi định kỳ','Retraining follow-up':'Theo dõi sau đào tạo lại','Performance conversation':'Trao đổi hiệu suất',
  'Low':'Thấp','Medium':'Trung bình','High':'Cao','Critical':'Khẩn cấp','Normal':'Bình thường','Urgent':'Khẩn',
  'Missing':'Thiếu','Pending':'Đang chờ','Verified':'Đã xác minh','Complete':'Hoàn tất','Active':'Đang hoạt động','Inactive':'Ngưng hoạt động','Degree / University qualification':'Bằng cấp / Bằng đại học','TESOL / Teaching qualification':'TESOL / Nghiệp vụ sư phạm','English qualification':'Chứng chỉ tiếng Anh','Native-language / nationality proof':'Minh chứng bản ngữ / quốc tịch','Employment / Contract document':'Hồ sơ việc làm / Hợp đồng','Identity / Personal document':'Giấy tờ cá nhân',
  'Prepare':'Chuẩn bị','Teach':'Giảng dạy','Assess':'Đánh giá','All':'Tất cả','All teachers':'Tất cả giáo viên','Targeted teachers':'Nhóm giáo viên mục tiêu'
}
const dv=(lang,v)=>lang==='vi'?(TERM_VI[v]||v):v
const bandLabel=(lang,score)=>{const b=scoreBand(Number(score||0));if(lang!=='vi')return b;return ({'Excellent':'Xuất sắc','Very good':'Rất tốt','Good':'Tốt','Satisfactory':'Đạt','Improvement / Training needed':'Cần cải thiện / đào tạo'})[b]||b}
const INCIDENT_VI={'Punctuality & Attendance':'Đúng giờ & chuyên cần','Academic Delivery':'Chất lượng giảng dạy','Classroom Management':'Quản lý lớp học','Learner Care / Service':'Chăm sóc học viên / dịch vụ','Documentation & Compliance':'Hồ sơ & tuân thủ','Communication & Conduct':'Giao tiếp & tác phong','Safeguarding / Ethics':'An toàn & đạo đức','Technology / Operational Readiness':'Công nghệ & sẵn sàng vận hành','Other':'Khác'}
const incidentLabel=(lang,v)=>lang==='vi'?(INCIDENT_VI[v]||v):v
const CAP_VI={'Preparation & Readiness':'Chuẩn bị & Sẵn sàng','Teaching Methodology':'Phương pháp giảng dạy','Classroom Management':'Quản lý lớp học','Learner Engagement':'Mức độ tham gia của học viên','Assessment & Feedback':'Đánh giá & Phản hồi','Differentiation':'Cá nhân hóa theo nhu cầu học viên','English Use':'Sử dụng tiếng Anh','Inclusive Learning':'Môi trường học hòa nhập'}
const capName=(lang,v)=>lang==='vi'?(CAP_VI[v]||v):v
const CONF_VI={'High':'Cao','Medium':'Trung bình','Developing':'Đang xây dựng'}
const confLabel=(lang,v)=>lang==='vi'?(CONF_VI[v]||v):v
const STATUS_VI={pending_director_approval:'Chờ GĐTT duyệt',approved:'Đã duyệt',open:'Đang mở',in_progress:'Đang xử lý',waiting_teacher:'Chờ giáo viên',closed:'Đã đóng',resolved:'Đã xử lý',submitted:'Đã gửi',pending_rnd_approval:'Chờ R&D duyệt',rejected:'Từ chối'}
const statusLabel=(lang,v)=>lang==='vi'?(STATUS_VI[v]||String(v||'').replaceAll('_',' ')):String(v||'').replaceAll('_',' ')
const RISK_ACTION_VI={Stable:'Theo dõi định kỳ',Watch:'Hướng dẫn và dự giờ có mục tiêu',Danger:'Đánh giá chính thức, đào tạo lại và cân nhắc điều chỉnh lớp',Critical:'Nâng mức xử lý ngay và thực hiện đánh giá chính thức'}
const riskAction=(lang,risk)=>lang==='vi'?(RISK_ACTION_VI[risk?.level]||risk?.action):risk?.action
const PROGRAMME_NOTE_VI={'Methodology · management · engagement':'Phương pháp · quản lý lớp · tương tác','Methodology · assessment · language use':'Phương pháp · đánh giá · sử dụng ngôn ngữ','Interaction · language use · inclusion':'Tương tác · sử dụng ngôn ngữ · hòa nhập','Differentiation · management · feedback':'Phân hóa · quản lý lớp · phản hồi'}
const programmeNote=(lang,v)=>lang==='vi'?(PROGRAMME_NOTE_VI[v]||v):v

export default function HubClient({profile}){
  const supabase=useMemo(()=>createClient(),[])
  const [lang,setLang]=useState(profile.language_preference||'en')
  const [view,setView]=useState('overview')
  const [mobile,setMobile]=useState(false)
  const [loading,setLoading]=useState(true)
  const [data,setData]=useState({users:[],teachers:[],announcements:[],trainings:[],registrations:[],observations:[],incidents:[],touchpoints:[],documents:[],documentSubmissions:[],kpis:[],upgrades:[],events:[],notifications:[],resources:[],support:[]})
  const [selectedTeacherId,setSelectedTeacherId]=useState(profile.role==='teacher'?profile.id:null)
  const [modal,setModal]=useState(null)
  const [toast,setToast]=useState('')
  const [notifOpen,setNotifOpen]=useState(false)

  const flash=(m)=>{setToast(m);setTimeout(()=>setToast(''),2600)}
  const canRemove=DELETE_ROLES.includes(profile.role)
  const canAdmin=USER_ADMIN_ROLES.includes(profile.role)
  const globalRole=HEAD_OFFICE_ROLES.includes(profile.role)
  const regionRole=REGION_SCOPE_ROLES.includes(profile.role)
  const centreRole=CENTRE_SCOPE_ROLES.includes(profile.role)
  const nav=NAV[profile.role]||['overview']

  const load=useCallback(async()=>{
    setLoading(true)
    const queries=[
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('announcements').select('*').eq('is_active',true).order('published_at',{ascending:false}).limit(30),
      supabase.from('trainings').select('*').order('starts_at',{ascending:true}).limit(100),
      supabase.from('training_registrations').select('*'),
      supabase.from('observations').select('*').order('observed_at',{ascending:false}).limit(250),
      supabase.from('incidents').select('*').order('created_at',{ascending:false}).limit(250),
      supabase.from('teacher_touchpoints').select('*').order('touch_date',{ascending:false}).limit(300),
      supabase.from('teacher_documents').select('*'),
      supabase.from('teacher_document_submissions').select('*').order('created_at',{ascending:false}).limit(300),
      supabase.from('teacher_kpi_snapshots').select('*').order('period_start',{ascending:false}).limit(250),
      supabase.from('upgrade_recommendations').select('*').order('created_at',{ascending:false}).limit(100),
      supabase.from('teacher_events').select('*').order('starts_at',{ascending:true}).limit(100),
      supabase.from('notifications').select('*').order('created_at',{ascending:false}).limit(80),
      supabase.from('academic_resources').select('*').eq('is_active',true).order('programme').order('name'),
      supabase.from('support_requests').select('*').order('created_at',{ascending:false}).limit(150)
    ]
    const results=await Promise.all(queries)
    const keys=['users','announcements','trainings','registrations','observations','incidents','touchpoints','documents','documentSubmissions','kpis','upgrades','events','notifications','resources','support']
    const next={}
    results.forEach((r,i)=>{next[keys[i]]=r.data||[]})
    const avatarUsers=(next.users||[]).filter(u=>u.avatar_path)
    if(avatarUsers.length){
      const paths=avatarUsers.map(u=>u.avatar_path)
      const {data:signed=[]}=await supabase.storage.from('profile-photos').createSignedUrls(paths,60*60*12)
      const byPath={};(signed||[]).forEach((x,i)=>{if(x?.signedUrl)byPath[paths[i]]=x.signedUrl})
      next.users=(next.users||[]).map(u=>({...u,avatar_signed_url:u.avatar_path?byPath[u.avatar_path]:(u.avatar_url||null)}))
    }
    next.teachers=(next.users||[]).filter(u=>u.role==='teacher')
    setData(next)
    setSelectedTeacherId(v=>v||next.teachers[0]?.id||null)
    setLoading(false)
  },[supabase])

  useEffect(()=>{load()},[load])
  useEffect(()=>{localStorage.setItem('vmg-lang',lang)},[lang])

  async function logout(){await supabase.auth.signOut();location.href='/login'}
  const currentUser=data.users.find(x=>x.id===profile.id)||profile
  const selectedTeacher=data.teachers.find(x=>x.id===selectedTeacherId)||(profile.role==='teacher'?currentUser:data.teachers[0])
  const unreadNotifications=data.notifications.filter(n=>!n.read_at).length
  const roleName=ROLE_LABELS[profile.role]?.[lang]||profile.role
  const scope=profile.role==='teacher'
    ? (lang==='vi'?'Hồ sơ cá nhân':'Personal portfolio')
    : globalRole
      ? (lang==='vi'?'Toàn hệ thống':'Head Office · All regions')
      : regionRole
        ? `${lang==='vi'?'Khu vực':'Region'} ${profile.region_no||'—'}`
        : centreRole
          ? `${profile.home_centre_code||bi(lang,'Centre not assigned','Chưa gán trung tâm')}`
          : (lang==='vi'?'Phạm vi được phân quyền':'Assigned scope')

  return <div className="app-shell">
    <aside className={`sidebar ${mobile?'open':''}`}>
      <div className="side-brand"><img src="/vmg-logo.png" alt="VMG English"/><span>TEACHER 360 · EXCELLENCE HUB</span></div>
      <div className="side-scope"><div className="scope-card"><span>{bi(lang,'MY WORKSPACE','KHÔNG GIAN LÀM VIỆC')}</span><b>{roleName} · {scope}</b></div></div>
      <nav className="side-nav">{navGroups().map(g=><div className="nav-group" key={g.key}><span className="nav-group-label">{g.label}</span>{g.items.map(n=><button key={n} className={view===n?'active':''} onClick={()=>{setView(n);setMobile(false)}}><span className="nav-glyph">{GLYPHS[n]}</span><span>{t(lang,LABEL_KEY[n])}</span></button>)}</div>)}</nav>
      <div className="side-user"><button className="profile-photo-trigger" title={bi(lang,'Change profile photo','Đổi ảnh đại diện')} onClick={()=>setModal({type:'avatar'})}><AvatarPic user={currentUser}/><i>✦</i></button><div><b>{profile.full_name}</b><span>{profile.email}</span></div><button title={t(lang,'logout')} onClick={logout}>↪</button></div>
    </aside>
    <div className="main-wrap">
      <header className="topbar">
        <button className="hamburger" onClick={()=>setMobile(!mobile)}>☰</button>
        <div className="top-title"><span>VMG TEACHER 360 / {t(lang,LABEL_KEY[view]).toUpperCase()}</span><h1>{t(lang,LABEL_KEY[view])}</h1></div>
        <div className="top-actions">
          <div className="today-chip"><span>●</span>{bi(lang,'Ready for today','Sẵn sàng hôm nay')}</div>
          <button className={`notif-button ${notifOpen?'active':''}`} onClick={()=>setNotifOpen(!notifOpen)} aria-label={bi(lang,'Notifications','Thông báo')}><span>♢</span>{unreadNotifications>0&&<b>{unreadNotifications>99?'99+':unreadNotifications}</b>}</button>
          <div className="lang-toggle"><button className={lang==='en'?'active':''} onClick={()=>setLang('en')}>EN</button><button className={lang==='vi'?'active':''} onClick={()=>setLang('vi')}>VI</button></div>
          {profile.role==='academic_supervisor'&&<button className="btn primary" onClick={()=>{setView('observations');setModal({type:'observation'})}}>＋ {bi(lang,'New observation','Tạo phiếu dự giờ')}</button>}
        </div>
      </header>
      <main className="content">{loading?<Loading lang={lang}/>:renderView()}</main>
      <BrandFooter lang={lang}/>
    </div>
    {modal&&<Modal title={modalTitle(modal.type,lang)} onClose={()=>setModal(null)}>{renderModal()}</Modal>}
    {toast&&<div className="toast"><i>✓</i><b>{toast}</b></div>}
    {notifOpen&&<div className="notif-scrim" onClick={()=>setNotifOpen(false)}><aside className="notif-drawer" onClick={e=>e.stopPropagation()}>
      <div className="notif-head"><div><span>{bi(lang,'MY INBOX','HỘP THƯ CỦA TÔI')}</span><h3>{bi(lang,'Notifications','Thông báo')}</h3></div><div className="row-actions"><button className="mini-link" onClick={markAllNotifications}>{bi(lang,'Mark all read','Đánh dấu đã đọc')}</button><button className="icon-close" onClick={()=>setNotifOpen(false)}>×</button></div></div>
      <div className="notif-list">{data.notifications.slice(0,30).map(n=><button key={n.id} className={`notif-item ${n.read_at?'':'unread'}`} onClick={()=>openNotification(n)}><i>{n.read_at?'✓':'•'}</i><span><b>{n.title}</b><p>{n.body}</p><small>{relative(n.created_at,lang)}</small></span></button>)}{!data.notifications.length&&<Empty lang={lang}/>}</div>
    </aside></div>}
  </div>

  function navGroups(){
    const defs=[
      {key:'workspace',label:t(lang,'menuWorkspace'),items:['overview','portfolio','teachers']},
      {key:'people',label:t(lang,'menuPeople'),items:['growth','performance','observations','training','calendar','touchpoints','upgrades']},
      {key:'operations',label:t(lang,'menuOperations'),items:['incidents','coordination','documents','support','kpi']},
      {key:'tools',label:t(lang,'menuTools'),items:['resources','bulletin','access','imports','governance']}
    ]
    return defs.map(g=>({...g,items:g.items.filter(x=>nav.includes(x))})).filter(g=>g.items.length)
  }

  function renderView(){
    const map={overview:<Overview/>,portfolio:<Portfolio/>,growth:<GrowthMatrix/>,resources:<Resources/>,support:<Support/>,teachers:<Teachers/>,bulletin:<Bulletin/>,training:<Training/>,calendar:<Calendar/>,observations:<Observations/>,incidents:<Incidents/>,performance:<Performance/>,touchpoints:<Touchpoints/>,upgrades:<Upgrades/>,documents:<Documents/>,kpi:<Kpi/>,coordination:<Coordination/>,access:<Access/>,imports:<Imports/>,governance:<Governance/>}
    return map[view]||map.overview
  }

  function Overview(){
    const teacherMode=profile.role==='teacher'
    const [regionFilter,setRegionFilter]=useState(globalRole?'ALL':String(profile.region_no||'ALL'))
    const [centreFilter,setCentreFilter]=useState('ALL')
    const scopeBase=teacherMode?[profile]:data.teachers.filter(x=>{
      if(centreRole)return !profile.home_centre_code||x.home_centre_code===profile.home_centre_code
      if(regionRole)return !profile.region_no||Number(x.region_no)===Number(profile.region_no)
      return true
    })
    const availableCentres=[...new Set(scopeBase.map(x=>x.home_centre_code).filter(Boolean))].sort()
    const scopedTeachers=scopeBase.filter(x=>{
      if(globalRole&&regionFilter!=='ALL'&&String(x.region_no)!==String(regionFilter))return false
      if(centreFilter!=='ALL'&&x.home_centre_code!==centreFilter)return false
      return true
    })
    const teacherIds=new Set(scopedTeachers.map(x=>x.id))
    const scopedObs=data.observations.filter(x=>teacherIds.has(x.teacher_id)&&x.final_score!==null)
    const scopedKpis=data.kpis.filter(x=>teacherIds.has(x.teacher_id))
    const scopedCases=data.incidents.filter(x=>teacherIds.has(x.teacher_id))
    const weekAgo=new Date(Date.now()-7*86400000)
    const scopedTouches=data.touchpoints.filter(x=>teacherIds.has(x.teacher_id)&&new Date(x.touch_date)>=weekAgo)
    const touchBy={};scopedTouches.forEach(x=>touchBy[x.teacher_id]=(touchBy[x.teacher_id]||0)+1)
    const covered=scopedTeachers.filter(x=>(touchBy[x.id]||0)>=2).length
    const openCases=scopedCases.filter(x=>!['closed','resolved'].includes(x.status))
    const nextEvents=[...data.trainings,...data.events.filter(x=>teacherMode?x.teacher_id===profile.id:teacherIds.has(x.teacher_id))].filter(x=>new Date(x.starts_at)>=new Date()).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)).slice(0,5)

    if(teacherMode){
      const teacher=currentUser
      const latest=latestObs(teacher.id)
      const kpi=latestKpi(teacher.id)
      const intel=teacherIntel(teacher)
      const caps=capabilityData(teacher.id)
      const strong=[...caps].sort((a,b)=>b.score-a.score).slice(0,3)
      const grow=[...caps].sort((a,b)=>a.score-b.score).slice(0,3)
      const docs=Number(data.documents.find(x=>x.teacher_id===teacher.id)?.completion_pct||0)
      const touch=Math.min(2,data.touchpoints.filter(x=>x.teacher_id===teacher.id&&new Date(x.touch_date)>=weekAgo).length)
      const fallbackPulse=Math.round((Number(latest?.final_score||0)*.55)+(Number(kpi?.hvr_pct||0)*.25)+(touch/2*100*.1)+(docs*.1))
      const pulse=Number(kpi?.composite_score||fallbackPulse||0)
      const trend=data.observations.filter(x=>x.teacher_id===teacher.id&&x.final_score!==null).slice(0,10).reverse().map(x=>({label:new Date(x.observed_at).toLocaleDateString(lang==='vi'?'vi-VN':'en-GB',{month:'short'}),value:Number(x.final_score)}))
      const booked=data.registrations.filter(x=>x.user_id===teacher.id).length
      return <div className="portfolio-dashboard">
        <section className="portfolio-welcome">
          <div className="profile-snapshot">
            <div className="profile-orbit"><AvatarPic user={teacher} className="profile-avatar-xl"/><button className="avatar-edit-mini" onClick={()=>setModal({type:'avatar'})}>{bi(lang,'Photo','Ảnh')}</button><ScoreRing value={pulse||0}/></div>
            <div><span className="kicker">{bi(lang,'MY TEACHING PORTFOLIO','HỒ SƠ PHÁT TRIỂN CỦA TÔI')}</span><h2>{bi(lang,'Good to see you','Chào bạn')}, {teacher.full_name.split(' ').slice(-1)[0]}.</h2><p>{bi(lang,'Your teaching evidence, learner impact and development journey — in one motivating view.','Hiệu suất giảng dạy, tác động tới học viên và hành trình phát triển của bạn — trong một góc nhìn rõ ràng.')}</p><div className="profile-tags"><span>{teacher.professional_level||bi(lang,'Level building','Đang cập nhật level')}</span><span>{teacher.home_centre_code||'VMG'}</span><span>{bi(lang,'Growth readiness','Sẵn sàng phát triển')} {intel.upgradePotential}%</span></div></div>
          </div>
          <div className="portfolio-pulse"><span>{bi(lang,'PORTFOLIO PULSE','CHỈ SỐ HỒ SƠ')}</span><b>{pulse||'—'}</b><small>{kpi?.composite_score?bi(lang,'Latest recorded performance snapshot','Ảnh chụp hiệu suất gần nhất'):bi(lang,'Live portfolio signal from available evidence','Tín hiệu tổng hợp từ bằng chứng hiện có')}</small><button onClick={()=>setView('portfolio')}>{bi(lang,'Open full portfolio','Mở hồ sơ chi tiết')} →</button></div>
        </section>

        <section className="dash-stat-grid teacher-stat-grid">
          <StatTile icon="◎" label={bi(lang,'Observation','Dự giờ')} value={latest?.final_score??'—'} suffix={latest?.final_score?' / 100':''} note={latest?.final_score?bandLabel(lang,latest.final_score):bi(lang,'Build your first evidence point','Chưa có dữ liệu chính thức')} tone="coral"/>
          <StatTile icon="↗" label="HVR" value={kpi?.hvr_pct??'—'} suffix={kpi?.hvr_pct?'%':''} note={bi(lang,'Learner retention signal','Tín hiệu duy trì học viên')} tone="blue"/>
          <StatTile icon="◇" label={bi(lang,'Growth readiness','Sẵn sàng phát triển')} value={intel.upgradePotential||0} suffix="%" note={intel.recommendation} tone="violet"/>
          <StatTile icon="✓" label={bi(lang,'Check-ins this week','Theo dõi tuần này')} value={`${touch}/2`} note={bi(lang,'Meaningful development touchpoints','Lượt trao đổi phát triển có ý nghĩa')} tone="green"/>
        </section>
        <DashboardAnnouncements items={data.announcements.slice(0,3)} lang={lang} onOpen={()=>setView('bulletin')}/>

        <section className="portfolio-grid">
          <article className="dash-card dash-span-8">
            <div className="dash-head"><div><span>{bi(lang,'PERFORMANCE JOURNEY','HÀNH TRÌNH HIỆU SUẤT')}</span><h3>{bi(lang,'How your classroom evidence is moving','Dữ liệu lớp học của bạn đang tiến triển ra sao')}</h3></div><button className="mini-link" onClick={()=>setView('observations')}>{bi(lang,'All feedback','Tất cả phản hồi')} →</button></div>
            <TrendChart points={trend} emptyText={bi(lang,'Your observation trend will appear here after scores are recorded.','Xu hướng dự giờ sẽ hiển thị khi có điểm được ghi nhận.')}/>
          </article>
          <article className="dash-card dash-span-4 growth-card">
            <div className="dash-head"><div><span>{bi(lang,'NEXT BEST STEP','BƯỚC TIẾP THEO')}</span><h3>{bi(lang,'Your development focus','Trọng tâm phát triển')}</h3></div></div>
            <div className="focus-orb"><b>{grow[0]?.score||'—'}</b><span>{grow[0]?capName(lang,grow[0].name):bi(lang,'Evidence building','Đang bổ sung bằng chứng')}</span></div>
            <p>{latest?.smart_action||latest?.improvement_areas||teacher.development_focus||bi(lang,'Choose one observable classroom action and verify it in your next observation.','Chọn một hành động có thể quan sát trong lớp và xác minh ở lần dự giờ tiếp theo.')}</p>
            <button className="btn soft" onClick={()=>setView('growth')}>{bi(lang,'Explore my skills','Xem năng lực của tôi')} →</button>
          </article>

          <article className="dash-card dash-span-5">
            <div className="dash-head"><div><span>{bi(lang,'WHAT IS WORKING','ĐIỂM ĐANG LÀM TỐT')}</span><h3>{bi(lang,'Strength portfolio','Danh mục điểm mạnh')}</h3></div></div>
            <MiniBarList items={strong.map(x=>({label:capName(lang,x.name),value:x.score,meta:`${x.evidenceCount} ${bi(lang,'evidence','bằng chứng')}`}))}/>
          </article>
          <article className="dash-card dash-span-3 mini-learning-card">
            <span>{bi(lang,'LEARNING MOMENTUM','NHỊP HỌC TẬP')}</span><b>{booked}</b><strong>{bi(lang,'training bookings','lượt đăng ký đào tạo')}</strong><p>{docs}% {bi(lang,'document readiness','độ hoàn thiện hồ sơ')} · {data.upgrades.filter(x=>x.teacher_id===teacher.id&&x.status==='approved').length} {bi(lang,'approved progression steps','bước phát triển đã duyệt')}</p><button onClick={()=>setView('training')}>{bi(lang,'Go to learning hub','Đến khu đào tạo')} →</button>
          </article>
          <article className="dash-card dash-span-4">
            <div className="dash-head"><div><span>{bi(lang,'COMING UP','SẮP DIỄN RA')}</span><h3>{bi(lang,'My academic calendar','Lịch phát triển của tôi')}</h3></div></div>
            <div className="dashboard-events">{nextEvents.slice(0,4).map((e,i)=><div key={`${e.id}-${i}`}><span>{new Date(e.starts_at).getDate()}<small>{new Date(e.starts_at).toLocaleDateString(lang==='vi'?'vi-VN':'en-GB',{month:'short'})}</small></span><div><b>{e.title}</b><small>{e.location||e.event_type||'VMG'}</small></div></div>)}{!nextEvents.length&&<Empty lang={lang}/>}</div>
          </article>
        </section>
      </div>
    }

    const intelRows=scopedTeachers.map(t=>({teacher:t,intel:teacherIntel(t)}))
    const obsValues=intelRows.map(x=>x.intel.score).filter(Boolean)
    const hvrValues=intelRows.map(x=>x.intel.hvr).filter(Boolean)
    const avgObs=obsValues.length?Math.round(obsValues.reduce((a,b)=>a+b,0)/obsValues.length):0
    const avgHvr=hvrValues.length?Math.round(hvrValues.reduce((a,b)=>a+b,0)/hvrValues.length):0
    const avgReady=intelRows.length?Math.round(intelRows.reduce((a,x)=>a+x.intel.upgradePotential,0)/intelRows.length):0
    const dist=[
      {label:'90+',value:intelRows.filter(x=>x.intel.score>90).length},
      {label:'81–90',value:intelRows.filter(x=>x.intel.score>=81&&x.intel.score<=90).length},
      {label:'70–80',value:intelRows.filter(x=>x.intel.score>=70&&x.intel.score<=80).length},
      {label:'60–69',value:intelRows.filter(x=>x.intel.score>=60&&x.intel.score<70).length},
      {label:'<60',value:intelRows.filter(x=>x.intel.score>0&&x.intel.score<60).length}
    ]
    const attention=[...intelRows].filter(x=>x.intel.risk.level!=='Stable'||(x.intel.score&&x.intel.score<75)||x.intel.touchCount<2).sort((a,b)=>{
      const riskWeight={Critical:4,Danger:3,Watch:2,Stable:1};return (riskWeight[b.intel.risk.level]-riskWeight[a.intel.risk.level])||(a.intel.score-b.intel.score)
    }).slice(0,6)
    const progress=[...intelRows].filter(x=>x.intel.score||x.intel.hvr).sort((a,b)=>b.intel.upgradePotential-a.intel.upgradePotential).slice(0,5)
    const monthly={}
    scopedObs.forEach(o=>{const d=new Date(o.observed_at);const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;(monthly[key]??=[]).push(Number(o.final_score))})
    const trend=Object.entries(monthly).sort(([a],[b])=>a.localeCompare(b)).slice(-8).map(([key,vals])=>({label:new Date(`${key}-01`).toLocaleDateString(lang==='vi'?'vi-VN':'en-GB',{month:'short'}),value:Math.round(vals.reduce((a,b)=>a+b,0)/vals.length)}))
    const centreRows=availableCentres.map(c=>{
      const ts=scopedTeachers.filter(t=>t.home_centre_code===c);const ids=new Set(ts.map(t=>t.id));const os=scopedObs.filter(o=>ids.has(o.teacher_id)).map(o=>Number(o.final_score)).filter(Boolean);const ks=scopedKpis.filter(k=>ids.has(k.teacher_id)).map(k=>Number(k.hvr_pct)).filter(Boolean);const cases=openCases.filter(i=>ids.has(i.teacher_id)).length
      return{centre:c,teachers:ts.length,obs:os.length?Math.round(os.reduce((a,b)=>a+b,0)/os.length):0,hvr:ks.length?Math.round(ks.reduce((a,b)=>a+b,0)/ks.length):0,cases}
    }).sort((a,b)=>b.obs-a.obs)
    const scopeTitle=globalRole
      ? bi(lang,'Whole-system teacher performance','Hiệu suất giáo viên toàn hệ thống')
      : regionRole
        ? bi(lang,`Region ${profile.region_no} teacher performance`,`Hiệu suất giáo viên Khu vực ${profile.region_no}`)
        : bi(lang,`${profile.home_centre_code||'Centre'} teacher performance`,`Hiệu suất giáo viên ${profile.home_centre_code||'trung tâm'}`)
    const recommendations=[]
    const missed=intelRows.filter(x=>x.intel.touchCount<2).length
    const low=intelRows.filter(x=>x.intel.score&&x.intel.score<70).length
    const upgrade=intelRows.filter(x=>x.intel.upgradePotential>=80&&x.intel.risk.level==='Stable').length
    if(missed)recommendations.push({tone:'amber',title:bi(lang,`${missed} teachers need a check-in`,`${missed} giáo viên cần được theo dõi`),text:bi(lang,'Prioritise coaching / feedback before the weekly cycle closes.','Ưu tiên coaching / phản hồi trước khi kết thúc chu kỳ tuần.')})
    if(low)recommendations.push({tone:'red',title:bi(lang,`${low} teachers below 70 observation`,`${low} giáo viên có điểm dự giờ dưới 70`),text:bi(lang,'Build targeted retraining and re-observation plans.','Lập kế hoạch đào tạo lại có mục tiêu và dự giờ lại.')})
    if(upgrade)recommendations.push({tone:'green',title:bi(lang,`${upgrade} teachers show progression potential`,`${upgrade} giáo viên có tín hiệu sẵn sàng phát triển`),text:bi(lang,'Review evidence packs for level or higher-complexity allocation.','Rà soát hồ sơ bằng chứng để cân nhắc nâng cấp độ hoặc phân lớp cao hơn.')})
    if(!recommendations.length)recommendations.push({tone:'blue',title:bi(lang,'Team signals are currently stable','Tín hiệu đội ngũ hiện ổn định'),text:bi(lang,'Keep observation, coaching and recognition rhythms consistent.','Duy trì đều nhịp dự giờ, coaching và ghi nhận.')})

    return <div className="management-dashboard">
      <section className="management-hero">
        <div><span className="kicker">{bi(lang,'PEOPLE · QUALITY · EVIDENCE','CON NGƯỜI · CHẤT LƯỢNG · MINH CHỨNG')}</span><h2>{scopeTitle}</h2><p>{bi(lang,'See performance, support signals and development opportunities before deciding what the team needs next.','Nhìn rõ hiệu suất, tín hiệu cần hỗ trợ và cơ hội phát triển trước khi quyết định đội ngũ cần gì tiếp theo.')}</p></div>
        <div className="scope-filter-card">
          <span>{bi(lang,'DASHBOARD SCOPE','PHẠM VI DASHBOARD')}</span>
          <div className="scope-filters">
            {globalRole&&<select value={regionFilter} onChange={e=>{setRegionFilter(e.target.value);setCentreFilter('ALL')}}><option value="ALL">{bi(lang,'All regions','Tất cả khu vực')}</option>{[1,2,3].map(r=><option key={r} value={r}>{bi(lang,'Region','Khu vực')} {r}</option>)}</select>}
            {(globalRole||regionRole)&&<select value={centreFilter} onChange={e=>setCentreFilter(e.target.value)}><option value="ALL">{bi(lang,'All centres','Tất cả trung tâm')}</option>{availableCentres.filter(c=>regionFilter==='ALL'||String(data.teachers.find(t=>t.home_centre_code===c)?.region_no)===String(regionFilter)).map(c=><option key={c}>{c}</option>)}</select>}
          </div>
          <b>{scopedTeachers.length} {bi(lang,'teachers in view','giáo viên trong phạm vi')}</b>
        </div>
      </section>

      <section className="dash-stat-grid management-stat-grid">
        <StatTile icon="◎" label={bi(lang,'Teachers','Giáo viên')} value={scopedTeachers.length} note={bi(lang,'Active portfolio population','Quy mô hồ sơ đang theo dõi')} tone="violet"/>
        <StatTile icon="↗" label={bi(lang,'Avg observation','Điểm dự giờ TB')} value={avgObs||'—'} note={`${scopedObs.length} ${bi(lang,'evidence records','hồ sơ bằng chứng')}`} tone="coral"/>
        <StatTile icon="♡" label="HVR" value={avgHvr||'—'} suffix={avgHvr?'%':''} note={bi(lang,'Average learner retention','Duy trì học viên trung bình')} tone="blue"/>
        <StatTile icon="!" label={bi(lang,'Open cases','Sự vụ đang mở')} value={openCases.length} note={bi(lang,'Needs ownership / closure','Cần xử lý / đóng vòng')} tone={openCases.length?'amber':'green'}/>
        <StatTile icon="✓" label={bi(lang,'Check-in coverage','Độ phủ theo dõi')} value={scopedTeachers.length?Math.round(covered/scopedTeachers.length*100):0} suffix="%" note={`${covered}/${scopedTeachers.length} ${bi(lang,'met weekly standard','đạt chuẩn tuần')}`} tone="green"/>
      </section>
      <DashboardAnnouncements items={data.announcements.slice(0,3)} lang={lang} onOpen={()=>setView('bulletin')}/>

      <section className="portfolio-grid">
        <article className="dash-card dash-span-8">
          <div className="dash-head"><div><span>{bi(lang,'QUALITY TREND','XU HƯỚNG CHẤT LƯỢNG')}</span><h3>{bi(lang,'Observation performance over time','Hiệu suất dự giờ theo thời gian')}</h3></div><span className="metric-chip">{bi(lang,'Growth readiness','Sẵn sàng phát triển')} {avgReady}%</span></div>
          <TrendChart points={trend} emptyText={bi(lang,'Import historical observation scores to unlock the trend line.','Nhập lịch sử dự giờ để mở biểu đồ xu hướng.')}/>
        </article>
        <article className="dash-card dash-span-4">
          <div className="dash-head"><div><span>{bi(lang,'PERFORMANCE MIX','PHÂN BỐ HIỆU SUẤT')}</span><h3>{bi(lang,'Observation bands','Nhóm điểm dự giờ')}</h3></div></div>
          <DistributionBars items={dist} total={Math.max(1,dist.reduce((a,x)=>a+x.value,0))}/>
        </article>

        <article className="dash-card dash-span-7">
          <div className="dash-head"><div><span>{bi(lang,'WHERE TO ACT FIRST','ƯU TIÊN HÀNH ĐỘNG')}</span><h3>{bi(lang,'Teachers needing attention','Giáo viên cần được chú ý')}</h3></div><button className="mini-link" onClick={()=>setView('teachers')}>{bi(lang,'Teacher directory','Danh sách GV')} →</button></div>
          <div className="attention-list">{attention.map(x=><TeacherAttentionCard key={x.teacher.id} item={x} lang={lang} onOpen={()=>{setSelectedTeacherId(x.teacher.id);setView('portfolio')}}/>)}{!attention.length&&<div className="positive-empty">✓ <b>{bi(lang,'No urgent teacher signals in this scope.','Không có tín hiệu giáo viên khẩn cấp trong phạm vi này.')}</b></div>}</div>
        </article>
        <article className="dash-card dash-span-5 recommendation-card">
          <div className="dash-head"><div><span>{bi(lang,'RECOMMENDATION ENGINE','GỢI Ý HÀNH ĐỘNG')}</span><h3>{bi(lang,'What the data suggests next','Dữ liệu gợi ý làm gì tiếp theo')}</h3></div></div>
          <div className="recommendation-list">{recommendations.map((r,i)=><div className={`recommendation ${r.tone}`} key={i}><i>{i+1}</i><div><b>{r.title}</b><p>{r.text}</p></div></div>)}</div>
        </article>

        {(globalRole||regionRole)&&<article className="dash-card dash-span-7">
          <div className="dash-head"><div><span>{bi(lang,'CENTRE BENCHMARK','SO SÁNH TRUNG TÂM')}</span><h3>{bi(lang,'Compare quality signals across centres','So sánh tín hiệu chất lượng giữa các trung tâm')}</h3></div></div>
          <div className="centre-compare">{centreRows.map(r=><CentreCompareRow key={r.centre} row={r} lang={lang}/>)}</div>
        </article>}
        <article className={`dash-card ${(globalRole||regionRole)?'dash-span-5':'dash-span-12'}`}>
          <div className="dash-head"><div><span>{bi(lang,'PROGRESSION PIPELINE','NHÓM CÓ TIỀM NĂNG PHÁT TRIỂN')}</span><h3>{bi(lang,'Teachers ready for recognition or review','Giáo viên sẵn sàng được ghi nhận / đánh giá')}</h3></div></div>
          <div className="progression-list">{progress.map((x,i)=><button key={x.teacher.id} onClick={()=>{setSelectedTeacherId(x.teacher.id);setView('portfolio')}}><span className="rank">{i+1}</span><AvatarPic user={x.teacher}/><span><b>{x.teacher.full_name}</b><small>{x.teacher.home_centre_code||'VMG'} · {x.teacher.professional_level||bi(lang,'Level pending','Chưa có level')}</small></span><strong>{x.intel.upgradePotential}%</strong></button>)}{!progress.length&&<Empty lang={lang}/>}</div>
        </article>
      </section>
    </div>
  }

  function Teachers(){
    const [q,setQ]=useState('')
    const [region,setRegion]=useState(globalRole?'ALL':String(profile.region_no||'ALL'))
    const [centre,setCentre]=useState('ALL')
    const base=data.teachers.filter(x=>{
      if(centreRole&&profile.home_centre_code&&x.home_centre_code!==profile.home_centre_code)return false
      if(regionRole&&profile.region_no&&Number(x.region_no)!==Number(profile.region_no))return false
      if(globalRole&&region!=='ALL'&&String(x.region_no)!==String(region))return false
      return true
    })
    const centres=[...new Set(base.map(x=>x.home_centre_code).filter(Boolean))].sort()
    const visible=base.filter(x=>(centre==='ALL'||x.home_centre_code===centre)&&(`${x.full_name} ${x.teacher_code||''} ${x.email||''}`.toLowerCase().includes(q.toLowerCase())))
    const scopeText=globalRole
      ? bi(lang,'Search the whole system, then narrow by region and centre.','Tìm trên toàn hệ thống rồi lọc theo khu vực và trung tâm.')
      : regionRole
        ? bi(lang,`All centres in Region ${profile.region_no}.`,`Toàn bộ trung tâm thuộc Khu vực ${profile.region_no}.`)
        : bi(lang,`Teachers assigned to ${profile.home_centre_code||'your centre'}.`,`Giáo viên thuộc ${profile.home_centre_code||'trung tâm được phân công'}.`)
    return <><PageIntro kicker={bi(lang,'FIND · COMPARE · DEVELOP','TÌM · SO SÁNH · PHÁT TRIỂN')} title={t(lang,'teachers')} text={scopeText}/>
    <div className="toolbar teacher-filter-toolbar">
      <label className="search">⌕<input placeholder={t(lang,'search')} value={q} onChange={e=>setQ(e.target.value)}/></label>
      {globalRole&&<select className="select" value={region} onChange={e=>{setRegion(e.target.value);setCentre('ALL')}}><option value="ALL">{bi(lang,'All regions','Tất cả khu vực')}</option>{[1,2,3].map(r=><option key={r} value={r}>{bi(lang,'Region','Khu vực')} {r}</option>)}</select>}
      {(globalRole||regionRole)&&<select className="select" value={centre} onChange={e=>setCentre(e.target.value)}><option value="ALL">{bi(lang,'All centres','Tất cả trung tâm')}</option>{centres.map(c=><option key={c}>{c}</option>)}</select>}
      <span className="result-count">{visible.length} {bi(lang,'teachers','giáo viên')}</span>
    </div>
    <div className="panel"><div className="table-wrap"><div className="table"><div className="tr th teacher-cols"><span>{t(lang,'teachers')}</span><span>{t(lang,'centre')}</span><span>{t(lang,'level')}</span><span>{t(lang,'score')}</span><span>HVR</span><span>{t(lang,'earlyWarning')}</span><span>{t(lang,'recommendation')}</span></div>{visible.map(x=>{const intel=teacherIntel(x);return <div className="tr teacher-cols" key={x.id} onDoubleClick={()=>{setSelectedTeacherId(x.id);setView('portfolio')}}><span className="teacher-cell"><AvatarPic user={x}/><span><b>{x.full_name}</b><small>{x.teacher_code||'—'} · {x.email||''}</small></span></span><span><b>{x.home_centre_code||'—'}</b><small>{bi(lang,'Region','Khu vực')} {x.region_no||'—'}</small></span><span><b>{x.professional_level||'—'}</b></span><span><b>{intel.score||'—'}</b><small>{intel.score?bandLabel(lang,intel.score):bi(lang,'No official score','Chưa có điểm chính thức')}</small></span><span><b>{intel.hvr?`${intel.hvr}%`:'—'}</b></span><span><RiskPill risk={intel.risk} lang={lang}/></span><span><b>{intel.recommendation}</b><small>{bi(lang,'Double-click for full portfolio','Nhấp đúp để mở hồ sơ phát triển')}</small></span></div>})}{!visible.length&&<Empty lang={lang}/>}</div></div></div></>
  }

  function Portfolio(){
    const teacher=profile.role==='teacher'?profile:selectedTeacher
    if(!teacher)return <Empty lang={lang}/>
    const obs=data.observations.filter(x=>x.teacher_id===teacher.id)
    const inc=data.incidents.filter(x=>x.teacher_id===teacher.id)
    const docs=data.documents.find(x=>x.teacher_id===teacher.id)
    const k=latestKpi(teacher.id)
    const intel=teacherIntel(teacher)
    const caps=capabilityData(teacher.id)
    const strongest=[...caps].sort((a,b)=>b.score-a.score).slice(0,3)
    const priorities=[...caps].sort((a,b)=>a.score-b.score).slice(0,3)
    const proposal=data.upgrades.find(u=>u.teacher_id===teacher.id&&u.status!=='rejected')
    const fit=programmeFit(caps)
    const latest=latestObs(teacher.id)
    return <><PageIntro kicker={bi(lang,'MY EVIDENCE-LED GROWTH PROFILE','HỒ SƠ PHÁT TRIỂN DỰA TRÊN BẰNG CHỨNG')} title={teacher.full_name} text={lang==='vi'?'Hồ sơ phát triển toàn diện: năng lực, xu hướng, bằng chứng, điểm mạnh, ưu tiên phát triển, mức phù hợp chương trình và mức sẵn sàng phát triển nghề nghiệp.':'A complete growth portfolio: capability, trend, evidence, strengths, development priorities, programme fit and upgrade readiness.'} actions={profile.role!=='teacher'&&<select className="select" value={teacher.id} onChange={e=>setSelectedTeacherId(e.target.value)}>{data.teachers.map(x=><option key={x.id} value={x.id}>{x.full_name}</option>)}</select>} />
    <div className="profile-hero"><div className="profile-avatar">{initials(teacher.full_name)}</div><div><span className={`pill ${intel.risk.tone==='stable'?'green':intel.risk.tone==='watch'?'amber':'red'}`}>{intel.risk.level==='Stable'?t(lang,'stable'):intel.risk.level==='Watch'?t(lang,'watch'):intel.risk.level==='Danger'?t(lang,'danger'):t(lang,'critical')}</span><h2>{teacher.full_name}</h2><p>{teacher.teacher_code||'—'} · {teacher.home_centre_code||'—'} · {bi(lang,'Region','Khu vực')} {teacher.region_no||'—'} · {teacher.professional_level||bi(lang,'Level not set','Chưa có cấp độ chuyên môn')}</p></div><div className="profile-score"><span>{t(lang,'upgradeReadiness')}</span><strong>{intel.upgradePotential}%</strong><b>{intel.upgradePotential>=80?bi(lang,'READY FOR REVIEW','SẴN SÀNG ĐÁNH GIÁ'):intel.upgradePotential>=65?bi(lang,'BUILD EVIDENCE','BỔ SUNG BẰNG CHỨNG'):bi(lang,'DEVELOP','TIẾP TỤC PHÁT TRIỂN')}</b></div></div>
    <div className="facts"><div><span>{t(lang,'obsScore')}</span><b>{intel.score||'—'}</b></div><div><span>HVR</span><b>{k?.hvr_pct?`${k.hvr_pct}%`:'—'}</b></div><div><span>{t(lang,'touchpoints')}</span><b>{intel.touchCount}/2</b></div><div><span>{t(lang,'observations')}</span><b>{obs.length}</b></div><div><span>{t(lang,'docReadiness')}</span><b>{docs?.completion_pct?`${docs.completion_pct}%`:'—'}</b></div><div><span>{t(lang,'earlyWarning')}</span><b>{intel.risk.level==='Stable'?t(lang,'stable'):intel.risk.level==='Watch'?t(lang,'watch'):intel.risk.level==='Danger'?t(lang,'danger'):t(lang,'critical')}</b></div></div>

    <div className="grid12" style={{marginTop:14}}>
      <div className="panel span8"><div className="panel-head"><div><span>{bi(lang,'TEACHING CAPABILITY','NĂNG LỰC GIẢNG DẠY')}</span><h3>{lang==='vi'?'Năng lực · xu hướng · độ tin cậy của bằng chứng':'Capability · trend · evidence confidence'}</h3></div><button className="text-link" onClick={()=>setView('growth')}>{t(lang,'openMatrix')} →</button></div><div className="capability-table">{caps.map(c=><div className="cap-row" key={c.name}><div><b>{capName(lang,c.name)}</b><small>{lang==='vi'?'Xem hành động phát triển bên dưới.':c.action}</small></div><div className="cap-bar"><i style={{width:`${c.score}%`}}/></div><b>{c.score}</b><span className={`trend ${c.trend>=0?'up':'down'}`}>{c.trend>=0?'+':''}{c.trend}</span><span className={`pill ${c.confidence==='High'?'green':c.confidence==='Medium'?'amber':'red'}`}>{confLabel(lang,c.confidence)}</span></div>)}</div></div>
      <div className="panel span4"><div className="panel-head"><div><span>{bi(lang,'GROWTH PATH','LỘ TRÌNH PHÁT TRIỂN')}</span><h3>{t(lang,'upgradeReadiness')}</h3></div></div><div className="panel-body"><div className="readiness-ring" style={{'--value':`${intel.upgradePotential}%`}}><div><b>{intel.upgradePotential}%</b><span>{proposal?statusLabel(lang,proposal.status):bi(lang,'readiness','mức sẵn sàng')}</span></div></div><div className="insight"><b>{proposal?bi(lang,`Proposal: ${proposal.proposed_level}`,`Đề xuất: ${proposal.proposed_level}`):(intel.upgradePotential>=80?bi(lang,'Evidence pack can be reviewed','Có thể đưa hồ sơ bằng chứng vào đánh giá'):intel.upgradePotential>=65?bi(lang,'Close priority gaps first','Hoàn thiện các khoảng trống ưu tiên trước'):bi(lang,'Development evidence still building','Bằng chứng phát triển đang được bổ sung'))}</b><p>{intel.recommendation}. {latest?.smart_action||teacher.development_focus||bi(lang,'Continue evidence-led development actions.','Tiếp tục các hành động phát triển dựa trên bằng chứng.')}</p></div></div></div>
    </div>

    <div className="grid12" style={{marginTop:14}}>
      <div className="panel span6"><div className="panel-head"><div><span>{bi(lang,'STRENGTHS TO BUILD ON','ĐIỂM MẠNH CẦN PHÁT HUY')}</span><h3>{lang==='vi'?'Điểm mạnh có bằng chứng':'Evidence-backed strengths'}</h3></div></div><div className="development-list">{strongest.map((c,i)=><div className="dev-item strong" key={c.name}><span>0{i+1}</span><div><b>{capName(lang,c.name)} · {c.score}</b><p>{c.evidenceCount} {bi(lang,'evidence points','bằng chứng')} · {confLabel(lang,c.confidence)}. {lang==='vi'?'Tiếp tục củng cố năng lực này trong các buổi dạy tiếp theo.':c.action}</p></div></div>)}<div className="narrative-box"><span>{bi(lang,'RECENT EVIDENCE','BẰNG CHỨNG GẦN NHẤT')}</span><p>{latest?.strengths||bi(lang,'No qualitative strength narrative has been finalised yet.','Chưa có mô tả định tính chính thức về điểm mạnh.')}</p></div></div></div>
      <div className="panel span6"><div className="panel-head"><div><span>{bi(lang,'GROWTH PRIORITIES','ƯU TIÊN PHÁT TRIỂN')}</span><h3>{lang==='vi'?'Ưu tiên cần phát triển':'Priority growth areas'}</h3></div></div><div className="development-list">{priorities.map((c,i)=><div className="dev-item priority" key={c.name}><span>0{i+1}</span><div><b>{capName(lang,c.name)} · {c.score}</b><p>{c.evidenceCount} {bi(lang,'evidence points','bằng chứng')} · {bi(lang,'next move','bước tiếp theo')}: {lang==='vi'?'Thực hành có mục tiêu và xác minh lại qua dự giờ.':c.action}</p></div></div>)}<div className="narrative-box amber"><span>{bi(lang,'NEXT DEVELOPMENT ACTION','HÀNH ĐỘNG PHÁT TRIỂN TIẾP THEO')}</span><p>{latest?.smart_action||latest?.improvement_areas||bi(lang,'No active development action has been recorded yet.','Chưa có hành động phát triển đang thực hiện.')}</p></div></div></div>
    </div>

    <div className="panel" style={{marginTop:14}}><div className="panel-head"><div><span>{bi(lang,'30 · 60 · 90 DAY GROWTH PLAN','KẾ HOẠCH PHÁT TRIỂN 30 · 60 · 90 NGÀY')}</span><h3>{lang==='vi'?'Biến điểm yếu thành bằng chứng mới':'Turn development gaps into new evidence'}</h3></div></div><div className="growth-plan"><div><span>{bi(lang,'30 DAYS','30 NGÀY')}</span><b>{priorities[0]?capName(lang,priorities[0].name):bi(lang,'Development focus','Trọng tâm phát triển')}</b><p>{priorities[0]?(lang==='vi'?bi(lang,'','Thống nhất một hành động có thể quan sát được với Giám sát Học thuật.'):priorities[0].action):bi(lang,'Agree one observable action with your Academic Supervisor.','Thống nhất một hành động có thể quan sát được với Giám sát Học thuật.')}</p></div><div><span>{bi(lang,'60 DAYS','60 NGÀY')}</span><b>{lang==='vi'?'Xác minh trong lớp':'Verify in class'}</b><p>{latest?.smart_action||bi(lang,'Apply the action across multiple classes and collect learner-response evidence.','Áp dụng hành động ở nhiều lớp và thu thập bằng chứng từ phản ứng hoặc kết quả của học viên.')}</p></div><div><span>{bi(lang,'90 DAYS','90 NGÀY')}</span><b>{lang==='vi'?'Hoàn thiện bộ bằng chứng':'Close the evidence pack'}</b><p>{intel.upgradePotential>=80?bi(lang,'Prepare upgrade rationale with your Academic Supervisor.','Chuẩn bị lý do và bằng chứng đề xuất nâng cấp độ cùng Giám sát Học thuật.'):bi(lang,'Re-observe the priority domain and update the portfolio before the next level review.','Dự giờ lại năng lực ưu tiên và cập nhật hồ sơ trước kỳ đánh giá cấp độ tiếp theo.')}</p></div></div></div>

    <div className="grid12" style={{marginTop:14}}>
      <div className="panel span5"><div className="panel-head"><div><span>{bi(lang,'PROGRAMME FIT SIGNAL','GỢI Ý PHÙ HỢP CHƯƠNG TRÌNH')}</span><h3>{lang==='vi'?'Bằng chứng hiện tại phù hợp ở đâu':'Where current evidence is strongest'}</h3></div></div><div className="fit-list">{fit.map(f=><div className="fit-row" key={f.name}><span><b>{f.name}</b><small>{programmeNote(lang,f.note)}</small></span><div className="cap-bar"><i style={{width:`${f.score}%`}}/></div><b>{f.score}%</b></div>)}</div><div className="micro-note">{bi(lang,'Development-planning signal only. Final class allocation remains a human decision using programme needs, experience and current evidence.','Đây chỉ là gợi ý cho kế hoạch phát triển. Xếp lớp cuối cùng vẫn do con người quyết định dựa trên nhu cầu chương trình, kinh nghiệm và bằng chứng hiện tại.')}</div></div>
      <div className="panel span7"><div className="panel-head"><div><span>{bi(lang,'GROWTH HISTORY','LỊCH SỬ PHÁT TRIỂN')}</span><h3>{bi(lang,'Observation feedback','Dự giờ & phản hồi')}</h3></div></div><div className="timeline">{obs.slice(0,7).map(o=><div className="timeline-item" key={o.id}><i className={`dot ${Number(o.final_score)<70?'red':''}`}/><span><b>{fmt(o.observed_at,lang)}</b><small>{dv(lang,o.observation_type)}</small></span><span><b>{o.purpose||bi(lang,'Quality observation','Dự giờ chất lượng')}</b><p>{o.improvement_areas||o.strengths||bi(lang,'Evidence recorded.','Đã ghi nhận bằng chứng.')}</p></span><span><b>{o.final_score??'—'}</b><small>{o.final_score?bandLabel(lang,Number(o.final_score)):bi(lang,'Evidence only','Chỉ có bằng chứng')}</small></span></div>)}{!obs.length&&<Empty lang={lang}/>}</div></div>
    </div></>
  }

  function GrowthMatrix(){
    const teacher=profile.role==='teacher'?profile:selectedTeacher
    if(!teacher)return <Empty lang={lang}/>
    const caps=capabilityData(teacher.id)
    const latest=latestObs(teacher.id)
    const top=[...caps].sort((a,b)=>b.score-a.score)
    return <><PageIntro kicker={bi(lang,'YOUR SKILLS · YOUR NEXT STEP','NĂNG LỰC · BƯỚC TIẾP THEO')} title={t(lang,'growthMatrix')} text={lang==='vi'?'Không chỉ nhìn điểm mạnh và điểm cần phát triển: ma trận này cho thấy mức độ ổn định, xu hướng, lượng bằng chứng và hành động tiếp theo cho từng năng lực.':'Go beyond strengths and weaknesses: see consistency, trend, evidence volume and the next action for every capability.'}/>
    <div className="matrix-legend"><span><i className="legend-dot excellent"/>85–100 {bi(lang,'Signature strength','Điểm mạnh nổi bật')}</span><span><i className="legend-dot build"/>70–84 {bi(lang,'Build consistency','Cần tăng độ ổn định')}</span><span><i className="legend-dot priority"/>&lt;70 {bi(lang,'Priority growth','Ưu tiên phát triển')}</span><span>{bi(lang,'Confidence reflects the amount of recent observation evidence.','Độ tin cậy dựa trên lượng bằng chứng từ các lần dự giờ gần đây.')}</span></div>
    <div className="capability-grid">{caps.map(c=><article className={`cap-card ${c.score>=85?'excellent':c.score>=70?'build':'priority'}`} key={c.name}><div className="cap-card-top"><span>{c.score>=85?bi(lang,'SIGNATURE / STRONG','ĐIỂM MẠNH NỔI BẬT'):c.score>=70?bi(lang,'BUILD CONSISTENCY','TĂNG ĐỘ ỔN ĐỊNH'):bi(lang,'PRIORITY GROWTH','ƯU TIÊN PHÁT TRIỂN')}</span><b>{c.score}</b></div><h3>{capName(lang,c.name)}</h3><div className="cap-meta"><span>{bi(lang,'Trend','Xu hướng')} <b>{c.trend>=0?'+':''}{c.trend}</b></span><span>{bi(lang,'Evidence','Bằng chứng')} <b>{c.evidenceCount}</b></span><span>{bi(lang,'Confidence','Độ tin cậy')} <b>{confLabel(lang,c.confidence)}</b></span></div><div className="cap-bar"><i style={{width:`${c.score}%`}}/></div><p>{lang==='vi'?'Thực hành có mục tiêu, thu thập bằng chứng và xác minh lại tiến bộ.':c.action}</p></article>)}</div>
    <div className="grid12" style={{marginTop:14}}><div className="panel span7"><div className="panel-head"><div><span>{bi(lang,'STRENGTH × PRIORITY','ĐIỂM MẠNH × ƯU TIÊN')}</span><h3>{lang==='vi'?'Nên bảo vệ, duy trì hay ưu tiên gì':'What to protect, maintain or prioritise'}</h3></div></div><div className="quadrant"><div className="qcell protect"><span>{bi(lang,'PROTECT & SHARE','PHÁT HUY & CHIA SẺ')}</span>{top.filter(x=>x.score>=85&&x.confidence==='High').map(x=><b key={x.name}>{capName(lang,x.name)}</b>)}</div><div className="qcell maintain"><span>{bi(lang,'MAINTAIN','DUY TRÌ')}</span>{top.filter(x=>x.score>=80&&!(x.score>=85&&x.confidence==='High')).slice(0,3).map(x=><b key={x.name}>{capName(lang,x.name)}</b>)}</div><div className="qcell evidence"><span>{bi(lang,'BUILD EVIDENCE','BỔ SUNG BẰNG CHỨNG')}</span>{top.filter(x=>x.confidence!=='High'&&x.score>=70).slice(0,3).map(x=><b key={x.name}>{capName(lang,x.name)}</b>)}</div><div className="qcell priority"><span>{bi(lang,'PRIORITY GROWTH','ƯU TIÊN PHÁT TRIỂN')}</span>{top.filter(x=>x.score<70).slice(0,4).map(x=><b key={x.name}>{capName(lang,x.name)}</b>)}</div></div></div><div className="panel span5"><div className="panel-head"><div><span>{bi(lang,'FROM FEEDBACK TO PROGRESS','TỪ PHẢN HỒI ĐẾN TIẾN BỘ')}</span><h3>{lang==='vi'?'Hành động phát triển tiếp theo':'Next development action'}</h3></div></div><div className="action-loop">{(lang==='vi'?['Quan sát bằng chứng','Xác định khoảng trống','Thực hành / đào tạo','Dự giờ lại','Đóng action bằng bằng chứng']:['Observe evidence','Name the gap','Practise / train','Re-observe','Close with evidence']).map((x,i)=><div key={x}><span>{i+1}</span><b>{x}</b></div>)}</div><div className="insight"><b>{bi(lang,'Current action','Hành động hiện tại')}</b><p>{latest?.smart_action||latest?.improvement_areas||bi(lang,'No formal SMART development action is currently open.','Hiện chưa có hành động phát triển SMART nào đang mở.')}</p></div></div></div></>
  }

  function Resources(){
    const [query,setQuery]=useState('')
    const [programme,setProgramme]=useState('')
    const [category,setCategory]=useState('')
    const [workflow,setWorkflow]=useState('')
    const [page,setPage]=useState(1)
    const source=(data.resources?.length?data.resources:RESOURCE_CATALOG).map(r=>({
      ...r,
      programme:r.programme||'General',
      stage:r.stage||'',
      cefr:r.cefr||'',
      audience:r.audience||'',
      name:r.name||r.title||'Resource',
      category:r.category||'Resource',
      workflow:r.workflow||'Prepare',
      priority:r.priority||'Core',
      notes:r.notes||'',
      url:r.url||r.external_url
    }))
    const programmes=[...new Set(source.map(r=>r.programme).filter(Boolean))].sort()
    const categories=[...new Set(source.map(r=>r.category).filter(Boolean))].sort()
    const filtered=source.filter(r=>{
      const hay=`${r.name} ${r.notes} ${r.programme} ${r.category} ${r.stage}`.toLowerCase()
      return (!query||hay.includes(query.toLowerCase()))&&(!programme||r.programme===programme)&&(!category||r.category===category)&&(!workflow||r.workflow===workflow)
    })
    const per=14,pages=Math.max(1,Math.ceil(filtered.length/per)),safePage=Math.min(page,pages),rows=filtered.slice((safePage-1)*per,safePage*per)
    const counts={Prepare:source.filter(r=>r.workflow==='Prepare').length,Teach:source.filter(r=>r.workflow==='Teach').length,Assess:source.filter(r=>r.workflow==='Assess').length}
    return <><PageIntro kicker={bi(lang,'ACADEMIC LIBRARY · READY TO TEACH','THƯ VIỆN HỌC THUẬT · SẴN SÀNG LÊN LỚP')} title={t(lang,'resources')} text={lang==='vi'?'Một thư viện học liệu trực quan cho giáo viên: tìm nhanh theo chương trình, mục đích sử dụng và giai đoạn dạy học. Tên chương trình chính thức được giữ nguyên.':'A visual academic library for teachers: find materials by programme, teaching purpose and workflow while preserving official programme names.'}/>
    <div className="resource-showcase">
      <button className="resource-visual cambridge" onClick={()=>{setQuery('');setProgramme('E-Genius');setWorkflow('');setPage(1)}}><span className="visual-mark">CE</span><div><small>{bi(lang,'GENERAL ENGLISH PATHWAY','LỘ TRÌNH GENERAL ENGLISH')}</small><h3>E-Genius</h3><p>{bi(lang,'Classroom-ready materials, practice and assessment for structured English progression.','Học liệu lên lớp, thực hành và đánh giá cho lộ trình tiếng Anh có cấu trúc.')}</p></div><i>↗</i></button>
      <button className="resource-visual ielts" onClick={()=>{setQuery('IELTS');setProgramme('');setWorkflow('');setPage(1)}}><span className="visual-mark">IELTS</span><div><small>{bi(lang,'EXAM PREPARATION STUDIO','KHÔNG GIAN LUYỆN THI')}</small><h3>IELTS Studio</h3><p>{bi(lang,'Writing, speaking, mock tests and assessment resources in one focused view.','Writing, Speaking, mock test và học liệu đánh giá trong một không gian tập trung.')}</p></div><i>↗</i></button>
      <button className="resource-visual teacher" onClick={()=>{setQuery('');setProgramme('');setWorkflow('Prepare');setPage(1)}}><span className="visual-mark">360</span><div><small>{bi(lang,'TEACHER TOOLKIT','BỘ CÔNG CỤ GIÁO VIÊN')}</small><h3>{bi(lang,'Plan · Teach · Reflect','Soạn · Dạy · Phản tư')}</h3><p>{bi(lang,'Lesson plans, teacher files, audio and preparation resources for everyday delivery.','Lesson plan, tài liệu giáo viên, tệp nghe và học liệu chuẩn bị cho công việc hằng ngày.')}</p></div><i>↗</i></button>
    </div>
    <section className="academic-cover-gallery">
      <article className="academic-cover cover-cefr"><div className="cover-spine"/><div className="cover-copy"><span>{bi(lang,'CEFR PROGRESSION','LỘ TRÌNH CEFR')}</span><h3>A2 · B1 · B2 · C1</h3><p>{bi(lang,'Map classroom evidence to clear language-development stages.','Liên kết bằng chứng trên lớp với các giai đoạn phát triển năng lực rõ ràng.')}</p></div><div className="cover-orbit">CEFR</div></article>
      <article className="academic-cover cover-ielts"><div className="cover-spine"/><div className="cover-copy"><span>{bi(lang,'IELTS ACADEMIC STUDIO','KHÔNG GIAN IELTS ACADEMIC')}</span><h3>R · W · L · S</h3><p>{bi(lang,'Practice, feedback, mock evidence and targeted skill development.','Luyện tập, phản hồi, mock test và phát triển kỹ năng có mục tiêu.')}</p></div><div className="cover-paper"><b>Task 2</b><i/><i/><i/></div></article>
      <article className="academic-cover cover-pedagogy"><div className="cover-spine"/><div className="cover-copy"><span>{bi(lang,'TEACHING PRACTICE','THỰC HÀNH GIẢNG DẠY')}</span><h3>{bi(lang,'Plan · Teach · Reflect','Soạn · Dạy · Phản tư')}</h3><p>{bi(lang,'Turn academic standards into better classroom moments every week.','Biến chuẩn học thuật thành những giờ học tốt hơn mỗi tuần.')}</p></div><div className="cover-grid"><i/><i/><i/><i/><i/><i/></div></article>
      <article className="academic-cover cover-assess"><div className="cover-spine"/><div className="cover-copy"><span>{bi(lang,'ASSESSMENT & EVIDENCE','ĐÁNH GIÁ & MINH CHỨNG')}</span><h3>{bi(lang,'Observe · Measure · Improve','Dự giờ · Đo lường · Cải tiến')}</h3><p>{bi(lang,'Rubrics, learner evidence and feedback loops in one academic workflow.','Rubric, minh chứng học viên và vòng phản hồi trong một quy trình học thuật.')}</p></div><div className="cover-score">90+</div></article>
    </section>
    <div className="resource-summary-grid"><div className="resource-feature"><span>{bi(lang,'CURATED VMG ACADEMIC CATALOGUE','DANH MỤC HỌC THUẬT VMG')}</span><h2>{source.length} {bi(lang,'linked resources','học liệu đã liên kết')}</h2><p>{lang==='vi'?'Tìm theo chương trình, nhóm học liệu hoặc mục đích sử dụng. Mỗi đường dẫn mở trực tiếp nguồn hiện có.':'Search by programme, resource group or teaching use. Every link opens the existing source directly.'}</p></div>{['Prepare','Teach','Assess'].map(w=><div className="resource-stat" key={w}><b>{counts[w]}</b><span>{dv(lang,w).toUpperCase()}</span><small>{w==='Prepare'?bi(lang,'Teacher preparation','Chuẩn bị giảng dạy'):w==='Teach'?bi(lang,'Classroom delivery','Triển khai trên lớp'):bi(lang,'Assessment & evidence','Đánh giá & minh chứng')}</small></div>)}</div>
    <div className="resource-directory"><div className="resource-tools"><label className="field"><span>{t(lang,'search')}</span><input value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder={bi(lang,'Book, test, course outline, audio...','Giáo trình, đề thi, đề cương, tệp nghe...')}/></label><label className="field"><span>{bi(lang,'Programme','Chương trình')}</span><select value={programme} onChange={e=>{setProgramme(e.target.value);setPage(1)}}><option value="">{bi(lang,'All programmes','Tất cả chương trình')}</option>{programmes.map(x=><option key={x}>{x}</option>)}</select></label><label className="field"><span>{bi(lang,'Category','Nhóm học liệu')}</span><select value={category} onChange={e=>{setCategory(e.target.value);setPage(1)}}><option value="">{bi(lang,'All categories','Tất cả nhóm')}</option>{categories.map(x=><option key={x}>{x}</option>)}</select></label></div><div className="resource-chips">{['','Prepare','Teach','Assess'].map(w=><button key={w||'all'} className={workflow===w?'active':''} onClick={()=>{setWorkflow(w);setPage(1)}}>{w?dv(lang,w):bi(lang,'All','Tất cả')}</button>)}</div><div className="resource-head resource-cols"><span>{bi(lang,'Resource','Học liệu')}</span><span>{bi(lang,'Programme','Chương trình')}</span><span>{bi(lang,'Category','Nhóm học liệu')}</span><span>{bi(lang,'Use for','Dùng để')}</span><span>{bi(lang,'Open','Mở')}</span></div>{rows.map((r,i)=><div className="resource-row resource-cols" key={`${r.programme}-${r.name}-${i}`}><span className="resource-main"><i>{r.workflow?.slice(0,1)||'R'}</i><span><b>{r.name}</b><small>{r.notes||`${r.stage}${r.audience?` · ${r.audience}`:''}`}</small></span></span><span><b>{r.programme}</b><small>{[r.cefr,r.stage].filter(Boolean).join(' · ')}</small></span><span><span className="pill gold">{r.category}</span></span><span><span className={`pill ${r.workflow==='Assess'?'navy':r.workflow==='Teach'?'green':'amber'}`}>{dv(lang,r.workflow)}</span></span><span>{r.url?<a className="btn small secondary" href={r.url} target="_blank" rel="noopener noreferrer">{bi(lang,'OPEN','MỞ')} ↗</a>:'—'}</span></div>)}{!rows.length&&<Empty lang={lang}/>}<div className="resource-footer"><span>{filtered.length} {bi(lang,'resources','học liệu')} · {bi(lang,'page','trang')} {safePage}/{pages}</span><div>{Array.from({length:pages},(_,i)=>i+1).filter(n=>pages<=8||n===1||n===pages||Math.abs(n-safePage)<=1).map(n=><button key={n} className={n===safePage?'active':''} onClick={()=>setPage(n)}>{n}</button>)}</div></div></div></>
  }

  function Support(){
    const canSeeAll=profile.role!=='teacher'
    const rows=canSeeAll?data.support:data.support.filter(x=>x.teacher_id===profile.id)
    return <><PageIntro kicker={bi(lang,'ASK EARLY · GET SUPPORT FAST','HỎI SỚM · ĐƯỢC HỖ TRỢ NHANH')} title={t(lang,'support')} text={lang==='vi'?'Gửi yêu cầu học liệu, giải đáp học thuật, coaching, catch-up, vấn đề vận hành hoặc báo link lỗi ngay trong Teacher 360.':'Request materials, academic clarification, coaching, catch-up support, operational help or report a broken resource link directly in Teacher 360.'} actions={<button className="btn primary" onClick={()=>setModal({type:'support'})}>＋ {lang==='vi'?'Tạo yêu cầu':'New support request'}</button>}/>
    <div className="grid12"><div className="panel span4"><div className="panel-head"><div><span>{bi(lang,'WHO CAN HELP','AI CÓ THỂ HỖ TRỢ')}</span><h3>{lang==='vi'?'Yêu cầu đi đúng người':'Get to the right owner'}</h3></div></div><div className="notice-list">{(lang==='vi'?[['Học thuật / Phương pháp','Giám sát Học thuật / R&D'],['Học liệu / Link lỗi','R&D'],['Lịch / Phối hợp trung tâm','CMO / Giám đốc Trung tâm'],['Học viên / Dịch vụ','CSR'],['Hồ sơ / Chứng từ','PTNS']]:[['Academic / Methodology','Academic Supervisor / R&D'],['Resource / Link issue','R&D'],['Schedule / Centre coordination','CMO / Centre Director'],['Learner / service case','CSR'],['Documents / certificates','PTNS']]).map(([a,b])=><div className="notice" key={a}><div className="notice-icon">→</div><div><b>{a}</b><p>{b}</p></div></div>)}</div></div><div className="panel span8"><div className="panel-head"><div><span>{bi(lang,'SUPPORT REQUESTS','YÊU CẦU HỖ TRỢ')}</span><h3>{canSeeAll?bi(lang,'Requests in your scope','Yêu cầu trong phạm vi phụ trách'):bi(lang,'My requests','Yêu cầu của tôi')}</h3></div></div><div className="support-list">{rows.map(r=>{const tr=data.teachers.find(x=>x.id===r.teacher_id)||profile;return <div className="support-row" key={r.id}><span><b>{r.category}</b><small>{fmt(r.created_at,lang)} · {tr.full_name}</small></span><span><b>{r.subject}</b><small>{r.details}</small></span><span><span className={`pill ${r.status==='closed'?'green':r.status==='in_progress'?'amber':'navy'}`}>{statusLabel(lang,r.status)}</span><small>{r.routed_to||bi(lang,'Auto-route','Tự động chuyển')}</small></span><span className="row-actions">{canSeeAll&&r.status!=='closed'&&<button className="btn small secondary" onClick={()=>updateSupport(r.id,r.status==='open'?'in_progress':'closed')}>{r.status==='open'?bi(lang,'Start','Bắt đầu'):bi(lang,'Close','Đóng')}</button>}{canRemove&&<button className="btn small danger" onClick={()=>removeRow('support_requests',r.id)}>{t(lang,'remove')}</button>}</span></div>})}{!rows.length&&<Empty lang={lang}/>}</div></div></div></>
  }

  function Bulletin(){
    const canPublish=['ptns','rnd','bod'].includes(profile.role)
    const featured=data.announcements[0]
    const rest=data.announcements.slice(1)
    return <><PageIntro kicker={bi(lang,'THE VMG STAFF ROOM','PHÒNG GIÁO VIÊN VMG')} title={t(lang,'bulletin')} text={lang==='vi'?'Một bảng tin sống động cho thông báo quan trọng, hoạt động học thuật, lịch phát triển và những điều giáo viên cần biết trong tuần.':'A lively staff-room board for important updates, academic activity, development dates and the things teachers need this week.'} actions={canPublish&&<button className="btn primary" onClick={()=>setModal({type:'bulletin'})}>＋ {lang==='vi'?'Đăng thông báo':'Publish announcement'}</button>}/>
      <div className="bulletin-masthead"><div><span>{bi(lang,'TEACH · GROW · INSPIRE','DẠY TỐT · PHÁT TRIỂN · TRUYỀN CẢM HỨNG')}</span><h2>{bi(lang,'Your academic week at VMG','Tuần học thuật tại VMG')}</h2><p>{bi(lang,'Academic moments, people updates, exam-preparation milestones and professional learning — curated for teachers.','Hoạt động học thuật, cập nhật đội ngũ, cột mốc luyện thi và phát triển chuyên môn — được tuyển chọn cho giáo viên.')}</p><div className="bulletin-academic-tags"><span>Cambridge English</span><span>IELTS</span><span>CEFR</span><span>{bi(lang,'Teacher Development','Phát triển Giáo viên')}</span></div></div><div className="bulletin-stamps"><b>23</b><span>{bi(lang,'YEARS OF ENGLISH EDUCATION','NĂM GIÁO DỤC TIẾNG ANH')}</span></div></div>
      {featured&&<article className="bulletin-feature"><div className="bulletin-tape"/><div className="bulletin-date"><b>{new Date(featured.published_at).getDate()}</b><span>{new Date(featured.published_at).toLocaleDateString(lang==='vi'?'vi-VN':'en-GB',{month:'short'}).toUpperCase()}</span></div><div><span className="bulletin-eyebrow">{dv(lang,featured.audience||'All teachers')}</span><h2>{lang==='vi'&&featured.title_vi?featured.title_vi:featured.title_en||featured.title}</h2><p>{lang==='vi'&&featured.body_vi?featured.body_vi:featured.body_en||featured.body}</p><small>{featured.author_name||'VMG'} · {fmt(featured.published_at,lang)}</small></div></article>}
      <div className="bulletin-board">{rest.map((a,i)=><article className={`bulletin-note tone-${i%4}`} key={a.id}><span className="pin"/><div className="bulletin-note-meta"><b>{fmt(a.published_at,lang)}</b><span>{dv(lang,a.audience||'All teachers')}</span></div><h3>{lang==='vi'&&a.title_vi?a.title_vi:a.title_en||a.title}</h3><p>{lang==='vi'&&a.body_vi?a.body_vi:a.body_en||a.body}</p><footer>{a.author_name||'VMG'}</footer></article>)}{!data.announcements.length&&<div className="panel"><Empty lang={lang}/></div>}</div></>
  }

  function Training(){
    const canCreate=['academic_supervisor','rnd','bod'].includes(profile.role)
    const canRequest=['cmo','centre_director','csr'].includes(profile.role)
    const rows=data.trainings.filter(x=>new Date(x.ends_at||x.starts_at)>=new Date(Date.now()-30*86400000))
    return <><PageIntro kicker={bi(lang,'LEARN · PRACTISE · GROW','HỌC · THỰC HÀNH · PHÁT TRIỂN')} title={t(lang,'trainingHub')} text={lang==='vi'?'Lịch training, retraining, upgrade training, recap và học liệu ở cùng một nơi.':'Training, retraining, upgrade development, recap and materials in one governed calendar.'} actions={<div className="row-actions">{canRequest&&<button className="btn secondary" onClick={()=>setModal({type:'training-request'})}>{t(lang,'requestTraining')}</button>}{canCreate&&<button className="btn primary" onClick={()=>setModal({type:'training'})}>＋ {t(lang,'createTraining')}</button>}</div>}/>
    <div className="panel"><div className="table-wrap"><div className="table"><div className="tr th training-cols"><span>{bi(lang,'Date / time','Ngày / giờ')}</span><span>{bi(lang,'Development event','Hoạt động phát triển')}</span><span>{bi(lang,'Type','Loại')}</span><span>{bi(lang,'Audience','Đối tượng')}</span><span>{bi(lang,'Materials','Học liệu')}</span><span>{t(lang,'action')}</span></div>{rows.map(r=>{const booked=data.registrations.some(x=>x.training_id===r.id&&x.user_id===profile.id);return <div className="tr training-cols" key={r.id}><span><b>{fmt(r.starts_at,lang)}</b><small>{new Date(r.starts_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})} · {relative(r.starts_at,lang)}</small></span><span><b>{r.title}</b><small>{r.reason||r.description||r.location||bi(lang,'VMG development','Phát triển chuyên môn VMG')}</small></span><span><span className="pill gold">{dv(lang,r.training_type)}</span></span><span><b>{dv(lang,r.audience_label||'Targeted teachers')}</b><small>{r.target_region_no?`${bi(lang,'Region','Khu vực')} ${r.target_region_no}`:bi(lang,'All / selected','Tất cả / đã chọn')}</small></span><span><b>{r.slides_path?t(lang,'slides'):'—'}</b><small>{r.recap_text?t(lang,'recap'):bi(lang,'Recap pending','Chưa có recap')}</small></span><span className="row-actions">{profile.role==='teacher'&&<button className={`btn small ${booked?'secondary':'primary'}`} disabled={booked} onClick={()=>bookTraining(r.id)}>{booked?t(lang,'booked'):t(lang,'book')}</button>}{r.slides_path&&<button className="btn small secondary" onClick={()=>openMaterial(r.slides_path,'training-materials')}>{t(lang,'slides')}</button>}{r.recap_text&&<button className="btn small secondary" onClick={()=>setModal({type:'recap',record:r})}>{t(lang,'recap')}</button>}</span></div>})}{!rows.length&&<Empty lang={lang}/>}</div></div></div></>
  }

  function Calendar(){
    const all=[...data.trainings.map(x=>({...x,kind:'Training'})),...data.events.map(x=>({...x,kind:x.event_type||'Event'}))].filter(x=>profile.role!=='teacher'||!x.teacher_id||x.teacher_id===profile.id).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at))
    const canBook=['academic_supervisor','cmo','centre_director','rnd','bod'].includes(profile.role)
    return <><PageIntro kicker={bi(lang,'YOUR DEVELOPMENT CALENDAR','LỊCH PHÁT TRIỂN CỦA BẠN')} title={t(lang,'calendar')} text={lang==='vi'?'Đào tạo, trao đổi định kỳ, đào tạo lại và họp giáo viên. Lịch đã xác nhận sẽ được nhắc trước 24 giờ.':'Training, catch-up, retraining and teacher meetings. Confirmed bookings are reminded again 24 hours before the event.'} actions={canBook&&<button className="btn primary" onClick={()=>setModal({type:'event'})}>＋ {bi(lang,'Add catch-up / meeting','Thêm lịch trao đổi / họp')}</button>}/><div className="grid12">{all.map(e=><div className="panel span6" key={`${e.kind}-${e.id}`}><div className="panel-head"><div><span>{bi(lang,e.kind.toUpperCase(),e.kind==='training'?'ĐÀO TẠO':'LỊCH GIÁO VIÊN')} · {relative(e.starts_at,lang)}</span><h3>{e.title}</h3></div><span className="pill gold">{fmt(e.starts_at,lang)}</span></div><div className="panel-body"><div className="facts" style={{gridTemplateColumns:'repeat(3,1fr)',marginTop:0}}><div><span>{bi(lang,'Time','Giờ')}</span><b>{new Date(e.starts_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</b></div><div><span>{bi(lang,'Location','Địa điểm')}</span><b>{e.location||'TBC'}</b></div><div><span>{bi(lang,'Reminder','Nhắc lịch')}</span><b>T−24h</b></div></div></div></div>)}{!all.length&&<div className="panel span12"><Empty lang={lang}/></div>}</div></>
  }

  function Observations(){
    const canCreate=['academic_supervisor','rnd','bod'].includes(profile.role)
    const rows=profile.role==='teacher'?data.observations.filter(x=>x.teacher_id===profile.id):data.observations
    return <><PageIntro kicker={bi(lang,'FEEDBACK THAT HELPS TEACHERS GROW','PHẢN HỒI ĐỂ GIÁO VIÊN PHÁT TRIỂN')} title={t(lang,'observations')} text={lang==='vi'?'Phiếu chính thức bám Performance Tracker VMG: Preparation 10%, Methodology & Skills 45%, Classroom Management 45%.':'Official VMG Performance Tracker structure: Preparation 10%, Methodology & Skills 45%, Classroom Management 45%.'} actions={canCreate&&<button className="btn primary" onClick={()=>setModal({type:'observation'})}>＋ {bi(lang,'New observation','Tạo phiếu dự giờ')}</button>}/><div className="panel"><div className="table-wrap"><div className="table"><div className="tr th touch-cols"><span>{bi(lang,'Teacher / record','Giáo viên / hồ sơ')}</span><span>{bi(lang,'Date','Ngày')}</span><span>{bi(lang,'Type','Loại')}</span><span>{bi(lang,'Development evidence','Bằng chứng phát triển')}</span><span>{bi(lang,'Outcome','Kết quả')}</span></div>{rows.map(o=>{const tr=data.teachers.find(x=>x.id===o.teacher_id)||profile;return <div className="tr touch-cols" key={o.id}><span className="teacher-cell"><AvatarPic user={tr}/><span><b>{tr.full_name}</b><small>{o.class_name||o.purpose||bi(lang,'VMG class','Lớp VMG')}</small></span></span><span><b>{fmt(o.observed_at,lang)}</b><small>{o.observer_name}</small></span><span><span className="pill navy">{dv(lang,o.observation_type)}</span></span><span><b>{o.strengths||bi(lang,'Evidence recorded','Đã ghi nhận bằng chứng')}</b><small>{o.improvement_areas||bi(lang,'No development issue','Chưa có điểm cần phát triển')}</small></span><span><b>{o.final_score??'—'}</b><small>{o.final_score?bandLabel(lang,Number(o.final_score)):bi(lang,'Evidence only','Chỉ có bằng chứng')}</small></span></div>})}{!rows.length&&<Empty lang={lang}/>}</div></div></div></>
  }

  function Incidents(){
    const canLog=['cmo','centre_director','regional_director','csr','rnd','bod'].includes(profile.role)
    const rows=profile.role==='teacher'?data.incidents.filter(x=>x.teacher_id===profile.id):data.incidents
    return <><PageIntro kicker={bi(lang,'SUPPORT EARLY · HANDLE FAIRLY · CLOSE CLEARLY','HỖ TRỢ SỚM · XỬ LÝ CÔNG BẰNG · ĐÓNG RÕ RÀNG')} title={t(lang,'incidents')} text={lang==='vi'?'CMO ghi nhận → GĐTT phê duyệt → notify các bên → gửi GV trong tối đa 12h → follow-up → đóng bằng evidence.':'CMO logs → Centre Director approves → stakeholders are notified → teacher receives the approved record within 12h → follow-up → evidence-based closure.'} actions={canLog&&<button className="btn primary" onClick={()=>setModal({type:'incident'})}>＋ {t(lang,'createIncident')}</button>}/>
    <div className="grid12" style={{marginBottom:13}}><RiskRule tone="stable" title="Stable" rule="0–1 / week" text={lang==='vi'?'Theo dõi bình thường':'Routine monitoring'}/><RiskRule tone="watch" title="Watch" rule="2 / week or 3 / month" text={lang==='vi'?'Coaching + targeted observation':'Coaching + targeted observation'}/><RiskRule tone="danger" title="Danger" rule="≥3 / week or ≥4 / month" text={lang==='vi'?'Formal review + retraining':'Formal review + retraining'}/><RiskRule tone="critical" title="Critical" rule="Any critical breach" text={lang==='vi'?'Escalate immediately':'Immediate escalation'}/></div>
    <div className="panel"><div className="table-wrap"><div className="table"><div className="tr th incident-cols"><span>{bi(lang,'Teacher / case','Giáo viên / sự vụ')}</span><span>{t(lang,'category')}</span><span>{t(lang,'severity')}</span><span>{bi(lang,'Date','Ngày')}</span><span>{t(lang,'approval')}</span><span>{t(lang,'status')}</span><span>{t(lang,'action')}</span></div>{rows.map(i=>{const tr=data.teachers.find(x=>x.id===i.teacher_id)||profile;return <div className="tr incident-cols" key={i.id}><span className="teacher-cell"><AvatarPic user={tr}/><span><b>{tr.full_name}</b><small>{i.case_code||i.id.slice(0,8)} · {i.title}</small></span></span><span><b>{incidentLabel(lang,i.category)}</b></span><span><span className={`pill ${i.severity==='critical'||i.severity==='high'?'red':i.severity==='medium'?'amber':'green'}`}>{bi(lang,i.severity,({low:'Thấp',medium:'Trung bình',high:'Cao',critical:'Khẩn cấp'})[i.severity]||i.severity)}</span></span><span><b>{fmt(i.created_at,lang)}</b><small>{i.logged_by_name}</small></span><span>{i.director_approved_at?<span className="pill green">{bi(lang,'Approved','Đã duyệt')}</span>:<span className="pill amber">{bi(lang,'Pending','Đang chờ')}</span>}</span><span><span className="pill navy">{statusLabel(lang,i.status)}</span></span><span className="row-actions">{profile.role==='centre_director'&&!i.director_approved_at&&<button className="btn small primary" onClick={()=>approveIncident(i.id)}>{t(lang,'approve')}</button>}{i.evidence_paths?.length>0&&<button className="btn small secondary" onClick={()=>openMaterial(i.evidence_paths[0],'teacher-evidence')}>{bi(lang,'Evidence','Bằng chứng')}</button>}{canRemove&&<button className="btn small danger" onClick={()=>removeRow('incidents',i.id)}>{t(lang,'remove')}</button>}</span></div>})}{!rows.length&&<Empty lang={lang}/>}</div></div></div></>
  }

  function Performance(){
    const rows=data.teachers.map(x=>({teacher:x,...teacherIntel(x)})).sort((a,b)=>(b.score||0)-(a.score||0))
    const avg=rows.length?Math.round(rows.reduce((a,x)=>a+(x.score||0),0)/rows.filter(x=>x.score).length||0):0
    const ready=rows.filter(x=>x.upgradePotential>=80).length
    const danger=rows.filter(x=>['Danger','Critical'].includes(x.risk.level)).length
    return <><PageIntro kicker={bi(lang,'SEE THE SIGNALS · SUPPORT THE NEXT STEP','NHÌN TÍN HIỆU · HỖ TRỢ BƯỚC TIẾP THEO')} title={t(lang,'performance')} text={lang==='vi'?'Phân tích điểm mạnh, điểm cần phát triển, mức hỗ trợ và tiềm năng để phục vụ xếp lớp, hướng dẫn, đào tạo và quy hoạch nhân sự.':'Analyse strengths, gaps, risk and potential to support class allocation, coaching, development and workforce planning.'}/><div className="stat-strip"><div><span>{bi(lang,'Teachers','Giáo viên')}</span><b>{rows.length}</b></div><div><span>{bi(lang,'Average observation','Điểm dự giờ TB')}</span><b>{avg||'—'}</b></div><div><span>{bi(lang,'Growth-ready','Sẵn sàng phát triển')}</span><b>{ready}</b></div><div><span>{bi(lang,'Needs urgent support','Cần hỗ trợ gấp')}</span><b>{danger}</b></div></div><div className="panel"><div className="table-wrap"><div className="table"><div className="tr th teacher-cols"><span>{bi(lang,'Teacher','Giáo viên')}</span><span>{bi(lang,'Obs.','Dự giờ')}</span><span>HVR</span><span>{bi(lang,'Cases','Sự vụ')}</span><span>{bi(lang,'Check-ins','Theo dõi')}</span><span>{bi(lang,'Potential','Tiềm năng')}</span><span>{t(lang,'recommendation')}</span></div>{rows.map(r=><div className="tr teacher-cols" key={r.teacher.id}><span className="teacher-cell"><AvatarPic user={r.teacher}/><span><b>{r.teacher.full_name}</b><small>{r.teacher.home_centre_code} · {r.teacher.professional_level||'—'}</small></span></span><span><b>{r.score||'—'}</b><small>{r.score?bandLabel(lang,r.score):bi(lang,'No score','Chưa có điểm')}</small></span><span><b>{r.hvr?`${r.hvr}%`:'—'}</b></span><span><b>{r.monthlyCases}</b><small><RiskPill risk={r.risk} lang={lang}/></small></span><span><b>{r.touchCount}/2</b><small>{r.touchCount>=2?bi(lang,'On target','Đủ lượt'):t(lang,'followUpDue')}</small></span><span><b>{r.upgradePotential}%</b><small>{r.upgradePotential>=80?bi(lang,'READY','SẴN SÀNG'):r.upgradePotential>=65?bi(lang,'BUILD','BỔ SUNG'):bi(lang,'HOLD','TIẾP TỤC PHÁT TRIỂN')}</small></span><span><b>{r.recommendation}</b><small>{riskAction(lang,r.risk)}</small></span></div>)}</div></div><div className="insight"><b>{t(lang,'transparent')}</b><p>{lang==='vi'?'Hệ thống không tự động đưa ra quyết định loại giáo viên. Khuyến nghị luôn đi theo bằng chứng → hướng dẫn/đào tạo → dự giờ lại → điều chỉnh hoặc đánh giá chính thức → quyết định nhân sự; chỉ các vi phạm nghiêm trọng mới cần nâng mức xử lý ngay.':'The system does not automatically terminate teachers. Recommendations follow evidence → coaching/training → re-observe → reassignment/formal review → staffing decision, except critical breaches that require immediate escalation.'}</p></div></div></>
  }

  function Touchpoints(){
    const weekAgo=new Date(Date.now()-7*86400000)
    const rows=data.teachers.map(x=>{const ts=data.touchpoints.filter(z=>z.teacher_id===x.id&&new Date(z.touch_date)>=weekAgo);return {teacher:x,count:ts.length,last:ts[0]}}).sort((a,b)=>a.count-b.count)
    const canLog=['academic_supervisor','rnd','bod','cmo','centre_director'].includes(profile.role)
    return <><PageIntro kicker={bi(lang,'WEEKLY TEACHER CONTACT STANDARD','TIÊU CHUẨN THEO DÕI GIÁO VIÊN HẰNG TUẦN')} title={t(lang,'touchpoints')} text={t(lang,'teacherTouchStandard')} actions={canLog&&<button className="btn primary" onClick={()=>setModal({type:'touchpoint'})}>＋ {bi(lang,'Log check-in','Ghi nhận lượt theo dõi')}</button>}/><div className="panel"><div className="table-wrap"><div className="table"><div className="tr th touch-cols"><span>{bi(lang,'Teacher','Giáo viên')}</span><span>{bi(lang,'This week','Tuần này')}</span><span>{t(lang,'status')}</span><span>{bi(lang,'Latest check-in','Lần theo dõi gần nhất')}</span><span>{t(lang,'action')}</span></div>{rows.map(r=><div className="tr touch-cols" key={r.teacher.id}><span className="teacher-cell"><AvatarPic user={r.teacher}/><span><b>{r.teacher.full_name}</b><small>{r.teacher.home_centre_code} · {r.teacher.teacher_code||'—'}</small></span></span><span><b>{r.count}/2</b></span><span><span className={`pill ${r.count>=2?'green':r.count===1?'amber':'red'}`}>{r.count>=2?bi(lang,'On target','Đủ lượt'):r.count===1?bi(lang,'Needs check-in','Cần theo dõi thêm'):bi(lang,'Overdue attention','Cần ưu tiên theo dõi')}</span></span><span><b>{dv(lang,r.last?.touch_type||'—')}</b><small>{r.last?fmt(r.last.touch_date,lang):bi(lang,'No check-in this week','Chưa có lượt theo dõi trong tuần')}</small></span><span>{canLog&&r.count<2?<button className="btn small secondary" onClick={()=>setModal({type:'touchpoint',teacher:r.teacher})}>{t(lang,'followUpDue')}</button>:<span className="pill green">✓</span>}</span></div>)}</div></div></div></>
  }

  function Upgrades(){
    const canPropose=['academic_supervisor','rnd','bod'].includes(profile.role)
    const canReview=['rnd','bod'].includes(profile.role)
    const rows=data.teachers.map(x=>({teacher:x,...teacherIntel(x),proposal:data.upgrades.find(u=>u.teacher_id===x.id&&u.status!=='rejected')})).sort((a,b)=>b.upgradePotential-a.upgradePotential)
    return <><PageIntro kicker={bi(lang,'SUCCESSION & DEVELOPMENT PIPELINE','LỘ TRÌNH PHÁT TRIỂN & KẾ NHIỆM')} title={t(lang,'upgrades')} text={lang==='vi'?'Mức tiềm năng chỉ hỗ trợ ra quyết định; thay đổi cấp độ luôn cần lý do cụ thể và R&D phê duyệt.':'Potential is decision support only; every level change requires explicit rationale and R&D approval.'}/><div className="grid12">{rows.map(r=><article className="panel span6" key={r.teacher.id}><div className="panel-head"><div><span>{r.teacher.home_centre_code} · {r.teacher.professional_level||'—'}</span><h3>{r.teacher.full_name}</h3></div><span className={`pill ${r.upgradePotential>=80?'green':r.upgradePotential>=65?'amber':'red'}`}>{r.upgradePotential}%</span></div><div className="panel-body"><div className="facts" style={{gridTemplateColumns:'repeat(4,1fr)',marginTop:0}}><div><span>{bi(lang,'Obs.','Dự giờ')}</span><b>{r.score||'—'}</b></div><div><span>HVR</span><b>{r.hvr?`${r.hvr}%`:'—'}</b></div><div><span>{bi(lang,'Support','Hỗ trợ')}</span><b>{r.risk.level==='Stable'?t(lang,'stable'):r.risk.level==='Watch'?t(lang,'watch'):r.risk.level==='Danger'?t(lang,'danger'):t(lang,'critical')}</b></div><div><span>{bi(lang,'Docs','Hồ sơ')}</span><b>{r.docs}%</b></div></div><div className="insight" style={{margin:'12px 0'}}><b>{r.proposal?bi(lang,`Proposal: ${statusLabel(lang,r.proposal.status)}`,`Đề xuất: ${statusLabel(lang,r.proposal.status)}`):(r.upgradePotential>=80?bi(lang,'Ready for upgrade review','Sẵn sàng đánh giá nâng cấp độ'):r.upgradePotential>=65?bi(lang,'Build evidence before upgrade','Bổ sung bằng chứng trước khi nâng cấp độ'):bi(lang,'Hold and develop','Tiếp tục phát triển'))}</b><p>{r.recommendation}</p></div><div className="row-actions">{canPropose&&!r.proposal&&<button className="btn secondary" onClick={()=>setModal({type:'upgrade',teacher:r.teacher})}>{bi(lang,'Propose level change','Đề xuất nâng cấp độ')} →</button>}{canReview&&r.proposal?.status==='pending_rnd_approval'&&<button className="btn primary" onClick={()=>approveUpgrade(r.proposal.id,r.teacher.id,r.proposal.proposed_level)}>{bi(lang,'Approve & update level','Duyệt & cập nhật cấp độ')} →</button>}{canReview&&r.proposal?.status==='pending_rnd_approval'&&<button className="btn danger" onClick={()=>rejectUpgrade(r.proposal.id)}>{bi(lang,'Reject','Từ chối')}</button>}</div></div></article>)}</div></>
  }

  function Documents(){
    const canEdit=['ptns','rnd','bod'].includes(profile.role)
    const ownSubmissions=data.documentSubmissions.filter(x=>x.teacher_id===profile.id)
    if(profile.role==='teacher'){
      const summary=data.documents.find(d=>d.teacher_id===profile.id)
      const pending=ownSubmissions.filter(x=>x.status==='submitted').length
      const verified=ownSubmissions.filter(x=>x.status==='verified').length
      return <><PageIntro kicker={bi(lang,'MY PROFESSIONAL DOCUMENTS','HỒ SƠ NGHỀ NGHIỆP CỦA TÔI')} title={t(lang,'documents')} text={bi(lang,'Upload your own qualifications and employment documents here. HR receives them automatically — no separate email or chat attachment needed.','Tự tải bằng cấp, chứng chỉ và hồ sơ cá nhân lên đây. PTNS nhận tự động — không cần gửi lại qua email hay chat.')} actions={<button className="btn primary" onClick={()=>setModal({type:'document-upload'})}>＋ {bi(lang,'Upload a document','Tải hồ sơ lên')}</button>}/>
        <div className="document-self-grid">
          <article className="doc-readiness-card"><span>{bi(lang,'DOCUMENT READINESS','MỨC HOÀN THIỆN HỒ SƠ')}</span><b>{summary?.completion_pct||0}%</b><div className="meter"><i style={{width:`${summary?.completion_pct||0}%`}}/></div><p>{bi(lang,'HR updates the official completion status after verification.','PTNS cập nhật mức hoàn thiện chính thức sau khi xác minh.')}</p></article>
          <article className="doc-mini-card"><i>⇧</i><span><b>{ownSubmissions.length}</b><small>{bi(lang,'files submitted','hồ sơ đã gửi')}</small></span></article>
          <article className="doc-mini-card"><i>✓</i><span><b>{verified}</b><small>{bi(lang,'verified by HR','đã được PTNS xác minh')}</small></span></article>
          <article className="doc-mini-card"><i>…</i><span><b>{pending}</b><small>{bi(lang,'waiting for review','đang chờ duyệt')}</small></span></article>
        </div>
        <div className="panel"><div className="panel-head"><div><span>{bi(lang,'SUBMISSION HISTORY','LỊCH SỬ NỘP HỒ SƠ')}</span><h3>{bi(lang,'What HR has received','PTNS đã nhận những gì')}</h3></div></div><div className="document-submission-list">{ownSubmissions.map(x=><div className="document-submission" key={x.id}><span className="doc-file-icon">▱</span><span><b>{x.file_name}</b><small>{dv(lang,x.document_type)} · {fmt(x.created_at,lang)}</small>{x.hr_note&&<em>{x.hr_note}</em>}</span><span className={`pill ${x.status==='verified'?'green':x.status==='needs_revision'?'red':'amber'}`}>{x.status==='verified'?bi(lang,'Verified','Đã xác minh'):x.status==='needs_revision'?bi(lang,'Needs revision','Cần bổ sung'):bi(lang,'Submitted','Đã nộp')}</span><button className="btn small secondary" onClick={()=>openMaterial(x.file_path,'teacher-documents')}>{bi(lang,'Open','Mở')}</button></div>)}{!ownSubmissions.length&&<Empty lang={lang}/>}</div></div>
      </>
    }

    const rows=data.teachers.map(x=>({teacher:x,doc:data.documents.find(d=>d.teacher_id===x.id)}))
    const queue=data.documentSubmissions.filter(x=>x.status==='submitted'||x.status==='needs_revision')
    return <><PageIntro kicker={bi(lang,'DOCUMENT INBOX · READINESS · FOLLOW-UP','HỘP HỒ SƠ · SẴN SÀNG · THEO DÕI')} title={t(lang,'documents')} text={bi(lang,'Teachers submit documents directly. HR reviews one shared inbox, verifies evidence and sends revision requests back inside Teacher 360.','Giáo viên tự nộp hồ sơ trực tiếp. PTNS xử lý trên một hộp hồ sơ chung, xác minh minh chứng và gửi yêu cầu bổ sung ngay trong Teacher 360.')} actions={canEdit&&<button className="btn primary" onClick={()=>setModal({type:'document'})}>＋ {bi(lang,'Update official status','Cập nhật trạng thái chính thức')}</button>}/>
      <div className="panel document-inbox-panel"><div className="panel-head"><div><span>{bi(lang,'HR DOCUMENT INBOX','HỘP HỒ SƠ PTNS')}</span><h3>{bi(lang,'New teacher submissions','Hồ sơ giáo viên mới gửi')}</h3></div><span className="metric-chip">{queue.length} {bi(lang,'open','đang chờ')}</span></div><div className="document-submission-list">{queue.slice(0,14).map(x=>{const tr=data.teachers.find(t=>t.id===x.teacher_id);return <div className="document-submission" key={x.id}><AvatarPic user={tr}/><span><b>{tr?.full_name||bi(lang,'Teacher','Giáo viên')}</b><small>{x.file_name} · {dv(lang,x.document_type)} · {fmt(x.created_at,lang)}</small>{x.hr_note&&<em>{x.hr_note}</em>}</span><span className={`pill ${x.status==='needs_revision'?'red':'amber'}`}>{x.status==='needs_revision'?bi(lang,'Revision requested','Đã yêu cầu bổ sung'):bi(lang,'New submission','Hồ sơ mới')}</span><span className="row-actions"><button className="btn small secondary" onClick={()=>openMaterial(x.file_path,'teacher-documents')}>{bi(lang,'Review file','Xem file')}</button>{canEdit&&<button className="btn small primary" onClick={()=>reviewDocumentSubmission(x.id,'verified')}>{bi(lang,'Verify','Xác minh')}</button>}{canEdit&&<button className="btn small danger" onClick={()=>reviewDocumentSubmission(x.id,'needs_revision')}>{bi(lang,'Request revision','Yêu cầu bổ sung')}</button>}</span></div>})}{!queue.length&&<div className="positive-empty">✓ <b>{bi(lang,'Document inbox is clear.','Hộp hồ sơ hiện không có việc chờ xử lý.')}</b></div>}</div></div>
      <div className="panel"><div className="table-wrap"><div className="table"><div className="tr th doc-cols"><span>{bi(lang,'Teacher','Giáo viên')}</span><span>{t(lang,'degree')}</span><span>{t(lang,'tesol')}</span><span>{t(lang,'englishProof')}</span><span>{t(lang,'promisedDate')}</span><span>{t(lang,'status')}</span></div>{rows.map(r=><div className="tr doc-cols" key={r.teacher.id}><span className="teacher-cell"><AvatarPic user={r.teacher}/><span><b>{r.teacher.full_name}</b><small>{r.teacher.teacher_code||'—'} · {r.teacher.home_centre_code}</small></span></span><span><DocPill v={r.doc?.degree_status} lang={lang}/></span><span><DocPill v={r.doc?.tesol_status} lang={lang}/></span><span><b>{dv(lang,r.doc?.english_status||'Missing')}</b><small>{bi(lang,'Native proof','Minh chứng bản ngữ')}: {dv(lang,r.doc?.native_proof_status||'N/A')}</small></span><span><b>{r.doc?.promised_submission_date?fmt(r.doc.promised_submission_date,lang):'—'}</b><small>{r.doc?.promised_submission_date?relative(r.doc.promised_submission_date,lang):''}</small></span><span><span className={`pill ${(r.doc?.completion_pct||0)>=100?'green':(r.doc?.completion_pct||0)>=70?'amber':'red'}`}>{r.doc?.completion_pct||0}%</span></span></div>)}</div></div></div>
    </>
  }

  function Kpi(){
    const rows=data.teachers.map(x=>({teacher:x,kpi:latestKpi(x.id),obs:latestObs(x.id)}))
    const canEditKpi=['ptns','rnd','bod'].includes(profile.role)
    return <><PageIntro kicker={bi(lang,'TEACHER PERFORMANCE SNAPSHOT','TỔNG QUAN HIỆU SUẤT GIÁO VIÊN')} title={t(lang,'kpi')} text={lang==='vi'?'KPI tổng hợp điểm dự giờ, HVR và đóng góp doanh thu. Trọng số cần được R&D/BOD phê duyệt trước khi áp dụng chính thức.':'KPI combines observation, HVR and revenue contribution. Weights must be formally approved by R&D/BOD before becoming policy.'} actions={canEditKpi&&<button className="btn primary" onClick={()=>setModal({type:'kpi'})}>＋ {bi(lang,'Record KPI','Ghi nhận KPI')}</button>}/><div className="grid12" style={{marginBottom:14}}><KpiWeight label={bi(lang,'Observation','Dự giờ')} value="50%" lang={lang}/><KpiWeight label={bi(lang,'HVR / learner retention','HVR / duy trì học viên')} value="30%" lang={lang}/><KpiWeight label={bi(lang,'Revenue contribution','Đóng góp doanh thu')} value="20%" lang={lang}/></div><div className="panel"><div className="table-wrap"><div className="table"><div className="tr th teacher-cols"><span>{bi(lang,'Teacher','Giáo viên')}</span><span>{bi(lang,'Obs.','Dự giờ')}</span><span>HVR</span><span>{bi(lang,'Revenue','Doanh thu')}</span><span>KPI</span><span>{bi(lang,'Period','Kỳ')}</span><span>{t(lang,'status')}</span></div>{rows.map(r=><div className="tr teacher-cols" key={r.teacher.id}><span className="teacher-cell"><AvatarPic user={r.teacher}/><span><b>{r.teacher.full_name}</b><small>{r.teacher.home_centre_code}</small></span></span><span><b>{r.obs?.final_score||'—'}</b></span><span><b>{r.kpi?.hvr_pct?`${r.kpi.hvr_pct}%`:'—'}</b></span><span><b>{r.kpi?.revenue_contribution?Number(r.kpi.revenue_contribution).toLocaleString():'—'}</b></span><span><b>{r.kpi?.composite_score||'—'}</b></span><span><b>{r.kpi?fmt(r.kpi.period_start,lang):'—'}</b></span><span><span className="pill navy">{r.kpi?bi(lang,'Recorded','Đã ghi nhận'):bi(lang,'Pending','Chưa ghi nhận')}</span></span></div>)}</div></div></div></>
  }

  function Coordination(){
    const open=data.incidents.filter(x=>!['closed','resolved'].includes(x.status))
    return <><PageIntro kicker={bi(lang,'WORK TOGETHER · CLOSE THE LOOP','PHỐI HỢP · XỬ LÝ ĐẾN CÙNG')} title={t(lang,'coordination')} text={lang==='vi'?'Kết nối phản hồi học viên/phụ huynh, sự vụ giáo viên, người phụ trách, thời hạn xử lý, khắc phục dịch vụ và xác nhận hoàn tất.':'Connect learner/parent feedback, teacher cases, cross-department owners, SLA, service recovery and closure validation.'}/><div className="grid12"><div className="panel span7"><div className="panel-head"><div><span>{bi(lang,'OPEN CROSS-TEAM CASES','SỰ VỤ LIÊN PHÒNG ĐANG MỞ')}</span><h3>{bi(lang,'Coordination queue','Danh sách cần phối hợp')}</h3></div></div><div className="notice-list">{open.slice(0,8).map(i=><div className="notice" key={i.id}><div className="notice-icon">!</div><div><b>{i.title}</b><p>{incidentLabel(lang,i.category)} · {bi(lang,'Owner','Phụ trách')}: {i.action_owner||bi(lang,'Unassigned','Chưa phân công')} · {bi(lang,'Status','Trạng thái')}: {statusLabel(lang,i.status)}</p></div></div>)}{!open.length&&<Empty lang={lang}/>}</div></div><div className="panel span5"><div className="panel-head"><div><span>{bi(lang,'HOW WE COORDINATE','CÁCH PHỐI HỢP')}</span><h3>{bi(lang,'CSR action model','Quy trình phối hợp CSR')}</h3></div></div><div className="notice-list">{(lang==='vi'?['Gắn phản hồi học viên / phụ huynh vào hồ sơ giáo viên','Phân công đầu mối liên phòng và thời hạn xử lý','Nâng mức xử lý khi bằng chứng hoặc phản hồi bị trễ','Phối hợp khắc phục trải nghiệm dịch vụ','Xác minh bằng chứng hoàn tất trước khi đóng']:['Link learner / parent feedback to teacher record','Assign cross-department owner and SLA','Escalate overdue evidence or response','Coordinate service recovery','Validate closure evidence before closing']).map((x,i)=><div className="notice" key={x}><div className="notice-icon">{i+1}</div><div><b>{x}</b><p>{bi(lang,'Recorded with owner, due date and activity history.','Có người phụ trách, hạn xử lý và lịch sử hoạt động.')}</p></div></div>)}</div></div></div></>
  }

  function Imports(){
    const allowed=[]
    if(['rnd','bod'].includes(profile.role))allowed.push('users')
    if(['academic_supervisor','rnd','bod'].includes(profile.role))allowed.push('observations')
    if(['academic_supervisor','ptns','rnd','bod'].includes(profile.role))allowed.push('trainings')
    if(['ptns','rnd','bod'].includes(profile.role))allowed.push('announcements')
    if(!allowed.length)return <Empty lang={lang}/>
    const cards={
      users:{title:t(lang,'importUsers'),icon:'01',text:bi(lang,'Create or update many staff accounts from one spreadsheet.','Tạo hoặc cập nhật nhiều tài khoản nhân sự từ một bảng dữ liệu.'),columns:'full_name · email · temporary_password · role · staff_code · job_title · teacher_code · centre · region · level · language'},
      observations:{title:t(lang,'importObservations'),icon:'02',text:bi(lang,'Bring historical observation scores into each teacher portfolio and trend view.','Đưa điểm dự giờ trước đây vào hồ sơ và xu hướng phát triển của từng giáo viên.'),columns:'teacher_code/email · observed_at · final_score · strengths · improvement_areas · rating_1…rating_15 (optional)'},
      trainings:{title:t(lang,'importTrainings'),icon:'03',text:bi(lang,'Import training schedules, audiences, locations and recaps in bulk.','Nhập hàng loạt lịch đào tạo, đối tượng, địa điểm và recap.'),columns:'title · training_type · starts_at · ends_at · location · audience · region · centre · description'},
      announcements:{title:t(lang,'importAnnouncements'),icon:'04',text:bi(lang,'Publish multiple internal updates with EN/VI content from one file.','Đăng nhiều thông báo nội bộ song ngữ EN/VI từ một file.'),columns:'title_en · title_vi · body_en · body_vi · audience · region · centre · published_at'}
    }
    return <><PageIntro kicker={bi(lang,'MAKE OLD DATA USEFUL AGAIN','ĐƯA DỮ LIỆU CŨ VÀO MỘT NƠI')} title={t(lang,'importData')} text={bi(lang,'Use a clean template, upload CSV or Excel, and let Teacher 360 create the records for you. No more one-by-one entry.','Dùng file mẫu, tải CSV hoặc Excel lên và để Teacher 360 tự tạo dữ liệu. Không cần nhập từng dòng thủ công.')}/><div className="import-flow"><span><b>1</b>{bi(lang,'Accounts first','Tài khoản trước')}</span><i>→</i><span><b>2</b>{bi(lang,'Observation history','Lịch sử dự giờ')}</span><i>→</i><span><b>3</b>{bi(lang,'Training calendar','Lịch đào tạo')}</span><i>→</i><span><b>4</b>{bi(lang,'Internal updates','Thông báo nội bộ')}</span></div><div className="micro-note import-note">{bi(lang,'Recommended order when setting up Teacher 360. Existing accounts are matched by email; exact duplicate observations, trainings and announcements are skipped. Historical observations with only a final score still contribute as low-confidence baseline evidence.','Thứ tự khuyến nghị khi thiết lập Teacher 360. Tài khoản hiện có được đối chiếu bằng email; các bản ghi dự giờ, đào tạo và thông báo trùng khớp sẽ được bỏ qua. Dữ liệu dự giờ cũ chỉ có điểm tổng vẫn được dùng làm mốc nền với độ tin cậy thấp.')}</div><div className="import-grid">{allowed.map(kind=><BulkImportCard key={kind} kind={kind} meta={cards[kind]} lang={lang} onDone={load}/>)}</div></>
  }

  function Access(){
    if(!canAdmin)return <Empty lang={lang}/>
    const userScope=u=>{
      if(HEAD_OFFICE_ROLES.includes(u.role))return bi(lang,'Head Office · all regions','Hội sở · toàn hệ thống')
      if(REGION_SCOPE_ROLES.includes(u.role))return `${bi(lang,'Region','Khu vực')} ${u.region_no||'—'}`
      if(CENTRE_SCOPE_ROLES.includes(u.role))return `${u.home_centre_code||'—'} · ${bi(lang,'Region','Khu vực')} ${u.region_no||'—'}`
      if(u.role==='teacher')return `${u.home_centre_code||'—'} · ${bi(lang,'Region','Khu vực')} ${u.region_no||'—'}`
      return '—'
    }
    return <><PageIntro kicker={bi(lang,'TEAM ONBOARDING & ACCESS','TÀI KHOẢN & QUYỀN TRUY CẬP')} title={t(lang,'access')} text={t(lang,'userAdminSub')}/>
      <div className="onboarding-grid">
        <button className="onboarding-card" onClick={()=>setModal({type:'user'})}><span className="onboarding-icon">＋</span><span><b>{t(lang,'createUser')}</b><small>{bi(lang,'Role-aware form: Teacher → centre; Centre roles → centre; Regional Director → region; Head Office → no location assignment.','Form tự thay đổi theo vai trò: GV → trung tâm; quản lý TT → trung tâm; GĐ Khu vực → khu vực; Hội sở → không gán địa bàn.')}</small></span><i>→</i></button>
        <button className="onboarding-card featured" onClick={()=>setView('imports')}><span className="onboarding-icon">⇩</span><span><b>{t(lang,'bulkImport')}</b><small>{bi(lang,'Create or update a whole centre, region or staff list from CSV / Excel.','Tạo hoặc cập nhật cả trung tâm, khu vực hay danh sách nhân sự từ CSV / Excel.')}</small></span><i>→</i></button>
      </div>
      <div className="panel"><div className="table-wrap"><div className="table">
        <div className="tr th access-cols-v10"><span>{bi(lang,'User','Người dùng')}</span><span>{t(lang,'role')}</span><span>{bi(lang,'Staff code','Mã NS')}</span><span>{bi(lang,'Access scope','Phạm vi')}</span><span>{bi(lang,'Job title','Chức danh')}</span><span>{t(lang,'status')}</span></div>
        {data.users.map(u=><div className="tr access-cols-v10" key={u.id}><span className="teacher-cell"><AvatarPic user={u}/><span><b>{u.full_name}</b><small>{u.email||u.id.slice(0,8)}</small></span></span><span><b>{ROLE_LABELS[u.role]?.[lang]||u.role}</b></span><span><b>{u.staff_code||u.teacher_code||'—'}</b></span><span><b>{userScope(u)}</b></span><span><b>{u.job_title||'—'}</b></span><span><span className={`pill ${u.is_active===false?'red':'green'}`}>{u.is_active===false?bi(lang,'Inactive','Ngưng hoạt động'):bi(lang,'Active','Đang hoạt động')}</span></span></div>)}
      </div></div></div>
    </>
  }

  function Governance(){
    const rules=lang==='vi'?['Có bằng chứng trước khi kết luận','Hoàn tất hồ sơ dự giờ trong 24 giờ; phản hồi trong 48 giờ','Sự vụ đã duyệt cần được thông tin tới giáo viên trong 12 giờ','Mỗi giáo viên có 2 lượt theo dõi có ý nghĩa mỗi tuần','Thay đổi cấp độ cần lý do và R&D phê duyệt','Chỉ R&D/BOD được xóa dữ liệu','Đóng việc cần làm phải có bằng chứng hoàn tất']:['Evidence before judgement','Observation record within 24h; feedback within 48h','Approved teacher case delivered within 12h','Two meaningful teacher check-ins per week','Level change requires rationale + R&D approval','Only R&D/BOD can remove records','Closure requires completion evidence']
    return <><PageIntro kicker={bi(lang,'CLEAR RULES · FAIR DECISIONS','QUY TẮC RÕ · QUYẾT ĐỊNH CÔNG BẰNG')} title={t(lang,'governance')} text={bi(lang,'Permissions, approvals and record changes follow VMG roles automatically.','Quyền xem, phê duyệt và thay đổi dữ liệu được áp dụng tự động theo vai trò VMG.')}/><div className="grid12"><div className="panel span6"><div className="panel-head"><div><span>{bi(lang,'REGIONAL VISIBILITY','PHẠM VI THEO KHU VỰC')}</span><h3>{bi(lang,'Cross-centre teacher access','Quyền xem giáo viên liên trung tâm')}</h3></div></div><div className="notice-list">{Object.entries(REGION_CENTRES).map(([r,c])=><div className="notice" key={r}><div className="notice-icon">{r}</div><div><b>{bi(lang,'Region','Khu vực')} {r}</b><p>{c.join(' · ')} · {bi(lang,'Managers can support teachers across centres in the same region.','Quản lý có thể hỗ trợ giáo viên giữa các trung tâm trong cùng khu vực.')}</p></div></div>)}</div></div><div className="panel span6"><div className="panel-head"><div><span>{bi(lang,'QUALITY STANDARDS','TIÊU CHUẨN CHẤT LƯỢNG')}</span><h3>{bi(lang,'How we work fairly','Nguyên tắc làm việc')}</h3></div></div><div className="notice-list">{rules.map(x=><div className="notice" key={x}><div className="notice-icon">✓</div><div><b>{x}</b><p>{bi(lang,'Owner, due date and activity history stay with the record.','Người phụ trách, hạn xử lý và lịch sử hoạt động được lưu cùng hồ sơ.')}</p></div></div>)}</div></div></div></>
  }

  function renderModal(){
    if(modal.type==='incident')return <IncidentForm teachers={data.teachers} lang={lang} onSave={saveIncident} />
    if(modal.type==='observation')return <ObservationForm teachers={data.teachers} defaultTeacher={modal.teacher||selectedTeacher} lang={lang} onSave={saveObservation}/>
    if(modal.type==='training')return <TrainingForm lang={lang} onSave={saveTraining}/>
    if(modal.type==='training-request')return <TrainingRequestForm teachers={data.teachers} lang={lang} onSave={saveTrainingRequest}/>
    if(modal.type==='event')return <EventForm teachers={data.teachers} lang={lang} onSave={saveEvent}/>
    if(modal.type==='kpi')return <KpiForm teachers={data.teachers} lang={lang} onSave={saveKpi}/>
    if(modal.type==='bulletin')return <BulletinForm lang={lang} onSave={saveBulletin}/>
    if(modal.type==='user')return <UserForm lang={lang} onSave={createUser}/>
    if(modal.type==='touchpoint')return <TouchpointForm teachers={data.teachers} defaultTeacher={modal.teacher} lang={lang} onSave={saveTouchpoint}/>
    if(modal.type==='upgrade')return <UpgradeForm teacher={modal.teacher} lang={lang} onSave={saveUpgrade}/>
    if(modal.type==='document')return <DocumentForm teachers={data.teachers} lang={lang} onSave={saveDocument}/>
    if(modal.type==='document-upload')return <TeacherDocumentUploadForm lang={lang} onSave={saveTeacherDocument}/>
    if(modal.type==='avatar')return <AvatarUploadForm user={currentUser} lang={lang} onSave={saveAvatar}/>
    if(modal.type==='support')return <SupportForm teacher={profile.role==='teacher'?profile:(modal.teacher||selectedTeacher||data.teachers[0])} lang={lang} onSave={saveSupport}/>
    if(modal.type==='recap')return <div><p style={{lineHeight:1.7,color:'#667080'}}>{modal.record.recap_text}</p></div>
    return null
  }

  async function markAllNotifications(){const ids=data.notifications.filter(n=>!n.read_at).map(n=>n.id);if(!ids.length)return;await supabase.from('notifications').update({read_at:new Date().toISOString()}).in('id',ids);load()}
  async function openNotification(n){if(!n.read_at)await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('id',n.id);const target=n.link_target==='calendar'?'training':n.link_target;if(target&&nav.includes(target))setView(target);setNotifOpen(false);load()}
  async function flushNotificationEmails(){try{await fetch('/api/notifications/flush',{method:'POST'})}catch{}}
  async function afterAction(){load();flushNotificationEmails()}
  async function saveAvatar(file){
    if(!file){flash(bi(lang,'Choose a profile image first.','Hãy chọn ảnh đại diện trước.'));return}
    if(!file.type.startsWith('image/')){flash(bi(lang,'Please choose an image file.','Vui lòng chọn file hình ảnh.'));return}
    if(file.size>5*1024*1024){flash(bi(lang,'Profile photo must be under 5 MB.','Ảnh đại diện cần nhỏ hơn 5 MB.'));return}
    const ext=(file.name.split('.').pop()||'jpg').replace(/[^a-zA-Z0-9]/g,'')
    const path=`${profile.id}/avatar-${Date.now()}.${ext}`
    const up=await supabase.storage.from('profile-photos').upload(path,file,{upsert:false})
    if(up.error){flash(up.error.message);return}
    const {error}=await supabase.rpc('set_my_avatar',{new_path:path})
    if(error){flash(error.message);return}
    setModal(null);flash(bi(lang,'Profile photo updated.','Đã cập nhật ảnh đại diện.'));afterAction()
  }
  async function saveTeacherDocument(form,file){
    if(!file){flash(bi(lang,'Choose a document to upload.','Hãy chọn tài liệu cần tải lên.'));return}
    if(file.size>15*1024*1024){flash(bi(lang,'Document must be under 15 MB.','Tài liệu cần nhỏ hơn 15 MB.'));return}
    const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_')
    const path=`${profile.id}/${form.document_type}/${Date.now()}-${safe}`
    const up=await supabase.storage.from('teacher-documents').upload(path,file)
    if(up.error){flash(up.error.message);return}
    const {error}=await supabase.from('teacher_document_submissions').insert({teacher_id:profile.id,document_type:form.document_type,file_path:path,file_name:file.name,submitted_by:profile.id,note:form.note||'',status:'submitted'})
    if(error){flash(error.message);return}
    setModal(null);flash(bi(lang,'Document submitted to HR. You can track its review status here.','Đã gửi hồ sơ đến PTNS. Bạn có thể theo dõi trạng thái duyệt ngay tại đây.'));afterAction()
  }
  async function reviewDocumentSubmission(id,status){
    const note=status==='needs_revision'?(prompt(bi(lang,'What should the teacher revise?','Giáo viên cần bổ sung/chỉnh gì?'))||''):''
    const {error}=await supabase.from('teacher_document_submissions').update({status,hr_note:note,reviewed_by:profile.id,reviewed_at:new Date().toISOString()}).eq('id',id)
    if(error)flash(error.message);else{flash(status==='verified'?bi(lang,'Document verified.','Đã xác minh hồ sơ.'):bi(lang,'Revision request sent to the teacher.','Đã gửi yêu cầu bổ sung cho giáo viên.'));afterAction()}
  }

  async function saveIncident(form,file){
    const tr=data.teachers.find(x=>x.id===form.teacher_id); const code=`CASE-${new Date().getFullYear()}-${Math.floor(1000+Math.random()*9000)}`
    const payload={...form,case_code:code,centre_code:tr?.home_centre_code,region_no:tr?.region_no,logged_by:profile.id,logged_by_name:profile.full_name,status:'pending_director_approval'}
    const {data:row,error}=await supabase.from('incidents').insert(payload).select().single(); if(error){flash(error.message);return}
    if(file){const path=`${form.teacher_id}/${row.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const up=await supabase.storage.from('teacher-evidence').upload(path,file);if(!up.error)await supabase.from('incidents').update({evidence_paths:[path]}).eq('id',row.id)}
    setModal(null);flash(lang==='vi'?'Đã ghi nhận sự vụ và chuyển phê duyệt.':'Case logged and routed for approval.');afterAction()
  }
  async function approveIncident(id){const due=new Date(Date.now()+12*3600000).toISOString();const {error}=await supabase.from('incidents').update({status:'approved',director_approved_at:new Date().toISOString(),director_approved_by:profile.id,teacher_delivery_due_at:due}).eq('id',id);if(error)flash(error.message);else{flash(bi(lang,'Approved. The teacher and relevant teams have been notified.','Đã phê duyệt. Giáo viên và các bên liên quan đã được thông báo.'));afterAction()}}
  async function saveObservation(form){const scores=form.ratings.map((r,i)=>({criterion:OBSERVATION_RUBRIC[i].criterion,domain:OBSERVATION_RUBRIC[i].domain,weight:OBSERVATION_RUBRIC[i].weight,rating:r,evidence:form.evidence[i]||''}));const final=scores.reduce((a,x)=>a+(x.rating/4*x.weight),0);const payload={teacher_id:form.teacher_id,observer_id:profile.id,observer_name:profile.full_name,observed_at:form.observed_at,observation_type:form.observation_type,purpose:form.purpose,class_name:form.class_name,criteria_scores:scores,final_score:Number(final.toFixed(1)),strengths:form.strengths,improvement_areas:form.improvement_areas,teacher_reflection:form.teacher_reflection,smart_action:form.smart_action,verify_by:form.verify_by,status:'finalized'};const {error}=await supabase.from('observations').insert(payload);if(error)flash(error.message);else{await supabase.from('teacher_touchpoints').insert({teacher_id:form.teacher_id,touch_date:form.observed_at.slice(0,10),touch_type:'Observation',owner_id:profile.id,owner_name:profile.full_name,notes:`Official observation ${final.toFixed(1)}%`});setModal(null);flash(bi(lang,'Observation published to the portfolio and notification network.','Đã công bố kết quả dự giờ vào hồ sơ và gửi thông báo đến các bên liên quan.'));afterAction()}}
  async function saveTraining(form,file){let slides_path=null;if(file){slides_path=`${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const up=await supabase.storage.from('training-materials').upload(slides_path,file);if(up.error){flash(up.error.message);return}}const {error}=await supabase.from('trainings').insert({...form,slides_path,created_by:profile.id,created_by_name:profile.full_name});if(error)flash(error.message);else{setModal(null);flash(bi(lang,'Training scheduled. Relevant colleagues have been notified.','Đã xếp lịch đào tạo và gửi thông báo đến các bên liên quan.'));afterAction()}}
  async function saveTrainingRequest(form){const {error}=await supabase.from('training_requests').insert({...form,requested_by:profile.id,requested_by_name:profile.full_name,status:'submitted'});if(error)flash(error.message);else{setModal(null);flash(bi(lang,'Training request sent to the Academic team.','Đã gửi đề xuất đào tạo đến bộ phận Học thuật.'));afterAction()}}
  async function saveEvent(form){const payload={...form,ends_at:form.ends_at||null,booked_by:profile.id,booked_by_name:profile.full_name};const {error}=await supabase.from('teacher_events').insert(payload);if(error)flash(error.message);else{setModal(null);flash(bi(lang,'Teacher event booked. Relevant people have been notified.','Đã đặt lịch và thông báo đến các bên liên quan.'));afterAction()}}
  async function saveKpi(form){const obs=Number(form.observation_score||0),hvr=Number(form.hvr_pct||0),rev=Number(form.revenue_contribution||0);const revIndex=Math.min(100,rev?Math.max(0,Math.round(rev/30000000*100)):0);const composite=Number((obs*.5+hvr*.3+revIndex*.2).toFixed(1));const payload={...form,observation_score:obs||null,hvr_pct:hvr||null,revenue_contribution:rev||null,composite_score:composite,recorded_by:profile.id};const {error}=await supabase.from('teacher_kpi_snapshots').upsert(payload,{onConflict:'teacher_id,period_start,period_end'});if(error)flash(error.message);else{setModal(null);flash(bi(lang,'Performance snapshot saved and shared with the relevant scope.','Đã lưu dữ liệu hiệu suất và thông báo trong phạm vi liên quan.'));afterAction()}}

  async function saveBulletin(form){const {error}=await supabase.from('announcements').insert({...form,author_id:profile.id,author_name:profile.full_name,published_at:new Date().toISOString(),is_active:true});if(error)flash(error.message);else{setModal(null);flash(bi(lang,'Announcement published and pushed to the right dashboards.','Đã đăng thông báo và đẩy đến đúng dashboard liên quan.'));afterAction()}}
  async function createUser(form){const res=await fetch('/api/admin/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,ui_lang:lang})});const out=await res.json();if(!res.ok){const raw=out.error||'';const friendly=/admin key|api key|project/i.test(raw)?bi(lang,'Account provisioning is not connected to this project yet. Update the server admin secret in Vercel, then redeploy.','Chức năng tạo tài khoản chưa kết nối đúng với project hiện tại. Hãy cập nhật secret key quản trị trên Vercel rồi redeploy.'):raw||bi(lang,'Could not create the account.','Không thể tạo tài khoản.');flash(friendly);return}setModal(null);flash(bi(lang,'Account created and access assigned.','Đã tạo tài khoản và phân quyền.'));afterAction()}
  async function saveTouchpoint(form){const {error}=await supabase.from('teacher_touchpoints').insert({...form,owner_id:profile.id,owner_name:profile.full_name});if(error)flash(error.message);else{setModal(null);flash(bi(lang,'Check-in recorded.','Đã ghi nhận lượt theo dõi.'));afterAction()}}
  async function approveUpgrade(id,teacherId,proposedLevel){const {error:e1}=await supabase.from('upgrade_recommendations').update({status:'approved',reviewed_by:profile.id,reviewed_at:new Date().toISOString(),review_note:'Approved in VMG Teacher 360'}).eq('id',id);if(e1){flash(e1.message);return}const {error:e2}=await supabase.from('profiles').update({professional_level:proposedLevel}).eq('id',teacherId);if(e2){flash(e2.message);return}flash(bi(lang,'Level change approved and the teacher has been notified.','Đã duyệt thay đổi cấp độ và thông báo đến giáo viên.'));afterAction()}
  async function rejectUpgrade(id){const note=prompt(bi(lang,'Review note / reason for rejection','Ghi chú / lý do từ chối'))||bi(lang,'Rejected after review','Từ chối sau khi xem xét');const {error}=await supabase.from('upgrade_recommendations').update({status:'rejected',reviewed_by:profile.id,reviewed_at:new Date().toISOString(),review_note:note}).eq('id',id);if(error)flash(error.message);else{flash(bi(lang,'Level proposal declined.','Đã từ chối đề xuất thay đổi cấp độ.'));afterAction()}}
  async function saveUpgrade(form){const {error}=await supabase.from('upgrade_recommendations').insert({...form,proposed_by:profile.id,proposed_by_name:profile.full_name,status:'pending_rnd_approval'});if(error)flash(error.message);else{setModal(null);flash(bi(lang,'Level proposal sent for academic approval.','Đã gửi đề xuất cấp độ để phê duyệt học thuật.'));afterAction()}}
  async function saveDocument(form,file){let path=null;if(file){path=`${form.teacher_id}/${form.document_type}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const up=await supabase.storage.from('teacher-documents').upload(path,file);if(up.error){flash(up.error.message);return}}const existing=data.documents.find(x=>x.teacher_id===form.teacher_id);const payload={teacher_id:form.teacher_id,degree_status:form.degree_status,tesol_status:form.tesol_status,english_status:form.english_status,native_proof_status:form.native_proof_status,promised_submission_date:form.promised_submission_date||null,completion_pct:Number(form.completion_pct),updated_by:profile.id,...(path?{document_paths:[...(existing?.document_paths||[]),path]}:{})};const q=existing?supabase.from('teacher_documents').update(payload).eq('id',existing.id):supabase.from('teacher_documents').insert(payload);const {error}=await q;if(error)flash(error.message);else{setModal(null);flash(bi(lang,'Teacher documents updated.','Đã cập nhật hồ sơ giáo viên.'));afterAction()}}
  async function updateSupport(id,status){const {error}=await supabase.from('support_requests').update({status,...(status==='closed'?{closed_at:new Date().toISOString()}:{} )}).eq('id',id);if(error)flash(error.message);else{flash(bi(lang,'Support request updated.','Đã cập nhật yêu cầu hỗ trợ.'));afterAction()}}
  async function saveSupport(form){const payload={...form,teacher_id:form.teacher_id||profile.id,created_by:profile.id,status:'open'};const {error}=await supabase.from('support_requests').insert(payload);if(error)flash(error.message);else{setModal(null);flash(lang==='vi'?'Đã gửi yêu cầu hỗ trợ.':'Support request submitted.');afterAction()}}
  async function bookTraining(trainingId){const {error}=await supabase.from('training_registrations').insert({training_id:trainingId,user_id:profile.id,status:'booked'});if(error)flash(error.message);else{flash(bi(lang,'Booking confirmed. A 24-hour reminder is scheduled.','Đã xác nhận tham gia. Hệ thống sẽ nhắc trước 24 giờ.'));afterAction()}}
  async function openMaterial(path,bucket){const {data,error}=await supabase.storage.from(bucket).createSignedUrl(path,120);if(error)flash(error.message);else window.open(data.signedUrl,'_blank','noopener,noreferrer')}
  async function removeRow(table,id){if(!canRemove)return;if(!confirm(bi(lang,'Remove this record? The change will remain in activity history.','Xóa hồ sơ này? Thay đổi vẫn được lưu trong lịch sử hoạt động.')))return;const {error}=await supabase.from(table).delete().eq('id',id);if(error)flash(error.message);else{flash(bi(lang,'Record removed.','Đã xóa hồ sơ.'));load()}}

  function latestObs(id){return data.observations.find(x=>x.teacher_id===id&&x.final_score!==null)}
  function latestKpi(id){return data.kpis.find(x=>x.teacher_id===id)}
  function avgKpi(field){const vals=data.kpis.map(x=>Number(x[field])).filter(Boolean);return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):0}
  function teacherIntel(teacher){
    const obs=latestObs(teacher.id);const k=latestKpi(teacher.id);const startMonth=new Date();startMonth.setDate(1);const weekAgo=new Date(Date.now()-7*86400000)
    const cases=data.incidents.filter(x=>x.teacher_id===teacher.id);const weekly=cases.filter(x=>new Date(x.created_at)>=weekAgo).length;const monthly=cases.filter(x=>new Date(x.created_at)>=startMonth).length;const critical=cases.some(x=>x.severity==='critical'&&!['closed','resolved'].includes(x.status));const risk=incidentRisk({weekly,monthly,critical})
    const touchCount=data.touchpoints.filter(x=>x.teacher_id===teacher.id&&new Date(x.touch_date)>=weekAgo).length;const docs=data.documents.find(x=>x.teacher_id===teacher.id)?.completion_pct||0;const score=Number(obs?.final_score||0);const hvr=Number(k?.hvr_pct||0)
    let potential=Math.round((score*.45)+(hvr*.25)+(Number(docs)*.15)+((touchCount>=2?100:touchCount*50)*.1)+((risk.level==='Stable'?100:risk.level==='Watch'?70:risk.level==='Danger'?35:0)*.05));potential=Math.max(0,Math.min(100,potential))
    let recommendation=bi(lang,'Maintain current allocation and development rhythm','Duy trì nhịp phân lớp và phát triển hiện tại');if(risk.level==='Critical')recommendation=bi(lang,'Immediate escalation; pause sensitive allocation pending review','Nâng mức xử lý ngay; tạm dừng phân lớp nhạy cảm cho đến khi đánh giá xong');else if(risk.level==='Danger')recommendation=bi(lang,'Formal review, retraining and cautious class allocation','Đánh giá chính thức, đào tạo lại và thận trọng khi phân lớp');else if(score&&score<70)recommendation=bi(lang,'Targeted retraining and re-observation before upgrade','Đào tạo lại có mục tiêu và dự giờ lại trước khi xem xét nâng cấp độ');else if(potential>=80)recommendation=bi(lang,'Consider upgrade / higher-complexity class after review','Có thể xem xét nâng cấp độ hoặc lớp phức tạp hơn sau đánh giá');else if(touchCount<2)recommendation=bi(lang,'Schedule a teacher check-in this week','Xếp lịch theo dõi giáo viên trong tuần này');
    return{score,hvr,weeklyCases:weekly,monthlyCases:monthly,risk,touchCount,docs:Number(docs),upgradePotential:potential,recommendation}
  }
  function capabilityData(teacherId){
    const official=data.observations.filter(o=>o.teacher_id===teacherId&&o.observation_type!=='Pop-up Check'&&(Array.isArray(o.criteria_scores)||Number(o.final_score)>0)).slice(0,6)
    const lens=[
      {name:'Preparation & Readiness',idx:[0,1],action:'Maintain reliable preparation and pre-class readiness.'},
      {name:'Teaching Methodology',idx:[2,3,4,5,6,7],action:'Use clear outcomes, ICQs, varied tasks and maximise learner practice.'},
      {name:'Classroom Management',idx:[9,10,11],action:'Keep participation broad, routines clear and learner outcomes visible.'},
      {name:'Learner Engagement',idx:[6,7,9],action:'Increase meaningful learner talk, broad participation and purposeful interaction.'},
      {name:'Assessment & Feedback',idx:[3,11,13],action:'Check understanding, verify outcomes and create a clear next attempt after feedback.'},
      {name:'Differentiation',idx:[12],action:'Use tiered support, scaffolds and challenge options for mixed-ability learners.'},
      {name:'English Use',idx:[8],action:'Keep classroom English accurate, level-appropriate and purposeful.'},
      {name:'Inclusive Learning',idx:[10,13,14],action:'Protect learner dignity, respond to concerns and sustain a safe inclusive environment.'}
    ]
    return lens.map(item=>{
      const series=[]
      official.forEach(o=>{
        const vals=item.idx.map(i=>Number(o.criteria_scores?.[i]?.rating||0)).filter(Boolean)
        if(vals.length)series.push(vals.reduce((a,b)=>a+b,0)/vals.length/4*100);else if(Number(o.final_score)>0)series.push(Number(o.final_score))
      })
      const score=series.length?Math.round(series.reduce((a,b)=>a+b,0)/series.length):0
      const latest=series[0]||0,previous=series.slice(1).length?series.slice(1).reduce((a,b)=>a+b,0)/series.slice(1).length:latest
      const trend=Math.round(latest-previous)
      const evidenceCount=official.reduce((n,o)=>n+item.idx.filter(i=>o.criteria_scores?.[i]?.evidence||o.criteria_scores?.[i]?.rating).length,0)
      const confidence=evidenceCount>=8?'High':evidenceCount>=4?'Medium':'Developing'
      return {...item,score,trend,evidenceCount,confidence}
    })
  }
  function programmeFit(caps){
    const get=n=>caps.find(x=>x.name===n)?.score||0
    const mean=(...v)=>Math.round(v.reduce((a,b)=>a+b,0)/v.length)
    return [
      {name:'E-Genius / General English',score:mean(get('Teaching Methodology'),get('Classroom Management'),get('Learner Engagement')),note:'Methodology · management · engagement'},
      {name:'NextGen IELTS / IELTS',score:mean(get('Teaching Methodology'),get('Assessment & Feedback'),get('English Use')),note:'Methodology · assessment · language use'},
      {name:'E-Plus / Communication',score:mean(get('Learner Engagement'),get('English Use'),get('Inclusive Learning')),note:'Interaction · language use · inclusion'},
      {name:'Mixed-ability / high-complexity groups',score:mean(get('Differentiation'),get('Classroom Management'),get('Assessment & Feedback')),note:'Differentiation · management · feedback'}
    ].sort((a,b)=>b.score-a.score)
  }

}


function AcademicRibbon({lang}){
  const items=[
    {mark:'23',title:bi(lang,'Years of English education','Năm giáo dục tiếng Anh'),sub:bi(lang,'Experience · quality · evolution','Kinh nghiệm · chất lượng · đổi mới')},
    {mark:'CE',title:'Cambridge English',sub:bi(lang,'CEFR progression & exam readiness','Lộ trình CEFR & sẵn sàng cho kỳ thi')},
    {mark:'IELTS',title:'IELTS',sub:bi(lang,'Four skills · feedback · evidence','Bốn kỹ năng · phản hồi · minh chứng')},
    {mark:'360°',title:bi(lang,'Teacher Excellence','Phát triển Giáo viên'),sub:bi(lang,'Observe · coach · recognise','Dự giờ · coaching · ghi nhận')}
  ]
  return <section className="academic-ribbon">{items.map((x,i)=><div className={`academic-badge badge-${i}`} key={x.title}><span>{x.mark}</span><div><b>{x.title}</b><small>{x.sub}</small></div></div>)}</section>
}

function BrandFooter({lang}){
  return <footer className="brand-footer footer-mini">
    <div className="footer-partners-row">
      <div className="footer-partner footer-vmg">
        <img src="/vmg-logo.png" alt="VMG English"/>
        <div><b>VMG</b><small>{bi(lang,'English education · 23 years','Giáo dục tiếng Anh · 23 năm')}</small></div>
      </div>
      <div className="footer-partner">
        <img className="cambridge-mini" src="https://www.cambridgeenglish.org/vn/Images/english-logo.svg" alt="Cambridge English"/>
        <div><b>Cambridge English</b><small>{bi(lang,'Academic pathways','Lộ trình học thuật')}</small></div>
      </div>
      <div className="footer-partner">
        <img className="bc-mini" src="https://ielts.org/cdn/ielts-and-partner-logos/british-council-logo.webp?fit=cover&height=370&s=AQp7mHkWV-U13ahePygWs1-uQIiFpe5s7h8kGmykWNI&width=370" alt="British Council"/>
        <div><b>British Council</b><small>{bi(lang,'IELTS partner ecosystem','Hệ sinh thái đối tác IELTS')}</small></div>
      </div>
      <div className="footer-partner">
        <img className="idp-mini" src="https://ielts.org/cdn/ielts-and-partner-logos/idp-logo.webp?fit=cover&height=370&s=GTtvUtjldt0pzGKdhiVFfBhuxnVVidquPQUTjuQzt7w&width=370" alt="IDP"/>
        <div><b>IDP Education</b><small>{bi(lang,'IELTS partner ecosystem','Hệ sinh thái đối tác IELTS')}</small></div>
      </div>
      <div className="footer-partner footer-ielts-text">
        <span>IELTS</span>
        <div><b>{bi(lang,'Academic focus','Trọng tâm học thuật')}</b><small>{bi(lang,'Four skills · evidence · growth','4 kỹ năng · minh chứng · phát triển')}</small></div>
      </div>
    </div>
    <div className="footer-value-row">
      <div><b>{bi(lang,'ACADEMIC EXCELLENCE','CHẤT LƯỢNG HỌC THUẬT')}</b><span>{bi(lang,'Observe · coach · improve','Dự giờ · coaching · cải tiến')}</span></div>
      <div><b>{bi(lang,'CEFR PROGRESSION','LỘ TRÌNH CEFR')}</b><span>A2 · B1 · B2 · C1</span></div>
      <div><b>{bi(lang,'TEACHER 360','GIÁO VIÊN 360')}</b><span>{bi(lang,'Evidence-based development','Phát triển dựa trên minh chứng')}</span></div>
      <div className="footer-site"><b>VMG ENGLISH</b><span>vmgenglish.edu.vn</span></div>
    </div>
  </footer>
}


function StatTile({icon,label,value,suffix='',note,tone='blue'}){
  return <article className={`stat-tile ${tone}`}><span className="stat-icon">{icon}</span><div><span className="stat-label">{label}</span><b>{value}<small>{suffix}</small></b><p>{note}</p></div></article>
}
function ScoreRing({value=0}){
  const v=Math.max(0,Math.min(100,Number(value)||0))
  return <div className="score-ring" style={{'--score':`${v*3.6}deg`}}><span>{v||'—'}</span></div>
}
function TrendChart({points=[],emptyText='No data'}){
  if(!points.length)return <div className="trend-empty"><span>↗</span><p>{emptyText}</p></div>
  const w=760,h=220,p=28
  const vals=points.map(x=>Number(x.value)||0)
  const min=Math.max(0,Math.min(...vals)-8),max=Math.min(100,Math.max(...vals)+8)
  const span=Math.max(1,max-min)
  const coords=points.map((x,i)=>{
    const px=points.length===1?w/2:p+i*((w-p*2)/(points.length-1))
    const py=h-p-((Number(x.value)-min)/span)*(h-p*2)
    return {x:px,y:py,...x}
  })
  const poly=coords.map(x=>`${x.x},${x.y}`).join(' ')
  const area=`${p},${h-p} ${poly} ${w-p},${h-p}`
  return <div className="trend-chart"><svg viewBox={`0 0 ${w} ${h}`} role="img">
    <defs><linearGradient id="vmgTrendFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="rgba(204,24,55,.26)"/><stop offset="100%" stopColor="rgba(204,24,55,0)"/></linearGradient></defs>
    {[0,1,2,3].map(i=><line key={i} x1={p} x2={w-p} y1={p+i*((h-p*2)/3)} y2={p+i*((h-p*2)/3)} className="trend-grid-line"/>)}
    <polygon points={area} fill="url(#vmgTrendFill)"/>
    <polyline points={poly} className="trend-line"/>
    {coords.map((c,i)=><g key={i}><circle cx={c.x} cy={c.y} r="5" className="trend-dot"/><text x={c.x} y={h-5} textAnchor="middle" className="trend-label">{c.label}</text><text x={c.x} y={Math.max(15,c.y-12)} textAnchor="middle" className="trend-value">{c.value}</text></g>)}
  </svg></div>
}
function MiniBarList({items=[]}){
  return <div className="mini-bar-list">{items.map((x,i)=><div className="mini-bar-row" key={`${x.label}-${i}`}><div><b>{x.label}</b><small>{x.meta}</small></div><div className="mini-bar-track"><i style={{width:`${Math.max(0,Math.min(100,x.value||0))}%`}}/></div><strong>{x.value||'—'}</strong></div>)}</div>
}
function DistributionBars({items=[],total=1}){
  return <div className="distribution-bars">{items.map((x,i)=><div key={x.label}><span>{x.label}</span><div><i style={{width:`${Math.round(x.value/total*100)}%`}} className={`dist-${i}`}/></div><b>{x.value}</b></div>)}</div>
}
function TeacherAttentionCard({item,lang,onOpen}){
  const {teacher,intel}=item
  const tone=intel.risk.level==='Critical'||intel.risk.level==='Danger'?'red':intel.risk.level==='Watch'?'amber':'blue'
  return <button className="attention-teacher" onClick={onOpen}><span className="avatar">{initials(teacher.full_name)}</span><span className="attention-person"><b>{teacher.full_name}</b><small>{teacher.home_centre_code||'VMG'} · {teacher.professional_level||bi(lang,'Level pending','Chưa có level')}</small></span><span className={`attention-signal ${tone}`}><b>{intel.score||'—'}</b><small>{intel.risk.level==='Stable'?bi(lang,'Support follow-up','Theo dõi hỗ trợ'):intel.risk.level}</small></span><span className="attention-next">{intel.recommendation}<i>→</i></span></button>
}
function CentreCompareRow({row,lang}){
  return <div className="centre-compare-row"><span className="centre-name"><b>{row.centre}</b><small>{row.teachers} {bi(lang,'teachers','giáo viên')}</small></span><span><small>{bi(lang,'Observation','Dự giờ')}</small><b>{row.obs||'—'}</b></span><span><small>HVR</small><b>{row.hvr?`${row.hvr}%`:'—'}</b></span><span><small>{bi(lang,'Open cases','Sự vụ mở')}</small><b>{row.cases}</b></span><div className="centre-score-bar"><i style={{width:`${row.obs||0}%`}}/></div></div>
}

function Loading({lang}){return <div className="panel"><div className="empty">{t(lang,'loading')}</div></div>}
function Empty({lang}){return <div className="empty">{t(lang,'noData')}</div>}
function PageIntro({kicker,title,text,actions}){return <div className="page-intro"><div><span className="kicker">{kicker}</span><h2>{title}</h2><p>{text}</p></div>{actions}</div>}
function KpiCard({label,value,note,tone=''}){return <article className={`kpi ${tone}`}><div className="label">{label}</div><strong>{value}</strong><p>{note}</p></article>}
function RiskPill({risk,lang}){return <span className={`pill ${risk.tone==='stable'?'green':risk.tone==='watch'?'amber':'red'}`}>{risk.level==='Stable'?t(lang,'stable'):risk.level==='Watch'?t(lang,'watch'):risk.level==='Danger'?t(lang,'danger'):t(lang,'critical')}</span>}
function RiskRule({tone,title,rule,text}){return <div className={`risk-card ${tone} span${tone==='critical'?3:3}`} style={{gridColumn:'span 3'}}><div className="label">{title}</div><b>{rule}</b><p>{text}</p></div>}
function DocPill({v,lang}){const value=v||'Missing';return <span className={`pill ${value==='Verified'||value==='Complete'?'green':value==='Pending'?'amber':'red'}`}>{dv(lang,value)}</span>}
function KpiWeight({label,value,lang='en'}){return <div className="risk-card stable" style={{gridColumn:'span 4'}}><div className="label">{bi(lang,'CONFIGURABLE WEIGHT','TRỌNG SỐ CÓ THỂ CẤU HÌNH')}</div><b>{value} · {label}</b><p>{bi(lang,'Requires R&D/BOD approval before official use.','Cần R&D/BOD phê duyệt trước khi áp dụng chính thức.')}</p></div>}

const IMPORT_TEMPLATES={
  users:{headers:['full_name','email','temporary_password','role','staff_code','job_title','teacher_code','centre','region','level','language'],sample:['Nguyen Van A','teacher.a@vmg.edu.vn','VMG@2026demo','teacher','NS001','Teacher','GV001','PVT','1','Level 2','en']},
  observations:{headers:['teacher_code','email','observed_at','observation_type','final_score','observer_name','class_name','strengths','improvement_areas','smart_action','verify_by','rating_1','rating_2','rating_3','rating_4','rating_5','rating_6','rating_7','rating_8','rating_9','rating_10','rating_11','rating_12','rating_13','rating_14','rating_15'],sample:['GV001','','2026-08-01 09:00','Full Observation','82.5','Academic Supervisor','EG B1-01','Strong rapport','Increase learner production','Use 2 structured pair-work cycles','2026-09-01','','','','','','','','','','','','','','','']},
  trainings:{headers:['title','training_type','starts_at','ends_at','location','audience','region','centre','reason','description','recap'],sample:['Classroom Management Lab','Classroom Management','2026-09-05 09:00','2026-09-05 11:00','VTS - Training Room','Region 1 teachers','1','','Development plan','Practical workshop on routines and participation','']},
  announcements:{headers:['title_en','title_vi','body_en','body_vi','audience','region','centre','published_at'],sample:['September teacher update','Cập nhật giáo viên tháng 9','Please review the September development calendar.','Vui lòng xem lịch phát triển tháng 9.','All teachers','','','2026-09-01 08:00']}
}
function csvCell(v){const s=String(v??'');return /[",\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s}
async function downloadImportTemplate(kind,format='csv'){const tpl=IMPORT_TEMPLATES[kind];if(format==='xlsx'){const XLSX=await import('xlsx');const ws=XLSX.utils.aoa_to_sheet([tpl.headers,tpl.sample]);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Import');XLSX.writeFile(wb,`VMG_Teacher360_${kind}_template.xlsx`);return}const csv=[tpl.headers,tpl.sample].map(row=>row.map(csvCell).join(',')).join('\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`VMG_Teacher360_${kind}_template.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}
function BulkImportCard({kind,meta,lang,onDone}){
  const [file,setFile]=useState(null),[busy,setBusy]=useState(false),[result,setResult]=useState(null),[error,setError]=useState('')
  async function submit(){if(!file)return;const ok=confirm(bi(lang,`Import ${file.name}? Existing matching records may be updated or skipped.`,`Nhập file ${file.name}? Các bản ghi đã có có thể được cập nhật hoặc bỏ qua nếu trùng.`));if(!ok)return;setBusy(true);setError('');setResult(null);const fd=new FormData();fd.append('kind',kind);fd.append('lang',lang);fd.append('file',file);try{const r=await fetch('/api/admin/import',{method:'POST',body:fd});const out=await r.json();if(!r.ok)throw new Error(out.error||bi(lang,'Import failed','Nhập dữ liệu thất bại'));setResult(out);onDone?.()}catch(e){setError(e.message)}finally{setBusy(false)}}
  return <article className="import-card"><div className="import-card-top"><span className="import-number">{meta.icon}</span><div><span className="import-eyebrow">{t(lang,'bulkImport')}</span><h3>{meta.title}</h3></div></div><p>{meta.text}</p><div className="import-columns"><b>{bi(lang,'Expected columns','Cột dữ liệu')}</b><span>{meta.columns}</span></div><div className="drop-zone"><input aria-label={t(lang,'chooseFile')} type="file" accept=".csv,.xlsx,.xls" onChange={e=>{setFile(e.target.files?.[0]||null);setResult(null);setError('')}}/><span className="drop-icon">⇩</span><b>{file?.name||t(lang,'chooseFile')}</b><small>{bi(lang,'Up to 1,000 rows per import','Tối đa 1.000 dòng mỗi lần')}</small></div><div className="import-actions"><button className="btn secondary" type="button" onClick={()=>downloadImportTemplate(kind,'csv')}>↓ CSV</button><button className="btn secondary" type="button" onClick={()=>downloadImportTemplate(kind,'xlsx')}>↓ Excel</button><button className="btn primary" type="button" disabled={!file||busy} onClick={submit}>{busy?bi(lang,'Importing…','Đang nhập…'):t(lang,'startImport')} →</button></div>{error&&<div className="import-result error"><b>{t(lang,'failed')}</b><span>{error}</span></div>}{result&&<div className="import-result success"><b>{t(lang,'importSummary')}</b><div><span>{t(lang,'created')} <strong>{result.created}</strong></span><span>{t(lang,'updated')} <strong>{result.updated}</strong></span><span>{t(lang,'skipped')} <strong>{result.skipped}</strong></span><span>{t(lang,'failed')} <strong>{result.failed}</strong></span></div>{result.errors?.length>0&&<details><summary>{bi(lang,'Show row errors','Xem lỗi từng dòng')}</summary>{result.errors.map((e,i)=><p key={i}>{bi(lang,'Row','Dòng')} {e.row}: {e.message}</p>)}</details>}</div>}</article>
}
function Modal({title,onClose,children}){return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal"><div className="modal-head"><h3>{title}</h3><button onClick={onClose}>×</button></div><div className="modal-body">{children}</div></div></div>}
function modalTitle(type,lang){const m={incident:'Teacher case',observation:'Official observation',training:'Schedule training','training-request':'Training request',event:'Book catch-up / meeting',kpi:'Record KPI',bulletin:'Publish announcement',user:'Create user account',touchpoint:'Log teacher touchpoint',upgrade:'Upgrade proposal',document:'Teacher document record','document-upload':'Upload my document',avatar:'Profile photo',support:'Support request',recap:'Training recap'};return lang==='vi'?({'incident':'Ghi nhận sự vụ','observation':'Phiếu dự giờ chính thức','training':'Xếp lịch đào tạo','training-request':'Đề xuất đào tạo','event':'Đặt lịch trao đổi / họp','kpi':'Ghi nhận KPI','bulletin':'Đăng thông báo','user':'Tạo tài khoản','touchpoint':'Ghi nhận lượt theo dõi','upgrade':'Đề xuất nâng cấp độ','document':'Cập nhật hồ sơ','document-upload':'Tải hồ sơ của tôi lên',avatar:'Ảnh đại diện','support':'Yêu cầu hỗ trợ','recap':'Tóm tắt đào tạo'}[type]||m[type]):m[type]}

function IncidentForm({teachers,lang,onSave}){const [f,setF]=useState({teacher_id:teachers[0]?.id||'',category:INCIDENT_CATEGORIES[0],severity:'medium',title:'',details:'',action_owner:'',due_date:''});const[file,setFile]=useState(null);return <form onSubmit={e=>{e.preventDefault();onSave(f,file)}}><div className="form-grid two"><Field label={bi(lang,'Teacher','Giáo viên')}><select value={f.teacher_id} onChange={e=>setF({...f,teacher_id:e.target.value})}>{teachers.map(x=><option key={x.id} value={x.id}>{x.full_name} · {x.home_centre_code}</option>)}</select></Field><Field label={t(lang,'category')}><select value={f.category} onChange={e=>setF({...f,category:e.target.value})}>{INCIDENT_CATEGORIES.map(x=><option key={x} value={x}>{incidentLabel(lang,x)}</option>)}</select></Field><Field label={t(lang,'severity')}><select value={f.severity} onChange={e=>setF({...f,severity:e.target.value})}><option value="low">{bi(lang,'Low','Thấp')}</option><option value="medium">{bi(lang,'Medium','Trung bình')}</option><option value="high">{bi(lang,'High','Cao')}</option><option value="critical">{bi(lang,'Critical','Khẩn cấp')}</option></select></Field><Field label={bi(lang,'Action owner','Người phụ trách')}><input value={f.action_owner} onChange={e=>setF({...f,action_owner:e.target.value})}/></Field></div><div className="form-grid" style={{marginTop:12}}><Field label={bi(lang,'Case title','Tiêu đề sự vụ')}><input required value={f.title} onChange={e=>setF({...f,title:e.target.value})}/></Field><Field label={t(lang,'details')}><textarea required value={f.details} onChange={e=>setF({...f,details:e.target.value})}/></Field><Field label={t(lang,'uploadEvidence')}><input type="file" onChange={e=>setFile(e.target.files?.[0]||null)}/></Field></div><FormActions lang={lang}/></form>}

function ObservationForm({teachers,defaultTeacher,lang,onSave}){const [f,setF]=useState({teacher_id:defaultTeacher?.id||teachers[0]?.id||'',observed_at:new Date().toISOString().slice(0,16),observation_type:'Full Observation',purpose:'Annual / quality observation',class_name:'',strengths:'',improvement_areas:'',teacher_reflection:'',smart_action:'',verify_by:'',ratings:OBSERVATION_RUBRIC.map(()=>3),evidence:OBSERVATION_RUBRIC.map(()=>'' )});const final=f.ratings.reduce((a,r,i)=>a+r/4*OBSERVATION_RUBRIC[i].weight,0);const domains=[...new Set(OBSERVATION_RUBRIC.map(x=>x.domain))];return <form onSubmit={e=>{e.preventDefault();onSave(f)}}><div className="obs-banner"><div><span className="kicker">{t(lang,'officialRecord').toUpperCase()}</span><h2>{dv(lang,f.observation_type)}</h2><p>{bi(lang,'Evidence-led · 1–4 rating · record within 24h · feedback within 48h','Dựa trên bằng chứng · thang 1–4 · ghi nhận trong 24 giờ · phản hồi trong 48 giờ')}</p></div><div className="score-orbit"><b>{final.toFixed(1)}</b><span>{bandLabel(lang,final)}</span></div></div><div className="form-card" style={{borderRadius:'0 0 9px 9px'}}><div className="form-grid four"><Field label={bi(lang,'Teacher','Giáo viên')}><select value={f.teacher_id} onChange={e=>setF({...f,teacher_id:e.target.value})}>{teachers.map(x=><option key={x.id} value={x.id}>{x.full_name}</option>)}</select></Field><Field label={bi(lang,'Observed at','Thời gian dự giờ')}><input type="datetime-local" value={f.observed_at} onChange={e=>setF({...f,observed_at:e.target.value})}/></Field><Field label={bi(lang,'Type','Loại dự giờ')}><select value={f.observation_type} onChange={e=>setF({...f,observation_type:e.target.value})}><option value="Full Observation">{dv(lang,'Full Observation')}</option><option value="Re-observation">{dv(lang,'Re-observation')}</option></select></Field><Field label={t(lang,'purpose')}><input value={f.purpose} onChange={e=>setF({...f,purpose:e.target.value})}/></Field><Field label={bi(lang,'Class','Lớp')}><input value={f.class_name} onChange={e=>setF({...f,class_name:e.target.value})}/></Field></div></div>{domains.map(domain=>{const domainRows=OBSERVATION_RUBRIC.map((r,i)=>({...r,i})).filter(r=>r.domain===domain);const domainLabel=lang==='vi'?(domainRows[0]?.domain_vi||domain):domain;return <div className="rubric-section" key={domain}><div className="rubric-head"><div><span>{domainLabel.toUpperCase()}</span><b>{domainLabel}</b></div><b>{domainRows.reduce((a,x)=>a+x.weight,0)}%</b></div>{domainRows.map((r,j)=><div className="rubric-row" key={r.i}><div className="criterion-no">{j+1}</div><div className="criterion"><b>{lang==='vi'?r.criterion_vi:r.criterion}</b><small>{bi(lang,`Weight ${r.weight}% · Evidence required`,`Trọng số ${r.weight}% · Cần bằng chứng`)}</small></div><div className="rating">{[1,2,3,4].map(n=><button type="button" key={n} className={f.ratings[r.i]===n?'active':''} onClick={()=>{const v=[...f.ratings];v[r.i]=n;setF({...f,ratings:v})}}>{n}</button>)}</div><div className="evidence"><input placeholder={t(lang,'evidence')} value={f.evidence[r.i]} onChange={e=>{const v=[...f.evidence];v[r.i]=e.target.value;setF({...f,evidence:v})}}/></div><div className="weighted">{(f.ratings[r.i]/4*r.weight).toFixed(1)}</div></div>)}</div>})}<div className="form-card"><div className="form-grid two"><Field label={t(lang,'strengths')}><textarea value={f.strengths} onChange={e=>setF({...f,strengths:e.target.value})}/></Field><Field label={t(lang,'improvement')}><textarea value={f.improvement_areas} onChange={e=>setF({...f,improvement_areas:e.target.value})}/></Field><Field label={t(lang,'teacherReflection')}><textarea value={f.teacher_reflection} onChange={e=>setF({...f,teacher_reflection:e.target.value})}/></Field><Field label={t(lang,'smartAction')}><textarea value={f.smart_action} onChange={e=>setF({...f,smart_action:e.target.value})}/></Field><Field label={t(lang,'verifyBy')}><input type="date" value={f.verify_by} onChange={e=>setF({...f,verify_by:e.target.value})}/></Field></div></div><div className="review-bar"><div><b>{final.toFixed(1)}% · {bandLabel(lang,final)}</b><p>{bi(lang,'This becomes part of the teacher growth profile and creates a follow-up record.','Kết quả này được lưu vào hồ sơ phát triển và tạo một mốc theo dõi cho giáo viên.')}</p></div><button className="btn primary">{t(lang,'save')} →</button></div></form>}

function TrainingForm({lang,onSave}){const [file,setFile]=useState(null);const [f,setF]=useState({title:'',training_type:'Methodology',reason:'',starts_at:'',ends_at:'',location:'',audience_label:'Targeted teachers',target_region_no:'',description:'',recap_text:''});const types=['Retraining','Upgrade Training','Methodology','Classroom Management','Compliance','Product / Programme'];return <form onSubmit={e=>{e.preventDefault();onSave({...f,target_region_no:f.target_region_no?Number(f.target_region_no):null},file)}}><div className="form-grid two"><Field label={bi(lang,'Training title','Tên buổi đào tạo')}><input required value={f.title} onChange={e=>setF({...f,title:e.target.value})}/></Field><Field label={bi(lang,'Type','Loại')}><select value={f.training_type} onChange={e=>setF({...f,training_type:e.target.value})}>{types.map(x=><option key={x} value={x}>{dv(lang,x)}</option>)}</select></Field><Field label={bi(lang,'Starts','Bắt đầu')}><input required type="datetime-local" value={f.starts_at} onChange={e=>setF({...f,starts_at:e.target.value})}/></Field><Field label={bi(lang,'Ends','Kết thúc')}><input required type="datetime-local" value={f.ends_at} onChange={e=>setF({...f,ends_at:e.target.value})}/></Field><Field label={bi(lang,'Location','Địa điểm')}><input value={f.location} onChange={e=>setF({...f,location:e.target.value})}/></Field><Field label={t(lang,'region')}><select value={f.target_region_no} onChange={e=>setF({...f,target_region_no:e.target.value})}><option value="">{bi(lang,'All / selected','Tất cả / nhóm chọn')}</option><option value="1">{bi(lang,'Region','Khu vực')} 1</option><option value="2">{bi(lang,'Region','Khu vực')} 2</option><option value="3">{bi(lang,'Region','Khu vực')} 3</option></select></Field><Field label={bi(lang,'Audience','Đối tượng')}><input value={f.audience_label} onChange={e=>setF({...f,audience_label:e.target.value})}/></Field><Field label={bi(lang,'Reason','Lý do / mục tiêu')}><input value={f.reason} onChange={e=>setF({...f,reason:e.target.value})}/></Field><Field label={bi(lang,'Slides / materials','Slide / học liệu')}><input type="file" onChange={e=>setFile(e.target.files?.[0]||null)}/></Field></div><div className="form-grid two" style={{marginTop:12}}><Field label={bi(lang,'Description','Mô tả')}><textarea value={f.description} onChange={e=>setF({...f,description:e.target.value})}/></Field><Field label={bi(lang,'Recap (optional)','Tóm tắt (không bắt buộc)')}><textarea value={f.recap_text} onChange={e=>setF({...f,recap_text:e.target.value})}/></Field></div><FormActions lang={lang}/></form>}

function TrainingRequestForm({teachers,lang,onSave}){const [f,setF]=useState({teacher_id:teachers[0]?.id||'',category:'Retraining',reason:'',priority:'normal'});const cats=['Retraining','Upgrade Training','Methodology','Classroom Management','Academic Accuracy','Learner Care','Other'];return <form onSubmit={e=>{e.preventDefault();onSave(f)}}><div className="form-grid two"><Field label={bi(lang,'Teacher','Giáo viên')}><select value={f.teacher_id} onChange={e=>setF({...f,teacher_id:e.target.value})}>{teachers.map(x=><option key={x.id} value={x.id}>{x.full_name}</option>)}</select></Field><Field label={bi(lang,'Training category','Nhóm đào tạo')}><select value={f.category} onChange={e=>setF({...f,category:e.target.value})}>{cats.map(x=><option key={x} value={x}>{dv(lang,x)}</option>)}</select></Field><Field label={bi(lang,'Priority','Mức ưu tiên')}><select value={f.priority} onChange={e=>setF({...f,priority:e.target.value})}><option value="normal">{bi(lang,'Normal','Bình thường')}</option><option value="high">{bi(lang,'High','Cao')}</option><option value="urgent">{bi(lang,'Urgent','Khẩn')}</option></select></Field></div><div style={{marginTop:12}}><Field label={bi(lang,'Reason / evidence','Lý do / bằng chứng')}><textarea required value={f.reason} onChange={e=>setF({...f,reason:e.target.value})}/></Field></div><FormActions lang={lang}/></form>}

function EventForm({teachers,lang,onSave}){const [f,setF]=useState({teacher_id:teachers[0]?.id||'',title:'',event_type:'Catch-up',starts_at:'',ends_at:'',location:'',notes:''});const types=['Catch-up','Retraining','Teacher Meeting','Performance Meeting','Other'];return <form onSubmit={e=>{e.preventDefault();onSave(f)}}><div className="form-grid two"><Field label={bi(lang,'Teacher','Giáo viên')}><select value={f.teacher_id} onChange={e=>setF({...f,teacher_id:e.target.value})}>{teachers.map(x=><option key={x.id} value={x.id}>{x.full_name}</option>)}</select></Field><Field label={bi(lang,'Event type','Loại lịch')}><select value={f.event_type} onChange={e=>setF({...f,event_type:e.target.value})}>{types.map(x=><option key={x} value={x}>{dv(lang,x)}</option>)}</select></Field><Field label={bi(lang,'Title','Tiêu đề')}><input required value={f.title} onChange={e=>setF({...f,title:e.target.value})}/></Field><Field label={bi(lang,'Starts','Bắt đầu')}><input required type="datetime-local" value={f.starts_at} onChange={e=>setF({...f,starts_at:e.target.value})}/></Field><Field label={bi(lang,'Ends','Kết thúc')}><input type="datetime-local" value={f.ends_at} onChange={e=>setF({...f,ends_at:e.target.value})}/></Field><Field label={bi(lang,'Location','Địa điểm')}><input value={f.location} onChange={e=>setF({...f,location:e.target.value})}/></Field></div><div style={{marginTop:12}}><Field label={bi(lang,'Notes','Ghi chú')}><textarea value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/></Field></div><FormActions lang={lang}/></form>}

function KpiForm({teachers,lang,onSave}){const first=new Date();const start=new Date(first.getFullYear(),first.getMonth(),1).toISOString().slice(0,10),end=new Date(first.getFullYear(),first.getMonth()+1,0).toISOString().slice(0,10);const [f,setF]=useState({teacher_id:teachers[0]?.id||'',period_start:start,period_end:end,observation_score:'',hvr_pct:'',revenue_contribution:''});return <form onSubmit={e=>{e.preventDefault();onSave(f)}}><div className="form-grid two"><Field label={bi(lang,'Teacher','Giáo viên')}><select value={f.teacher_id} onChange={e=>setF({...f,teacher_id:e.target.value})}>{teachers.map(x=><option key={x.id} value={x.id}>{x.full_name}</option>)}</select></Field><Field label={bi(lang,'Observation score','Điểm dự giờ')}><input type="number" min="0" max="100" step="0.1" value={f.observation_score} onChange={e=>setF({...f,observation_score:e.target.value})}/></Field><Field label="HVR %"><input type="number" min="0" max="100" step="0.1" value={f.hvr_pct} onChange={e=>setF({...f,hvr_pct:e.target.value})}/></Field><Field label={bi(lang,'Revenue contribution (VND)','Doanh thu đóng góp (VND)')}><input type="number" min="0" value={f.revenue_contribution} onChange={e=>setF({...f,revenue_contribution:e.target.value})}/></Field><Field label={bi(lang,'Period start','Bắt đầu kỳ')}><input type="date" value={f.period_start} onChange={e=>setF({...f,period_start:e.target.value})}/></Field><Field label={bi(lang,'Period end','Kết thúc kỳ')}><input type="date" value={f.period_end} onChange={e=>setF({...f,period_end:e.target.value})}/></Field></div><div className="friendly-note" style={{margin:'13px 0 0'}}><b>{bi(lang,'Current configurable weighting','Trọng số hiện tại có thể cấu hình')}</b><p>{bi(lang,'Observation 50% · HVR 30% · Revenue contribution 20%. R&D/BOD approval is required before these weights become official policy.','Dự giờ 50% · HVR 30% · Doanh thu đóng góp 20%. Cần R&D/BOD phê duyệt trước khi dùng như chính sách chính thức.')}</p></div><FormActions lang={lang}/></form>}

function BulletinForm({lang,onSave}){const [f,setF]=useState({title_en:'',title_vi:'',body_en:'',body_vi:'',audience:'All teachers'});return <form onSubmit={e=>{e.preventDefault();onSave(f)}}><div className="form-grid two"><Field label={bi(lang,'English title','Tiêu đề tiếng Anh')}><input required value={f.title_en} onChange={e=>setF({...f,title_en:e.target.value})}/></Field><Field label={bi(lang,'Vietnamese title','Tiêu đề tiếng Việt')}><input value={f.title_vi} onChange={e=>setF({...f,title_vi:e.target.value})}/></Field><Field label={bi(lang,'English content','Nội dung tiếng Anh')}><textarea required value={f.body_en} onChange={e=>setF({...f,body_en:e.target.value})}/></Field><Field label={bi(lang,'Vietnamese content','Nội dung tiếng Việt')}><textarea value={f.body_vi} onChange={e=>setF({...f,body_vi:e.target.value})}/></Field><Field label={bi(lang,'Audience','Đối tượng')}><input value={f.audience} onChange={e=>setF({...f,audience:e.target.value})}/></Field></div><FormActions lang={lang}/></form>}

function UserForm({lang,onSave}){
  const initial={email:'',password:'',full_name:'',role:'teacher',staff_code:'',job_title:'',teacher_code:'',home_centre_code:'PVT',region_no:1,professional_level:'',language_preference:'en'}
  const [f,setF]=useState(initial)
  const teacher=f.role==='teacher'
  const centreScoped=CENTRE_SCOPE_ROLES.includes(f.role)
  const regionScoped=REGION_SCOPE_ROLES.includes(f.role)
  const headOffice=HEAD_OFFICE_ROLES.includes(f.role)
  const scopeLabel=headOffice
    ? bi(lang,'Head Office · all regions / centres','Hội sở · toàn bộ khu vực / trung tâm')
    : regionScoped
      ? `${bi(lang,'Region','Khu vực')} ${f.region_no||'—'}`
      : centreScoped
        ? `${f.home_centre_code||'—'} · ${bi(lang,'Region','Khu vực')} ${f.region_no||'—'}`
        : `${f.home_centre_code||'—'} · ${bi(lang,'Region','Khu vực')} ${f.region_no||'—'}`
  function setRole(role){
    if(HEAD_OFFICE_ROLES.includes(role))setF({...f,role,region_no:'',home_centre_code:'',teacher_code:'',professional_level:''})
    else if(REGION_SCOPE_ROLES.includes(role))setF({...f,role,region_no:1,home_centre_code:'',teacher_code:'',professional_level:''})
    else setF({...f,role,region_no:1,home_centre_code:'PVT',teacher_code:role==='teacher'?f.teacher_code:'',professional_level:role==='teacher'?f.professional_level:''})
  }
  function setCentre(c){const region=Number(Object.entries(REGION_CENTRES).find(([,xs])=>xs.includes(c))?.[0]||1);setF({...f,home_centre_code:c,region_no:region})}
  function submit(e){
    e.preventDefault()
    const payload={...f,region_no:f.region_no?Number(f.region_no):null,home_centre_code:f.home_centre_code||null,teacher_code:teacher?(f.teacher_code||null):null,professional_level:teacher?(f.professional_level||null):null}
    onSave(payload)
  }
  return <form onSubmit={submit}>
    <div className="account-scope-banner"><div><span>{bi(lang,'ACCESS DESIGN','THIẾT KẾ PHẠM VI')}</span><b>{scopeLabel}</b><p>{teacher?bi(lang,'Teacher sees only their own portfolio and assigned learning space.','Giáo viên chỉ xem hồ sơ của mình và không gian học tập được phân công.'):centreScoped?bi(lang,'Centre leadership sees teachers, performance and cases for the assigned centre only.','Quản lý trung tâm xem giáo viên, hiệu suất và sự vụ của trung tâm được phân công.'):regionScoped?bi(lang,'Regional leadership sees all centres in the assigned region; no centre assignment is required.','Giám đốc Khu vực xem toàn bộ trung tâm trong khu vực được phân công; không cần chọn trung tâm.'):bi(lang,'Head Office roles work across the system; region and centre are intentionally not assigned.','Vai trò Hội sở làm việc trên toàn hệ thống; không cần gán khu vực hay trung tâm.')}</p></div><span className="scope-badge">{teacher?'SELF':centreScoped?'CENTRE':regionScoped?'REGION':'HO'}</span></div>
    <div className="form-section-title">{bi(lang,'Account identity','Thông tin tài khoản')}</div>
    <div className="form-grid two">
      <Field label={t(lang,'fullName')}><input required value={f.full_name} onChange={e=>setF({...f,full_name:e.target.value})}/></Field>
      <Field label={t(lang,'email')}><input required type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></Field>
      <Field label={t(lang,'temporaryPassword')}><div className="password-field"><input required type="text" minLength="8" value={f.password} onChange={e=>setF({...f,password:e.target.value})}/><button type="button" onClick={()=>setF({...f,password:`VMG!${Math.random().toString(36).slice(2,8)}${Math.floor(10+Math.random()*89)}`})}>{bi(lang,'Generate','Tạo nhanh')}</button></div></Field>
      <Field label={t(lang,'role')}><select value={f.role} onChange={e=>setRole(e.target.value)}>{Object.entries(ROLE_LABELS).map(([k,v])=><option key={k} value={k}>{v[lang]||v.en}</option>)}</select></Field>
      <Field label={bi(lang,'Staff / employee code','Mã nhân sự')}><input value={f.staff_code} onChange={e=>setF({...f,staff_code:e.target.value})} placeholder={bi(lang,'Optional internal ID','Mã nội bộ nếu có')}/></Field>
      <Field label={bi(lang,'Job title','Chức danh')}><input value={f.job_title} onChange={e=>setF({...f,job_title:e.target.value})} placeholder={ROLE_LABELS[f.role]?.[lang]||''}/></Field>
      <Field label={t(lang,'language')}><select value={f.language_preference} onChange={e=>setF({...f,language_preference:e.target.value})}><option value="en">English</option><option value="vi">Tiếng Việt</option></select></Field>
    </div>

    {teacher&&<><div className="form-section-title">{bi(lang,'Teacher profile','Hồ sơ giáo viên')}</div><div className="form-grid two">
      <Field label={t(lang,'teacherCode')}><input required value={f.teacher_code} onChange={e=>setF({...f,teacher_code:e.target.value})}/></Field>
      <Field label={t(lang,'level')}><input value={f.professional_level} onChange={e=>setF({...f,professional_level:e.target.value})} placeholder={bi(lang,'e.g. Level 2 / Senior','VD: Level 2 / Senior')}/></Field>
      <Field label={t(lang,'region')}><select value={f.region_no} onChange={e=>{const r=Number(e.target.value);setF({...f,region_no:r,home_centre_code:REGION_CENTRES[r][0]})}}>{[1,2,3].map(r=><option key={r} value={r}>{bi(lang,'Region','Khu vực')} {r}</option>)}</select></Field>
      <Field label={t(lang,'centre')}><select value={f.home_centre_code} onChange={e=>setCentre(e.target.value)}>{REGION_CENTRES[f.region_no||1].map(c=><option key={c}>{c}</option>)}</select></Field>
    </div></>}

    {centreScoped&&<><div className="form-section-title">{bi(lang,'Centre scope','Phạm vi trung tâm')}</div><div className="form-grid two">
      <Field label={t(lang,'centre')}><select required value={f.home_centre_code} onChange={e=>setCentre(e.target.value)}>{Object.values(REGION_CENTRES).flat().map(c=><option key={c}>{c}</option>)}</select></Field>
      <Field label={t(lang,'region')}><input readOnly value={`${bi(lang,'Region','Khu vực')} ${f.region_no||'—'}`}/></Field>
    </div></>}

    {regionScoped&&<><div className="form-section-title">{bi(lang,'Regional scope','Phạm vi khu vực')}</div><div className="form-grid two">
      <Field label={t(lang,'region')}><select required value={f.region_no} onChange={e=>setF({...f,region_no:Number(e.target.value),home_centre_code:''})}>{[1,2,3].map(r=><option key={r} value={r}>{bi(lang,'Region','Khu vực')} {r}</option>)}</select></Field>
      <Field label={bi(lang,'Centre assignment','Gán trung tâm')}><input readOnly value={bi(lang,'Not required for Regional Director','Không áp dụng cho Giám đốc Khu vực')}/></Field>
    </div></>}

    {headOffice&&<div className="friendly-note" style={{margin:'14px 0 0'}}><b>{bi(lang,'Head Office scope','Phạm vi Hội sở')}</b><p>{bi(lang,'This role is intentionally created without region or centre. Dashboard filters provide Region 1–3 and centre comparisons when needed.','Vai trò này được tạo không gán khu vực hoặc trung tâm. Khi cần phân tích, dashboard có bộ lọc Khu vực 1–3 và trung tâm.')}</p></div>}
    <div className="friendly-note" style={{margin:'13px 0 0'}}><b>{bi(lang,'Bulk onboarding','Tạo tài khoản hàng loạt')}</b><p>{bi(lang,'For a whole centre, region or teacher cohort, use CSV / Excel import. The same role-based scope rules are applied automatically.','Khi tạo cả trung tâm, khu vực hoặc nhóm giáo viên, hãy dùng CSV / Excel. Hệ thống tự áp dụng cùng quy tắc phạm vi theo vai trò.')}</p></div>
    <FormActions lang={lang}/>
  </form>
}

function TouchpointForm({teachers,defaultTeacher,lang,onSave}){const [f,setF]=useState({teacher_id:defaultTeacher?.id||teachers[0]?.id||'',touch_date:nowDate(),touch_type:'Feedback / coaching',notes:''});const types=['Observation','Feedback / coaching','Catch-up meeting','Retraining follow-up','Performance conversation'];return <form onSubmit={e=>{e.preventDefault();onSave(f)}}><div className="form-grid two"><Field label={bi(lang,'Teacher','Giáo viên')}><select value={f.teacher_id} onChange={e=>setF({...f,teacher_id:e.target.value})}>{teachers.map(x=><option key={x.id} value={x.id}>{x.full_name}</option>)}</select></Field><Field label={bi(lang,'Date','Ngày')}><input type="date" value={f.touch_date} onChange={e=>setF({...f,touch_date:e.target.value})}/></Field><Field label={bi(lang,'Check-in type','Loại theo dõi')}><select value={f.touch_type} onChange={e=>setF({...f,touch_type:e.target.value})}>{types.map(x=><option key={x} value={x}>{dv(lang,x)}</option>)}</select></Field></div><div style={{marginTop:12}}><Field label={bi(lang,'Notes / evidence','Ghi chú / bằng chứng')}><textarea value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/></Field></div><FormActions lang={lang}/></form>}

function UpgradeForm({teacher,lang,onSave}){const [f,setF]=useState({teacher_id:teacher.id,current_level:teacher.professional_level||'',proposed_level:'',rationale:'',evidence_summary:''});return <form onSubmit={e=>{e.preventDefault();onSave(f)}}><div className="form-grid two"><Field label={bi(lang,'Teacher','Giáo viên')}><input value={teacher.full_name} readOnly/></Field><Field label={bi(lang,'Current level','Cấp độ hiện tại')}><input value={f.current_level} readOnly/></Field><Field label={bi(lang,'Proposed level','Cấp độ đề xuất')}><input required value={f.proposed_level} onChange={e=>setF({...f,proposed_level:e.target.value})}/></Field></div><div className="form-grid two" style={{marginTop:12}}><Field label={bi(lang,'Rationale','Lý do đề xuất')}><textarea required value={f.rationale} onChange={e=>setF({...f,rationale:e.target.value})}/></Field><Field label={bi(lang,'Evidence summary','Tóm tắt bằng chứng')}><textarea required value={f.evidence_summary} onChange={e=>setF({...f,evidence_summary:e.target.value})}/></Field></div><FormActions lang={lang}/></form>}

function DocumentForm({teachers,lang,onSave}){const [file,setFile]=useState(null);const [f,setF]=useState({teacher_id:teachers[0]?.id||'',degree_status:'Missing',tesol_status:'Missing',english_status:'Missing',native_proof_status:'N/A',promised_submission_date:'',completion_pct:0,document_type:'degree'});return <form onSubmit={e=>{e.preventDefault();onSave(f,file)}}><div className="form-grid two"><Field label={bi(lang,'Teacher','Giáo viên')}><select value={f.teacher_id} onChange={e=>setF({...f,teacher_id:e.target.value})}>{teachers.map(x=><option key={x.id} value={x.id}>{x.full_name}</option>)}</select></Field><Field label={t(lang,'degree')}><StatusSelect lang={lang} value={f.degree_status} onChange={v=>setF({...f,degree_status:v})}/></Field><Field label={t(lang,'tesol')}><StatusSelect lang={lang} value={f.tesol_status} onChange={v=>setF({...f,tesol_status:v})}/></Field><Field label={bi(lang,'English qualification','Chứng chỉ tiếng Anh')}><StatusSelect lang={lang} value={f.english_status} onChange={v=>setF({...f,english_status:v})}/></Field><Field label={bi(lang,'Native proof','Minh chứng bản ngữ')}><StatusSelect lang={lang} value={f.native_proof_status} onChange={v=>setF({...f,native_proof_status:v})} allowNA/></Field><Field label={t(lang,'promisedDate')}><input type="date" value={f.promised_submission_date} onChange={e=>setF({...f,promised_submission_date:e.target.value})}/></Field><Field label={bi(lang,'Completion %','Hoàn thiện %')}><input type="number" min="0" max="100" value={f.completion_pct} onChange={e=>setF({...f,completion_pct:e.target.value})}/></Field><Field label={bi(lang,'Document type','Loại hồ sơ')}><select value={f.document_type} onChange={e=>setF({...f,document_type:e.target.value})}><option value="degree">{bi(lang,'Degree','Bằng đại học')}</option><option value="tesol">TESOL / {bi(lang,'pedagogy','nghiệp vụ sư phạm')}</option><option value="english">{bi(lang,'English qualification','Chứng chỉ tiếng Anh')}</option><option value="native-proof">{bi(lang,'Native proof','Minh chứng bản ngữ')}</option><option value="other">{bi(lang,'Other','Khác')}</option></select></Field><Field label={bi(lang,'Document file','File hồ sơ')}><input type="file" onChange={e=>setFile(e.target.files?.[0]||null)}/></Field></div><FormActions lang={lang}/></form>}


function TeacherDocumentUploadForm({lang,onSave}){const[file,setFile]=useState(null);const[f,setF]=useState({document_type:'Degree / University qualification',note:''});const types=['Degree / University qualification','TESOL / Teaching qualification','English qualification','Native-language / nationality proof','Employment / Contract document','Identity / Personal document','Other'];return <form onSubmit={e=>{e.preventDefault();onSave(f,file)}}><div className="upload-drop"><span>⇧</span><b>{bi(lang,'Send documents directly to HR','Gửi hồ sơ trực tiếp đến PTNS')}</b><p>{bi(lang,'PDF, image or office document · maximum 15 MB. HR receives an in-app alert automatically.','PDF, hình ảnh hoặc file văn phòng · tối đa 15 MB. PTNS nhận thông báo trên hệ thống tự động.')}</p><input type="file" required onChange={e=>setFile(e.target.files?.[0]||null)}/></div><div className="form-grid" style={{marginTop:14}}><Field label={bi(lang,'Document type','Loại hồ sơ')}><select value={f.document_type} onChange={e=>setF({...f,document_type:e.target.value})}>{types.map(x=><option key={x}>{x}</option>)}</select></Field><Field label={bi(lang,'Note for HR','Ghi chú cho PTNS')}><textarea value={f.note} onChange={e=>setF({...f,note:e.target.value})} placeholder={bi(lang,'Optional context about this file...','Có thể ghi chú thêm về hồ sơ này...')}/></Field></div><FormActions lang={lang}/></form>}

function AvatarUploadForm({user,lang,onSave}){const[file,setFile]=useState(null);return <form onSubmit={e=>{e.preventDefault();onSave(file)}}><div className="avatar-upload-card"><AvatarPic user={user} className="avatar-preview"/><div><b>{bi(lang,'Make the workspace feel like yours','Thêm dấu ấn cá nhân vào không gian làm việc')}</b><p>{bi(lang,'Use a clear headshot. JPG, PNG or WebP, maximum 5 MB.','Dùng ảnh chân dung rõ nét. JPG, PNG hoặc WebP, tối đa 5 MB.')}</p></div></div><Field label={bi(lang,'Profile photo','Ảnh đại diện')}><input type="file" accept="image/*" required onChange={e=>setFile(e.target.files?.[0]||null)}/></Field><FormActions lang={lang}/></form>}

function SupportForm({teacher,lang,onSave}){const [f,setF]=useState({teacher_id:teacher?.id||'',category:'Academic / Methodology',subject:'',details:'',routed_to:'Academic Supervisor / R&D'});const route={ 'Academic / Methodology':'Academic Supervisor / R&D','Resource / Broken link':'R&D','Schedule / Centre coordination':'CMO / Centre Director','Learner / Service':'CSR','Documents / Certificates':'PTNS','Other':'R&D' };const labels={'Academic / Methodology':bi(lang,'Academic / Methodology','Học thuật / Phương pháp'),'Resource / Broken link':bi(lang,'Resource / Broken link','Học liệu / Link lỗi'),'Schedule / Centre coordination':bi(lang,'Schedule / Centre coordination','Lịch / Phối hợp trung tâm'),'Learner / Service':bi(lang,'Learner / Service','Học viên / Dịch vụ'),'Documents / Certificates':bi(lang,'Documents / Certificates','Hồ sơ / Chứng từ'),'Other':bi(lang,'Other','Khác')};return <form onSubmit={e=>{e.preventDefault();onSave(f)}}><div className="form-grid two"><Field label={bi(lang,'Teacher','Giáo viên')}><input value={teacher?.full_name||''} readOnly/></Field><Field label={t(lang,'category')}><select value={f.category} onChange={e=>{const category=e.target.value;setF({...f,category,routed_to:route[category]})}}>{Object.keys(route).map(x=><option key={x} value={x}>{labels[x]}</option>)}</select></Field><Field label={bi(lang,'Subject','Tiêu đề')}><input required value={f.subject} onChange={e=>setF({...f,subject:e.target.value})}/></Field><Field label={bi(lang,'Route to','Chuyển đến')}><input value={f.routed_to} readOnly/></Field></div><div style={{marginTop:12}}><Field label={bi(lang,'Details / context','Chi tiết / ngữ cảnh')}><textarea required value={f.details} onChange={e=>setF({...f,details:e.target.value})}/></Field></div><FormActions lang={lang}/></form>}


function AvatarPic({user,className='avatar'}){const src=user?.avatar_signed_url||user?.avatar_url;return <span className={className}>{src?<img src={src} alt={user?.full_name||''}/>:initials(user?.full_name)}</span>}
function DashboardAnnouncements({items,lang,onOpen}){if(!items?.length)return null;return <section className="dashboard-announcements"><div className="dashboard-announcements-title"><span>{bi(lang,'IMPORTANT UPDATES','CẬP NHẬT QUAN TRỌNG')}</span><h3>{bi(lang,'What you should know this week','Điều bạn nên biết trong tuần')}</h3><button className="mini-link" onClick={onOpen}>{bi(lang,'Open bulletin board','Mở bảng tin')} →</button></div><div className="dashboard-announcement-row">{items.map((a,i)=><article key={a.id} className={`dashboard-announcement tone-${i}`}><i>{i===0?'★':'•'}</i><div><b>{lang==='vi'&&a.title_vi?a.title_vi:a.title_en||a.title}</b><p>{lang==='vi'&&a.body_vi?a.body_vi:a.body_en||a.body}</p><small>{fmt(a.published_at,lang)} · {a.author_name||'VMG'}</small></div></article>)}</div></section>}

function StatusSelect({value,onChange,allowNA,lang}){return <select value={value} onChange={e=>onChange(e.target.value)}>{allowNA&&<option value="N/A">N/A</option>}<option value="Missing">{dv(lang,'Missing')}</option><option value="Pending">{dv(lang,'Pending')}</option><option value="Verified">{dv(lang,'Verified')}</option></select>}
function Field({label,children}){return <label className="field"><span>{label}</span>{children}</label>}
function FormActions({lang}){return <div style={{display:'flex',justifyContent:'flex-end',marginTop:17}}><button className="btn primary">{t(lang,'save')} →</button></div>}
