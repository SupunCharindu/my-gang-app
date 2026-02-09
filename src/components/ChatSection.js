import { Phone, Video, MoreVertical, Send } from 'lucide-react'

export default function ChatSection({ messages, profile, newMessage, setNewMessage, handleSendMessage, chatEndRef }) {
  
  // ★ ඔයාගේ WhatsApp Link එක මෙතනට දාන්න
  const VIDEO_CALL_LINK = "https://chat.whatsapp.com/PASTE_YOUR_LINK_HERE" 

  return (
    <div className="flex flex-col h-full w-full bg-white/5 md:rounded-3xl border-x md:border border-white/10 relative overflow-hidden">
      
      {/* 1. CHAT HEADER */}
      <div className="p-4 border-b border-white/10 bg-[#050505]/80 backdrop-blur-md flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
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
        
        {/* ICONS */}
        <div className="flex items-center gap-4 text-gray-400">
            <a href="tel:" className="hover:text-white transition-colors"><Phone size={18} /></a>
            <a href={VIDEO_CALL_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors"><Video size={18} /></a>
            <button className="hover:text-white transition-colors"><MoreVertical size={18} /></button>
        </div>
      </div>

      {/* 2. MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 pb-24 md:pb-4">
        {messages.map((msg, index) => {
            const isMe = msg.user_id === profile?.id
            return (
                <div key={index} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    {!isMe && (
                        <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden flex-shrink-0 border border-white/10 mt-1">
                            <img src={msg.profiles?.avatar_url} className="w-full h-full object-cover" />
                        </div>
                    )}
                    
                    {/* Bubble */}
                    <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                        {!isMe && <span className="text-[10px] text-gray-400 ml-1 mb-0.5">{msg.profiles?.full_name.split(' ')[0]}</span>}
                        
                        <div className={`px-4 py-2 rounded-2xl text-sm ${
                            isMe 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-white/10 text-gray-200 rounded-tl-none border border-white/5'
                        }`}>
                            {msg.text}
                        </div>
                        <span className="text-[9px] text-gray-600 mt-1 px-1">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                        </span>
                    </div>
                </div>
            )
        })}
        <div ref={chatEndRef} />
      </div>

      {/* 3. INPUT AREA (Fixed Fix) */}
      <form 
        onSubmit={handleSendMessage} 
        className="p-3 md:p-4 border-t border-white/10 bg-[#050505] sticky bottom-0 z-20 mb-[65px] md:mb-0"
      >
        <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-full border border-white/10 focus-within:border-blue-500/50 transition-colors">
            <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-white px-3 py-1 placeholder-gray-500"
            />
            <button 
                type="submit" 
                disabled={!newMessage.trim()}
                className="p-2 bg-blue-600 hover:bg-blue-500 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
                <Send size={16} />
            </button>
        </div>
      </form>

    </div>
  )
}