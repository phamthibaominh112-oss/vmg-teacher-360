import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { OBSERVATION_RUBRIC, REGION_CENTRES } from '@/lib/config'

export const runtime = 'nodejs'
export const maxDuration = 60

const IMPORT_PERMISSIONS={
  users:['rnd','bod'],
  observations:['academic_supervisor','rnd','bod'],
  trainings:['academic_supervisor','ptns','rnd','bod'],
  announcements:['ptns','rnd','bod']
}

const ROLE_ALIASES={
  teacher:'teacher',gv:'teacher','giáo viên':'teacher',
  cmo:'cmo',qltt:'cmo','centre management officer':'cmo',
  centre_director:'centre_director','centre director':'centre_director',gdtt:'centre_director','gđtt':'centre_director','giám đốc trung tâm':'centre_director',
  csr:'csr','p. csr':'csr',rnd:'rnd','r&d':'rnd',bod:'bod',
  academic_supervisor:'academic_supervisor','academic supervisor':'academic_supervisor',as:'academic_supervisor',
  ptns:'ptns','p. ptns':'ptns','hr development':'ptns'
}

const CENTRE_REGION=Object.fromEntries(Object.entries(REGION_CENTRES).flatMap(([r,centres])=>centres.map(c=>[c,Number(r)])))
const clean=v=>String(v??'').trim()
const lower=v=>clean(v).toLowerCase()
const n=v=>{const x=Number(String(v??'').replace(',','.'));return Number.isFinite(x)?x:null}
const bool=v=>['1','true','yes','y','có','x'].includes(lower(v))

function normaliseKeys(row){
  const aliases={
    fullname:'full_name','full name':'full_name','họ tên':'full_name','ho ten':'full_name','tên giáo viên':'full_name','teacher name':'full_name',
    mail:'email','email công việc':'email','work email':'email',
    password:'temporary_password','temporary password':'temporary_password','mật khẩu tạm':'temporary_password',
    teachercode:'teacher_code','teacher code':'teacher_code','mã giáo viên':'teacher_code','ma giao vien':'teacher_code',
    centre:'centre','center':'centre','trung tâm':'centre','trung tam':'centre','home_centre_code':'centre',
    region_no:'region','khu vực':'region','khu vuc':'region',professional_level:'level','professional level':'level',
    language_preference:'language','ngôn ngữ':'language','ngon ngu':'language',
    observedat:'observed_at','observed at':'observed_at','ngày dự giờ':'observed_at','ngay du gio':'observed_at',
    observationtype:'observation_type','observation type':'observation_type','loại dự giờ':'observation_type','loai du gio':'observation_type',
    finalscore:'final_score','final score':'final_score','điểm tổng':'final_score','diem tong':'final_score','score':'final_score',
    observername:'observer_name','observer name':'observer_name','người dự giờ':'observer_name','nguoi du gio':'observer_name',
    classname:'class_name','class name':'class_name','lớp':'class_name','lop':'class_name',
    improvement:'improvement_areas','growth areas':'improvement_areas','areas for improvement':'improvement_areas','điểm cần cải thiện':'improvement_areas','diem can cai thien':'improvement_areas',
    smartaction:'smart_action','smart action':'smart_action','development action':'smart_action',verifyby:'verify_by','verify by':'verify_by',
    trainingtype:'training_type','training type':'training_type','loại đào tạo':'training_type','loai dao tao':'training_type',
    startsat:'starts_at','starts at':'starts_at','start':'starts_at','bắt đầu':'starts_at','bat dau':'starts_at',
    endsat:'ends_at','ends at':'ends_at','end':'ends_at','kết thúc':'ends_at','ket thuc':'ends_at',
    audience_label:'audience','đối tượng':'audience','doi tuong':'audience',target_region_no:'region',target_centre_code:'centre',
    titleenglish:'title_en','title english':'title_en','tiêu đề tiếng anh':'title_en','tieu de tieng anh':'title_en',
    titlevietnamese:'title_vi','title vietnamese':'title_vi','tiêu đề tiếng việt':'title_vi','tieu de tieng viet':'title_vi',
    bodyenglish:'body_en','body english':'body_en','nội dung tiếng anh':'body_en','noi dung tieng anh':'body_en',
    bodyvietnamese:'body_vi','body vietnamese':'body_vi','nội dung tiếng việt':'body_vi','noi dung tieng viet':'body_vi',
    publishedat:'published_at','published at':'published_at','ngày đăng':'published_at','ngay dang':'published_at'
  }
  const out={}
  for(const [k,v] of Object.entries(row||{})){
    const raw=clean(k)
    const canonical=raw.toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim()
    const compact=canonical.replace(/\s/g,'')
    out[aliases[canonical]||aliases[compact]||raw.toLowerCase().replace(/[ -]+/g,'_')]=v
  }
  return out
}

function parseDate(value,{dateOnly=false}={}){
  if(value instanceof Date&&!Number.isNaN(value.valueOf())) return dateOnly?value.toISOString().slice(0,10):value.toISOString()
  const s=clean(value)
  if(!s)return null
  if(dateOnly&&/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10)
  let iso=s
  const local=s.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if(local){
    const hh=String(local[2]||'00').padStart(2,'0'),mm=local[3]||'00',ss=local[4]||'00'
    iso=`${local[1]}T${hh}:${mm}:${ss}+07:00`
  }
  const d=new Date(iso)
  if(Number.isNaN(d.valueOf()))return null
  return dateOnly?d.toISOString().slice(0,10):d.toISOString()
}

async function parseRows(file){
  const XLSX=await import('xlsx')
  const bytes=new Uint8Array(await file.arrayBuffer())
  const wb=XLSX.read(bytes,{type:'array',cellDates:true})
  const ws=wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws,{defval:'',raw:false}).map(normaliseKeys)
}

function asError(row,message){return {row,message}}
function result(){return {created:0,updated:0,skipped:0,failed:0,errors:[]}}
function pushError(summary,row,message){summary.failed++;if(summary.errors.length<30)summary.errors.push(asError(row,message))}
function normaliseRole(v){return ROLE_ALIASES[lower(v)]||lower(v).replace(/[\s-]+/g,'_')}
function normaliseObservationType(v){
  const x=lower(v)
  if(x.includes('re-')||x.includes('reobserve')||x.includes('dự giờ lại')||x.includes('du gio lai'))return 'Re-observation'
  if(x.includes('pop')||x.includes('spot')||x.includes('quick'))return 'Pop-up Check'
  return 'Full Observation'
}

export async function POST(request){
  try{
    const supabase=await createServerClient()
    const {data:{user}}=await supabase.auth.getUser()
    if(!user)return NextResponse.json({error:'Unauthorised'},{status:401})
    const {data:requester}=await supabase.from('profiles').select('id,role,full_name').eq('id',user.id).single()
    if(!requester)return NextResponse.json({error:'Profile not found'},{status:403})

    const form=await request.formData()
    const uiLang=clean(form.get('lang'))==='vi'?'vi':'en'
    const msg=(en,vi)=>uiLang==='vi'?vi:en
    const kind=clean(form.get('kind'))
    const file=form.get('file')
    if(!IMPORT_PERMISSIONS[kind]?.includes(requester.role))return NextResponse.json({error:msg('You do not have permission for this import type.','Bạn không có quyền thực hiện loại nhập dữ liệu này.')},{status:403})
    if(!file||typeof file.arrayBuffer!=='function')return NextResponse.json({error:msg('Please attach a CSV or Excel file.','Vui lòng đính kèm file CSV hoặc Excel.')},{status:400})

    const rows=await parseRows(file)
    if(!rows.length)return NextResponse.json({error:msg('The file has no data rows.','File không có dòng dữ liệu nào.')},{status:400})
    if(rows.length>1000)return NextResponse.json({error:msg('Please import no more than 1,000 rows at a time.','Mỗi lần chỉ nhập tối đa 1.000 dòng.')},{status:400})

    const admin=createAdminClient()
    const summary=result()

    if(kind==='users'){
      const {data:profiles}=await admin.from('profiles').select('id,email,teacher_code')
      const byEmail=new Map((profiles||[]).filter(x=>x.email).map(x=>[lower(x.email),x]))
      const authRes=await admin.auth.admin.listUsers({page:1,perPage:1000})
      const authByEmail=new Map((authRes.data?.users||[]).filter(x=>x.email).map(x=>[lower(x.email),x]))
      for(let i=0;i<rows.length;i++){
        const r=rows[i],row=i+2,email=lower(r.email),name=clean(r.full_name),role=normaliseRole(r.role||'teacher'),centre=clean(r.centre).toUpperCase()
        const region=n(r.region)||CENTRE_REGION[centre]||null
        if(!email||!name){pushError(summary,row,msg('full_name and email are required','Cần có họ tên và email.'));continue}
        if(!IMPORT_PERMISSIONS.users||!Object.values(ROLE_ALIASES).includes(role)){pushError(summary,row,msg(`Unknown role: ${r.role}`,`Vai trò không hợp lệ: ${r.role}`));continue}
        if(centre&&!CENTRE_REGION[centre]){pushError(summary,row,msg(`Unknown centre: ${centre}`,`Mã trung tâm không hợp lệ: ${centre}`));continue}
        if(region&&![1,2,3].includes(Number(region))){pushError(summary,row,msg(`Invalid region: ${region}`,`Khu vực không hợp lệ: ${region}`));continue}
        let authUser=authByEmail.get(email)
        if(!authUser){
          const password=clean(r.temporary_password)
          if(password.length<8){pushError(summary,row,msg('temporary_password must be at least 8 characters for new accounts','Mật khẩu tạm cho tài khoản mới phải có ít nhất 8 ký tự.'));continue}
          const {data:created,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{vmg_role:role}})
          if(error){pushError(summary,row,error.message);continue}
          authUser=created.user;authByEmail.set(email,authUser);summary.created++
        }else summary.updated++
        const {error}=await admin.from('profiles').upsert({
          id:authUser.id,email,full_name:name,role,
          teacher_code:clean(r.teacher_code)||null,
          home_centre_code:centre||null,region_no:region?Number(region):null,
          professional_level:clean(r.level)||null,language_preference:lower(r.language)==='vi'?'vi':'en',is_active:r.is_active===''||r.is_active==null?true:bool(r.is_active),updated_at:new Date().toISOString()
        })
        if(error){pushError(summary,row,error.message);continue}
        byEmail.set(email,{id:authUser.id,email})
      }
    }

    if(kind==='observations'){
      const {data:teachers}=await admin.from('profiles').select('id,email,teacher_code,full_name').eq('role','teacher')
      const byEmail=new Map((teachers||[]).filter(x=>x.email).map(x=>[lower(x.email),x]))
      const byCode=new Map((teachers||[]).filter(x=>x.teacher_code).map(x=>[lower(x.teacher_code),x]))
      const {data:existingObs}=await admin.from('observations').select('teacher_id,observed_at')
      const obsKeys=new Set((existingObs||[]).map(x=>`${x.teacher_id}|${new Date(x.observed_at).toISOString()}`))
      for(let i=0;i<rows.length;i++){
        const r=rows[i],row=i+2,tr=(r.teacher_code?byCode.get(lower(r.teacher_code)):null)||(r.email?byEmail.get(lower(r.email)):null)
        if(!tr){pushError(summary,row,msg('Teacher not found. Use teacher_code or email that already exists in Teacher 360.','Không tìm thấy giáo viên. Hãy dùng mã giáo viên hoặc email đã có trong Teacher 360.'));continue}
        const observedAt=parseDate(r.observed_at)
        if(!observedAt){pushError(summary,row,msg('observed_at is required. Recommended format: YYYY-MM-DD HH:mm','Cần có ngày dự giờ. Định dạng khuyến nghị: YYYY-MM-DD HH:mm.'));continue}
        const obsKey=`${tr.id}|${new Date(observedAt).toISOString()}`
        if(obsKeys.has(obsKey)){summary.skipped++;continue}
        let criteria=[]
        for(let j=0;j<OBSERVATION_RUBRIC.length;j++){
          const rating=n(r[`rating_${j+1}`]??r[`rating_${String(j+1).padStart(2,'0')}`])
          const evidence=clean(r[`evidence_${j+1}`]??r[`evidence_${String(j+1).padStart(2,'0')}`])
          if(rating)criteria.push({criterion:OBSERVATION_RUBRIC[j].criterion,domain:OBSERVATION_RUBRIC[j].domain,weight:OBSERVATION_RUBRIC[j].weight,rating:Math.max(1,Math.min(4,rating)),evidence})
        }
        const calculated=criteria.length===OBSERVATION_RUBRIC.length?criteria.reduce((a,x)=>a+(x.rating/4*x.weight),0):null
        const score=calculated??n(r.final_score)
        if(score===null||score<0||score>100){pushError(summary,row,msg('final_score must be between 0 and 100, or provide rating_1 … rating_15.','Điểm tổng phải từ 0 đến 100, hoặc cung cấp rating_1 … rating_15.'));continue}
        const payload={
          teacher_id:tr.id,observer_id:requester.id,observer_name:clean(r.observer_name)||requester.full_name,
          observed_at:observedAt,observation_type:normaliseObservationType(r.observation_type),purpose:clean(r.purpose)||'Historical observation import',
          class_name:clean(r.class_name)||null,criteria_scores:criteria.length===OBSERVATION_RUBRIC.length?criteria:[],final_score:Number(score.toFixed(1)),
          strengths:clean(r.strengths)||null,improvement_areas:clean(r.improvement_areas)||null,teacher_reflection:clean(r.teacher_reflection)||null,
          smart_action:clean(r.smart_action)||null,verify_by:parseDate(r.verify_by,{dateOnly:true}),status:'finalized'
        }
        const {error}=await admin.from('observations').insert(payload)
        if(error){pushError(summary,row,error.message);continue}
        summary.created++;obsKeys.add(obsKey)
      }
    }

    if(kind==='trainings'){
      const {data:existingTrainings}=await admin.from('trainings').select('title,starts_at')
      const trainingKeys=new Set((existingTrainings||[]).map(x=>`${lower(x.title)}|${new Date(x.starts_at).toISOString()}`))
      for(let i=0;i<rows.length;i++){
        const r=rows[i],row=i+2,title=clean(r.title),starts=parseDate(r.starts_at)
        if(!title||!starts){pushError(summary,row,msg('title and starts_at are required','Cần có tiêu đề và thời gian bắt đầu.'));continue}
        const trainingKey=`${lower(title)}|${new Date(starts).toISOString()}`
        if(trainingKeys.has(trainingKey)){summary.skipped++;continue}
        let ends=parseDate(r.ends_at)
        if(!ends)ends=new Date(new Date(starts).getTime()+90*60000).toISOString()
        const centre=clean(r.centre).toUpperCase()||null,region=n(r.region)||CENTRE_REGION[centre]||null
        const payload={title,training_type:clean(r.training_type)||'Methodology',reason:clean(r.reason)||null,description:clean(r.description)||null,starts_at:starts,ends_at:ends,location:clean(r.location)||null,audience_label:clean(r.audience)||'All teachers',target_region_no:region?Number(region):null,target_centre_code:centre,recap_text:clean(r.recap)||clean(r.recap_text)||null,created_by:requester.id,created_by_name:requester.full_name}
        const {error}=await admin.from('trainings').insert(payload)
        if(error){pushError(summary,row,error.message);continue}
        summary.created++;trainingKeys.add(trainingKey)
      }
    }

    if(kind==='announcements'){
      const {data:existingAnnouncements}=await admin.from('announcements').select('title_en,published_at')
      const announcementKeys=new Set((existingAnnouncements||[]).map(x=>`${lower(x.title_en)}|${new Date(x.published_at).toISOString()}`))
      for(let i=0;i<rows.length;i++){
        const r=rows[i],row=i+2,titleEn=clean(r.title_en)||clean(r.title),bodyEn=clean(r.body_en)||clean(r.body)
        if(!titleEn||!bodyEn){pushError(summary,row,msg('title_en and body_en are required','Cần có tiêu đề và nội dung tiếng Anh.'));continue}
        const centre=clean(r.centre).toUpperCase()||null,region=n(r.region)||CENTRE_REGION[centre]||null
        const publishedAt=parseDate(r.published_at)||new Date().toISOString()
        const announcementKey=`${lower(titleEn)}|${new Date(publishedAt).toISOString()}`
        if(announcementKeys.has(announcementKey)){summary.skipped++;continue}
        const payload={title_en:titleEn,title_vi:clean(r.title_vi)||null,body_en:bodyEn,body_vi:clean(r.body_vi)||null,audience:clean(r.audience)||'All teachers',target_region_no:region?Number(region):null,target_centre_code:centre,author_id:requester.id,author_name:requester.full_name,published_at:publishedAt,is_active:true}
        const {error}=await admin.from('announcements').insert(payload)
        if(error){pushError(summary,row,error.message);continue}
        summary.created++;announcementKeys.add(announcementKey)
      }
    }

    return NextResponse.json({ok:true,kind,total:rows.length,...summary})
  }catch(e){return NextResponse.json({error:e.message||'Import failed'},{status:500})}
}
