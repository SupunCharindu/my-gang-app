import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useMusicSync } from './useMusicSync'

// Free ambient sounds + chill music for vibes
const DEFAULT_SONGS = [
    // 🌧️ Ambient Sounds
    {
        id: 'ambient-1',
        title: "Thunderstorm",
        artist: "Ambient",
        cover: "https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?w=300&h=300&fit=crop",
        url: "https://cdn.pixabay.com/audio/2022/05/16/audio_1333dfb194.mp3"
    },
    {
        id: 'ambient-2',
        title: "Rain on Window",
        artist: "Ambient",
        cover: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=300&h=300&fit=crop",
        url: "https://cdn.pixabay.com/audio/2022/02/22/audio_d1718ab41b.mp3"
    },
    {
        id: 'ambient-3',
        title: "Ocean Waves",
        artist: "Ambient",
        cover: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=300&h=300&fit=crop",
        url: "https://cdn.pixabay.com/audio/2022/06/07/audio_b9bd4170e4.mp3"
    },
    {
        id: 'ambient-4',
        title: "Forest Birds",
        artist: "Ambient",
        cover: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=300&h=300&fit=crop",
        url: "https://cdn.pixabay.com/audio/2022/08/04/audio_2dae70c083.mp3"
    },
    {
        id: 'ambient-5',
        title: "Fireplace Crackle",
        artist: "Ambient",
        cover: "https://images.unsplash.com/photo-1543076499-a6133cb932fd?w=300&h=300&fit=crop",
        url: "https://cdn.pixabay.com/audio/2021/11/25/audio_91b32e02f9.mp3"
    },
    // 🎵 Chill Music
    {
        id: 'music-1',
        title: "Lofi Chill",
        artist: "SoundHelix",
        cover: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=300&h=300&fit=crop",
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
    },
    {
        id: 'music-2',
        title: "Night Drive",
        artist: "SoundHelix",
        cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop",
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"
    },
    {
        id: 'music-3',
        title: "Sunset Groove",
        artist: "SoundHelix",
        cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop",
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
    },
]

export function useMusic(profile) {
    const [songs, setSongs] = useState(DEFAULT_SONGS)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const [duration, setDuration] = useState(0)
    const [isAdding, setIsAdding] = useState(false)
    const audioRef = useRef(null)
    const supabase = createClient()

    // Party sync hook
    const sync = useMusicSync(profile)

    // Fetch songs from DB
    const fetchSongs = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('songs')
                .select('*')
                .order('created_at', { ascending: false })

            if (data && data.length > 0) {
                setSongs(data)
            }
        } catch (e) {
            console.log('Using default songs')
        }
    }, [supabase])

    useEffect(() => {
        fetchSongs()

        // Realtime subscription for new songs
        const channel = supabase.channel('songs-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, () => {
                fetchSongs()
            })
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [fetchSongs, supabase])

    // Sync to party state when not DJ
    useEffect(() => {
        if (!sync.partyMode || sync.isDJ || !sync.partyState) return

        // Sync song index
        if (sync.partyState.song_index !== currentIndex) {
            setCurrentIndex(sync.partyState.song_index)
        }

        // Sync playing state
        if (sync.partyState.is_playing !== isPlaying) {
            setIsPlaying(sync.partyState.is_playing)
        }

        // Sync position (with tolerance to avoid constant jumping)
        if (audioRef.current && sync.partyState.position) {
            const currentPos = audioRef.current.currentTime
            const syncPos = sync.partyState.position
            // Only seek if more than 3 seconds off
            if (Math.abs(currentPos - syncPos) > 3) {
                audioRef.current.currentTime = syncPos
            }
        }
    }, [sync.partyState, sync.partyMode, sync.isDJ, currentIndex, isPlaying])

    // Audio control
    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.play().catch(e => console.error("Playback error:", e))
            } else {
                audioRef.current.pause()
            }
        }
    }, [isPlaying, currentIndex])

    useEffect(() => {
        setProgress(0)
        if (isPlaying && audioRef.current) {
            audioRef.current.play().catch(e => console.error(e))
        }
    }, [currentIndex, isPlaying])

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const current = audioRef.current.currentTime
            const dur = audioRef.current.duration || 1
            setProgress((current / dur) * 100)
            setDuration(dur)
        }
    }

    const handleEnded = () => {
        nextTrack()
    }

    // Broadcast-aware controls (DJ broadcasts changes)
    const setIsPlayingWithSync = useCallback((playing) => {
        setIsPlaying(playing)
        if (sync.isDJ && sync.partyMode) {
            const song = songs[currentIndex]
            const position = audioRef.current?.currentTime || 0
            sync.broadcastState(currentIndex, song?.id || '', position, playing)
        }
    }, [sync, currentIndex, songs])

    const nextTrack = useCallback(() => {
        const newIndex = (currentIndex + 1) % songs.length
        setCurrentIndex(newIndex)
        if (sync.isDJ && sync.partyMode) {
            const song = songs[newIndex]
            sync.broadcastState(newIndex, song?.id || '', 0, isPlaying)
        }
    }, [currentIndex, songs, sync, isPlaying])

    const prevTrack = useCallback(() => {
        const newIndex = (currentIndex - 1 + songs.length) % songs.length
        setCurrentIndex(newIndex)
        if (sync.isDJ && sync.partyMode) {
            const song = songs[newIndex]
            sync.broadcastState(newIndex, song?.id || '', 0, isPlaying)
        }
    }, [currentIndex, songs, sync, isPlaying])

    const playSong = useCallback((index) => {
        setCurrentIndex(index)
        setIsPlaying(true)
        if (sync.isDJ && sync.partyMode) {
            const song = songs[index]
            sync.broadcastState(index, song?.id || '', 0, true)
        }
    }, [sync, songs])

    const addSong = async (title, artist, url, cover) => {
        setIsAdding(true)
        try {
            const { error } = await supabase.from('songs').insert([{
                title,
                artist: artist || 'Unknown',
                url,
                cover: cover || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop'
            }])
            if (!error) {
                fetchSongs()
                setIsAdding(false)
                return true
            }
        } catch (e) {
            console.error('Add song error:', e)
        }
        setIsAdding(false)
        return false
    }

    // Delete song from playlist
    const deleteSong = async (songId) => {
        console.log('Attempting to delete song:', songId)
        try {
            const { data, error } = await supabase
                .from('songs')
                .delete()
                .eq('id', songId)
                .select()

            console.log('Delete result:', { data, error })

            if (error) {
                console.error('Delete error:', error)
                return false
            }

            // Adjust current index if needed
            const deletedIndex = songs.findIndex(s => s.id === songId)
            if (deletedIndex !== -1 && deletedIndex < currentIndex) {
                setCurrentIndex(prev => prev - 1)
            } else if (deletedIndex === currentIndex && songs.length > 1) {
                setCurrentIndex(prev => prev >= songs.length - 1 ? 0 : prev)
            }

            // Optimistically update local state
            setSongs(prev => prev.filter(s => s.id !== songId))

            return true
        } catch (e) {
            console.error('Delete song error:', e)
        }
        return false
    }

    // Start party with current song
    const startParty = async () => {
        const song = songs[currentIndex]
        return await sync.startParty(currentIndex, song?.id || '')
    }

    const currentSong = songs[currentIndex] || DEFAULT_SONGS[0]

    return {
        songs,
        currentSong,
        currentIndex,
        isPlaying,
        setIsPlaying: setIsPlayingWithSync,
        progress,
        duration,
        audioRef,
        handleTimeUpdate,
        handleEnded,
        nextTrack,
        prevTrack,
        addSong,
        deleteSong,
        isAdding,
        playSong,
        // Party sync
        sync,
        startParty
    }
}

