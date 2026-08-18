import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HubClient from '@/components/HubClient'

export default async function HubPage(){
  const supabase = await createClient()
  const { data:{ user } } = await supabase.auth.getUser()
  if(!user) redirect('/login')
  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if(error || !profile){
    return <main style={{padding:40,fontFamily:'Inter,Arial'}}><h1>VMG Teacher 360</h1><p>Your account is active but your VMG profile is not ready yet. Please ask R&amp;D/BOD to assign your role, centre and region in Accounts &amp; Access.</p><form action="/auth/signout" method="post"></form></main>
  }
  return <HubClient profile={{...profile,email:user.email}} />
}
