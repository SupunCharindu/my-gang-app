'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Loader2, Mail, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      // 1. කලින් වගේම Invite List එකේ ඉන්නවද බලමු
      // (ඔයා RLS Disable කරපු නිසා මේක වැඩ කරයි)
      const { data: allowedUser, error: checkError } = await supabase
        .from('allowed_emails')
        .select('*')
        .eq('email', email)
        .single()

      if (checkError || !allowedUser) {
        setMessage({ type: 'error', text: 'Sorry! This is an invite-only app. 🚫' })
        setLoading(false)
        return
      }

      // 2. Password එක පාවිච්චි කරලා ලොග් වෙමු
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        throw authError
      }

      // 3. හරිනම් කෙලින්ම Home එකට යවන්න
      router.replace('/')

    } catch (error) {
      setMessage({ type: 'error', text: 'Login failed! Check your email or password.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-600/20 rounded-full blur-[100px]"></div>

      <div className="glass-panel w-full max-w-md p-8 rounded-3xl relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 text-transparent bg-clip-text mb-2">
            Member Login
          </h1>
          <p className="text-gray-400 text-sm">Enter your credentials</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Email Input */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="••••••"
              />
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Login Now'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-3 rounded-xl text-sm text-center ${message.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}