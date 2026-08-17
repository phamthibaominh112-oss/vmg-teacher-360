'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
export default function ResetPassword(){
  const supabase=useMemo(()=>createClient(),[]); const router=useRouter(); const [password,setPassword]=useState(''); const [msg,setMsg]=useState('')
  async function submit(e){e.preventDefault(); const {error}=await supabase.auth.updateUser({password}); if(error)setMsg(error.message); else{setMsg('Password updated.'); setTimeout(()=>router.replace('/hub'),700)}}
  return <main className="login-page"><section className="login-brand"><img className="brand-logo" src="/vmg-logo.png" alt="VMG"/><div className="brand-copy"><span className="kicker">ACCOUNT SECURITY</span><h1>Set a new password.</h1><p>Choose a strong password for your VMG Teacher 360 account.</p></div></section><section className="login-panel"><form className="login-card" onSubmit={submit}><h2>Reset password</h2><p className="sub">Enter a new password below.</p><label className="field"><span>New password</span><input type="password" minLength="8" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{msg&&<div className="error-box" style={{marginTop:12}}>{msg}</div>}<button className="btn primary" style={{width:'100%',marginTop:14}}>Update password</button></form></section></main>
}
