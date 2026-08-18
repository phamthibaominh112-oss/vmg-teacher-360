import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient, adminErrorMessage } from '@/lib/supabase/admin'
import { USER_ADMIN_ROLES } from '@/lib/config'

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

    const admin=createAdminClient()
    const {data:created,error}=await admin.auth.admin.createUser({
      email:body.email.trim().toLowerCase(),
      password:body.password,
      email_confirm:true,
      app_metadata:{vmg_role:body.role}
    })
    if(error)return NextResponse.json({error:adminErrorMessage(error)},{status:400})

    const {error:profileError}=await admin.from('profiles').upsert({
      id:created.user.id,
      email:body.email.trim().toLowerCase(),
      full_name:body.full_name.trim(),
      role:body.role,
      teacher_code:body.teacher_code||null,
      home_centre_code:body.home_centre_code||null,
      region_no:body.region_no||null,
      professional_level:body.professional_level||null,
      language_preference:body.language_preference||'en',
      is_active:true
    })
    if(profileError){
      await admin.auth.admin.deleteUser(created.user.id)
      return NextResponse.json({error:adminErrorMessage(profileError)},{status:400})
    }
    return NextResponse.json({id:created.user.id,email:created.user.email})
  }catch(e){return NextResponse.json({error:adminErrorMessage(e)},{status:500})}
}
