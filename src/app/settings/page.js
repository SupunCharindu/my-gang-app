'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2, Camera, User, MapPin, Calendar } from 'lucide-react'

// ★ PRESET AVATARS (Cool Avatars List)
// mekata api DiceBear kiyana free service eka use karanawa. lassanai.
const AVATAR_PRESETS = [
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Christopher",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Sophia",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Bandit", 
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Gangster",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Robot1",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Robot2"
]

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  
  // Form States
  const [fullName, setFullName] = useState('')
  const [city, setCity] = useState('')
  const [birthday, setBirthday] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  const router = useRouter()
  const supabase = createClient()

  // 1. Load Current Data
  useEffect(() => {
    const getProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)

      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (data) {
        // Nama "Gangster " kalla ain karala pennamu edit karaddi (optional)
        // nathnam kelinma pennamu.
        setFullName(data.full_name || '')
        setCity(data.city || '')
        setBirthday(data.birthday || '')
        setAvatarUrl(data.avatar_url || AVATAR_PRESETS[0])
      }
      setLoading(false)
    }
    getProfile()
  }, [])

  // 2. SAVE DATA (With Logic)
  const handleSave = async () => {
    if (!user) return
    setSaving(true)

    // ★ LOGIC: Nama Issarahata "Gangster" danna
    let finalName = fullName.trim()
    
    // Namata kalin "Gangster" nattam, api eka damu
    if (!finalName.toLowerCase().startsWith('gangster')) {
        finalName = `Gangster ${finalName}`
    }

    const updates = {
      id: user.id,
      full_name: finalName, // Auto-Gangster Name
      city,
      birthday,
      avatar_url: avatarUrl, // Selected Avatar
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('profiles').upsert(updates)

    if (error) {
      alert('Error updating profile!')
    } else {
      // Success unama Home ekata yanna
      router.push('/')
    }
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 pb-20">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/')} className="p-2 bg-white/5 rounded-full hover:bg-white/10">
            <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
            PROFILE SETTINGS
        </h1>
      </div>

      <div className="space-y-6 max-w-lg mx-auto">
        
        {/* ★ AVATAR SELECTION */}
        <div className="flex flex-col items-center gap-4 mb-6">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-500 shadow-lg shadow-blue-500/20">
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Choose your look</p>
            
            {/* Avatar Grid */}
            <div className="flex gap-3 overflow-x-auto w-full pb-4 scrollbar-hide justify-center flex-wrap">
                {AVATAR_PRESETS.map((url, index) => (
                    <button 
                        key={index} 
                        onClick={() => setAvatarUrl(url)}
                        className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all ${avatarUrl === url ? 'border-green-500 scale-110' : 'border-white/10 hover:border-white/50'}`}
                    >
                        <img src={url} className="w-full h-full object-cover" />
                    </button>
                ))}
            </div>
        </div>

        {/* INPUT: NAME */}
        <div>
            <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 flex items-center gap-2">
                <User size={14} /> Gang Name
            </label>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="text-gray-500 font-mono text-sm select-none">Gangster</span>
                <input 
                    type="text" 
                    value={fullName.replace(/gangster /i, '')} // Edit karaddi "Gangster" kalla pennanne na, eka auto watenawa
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-transparent flex-1 outline-none text-white font-bold"
                    placeholder="Your Name"
                />
            </div>
            <p className="text-[10px] text-gray-500 mt-1">We will add "Gangster" prefix automatically.</p>
        </div>

        {/* INPUT: CITY */}
        <div>
            <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 flex items-center gap-2">
                <MapPin size={14} /> City / Base
            </label>
            <input 
                type="text" 
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
                placeholder="Where are you from?"
            />
        </div>

        {/* INPUT: BIRTHDAY */}
        <div>
            <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 flex items-center gap-2">
                <Calendar size={14} /> Birthday
            </label>
            <input 
                type="date" 
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors text-gray-400"
            />
        </div>

        {/* SAVE BUTTON */}
        <button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
            {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            {saving ? 'Saving Profile...' : 'Save Changes'}
        </button>

        <div className="pt-6 border-t border-white/10 text-center">
            <button 
                onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
                className="text-red-400 text-xs font-bold hover:text-red-300 flex items-center justify-center gap-2 mx-auto"
            >
                <LogOutIcon size={14} /> SIGN OUT
            </button>
        </div>

      </div>
    </div>
  )
}

function LogOutIcon(props) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
    )
}