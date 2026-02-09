import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'

export function usePosts(profile, showToast) {
    const [posts, setPosts] = useState([])
    const [loadingPosts, setLoadingPosts] = useState(true)
    const [newPostContent, setNewPostContent] = useState('')
    const [isPosting, setIsPosting] = useState(false)
    const [likedPosts, setLikedPosts] = useState(new Set())
    const [selectedFile, setSelectedFile] = useState(null)
    const [previewUrl, setPreviewUrl] = useState(null)
    const [comments, setComments] = useState({})
    const [expandedPostId, setExpandedPostId] = useState(null)
    const [newComment, setNewComment] = useState('')
    const [replyingTo, setReplyingTo] = useState(null)
    const [confirmDeleteId, setConfirmDeleteId] = useState(null)

    const fileInputRef = useRef(null)
    const supabase = createClient()

    // Fetch Posts
    const fetchPosts = async () => {
        if (!profile) return
        try {
            const { data: postsData } = await supabase
                .from('posts')
                .select(`*, profiles(full_name, avatar_url), likes(user_id)`)
                .order('created_at', { ascending: false })

            if (postsData) {
                setPosts(postsData)
                // Update liked posts set
                const myLikes = new Set()
                postsData.forEach(post => {
                    if (post.likes.some(like => like.user_id === profile.id)) {
                        myLikes.add(post.id)
                    }
                })
                setLikedPosts(myLikes)
            }
        } catch (error) {
            console.error('Error fetching posts:', error)
        } finally {
            setLoadingPosts(false)
        }
    }

    // Initial Fetch & Realtime Subscription
    useEffect(() => {
        if (!profile) return
        fetchPosts()

        const likeChannel = supabase.channel('realtime-likes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => {
                fetchPosts()
            })
            .subscribe()

        const commentChannel = supabase.channel('realtime-comments')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
                if (payload.eventType === 'INSERT' && payload.new.post_id === expandedPostId) {
                    fetchComments(expandedPostId)
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(likeChannel)
            supabase.removeChannel(commentChannel)
        }
    }, [profile, expandedPostId])

    // Post Actions
    const handleCreatePost = async () => {
        if (!newPostContent.trim() && !selectedFile) return
        setIsPosting(true)

        let imageUrl = null
        if (selectedFile) {
            const fileExt = selectedFile.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, selectedFile)
            if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(filePath)
                imageUrl = publicUrl
            } else {
                if (showToast) showToast('Upload failed', 'error')
                setIsPosting(false)
                return
            }
        }

        const { error } = await supabase.from('posts').insert([{
            content: newPostContent,
            user_id: profile.id,
            image_url: imageUrl
        }])

        if (!error) {
            setNewPostContent('')
            setSelectedFile(null)
            setPreviewUrl(null)
            fetchPosts()
            if (showToast) showToast('Posted!', 'success')
        }
        setIsPosting(false)
    }

    const handleDeletePost = async () => {
        if (!confirmDeleteId || !profile) return

        // Delete the post - RLS should handle authorization
        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', confirmDeleteId)
            .eq('user_id', profile.id) // Only delete if user owns the post

        if (!error) {
            setPosts(posts.filter(p => p.id !== confirmDeleteId))
            if (showToast) showToast('Post deleted!', 'success')
        } else {
            console.error('Delete error:', error)
            if (showToast) showToast('Failed to delete. You can only delete your own posts.', 'error')
        }
        setConfirmDeleteId(null)
    }

    const handleLike = async (postId) => {
        const isLiked = likedPosts.has(postId)
        const newLikedPosts = new Set(likedPosts)

        if (isLiked) {
            newLikedPosts.delete(postId)
            await supabase.from('likes').delete().match({ post_id: postId, user_id: profile.id })
        } else {
            newLikedPosts.add(postId)
            await supabase.from('likes').insert([{ post_id: postId, user_id: profile.id }])
        }
        setLikedPosts(newLikedPosts)
        fetchPosts()
    }

    const handleFileSelect = (e) => {
        const file = e.target.files[0]
        if (file) {
            setSelectedFile(file)
            setPreviewUrl(URL.createObjectURL(file))
        }
    }

    // Comment Actions
    const fetchComments = async (postId) => {
        const { data } = await supabase
            .from('comments')
            .select('*, profiles(full_name, avatar_url)')
            .eq('post_id', postId)
            .order('created_at', { ascending: true })

        if (data) setComments(prev => ({ ...prev, [postId]: data }))
    }

    const handlePostComment = async (postId) => {
        if (!newComment.trim()) return
        const { error } = await supabase.from('comments').insert([{
            content: newComment,
            user_id: profile.id,
            post_id: postId,
            parent_id: replyingTo ? replyingTo.id : null
        }])

        if (!error) {
            setNewComment('')
            setReplyingTo(null)
            fetchComments(postId)
        }
    }

    return {
        posts,
        loadingPosts,
        newPostContent, setNewPostContent,
        isPosting,
        likedPosts,
        selectedFile, setSelectedFile,
        previewUrl, setPreviewUrl,
        fileInputRef,
        handleCreatePost,
        handleDeletePost,
        handleLike,
        handleFileSelect,
        // Comments
        comments,
        expandedPostId, setExpandedPostId,
        newComment, setNewComment,
        replyingTo, setReplyingTo,
        fetchComments,
        handlePostComment,
        // Delete
        confirmDeleteId, setConfirmDeleteId
    }
}
