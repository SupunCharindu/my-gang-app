'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Confetti from 'react-confetti'
import {
  CheckCircle, AlertTriangle, Settings,
  Home as HomeIcon, MessageCircle, Users, Menu, Sparkles
} from "lucide-react"

import ChatSection from '@/components/ChatSection'
import FeedSection from '@/components/FeedSection'
import RightSidebar from '@/components/RightSidebar'
import SplashScreen from '@/components/SplashScreen'

// Hooks
import { useAuth } from '@/hooks/useAuth'
import { usePosts } from '@/hooks/usePosts'
import { useChat } from '@/hooks/useChat'
import { useGang } from '@/hooks/useGang'

export default function Home() {
  const router = useRouter()
  const [showSplash, setShowSplash] = useState(true)
  const [activeTab, setActiveTab] = useState('feed')
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  const [toast, setToast] = useState(null)

  // Auth Hook
  const { profile, loading: loadingAuth } = useAuth()

  // Toast Helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Domain Hooks
  const postsHook = usePosts(profile, showToast)
  const chatHook = useChat(profile)
  const gangHook = useGang(profile)

  // Window Size
  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Splash Logic
  const finishLoading = () => {
    setShowSplash(false)
  }

  if (showSplash || loadingAuth) {
    return <SplashScreen finishLoading={finishLoading} />
  }

  // Destructure hooks for cleaner render code
  const { isMyBirthday, birthdays, onlineUsers, allProfiles } = gangHook
  const {
    posts, isPosting, likedPosts, selectedFile, previewUrl, fileInputRef,
    newPostContent, setNewPostContent, setSelectedFile, setPreviewUrl,
    handleCreatePost, handleDeletePost, handleLike, handleFileSelect,
    comments, expandedPostId, setExpandedPostId, newComment, setNewComment,
    replyingTo, setReplyingTo, handlePostComment, setConfirmDeleteId, confirmDeleteId
  } = postsHook

  const { messages, newMessage, setNewMessage, chatEndRef, handleSendMessage } = chatHook

  const timeAgo = (d) => {
    const sec = Math.floor((new Date() - new Date(d)) / 1000);
    if (sec < 60) return "Just now";
    const min = Math.floor(sec / 60);
    if (min < 60) return min + "m ago";
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + "h ago";
    return Math.floor(hr / 24) + "d ago";
  }

  const navItems = [
    { id: 'feed', icon: HomeIcon, label: 'Feed' },
    { id: 'chat', icon: MessageCircle, label: 'Chat', badge: true },
    { id: 'extras', icon: Users, label: 'Gang' },
    { id: 'menu', icon: Menu, label: 'Menu', action: () => router.push('/settings') },
  ]

  return (
    <main className="h-screen bg-[#030303] text-white flex flex-col overflow-hidden relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl backdrop-blur-xl border ${toast.type === 'success'
                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/20 border-rose-500/30 text-rose-400'
              }`}
          >
            {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
            <span className="font-medium text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDeleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gradient-to-b from-[#151515] to-[#0a0a0a] border border-white/10 p-6 rounded-3xl w-full max-w-xs shadow-2xl text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle size={32} className="text-rose-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Delete Post?</h3>
              <p className="text-sm text-gray-400 mb-6">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-2xl font-medium transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeletePost}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 rounded-2xl font-medium transition-all active:scale-95"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Birthday Confetti */}
      {isMyBirthday && (
        <div className="fixed inset-0 z-[60] pointer-events-none">
          <Confetti width={windowSize.width} height={windowSize.height} />
        </div>
      )}

      {/* HEADER - Compact & Premium */}
      <header className="flex-shrink-0 flex justify-between items-center px-4 md:px-6 py-3 md:py-4 bg-[#030303]/80 backdrop-blur-xl border-b border-white/5 z-50 sticky top-0">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="relative">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-[2px] shadow-lg shadow-purple-500/20">
              <div className="w-full h-full rounded-[14px] md:rounded-2xl bg-[#030303] flex items-center justify-center">
                <Sparkles size={18} className="text-white" />
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 text-transparent bg-clip-text leading-tight tracking-tight">
              අපේ ගෙදර
            </h1>
            <p className="text-[9px] md:text-[10px] text-gray-500 font-medium tracking-[0.15em] uppercase">
              Brothers for Life
            </p>
          </div>
        </div>

        {/* Profile & Settings */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/settings')}
            className="hidden md:flex p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
          >
            <Settings size={18} />
          </button>
          <button className="relative group">
            <div className={`w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden ring-2 ring-offset-2 ring-offset-[#030303] transition-all ${isMyBirthday
                ? 'ring-yellow-400 animate-pulse'
                : 'ring-purple-500/50 group-hover:ring-purple-400'
              }`}>
              <img src={profile?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#030303] rounded-full"></span>
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex-1 overflow-hidden flex flex-col md:grid md:grid-cols-12 gap-0 md:gap-4 md:p-4 md:pt-2 relative">
        {/* Chat Panel */}
        <AnimatePresence mode="wait">
          {(activeTab === 'chat' || windowSize.width >= 768) && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`${activeTab === 'chat' ? 'flex' : 'hidden'} md:flex flex-col h-full md:col-span-3 overflow-hidden`}
            >
              <ChatSection
                messages={messages}
                profile={profile}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                handleSendMessage={handleSendMessage}
                chatEndRef={chatEndRef}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feed Panel */}
        <AnimatePresence mode="wait">
          {(activeTab === 'feed' || windowSize.width >= 768) && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`${activeTab === 'feed' ? 'flex' : 'hidden'} md:flex flex-col h-full md:col-span-6 overflow-hidden pb-20 md:pb-0`}
            >
              <FeedSection
                setMobileChatOpen={() => setActiveTab('chat')}
                profile={profile}
                newPostContent={newPostContent}
                setNewPostContent={setNewPostContent}
                previewUrl={previewUrl}
                setPreviewUrl={setPreviewUrl}
                setSelectedFile={setSelectedFile}
                fileInputRef={fileInputRef}
                handleFileSelect={handleFileSelect}
                handleCreatePost={handleCreatePost}
                isPosting={isPosting}
                selectedFile={selectedFile}
                posts={posts}
                likedPosts={likedPosts}
                handleLike={handleLike}
                handleDeletePost={handleDeletePost}
                setExpandedPostId={setExpandedPostId}
                expandedPostId={expandedPostId}
                fetchComments={postsHook.fetchComments}
                comments={comments}
                timeAgo={timeAgo}
                setReplyingTo={setReplyingTo}
                replyingTo={replyingTo}
                newComment={newComment}
                setNewComment={setNewComment}
                handlePostComment={handlePostComment}
                setConfirmDeleteId={setConfirmDeleteId}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Sidebar / Gang Panel */}
        <AnimatePresence mode="wait">
          {(activeTab === 'extras' || windowSize.width >= 768) && (
            <motion.div
              key="extras"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`${activeTab === 'extras' ? 'flex' : 'hidden'} md:flex flex-col h-full md:col-span-3 overflow-hidden pb-20 md:pb-0`}
            >
              <RightSidebar birthdays={birthdays} onlineUsers={onlineUsers} allProfiles={allProfiles} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MOBILE BOTTOM NAV - Premium Redesign */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[60] px-4 pb-[env(safe-area-inset-bottom,8px)]">
        <div className="bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/10 rounded-2xl mx-2 mb-2 px-2 py-2 flex justify-around items-center shadow-2xl shadow-black/50">
          {navItems.map((item) => {
            const isActive = activeTab === item.id
            const Icon = item.icon

            return (
              <button
                key={item.id}
                onClick={() => item.action ? item.action() : setActiveTab(item.id)}
                className={`relative flex flex-col items-center gap-0.5 py-2 px-4 rounded-xl transition-all active:scale-95 ${isActive ? 'text-white' : 'text-gray-500'
                  }`}
              >
                {/* Active Indicator Pill */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-xl border border-purple-500/20"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}

                <div className="relative z-10">
                  <Icon size={22} className={isActive ? 'text-purple-400' : ''} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-[#0a0a0a]"></span>
                  )}
                </div>
                <span className={`text-[10px] font-medium relative z-10 ${isActive ? 'text-purple-300' : ''}`}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </main>
  );
}