'use client'
import { Send, MoreVertical, Phone, Video } from 'lucide-react'

// ... (උඩ imports ටික එහෙමම තියන්න)

export default function ChatSection({ messages, profile, newMessage, setNewMessage, handleSendMessage, chatEndRef }) {
  
  // ★ මේ ලින්ක් එක ඔයාට ඕන එකට වෙනස් කරන්න (WhatsApp Group Link එක දාන්න)
  const VIDEO_CALL_LINK = "https://call.whatsapp.com/video/fELm1QWzXlS9eGbx4oPIQM" 

  return (
    <div className="flex flex-col h-full w-full bg-white/5 md:rounded-3xl border-x md:border border-white/10 relative overflow-hidden">
      
      {/* 1. CHAT HEADER */}
      <div className="p-4 border-b border-white/10 bg-[#050505]/50 backdrop-blur-md flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
            {/* ... (වම් පැත්තේ කොටස එහෙමම තියන්න) ... */}
            <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 p-[2px]">
                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                         <span className="font-bold text-white text-xs">GANG</span>
                    </div>
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-black rounded-full"></span>
            </div>
            <div>
                <h3 className="font-bold text-gray-100 text-sm">Main Chat</h3>
                <p className="text-[10px] text-green-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Online
                </p>
            </div>
        </div>
        
        {/* ★ ICONS WITH LINKS (වැඩ කරන අයිකන්) */}
        <div className="flex items-center gap-4 text-gray-400">
            
            {/* Phone Icon: Click කළාම Dialer එකට යනවා */}
            <a href="tel:" className="hover:text-white transition-colors">
                <Phone size={18} />
            </a>

            {/* Video Icon: Click කළාම WhatsApp Group එකට යනවා */}
            <a href={VIDEO_CALL_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                <Video size={18} />
            </a>

            <button className="hover:text-white transition-colors">
                <MoreVertical size={18} />
            </button>
        </div>
      </div>

      {/* ... (පහළ ඉතුරු කෝඩ් ටික එහෙමම තියන්න) ... */}

      {/* 2. MESSAGES LIST (SCROLLABLE) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700">
        {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
                <p className="text-xs">No messages yet. Start the chat!</p>
            </div>
        )}

        {messages.map((msg) => {
            const isMe = msg.user_id === profile?.id
            return (
                <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} group animate-in fade-in slide-in-from-bottom-2`}>
                    {/* User Avatar */}
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex-shrink-0 mt-1 border border-white/10">
                        <img src={msg.profiles?.avatar_url || 'https://via.placeholder.com/150'} className="w-full h-full object-cover"/>
                    </div>
                    
                    {/* Message Bubble */}
                    <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        {!isMe && <span className="text-[10px] text-gray-400 ml-1 mb-0.5">{msg.profiles?.full_name?.split(' ')[0]}</span>}
                        <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                            isMe 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-[#1a1a1a] text-gray-200 border border-white/10 rounded-tl-none'
                        }`}>
                            {msg.text}
                        </div>
                        <span className="text-[9px] text-gray-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
            )
        })}
        {/* Scroll Anchor */}
        <div ref={chatEndRef} />
      </div>

      {/* 3. INPUT AREA (FIXED BOTTOM) */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-[#050505]/80 backdrop-blur-md">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 focus-within:border-blue-500/50 transition-colors">
            <input 
                type="text" 
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)} 
                placeholder="Type a message..." 
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
            />
            <button 
                type="submit" 
                disabled={!newMessage.trim()}
                className="p-2 bg-blue-600 hover:bg-blue-500 rounded-full text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Send size={16} />
            </button>
        </div>
      </form>

    </div>
  )
}