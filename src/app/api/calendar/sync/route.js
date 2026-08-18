import {NextResponse} from 'next/server'
import {createClient as createServerClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {syncEventToGoogleCalendar,googleCalendarConfigured} from '@/lib/google/calendar'

export const runtime='nodejs'
export const maxDuration=30

const allowedEventRoles=new Set(['academic_supervisor','cmo','centre_director','regional_director','rnd','bod'])

async function sourceForRegistration(supabase,id,user){
  const {data,error}=await supabase.from('training_registrations').select('id,user_id,status,calendar_sync_status,training:trainings(id,title,description,reason,starts_at,ends_at,location,training_type)').eq('id',id).single()
  if(error||!data) return {error:'Training booking not found',status:404}
  if(data.user_id!==user.id){
    const {data:p}=await supabase.from('profiles').select('role').eq('id',user.id).single()
    if(!p||!allowedEventRoles.has(p.role)) return {error:'Not allowed to sync this booking',status:403}
  }
  if(data.status!=='booked') return {error:'Only booked training registrations are synced',status:400}
  return {record:data,userId:data.user_id,event:{title:data.training?.title||'VMG Training',description:[data.training?.training_type,data.training?.reason,data.training?.description].filter(Boolean).join(' · '),startsAt:data.training?.starts_at,endsAt:data.training?.ends_at,location:data.training?.location}}
}

async function sourceForTeacherEvent(supabase,id,user){
  const {data,error}=await supabase.from('teacher_events').select('*').eq('id',id).single()
  if(error||!data) return {error:'Teacher event not found',status:404}
  if(data.teacher_id!==user.id){
    const {data:p}=await supabase.from('profiles').select('role').eq('id',user.id).single()
    if(!p||!allowedEventRoles.has(p.role)) return {error:'Not allowed to sync this event',status:403}
  }
  return {record:data,userId:data.teacher_id,event:{title:data.title,description:[data.event_type,data.notes].filter(Boolean).join(' · '),startsAt:data.starts_at,endsAt:data.ends_at,location:data.location}}
}

export async function POST(request){
  try{
    const supabase=await createServerClient()
    const {data:{user}}=await supabase.auth.getUser()
    if(!user) return NextResponse.json({error:'Unauthorised'},{status:401})
    const body=await request.json().catch(()=>({}))
    const sourceType=body.sourceType
    const sourceId=body.sourceId
    if(!['training_registration','teacher_event'].includes(sourceType)||!sourceId) return NextResponse.json({error:'Invalid calendar sync source'},{status:400})
    if(!googleCalendarConfigured()) return NextResponse.json({error:'Google Calendar is not configured yet.',code:'calendar_not_configured'},{status:503})

    const source=sourceType==='training_registration'?await sourceForRegistration(supabase,sourceId,user):await sourceForTeacherEvent(supabase,sourceId,user)
    if(source.error) return NextResponse.json({error:source.error},{status:source.status||400})
    const admin=createAdminClient()
    const {data:person,error:personError}=await admin.from('profiles').select('id,email,full_name').eq('id',source.userId).single()
    if(personError||!person?.email) return NextResponse.json({error:'The booked person has no work email.'},{status:400})
    const table=sourceType==='training_registration'?'training_registrations':'teacher_events'
    await admin.from(table).update({calendar_sync_status:'syncing',calendar_sync_error:null}).eq('id',sourceId)

    try{
      const result=await syncEventToGoogleCalendar({sourceType,sourceId,attendeeEmail:person.email,...source.event})
      await admin.from(table).update({calendar_sync_status:'synced',google_calendar_event_id:result.id||null,google_calendar_link:result.htmlLink||null,calendar_synced_at:new Date().toISOString(),calendar_sync_error:null}).eq('id',sourceId)
      return NextResponse.json({ok:true,status:'synced',mode:result.mode,eventId:result.id,htmlLink:result.htmlLink})
    }catch(error){
      await admin.from(table).update({calendar_sync_status:'failed',calendar_sync_error:String(error?.message||error).slice(0,500)}).eq('id',sourceId)
      return NextResponse.json({error:'The booking was saved, but Google Calendar sync failed.',detail:String(error?.message||error),code:'calendar_sync_failed'},{status:502})
    }
  }catch(error){
    return NextResponse.json({error:String(error?.message||error||'Calendar sync failed')},{status:500})
  }
}
