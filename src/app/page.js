'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Confetti from 'react-confetti'
import { 
  LogOut, Loader2, Send, MessageCircle, Heart, Share2, 
  MessageSquare, MoreHorizontal, Camera, X, Zap, Trash2, 
  CheckCircle, AlertTriangle, AlertCircle 
} from "lucide-react"

// ★ අර අපි හදපු අලුත් කෑල්ල මෙතනට ගේනවා
import RightSidebar from '@/components/RightSidebar'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [time, setTime] = useState(new Date())
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  
  // --- STATES ---
  const [posts, setPosts] = useState([])
  const [newPostContent, setNewPostContent] = useState('')
  const [isPosting, setIsPosting] = useState(false)
  const [likedPosts, setLikedPosts] = useState(new Set()) 
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const fileInputRef = useRef(null)

  const [comments, setComments] = useState({})
  const [expandedPostId, setExpandedPostId] = useState(null)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)

  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const chatEndRef = useRef(null) 

  const [matches, setMatches] = useState([])
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [birthdays, setBirthdays] = useState([])
  const [isMyBirthday, setIsMyBirthday] = useState(false)

  const [toast, setToast] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const router = useRouter()
  const supabase = createClient()

  // 1. DATA FETCHING
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error || !session) { router.replace('/login'); return }
        const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        if (!userProfile) { router.replace('/onboarding'); return }
        setProfile(userProfile)

        if (userProfile.birthday) {
            const today = new Date(); const bday = new Date(userProfile.birthday)
            if (today.getDate() === bday.getDate() && today.getMonth() === bday.getMonth()) setIsMyBirthday(true)
        }

        fetchPosts(session.user.id)
        
        const { data: allProfiles } = await supabase.from('profiles').select('full_name, birthday, avatar_url')
        if (allProfiles) {
          const today = new Date(); const currentYear = today.getFullYear()
          const upcoming = allProfiles.map(p => {
            if (!p.birthday) return null; const bday = new Date(p.birthday); let nextBday = new Date(currentYear, bday.getMonth(), bday.getDate())
            if (nextBday < today.setHours(0,0,0,0)) nextBday.setFullYear(currentYear + 1)
            const diffDays = Math.ceil((nextBday - today) / (1000 * 60 * 60 * 24))
            return { ...p, diffDays, nextBday }
          }).filter(Boolean).sort((a, b) => a.diffDays - b.diffDays).slice(0, 3)
          setBirthdays(upcoming)
        }
        
        const { data: oldMessages } = await supabase.from('messages').select('*, profiles(full_name, avatar_url)').order('created_at', { ascending: true })
        if (oldMessages) setMessages(oldMessages)
        setLoading(false)
      } catch (err) { console.error("Error:", err); router.replace('/login') }
    }
    fetchData()
    setWindowSize({ width: window.innerWidth, height: window.innerHeight })
  }, [])

  // 2. REALTIME & 3. CRICKET FETCHING (Same logic kept here for data)
  useEffect(() => {
    const chatChannel = supabase.channel('realtime-chat').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const { data: senderProfile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', payload.new.user_id).single()
        setMessages((prev) => [...prev, { ...payload.new, profiles: senderProfile }])
    }).subscribe()

    const likeChannel = supabase.channel('realtime-likes').on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => { if(profile) fetchPosts(profile.id) }).subscribe()
    const commentChannel = supabase.channel('realtime-comments').on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, async (payload) => {
        if (payload.eventType === 'INSERT' && payload.new.post_id === expandedPostId) fetchComments(expandedPostId)
    }).subscribe()

    return () => { supabase.removeChannel(chatChannel); supabase.removeChannel(likeChannel); supabase.removeChannel(commentChannel) }
  }, [profile, expandedPostId])

  useEffect(() => { if (mobileChatOpen || window.innerWidth > 768) { setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100) } }, [messages, mobileChatOpen])

  useEffect(() => {
    const fetchCricket = async () => {
        const API_KEY = "YOUR_API_KEY_HERE"
        if(API_KEY === "YOUR_API_KEY_HERE") return;
        try {
            const res = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${API_KEY}&offset=0`)
            const data = await res.json()
            if (data.status === "success" && data.data) {
                const sortedMatches = data.data.sort((a, b) => (a.matchStarted && !a.matchEnded ? -1 : 1));
                setMatches(sortedMatches); if (!selectedMatch && sortedMatches.length > 0) setSelectedMatch(sortedMatches[0])
            }
        } catch (error) { console.error("Cricket API Error:", error) }
    }
    fetchCricket(); const interval = setInterval(fetchCricket, 60000); return () => clearInterval(interval)
  }, []) 

  // --- FUNCTIONS (Same as before) ---
  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000) }
  const fetchPosts = async (userId) => {
    const { data: postsData } = await supabase.from('posts').select(`*, profiles(full_name, avatar_url), likes(user_id)`).order('created_at', { ascending: false })
    if (postsData) {
      setPosts(postsData)
      const myLikes = new Set(); postsData.forEach(post => { if (post.likes.some(like => like.user_id === userId)) myLikes.add(post.id) }); setLikedPosts(myLikes)
    }
  }
  const handleDeletePost = async () => {
    if (!confirmDeleteId) return
    const { error } = await supabase.from('posts').delete().eq('id', confirmDeleteId)
    if (!error) { setPosts(posts.filter(p => p.id !== confirmDeleteId)); showToast('Post deleted!', 'success') } 
    else { showToast('Failed to delete.', 'error') }
    setConfirmDeleteId(null)
  }
  const fetchComments = async (postId) => { const { data } = await supabase.from('comments').select('*, profiles(full_name, avatar_url)').eq('post_id', postId).order('created_at', { ascending: true }); if (data) setComments(prev => ({ ...prev, [postId]: data })) }
  const handlePostComment = async (postId) => { if (!newComment.trim()) return; const { error } = await supabase.from('comments').insert([{ content: newComment, user_id: profile.id, post_id: postId, parent_id: replyingTo ? replyingTo.id : null }]); if (!error) { setNewComment(''); setReplyingTo(null); fetchComments(postId) } }
  const handleCreatePost = async () => {
    if (!newPostContent.trim() && !selectedFile) return; setIsPosting(true); let imageUrl = null
    if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop(); const fileName = `${Math.random()}.${fileExt}`; const filePath = `${fileName}`
        const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, selectedFile)
        if (!uploadError) { const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(filePath); imageUrl = publicUrl }
        else { showToast('Upload failed', 'error'); setIsPosting(false); return }
    }
    const { error } = await supabase.from('posts').insert([{ content: newPostContent, user_id: profile.id, image_url: imageUrl }])
    if (!error) { setNewPostContent(''); setSelectedFile(null); setPreviewUrl(null); fetchPosts(profile.id); showToast('Posted!', 'success') }
    setIsPosting(false)
  }
  const handleFileSelect = (e) => { const file = e.target.files[0]; if (file) { setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)) } }
  const handleLike = async (postId) => {
    const isLiked = likedPosts.has(postId); const newLikedPosts = new Set(likedPosts)
    if (isLiked) { newLikedPosts.delete(postId); await supabase.from('likes').delete().match({ post_id: postId, user_id: profile.id }) } 
    else { newLikedPosts.add(postId); await supabase.from('likes').insert([{ post_id: postId, user_id: profile.id }]) }
    setLikedPosts(newLikedPosts); fetchPosts(profile.id)
  }
  const handleSendMessage = async (e) => { e.preventDefault(); if (!newMessage.trim()) return; const text = newMessage; setNewMessage(''); await supabase.from('messages').insert([{ text: text, user_id: profile.id }]) }
  
  useEffect(() => { const timer = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(timer) }, [])
  const timeAgo = (d) => { const sec = Math.floor((new Date() - new Date(d)) / 1000); if (sec < 60) return "Just now"; const min = Math.floor(sec / 60); if (min < 60) return min + "m ago"; const hr = Math.floor(min / 60); if (hr < 24) return hr + "h ago"; return Math.floor(hr / 24) + "d ago"; }

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white"><Loader2 className="animate-spin text-purple-500" size={40} /></div>

  return (
    <main className="h-screen bg-[#050505] text-white flex flex-col overflow-hidden relative">
      {/* Toast & Modal & Confetti Code (Same as before) */}
      <AnimatePresence>{toast && (<motion.div initial={{ opacity: 0, y: -50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl backdrop-blur-md border ${toast.type === 'success' ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-red-500/20 border-red-500/50 text-red-400'}`}>{toast.type === 'success' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}<span className="font-medium text-sm">{toast.message}</span></motion.div>)}</AnimatePresence>
      {confirmDeleteId && (<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"><motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#111] border border-white/10 p-6 rounded-3xl w-80 shadow-2xl"><div className="flex flex-col items-center text-center gap-4"><div className="p-4 bg-red-500/20 rounded-full text-red-500"><AlertCircle size={32}/></div><div><h3 className="text-lg font-bold text-white">Delete Post?</h3><p className="text-gray-400 text-sm mt-1">This action cannot be undone.</p></div><div className="flex gap-3 w-full mt-2"><button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-colors">Cancel</button><button onClick={handleDeletePost} className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white transition-colors font-medium">Delete</button></div></div></motion.div></div>)}
      {isMyBirthday && <div className="fixed inset-0 z-[60] pointer-events-none"><Confetti width={windowSize.width} height={windowSize.height} /></div>}

      <header className="flex-shrink-0 flex justify-between items-center px-6 py-4 bg-[#050505] border-b border-white/10 z-50">
        <div className="flex flex-col"><h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text leading-tight tracking-tighter">MY GANG</h1><p className="text-[10px] text-gray-400 font-medium tracking-[0.2em] uppercase">Brothers for Life</p></div>
        <div className="flex items-center gap-4"><button onClick={async () => { await supabase.auth.signOut(); router.replace('/login') }} className="p-2 glass-panel rounded-full hover:bg-red-500/20 text-red-400 transition-colors"><LogOut size={20} /></button><div className={`w-10 h-10 rounded-full overflow-hidden border-2 ${isMyBirthday ? 'border-yellow-400' : 'border-purple-500/50'} bg-gray-800`}><img src={profile?.avatar_url} alt="Profile" className="w-full h-full object-cover" /></div></div>
      </header>

      <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-6 p-4 pt-0">
        {/* LEFT: CHAT */}
        <div className="md:col-span-3 hidden md:flex flex-col h-full overflow-hidden">
            <div className="glass-panel flex-1 rounded-3xl flex flex-col overflow-hidden border border-white/10 shadow-xl">
                <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between flex-shrink-0"><div className="flex items-center gap-2"><Zap size={18} className="text-yellow-400 fill-yellow-400"/><span className="font-bold tracking-wide">Gang Chat</span></div><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span></div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-black/20 scrollbar-thin scrollbar-thumb-gray-800">{messages.map((msg) => (<div key={msg.id} className={`flex gap-2 ${msg.user_id === profile?.id ? 'flex-row-reverse' : ''}`}><div className="w-6 h-6 rounded-full overflow-hidden bg-gray-700 flex-shrink-0 mt-1 shadow-sm"><img src={msg.profiles?.avatar_url} className="w-full h-full object-cover"/></div><div className={`max-w-[85%] p-2 px-3 rounded-2xl text-xs leading-relaxed shadow-sm ${msg.user_id === profile?.id ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-tr-none' : 'bg-white/10 text-gray-200 rounded-tl-none'}`}>{msg.user_id !== profile?.id && <p className="text-[9px] text-gray-400 mb-0.5">{msg.profiles?.full_name?.split(' ')[0]}</p>}{msg.text}</div></div>))} <div ref={chatEndRef} /></div>
                <form onSubmit={handleSendMessage} className="p-3 border-t border-white/5 bg-white/5 flex gap-2 flex-shrink-0"><input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type..." className="flex-1 bg-black/20 border border-white/10 rounded-full px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-white"/><button type="submit" className="p-2 bg-blue-600 hover:bg-blue-500 rounded-full text-white"><Send size={16}/></button></form>
            </div>
        </div>

        {/* MIDDLE: FEED */}
        <div className="md:col-span-6 flex flex-col h-full overflow-hidden relative rounded-3xl border border-white/10">
           <div className="bg-[#050505] p-6 z-20 border-b border-white/10 flex-shrink-0">
               <div className="md:hidden flex mb-4 items-center justify-between cursor-pointer active:scale-95 transition-transform bg-white/5 p-3 rounded-xl border border-white/10" onClick={() => setMobileChatOpen(true)}><div className="flex items-center gap-3"><div className="p-2 bg-green-500/20 text-green-400 rounded-full"><MessageSquare size={20}/></div><div><h3 className="font-bold">Gang Chat</h3><p className="text-xs text-gray-400">Tap to open chat</p></div></div><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div></div>
               <div className="flex gap-4"><div className="w-12 h-12 rounded-full bg-gray-800 overflow-hidden flex-shrink-0 border-2 border-white/10"><img src={profile?.avatar_url} className="w-full h-full object-cover"/></div><div className="flex-1"><textarea value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-gray-500 resize-none h-16 text-lg" placeholder={`What's on your mind?`} />{previewUrl && (<div className="relative w-full h-32 bg-black/20 rounded-xl overflow-hidden mb-4 border border-white/10"><img src={previewUrl} className="w-full h-full object-cover" /><button onClick={() => { setSelectedFile(null); setPreviewUrl(null); }} className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-red-500 rounded-full transition-colors"><X size={16}/></button></div>)}<div className="flex justify-between items-center pt-2 border-t border-white/5 mt-2"><div className="flex gap-2"><input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" /><button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 rounded-full text-blue-400 transition-colors border border-blue-500/20"><Camera size={16}/> <span className="text-xs font-bold uppercase tracking-wide">Photo</span></button></div><button onClick={handleCreatePost} disabled={isPosting || (!newPostContent.trim() && !selectedFile)} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-1.5 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50">{isPosting ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>} Post</button></div></div></div>
           </div>
           <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-800">
              <AnimatePresence>
              {posts.map((post, i) => (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={post.id} className="glass-panel p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-colors bg-black/20">
                   <div className="flex justify-between items-start mb-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden border border-white/10"><img src={post.profiles?.avatar_url || post.profiles?.[0]?.avatar_url} className="w-full h-full object-cover"/></div><div><h3 className="font-semibold text-gray-200">{post.profiles?.full_name || post.profiles?.[0]?.full_name}</h3><p className="text-xs text-gray-500">{timeAgo(post.created_at)}</p></div></div>{post.user_id === profile?.id && <button onClick={() => setConfirmDeleteId(post.id)} className="p-2 text-gray-600 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>}</div>
                   {post.content && <p className="text-gray-200 mb-4 whitespace-pre-wrap leading-relaxed text-[15px]">{post.content}</p>}
                   {post.image_url && <div className="w-full rounded-2xl overflow-hidden mb-6 border border-white/5 bg-black/40"><img src={post.image_url} alt="Post" className="w-full h-auto max-h-[500px] object-cover" /></div>}
                   <div className="flex items-center gap-6 pt-4 border-t border-white/5 text-gray-400"><motion.button whileTap={{ scale: 1.2 }} onClick={() => handleLike(post.id)} className={`flex items-center gap-2 transition-colors text-sm ${likedPosts.has(post.id) ? 'text-pink-500' : 'hover:text-pink-500'}`}><Heart size={20} className={likedPosts.has(post.id) ? 'fill-current' : ''}/> {post.likes ? post.likes.length : 0}</motion.button><button onClick={() => { setExpandedPostId(expandedPostId === post.id ? null : post.id); if(expandedPostId !== post.id) fetchComments(post.id) }} className="flex items-center gap-2 hover:text-blue-400 transition-colors text-sm"><MessageCircle size={20}/> {comments[post.id]?.length > 0 ? comments[post.id].length : 'Comment'}</button><button className="flex items-center gap-2 hover:text-green-400 transition-colors text-sm ml-auto"><Share2 size={20}/> Share</button></div>
                   
                   <AnimatePresence>
                   {expandedPostId === post.id && (
                       <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-4 pt-4 border-t border-white/5 overflow-hidden">
                           <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700">{comments[post.id]?.map(comment => (<div key={comment.id} className={`flex gap-3 ${comment.parent_id ? 'ml-8' : ''}`}><div className="w-6 h-6 rounded-full overflow-hidden bg-gray-700 flex-shrink-0 mt-1"><img src={comment.profiles?.avatar_url} className="w-full h-full object-cover"/></div><div className="flex-1"><div className="bg-white/5 p-2 px-3 rounded-2xl rounded-tl-none"><p className="text-[10px] text-gray-400 font-bold">{comment.profiles?.full_name}</p><p className="text-xs text-gray-200">{comment.content}</p></div><div className="flex gap-3 mt-1 ml-1"><span className="text-[9px] text-gray-500">{timeAgo(comment.created_at)}</span><button onClick={() => setReplyingTo(comment)} className="text-[9px] text-gray-400 hover:text-white font-medium">Reply</button></div></div></div>))}</div>
                           <div className="flex gap-2 items-center"><div className="flex-1 relative">{replyingTo && (<div className="absolute -top-6 left-0 text-[10px] text-blue-400 flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-full">Replying to {replyingTo.profiles?.full_name} <button onClick={() => setReplyingTo(null)}><X size={10}/></button></div>)}<input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePostComment(post.id)} placeholder={replyingTo ? "Write a reply..." : "Write a comment..."} className="w-full bg-black/30 border border-white/10 rounded-full px-4 py-2 text-xs focus:outline-none focus:border-blue-500 text-white"/></div><button onClick={() => handlePostComment(post.id)} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-full text-white"><Send size={14}/></button></div>
                       </motion.div>
                   )}
                   </AnimatePresence>
                </motion.div>
              ))}
              </AnimatePresence>
           </div>
        </div>

        {/* RIGHT: WIDGETS (USE THE NEW COMPONENT) */}
        <RightSidebar 
            time={time} 
            matches={matches} 
            selectedMatch={selectedMatch} 
            setSelectedMatch={setSelectedMatch} 
            birthdays={birthdays} 
        />

      </div>
      {mobileChatOpen && (<div className="fixed inset-0 z-50 bg-[#050505] flex flex-col animate-in slide-in-from-bottom-full duration-300 md:hidden"><div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/50 backdrop-blur-md sticky top-0"><div className="flex items-center gap-3"><button onClick={() => setMobileChatOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><ArrowLeft size={24}/></button><div><h2 className="font-bold text-lg">Gang Chat</h2><p className="text-xs text-green-400">Online</p></div></div></div><div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20">{messages.map((msg) => (<div key={msg.id} className={`flex gap-3 ${msg.user_id === profile?.id ? 'flex-row-reverse' : ''}`}><div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex-shrink-0 mt-1"><img src={msg.profiles?.avatar_url} className="w-full h-full object-cover"/></div><div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${msg.user_id === profile?.id ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white/10 text-gray-200 rounded-tl-none'}`}>{msg.user_id !== profile?.id && <p className="text-[10px] text-gray-400 mb-1">{msg.profiles?.full_name?.split(' ')[0]}</p>}{msg.text}</div></div>))} <div ref={chatEndRef} /></div><form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-[#050505] pb-8"><div className="flex gap-2"><input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-3 text-white focus:outline-none focus:border-blue-500" autoFocus/><button type="submit" className="p-3 bg-blue-600 hover:bg-blue-500 rounded-full text-white"><Send size={20}/></button></div></form></div>)}
    </main>
  );
}