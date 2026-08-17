import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

async function sendEmail(to:string, subject:string, html:string){
  const key=Deno.env.get('RESEND_API_KEY')
  if(!key) return {skipped:true}
  const from=Deno.env.get('REMINDER_FROM_EMAIL') || 'VMG Teacher 360 <notifications@example.com>'
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to,subject,html})})
  if(!r.ok) throw new Error(`Resend ${r.status}`)
  return r.json()
}

async function insertNotificationOnce(dedupe:string,row:{user_id:string,title:string,body:string,kind:string,link_target:string}){
  const {data:done}=await supabase.from('reminder_log').select('id').eq('dedupe_key',dedupe).maybeSingle()
  if(done) return false
  await supabase.from('notifications').insert(row)
  await supabase.from('reminder_log').insert({dedupe_key:dedupe,user_id:row.user_id,source_type:row.kind})
  return true
}

Deno.serve(async (req)=>{
  if(req.headers.get('x-cron-secret')!==Deno.env.get('REMINDER_CRON_SECRET')) return new Response('Unauthorized',{status:401})
  const from=new Date(Date.now()+23*3600000).toISOString()
  const to=new Date(Date.now()+25*3600000).toISOString()
  const localDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
  let queued=0,sent=0

  // T−24h training reminders
  const {data:trainings=[]}=await supabase.from('trainings').select('*').gte('starts_at',from).lte('starts_at',to)
  for(const tr of trainings||[]){
    const {data:regs=[]}=await supabase.from('training_registrations').select('user_id').eq('training_id',tr.id).eq('status','booked')
    for(const reg of regs||[]){
      const ok=await insertNotificationOnce(`training:${tr.id}:t24:${reg.user_id}`,{user_id:reg.user_id,title:'Training reminder · 24 hours',body:`${tr.title} starts in approximately 24 hours.`,kind:'training_reminder',link_target:'training'})
      if(ok)queued++
    }
  }

  // T−24h catch-up / retraining / teacher meeting reminders
  const {data:events=[]}=await supabase.from('teacher_events').select('*').gte('starts_at',from).lte('starts_at',to)
  for(const ev of events||[]){
    if(!ev.teacher_id) continue
    const ok=await insertNotificationOnce(`event:${ev.id}:t24:${ev.teacher_id}`,{user_id:ev.teacher_id,title:'VMG reminder · 24 hours',body:`${ev.title} starts in approximately 24 hours.`,kind:'event_reminder',link_target:'calendar'})
    if(ok)queued++
  }

  // Daily teacher-touch coverage reminder for Academic Supervisors and R&D.
  const weekAgo=new Date(Date.now()-7*86400000).toISOString().slice(0,10)
  const {data:teachers=[]}=await supabase.from('profiles').select('id,full_name,home_centre_code,region_no').eq('role','teacher').eq('is_active',true)
  const {data:touches=[]}=await supabase.from('teacher_touchpoints').select('teacher_id,touch_date').gte('touch_date',weekAgo)
  const counts=new Map<string,number>();for(const x of touches||[])counts.set(x.teacher_id,(counts.get(x.teacher_id)||0)+1)
  const missing=(teachers||[]).filter(x=>(counts.get(x.id)||0)<2)
  if(missing.length){
    const {data:owners=[]}=await supabase.from('profiles').select('id').in('role',['academic_supervisor','rnd']).eq('is_active',true)
    for(const o of owners||[]){
      const ok=await insertNotificationOnce(`touch-coverage:${localDate}:${o.id}`,{user_id:o.id,title:'Teacher touchpoint follow-up',body:`${missing.length} teacher(s) are below the 2-touchpoint weekly standard. Review follow-up and observation feedback.`,kind:'touchpoint_followup',link_target:'touchpoints'})
      if(ok)queued++
    }
  }

  // Daily document promise-date reminders for HR Development and the affected teacher.
  const inThree=new Date(Date.now()+3*86400000).toISOString().slice(0,10)
  const {data:docs=[]}=await supabase.from('teacher_documents').select('teacher_id,promised_submission_date,completion_pct').not('promised_submission_date','is',null).lte('promised_submission_date',inThree).lt('completion_pct',100)
  const {data:hrUsers=[]}=await supabase.from('profiles').select('id').in('role',['ptns','rnd']).eq('is_active',true)
  for(const d of docs||[]){
    for(const h of hrUsers||[]){
      const ok=await insertNotificationOnce(`doc-promise:${localDate}:${d.teacher_id}:${h.id}`,{user_id:h.id,title:'Teacher document follow-up',body:`A teacher document promise date is due on ${d.promised_submission_date}.`,kind:'document_reminder',link_target:'documents'})
      if(ok)queued++
    }
    const ok=await insertNotificationOnce(`doc-promise-teacher:${localDate}:${d.teacher_id}`,{user_id:d.teacher_id,title:'Document submission reminder',body:`Your promised document submission date is ${d.promised_submission_date}.`,kind:'document_reminder',link_target:'portfolio'})
    if(ok)queued++
  }

  // Deliver email for any recent in-app notification that has not yet been emailed.
  const recent=new Date(Date.now()-48*3600000).toISOString()
  const {data:notifications=[]}=await supabase.from('notifications').select('*').gte('created_at',recent).order('created_at',{ascending:true}).limit(500)
  for(const n of notifications||[]){
    const dedupe=`notification-email:${n.id}`
    const {data:done}=await supabase.from('reminder_log').select('id').eq('dedupe_key',dedupe).maybeSingle(); if(done)continue
    const {data:p}=await supabase.from('profiles').select('email,full_name').eq('id',n.user_id).single(); if(!p?.email)continue
    try{
      const out=await sendEmail(p.email,`VMG Teacher 360 · ${n.title}`,`<p>Dear ${p.full_name},</p><p><strong>${n.title}</strong></p><p>${n.body}</p><p>Please sign in to VMG Teacher 360 for the full record.</p>`)
      if(!(out as any).skipped){sent++;await supabase.from('reminder_log').insert({dedupe_key:dedupe,user_id:n.user_id,source_type:'notification',source_id:n.id})}
    }catch(e){console.error(e)}
  }

  return Response.json({ok:true,queued,sent,touchpointDeficits:missing.length,documentReminders:(docs||[]).length})
})
