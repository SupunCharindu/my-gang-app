'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

// Fixed ID for the singleton party state
const PARTY_STATE_ID = 'gang-party-state'

export function useMusicSync(profile) {
    const [partyMode, setPartyMode] = useState(false)
    const [partyState, setPartyState] = useState(null)
    const [listeners, setListeners] = useState([])
    const [isDJ, setIsDJ] = useState(false)
    const supabase = createClient()

    // Fetch current party state
    const fetchPartyState = useCallback(async () => {
        const { data } = await supabase
            .from('music_sync')
            .select('*, profiles(*)')
            .eq('id', PARTY_STATE_ID)
            .single()

        if (data) {
            setPartyState(data)
            setPartyMode(data.is_active)
            setIsDJ(data.dj_user_id === profile?.id)
        } else {
            setPartyMode(false)
            setPartyState(null)
            setIsDJ(false)
        }
    }, [profile?.id, supabase])

    // Subscribe to party state changes & presence
    useEffect(() => {
        if (!profile?.id) return

        fetchPartyState()

        // Realtime subscription for party state changes
        const stateChannel = supabase
            .channel('music-sync-state')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'music_sync',
                filter: `id=eq.${PARTY_STATE_ID}`
            }, (payload) => {
                if (payload.eventType === 'DELETE') {
                    setPartyMode(false)
                    setPartyState(null)
                    setIsDJ(false)
                } else {
                    fetchPartyState()
                }
            })
            .subscribe()

        // Presence channel for listeners
        const presenceChannel = supabase.channel('music-party-presence')
        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState()
                const users = []
                for (const key in state) {
                    users.push(...state[key])
                }
                setListeners(users)
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED' && partyMode) {
                    await presenceChannel.track({
                        user_id: profile.id,
                        full_name: profile.full_name,
                        avatar_url: profile.avatar_url,
                        joined_at: new Date().toISOString()
                    })
                }
            })

        return () => {
            supabase.removeChannel(stateChannel)
            supabase.removeChannel(presenceChannel)
        }
    }, [profile, supabase, fetchPartyState, partyMode])

    // Start a new party (become DJ)
    const startParty = async (songIndex, songId) => {
        if (!profile?.id) return false

        const { error } = await supabase
            .from('music_sync')
            .upsert({
                id: PARTY_STATE_ID,
                song_id: songId,
                song_index: songIndex,
                position: 0,
                is_playing: false,
                is_active: true,
                dj_user_id: profile.id,
                updated_at: new Date().toISOString()
            })

        if (!error) {
            setPartyMode(true)
            setIsDJ(true)
            return true
        }
        return false
    }

    // End the party
    const endParty = async () => {
        await supabase
            .from('music_sync')
            .update({ is_active: false })
            .eq('id', PARTY_STATE_ID)

        setPartyMode(false)
        setIsDJ(false)
    }

    // Leave party (as listener)
    const leaveParty = () => {
        setPartyMode(false)
    }

    // Take DJ control
    const becomeDJ = async () => {
        if (!profile?.id || !partyState) return false

        const { error } = await supabase
            .from('music_sync')
            .update({
                dj_user_id: profile.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', PARTY_STATE_ID)

        if (!error) {
            setIsDJ(true)
            return true
        }
        return false
    }

    // Broadcast current playback state (called by DJ)
    const broadcastState = async (songIndex, songId, position, isPlaying) => {
        if (!isDJ) return

        await supabase
            .from('music_sync')
            .update({
                song_id: songId,
                song_index: songIndex,
                position: position,
                is_playing: isPlaying,
                updated_at: new Date().toISOString()
            })
            .eq('id', PARTY_STATE_ID)
    }

    return {
        // State
        partyMode,
        partyState,
        isDJ,
        listeners,
        djProfile: partyState?.profiles || null,

        // Actions
        startParty,
        endParty,
        leaveParty,
        becomeDJ,
        broadcastState,
        fetchPartyState
    }
}
