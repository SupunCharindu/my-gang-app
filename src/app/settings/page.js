'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Loader2, MapPin, Clock, Calendar, User, Save, ArrowLeft, LogOut } from 'lucide-react'

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  
  const [fullName, setFullName] = useState('')
  const [city, setCity] = useState('')
  const [birthday, setBirthday] = useState('')
  const [timezone, setTimezone] = useState('Asia/Colombo')

  const router = useRouter()
  const supabase = createClient()

  const timezones = [
    { label: "Sri Lanka (Colombo)", value: "Asia/Colombo" },
    { label: "UK (London)", value: "Europe/London" },
    { label: "Australia (Sydney)", value: "Australia/Sydney" },
    { label: "UAE (Dubai)", value: "Asia/Dubai" },
    { label: "Italy (Rome)", value: "Europe/Rome" },
    { label: "Korea (Seoul)", value: "Asia/Seoul" },
    { label: "Japan (Tokyo)", value: "Asia/Tokyo" },
    { label: "USA (New York)", value: "America/New_York" },
    { label: "Poland (Warsaw)", value: "Europe/Warsaw" },
  ]

  useEffect(() => {
    const getProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        // 1. Session එක නැත්නම් එළියට දානවා
        if (!session) { 
            router.replace('/login')
            return 
        }

        // 2. User ව set කරනවා
        setUser(session.user)

        // 3. Profile එක ගන්නවා (මෙතන session.user.id පාවිච්චි කිරීම වැදගත්)
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id) // ★ මෙතන user.id දැම්මොත් තමයි Error එන්නේ
            .single()

        if (profile) {
            setFullName(profile.full_name || '')
            setCity(profile.city || '')
            setBirthday(profile.birthday || '')
            setTimezone(profile.timezone || 'Asia/Colombo')
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    getProfile()
  }, [])

  const handleUpdate = async () => {
    // ★ Safety Check: User කෙනෙක් නැත්නම් මුකුත් කරන්න එපා
    if (!user) return

    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      full_name: fullName,
      city: city,
      birthday: birthday,
      timezone: timezone,
      updated_at: new Date(),
    }).eq('id', user.id) // දැන් මෙතන අවුලක් නෑ
    
    if (error) {
        alert(error.message)
    } else {
        // Success වුනාම Home එකට යවන්න
        router.push('/')
        router.refresh() // Data refresh වෙන්න
    }
    setSaving(false)
  }

  // Loading වෙලාවේදී User ව පෙන්නන්නේ නෑ (Error එන එක නවතිනවා)
  if (loading) return <div className="h-screen bg-[#050505] flex items-center justify-center text-white"><Loader2 className="animate-spin text-blue-500" /></div>

  return (
    <div className="min-h-screen bg-[#050505] p-6 flex flex-col items-center">
      <div className="w-full max-w-lg">
          <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={20}/> Back to Dashboard
          </button>

          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
            <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">⚙️ Profile Settings</h1>

            <div className="space-y-4">
                <div>
                    <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 block">Display Name</label>
                    <div className="flex items-center bg-black/30 rounded-xl border border-white/10 px-4 py-3"><User size={18} className="text-gray-400 mr-3"/><input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="bg-transparent flex-1 text-white outline-none text-sm"/></div>
                </div>
                <div>
                    <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 block">Current City</label>
                    <div className="flex items-center bg-black/30 rounded-xl border border-white/10 px-4 py-3"><MapPin size={18} className="text-gray-400 mr-3"/><input type="text" value={city} onChange={e => setCity(e.target.value)} className="bg-transparent flex-1 text-white outline-none text-sm"/></div>
                </div>
                <div>
                    <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 block">Timezone</label>
                    <div className="flex items-center bg-black/30 rounded-xl border border-white/10 px-4 py-3 relative"><Clock size={18} className="text-gray-400 mr-3"/><select value={timezone} onChange={e => setTimezone(e.target.value)} className="bg-transparent flex-1 text-white outline-none text-sm appearance-none cursor-pointer">{timezones.map(tz => <option key={tz.value} value={tz.value} className="bg-gray-900">{tz.label}</option>)}</select></div>
                </div>
                <div>
                    <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 block">Birthday</label>
                    <div className="flex items-center bg-black/30 rounded-xl border border-white/10 px-4 py-3"><Calendar size={18} className="text-gray-400 mr-3"/><input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className="bg-transparent flex-1 text-white outline-none text-sm appearance-none"/></div>
                </div>

                <button onClick={handleUpdate} disabled={saving} className="w-full mt-6 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="animate-spin" /> : <Save size={20}/>} Save Changes
                </button>

                <div className="border-t border-white/10 mt-6 pt-6">
                    <button onClick={async () => { await supabase.auth.signOut(); router.replace('/login') }} className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 flex items-center justify-center gap-2"><LogOut size={20}/> Log Out</button>
                </div>
            </div>
          </div>
      </div>
    </div>
  )
}