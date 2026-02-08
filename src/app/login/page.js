'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Loader2, LogIn, UserPlus, Mail, Lock, AlertCircle } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false) // Login ද Sign Up ද කියලා මාරු කරන්න
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (isSignUp) {
      // ★ SIGN UP (REGISTER) LOGIC
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${location.origin}/auth/callback`,
        }
      })
      
      if (error) {
        setError(error.message)
      } else {
        setMessage("Success! Please check your email to confirm your account.")
      }
    } else {
      // ★ LOGIN LOGIC
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError("Invalid login credentials. Please try again.")
      } else {
        router.push('/') // Dashboard එකට යවන්න
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-md bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl shadow-2xl relative z-10">
        
        <div className="text-center mb-8">
            <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text tracking-tighter mb-2">MY GANG</h1>
            <p className="text-gray-400 text-sm">
                {isSignUp ? "Join the brotherhood today!" : "Welcome back, brother!"}
            </p>
        </div>

        {error && (
            <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-xl mb-6 flex items-center gap-3 text-red-400 text-sm">
                <AlertCircle size={18} /> {error}
            </div>
        )}

        {message && (
            <div className="bg-green-500/10 border border-green-500/50 p-3 rounded-xl mb-6 text-green-400 text-sm text-center">
                {message}
            </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
            <div>
                <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 block">Email Address</label>
                <div className="flex items-center bg-black/30 rounded-xl border border-white/10 px-4 py-3 focus-within:border-blue-500 transition-colors">
                    <Mail size={18} className="text-gray-400 mr-3"/>
                    <input 
                        type="email" 
                        required
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        placeholder="you@example.com" 
                        className="bg-transparent flex-1 text-white outline-none text-sm placeholder-gray-600"
                    />
                </div>
            </div>

            <div>
                <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 block">Password</label>
                <div className="flex items-center bg-black/30 rounded-xl border border-white/10 px-4 py-3 focus-within:border-blue-500 transition-colors">
                    <Lock size={18} className="text-gray-400 mr-3"/>
                    <input 
                        type="password" 
                        required
                        minLength={6}
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        placeholder="••••••••" 
                        className="bg-transparent flex-1 text-white outline-none text-sm placeholder-gray-600"
                    />
                </div>
            </div>

            <button 
                type="submit" 
                disabled={loading} 
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin" /> : (isSignUp ? <UserPlus size={20}/> : <LogIn size={20}/>)}
                {isSignUp ? "Create Account" : "Sign In"}
            </button>
        </form>

        <div className="mt-6 text-center pt-6 border-t border-white/10">
            <p className="text-gray-400 text-sm">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}
                <button 
                    onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }} 
                    className="ml-2 text-blue-400 hover:text-blue-300 font-bold transition-colors"
                >
                    {isSignUp ? "Log In" : "Sign Up"}
                </button>
            </p>
        </div>

      </div>
    </div>
  )
}