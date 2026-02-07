'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { 
  Search, LogOut, Loader2, Cloud, Sun, CloudRain, Gift, 
  Send, MessageCircle, Heart, Share2, MessageSquare, MoreHorizontal 
} from "lucide-react"

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [time, setTime] = useState(new Date())
  
  // --- FEED STATE ---
  const [posts, setPosts] = useState([])
  const [newPostContent, setNewPostContent] = useState('')
  const [isPosting, setIsPosting] = useState(false)

  // --- CHAT STATE ---
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const chatEndRef = useRef(null) 

  // --- OTHERS ---
  const [birthdays, setBirthdays] = useState([])
  const router = useRouter()
  const supabase = createClient()

  // 1. DATA FETCHING
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error || !session) {
          router.replace('/login')
          return
        }

        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (!userProfile) {
          router.replace('/onboarding')
          return
        }
        setProfile(userProfile)

        // Fetch Posts
        fetchPosts()

        // Fetch Birthdays
        const { data: allProfiles } = await supabase.from('profiles').select('full_name, birthday, avatar_url')
        if (allProfiles) {
          const today = new Date()
          const currentYear = today.getFullYear()
          const upcoming = allProfiles.map(p => {
            if (!p.birthday) return null
            const bday = new Date(p.birthday)
            let nextBday = new Date(currentYear, bday.getMonth(), bday.getDate())
            if (nextBday < today.setHours(0,0,0,0)) nextBday.setFullYear(currentYear + 1)
            const diffTime = nextBday - today
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            return { ...p, diffDays, nextBday }
          }).filter(Boolean).sort((a, b) => a.diffDays - b.diffDays).slice(0, 3)
          setBirthdays(upcoming)
        }

        // Fetch Messages
        const { data: oldMessages } = await supabase
           .from('messages')
           .select('*, profiles(full_name, avatar_url)')
           .order('created_at', { ascending: true })
        if (oldMessages) setMessages(oldMessages)

        setLoading(false)
      } catch (err) {
        console.error("Error:", err)
        router.replace('/login')
      }
    }
    fetchData()
  }, [])

  // 2. REALTIME CHAT
  useEffect(() => {
    const channel = supabase
      .channel('realtime-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, 
      async (payload) => {
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', payload.new.user_id)
          .single()
        const newMsg = { ...payload.new, profiles: senderProfile }
        setMessages((prev) => [...prev, newMsg])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])


  // --- FUNCTIONS ---
  const fetchPosts = async () => {
    const { data: postsData } = await supabase
      .from('posts')
      .select('*, profiles(full_name, avatar_url)')
      .order('created_at', { ascending: false })
    if (postsData) setPosts(postsData)
  }

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return
    setIsPosting(true)
    const { error } = await supabase.from('posts').insert([{ content: newPostContent, user_id: profile.id }])
    if (!error) { setNewPostContent(''); fetchPosts() }
    setIsPosting(false)
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    const text = newMessage
    setNewMessage('') 
    await supabase.from('messages').insert([{ text: text, user_id: profile.id }])
  }

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Helpers
  const formatTime = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const formatDate = (d) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  const timeAgo = (d) => {
    const sec = Math.floor((new Date() - new Date(d)) / 1000);
    if (sec < 60) return "Just now";
    const min = Math.floor(sec / 60);
    if (min < 60) return min + "m ago";
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + "h ago";
    return Math.floor(hr / 24) + "d ago";
  }

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white"><Loader2 className="animate-spin text-purple-500" size={40} /></div>

  return (
    <main className="min-h-screen p-4 md:p-6 bg-[#050505] text-white">
      
      {/* Header */}
      <header className="flex justify-between items-center mb-6 glass-panel p-4 rounded-2xl sticky top-4 z-50 bg-[#050505]/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 text-transparent bg-clip-text">MY GANG</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={async () => { await supabase.auth.signOut(); router.replace('/login') }} className="p-2 glass-panel rounded-full hover:bg-red-500/20 text-red-400"><LogOut size={20} /></button>
          <div className="w-10 h-10 rounded-full overflow-hidden border border-purple-500/50 bg-gray-800"><img src={profile?.avatar_url} alt="Profile" className="w-full h-full object-cover" /></div>
        </div>
      </header>

      {/* --- NEW 3 COLUMN LAYOUT --- */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* --- 1. LEFT COLUMN: CHAT (Sticky) --- */}
        <div className="md:col-span-3 hidden md:flex flex-col gap-4 h-[calc(100vh-120px)] sticky top-24">
            <div className="glass-panel flex-1 rounded-3xl flex flex-col overflow-hidden border border-white/10">
                {/* Chat Header */}
                <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageSquare size={18} className="text-green-400"/>
                        <span className="font-bold">Gang Chat</span>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                </div>
                
                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-black/20 scrollbar-thin scrollbar-thumb-gray-700">
                    {messages.map((msg) => {
                        const isMe = msg.user_id === profile?.id
                        return (
                            <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                                <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-700 flex-shrink-0 mt-1 shadow-sm">
                                    <img src={msg.profiles?.avatar_url} className="w-full h-full object-cover"/>
                                </div>
                                <div className={`max-w-[85%] p-2 px-3 rounded-2xl text-xs leading-relaxed shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white/10 text-gray-200 rounded-tl-none'}`}>
                                    {!isMe && <p className="text-[9px] text-gray-400 mb-0.5">{msg.profiles?.full_name?.split(' ')[0]}</p>}
                                    {msg.text}
                                </div>
                            </div>
                        )
                    })}
                    <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-white/5 bg-white/5 flex gap-2">
                    <input 
                    type="text" 
                    value={newMessage} 
                    onChange={(e) => setNewMessage(e.target.value)} 
                    placeholder="Type a message..." 
                    className="flex-1 bg-black/20 border border-white/10 rounded-full px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-white placeholder-gray-500"
                    />
                    <button type="submit" className="p-2 bg-blue-600 hover:bg-blue-500 rounded-full text-white transition-colors shadow-lg shadow-blue-500/20"><Send size={16}/></button>
                </form>
            </div>
        </div>

        {/* --- 2. MIDDLE COLUMN: FEED (Scrollable) --- */}
        <div className="md:col-span-6 flex flex-col gap-6">
           
           {/* Mobile View Chat Toggle (Only shows on mobile) */}
           <div className="md:hidden glass-panel p-4 rounded-2xl flex items-center justify-between cursor-pointer" onClick={() => router.push('/chat')}>
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-green-500/20 text-green-400 rounded-full"><MessageSquare size={20}/></div>
                 <div>
                    <h3 className="font-bold">Gang Chat</h3>
                    <p className="text-xs text-gray-400">Tap to open chat</p>
                 </div>
              </div>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
           </div>

           {/* Create Post */}
           <div className="glass-panel p-6 rounded-3xl">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-800 overflow-hidden flex-shrink-0 border-2 border-white/10">
                    <img src={profile?.avatar_url} className="w-full h-full object-cover"/>
                </div>
                <div className="flex-1">
                   <textarea 
                     value={newPostContent} 
                     onChange={(e) => setNewPostContent(e.target.value)} 
                     className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-gray-500 resize-none h-24 text-lg" 
                     placeholder={`What's on your mind, ${profile?.full_name?.split(' ')[0]}?`} 
                   />
                   <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-2">
                     <div className="flex gap-2">
                        {/* Placeholder icons for future features */}
                        <button className="p-2 hover:bg-white/5 rounded-full text-blue-400"><Cloud size={20}/></button>
                     </div>
                     <button onClick={handleCreatePost} disabled={isPosting || !newPostContent.trim()} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-8 py-2 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-purple-500/20">
                       {isPosting ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>} Post
                     </button>
                   </div>
                </div>
              </div>
           </div>

           {/* Posts Feed */}
           <div className="flex flex-col gap-6 pb-20">
              {posts.map((post) => (
                <div key={post.id} className="glass-panel p-6 rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <div className="flex justify-between items-start mb-4">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden border border-white/10 shadow-sm">
                              <img src={post.profiles?.avatar_url || post.profiles?.[0]?.avatar_url} className="w-full h-full object-cover"/>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-200">{post.profiles?.full_name || post.profiles?.[0]?.full_name}</h3>
                            <p className="text-xs text-gray-500">{timeAgo(post.created_at)}</p>
                          </div>
                       </div>
                       <button className="text-gray-500 hover:text-white"><MoreHorizontal size={20}/></button>
                   </div>
                   
                   <p className="text-gray-200 mb-6 whitespace-pre-wrap leading-relaxed text-[15px]">{post.content}</p>
                   
                   <div className="flex items-center gap-8 pt-4 border-t border-white/5 text-gray-400">
                      <button className="flex items-center gap-2 hover:text-pink-500 transition-colors text-sm group"><Heart size={20} className="group-hover:scale-110 transition-transform"/> Like</button>
                      <button className="flex items-center gap-2 hover:text-blue-400 transition-colors text-sm"><MessageCircle size={20}/> Comment</button>
                      <button className="flex items-center gap-2 hover:text-green-400 transition-colors text-sm ml-auto"><Share2 size={20}/> Share</button>
                   </div>
                </div>
              ))}
              {posts.length === 0 && (
                  <div className="glass-panel p-12 rounded-3xl text-center text-gray-500 border-2 border-dashed border-white/5">
                      <Cloud size={64} className="mx-auto mb-4 opacity-20"/>
                      <p className="text-lg font-medium">No posts yet</p>
                      <p className="text-sm">Be the first to share something!</p>
                  </div>
              )}
           </div>
        </div>

        {/* --- 3. RIGHT COLUMN: WIDGETS (Sticky) --- */}
        <div className="md:col-span-3 flex flex-col gap-6 h-[calc(100vh-120px)] sticky top-24">
          
          {/* Weather */}
          <div className="glass-panel p-6 rounded-3xl relative overflow-hidden flex-shrink-0 group hover:border-white/20 transition-colors">
             <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-all"></div>
             <div className="relative z-10">
               <h3 className="text-gray-400 text-sm font-medium">{formatDate(time)}</h3>
               <h2 className="text-4xl font-bold mt-1 text-white tracking-tight">{formatTime(time)}</h2>
               <div className="mt-4 flex items-center gap-3">
                 <div className="p-3 bg-white/5 rounded-2xl"><CloudRain size={24} className="text-blue-400"/></div>
                 <div><p className="text-xl font-bold">12°C</p><p className="text-xs text-gray-400">Bydgoszcz</p></div>
               </div>
             </div>
          </div>

          {/* Calendar */}
          <div className="glass-panel p-5 rounded-3xl flex-shrink-0">
             <h3 className="text-gray-400 text-sm font-medium mb-4 flex items-center gap-2"><Gift size={16} className="text-pink-400" /> Upcoming Birthdays</h3>
             <div className="space-y-3">
               {birthdays.map((bday, index) => (
                   <div key={index} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-colors cursor-pointer group">
                      <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden border border-white/10"><img src={bday.avatar_url} className="w-full h-full object-cover"/></div>
                      <div className="flex-1">
                          <p className="text-sm font-medium text-gray-200 group-hover:text-pink-300 transition-colors">{bday.full_name}</p>
                          <p className="text-xs text-gray-500">{bday.diffDays === 0 ? 'Today! 🎉' : `${bday.diffDays} days left`}</p>
                      </div>
                   </div>
               ))}
               {birthdays.length === 0 && <p className="text-xs text-center py-4 text-gray-500">No upcoming birthdays</p>}
             </div>
          </div>

          {/* Cricket/Other Widget */}
          <div className="glass-panel p-5 rounded-3xl flex-1 relative overflow-hidden min-h-[150px]">
             <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50"></div>
             <h3 className="text-gray-400 text-sm font-medium mb-2">Live Cricket 🏏</h3>
             <div className="h-full flex items-center justify-center pb-6">
                <p className="text-xs text-gray-500">No live matches</p>
             </div>
          </div>

        </div>

      </div>
    </main>
  );
}