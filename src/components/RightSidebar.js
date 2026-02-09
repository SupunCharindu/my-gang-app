'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Gift, MapPin, Gamepad2, Play, Clock, ExternalLink, Youtube, Clapperboard, Globe, Sparkles, Heart } from "lucide-react"
import { motion } from "framer-motion"
import DiscordWidget from './DiscordWidget'
import MusicPlayer from './MusicPlayer'

// Shared Widget Wrapper Component
function WidgetCard({ children, className = "" }) {
    return (
        <div className={`p-4 rounded-2xl border border-white/[0.06] bg-[#0a0a0a] ${className}`}>
            {children}
        </div>
    )
}

function WidgetTitle({ icon: Icon, iconColor = "text-gray-400", children, badge }) {
    return (
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-white/50 text-[11px] font-bold uppercase tracking-[0.12em] flex items-center gap-2">
                {typeof Icon === 'function' ? <Icon /> : <Icon size={14} className={iconColor} />}
                {children}
            </h3>
            {badge}
        </div>
    )
}

// Quick Links Data
const quickLinks = [
    {
        name: 'YouTube',
        icon: Youtube,
        url: 'https://youtube.com',
        color: 'bg-red-500/10 text-red-400 hover:bg-red-500/20',
        gradient: 'from-red-500 to-orange-500'
    },
    {
        name: 'ICC TV',
        icon: Clapperboard,
        url: 'https://www.icc-cricket.com/icc-tv/what-s-on-icctv',
        color: 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20',
        gradient: 'from-rose-600 to-red-600'
    },
    {
        name: 'Cricbuzz',
        icon: Globe,
        url: 'https://cricbuzz.com',
        color: 'bg-green-500/10 text-green-400 hover:bg-green-500/20',
        gradient: 'from-green-500 to-emerald-500'
    },
]

export default function RightSidebar({ birthdays, onlineUsers, allProfiles }) {
    const router = useRouter()

    const getLocalTime = (timezone) => {
        try {
            return new Date().toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: true })
        } catch {
            return 'Time'
        }
    }
    const isNight = (timezone) => {
        try {
            const hour = parseInt(new Date().toLocaleTimeString('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }));
            return hour < 6 || hour > 18
        } catch {
            return false
        }
    }

    // Count online users
    const onlineCount = onlineUsers?.length || 0

    return (
        <div className="flex flex-col h-full overflow-y-auto gap-3 scrollbar-thin px-2 md:px-0 pb-6">

            {/* ========== 1. MUSIC + BIRTHDAYS ROW ========== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Gang Tunes */}
                <div className="md:col-span-1">
                    <MusicPlayer />
                </div>

                {/* Birthdays Mini Widget */}
                <div className="p-4 rounded-2xl border border-white/[0.06] bg-[#0a0a0a] md:col-span-1">
                    <h3 className="text-white/50 text-[11px] font-bold uppercase tracking-[0.12em] flex items-center gap-2 mb-3">
                        <Gift size={14} className="text-pink-400" />
                        Birthdays
                    </h3>
                    <div className="space-y-2">
                        {birthdays?.slice(0, 3).map((bday, index) => (
                            <div
                                key={index}
                                className={`flex items-center gap-2 p-2 rounded-xl ${bday.diffDays === 0 ? 'bg-pink-500/10' : 'bg-white/[0.02]'
                                    }`}
                            >
                                <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden border border-white/10 flex-shrink-0">
                                    <img src={bday.avatar_url} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-200 truncate">{bday.full_name?.split(' ')[0]}</p>
                                    <p className="text-[10px] text-gray-500">
                                        {bday.diffDays === 0 ? (
                                            <span className="text-pink-400">🎉 Today!</span>
                                        ) : (
                                            `${bday.diffDays}d`
                                        )}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {(!birthdays || birthdays.length === 0) && (
                            <p className="text-[10px] text-center py-4 text-gray-500">No upcoming</p>
                        )}
                    </div>
                </div>
            </div>

            {/* ========== 2. GAME ZONE (BIGGER) ========== */}
            <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => router.push('/game')}
                className="w-full py-8 px-6 rounded-2xl relative overflow-hidden bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-500/20 border border-white/10"
            >
                {/* Animated Background */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-50"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-400/20 blur-3xl rounded-full translate-y-1/2 -translate-x-1/2"></div>

                <div className="relative z-10 flex items-center justify-between">
                    <div className="text-left">
                        <div className="flex items-center gap-2 mb-2">
                            <Gamepad2 size={20} />
                            <span className="text-[11px] bg-white/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wide">Card Game</span>
                        </div>
                        <h4 className="font-black text-4xl tracking-tight leading-none">OMI</h4>
                        <p className="text-[13px] text-white/70 mt-2">Tap to play with your gang!</p>
                    </div>
                    <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                        <Play size={40} fill="currentColor" className="ml-1" />
                    </div>
                </div>
            </motion.button>

            {/* ========== 3. GANG STATUS ========== */}
            <WidgetCard>
                <WidgetTitle
                    icon={() => (
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                    )}
                    badge={<span className="text-[10px] text-emerald-400 font-semibold">{onlineCount} online</span>}
                >
                    Gang Status
                </WidgetTitle>

                <div className="space-y-2">
                    {allProfiles?.map((user) => {
                        const isOnline = onlineUsers?.some(u => u.user_id === user.id)
                        const localTime = getLocalTime(user.timezone || 'Asia/Colombo')
                        const nightMode = isNight(user.timezone || 'Asia/Colombo')

                        return (
                            <div
                                key={user.id}
                                className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${isOnline
                                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                                    : 'opacity-40 border border-transparent'
                                    }`}
                            >
                                <div className="relative flex-shrink-0">
                                    <div className={`w-10 h-10 rounded-full bg-gray-800 overflow-hidden border-2 ${isOnline ? 'border-emerald-500/50' : 'border-white/10'
                                        }`}>
                                        <img src={user.avatar_url} className="w-full h-full object-cover" />
                                    </div>
                                    {isOnline && (
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0a0a0a] rounded-full"></div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-gray-200 truncate">{user.full_name?.split(' ')[0]}</p>
                                        {isOnline && (
                                            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-medium">ONLINE</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5">
                                        <MapPin size={9} />
                                        <span className="truncate">{user.city || 'Unknown'}</span>
                                    </div>
                                </div>
                                <div className={`text-[10px] font-mono px-2 py-1 rounded-lg flex items-center gap-1 ${nightMode ? 'bg-blue-500/10 text-blue-300' : 'bg-amber-500/10 text-amber-300'
                                    }`}>
                                    <Clock size={9} />
                                    {localTime}
                                </div>
                            </div>
                        )
                    })}
                    {(!allProfiles || allProfiles.length === 0) && (
                        <p className="text-xs text-center py-4 text-gray-500">No gang members found</p>
                    )}
                </div>
            </WidgetCard>

            {/* ========== 4. QUICK LINKS ========== */}
            <WidgetCard>
                <WidgetTitle icon={Sparkles} iconColor="text-purple-400">
                    Quick Links
                </WidgetTitle>

                <div className="grid grid-cols-3 gap-2">
                    {quickLinks.map((link, index) => (
                        <motion.a
                            key={index}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${link.color}`}
                        >
                            <link.icon size={20} />
                            <span className="text-[10px] font-medium">{link.name}</span>
                        </motion.a>
                    ))}
                </div>

                {/* Fun Fact / Tip of the Day */}
                <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/10">
                        <Heart size={14} className="text-pink-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Gang Tip</p>
                            <p className="text-xs text-gray-300 leading-relaxed">
                                Brothers support each other. Check in on your gang today! 💪
                            </p>
                        </div>
                    </div>
                </div>
            </WidgetCard>

            {/* ========== 5. DISCORD ========== */}
            <DiscordWidget />

        </div>
    )
}