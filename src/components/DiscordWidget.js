'use client'
import { Gamepad2, ExternalLink, MessageSquare } from "lucide-react"

export default function DiscordWidget() {
  
  // ★ මෙතනට ඔයාගේ DISCORD INVITE LINK එක දාන්න
  const INVITE_LINK = "https://discord.gg/WHrFHmFKAC" 

  return (
    <div className="glass-panel p-5 rounded-3xl flex-shrink-0 border border-[#5865F2]/30 bg-[#5865F2]/10 relative overflow-hidden group">
        {/* Background Effect */}
        <div className="absolute -right-6 -bottom-6 opacity-10 text-[#5865F2] group-hover:scale-110 transition-transform duration-500">
            <Gamepad2 size={120} />
        </div>

        <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <MessageSquare className="fill-[#5865F2] text-[#5865F2]" size={18}/>
                        Discord
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">Join the voice chat & hang out!</p>
                </div>
                <span className="w-2 h-2 rounded-full bg-[#5865F2] animate-pulse mt-2"></span>
            </div>

            {/* Join Button */}
            <a 
                href={INVITE_LINK} 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-[#5865F2]/20 hover:shadow-[#5865F2]/40"
            >
                Join Server <ExternalLink size={16}/>
            </a>
        </div>
    </div>
  )
}