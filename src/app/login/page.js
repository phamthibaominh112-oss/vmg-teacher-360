'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { t } from '@/lib/i18n'

export default function LoginPage(){
  const router = useRouter()
  const [lang,setLang] = useState('en')
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const supabase = useMemo(() => createClient(), [])

  useEffect(()=>{ const stored=localStorage.getItem('vmg-lang'); if(stored) setLang(stored) },[])
  function switchLang(v){ setLang(v); localStorage.setItem('vmg-lang',v) }

  async function signIn(e){
    e.preventDefault(); setBusy(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({email,password})
    if(error){ setError(error.message); setBusy(false); return }
    router.replace('/hub'); router.refresh()
  }
  async function reset(){
    if(!email){ setError(lang==='vi'?'Nhập email trước khi yêu cầu đặt lại mật khẩu.':'Enter your email before requesting a password reset.'); return }
    setBusy(true); setError('')
    const redirectTo = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email,{redirectTo})
    setBusy(false)
    setError(error ? error.message : (lang==='vi'?'Đã gửi email đặt lại mật khẩu.':'Password reset email sent.'))
  }

  return <main className="login-page">
    <section className="login-brand">
      <img className="brand-logo" src="/vmg-logo.png" alt="VMG English" />
      <div className="brand-copy">
        <span className="kicker">VMG Teacher 360</span>
        <h1>{lang==='vi'?'Mỗi ngày làm nghề nhẹ hơn. Mỗi bước phát triển rõ hơn.':'A better workday. A clearer growth journey.'}</h1>
        <p>{lang==='vi'?'Tất cả phản hồi, học liệu, đào tạo, lịch phát triển và thành tựu nghề nghiệp của giáo viên được kết nối tại một nơi.':'Bring feedback, resources, training, development plans and career progress together in one supportive workspace.'}</p>
        <div className="brand-principles">
          <div><b>{lang==='vi'?'Rõ ràng':'Clarity'}</b><span>{lang==='vi'?'Phản hồi có bằng chứng':'Evidence-led feedback'}</span></div>
          <div><b>{lang==='vi'?'Phát triển':'Growth'}</b><span>{lang==='vi'?'Học → thực hành → tiến bộ':'Learn → practise → progress'}</span></div>
          <div><b>{lang==='vi'?'Đúng người':'Right access'}</b><span>{lang==='vi'?'Mỗi vai trò thấy đúng việc cần làm':'Each role sees what matters'}</span></div>
        </div>
      </div>
      <div className="login-copyfoot">VMG TEACHER 360 · GROW · CONNECT · EXCEL</div>
    </section>

    <section className="login-panel">
      <form className="login-card" onSubmit={signIn}>
        <div className="login-card-top">
          <div><h2>{t(lang,'signIn')}</h2><p className="sub">{t(lang,'signInSub')}</p></div>
          <div className="lang-toggle" aria-label="Language">
            <button type="button" className={lang==='en'?'active':''} onClick={()=>switchLang('en')}>EN</button>
            <button type="button" className={lang==='vi'?'active':''} onClick={()=>switchLang('vi')}>VI</button>
          </div>
        </div>
        <div className="login-form">
          <label className="field"><span>{t(lang,'email')}</span><input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@vmg.edu.vn" required /></label>
          <label className="field"><div className="password-row"><span>{t(lang,'password')}</span><button type="button" className="btn ghost small" onClick={reset}>{t(lang,'forgot')}</button></div><input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required /></label>
          {error && <div className="error-box">{error}</div>}
          <button className="btn primary" disabled={busy}>{busy?t(lang,'loading'):t(lang,'signInButton')} →</button>
        </div>
        <div className="security-note"><span className="security-dot" />{t(lang,'secure')}</div>
      </form>
    </section>
  </main>
}
