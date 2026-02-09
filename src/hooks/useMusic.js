import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'

// Fallback songs if DB is empty or fails
const DEFAULT_SONGS = [
    { id: 'default-1', title: "Gang Theme", artist: "Beats", cover: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=300&h=300&fit=crop", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { id: 'default-2', title: "Chill Vibes", artist: "Unknown", cover: "https://images.unsplash.com/photo-1459749411177-2a2f52983cbe?w=300&h=300&fit=crop", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
]

export function useMusic() {
    const [songs, setSongs] = useState(DEFAULT_SONGS)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const [isAdding, setIsAdding] = useState(false)
    const audioRef = useRef(null)
    const supabase = createClient()

    // Fetch songs from DB
    const fetchSongs = async () => {
        const { data, error } = await supabase
            .from('songs')
            .select('*')
            .order('created_at', { ascending: false })

        if (data && data.length > 0) {
            setSongs(data)
        }
    }

    useEffect(() => {
        fetchSongs()

        // Realtime subscription for new songs
        const channel = supabase.channel('songs-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, () => {
                fetchSongs()
            })
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [])

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
    }, [currentIndex])

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const current = audioRef.current.currentTime
            const duration = audioRef.current.duration || 1
            setProgress((current / duration) * 100)
        }
    }

    const handleEnded = () => {
        nextTrack()
    }

    const nextTrack = () => {
        setCurrentIndex((prev) => (prev + 1) % songs.length)
    }

    const prevTrack = () => {
        setCurrentIndex((prev) => (prev - 1 + songs.length) % songs.length)
    }

    const addSong = async (title, artist, url, cover) => {
        setIsAdding(true)
        const { error } = await supabase.from('songs').insert([{
            title,
            artist: artist || 'Unknown',
            url,
            cover: cover || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop'
        }])
        setIsAdding(false)
        if (!error) {
            fetchSongs()
            return true
        }
        return false
    }

    const playSong = (index) => {
        setCurrentIndex(index)
        setIsPlaying(true)
    }

    const currentSong = songs[currentIndex] || DEFAULT_SONGS[0]

    return {
        songs,
        currentSong,
        currentIndex,
        isPlaying, setIsPlaying,
        progress,
        audioRef,
        handleTimeUpdate,
        handleEnded,
        nextTrack,
        prevTrack,
        addSong,
        isAdding,
        playSong
    }
}
