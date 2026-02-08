'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Confetti from 'react-confetti'
import { 
  LogOut, Loader2, ArrowLeft, CheckCircle, AlertTriangle, Settings, 
  Home as HomeIcon, MessageCircle, Activity, Menu 
} from "lucide-react"

import ChatSection from '@/components/ChatSection'
import FeedSection from '@/components/FeedSection'
import RightSidebar from '@/components/RightSidebar'
// ★ අලුත් Splash Screen එක Import කළා
import SplashScreen from '@/components/SplashScreen'

export default function Home() {
  // ★ Loading State එක වෙනස් කළා Animation එකට ගැලපෙන්න
  const [isLoadingApp, setIsLoadingApp] = useState(true) // ඇත්තටම ඩේටා ලෝඩ් වෙනවද?
  const [showSplash, setShowSplash] = useState(true) // ඇනිමේෂන් එක පෙන්නනවද?

  const [profile, setProfile] = useState(null)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  const [activeTab, setActiveTab] = useState('feed')

  // Data States
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
  const chatEndRef = useRef(null) 

  const [birthdays, setBirthdays] = useState([])
  const [isMyBirthday, setIsMyBirthday] = useState(false)

  const [toast, setToast] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const router = useRouter()
  const supabase = createClient()

  // --- DATA FETCHING ---
  // --- DATA FETCHING (UPDATED) ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error || !session) { router.replace('/login'); return }
        
        const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        if (!userProfile) { router.replace('/onboarding'); return }
        setProfile(userProfile)

        // Birthday Check
        if (userProfile.birthday) {
            const today = new Date(); const bday = new Date(userProfile.birthday)
            if (today.getDate() === bday.getDate() && today.getMonth() === bday.getMonth()) setIsMyBirthday(true)
        }

        await fetchPosts(session.user.id) // await දැම්මා
        
        // Birthdays fetching...
        const { data: allProfiles } = await supabase.from('profiles').select('full_name, birthday, avatar_url')
        if (allProfiles) {
           // ... (Birthdays logic එක එහෙමම තියන්න)
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

      } catch (err) { 
        console.error("Error:", err); 
        // Error එකක් ආවොත් කෙලින්ම Login එකට යවනවා හිර නොවී තියෙන්න
        router.replace('/login') 
      } finally {
        // ★ වැදගත්ම දේ: මොනවා වුනත් Loading එක නවත්තනවා
        setIsLoadingApp(false)
      }
    }

    fetchData()
    setWindowSize({ width: window.innerWidth, height: window.innerHeight })
  }, [])

  // --- REALTIME ---
  useEffect(() => {
    const chatChannel = supabase.channel('realtime-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
          if (payload.new.user_id === profile?.id) return
          const { data: senderProfile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', payload.new.user_id).single()
          setMessages((prev) => [...prev, { ...payload.new, profiles: senderProfile }])
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      })
      .subscribe()

    const likeChannel = supabase.channel('realtime-likes').on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => { if(profile) fetchPosts(profile.id) }).subscribe()
    
    const commentChannel = supabase.channel('realtime-comments').on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, async (payload) => {
        if (payload.eventType === 'INSERT' && payload.new.post_id === expandedPostId) fetchComments(expandedPostId)
    }).subscribe()

    return () => { supabase.removeChannel(chatChannel); supabase.removeChannel(likeChannel); supabase.removeChannel(commentChannel) }
  }, [profile, expandedPostId])

  useEffect(() => { if (activeTab === 'chat' || window.innerWidth > 768) { setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100) } }, [messages, activeTab])

  // --- FUNCTIONS ---
  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000) }
  const fetchPosts = async (userId) => { const { data: postsData } = await supabase.from('posts').select(`*, profiles(full_name, avatar_url), likes(user_id)`).order('created_at', { ascending: false }); if (postsData) { setPosts(postsData); const myLikes = new Set(); postsData.forEach(post => { if (post.likes.some(like => like.user_id === userId)) myLikes.add(post.id) }); setLikedPosts(myLikes) } }
  const handleDeletePost = async () => { if (!confirmDeleteId) return; const { error } = await supabase.from('posts').delete().eq('id', confirmDeleteId); if (!error) { setPosts(posts.filter(p => p.id !== confirmDeleteId)); showToast('Post deleted!', 'success') } else { showToast('Failed to delete.', 'error') } setConfirmDeleteId(null) }
  const fetchComments = async (postId) => { const { data } = await supabase.from('comments').select('*, profiles(full_name, avatar_url)').eq('post_id', postId).order('created_at', { ascending: true }); if (data) setComments(prev => ({ ...prev, [postId]: data })) }
  const handlePostComment = async (postId) => { if (!newComment.trim()) return; const { error } = await supabase.from('comments').insert([{ content: newComment, user_id: profile.id, post_id: postId, parent_id: replyingTo ? replyingTo.id : null }]); if (!error) { setNewComment(''); setReplyingTo(null); fetchComments(postId) } }
  const handleCreatePost = async () => { if (!newPostContent.trim() && !selectedFile) return; setIsPosting(true); let imageUrl = null; if (selectedFile) { const fileExt = selectedFile.name.split('.').pop(); const fileName = `${Math.random()}.${fileExt}`; const filePath = `${fileName}`; const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, selectedFile); if (!uploadError) { const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(filePath); imageUrl = publicUrl } else { showToast('Upload failed', 'error'); setIsPosting(false); return } } const { error } = await supabase.from('posts').insert([{ content: newPostContent, user_id: profile.id, image_url: imageUrl }]); if (!error) { setNewPostContent(''); setSelectedFile(null); setPreviewUrl(null); fetchPosts(profile.id); showToast('Posted!', 'success') } setIsPosting(false) }
  const handleFileSelect = (e) => { const file = e.target.files[0]; if (file) { setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)) } }
  const handleLike = async (postId) => { const isLiked = likedPosts.has(postId); const newLikedPosts = new Set(likedPosts); if (isLiked) { newLikedPosts.delete(postId); await supabase.from('likes').delete().match({ post_id: postId, user_id: profile.id }) } else { newLikedPosts.add(postId); await supabase.from('likes').insert([{ post_id: postId, user_id: profile.id }]) } setLikedPosts(newLikedPosts); fetchPosts(profile.id) }
  
  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !profile) return
    const text = newMessage; setNewMessage('')
    const optimisticMsg = { id: Date.now(), text: text, user_id: profile.id, created_at: new Date().toISOString(), profiles: { full_name: profile.full_name, avatar_url: profile.avatar_url } }
    setMessages((prev) => [...prev, optimisticMsg])
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    const { error } = await supabase.from('messages').insert([{ text: text, user_id: profile.id }])
    if (error) console.error("Error sending:", error)
  }
  const timeAgo = (d) => { const sec = Math.floor((new Date() - new Date(d)) / 1000); if (sec < 60) return "Just now"; const min = Math.floor(sec / 60); if (min < 60) return min + "m ago"; const hr = Math.floor(min / 60); if (hr < 24) return hr + "h ago"; return Math.floor(hr / 24) + "d ago"; }

  // ★ SPLASH SCREEN LOGIC
  // Animation eka iwara unama me function eka call wenawa
  const finishLoading = () => {
     setShowSplash(false)
  }

  // Splash eka pennanawada?
  if (showSplash || isLoadingApp) {
     return <SplashScreen finishLoading={finishLoading} />
  }

  return (
    <main className="h-screen bg-[#050505] text-white flex flex-col overflow-hidden relative">
      <AnimatePresence>{toast && (<motion.div initial={{ opacity: 0, y: -50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl backdrop-blur-md border ${toast.type === 'success' ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-red-500/20 border-red-500/50 text-red-400'}`}>{toast.type === 'success' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}<span className="font-medium text-sm">{toast.message}</span></motion.div>)}</AnimatePresence>
      {confirmDeleteId && (<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"><div className="bg-[#111] border border-white/10 p-6 rounded-3xl w-80 shadow-2xl text-center"><h3 className="text-lg font-bold text-white mb-4">Delete Post?</h3><div className="flex gap-3"><button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl">Cancel</button><button onClick={handleDeletePost} className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-xl">Delete</button></div></div></div>)}
      {isMyBirthday && <div className="fixed inset-0 z-[60] pointer-events-none"><Confetti width={windowSize.width} height={windowSize.height} /></div>}

      {/* HEADER (UPDATED WITH "අපේ ගෙදර") */}
      <header className="flex-shrink-0 flex justify-between items-center px-6 py-4 bg-[#050505] border-b border-white/10 z-50">
        <div className="flex flex-col">
            {/* ★ සිංහල ලෝගෝ එක මෙතනත් දැම්මා */}
            <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text leading-tight tracking-tighter">
                අපේ ගෙදර
            </h1>
            <p className="text-[10px] text-gray-400 font-medium tracking-[0.2em] uppercase">Brothers for Life</p>
        </div>
        <div className="flex items-center gap-4">
            <button onClick={() => router.push('/settings')} className="p-2 glass-panel rounded-full hover:bg-white/10 text-gray-400 transition-colors">
                <Settings size={20} />
            </button>
            <div className={`w-10 h-10 rounded-full overflow-hidden border-2 ${isMyBirthday ? 'border-yellow-400' : 'border-purple-500/50'} bg-gray-800`}>
                <img src={profile?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex-1 overflow-hidden flex flex-col md:grid md:grid-cols-12 gap-0 md:gap-6 p-0 md:p-4 md:pt-0 relative">
        <div className={`${activeTab === 'chat' ? 'flex' : 'hidden'} md:flex flex-col h-full md:col-span-3 overflow-hidden`}><div className="flex-1 h-full w-full flex flex-col"><ChatSection messages={messages} profile={profile} newMessage={newMessage} setNewMessage={setNewMessage} handleSendMessage={handleSendMessage} chatEndRef={chatEndRef} /></div></div>
        <div className={`${activeTab === 'feed' ? 'flex' : 'hidden'} md:flex flex-col h-full md:col-span-6 overflow-hidden pb-20 md:pb-0`}><div className="flex-1 h-full w-full flex flex-col"><FeedSection setMobileChatOpen={() => setActiveTab('chat')} profile={profile} newPostContent={newPostContent} setNewPostContent={setNewPostContent} previewUrl={previewUrl} setPreviewUrl={setPreviewUrl} setSelectedFile={setSelectedFile} fileInputRef={fileInputRef} handleFileSelect={handleFileSelect} handleCreatePost={handleCreatePost} isPosting={isPosting} selectedFile={selectedFile} posts={posts} likedPosts={likedPosts} handleLike={handleLike} handleDeletePost={handleDeletePost} setExpandedPostId={setExpandedPostId} expandedPostId={expandedPostId} fetchComments={fetchComments} comments={comments} timeAgo={timeAgo} setReplyingTo={setReplyingTo} replyingTo={replyingTo} newComment={newComment} setNewComment={setNewComment} handlePostComment={handlePostComment} setConfirmDeleteId={setConfirmDeleteId} /></div></div>
        <div className={`${activeTab === 'extras' ? 'flex' : 'hidden'} md:flex flex-col h-full md:col-span-3 overflow-hidden`}><div className="flex-1 h-full w-full flex flex-col"><RightSidebar birthdays={birthdays} /></div></div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#050505]/90 backdrop-blur-xl border-t border-white/10 px-6 py-4 flex justify-between items-center z-[60]">
         <button onClick={() => setActiveTab('feed')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'feed' ? 'text-blue-500' : 'text-gray-500'}`}><HomeIcon size={24} /><span className="text-[10px] font-medium">Feed</span></button>
         <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'chat' ? 'text-blue-500' : 'text-gray-500'}`}><div className="relative"><MessageCircle size={24} /><span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-black animate-pulse"></span></div><span className="text-[10px] font-medium">Chat</span></button>
         <button onClick={() => setActiveTab('extras')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'extras' ? 'text-blue-500' : 'text-gray-500'}`}><Activity size={24} /><span className="text-[10px] font-medium">Gang</span></button>
         <button onClick={() => router.push('/settings')} className="flex flex-col items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors"><Menu size={24} /><span className="text-[10px] font-medium">Menu</span></button>
      </div>
    </main>
  );
}