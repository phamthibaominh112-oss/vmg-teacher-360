import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function authorised(request){
  const auth=request.headers.get('authorization')
  return process.env.CRON_SECRET && auth===`Bearer ${process.env.CRON_SECRET}`
}

async function sendEmail({to,subject,html}){
  if(!process.env.RESEND_API_KEY) return {skipped:true}
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.REMINDER_FROM_EMAIL,to,subject,html})})
  if(!r.ok) throw new Error(`Email provider returned ${r.status}`)
  return r.json()
}

export async function GET(request){
  if(!authorised(request)) return NextResponse.json({error:'Unauthorised'},{status:401})
  const admin=createAdminClient()
  const from=new Date(Date.now()+23*3600000).toISOString()
  const to=new Date(Date.now()+25*3600000).toISOString()
  const [{data:trainings},{data:events}]=await Promise.all([
    admin.from('trainings').select('*').gte('starts_at',from).lte('starts_at',to),
    admin.from('teacher_events').select('*').gte('starts_at',from).lte('starts_at',to)
  ])
  let queued=0,sent=0
  for(const tr of trainings||[]){
    const {data:regs}=await admin.from('training_registrations').select('user_id').eq('training_id',tr.id).eq('status','booked')
    for(const reg of regs||[]){
      const {data:p}=await admin.from('profiles').select('email,full_name').eq('id',reg.user_id).single(); if(!p?.email)continue
      const dedupe=`training:${tr.id}:t24:${reg.user_id}`
      const {data:existing}=await admin.from('reminder_log').select('id').eq('dedupe_key',dedupe).maybeSingle();if(existing)continue
      await admin.from('notifications').insert({user_id:reg.user_id,title:'Training reminder · 24 hours',body:`${tr.title} starts in approximately 24 hours.`,kind:'training_reminder',link_target:'training'})
      queued++;try{const r=await sendEmail({to:p.email,subject:`VMG Teacher 360 · ${tr.title} tomorrow`,html:`<p>Dear ${p.full_name},</p><p>This is your 24-hour reminder for <strong>${tr.title}</strong>.</p><p>${new Date(tr.starts_at).toLocaleString('en-GB',{timeZone:'Asia/Ho_Chi_Minh'})}</p><p>VMG Teacher 360</p>`});if(!r.skipped)sent++}catch{}
      await admin.from('reminder_log').insert({dedupe_key:dedupe,user_id:reg.user_id,source_type:'training',source_id:tr.id})
    }
  }
  for(const ev of events||[]){
    if(!ev.teacher_id)continue
    const {data:p}=await admin.from('profiles').select('email,full_name').eq('id',ev.teacher_id).single();if(!p?.email)continue
    const dedupe=`event:${ev.id}:t24:${ev.teacher_id}`
    const {data:existing}=await admin.from('reminder_log').select('id').eq('dedupe_key',dedupe).maybeSingle();if(existing)continue
    await admin.from('notifications').insert({user_id:ev.teacher_id,title:'VMG reminder · 24 hours',body:`${ev.title} starts in approximately 24 hours.`,kind:'event_reminder',link_target:'calendar'});queued++
    try{const r=await sendEmail({to:p.email,subject:`VMG Teacher 360 · ${ev.title} tomorrow`,html:`<p>Dear ${p.full_name},</p><p>This is your 24-hour reminder for <strong>${ev.title}</strong>.</p><p>${new Date(ev.starts_at).toLocaleString('en-GB',{timeZone:'Asia/Ho_Chi_Minh'})}</p><p>VMG Teacher 360</p>`});if(!r.skipped)sent++}catch{}
    await admin.from('reminder_log').insert({dedupe_key:dedupe,user_id:ev.teacher_id,source_type:'teacher_event',source_id:ev.id})
  }
  return NextResponse.json({ok:true,queued,sent,emailProviderConfigured:Boolean(process.env.RESEND_API_KEY)})
}
