import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export function useGang(profile) {
    const [birthdays, setBirthdays] = useState([])
    const [isMyBirthday, setIsMyBirthday] = useState(false)
    const [onlineUsers, setOnlineUsers] = useState([])
    const [allProfiles, setAllProfiles] = useState([])
    const supabase = createClient()

    useEffect(() => {
        if (!profile) return

        // 1. Birthday Check
        if (profile.birthday) {
            const today = new Date()
            const bday = new Date(profile.birthday)
            if (today.getDate() === bday.getDate() && today.getMonth() === bday.getMonth()) {
                setIsMyBirthday(true)
            }
        }

        // 2. Fetch Data (Birthdays & All Profiles)
        const fetchData = async () => {
            // Profiles
            const { data: profiles } = await supabase.from('profiles').select('*')
            if (profiles) setAllProfiles(profiles)

            // Upcoming Birthdays
            if (profiles) {
                const today = new Date()
                const currentYear = today.getFullYear()

                const upcoming = profiles.map(p => {
                    if (!p.birthday) return null

                    const bday = new Date(p.birthday)
                    let nextBday = new Date(currentYear, bday.getMonth(), bday.getDate())

                    if (nextBday < today.setHours(0, 0, 0, 0)) {
                        nextBday.setFullYear(currentYear + 1)
                    }

                    const diffDays = Math.ceil((nextBday - today) / (1000 * 60 * 60 * 24))
                    return { ...p, diffDays, nextBday }
                })
                    .filter(Boolean)
                    .sort((a, b) => a.diffDays - b.diffDays)
                    .slice(0, 3)

                setBirthdays(upcoming)
            }
        }

        fetchData()

        // 3. Online Presence
        const channel = supabase.channel('online-users')
        channel
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState()
                const users = []
                for (let id in newState) {
                    users.push(newState[id][0])
                }
                setOnlineUsers(users)
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        online_at: new Date().toISOString(),
                        user_id: profile.id
                    })
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [profile, supabase])

    return { birthdays, isMyBirthday, onlineUsers, allProfiles }
}

