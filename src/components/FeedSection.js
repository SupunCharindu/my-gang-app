'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageSquare, Loader2, Send, Camera, X, Trash2, Heart, MessageCircle, Share2 
} from "lucide-react"

export default function FeedSection({ 
    setMobileChatOpen, profile, newPostContent, setNewPostContent, previewUrl, 
    setPreviewUrl, setSelectedFile, fileInputRef, handleFileSelect, handleCreatePost, 
    isPosting, selectedFile, posts, likedPosts, handleLike, handleDeletePost, 
    setExpandedPostId, expandedPostId, fetchComments, comments, timeAgo, 
    setReplyingTo, replyingTo, newComment, setNewComment, handlePostComment, setConfirmDeleteId 
}) {
  return (
    <div className="md:col-span-6 flex flex-col h-full overflow-hidden relative rounded-3xl border border-white/10">
        
        {/* 1. CREATE POST AREA (FIXED) */}
        <div className="bg-[#050505] p-6 z-20 border-b border-white/10 flex-shrink-0">
            {/* Mobile Chat Button */}
            <div className="md:hidden flex mb-4 items-center justify-between cursor-pointer active:scale-95 transition-transform bg-white/5 p-3 rounded-xl border border-white/10" onClick={() => setMobileChatOpen(true)}>
                <div className="flex items-center gap-3"><div className="p-2 bg-green-500/20 text-green-400 rounded-full"><MessageSquare size={20}/></div><div><h3 className="font-bold">Gang Chat</h3><p className="text-xs text-gray-400">Tap to open chat</p></div></div><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            </div>
            
            <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-800 overflow-hidden flex-shrink-0 border-2 border-white/10"><img src={profile?.avatar_url} className="w-full h-full object-cover"/></div>
                <div className="flex-1">
                <textarea value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-gray-500 resize-none h-16 text-lg" placeholder={`What's on your mind?`} />
                {previewUrl && (<div className="relative w-full h-32 bg-black/20 rounded-xl overflow-hidden mb-4 border border-white/10"><img src={previewUrl} className="w-full h-full object-cover" /><button onClick={() => { setSelectedFile(null); setPreviewUrl(null); }} className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-red-500 rounded-full transition-colors"><X size={16}/></button></div>)}
                <div className="flex justify-between items-center pt-2 border-t border-white/5 mt-2">
                    <div className="flex gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                        <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 rounded-full text-blue-400 transition-colors border border-blue-500/20"><Camera size={16}/> <span className="text-xs font-bold uppercase tracking-wide">Photo</span></button>
                    </div>
                    <button onClick={handleCreatePost} disabled={isPosting || (!newPostContent.trim() && !selectedFile)} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-1.5 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50">{isPosting ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>} Post</button>
                </div>
                </div>
            </div>
        </div>

        {/* 2. POST LIST AREA (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-800">
            <AnimatePresence>
            {posts.map((post, i) => {
                const likeCount = post.likes ? post.likes.length : 0
                const isLiked = likedPosts.has(post.id)
                const isMyPost = post.user_id === profile?.id
                const postComments = comments[post.id] || []

                return (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={post.id} className="glass-panel p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-colors bg-black/20">
                    <div className="flex justify-between items-start mb-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden border border-white/10"><img src={post.profiles?.avatar_url || post.profiles?.[0]?.avatar_url} className="w-full h-full object-cover"/></div><div><h3 className="font-semibold text-gray-200">{post.profiles?.full_name || post.profiles?.[0]?.full_name}</h3><p className="text-xs text-gray-500">{timeAgo(post.created_at)}</p></div></div>{isMyPost && <button onClick={() => setConfirmDeleteId(post.id)} className="p-2 text-gray-600 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>}</div>
                    {post.content && <p className="text-gray-200 mb-4 whitespace-pre-wrap leading-relaxed text-[15px]">{post.content}</p>}
                    {post.image_url && <div className="w-full rounded-2xl overflow-hidden mb-6 border border-white/5 bg-black/40"><img src={post.image_url} alt="Post" className="w-full h-auto max-h-[500px] object-cover" /></div>}
                    <div className="flex items-center gap-6 pt-4 border-t border-white/5 text-gray-400"><motion.button whileTap={{ scale: 1.2 }} onClick={() => handleLike(post.id)} className={`flex items-center gap-2 transition-colors text-sm ${isLiked ? 'text-pink-500' : 'hover:text-pink-500'}`}><Heart size={20} className={isLiked ? 'fill-current' : ''}/> {likeCount > 0 ? likeCount : 'Like'}</motion.button><button onClick={() => { setExpandedPostId(expandedPostId === post.id ? null : post.id); if(expandedPostId !== post.id) fetchComments(post.id) }} className="flex items-center gap-2 hover:text-blue-400 transition-colors text-sm"><MessageCircle size={20}/> {postComments.length > 0 ? postComments.length : 'Comment'}</button><button className="flex items-center gap-2 hover:text-green-400 transition-colors text-sm ml-auto"><Share2 size={20}/> Share</button></div>
                    
                    {/* Comments Logic inside Post */}
                    <AnimatePresence>
                    {expandedPostId === post.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-4 pt-4 border-t border-white/5 overflow-hidden">
                            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700">{postComments.map(comment => (<div key={comment.id} className={`flex gap-3 ${comment.parent_id ? 'ml-8' : ''}`}><div className="w-6 h-6 rounded-full overflow-hidden bg-gray-700 flex-shrink-0 mt-1"><img src={comment.profiles?.avatar_url} className="w-full h-full object-cover"/></div><div className="flex-1"><div className="bg-white/5 p-2 px-3 rounded-2xl rounded-tl-none"><p className="text-[10px] text-gray-400 font-bold">{comment.profiles?.full_name}</p><p className="text-xs text-gray-200">{comment.content}</p></div><div className="flex gap-3 mt-1 ml-1"><span className="text-[9px] text-gray-500">{timeAgo(comment.created_at)}</span><button onClick={() => setReplyingTo(comment)} className="text-[9px] text-gray-400 hover:text-white font-medium">Reply</button></div></div></div>))}</div>
                            <div className="flex gap-2 items-center"><div className="flex-1 relative">{replyingTo && (<div className="absolute -top-6 left-0 text-[10px] text-blue-400 flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-full">Replying to {replyingTo.profiles?.full_name} <button onClick={() => setReplyingTo(null)}><X size={10}/></button></div>)}<input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePostComment(post.id)} placeholder={replyingTo ? "Write a reply..." : "Write a comment..."} className="w-full bg-black/30 border border-white/10 rounded-full px-4 py-2 text-xs focus:outline-none focus:border-blue-500 text-white"/></div><button onClick={() => handlePostComment(post.id)} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-full text-white"><Send size={14}/></button></div>
                        </motion.div>
                    )}
                    </AnimatePresence>
                </motion.div>
                )
            })}
            </AnimatePresence>
        </div>
    </div>
  )
}