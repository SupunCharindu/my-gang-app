'use client'
import { Zap, Send } from "lucide-react"

export default function ChatSection({ messages, profile, newMessage, setNewMessage, handleSendMessage, chatEndRef }) {
  return (
    <div className="md:col-span-3 hidden md:flex flex-col h-full overflow-hidden">
        <div className="glass-panel flex-1 rounded-3xl flex flex-col overflow-hidden border border-white/10 shadow-xl">
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Zap size={18} className="text-yellow-400 fill-yellow-400"/>
                    <span className="font-bold tracking-wide">Gang Chat</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-black/20 scrollbar-thin scrollbar-thumb-gray-800">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-2 ${msg.user_id === profile?.id ? 'flex-row-reverse' : ''}`}>
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-700 flex-shrink-0 mt-1 shadow-sm">
                            <img src={msg.profiles?.avatar_url} className="w-full h-full object-cover"/>
                        </div>
                        <div className={`max-w-[85%] p-2 px-3 rounded-2xl text-xs leading-relaxed shadow-sm ${msg.user_id === profile?.id ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-tr-none' : 'bg-white/10 text-gray-200 rounded-tl-none'}`}>
                            {msg.user_id !== profile?.id && <p className="text-[9px] text-gray-400 mb-0.5">{msg.profiles?.full_name?.split(' ')[0]}</p>}
                            {msg.text}
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-white/5 bg-white/5 flex gap-2 flex-shrink-0">
                <input 
                    type="text" 
                    value={newMessage} 
                    onChange={(e) => setNewMessage(e.target.value)} 
                    placeholder="Type..." 
                    className="flex-1 bg-black/20 border border-white/10 rounded-full px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-white"
                />
                <button type="submit" className="p-2 bg-blue-600 hover:bg-blue-500 rounded-full text-white">
                    <Send size={16}/>
                </button>
            </form>
        </div>
    </div>
  )
}