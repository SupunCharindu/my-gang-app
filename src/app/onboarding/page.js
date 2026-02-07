'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
// Lucide icons import කිරීම
import { Loader2, Calendar, User, Save } from 'lucide-react'

// මෙන්න මේ පේළිය (export default) නැති වුණොත් තමයි ඔය Error එක එන්නේ
export default function OnboardingPage() {
  const [fullName, setFullName] = useState('')
  const [birthday, setBirthday] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  // 1. User check කිරීම
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
      } else {
        router.replace('/login')
      }
    }
    getUser()
  }, [])

  // 2. Avatar URL සැකසීම
  const avatarUrl = `https://api.dicebear.com/9.x/adventurer/svg?seed=${fullName || 'Guest'}&backgroundColor=b6e3f4,c0aede,d1d4f9`

  // 3. Form Submit කිරීම
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    if (!user) return

    // Supabase වෙත දත්ත යැවීම
    const { error } = await supabase
      .from('profiles')
      .upsert([
        {
          id: user.id,
          full_name: fullName,
          birthday: birthday,
          avatar_url: avatarUrl,
          role: 'member',
          updated_at: new Date()
        }
      ])

    if (error) {
      alert('Error saving profile!')
      console.error(error)
    } else {
      // සාර්ථක නම් Home එකට යැවීම
      setTimeout(() => {
        router.replace('/')
        router.refresh()
      }, 1000)
    }
    setLoading(false)
  }

  // 4. UI එක (HTML කොටස)
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#050505]">
      {/* Background Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px]"></div>

      <div className="glass-panel w-full max-w-md p-8 rounded-3xl relative z-10 border border-white/10 bg-white/5 backdrop-blur-xl text-white">
        
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 text-transparent bg-clip-text mb-2">
            Setup Profile
          </h1>
          <p className="text-gray-400 text-sm">Let's create your digital identity.</p>
        </div>

        {/* Live Avatar Preview */}
        <div className="flex justify-center mb-8">
          <div className="w-32 h-32 rounded-full border-4 border-purple-500/30 overflow-hidden bg-white/5 relative shadow-lg shadow-purple-500/20">
            <img 
              src={avatarUrl} 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Name Input */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">Your Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500 transition-colors placeholder:text-gray-600"
                placeholder="e.g. Supun"
              />
            </div>
          </div>

          {/* Birthday Input */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">Birthday</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="date"
                required
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-purple-500/20 mt-6 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                <Save size={18} /> Let's Go!
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  )
}