'use client'
import { Phone, Video, MoreVertical, Send, Smile, Mic } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ChatSection({ messages, profile, newMessage, setNewMessage, handleSendMessage, chatEndRef }) {

    // WhatsApp Link
    const VIDEO_CALL_LINK = "https://chat.whatsapp.com/PASTE_YOUR_LINK_HERE"

    return (
        <div className="flex flex-col h-full w-full bg-[#030303] md:rounded-3xl border-x md:border border-white/5 relative overflow-hidden">

            {/* CHAT HEADER */}
            <div className="p-3 md:p-4 border-b border-white/5 bg-gradient-to-b from-[#0a0a0a] to-transparent backdrop-blur-md flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-[2px] shadow-lg">
                            <div className="w-full h-full rounded-full bg-[#030303] flex items-center justify-center overflow-hidden">
                                <span className="font-black text-white text-[10px] md:text-xs tracking-wider">GANG</span>
                            </div>
                        </div>
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#030303] rounded-full"></span>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-100 text-sm md:text-base">Main Chat</h3>
                        <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
                        </p>
                    </div>
                </div>

                {/* Action Icons */}
                <div className="flex items-center gap-1">
                    <a href="tel:" className="p-2.5 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all">
                        <Phone size={18} />
                    </a>
                    <a href={VIDEO_CALL_LINK} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all">
                        <Video size={18} />
                    </a>
                    <button className="p-2.5 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all">
                        <MoreVertical size={18} />
                    </button>
                </div>
            </div>

            {/* MESSAGES AREA */}
            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 scrollbar-thin pb-24 md:pb-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                            <Send size={24} className="text-purple-400" />
                        </div>
                        <h3 className="text-base font-bold text-white mb-1">Start the conversation</h3>
                        <p className="text-xs text-gray-500">Send a message to your gang!</p>
                    </div>
                )}

                {messages.map((msg, index) => {
                    const isMe = msg.user_id === profile?.id
                    const showAvatar = !isMe && (index === 0 || messages[index - 1]?.user_id !== msg.user_id)

                    return (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            {/* Avatar */}
                            {!isMe && (
                                <div className={`w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mt-1 ring-1 ring-white/5 ${!showAvatar ? 'invisible' : ''}`}>
                                    <img src={msg.profiles?.avatar_url} className="w-full h-full object-cover" />
                                </div>
                            )}

                            {/* Bubble */}
                            <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                                {!isMe && showAvatar && (
                                    <span className="text-[10px] text-gray-500 ml-1 mb-0.5 font-medium">{msg.profiles?.full_name?.split(' ')[0]}</span>
                                )}

                                <div className={`px-4 py-2.5 text-sm leading-relaxed ${isMe
                                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl rounded-tr-md shadow-lg shadow-purple-500/10'
                                        : 'bg-white/[0.06] text-gray-200 rounded-2xl rounded-tl-md border border-white/5'
                                    }`}>
                                    {msg.text}
                                </div>
                                <span className="text-[9px] text-gray-600 mt-1 px-1">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </motion.div>
                    )
                })}
                <div ref={chatEndRef} />
            </div>

            {/* INPUT AREA */}
            <form
                onSubmit={handleSendMessage}
                className="p-3 md:p-4 border-t border-white/5 bg-[#030303] sticky bottom-0 z-20 mb-[65px] md:mb-0"
            >
                <div className="flex items-center gap-2 bg-white/[0.04] p-1.5 rounded-2xl border border-white/5 focus-within:border-purple-500/30 focus-within:bg-white/[0.06] transition-all">
                    <button type="button" className="p-2 text-gray-500 hover:text-yellow-400 transition-colors rounded-xl hover:bg-white/5">
                        <Smile size={20} />
                    </button>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent border-none outline-none text-sm text-white px-1 py-2 placeholder-gray-500"
                    />
                    <button type="button" className="p-2 text-gray-500 hover:text-purple-400 transition-colors rounded-xl hover:bg-white/5">
                        <Mic size={20} />
                    </button>
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="p-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-purple-500/20"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </form>

        </div>
    )
}