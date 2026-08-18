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

async function requireAdmin(){
  const supabase=await createServerClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)return {error:NextResponse.json({error:'Unauthorised'},{status:401})}
  const {data:requester}=await supabase.from('profiles').select('id,role').eq('id',user.id).single()
  if(!requester||!USER_ADMIN_ROLES.includes(requester.role))return {error:NextResponse.json({error:'R&D/BOD permission required'},{status:403})}
  return {requester}
}

function profilePayload(id,body,scope,email){
  return {
    id,
    email,
    full_name:clean(body.full_name),
    role:scope.role,
    staff_code:clean(body.staff_code)||null,
    job_title:clean(body.job_title)||null,
    teacher_code:scope.teacher_code,
    home_centre_code:scope.home_centre_code,
    region_no:scope.region_no,
    professional_level:scope.professional_level,
    language_preference:body.language_preference==='vi'?'vi':'en',
    is_active:body.is_active===false?false:true,
    employment_status:body.is_active===false?'inactive':'active',
    updated_at:new Date().toISOString()
  }
}

export async function POST(request){
  try{
    const gate=await requireAdmin()
    if(gate.error)return gate.error
    const body=await request.json()
    const required=['email','password','full_name','role']
    for(const k of required)if(!body[k])return NextResponse.json({error:`Missing ${k}`},{status:400})
    const scope=resolveScope(body)
    if(scope.error)return NextResponse.json({error:scope.error},{status:400})

    const admin=createAdminClient()
    const email=body.email.trim().toLowerCase()
    const {data:created,error}=await admin.auth.admin.createUser({
      email,
      password:body.password,
      email_confirm:true,
      user_metadata:{full_name:body.full_name.trim()},
      app_metadata:{vmg_role:scope.role}
    })
    if(error)return NextResponse.json({error:adminErrorMessage(error)},{status:400})

    const {error:profileError}=await admin.from('profiles').upsert(profilePayload(created.user.id,body,scope,email))
    if(profileError){
      await admin.auth.admin.deleteUser(created.user.id)
      return NextResponse.json({error:adminErrorMessage(profileError)},{status:400})
    }
    return NextResponse.json({id:created.user.id,email:created.user.email,scope:{role:scope.role,region_no:scope.region_no,home_centre_code:scope.home_centre_code}})
  }catch(e){return NextResponse.json({error:adminErrorMessage(e)},{status:500})}
}

export async function PATCH(request){
  try{
    const gate=await requireAdmin()
    if(gate.error)return gate.error
    const body=await request.json()
    const id=clean(body.id)
    if(!id)return NextResponse.json({error:'Missing account id'},{status:400})
    if(!body.email||!body.full_name||!body.role)return NextResponse.json({error:'email, full_name and role are required'},{status:400})
    const scope=resolveScope(body)
    if(scope.error)return NextResponse.json({error:scope.error},{status:400})

    const admin=createAdminClient()
    const email=body.email.trim().toLowerCase()
    const authPatch={
      email,
      email_confirm:true,
      user_metadata:{full_name:body.full_name.trim()},
      app_metadata:{vmg_role:scope.role},
      ban_duration:body.is_active===false?'876000h':'none'
    }
    if(clean(body.password)){
      if(clean(body.password).length<8)return NextResponse.json({error:'New password must be at least 8 characters.'},{status:400})
      authPatch.password=body.password
    }
    const {error:authError}=await admin.auth.admin.updateUserById(id,authPatch)
    if(authError)return NextResponse.json({error:adminErrorMessage(authError)},{status:400})

    const {error:profileError}=await admin.from('profiles').update(profilePayload(id,body,scope,email)).eq('id',id)
    if(profileError)return NextResponse.json({error:adminErrorMessage(profileError)},{status:400})
    return NextResponse.json({ok:true,id})
  }catch(e){return NextResponse.json({error:adminErrorMessage(e)},{status:500})}
}

export async function DELETE(request){
  try{
    const gate=await requireAdmin()
    if(gate.error)return gate.error
    const body=await request.json()
    const requestedIds=Array.isArray(body.ids)?body.ids:[body.id]
    const ids=[...new Set(requestedIds.map(clean).filter(Boolean))]
    if(!ids.length)return NextResponse.json({error:'Missing account id(s)'},{status:400})
    if(ids.length>100)return NextResponse.json({error:'Maximum 100 accounts per bulk request.'},{status:400})
    if(ids.includes(gate.requester.id))return NextResponse.json({error:'You cannot remove your own access account.'},{status:400})

    // Preserve observations, incidents, KPI, training and audit history.
    // Bulk removal is intentionally limited to Teacher accounts.
    const admin=createAdminClient()
    const {data:targets,error:targetError}=await admin.from('profiles').select('id,full_name,email,role,is_active').in('id',ids)
    if(targetError)return NextResponse.json({error:adminErrorMessage(targetError)},{status:400})

    if(ids.length>1){
      const invalid=(targets||[]).filter(x=>x.role!=='teacher').map(x=>x.full_name||x.email||x.id)
      if(invalid.length)return NextResponse.json({error:`Bulk removal is limited to Teacher accounts. Non-teacher selection: ${invalid.slice(0,5).join(', ')}`},{status:400})
    }

    const eligible=(targets||[]).filter(x=>x.id!==gate.requester.id&&x.is_active!==false)
    if(!eligible.length)return NextResponse.json({ok:true,archived:true,removed_count:0,failures:[]})

    const successful=[]
    const failures=[]
    // Keep admin-auth calls bounded so large selections do not overload the Auth API.
    for(let i=0;i<eligible.length;i+=8){
      const slice=eligible.slice(i,i+8)
      const results=await Promise.allSettled(slice.map(u=>admin.auth.admin.updateUserById(u.id,{ban_duration:'876000h'})))
      results.forEach((result,index)=>{
        const user=slice[index]
        if(result.status==='fulfilled'&&!result.value.error)successful.push(user.id)
        else{
          const err=result.status==='fulfilled'?result.value.error:result.reason
          failures.push({id:user.id,email:user.email,error:adminErrorMessage(err)})
        }
      })
    }

    if(successful.length){
      const {error:profileError}=await admin.from('profiles').update({
        is_active:false,
        employment_status:'inactive',
        updated_at:new Date().toISOString()
      }).in('id',successful)
      if(profileError)return NextResponse.json({error:adminErrorMessage(profileError),removed_count:0,failures},{status:400})
    }

    return NextResponse.json({
      ok:failures.length===0,
      archived:true,
      id:ids.length===1?ids[0]:undefined,
      removed_count:successful.length,
      failures
    },{status:failures.length&&successful.length===0?400:200})
  }catch(e){return NextResponse.json({error:adminErrorMessage(e)},{status:500})}
}
