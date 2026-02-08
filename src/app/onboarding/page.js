'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Loader2, MapPin, Clock, Calendar, User, Save } from 'lucide-react'

export default function Onboarding() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  
  // Form Data
  const [fullName, setFullName] = useState('')
  const [city, setCity] = useState('')
  const [birthday, setBirthday] = useState('')
  const [timezone, setTimezone] = useState('Asia/Colombo') // Default LK

  const router = useRouter()
  const supabase = createClient()

  // Common Timezones List
  const timezones = [
    { label: "Sri Lanka (Colombo)", value: "Asia/Colombo" },
    { label: "UK (London)", value: "Europe/London" },
    { label: "Australia (Melbourne/Sydney)", value: "Australia/Sydney" },
    { label: "UAE (Dubai)", value: "Asia/Dubai" },
    { label: "Italy (Rome)", value: "Europe/Rome" },
    { label: "Korea (Seoul)", value: "Asia/Seoul" },
    { label: "Japan (Tokyo)", value: "Asia/Tokyo" },
    { label: "USA (New York)", value: "America/New_York" },
    { label: "Poland (Warsaw)", value: "Europe/Warsaw" },
  ]

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      setUser(session.user)
      setLoading(false)
    }
    checkUser()
  }, [])

  const handleSave = async () => {
    if (!fullName.trim() || !city.trim()) return alert("Please fill all fields")
    setSaving(true)

    const updates = {
      id: user.id,
      full_name: fullName,
      city: city,
      birthday: birthday,
      timezone: timezone,
      avatar_url: `https://api.dicebear.com/9.x/avataaars/svg?seed=${fullName}`, // Auto generate avatar
      updated_at: new Date(),
    }

    const { error } = await supabase.from('profiles').upsert(updates)
    
    if (error) {
      alert(error.message)
    } else {
      router.replace('/') // Go to Dashboard
    }
    setSaving(false)
  }

  if (loading) return <div className="h-screen bg-[#050505] flex items-center justify-center text-white"><Loader2 className="animate-spin text-blue-500" /></div>

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">Welcome to the Gang!</h1>
            <p className="text-gray-400 text-sm mt-2">Let's set up your profile so everyone knows where you are.</p>
        </div>

        <div className="space-y-4">
            {/* Full Name */}
            <div>
                <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 block">Full Name</label>
                <div className="flex items-center bg-black/30 rounded-xl border border-white/10 px-4 py-3">
                    <User size={18} className="text-gray-400 mr-3"/>
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your Name" className="bg-transparent flex-1 text-white outline-none text-sm"/>
                </div>
            </div>

            {/* City */}
            <div>
                <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 block">Current City</label>
                <div className="flex items-center bg-black/30 rounded-xl border border-white/10 px-4 py-3">
                    <MapPin size={18} className="text-gray-400 mr-3"/>
                    <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Colombo, Dubai, London" className="bg-transparent flex-1 text-white outline-none text-sm"/>
                </div>
            </div>

            {/* Timezone */}
            <div>
                <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 block">Timezone (For Clock)</label>
                <div className="flex items-center bg-black/30 rounded-xl border border-white/10 px-4 py-3 relative">
                    <Clock size={18} className="text-gray-400 mr-3"/>
                    <select value={timezone} onChange={e => setTimezone(e.target.value)} className="bg-transparent flex-1 text-white outline-none text-sm appearance-none cursor-pointer">
                        {timezones.map(tz => <option key={tz.value} value={tz.value} className="bg-gray-900">{tz.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Birthday */}
            <div>
                <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 block">Birthday</label>
                <div className="flex items-center bg-black/30 rounded-xl border border-white/10 px-4 py-3">
                    <Calendar size={18} className="text-gray-400 mr-3"/>
                    <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className="bg-transparent flex-1 text-white outline-none text-sm appearance-none"/>
                </div>
            </div>

            <button onClick={handleSave} disabled={saving} className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="animate-spin" /> : <Save size={20}/>}
                Complete Setup
            </button>
        </div>
      </div>
    </div>
  )
}