'use client'
import { useState } from 'react'
import { Play, Pause, SkipForward, SkipBack, Music, Plus, X, Link2, List, ChevronUp, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMusic } from '@/hooks/useMusic'

export default function MusicPlayer() {
    const {
        currentSong, isPlaying, setIsPlaying, progress, currentIndex,
        audioRef, handleTimeUpdate, handleEnded,
        nextTrack, prevTrack, addSong, isAdding, songs, playSong
    } = useMusic()

    const [showAddModal, setShowAddModal] = useState(false)
    const [showPlaylist, setShowPlaylist] = useState(false)
    const [newSong, setNewSong] = useState({ title: '', artist: '', url: '', cover: '' })

    const handleAddSong = async () => {
        if (!newSong.title || !newSong.url) return
        const success = await addSong(newSong.title, newSong.artist, newSong.url, newSong.cover)
        if (success) {
            setNewSong({ title: '', artist: '', url: '', cover: '' })
            setShowAddModal(false)
        }
    }

    const track = currentSong

    return (
        <motion.div
            layout
            className="glass-panel rounded-3xl flex-shrink-0 border border-white/10 bg-gradient-to-br from-[#0a0a0a] to-[#111] relative overflow-hidden group"
        >
            {/* Hidden Audio Element */}
            <audio
                ref={audioRef}
                src={track?.url}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
            />

            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute -top-20 -left-20 w-40 h-40 rounded-full blur-3xl transition-all duration-1000 ${isPlaying ? 'bg-purple-500/30 animate-pulse' : 'bg-purple-500/10'}`}></div>
                <div className={`absolute -bottom-20 -right-20 w-40 h-40 rounded-full blur-3xl transition-all duration-1000 ${isPlaying ? 'bg-pink-500/30 animate-pulse' : 'bg-pink-500/10'}`}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            </div>

            {/* Main Player */}
            <div className="p-5 relative z-10">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white/60 text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <Music size={12} className="text-white" />
                        </div>
                        Gang Tunes
                    </h3>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setShowPlaylist(!showPlaylist)}
                            className={`p-2 rounded-xl transition-all ${showPlaylist ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
                            title="Playlist"
                        >
                            <List size={16} />
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/20"
                            title="Add Song"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                </div>

                {/* Now Playing Card */}
                <motion.div
                    layout
                    className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 mb-4"
                >
                    {/* Album Art */}
                    <motion.div
                        key={track?.cover}
                        initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        className="relative"
                    >
                        <div className={`w-16 h-16 rounded-2xl shadow-2xl overflow-hidden border-2 border-white/10 ${isPlaying ? 'animate-[spin_8s_linear_infinite]' : ''}`}>
                            <img
                                src={track?.cover || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop'}
                                alt="Cover"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        {isPlaying && (
                            <div className="absolute -inset-1 rounded-2xl border-2 border-purple-500/50 animate-ping pointer-events-none"></div>
                        )}
                    </motion.div>

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                        <motion.p
                            key={track?.title}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-white font-bold text-base truncate"
                        >
                            {track?.title || 'No Song Selected'}
                        </motion.p>
                        <p className="text-sm text-white/40 truncate">{track?.artist || 'Unknown Artist'}</p>

                        {/* Mini Visualizer */}
                        <div className="flex gap-0.5 mt-2 h-3 items-end">
                            {[...Array(8)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    animate={{ height: isPlaying ? `${Math.random() * 12 + 4}px` : '4px' }}
                                    transition={{ duration: 0.2, repeat: isPlaying ? Infinity : 0, repeatType: 'reverse' }}
                                    className="w-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full"
                                />
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Controls */}
                <div className="flex justify-center items-center gap-6">
                    <button
                        onClick={prevTrack}
                        className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all hover:scale-105 active:scale-95"
                    >
                        <SkipBack size={20} />
                    </button>
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-purple-500/30"
                    >
                        {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                    </button>
                    <button
                        onClick={nextTrack}
                        className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all hover:scale-105 active:scale-95"
                    >
                        <SkipForward size={20} />
                    </button>
                </div>
            </div>

            {/* Expandable Playlist */}
            <AnimatePresence>
                {showPlaylist && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/10 overflow-hidden"
                    >
                        <div className="p-3 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-2 px-2">Queue ({songs.length})</p>
                            <div className="space-y-1">
                                {songs.map((song, index) => (
                                    <motion.button
                                        key={song.id}
                                        whileHover={{ scale: 1.02, x: 4 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => playSong && playSong(index)}
                                        className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all text-left ${currentIndex === index
                                                ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30'
                                                : 'hover:bg-white/5'
                                            }`}
                                    >
                                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
                                            <img src={song.cover || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100&h=100&fit=crop'} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium truncate ${currentIndex === index ? 'text-white' : 'text-white/70'}`}>{song.title}</p>
                                            <p className="text-xs text-white/30 truncate">{song.artist}</p>
                                        </div>
                                        {currentIndex === index && isPlaying && (
                                            <div className="flex gap-0.5 h-3 items-end">
                                                <span className="w-0.5 h-2 bg-purple-500 rounded-full animate-[bounce_0.5s_infinite]"></span>
                                                <span className="w-0.5 h-3 bg-pink-500 rounded-full animate-[bounce_0.7s_infinite]"></span>
                                                <span className="w-0.5 h-2 bg-purple-500 rounded-full animate-[bounce_0.6s_infinite]"></span>
                                            </div>
                                        )}
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Song Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                        onClick={() => setShowAddModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-white font-bold text-lg">Add Song</h3>
                                    <p className="text-xs text-white/40">Share music with your gang</p>
                                </div>
                                <button onClick={() => setShowAddModal(false)} className="p-2 bg-white/5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"><X size={18} /></button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-white/40 uppercase tracking-wide mb-1 block">Song Title *</label>
                                    <input
                                        type="text"
                                        value={newSong.title}
                                        onChange={(e) => setNewSong({ ...newSong, title: e.target.value })}
                                        placeholder="e.g. Manike Mage Hithe"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-white/40 uppercase tracking-wide mb-1 block">Artist</label>
                                    <input
                                        type="text"
                                        value={newSong.artist}
                                        onChange={(e) => setNewSong({ ...newSong, artist: e.target.value })}
                                        placeholder="e.g. Yohani"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-white/40 uppercase tracking-wide mb-1 flex items-center gap-1"><Link2 size={12} /> MP3 URL *</label>
                                    <input
                                        type="url"
                                        value={newSong.url}
                                        onChange={(e) => setNewSong({ ...newSong, url: e.target.value })}
                                        placeholder="https://..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-white/40 uppercase tracking-wide mb-1 block">Cover URL</label>
                                    <input
                                        type="url"
                                        value={newSong.cover}
                                        onChange={(e) => setNewSong({ ...newSong, cover: e.target.value })}
                                        placeholder="https://..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleAddSong}
                                disabled={isAdding || !newSong.title || !newSong.url}
                                className="mt-6 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
                            >
                                {isAdding ? 'Adding...' : '+ Add to Playlist'}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
