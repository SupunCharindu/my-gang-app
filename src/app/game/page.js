'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, Users } from 'lucide-react'

// OMI DECK (32 Cards: 7 to Ace)
const SUITS = ['♠️', '♥️', '♣️', '♦️']
const RANKS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A']

const generateDeck = () => {
  let deck = []
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push({ id: `${rank}${suit}`, rank, suit, color: (suit === '♥️' || suit === '♦️') ? 'text-red-500' : 'text-black' })
    })
  })
  return deck.sort(() => Math.random() - 0.5) // Shuffle
}

export default function OmiGame() {
  const [user, setUser] = useState(null)
  const [players, setPlayers] = useState({})
  const [myHand, setMyHand] = useState([])
  const [tableCards, setTableCards] = useState([])
  const [gameStatus, setGameStatus] = useState('waiting') // waiting, playing

  const router = useRouter()
  const supabase = createClient()

  // 1. Initial Setup
  useEffect(() => {
    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setUser(profile)

      // Join the Game Channel
      const channel = supabase.channel('omi-room')
      
      channel
        .on('broadcast', { event: 'player-join' }, ({ payload }) => {
            setPlayers(prev => ({ ...prev, [payload.id]: payload }))
        })
        .on('broadcast', { event: 'deal-cards' }, ({ payload }) => {
            // Find my cards from the dealt payload
            if (payload.hands[session.user.id]) {
                setMyHand(payload.hands[session.user.id])
                setGameStatus('playing')
                setTableCards([])
            }
        })
        .on('broadcast', { event: 'play-card' }, ({ payload }) => {
            setTableCards(prev => [...prev, payload])
        })
        .on('broadcast', { event: 'reset-table' }, () => {
            setTableCards([])
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                // I joined, tell everyone
                if (profile) {
                    await channel.send({
                        type: 'broadcast',
                        event: 'player-join',
                        payload: { id: profile.id, name: profile.full_name, avatar: profile.avatar_url }
                    })
                }
            }
        })

        return () => supabase.removeChannel(channel)
    }
    setup()
  }, [])

  // 2. Game Logic Functions
  const handleDeal = async () => {
    const deck = generateDeck()
    const hands = {}
    const playerIds = Object.keys(players)
    
    // Distribute 8 cards to first 4 players
    // Note: If playing alone for testing, it just gives you cards
    if (playerIds.length === 0 && user) {
        hands[user.id] = deck.slice(0, 8)
    } else {
        playerIds.slice(0, 4).forEach((pid, index) => {
            hands[pid] = deck.slice(index * 8, (index + 1) * 8)
        })
    }

    await supabase.channel('omi-room').send({
        type: 'broadcast',
        event: 'deal-cards',
        payload: { hands }
    })
  }

  const playCard = async (card) => {
    if (gameStatus !== 'playing') return

    // Remove from my hand
    setMyHand(prev => prev.filter(c => c.id !== card.id))

    // Send to table
    if (user) {
        await supabase.channel('omi-room').send({
            type: 'broadcast',
            event: 'play-card',
            payload: { card, player: user.full_name }
        })
    }
  }

  const clearTable = async () => {
    await supabase.channel('omi-room').send({ type: 'broadcast', event: 'reset-table' })
  }

  return (
    <div className="min-h-screen bg-green-800 text-white flex flex-col relative overflow-hidden">
      
      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-black/20 backdrop-blur-md z-10">
        <button onClick={() => router.push('/')} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            <ArrowLeft size={24} />
        </button>
        <h1 className="font-black text-xl tracking-widest text-yellow-400 drop-shadow-md">OMI ARENA</h1>
        <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/10">
            <Users size={16} className="text-gray-300" /> 
            <span className="font-bold text-sm">{Object.keys(players).length}</span>
        </div>
      </div>

      {/* GAME TABLE (CENTER) */}
      <div className="flex-1 flex flex-col items-center justify-center relative p-4">
         
         {/* Green Felt Texture */}
         <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-600 to-green-900"></div>

         {/* The Played Cards Area */}
         <div className="w-64 h-64 md:w-80 md:h-80 border-8 border-yellow-600/30 rounded-full bg-green-900/40 backdrop-blur-sm flex items-center justify-center relative shadow-2xl z-0">
            {tableCards.length === 0 && <span className="text-white/30 text-xs uppercase font-bold tracking-widest animate-pulse">Waiting for move...</span>}
            
            {tableCards.map((move, i) => (
                <div key={i} className="absolute transition-all duration-300 animate-in zoom-in fade-in slide-in-from-bottom-4" style={{ transform: `rotate(${i * 15 - 15}deg) translate(${i * 2}px, ${i * -2}px)` }}>
                    <div className={`w-20 h-28 bg-white rounded-lg shadow-2xl flex flex-col items-center justify-center border border-gray-300 ${move.card.color}`}>
                        <span className="text-2xl font-black">{move.card.rank}</span>
                        <span className="text-3xl">{move.card.suit}</span>
                    </div>
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] bg-black/80 text-white px-2 py-0.5 rounded-full whitespace-nowrap shadow-md border border-white/10">
                        {move.player?.split(' ')[0]}
                    </span>
                </div>
            ))}
         </div>

         {/* Action Buttons */}
         <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
            <button onClick={handleDeal} className="bg-yellow-500 hover:bg-yellow-400 text-black font-black px-4 py-2 rounded-xl shadow-lg text-xs uppercase tracking-wider transition-transform active:scale-95 flex items-center gap-2">
                <RefreshCw size={14} /> Deal
            </button>
            <button onClick={clearTable} className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-xl shadow-lg text-xs uppercase tracking-wider transition-transform active:scale-95">
                Clear
            </button>
         </div>
      </div>

      {/* MY HAND (BOTTOM) */}
      <div className="h-48 bg-gradient-to-t from-black/80 to-transparent p-4 flex items-end justify-center overflow-x-auto overflow-y-hidden z-20 w-full">
         <div className="flex -space-x-8 md:-space-x-4 pb-4 px-8 min-w-max">
            {myHand.length === 0 ? (
                <div className="text-center text-gray-400 text-sm font-medium bg-black/40 px-6 py-2 rounded-full border border-white/10">
                    Waiting for deal...
                </div>
            ) : (
                myHand.map((card) => (
                    <button 
                        key={card.id} 
                        onClick={() => playCard(card)}
                        className={`relative w-24 h-36 bg-white rounded-xl shadow-2xl border border-gray-300 flex flex-col items-center justify-between p-2 transform hover:-translate-y-10 hover:rotate-2 transition-all duration-300 hover:z-50 hover:shadow-orange-500/20 group ${card.color}`}
                    >
                        <div className="text-lg font-bold self-start leading-none">{card.rank}<br/><span className="text-sm">{card.suit}</span></div>
                        <div className="text-4xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-100 transition-opacity">{card.suit}</div>
                        <div className="text-lg font-bold self-end rotate-180 leading-none">{card.rank}<br/><span className="text-sm">{card.suit}</span></div>
                    </button>
                ))
            )}
         </div>
      </div>

    </div>
  )
}