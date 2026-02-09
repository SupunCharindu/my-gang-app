import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'

export function useChat(profile) {
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const chatEndRef = useRef(null)

    const supabase = createClient()

    useEffect(() => {
        if (!profile) return

        const fetchMessages = async () => {
            const { data: oldMessages } = await supabase
                .from('messages')
                .select('*, profiles(full_name, avatar_url)')
                .order('created_at', { ascending: true })

            if (oldMessages) setMessages(oldMessages)
        }

        fetchMessages()

        const chatChannel = supabase.channel('realtime-chat')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
                if (payload.new.user_id === profile.id) return

                const { data: senderProfile } = await supabase
                    .from('profiles')
                    .select('full_name, avatar_url')
                    .eq('id', payload.new.user_id)
                    .single()

                setMessages((prev) => [...prev, { ...payload.new, profiles: senderProfile }])
                setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
            })
            .subscribe()

        return () => {
            supabase.removeChannel(chatChannel)
        }
    }, [profile])


    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (!newMessage.trim() || !profile) return

        const text = newMessage
        setNewMessage('')

        // Optimistic update
        const optimisticMsg = {
            id: Date.now(),
            text: text,
            user_id: profile.id,
            created_at: new Date().toISOString(),
            profiles: { full_name: profile.full_name, avatar_url: profile.avatar_url }
        }

        setMessages((prev) => [...prev, optimisticMsg])
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)

        const { error } = await supabase.from('messages').insert([{ text: text, user_id: profile.id }])
        if (error) console.error("Error sending:", error)
    }

    return {
        messages,
        newMessage, setNewMessage,
        chatEndRef,
        handleSendMessage
    }
}
