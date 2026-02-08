'use client'
import { CloudRain, Gift } from "lucide-react"
import { motion } from "framer-motion"

export default function RightSidebar({ time, matches, selectedMatch, setSelectedMatch, birthdays }) {
  
  // Helper Functions
  const formatTime = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const formatDate = (d) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <div className="md:col-span-3 flex flex-col h-full overflow-y-auto gap-6 scrollbar-hide pb-4">
      
      {/* 1. WEATHER WIDGET */}
      <div className="glass-panel p-6 rounded-3xl relative overflow-hidden flex-shrink-0 group hover:border-white/20 transition-all cursor-default">
         <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-all"></div>
         <div className="relative z-10">
           <h3 className="text-gray-400 text-sm font-medium">{formatDate(time)}</h3>
           <h2 className="text-4xl font-bold mt-1 text-white tracking-tight">{formatTime(time)}</h2>
           <div className="mt-4 flex items-center gap-3">
             <div className="p-3 bg-white/5 rounded-2xl"><CloudRain size={24} className="text-blue-400"/></div>
             <div><p className="text-xl font-bold">12°C</p><p className="text-xs text-gray-400">Bydgoszcz</p></div>
           </div>
         </div>
      </div>

      {/* 2. CRICKET WIDGET */}
      <div className="glass-panel rounded-3xl flex-shrink-0 relative overflow-hidden flex flex-col max-h-[400px] border border-white/10">
         {/* Live Header */}
         <div className="p-5 bg-gradient-to-b from-white/10 to-transparent border-b border-white/5 relative">
            <div className="absolute top-4 right-4 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <span className="text-[10px] text-red-400 font-bold tracking-wider">LIVE</span>
            </div>
            {selectedMatch ? (
                <div className="mt-2">
                    <p className="text-xs text-gray-400 mb-1">{selectedMatch.matchType?.toUpperCase()} • {selectedMatch.venue?.split(',')[0]}</p>
                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-lg">{selectedMatch.teams[0]}</span>
                            <span className="text-sm font-mono">{selectedMatch.score?.[0]?.r}/{selectedMatch.score?.[0]?.w} <span className="text-gray-500 text-xs">({selectedMatch.score?.[0]?.o})</span></span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-lg text-gray-400">{selectedMatch.teams[1]}</span>
                            <span className="text-sm font-mono text-gray-400">{selectedMatch.score?.[1]?.r || 0}/{selectedMatch.score?.[1]?.w || 0} <span className="text-gray-600 text-xs">({selectedMatch.score?.[1]?.o || 0})</span></span>
                        </div>
                    </div>
                    <p className="text-[10px] text-yellow-500 mt-3 pt-3 border-t border-white/5">{selectedMatch.status}</p>
                </div>
            ) : (
                <div className="py-6 text-center text-gray-500 text-xs">Loading Matches...</div>
            )}
         </div>
         
         {/* Match List */}
         <div className="flex-1 overflow-y-auto bg-black/20 p-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-700">
            {matches.map((match) => (
                <div key={match.id} onClick={() => setSelectedMatch(match)} className={`p-3 rounded-xl cursor-pointer transition-all border ${selectedMatch?.id === match.id ? 'bg-white/10 border-blue-500/50' : 'bg-transparent border-transparent hover:bg-white/5'}`}>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-gray-400">{match.matchType?.toUpperCase()}</span>
                        {match.matchStarted && !match.matchEnded && <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>}
                    </div>
                    <div className="flex justify-between items-center text-xs">
                         <span className={selectedMatch?.id === match.id ? 'text-white font-medium' : 'text-gray-300'}>{match.teams[0]}</span>
                         <span className="text-gray-500">vs</span>
                         <span className={selectedMatch?.id === match.id ? 'text-white font-medium' : 'text-gray-300'}>{match.teams[1]}</span>
                    </div>
                </div>
            ))}
         </div>
      </div>

      {/* 3. BIRTHDAY WIDGET */}
      <div className="glass-panel p-5 rounded-3xl flex-shrink-0">
         <h3 className="text-gray-400 text-sm font-medium mb-4 flex items-center gap-2"><Gift size={16} className="text-pink-400" /> Upcoming Birthdays</h3>
         <div className="space-y-3">
           {birthdays.map((bday, index) => (
               <motion.div whileHover={{ x: 5 }} key={index} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-all cursor-pointer group">
                  <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden border border-white/10"><img src={bday.avatar_url} className="w-full h-full object-cover"/></div>
                  <div className="flex-1"><p className="text-sm font-medium text-gray-200 group-hover:text-pink-300 transition-colors">{bday.full_name}</p><p className="text-xs text-gray-500">{bday.diffDays === 0 ? 'Today! 🎉' : `${bday.diffDays} days left`}</p></div>
               </motion.div>
           ))}
           {birthdays.length === 0 && <p className="text-xs text-center py-4 text-gray-500">No upcoming birthdays</p>}
         </div>
      </div>

    </div>
  )
}