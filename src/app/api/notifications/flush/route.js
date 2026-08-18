import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function sendEmail({to,subject,html}){
  if(!process.env.RESEND_API_KEY)return {skipped:true}
  const from=process.env.REMINDER_FROM_EMAIL || 'VMG Teacher 360 <onboarding@resend.dev>'
  const r=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({from,to,subject,html})
  })
  if(!r.ok)throw new Error(`Email provider returned ${r.status}`)
  return r.json()
}

function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

export async function POST(){
  const supabase=await createServerClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)return NextResponse.json({error:'Unauthorised'},{status:401})

  if(!process.env.RESEND_API_KEY)return NextResponse.json({ok:true,configured:false,sent:0})

  const admin=createAdminClient()
  const recent=new Date(Date.now()-48*3600000).toISOString()
  const {data:notifications=[],error}=await admin.from('notifications').select('*').gte('created_at',recent).order('created_at',{ascending:true}).limit(250)
  if(error)return NextResponse.json({error:error.message},{status:400})

  let sent=0,failed=0
  const appUrl=process.env.NEXT_PUBLIC_APP_URL || 'https://vmg-teacher-360.vercel.app'
  for(const n of notifications||[]){
    const dedupe=`notification-email:${n.id}`
    const {data:done}=await admin.from('reminder_log').select('id').eq('dedupe_key',dedupe).maybeSingle()
    if(done)continue
    const {data:p}=await admin.from('profiles').select('email,full_name').eq('id',n.user_id).maybeSingle()
    if(!p?.email)continue
    try{
      const out=await sendEmail({
        to:p.email,
        subject:`VMG Teacher 360 · ${n.title}`,
        html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033"><p>Dear ${esc(p.full_name)},</p><h2 style="font-size:18px;margin:16px 0 8px">${esc(n.title)}</h2><p>${esc(n.body)}</p><p><a href="${appUrl}" style="display:inline-block;background:#c81933;color:white;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:700">Open VMG Teacher 360</a></p><p style="color:#7b8492;font-size:12px">This email mirrors an in-app notification. The full record and action history remain inside Teacher 360.</p></div>`
      })
      if(!out.skipped){
        sent++
        await admin.from('reminder_log').insert({dedupe_key:dedupe,user_id:n.user_id,source_type:'notification',source_id:n.id})
      }
    }catch(e){failed++;console.error('notification email',n.id,e)}
  }
  return NextResponse.json({ok:true,configured:true,sent,failed})
}
