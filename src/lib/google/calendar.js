import crypto from 'node:crypto'

const TOKEN_URL='https://oauth2.googleapis.com/token'
const CALENDAR_SCOPE='https://www.googleapis.com/auth/calendar.events'
const CALENDAR_API='https://www.googleapis.com/calendar/v3'

function env(name){return String(process.env[name]||'').trim()}
function enabled(){return ['1','true','yes','on'].includes(env('GOOGLE_CALENDAR_ENABLED').toLowerCase())}
function base64url(value){return Buffer.from(value).toString('base64url')}
function privateKey(){return env('GOOGLE_CALENDAR_PRIVATE_KEY').replace(/\\n/g,'\n')}
function domainOf(email){return String(email||'').split('@')[1]?.toLowerCase()||''}
function safeGoogleId(prefix,id){
  const raw=`${prefix}${String(id||'').toLowerCase().replace(/[^0-9a-v]/g,'')}`
  return raw.slice(0,90).padEnd(8,'0')
}

async function accessToken(subject){
  const issuer=env('GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL')
  const key=privateKey()
  if(!issuer||!key) throw new Error('Google Calendar service-account credentials are not configured.')
  const now=Math.floor(Date.now()/1000)
  const header=base64url(JSON.stringify({alg:'RS256',typ:'JWT'}))
  const payload=base64url(JSON.stringify({iss:issuer,sub:subject,scope:CALENDAR_SCOPE,aud:TOKEN_URL,iat:now,exp:now+3600}))
  const unsigned=`${header}.${payload}`
  const signer=crypto.createSign('RSA-SHA256')
  signer.update(unsigned)
  signer.end()
  const signature=signer.sign(key).toString('base64url')
  const assertion=`${unsigned}.${signature}`
  const response=await fetch(TOKEN_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({'grant_type':'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})})
  const json=await response.json().catch(()=>({}))
  if(!response.ok) throw new Error(json.error_description||json.error||`Google OAuth returned ${response.status}`)
  return json.access_token
}

async function insertEvent({subject,event,sendUpdates='none'}){
  const token=await accessToken(subject)
  const url=`${CALENDAR_API}/calendars/primary/events?sendUpdates=${encodeURIComponent(sendUpdates)}`
  const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(event)})
  const json=await response.json().catch(()=>({}))
  if(response.status===409) return {id:event.id,htmlLink:null,duplicate:true}
  if(!response.ok) throw new Error(json?.error?.message||`Google Calendar returned ${response.status}`)
  return {id:json.id,htmlLink:json.htmlLink||null,duplicate:false}
}

function eventBody({sourceType,sourceId,title,description,startsAt,endsAt,location,attendeeEmail,direct}){
  const timeZone=env('GOOGLE_CALENDAR_TIME_ZONE')||'Asia/Ho_Chi_Minh'
  const start=new Date(startsAt)
  const end=endsAt?new Date(endsAt):new Date(start.getTime()+60*60*1000)
  if(Number.isNaN(start.valueOf())||Number.isNaN(end.valueOf())) throw new Error('Invalid calendar event date/time.')
  return {
    id:safeGoogleId(sourceType==='training_registration'?'vmgtr':'vmgev',sourceId),
    summary:title||'VMG Teacher 360',
    description:[description,'VMG Teacher 360 · Automatic calendar sync'].filter(Boolean).join('\n\n'),
    location:location||undefined,
    start:{dateTime:start.toISOString(),timeZone},
    end:{dateTime:end.toISOString(),timeZone},
    attendees:direct?undefined:[{email:attendeeEmail}],
    guestsCanModify:false,
    guestsCanInviteOthers:false,
    reminders:{useDefault:false,overrides:[{method:'popup',minutes:1440},{method:'popup',minutes:30}]},
    extendedProperties:{private:{vmg_source_type:sourceType,vmg_source_id:String(sourceId)}}
  }
}

export function googleCalendarConfigured(){
  return enabled()&&Boolean(env('GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL'))&&Boolean(privateKey())
}

export async function syncEventToGoogleCalendar(input){
  if(!enabled()) return {skipped:true,reason:'disabled'}
  if(!googleCalendarConfigured()) throw new Error('Google Calendar integration is not fully configured.')
  const attendeeEmail=String(input.attendeeEmail||'').trim().toLowerCase()
  if(!attendeeEmail) throw new Error('Calendar attendee email is missing.')
  const mode=(env('GOOGLE_CALENDAR_MODE')||'auto').toLowerCase()
  const workspaceDomain=env('GOOGLE_WORKSPACE_DOMAIN').toLowerCase()
  const organizer=env('GOOGLE_CALENDAR_ORGANIZER_EMAIL').toLowerCase()
  const isWorkspaceUser=workspaceDomain?domainOf(attendeeEmail)===workspaceDomain:true
  const direct=mode==='direct'||(mode==='auto'&&isWorkspaceUser)
  const event=eventBody({...input,attendeeEmail,direct})

  if(direct){
    try{
      const result=await insertEvent({subject:attendeeEmail,event,sendUpdates:'none'})
      return {...result,mode:'direct',subject:attendeeEmail}
    }catch(error){
      if(mode==='direct'||!organizer) throw error
      const fallbackEvent=eventBody({...input,attendeeEmail,direct:false})
      const result=await insertEvent({subject:organizer,event:fallbackEvent,sendUpdates:'all'})
      return {...result,mode:'invite_fallback',subject:organizer}
    }
  }

  if(!organizer) throw new Error('GOOGLE_CALENDAR_ORGANIZER_EMAIL is required for invite mode.')
  const result=await insertEvent({subject:organizer,event,sendUpdates:'all'})
  return {...result,mode:'invite',subject:organizer}
}
