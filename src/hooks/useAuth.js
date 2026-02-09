import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export function useAuth() {
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const getSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession()
                if (error || !session) {
                    router.replace('/login')
                    return
                }

                const { data: userProfile, error: profileError } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()

                if (profileError || !userProfile) {
                    router.replace('/onboarding')
                    return
                }

                setProfile(userProfile)
            } catch (error) {
                console.error('Auth Error:', error)
                router.replace('/login')
            } finally {
                setLoading(false)
            }
        }

        getSession()
    }, [router, supabase])

    return { profile, loading }
}
