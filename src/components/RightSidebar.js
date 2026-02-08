'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Gift, MapPin, Activity, Trophy } from "lucide-react"
import { motion } from "framer-motion"
import DiscordWidget from './DiscordWidget'

export default function RightSidebar({ birthdays }) {
  const supabase = createClient()
  const [onlineUsers, setOnlineUsers] = useState([])
  const [allProfiles, setAllProfiles] = useState([])
  
  // Cricket States
  const [matches, setMatches] = useState([])
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [loadingCricket, setLoadingCricket] = useState(true)

  // --- CRICKET DATA FETCHING ---
  useEffect(() => {
    const fetchCricket = async () => {
        try {
            const res = await fetch('/api/cricket')
            const data = await res.json()
            
            if (data.status === "success" && data.data) {
                const sortedMatches = data.data.sort((a, b) => {
                    if (a.matchStarted && !a.matchEnded) return -1
                    return 1
                });
                setMatches(sortedMatches)
                if (!selectedMatch && sortedMatches.length > 0) {
                    setSelectedMatch(sortedMatches[0])
                }
            }
        } catch (error) {
            console.error("Cricket Error:", error)
        } finally {
            setLoadingCricket(false)
        }
    }
    fetchCricket()
    const interval = setInterval(fetchCricket, 60000)
    return () => clearInterval(interval)
  }, []) 

  // --- PROFILES ---
  useEffect(() => {
    const getProfiles = async () => { const { data } = await supabase.from('profiles').select('*'); if (data) setAllProfiles(data) }
    getProfiles()
  }, [])
  useEffect(() => {
    const channel = supabase.channel('online-users')
    channel.on('presence', { event: 'sync' }, () => { const newState = channel.presenceState(); const users = []; for (let id in newState) { users.push(newState[id][0]) } setOnlineUsers(users) }).subscribe(async (status) => { if (status === 'SUBSCRIBED') { const { data: { user } } = await supabase.auth.getUser(); if (user) { await channel.track({ online_at: new Date().toISOString(), user_id: user.id }) } } })
    return () => { supabase.removeChannel(channel) }
  }, [])
  
  const getLocalTime = (timezone) => { try { return new Date().toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: true }) } catch { return 'Time' } }
  const isNight = (timezone) => { try { const hour = new Date().toLocaleTimeString('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }); return hour < 6 || hour > 18 } catch { return false } }

  return (
    <div className="md:col-span-3 flex flex-col h-full overflow-y-auto gap-6 scrollbar-hide pb-4">
      
      {/* 1. GANG STATUS */}
      <div className="glass-panel p-5 rounded-3xl flex-shrink-0 border border-white/10 bg-[#050505]/50">
         <h3 className="text-gray-400 text-sm font-medium mb-4 flex items-center gap-2"><span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>Gang Status</h3>
         <div className="space-y-4">
           {allProfiles.map((user) => {
               const isOnline = onlineUsers.find(u => u.user_id === user.id); const localTime = getLocalTime(user.timezone || 'Asia/Colombo'); const nightMode = isNight(user.timezone || 'Asia/Colombo')
               return (<motion.div whileHover={{ scale: 1.02 }} key={user.id} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${isOnline ? 'bg-white/10 border-green-500/30' : 'bg-transparent border-white/5 opacity-60'}`}><div className="relative"><div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden border border-white/10"><img src={user.avatar_url} className="w-full h-full object-cover"/></div>{isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-black rounded-full"></div>}</div><div className="flex-1"><div className="flex justify-between items-center"><p className="text-sm font-bold text-gray-200">{user.full_name?.split(' ')[0]}</p><p className={`text-xs font-mono ${nightMode ? 'text-blue-300' : 'text-yellow-300'}`}>{localTime}</p></div><div className="flex items-center gap-1 mt-0.5"><MapPin size={10} className="text-gray-500"/><p className="text-[10px] text-gray-400">{user.city || 'Unknown'}</p></div></div></motion.div>)
           })}
         </div>
      </div>

      {/* 2. ★ CRICKET WIDGET (FIXED HEIGHT & SCROLLABLE) ★ */}
      {/* වෙනස්කම: h-[400px] දැම්මා (උස සීමා කළා) */}
      <div className="glass-panel rounded-3xl flex-shrink-0 relative overflow-hidden flex flex-col h-[400px] border border-white/10">
         
         {/* Top Section (Fixed Scoreboard) */}
         <div className="p-4 bg-gradient-to-b from-blue-900/40 to-transparent border-b border-white/5 relative flex-shrink-0">
            <div className="absolute top-4 right-4 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span><span className="text-[10px] text-red-400 font-bold tracking-wider">LIVE</span></div>
            <div className="flex items-center gap-2 mb-2"><Trophy size={14} className="text-yellow-500"/><span className="text-[10px] text-yellow-500 font-bold tracking-wider">MATCH CENTER</span></div>
            
            {selectedMatch ? (
                <div className="mt-2 animate-in fade-in duration-500">
                    <p className="text-[9px] text-gray-400 mb-2 uppercase tracking-wide truncate pr-8">{selectedMatch.matchType} • {selectedMatch.venue?.split(',')[0]}</p>
                    
                    {/* Compact Scorecard */}
                    <div className="flex flex-col gap-2 bg-black/20 p-3 rounded-xl border border-white/5">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-sm text-white truncate max-w-[100px]">{selectedMatch.teams[0]}</span>
                            <span className="font-mono text-sm font-bold">{selectedMatch.score?.[0]?.r || 0}/{selectedMatch.score?.[0]?.w || 0} <span className="text-[9px] text-gray-500">({selectedMatch.score?.[0]?.o || 0})</span></span>
                        </div>
                        <div className="h-px bg-white/10 w-full"></div>
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-sm text-gray-400 truncate max-w-[100px]">{selectedMatch.teams[1]}</span>
                            <span className="font-mono text-sm font-bold text-gray-400">{selectedMatch.score?.[1]?.r || 0}/{selectedMatch.score?.[1]?.w || 0} <span className="text-[9px] text-gray-500">({selectedMatch.score?.[1]?.o || 0})</span></span>
                        </div>
                    </div>
                    <p className="text-[10px] text-blue-300 mt-2 font-medium text-center truncate">{selectedMatch.status}</p>
                </div>
            ) : (
                <div className="py-8 text-center text-gray-500 text-xs flex flex-col items-center">
                    {loadingCricket ? <Activity className="animate-spin mb-2 text-blue-500"/> : <Trophy className="mb-2 opacity-50"/>}
                    {loadingCricket ? "Fetching Scores..." : "Select a match"}
                </div>
            )}
         </div>

         {/* Bottom Section (Scrollable Match List) */}
         {/* වෙනස්කම: flex-1 සහ overflow-y-auto */}
         <div className="flex-1 overflow-y-auto bg-[#050505]/30 p-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-700">
            <p className="text-[9px] text-gray-500 px-2 py-1 uppercase tracking-wider font-bold sticky top-0 bg-[#050505]/80 backdrop-blur-sm z-10">All Matches</p>
            {matches.map((match) => (
                <div key={match.id} onClick={() => setSelectedMatch(match)} className={`p-2.5 rounded-xl cursor-pointer transition-all border group ${selectedMatch?.id === match.id ? 'bg-blue-600/20 border-blue-500/50' : 'bg-transparent border-transparent hover:bg-white/5'}`}>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[8px] text-gray-400 uppercase">{match.matchType}</span>
                        {match.matchStarted && !match.matchEnded && <span className="flex items-center gap-1 text-[8px] text-red-400"><span className="w-1 h-1 rounded-full bg-red-500 animate-pulse"></span> LIVE</span>}
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-medium">
                        <span className={`truncate max-w-[80px] ${selectedMatch?.id === match.id ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>{match.teams[0]}</span>
                        <span className="text-gray-600 text-[9px]">VS</span>
                        <span className={`truncate max-w-[80px] ${selectedMatch?.id === match.id ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>{match.teams[1]}</span>
                    </div>
                </div>
            ))}
         </div>
      </div>

      <DiscordWidget />

      <div className="glass-panel p-5 rounded-3xl flex-shrink-0">
         <h3 className="text-gray-400 text-sm font-medium mb-4 flex items-center gap-2"><Gift size={16} className="text-pink-400" /> Upcoming Birthdays</h3>
         <div className="space-y-3">{birthdays.map((bday, index) => (<div key={index} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-all cursor-pointer group"><div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden border border-white/10"><img src={bday.avatar_url} className="w-full h-full object-cover"/></div><div className="flex-1"><p className="text-sm font-medium text-gray-200 group-hover:text-pink-300 transition-colors">{bday.full_name}</p><p className="text-xs text-gray-500">{bday.diffDays === 0 ? 'Today! 🎉' : `${bday.diffDays} days left`}</p></div></div>))}{birthdays.length === 0 && <p className="text-xs text-center py-4 text-gray-500">No upcoming birthdays</p>}</div>
      </div>

    </div>
  )
}