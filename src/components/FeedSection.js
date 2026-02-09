'use client'
import { motion, AnimatePresence } from 'framer-motion'
import {
    MessageSquare, Loader2, Send, Camera, X, Trash2, Heart, MessageCircle, Share2, Image, Smile
} from "lucide-react"

export default function FeedSection({
    setMobileChatOpen, profile, newPostContent, setNewPostContent, previewUrl,
    setPreviewUrl, setSelectedFile, fileInputRef, handleFileSelect, handleCreatePost,
    isPosting, selectedFile, posts, likedPosts, handleLike, handleDeletePost,
    setExpandedPostId, expandedPostId, fetchComments, comments, timeAgo,
    setReplyingTo, replyingTo, newComment, setNewComment, handlePostComment, setConfirmDeleteId
}) {
    return (
        <div className="flex flex-col h-full overflow-hidden relative md:rounded-3xl md:border md:border-white/10 bg-[#030303]">

            {/* CREATE POST AREA */}
            <div className="bg-gradient-to-b from-[#0a0a0a] to-transparent p-4 md:p-5 z-20 border-b border-white/5 flex-shrink-0">
                {/* Mobile Chat Button */}
                <div
                    className="md:hidden flex mb-4 items-center justify-between cursor-pointer active:scale-[0.98] transition-all bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-3.5 rounded-2xl border border-emerald-500/20"
                    onClick={() => setMobileChatOpen(true)}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                            <MessageSquare size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">Gang Chat</h3>
                            <p className="text-xs text-emerald-400/70">Tap to open</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-emerald-400 font-medium">Live</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>
                </div>

                {/* Create Post Box */}
                <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5">
                    <div className="flex gap-3">
                        <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gray-800 overflow-hidden flex-shrink-0 ring-2 ring-purple-500/20">
                            <img src={profile?.avatar_url} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <textarea
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                                className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-gray-500 resize-none h-12 md:h-14 text-sm md:text-base leading-relaxed"
                                placeholder="What's happening with the gang?"
                            />

                            {/* Image Preview */}
                            <AnimatePresence>
                                {previewUrl && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="relative w-full mt-2 overflow-hidden"
                                    >
                                        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                                            <img src={previewUrl} className="w-full h-32 md:h-40 object-cover" />
                                            <button
                                                onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                                                className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-rose-500 rounded-full transition-colors backdrop-blur-sm"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Action Bar */}
                            <div className="flex justify-between items-center pt-3 mt-2 border-t border-white/5">
                                <div className="flex gap-1">
                                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                                    <button
                                        onClick={() => fileInputRef.current.click()}
                                        className="flex items-center gap-1.5 px-3 py-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-purple-400 transition-all"
                                    >
                                        <Image size={18} />
                                        <span className="text-xs font-medium hidden sm:inline">Photo</span>
                                    </button>
                                    <button className="flex items-center gap-1.5 px-3 py-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-yellow-400 transition-all">
                                        <Smile size={18} />
                                    </button>
                                </div>
                                <button
                                    onClick={handleCreatePost}
                                    disabled={isPosting || (!newPostContent.trim() && !selectedFile)}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-purple-500/20"
                                >
                                    {isPosting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                                    <span className="hidden sm:inline">Post</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* POST LIST */}
            <div className="flex-1 overflow-y-auto px-3 md:px-4 py-4 space-y-4 scrollbar-thin">
                <AnimatePresence>
                    {posts.map((post, i) => {
                        const likeCount = post.likes ? post.likes.length : 0
                        const isLiked = likedPosts.has(post.id)
                        const isMyPost = post.user_id === profile?.id
                        const postComments = comments[post.id] || []

                        return (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                key={post.id}
                                className="bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-4 md:p-5 rounded-3xl border border-white/5 hover:border-white/10 transition-all"
                            >
                                {/* Post Header */}
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden ring-2 ring-white/5">
                                            <img src={post.profiles?.avatar_url || post.profiles?.[0]?.avatar_url} className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-sm text-gray-100">{post.profiles?.full_name || post.profiles?.[0]?.full_name}</h3>
                                            <p className="text-[11px] text-gray-500">{timeAgo(post.created_at)}</p>
                                        </div>
                                    </div>
                                    {isMyPost && (
                                        <button
                                            onClick={() => setConfirmDeleteId(post.id)}
                                            className="p-2 text-gray-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                {/* Post Content */}
                                {post.content && (
                                    <p className="text-gray-200 mb-4 whitespace-pre-wrap leading-relaxed text-[15px]">{post.content}</p>
                                )}

                                {/* Post Image */}
                                {post.image_url && (
                                    <div className="w-full rounded-2xl overflow-hidden mb-4 border border-white/5 bg-black/40">
                                        <img src={post.image_url} alt="Post" className="w-full h-auto max-h-[400px] object-cover" />
                                    </div>
                                )}

                                {/* Action Bar */}
                                <div className="flex items-center gap-1 pt-3 border-t border-white/5">
                                    <motion.button
                                        whileTap={{ scale: 1.1 }}
                                        onClick={() => handleLike(post.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm flex-1 justify-center ${isLiked
                                                ? 'text-rose-500 bg-rose-500/10'
                                                : 'text-gray-400 hover:text-rose-500 hover:bg-rose-500/5'
                                            }`}
                                    >
                                        <Heart size={18} className={isLiked ? 'fill-current' : ''} />
                                        <span className="font-medium">{likeCount > 0 ? likeCount : 'Like'}</span>
                                    </motion.button>

                                    <button
                                        onClick={() => { setExpandedPostId(expandedPostId === post.id ? null : post.id); if (expandedPostId !== post.id) fetchComments(post.id) }}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm flex-1 justify-center ${expandedPostId === post.id
                                                ? 'text-blue-400 bg-blue-500/10'
                                                : 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/5'
                                            }`}
                                    >
                                        <MessageCircle size={18} />
                                        <span className="font-medium">{postComments.length > 0 ? postComments.length : 'Comment'}</span>
                                    </button>

                                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all text-sm flex-1 justify-center">
                                        <Share2 size={18} />
                                        <span className="font-medium hidden sm:inline">Share</span>
                                    </button>
                                </div>

                                {/* Comments Section */}
                                <AnimatePresence>
                                    {expandedPostId === post.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="mt-4 pt-4 border-t border-white/5 overflow-hidden"
                                        >
                                            {/* Comments List */}
                                            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                                                {postComments.length === 0 && (
                                                    <p className="text-center text-gray-500 text-xs py-4">No comments yet. Be the first!</p>
                                                )}
                                                {postComments.map(comment => (
                                                    <div key={comment.id} className={`flex gap-2.5 ${comment.parent_id ? 'ml-8' : ''}`}>
                                                        <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-700 flex-shrink-0 ring-1 ring-white/5">
                                                            <img src={comment.profiles?.avatar_url} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="bg-white/5 p-2.5 px-3.5 rounded-2xl rounded-tl-md">
                                                                <p className="text-[11px] text-gray-400 font-semibold mb-0.5">{comment.profiles?.full_name}</p>
                                                                <p className="text-sm text-gray-200 leading-relaxed">{comment.content}</p>
                                                            </div>
                                                            <div className="flex gap-3 mt-1 ml-1">
                                                                <span className="text-[10px] text-gray-500">{timeAgo(comment.created_at)}</span>
                                                                <button onClick={() => setReplyingTo(comment)} className="text-[10px] text-gray-400 hover:text-purple-400 font-medium transition-colors">Reply</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Comment Input */}
                                            <div className="flex gap-2 items-center">
                                                <div className="flex-1 relative">
                                                    <AnimatePresence>
                                                        {replyingTo && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 5 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: 5 }}
                                                                className="absolute -top-7 left-0 text-[10px] text-purple-400 flex items-center gap-1 bg-purple-500/10 px-2.5 py-1 rounded-full"
                                                            >
                                                                Replying to {replyingTo.profiles?.full_name}
                                                                <button onClick={() => setReplyingTo(null)} className="hover:text-white"><X size={10} /></button>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                    <input
                                                        type="text"
                                                        value={newComment}
                                                        onChange={(e) => setNewComment(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handlePostComment(post.id)}
                                                        placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
                                                        className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 text-white placeholder:text-gray-500 transition-all"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => handlePostComment(post.id)}
                                                    disabled={!newComment.trim()}
                                                    className="p-2.5 bg-purple-600 hover:bg-purple-500 rounded-full text-white disabled:opacity-40 transition-all active:scale-95"
                                                >
                                                    <Send size={14} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>

                {/* Empty State */}
                {posts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                            <MessageSquare size={32} className="text-purple-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">No posts yet</h3>
                        <p className="text-sm text-gray-500">Be the first to share something!</p>
                    </div>
                )}
            </div>
        </div>
    )
}