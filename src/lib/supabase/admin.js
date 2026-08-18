import { createClient } from '@supabase/supabase-js'

function projectRefFromUrl(url=''){
  try{return new URL(url).hostname.split('.')[0]||''}catch{return ''}
}

function jwtPayload(token=''){
  if(!token||token.split('.').length!==3)return null
  try{
    const raw=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')
    return JSON.parse(Buffer.from(raw,'base64').toString('utf8'))
  }catch{return null}
}

export function getAdminConfig(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!url)throw new Error('Server account provisioning is not configured: missing project URL.')
  if(!key)throw new Error('Server account provisioning is not configured: missing admin secret key.')

  // Legacy service_role JWTs usually include the project ref. Detect a common
  // production mistake early: URL from the new project + key from an old one.
  const payload=jwtPayload(key)
  const ref=projectRefFromUrl(url)
  if(payload?.ref&&ref&&payload.ref!==ref){
    throw new Error('The server admin key belongs to a different project. Update the Vercel admin secret with a key from this project and redeploy.')
  }
  return {url,key}
}

export function createAdminClient(){
  const {url,key}=getAdminConfig()
  return createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}})
}

export function adminErrorMessage(error){
  const msg=String(error?.message||error||'').trim()
  if(/invalid api key|api key.*invalid|invalid.*key/i.test(msg)){
    return 'The server admin key is invalid or belongs to another project. In Vercel, replace SUPABASE_SECRET_KEY (recommended) or SUPABASE_SERVICE_ROLE_KEY with the secret/admin key from the same project as NEXT_PUBLIC_SUPABASE_URL, then redeploy.'
  }
  if(/jwt|signature/i.test(msg)){
    return 'The server admin key could not be verified. Use a fresh secret/admin key from the current project and redeploy.'
  }
  return msg||'Account provisioning failed.'
}
