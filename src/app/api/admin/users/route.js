import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient, adminErrorMessage } from '@/lib/supabase/admin'
import { USER_ADMIN_ROLES, ROLE_LABELS, REGION_CENTRES, HEAD_OFFICE_ROLES, REGION_SCOPE_ROLES, CENTRE_SCOPE_ROLES } from '@/lib/config'

const CENTRE_REGION=Object.fromEntries(Object.entries(REGION_CENTRES).flatMap(([r,centres])=>centres.map(c=>[c,Number(r)])))
const clean=v=>String(v??'').trim()

function resolveScope(body){
  const role=clean(body.role)
  if(!ROLE_LABELS[role])return {error:`Unknown role: ${role}`}
  const centre=clean(body.home_centre_code).toUpperCase()
  const requestedRegion=body.region_no?Number(body.region_no):null

  if(role==='teacher'){
    if(!clean(body.teacher_code))return {error:'Teacher code is required for Teacher accounts.'}
    if(!centre||!CENTRE_REGION[centre])return {error:'A valid centre is required for Teacher accounts.'}
    return {role,home_centre_code:centre,region_no:CENTRE_REGION[centre],teacher_code:clean(body.teacher_code),professional_level:clean(body.professional_level)||null}
  }
  if(CENTRE_SCOPE_ROLES.includes(role)){
    if(!centre||!CENTRE_REGION[centre])return {error:'A valid centre is required for Centre Management roles.'}
    return {role,home_centre_code:centre,region_no:CENTRE_REGION[centre],teacher_code:null,professional_level:null}
  }
  if(REGION_SCOPE_ROLES.includes(role)){
    if(![1,2,3].includes(requestedRegion))return {error:'Region 1, 2 or 3 is required for Regional Director.'}
    return {role,home_centre_code:null,region_no:requestedRegion,teacher_code:null,professional_level:null}
  }
  if(HEAD_OFFICE_ROLES.includes(role)){
    return {role,home_centre_code:null,region_no:null,teacher_code:null,professional_level:null}
  }
  return {error:`Unsupported access scope for role: ${role}`}
}

export async function POST(request){
  try{
    const supabase=await createServerClient()
    const {data:{user}}=await supabase.auth.getUser()
    if(!user)return NextResponse.json({error:'Unauthorised'},{status:401})
    const {data:requester}=await supabase.from('profiles').select('role').eq('id',user.id).single()
    if(!requester||!USER_ADMIN_ROLES.includes(requester.role))return NextResponse.json({error:'R&D/BOD permission required'},{status:403})

    const body=await request.json()
    const required=['email','password','full_name','role']
    for(const k of required)if(!body[k])return NextResponse.json({error:`Missing ${k}`},{status:400})
    const scope=resolveScope(body)
    if(scope.error)return NextResponse.json({error:scope.error},{status:400})

    const admin=createAdminClient()
    const {data:created,error}=await admin.auth.admin.createUser({
      email:body.email.trim().toLowerCase(),
      password:body.password,
      email_confirm:true,
      app_metadata:{vmg_role:scope.role}
    })
    if(error)return NextResponse.json({error:adminErrorMessage(error)},{status:400})

    const {error:profileError}=await admin.from('profiles').upsert({
      id:created.user.id,
      email:body.email.trim().toLowerCase(),
      full_name:body.full_name.trim(),
      role:scope.role,
      staff_code:clean(body.staff_code)||null,
      job_title:clean(body.job_title)||null,
      teacher_code:scope.teacher_code,
      home_centre_code:scope.home_centre_code,
      region_no:scope.region_no,
      professional_level:scope.professional_level,
      language_preference:body.language_preference||'en',
      is_active:true
    })
    if(profileError){
      await admin.auth.admin.deleteUser(created.user.id)
      return NextResponse.json({error:adminErrorMessage(profileError)},{status:400})
    }
    return NextResponse.json({id:created.user.id,email:created.user.email,scope:{role:scope.role,region_no:scope.region_no,home_centre_code:scope.home_centre_code}})
  }catch(e){return NextResponse.json({error:adminErrorMessage(e)},{status:500})}
}
