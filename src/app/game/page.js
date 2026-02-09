'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Crown, Users, Trophy, Zap, Play, RotateCcw, Volume2, VolumeX, Bot, Music2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ═══════════════════════════════════════════════════════════════════════
// 🎴 OMI - SRI LANKA'S BEST CARD GAME
// ═══════════════════════════════════════════════════════════════════════

// --- CONSTANTS ---
const SUITS = {
    '♠': { color: '#1e3a5f', bg: 'from-slate-800 to-slate-900', glow: 'rgba(30,58,95,0.5)', name: 'Spades' },
    '♥': { color: '#dc2626', bg: 'from-red-500 to-rose-600', glow: 'rgba(220,38,38,0.5)', name: 'Hearts' },
    '♣': { color: '#166534', bg: 'from-green-700 to-emerald-800', glow: 'rgba(22,101,52,0.5)', name: 'Clubs' },
    '♦': { color: '#ea580c', bg: 'from-orange-500 to-amber-600', glow: 'rgba(234,88,12,0.5)', name: 'Diamonds' }
}
const RANKS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A']
const RANK_POWER = { '7': 0, '8': 1, '9': 2, '10': 3, 'J': 4, 'Q': 5, 'K': 6, 'A': 7 }

// Bot players for testing
const BOT_PLAYERS = [
    { id: 'bot-1', name: 'Kamal 🤖', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=kamal', isBot: true },
    { id: 'bot-2', name: 'Nimal 🤖', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=nimal', isBot: true },
    { id: 'bot-3', name: 'Saman 🤖', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=saman', isBot: true },
    { id: 'bot-4', name: 'Ruwan 🤖', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ruwan', isBot: true }
]

// Bot AI - Choose best card to play
const botChooseCard = (hand, tableCards, trumpSuit) => {
    // Get valid moves
    const validCards = hand.filter(card => isValidMove(card, hand, tableCards, trumpSuit))
    if (validCards.length === 0) return hand[0]

    // If leading, play highest non-trump
    if (tableCards.length === 0) {
        const nonTrumps = validCards.filter(c => c.suit !== trumpSuit)
        if (nonTrumps.length > 0) {
            return nonTrumps.reduce((best, card) => card.power > best.power ? card : best)
        }
        return validCards[Math.floor(Math.random() * validCards.length)]
    }

    const leadSuit = tableCards[0].card.suit
    const leadSuitCards = validCards.filter(c => c.suit === leadSuit)
    const trumpCards = validCards.filter(c => c.suit === trumpSuit)

    // Try to win with lead suit
    if (leadSuitCards.length > 0) {
        const highestPlayed = Math.max(...tableCards.filter(tc => tc.card.suit === leadSuit).map(tc => tc.card.power))
        const winningCards = leadSuitCards.filter(c => c.power > highestPlayed)
        if (winningCards.length > 0) {
            return winningCards.reduce((lowest, card) => card.power < lowest.power ? card : lowest)
        }
        return leadSuitCards.reduce((lowest, card) => card.power < lowest.power ? card : lowest)
    }

    // No lead suit - consider trumping
    if (trumpCards.length > 0 && tableCards.length >= 2) {
        return trumpCards.reduce((lowest, card) => card.power < lowest.power ? card : lowest)
    }

    // Discard lowest
    return validCards.reduce((lowest, card) => card.power < lowest.power ? card : lowest)
}

// Bot AI - Choose trump suit
const botChooseTrump = (hand) => {
    const suitCounts = {}
    const suitPowers = {}
    Object.keys(SUITS).forEach(suit => {
        const suitCards = hand.filter(c => c.suit === suit)
        suitCounts[suit] = suitCards.length
        suitPowers[suit] = suitCards.reduce((sum, c) => sum + c.power, 0)
    })

    // Choose suit with most cards, then highest power
    let bestSuit = Object.keys(SUITS)[0]
    for (const suit of Object.keys(SUITS)) {
        if (suitCounts[suit] > suitCounts[bestSuit] ||
            (suitCounts[suit] === suitCounts[bestSuit] && suitPowers[suit] > suitPowers[bestSuit])) {
            bestSuit = suit
        }
    }
    return bestSuit
}

// --- DECK GENERATOR ---
const generateDeck = () => {
    let deck = []
    Object.keys(SUITS).forEach(suit => {
        RANKS.forEach(rank => {
            deck.push({
                id: `${rank}${suit}`,
                rank,
                suit,
                color: SUITS[suit].color,
                power: RANK_POWER[rank]
            })
        })
    })
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]]
    }
    return deck
}

// --- GAME LOGIC ---
const getCardPower = (rank) => RANK_POWER[rank] || 0

const determineTrickWinner = (cards, trumpSuit) => {
    if (cards.length === 0) return null
    const leadSuit = cards[0].card.suit
    let winner = cards[0]
    let winningPower = getCardPower(cards[0].card.rank)
    let trumpPlayed = cards[0].card.suit === trumpSuit

    for (let i = 1; i < cards.length; i++) {
        const current = cards[i]
        const isTrump = current.card.suit === trumpSuit
        const isLeadSuit = current.card.suit === leadSuit
        const power = getCardPower(current.card.rank)

        if (isTrump) {
            if (!trumpPlayed || power > winningPower) {
                winner = current
                winningPower = power
                trumpPlayed = true
            }
        } else if (isLeadSuit && !trumpPlayed) {
            if (power > winningPower) {
                winner = current
                winningPower = power
            }
        }
    }
    return winner
}

const isValidMove = (card, hand, tableCards, trumpSuit) => {
    if (tableCards.length === 0) return true
    const leadSuit = tableCards[0].card.suit
    const hasLeadSuit = hand.some(c => c.suit === leadSuit)
    if (hasLeadSuit) return card.suit === leadSuit
    return true
}

// Helper for sorting cards
const sortHand = (hand) => {
    if (!hand) return []
    // Suit priority: Clubs, Diamonds, 3. Spades, 4. Hearts (Alternating colors)
    const suitOrder = { '♣': 0, '♦': 1, '♠': 2, '♥': 3 }

    return [...hand].sort((a, b) => {
        // First sort by suit
        if (a.suit !== b.suit) {
            return suitOrder[a.suit] - suitOrder[b.suit]
        }
        // Then by power (high to low)
        return RANK_POWER[b.rank] - RANK_POWER[a.rank]
    })
}

// ═══════════════════════════════════════════════════════════════════════
// � CLASSIC PLAYING CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════

const Card = ({ card, onClick, isPlayable, isSelected, size = 'normal', faceDown = false, style = {} }) => {
    const sizes = {
        small: { width: 'w-14 sm:w-16', height: 'h-[80px] sm:h-[92px]', rank: 'text-[10px] sm:text-xs', suit: 'text-xs sm:text-sm', pip: 'text-sm', face: 'text-lg sm:text-xl' },
        normal: { width: 'w-[72px] sm:w-20', height: 'h-[100px] sm:h-[116px]', rank: 'text-xs sm:text-sm', suit: 'text-sm sm:text-base', pip: 'text-base sm:text-lg', face: 'text-2xl sm:text-3xl' },
        large: { width: 'w-20 sm:w-24', height: 'h-[116px] sm:h-[136px]', rank: 'text-sm sm:text-base', suit: 'text-base sm:text-lg', pip: 'text-lg sm:text-xl', face: 'text-3xl sm:text-4xl' }
    }
    const s = sizes[size]

    // Classic card colors
    const isRed = card?.suit === '♥' || card?.suit === '♦'
    const cardColor = isRed ? '#c41e3a' : '#1a1a1a'

    // Pip layout patterns for number cards (positions in percentage from center)
    const getPipLayout = (rank) => {
        const layouts = {
            'A': [{ x: 0, y: 0, size: 'text-4xl sm:text-5xl' }],
            '2': [{ x: 0, y: -35 }, { x: 0, y: 35, rotate: true }],
            '3': [{ x: 0, y: -35 }, { x: 0, y: 0 }, { x: 0, y: 35, rotate: true }],
            '4': [{ x: -20, y: -35 }, { x: 20, y: -35 }, { x: -20, y: 35, rotate: true }, { x: 20, y: 35, rotate: true }],
            '5': [{ x: -20, y: -35 }, { x: 20, y: -35 }, { x: 0, y: 0 }, { x: -20, y: 35, rotate: true }, { x: 20, y: 35, rotate: true }],
            '6': [{ x: -20, y: -35 }, { x: 20, y: -35 }, { x: -20, y: 0 }, { x: 20, y: 0 }, { x: -20, y: 35, rotate: true }, { x: 20, y: 35, rotate: true }],
            '7': [{ x: -20, y: -35 }, { x: 20, y: -35 }, { x: 0, y: -15 }, { x: -20, y: 0 }, { x: 20, y: 0 }, { x: -20, y: 35, rotate: true }, { x: 20, y: 35, rotate: true }],
            '8': [{ x: -20, y: -35 }, { x: 20, y: -35 }, { x: 0, y: -15 }, { x: -20, y: 0 }, { x: 20, y: 0 }, { x: 0, y: 15, rotate: true }, { x: -20, y: 35, rotate: true }, { x: 20, y: 35, rotate: true }],
            '9': [{ x: -20, y: -38 }, { x: 20, y: -38 }, { x: -20, y: -12 }, { x: 20, y: -12 }, { x: 0, y: 0 }, { x: -20, y: 12, rotate: true }, { x: 20, y: 12, rotate: true }, { x: -20, y: 38, rotate: true }, { x: 20, y: 38, rotate: true }],
            '10': [{ x: -20, y: -38 }, { x: 20, y: -38 }, { x: 0, y: -22 }, { x: -20, y: -12 }, { x: 20, y: -12 }, { x: -20, y: 12, rotate: true }, { x: 20, y: 12, rotate: true }, { x: 0, y: 22, rotate: true }, { x: -20, y: 38, rotate: true }, { x: 20, y: 38, rotate: true }]
        }
        return layouts[rank] || null
    }

    // Card back design
    if (faceDown) {
        return (
            <div
                className={`${s.width} ${s.height} rounded-lg relative overflow-hidden flex-shrink-0`}
                style={{
                    ...style,
                    background: 'linear-gradient(135deg, #1e3a5f 0%, #0d2137 50%, #1e3a5f 100%)',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)'
                }}
            >
                <div className="absolute inset-0 rounded-lg border-2 border-white/20" />
                <div className="absolute inset-2 rounded border border-white/10" style={{
                    background: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 6px)'
                }} />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white/20 rounded-sm rotate-45 bg-white/5" />
                </div>
            </div>
        )
    }

    const isFaceCard = ['J', 'Q', 'K'].includes(card.rank)
    const pipLayout = getPipLayout(card.rank)

    return (
        <motion.button
            whileHover={isPlayable ? { y: -12, scale: 1.02 } : {}}
            whileTap={isPlayable ? { scale: 0.98 } : {}}
            onClick={() => isPlayable && onClick?.(card)}
            disabled={!isPlayable}
            style={{
                ...style,
                opacity: isPlayable ? 1 : 0.55,
                filter: isPlayable ? 'none' : 'grayscale(20%)'
            }}
            className={`
                ${s.width} ${s.height} rounded-lg relative overflow-hidden select-none flex-shrink-0
                ${isPlayable ? 'cursor-pointer' : 'cursor-not-allowed'}
                transition-all duration-200
            `}
        >
            {/* Card base - solid white */}
            <div
                className={`absolute inset-0 rounded-lg ${isSelected ? 'ring-2 ring-yellow-400' : ''}`}
                style={{
                    background: '#ffffff',
                    boxShadow: isPlayable
                        ? '0 6px 16px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.15)'
                        : '0 2px 6px rgba(0,0,0,0.15)',
                    border: '1px solid #d0d0d0'
                }}
            />

            {/* Top left corner */}
            <div className="absolute top-0.5 left-1 sm:top-1 sm:left-1.5 flex flex-col items-center leading-none z-10" style={{ color: cardColor }}>
                <span className={`${s.rank} font-bold`} style={{ fontFamily: 'Georgia, serif' }}>{card.rank}</span>
                <span className={s.suit} style={{ marginTop: '-1px', lineHeight: 1 }}>{card.suit}</span>
            </div>

            {/* Bottom right corner (rotated) */}
            <div className="absolute bottom-0.5 right-1 sm:bottom-1 sm:right-1.5 flex flex-col items-center leading-none rotate-180 z-10" style={{ color: cardColor }}>
                <span className={`${s.rank} font-bold`} style={{ fontFamily: 'Georgia, serif' }}>{card.rank}</span>
                <span className={s.suit} style={{ marginTop: '-1px', lineHeight: 1 }}>{card.suit}</span>
            </div>

            {/* Card center content */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
                {isFaceCard ? (
                    // Face cards - show large letter with suit
                    <div className="flex flex-col items-center" style={{ color: cardColor }}>
                        <span className={`${s.face} font-bold`} style={{ fontFamily: 'Georgia, serif' }}>{card.rank}</span>
                        <span className={s.pip}>{card.suit}</span>
                    </div>
                ) : pipLayout ? (
                    // Number cards - pip layout
                    <div className="relative w-full h-full">
                        {pipLayout.map((pip, i) => (
                            <span
                                key={i}
                                className={`absolute ${pip.size || s.pip}`}
                                style={{
                                    color: cardColor,
                                    left: `calc(50% + ${pip.x}%)`,
                                    top: `calc(50% + ${pip.y}%)`,
                                    transform: `translate(-50%, -50%) ${pip.rotate ? 'rotate(180deg)' : ''}`
                                }}
                            >
                                {card.suit}
                            </span>
                        ))}
                    </div>
                ) : (
                    // Fallback
                    <span className={s.face} style={{ color: cardColor }}>{card.suit}</span>
                )}
            </div>

            {/* Playable glow */}
            {isPlayable && (
                <div className="absolute inset-0 rounded-lg opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ boxShadow: '0 0 15px rgba(250, 204, 21, 0.5)' }}
                />
            )}
        </motion.button>
    )
}

// ═══════════════════════════════════════════════════════════════════════
// 👤 COMPACT PLAYER SEAT COMPONENT - Mobile Optimized
// ═══════════════════════════════════════════════════════════════════════

const PlayerSeat = ({ player, position, isCurrentTurn, isDealer, isDeclarer, tricksWon, teamColor, isMe, trumpSuit }) => {
    // Responsive positions - keep players away from table
    const positionStyles = {
        bottom: 'bottom-36 sm:bottom-32 left-1/2 -translate-x-1/2',
        left: 'left-1 sm:left-4 top-[45%] -translate-y-1/2',
        top: 'top-16 sm:top-20 left-1/2 -translate-x-1/2',
        right: 'right-1 sm:right-4 top-[45%] -translate-y-1/2'
    }

    // Compact layout for left/right players on mobile
    const isHorizontal = position === 'left' || position === 'right'

    return (
        <motion.div
            className={`absolute ${positionStyles[position]} z-30`}
            animate={isCurrentTurn ? { scale: [1, 1.03, 1] } : {}}
            transition={{ duration: 1, repeat: isCurrentTurn ? Infinity : 0 }}
        >
            {/* YOUR TURN banner - only show for bottom player */}
            <AnimatePresence>
                {isCurrentTurn && isMe && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
                    >
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity }}
                            className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-lg bg-gradient-to-r from-green-400 to-emerald-500 text-black"
                        >
                            🎯 YOUR TURN!
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={`
                flex ${isHorizontal ? 'flex-col' : 'flex-row'} items-center gap-1.5 sm:gap-2 
                px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl backdrop-blur-md transition-all duration-300
                ${isCurrentTurn
                    ? `${isMe ? 'bg-green-500/30 border-2 border-green-400' : 'bg-yellow-500/30 border-2 border-yellow-400'} shadow-lg`
                    : 'bg-black/60 border border-white/10'
                }
            `}>
                {/* Avatar - smaller on mobile */}
                <div className="relative">
                    <div className={`
                        w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 
                        ${teamColor === 'A' ? 'border-blue-400' : 'border-red-400'}
                    `}>
                        {player ? (
                            <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                <Users size={14} className="text-gray-500" />
                            </div>
                        )}
                    </div>

                    {/* Dealer badge */}
                    {isDealer && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-amber-400 rounded-full flex items-center justify-center text-[8px] sm:text-[10px] font-black shadow z-10">
                            D
                        </div>
                    )}

                    {/* Declarer/Trump Badge - Shows who called trump */}
                    {isDeclarer && trumpSuit && (
                        <div className="absolute -bottom-2 -right-2 w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-yellow-400 z-20" title="Trump Caller">
                            <span className="text-xl sm:text-2xl leading-none" style={{ color: SUITS[trumpSuit]?.color }}>{trumpSuit}</span>
                        </div>
                    )}
                </div>

                {/* Info - compact */}
                <div className={`flex flex-col ${isHorizontal ? 'items-center' : 'items-start'}`}>
                    <span className={`text-[10px] sm:text-xs font-bold truncate max-w-[60px] sm:max-w-[80px] ${isMe ? 'text-green-300' : 'text-white'}`}>
                        {player?.name?.split(' ')[0] || 'Empty'}
                    </span>
                    {player && (
                        <div className="flex items-center gap-1">
                            <span className={`text-[8px] sm:text-[10px] font-bold px-1 py-0.5 rounded ${teamColor === 'A' ? 'bg-blue-500/40 text-blue-200' : 'bg-red-500/40 text-red-200'
                                }`}>
                                Team {teamColor}
                            </span>
                            {tricksWon > 0 && (
                                <span className="text-[8px] sm:text-[10px] text-yellow-300">🏆{tricksWon}</span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    )
}

// ═══════════════════════════════════════════════════════════════════════
// 🎮 MAIN GAME COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export default function OmiGame() {
    const router = useRouter()
    const supabase = createClient()
    const channelRef = useRef(null)

    // User state
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    // Game state
    const [players, setPlayers] = useState([null, null, null, null])
    const [dealerIndex, setDealerIndex] = useState(0)
    const [declarerIndex, setDeclarerIndex] = useState(-1)
    const [turnIndex, setTurnIndex] = useState(-1)
    const [trumpSuit, setTrumpSuit] = useState(null)
    const [gamePhase, setGamePhase] = useState('lobby') // lobby, dealing, calling_trump, playing, trick_end, round_end, game_over
    const [tokens, setTokens] = useState({ A: 5, B: 5 })
    const [tricks, setTricks] = useState({ A: 0, B: 0 })
    const [tableCards, setTableCards] = useState([])
    const [myHand, setMyHand] = useState([])
    const [deck, setDeck] = useState([])
    const [botHands, setBotHands] = useState({}) // { 'bot-1': [...cards], ... }

    // UI state
    const [alert, setAlert] = useState(null)
    const [soundEnabled, setSoundEnabled] = useState(true)
    const [bgMusicPlaying, setBgMusicPlaying] = useState(false)

    // Sound effects refs (using free sound URLs)
    const cardPlaySoundRef = useRef(null)
    const dealSoundRef = useRef(null)
    const winSoundRef = useRef(null)
    const yourTurnSoundRef = useRef(null)
    const bgMusicRef = useRef(null)

    // Initialize audio
    useEffect(() => {
        // Card play sound (soft thud)
        cardPlaySoundRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3')
        cardPlaySoundRef.current.volume = 0.4

        // Deal sound (card shuffle)  
        dealSoundRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2647/2647-preview.mp3') // Real shuffle sound
        dealSoundRef.current.volume = 0.6

        // Win sound (success chime)
        winSoundRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3')
        winSoundRef.current.volume = 0.5

        // Your turn notification
        yourTurnSoundRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
        yourTurnSoundRef.current.volume = 0.3

        // Background music (Lofi Chill - long track)
        bgMusicRef.current = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3')
        bgMusicRef.current.loop = true
        bgMusicRef.current.volume = 0.12

        return () => {
            bgMusicRef.current?.pause()
        }
    }, [])

    // Play sound helper
    const playSound = (soundRef) => {
        if (!soundEnabled || !soundRef.current) return
        soundRef.current.currentTime = 0
        soundRef.current.play().catch(() => { })
    }

    // Toggle background music
    const toggleBgMusic = () => {
        if (bgMusicPlaying) {
            bgMusicRef.current?.pause()
            setBgMusicPlaying(false)
        } else {
            bgMusicRef.current?.play().catch(() => { })
            setBgMusicPlaying(true)
        }
    }

    // Get team for a seat index
    const getTeam = (seatIndex) => (seatIndex === 0 || seatIndex === 2) ? 'A' : 'B'

    // Get my seat index
    const mySeatIndex = user ? players.findIndex(p => p?.id === user.id) : -1
    const isMyTurn = turnIndex !== -1 && players[turnIndex]?.id === user?.id
    const isDealer = players[dealerIndex]?.id === user?.id
    const isDeclarer = declarerIndex !== -1 && players[declarerIndex]?.id === user?.id

    // Show alert message
    const showAlert = (message, duration = 2500) => {
        setAlert(message)
        setTimeout(() => setAlert(null), duration)
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📡 CHANNEL SETUP & SYNC
    // ═══════════════════════════════════════════════════════════════════

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
                return
            }

            const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
            setUser(profile)

            // Create channel
            const channel = supabase.channel('omi-game-room', {
                config: { broadcast: { self: true } }
            })

            channel
                .on('broadcast', { event: 'game-state' }, ({ payload }) => {
                    console.log('Received game state:', payload)
                    if (payload.players) setPlayers(payload.players)
                    if (payload.dealerIndex !== undefined) setDealerIndex(payload.dealerIndex)
                    if (payload.declarerIndex !== undefined) setDeclarerIndex(payload.declarerIndex)
                    if (payload.turnIndex !== undefined) setTurnIndex(payload.turnIndex)
                    if (payload.trumpSuit !== undefined) setTrumpSuit(payload.trumpSuit)
                    if (payload.gamePhase) setGamePhase(payload.gamePhase)
                    if (payload.tokens) setTokens(payload.tokens)
                    if (payload.tricks) setTricks(payload.tricks)
                    if (payload.tableCards) setTableCards(payload.tableCards)
                })
                .on('broadcast', { event: 'deal-hand' }, ({ payload }) => {
                    if (payload.playerId === session.user.id) {
                        console.log('Received my hand:', payload.cards)
                        playSound(dealSoundRef)
                        setMyHand(sortHand(payload.cards))
                    }
                })
                .on('broadcast', { event: 'deal_cards' }, ({ payload }) => {
                    const myIndex = players.findIndex(p => p?.id === session.user.id)
                    if (myIndex !== -1 && payload.hands[myIndex]) {
                        console.log('Received new hand for round:', payload.hands[myIndex])
                        playSound(dealSoundRef)
                        setMyHand(sortHand(payload.hands[myIndex]))
                    }
                })
                .on('broadcast', { event: 'alert' }, ({ payload }) => {
                    showAlert(payload.message)
                })
                .subscribe((status) => {
                    console.log('Channel status:', status)
                    if (status === 'SUBSCRIBED') {
                        setLoading(false)
                    }
                })

            channelRef.current = channel

            return () => {
                supabase.removeChannel(channel)
            }
        }

        init()
    }, [])

    // Broadcast game state
    const broadcastState = useCallback((updates = {}) => {
        const state = {
            players,
            dealerIndex,
            declarerIndex,
            turnIndex,
            trumpSuit,
            gamePhase,
            tokens,
            tricks,
            tableCards,
            ...updates
        }
        channelRef.current?.send({ type: 'broadcast', event: 'game-state', payload: state })
    }, [players, dealerIndex, declarerIndex, turnIndex, trumpSuit, gamePhase, tokens, tricks, tableCards])

    // ═══════════════════════════════════════════════════════════════════
    // 🎮 GAME ACTIONS
    // ═══════════════════════════════════════════════════════════════════

    // Sit at a seat
    const sitDown = async (seatIndex) => {
        if (!user || players[seatIndex] || players.some(p => p?.id === user.id)) return

        const newPlayers = [...players]
        newPlayers[seatIndex] = {
            id: user.id,
            name: user.full_name?.split(' ')[0] || 'Player',
            avatar: user.avatar_url,
            team: getTeam(seatIndex)
        }
        setPlayers(newPlayers)
        broadcastState({ players: newPlayers })
    }

    // Fill empty seats with bots
    const fillWithBots = () => {
        const newPlayers = [...players]
        let botIndex = 0

        for (let i = 0; i < 4; i++) {
            if (newPlayers[i] === null) {
                const bot = BOT_PLAYERS[botIndex]
                newPlayers[i] = {
                    ...bot,
                    team: getTeam(i)
                }
                botIndex++
            }
        }

        setPlayers(newPlayers)
        broadcastState({ players: newPlayers })
        showAlert('Bots added! Ready to play 🤖')
    }

    // Start the game (dealer action)
    const startGame = async () => {
        if (!players.every(p => p !== null)) {
            showAlert('Need 4 players to start!')
            return
        }

        const newDeck = generateDeck()
        setDeck(newDeck)

        // Declarer is player to dealer's right (counter-clockwise, so +1 in array)
        const newDeclarerIndex = (dealerIndex + 1) % 4
        const declarer = players[newDeclarerIndex]

        // Deal 4 cards to declarer first
        const declarerHand = newDeck.slice(0, 4)

        // If declarer is a bot, store hand locally
        if (declarer.isBot) {
            setBotHands(prev => ({ ...prev, [declarer.id]: declarerHand }))
        } else {
            // Send to human player
            channelRef.current?.send({
                type: 'broadcast',
                event: 'deal-hand',
                payload: { playerId: declarer.id, cards: declarerHand }
            })
        }

        // Store the deck for dealing remaining cards later
        setDeck(newDeck)

        broadcastState({
            gamePhase: 'calling_trump',
            declarerIndex: newDeclarerIndex,
            turnIndex: newDeclarerIndex,
            trumpSuit: null,
            tricks: { A: 0, B: 0 },
            tableCards: []
        })

        showAlert(`${declarer.name} is choosing trump...`)

        // If declarer is a bot, auto-choose trump after delay
        if (declarer.isBot) {
            setTimeout(() => {
                const chosenSuit = botChooseTrump(declarerHand)
                selectTrumpAsBot(chosenSuit, newDeck, newDeclarerIndex)
            }, 1500)
        }
    }

    // Select trump suit (for human declarer)
    const selectTrump = async (suit) => {
        if (!isDeclarer) return
        selectTrumpAsBot(suit, deck, declarerIndex)
    }

    // Internal function to select trump (works for both human and bot)
    const selectTrumpAsBot = async (suit, currentDeck, currentDeclarerIndex) => {
        // Deal 8 cards to each player
        const newBotHands = {}
        let cardIndex = 0

        for (let i = 0; i < 4; i++) {
            const playerCards = currentDeck.slice(cardIndex, cardIndex + 8)
            cardIndex += 8

            const player = players[i]
            if (player.isBot) {
                newBotHands[player.id] = playerCards
            } else {
                channelRef.current?.send({
                    type: 'broadcast',
                    event: 'deal-hand',
                    payload: { playerId: player.id, cards: playerCards }
                })
            }
        }

        setBotHands(prev => ({ ...prev, ...newBotHands }))

        setTrumpSuit(suit)
        setGamePhase('playing')
        setTurnIndex(currentDeclarerIndex)
        setTableCards([])

        broadcastState({
            gamePhase: 'playing',
            trumpSuit: suit,
            turnIndex: currentDeclarerIndex,
            tableCards: []
        })

        channelRef.current?.send({
            type: 'broadcast',
            event: 'alert',
            payload: { message: `Trump is ${suit}!` }
        })
    }

    // Play a card
    const playCard = async (card) => {
        if (!isMyTurn) return
        if (!isValidMove(card, myHand, tableCards, trumpSuit)) {
            showAlert('Invalid move! Follow the lead suit.')
            return
        }

        // Play card sound
        playSound(cardPlaySoundRef)

        // Remove card from hand
        const newHand = myHand.filter(c => c.id !== card.id)
        setMyHand(sortHand(newHand))

        // Add to table
        const newTableCards = [...tableCards, {
            card,
            playerId: user.id,
            playerName: user.full_name?.split(' ')[0],
            seatIndex: mySeatIndex
        }]

        // Determine next turn or trick winner
        if (newTableCards.length === 4) {
            // Trick complete
            broadcastState({ tableCards: newTableCards, turnIndex: -1, gamePhase: 'trick_end' })

            setTimeout(() => {
                const winner = determineTrickWinner(newTableCards, trumpSuit)
                const winnerSeatIndex = newTableCards.find(tc => tc.playerId === winner.playerId)?.seatIndex
                const winningTeam = getTeam(winnerSeatIndex)

                const newTricks = { ...tricks, [winningTeam]: tricks[winningTeam] + 1 }

                channelRef.current?.send({
                    type: 'broadcast',
                    event: 'alert',
                    payload: { message: `${winner.playerName} wins the trick!` }
                })

                // Check if round is over (8 tricks played)
                if (newTricks.A + newTricks.B === 8) {
                    handleRoundEnd(newTricks)
                } else {
                    // Next trick - winner leads
                    broadcastState({
                        tableCards: [],
                        tricks: newTricks,
                        turnIndex: winnerSeatIndex,
                        gamePhase: 'playing'
                    })
                }
            }, 1500)
        } else {
            // Next player's turn (counter-clockwise = +1 in our array)
            const nextTurn = (turnIndex + 1) % 4
            broadcastState({ tableCards: newTableCards, turnIndex: nextTurn })
        }
    }

    // Handle round end and scoring - AUTHENTIC OMI RULES
    // Teams start with 5 tokens each
    // Trump chooser wins: other team loses 1 token
    // Trump chooser loses: trump team loses 2 tokens
    // Kapothi (8-0): losing team loses 3 tokens
    const handleRoundEnd = (finalTricks) => {
        const declarerTeam = getTeam(declarerIndex)
        const otherTeam = declarerTeam === 'A' ? 'B' : 'A'

        let tokensLost = 0
        let losingTeam = ''
        let resultMessage = ''

        if (finalTricks[declarerTeam] > finalTricks[otherTeam]) {
            // Trump chooser's team won - OTHER team loses tokens
            losingTeam = otherTeam
            if (finalTricks[declarerTeam] === 8) {
                tokensLost = 3 // Kapothi - all 8 tricks = 3 tokens
                resultMessage = `🏆 Team ${declarerTeam} wins with Kapothi! Team ${otherTeam} loses 3 tokens!`
            } else {
                tokensLost = 1 // Normal win = 1 token
                resultMessage = `Team ${declarerTeam} wins! Team ${otherTeam} loses 1 token.`
            }
        } else if (finalTricks[otherTeam] > finalTricks[declarerTeam]) {
            // Trump chooser's team LOST - THEY lose tokens (penalty for losing after choosing trump)
            losingTeam = declarerTeam
            if (finalTricks[otherTeam] === 8) {
                tokensLost = 3 // Kapothi against trump chooser
                resultMessage = `💥 Team ${otherTeam} defeats trump choosers with Kapothi! Team ${declarerTeam} loses 3 tokens!`
            } else {
                tokensLost = 2 // Losing after choosing trump = 2 tokens
                resultMessage = `Team ${otherTeam} wins! Team ${declarerTeam} loses 2 tokens for failing as trump choosers.`
            }
        } else {
            // Tied (4-4) - no tokens lost
            resultMessage = 'Round tied 4-4! No tokens lost.'
        }

        const newTokens = { ...tokens }
        if (losingTeam) {
            newTokens[losingTeam] = Math.max(0, newTokens[losingTeam] - tokensLost)
        }

        // Check for game over (team reaches 0 tokens = they LOSE)
        if (newTokens.A <= 0 || newTokens.B <= 0) {
            const loser = newTokens.A <= 0 ? 'A' : 'B'
            const winner = loser === 'A' ? 'B' : 'A'
            broadcastState({
                tokens: newTokens,
                gamePhase: 'game_over',
                gameWinner: winner,
                gameLoser: loser
            })
            channelRef.current?.send({
                type: 'broadcast',
                event: 'alert',
                payload: { message: `🎉 Team ${winner} wins the game! Team ${loser} has no tokens left!` }
            })
        } else {
            // Show round results, then auto-start next round
            const nextDealer = (dealerIndex + 1) % 4
            const nextDeclarer = (nextDealer + 1) % 4 // Player to dealer's right (counter-clockwise)

            channelRef.current?.send({
                type: 'broadcast',
                event: 'alert',
                payload: { message: `${resultMessage} New round starting...` }
            })

            // First update tokens and show round_end briefly
            broadcastState({
                tokens: newTokens,
                tricks: { A: 0, B: 0 },
                tableCards: [],
                dealerIndex: nextDealer,
                declarerIndex: nextDeclarer,
                turnIndex: -1,
                trumpSuit: null,
                gamePhase: 'round_end'
            })

            // After 2 seconds, deal new cards and go to trump calling
            setTimeout(() => {
                // Deal new cards
                const newDeck = generateDeck()
                const hands = [
                    newDeck.slice(0, 8),
                    newDeck.slice(8, 16),
                    newDeck.slice(16, 24),
                    newDeck.slice(24, 32)
                ]

                // Send hands to each player/bot
                const newBotHands = {}
                players.forEach((player, seatIndex) => {
                    if (player?.isBot) {
                        newBotHands[seatIndex] = hands[seatIndex]
                    }
                })
                setBotHands(newBotHands)

                // Broadcast hand to current player
                const myNewHand = hands[mySeatIndex]
                if (myNewHand) {
                    playSound(dealSoundRef)
                    setMyHand(sortHand(myNewHand))
                }

                // Send hands privately via broadcast for other human players
                channelRef.current?.send({
                    type: 'broadcast',
                    event: 'deal_cards',
                    payload: { hands }
                })

                // Go to trump calling phase
                broadcastState({
                    gamePhase: 'calling_trump',
                    turnIndex: nextDeclarer, // Declarer chooses trump
                    tableCards: [], // FORCE clear table
                    tricks: { A: 0, B: 0 } // FORCE clear tricks
                })

                channelRef.current?.send({
                    type: 'broadcast',
                    event: 'alert',
                    payload: { message: `${players[nextDeclarer]?.name || 'Declarer'} is choosing trump!` }
                })
            }, 2000)
        }
    }

    // Reset game
    const resetGame = () => {
        broadcastState({
            players: [null, null, null, null],
            dealerIndex: 0,
            declarerIndex: -1,
            turnIndex: -1,
            trumpSuit: null,
            gamePhase: 'lobby',
            tokens: { A: 5, B: 5 },
            tricks: { A: 0, B: 0 },
            tableCards: []
        })
        setMyHand([])
        setBotHands({})
    }

    // Bot plays a card
    const botPlayCard = (botPlayer, botSeatIndex) => {
        const hand = botHands[botPlayer.id]
        if (!hand || hand.length === 0) return

        const cardToPlay = botChooseCard(hand, tableCards, trumpSuit)
        if (!cardToPlay) return

        // Remove card from bot hand
        const newHand = hand.filter(c => c.id !== cardToPlay.id)
        setBotHands(prev => ({ ...prev, [botPlayer.id]: newHand }))

        // Add to table
        const newTableCards = [...tableCards, {
            card: cardToPlay,
            playerId: botPlayer.id,
            playerName: botPlayer.name.replace(' 🤖', ''),
            seatIndex: botSeatIndex
        }]

        // Update local state
        setTableCards(newTableCards)

        // Determine next turn or trick winner
        if (newTableCards.length === 4) {
            // Trick complete
            setTurnIndex(-1)
            setGamePhase('trick_end')
            broadcastState({ tableCards: newTableCards, turnIndex: -1, gamePhase: 'trick_end' })

            setTimeout(() => {
                const winner = determineTrickWinner(newTableCards, trumpSuit)
                const winnerSeatIndex = newTableCards.find(tc => tc.playerId === winner.playerId)?.seatIndex
                const winningTeam = getTeam(winnerSeatIndex)

                const newTricks = { ...tricks, [winningTeam]: tricks[winningTeam] + 1 }
                setTricks(newTricks)

                showAlert(`${winner.playerName} wins the trick!`)

                if (newTricks.A + newTricks.B === 8) {
                    handleRoundEnd(newTricks)
                } else {
                    setTableCards([])
                    setTurnIndex(winnerSeatIndex)
                    setGamePhase('playing')
                    broadcastState({
                        tableCards: [],
                        tricks: newTricks,
                        turnIndex: winnerSeatIndex,
                        gamePhase: 'playing'
                    })
                }
            }, 1500)
        } else {
            const nextTurn = (turnIndex + 1) % 4
            setTurnIndex(nextTurn)
            broadcastState({ tableCards: newTableCards, turnIndex: nextTurn })
        }
    }

    // Auto-play for bots
    useEffect(() => {
        if (gamePhase !== 'playing' || turnIndex === -1) return

        const currentPlayer = players[turnIndex]
        if (!currentPlayer?.isBot) return

        // Bot plays after a delay
        const timer = setTimeout(() => {
            botPlayCard(currentPlayer, turnIndex)
        }, 1000 + Math.random() * 500) // Random delay for natural feel

        return () => clearTimeout(timer)
    }, [turnIndex, gamePhase, players, botHands, tableCards, trumpSuit])

    // Auto-select trump for bot declarer (for new rounds after first)
    useEffect(() => {
        if (gamePhase !== 'calling_trump' || declarerIndex === -1) return

        const declarer = players[declarerIndex]
        if (!declarer?.isBot) return

        // Bot chooses trump after a delay
        const timer = setTimeout(() => {
            const declarerHand = botHands[declarerIndex]
            if (declarerHand && declarerHand.length > 0) {
                const chosenSuit = botChooseTrump(declarerHand)

                // Set trump and start playing
                const nextTurnIndex = (declarerIndex + 1) % 4 // Player to declarer's right plays first

                broadcastState({
                    trumpSuit: chosenSuit,
                    gamePhase: 'playing',
                    turnIndex: nextTurnIndex
                })

                showAlert(`${declarer.name} chose ${chosenSuit} as trump!`)
            }
        }, 1500)

        return () => clearTimeout(timer)
    }, [gamePhase, declarerIndex, players, botHands])

    // ═══════════════════════════════════════════════════════════════════
    // 🎨 RENDER
    // ═══════════════════════════════════════════════════════════════════

    if (loading) {
        return (
            <div className="h-screen bg-[#1a103a] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-purple-300 font-medium">Loading game...</p>
                </div>
            </div>
        )
    }

    // Get rotated view so current player is always at bottom
    const getRotatedView = () => {
        if (mySeatIndex === -1) return [0, 1, 2, 3] // Spectator sees original order
        const order = []
        for (let i = 0; i < 4; i++) {
            order.push((mySeatIndex + i) % 4)
        }
        return order // [me, left, top, right]
    }
    const rotatedIndices = getRotatedView()

    return (
        <main className="h-screen bg-gradient-to-b from-[#2d1b4e] via-[#1a103a] to-[#0d0820] overflow-hidden relative select-none">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIgZmlsbD0iI2ZmZiIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNhKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')]"></div>

            {/* ═══════════════ HEADER ═══════════════ */}
            <header className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-[#0d4a31] to-[#0a3626] shadow-lg">
                {/* Top bar with back and sound buttons */}
                <div className="flex justify-between items-center p-2 sm:p-3">
                    <button
                        onClick={() => router.push('/')}
                        className="p-2 sm:p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    {/* Score display - compact green themed */}
                    <div className="flex items-center gap-4 sm:gap-8 px-4 sm:px-8 py-2 rounded-xl bg-black/20">
                        {/* Team A Score */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            <span className="text-2xl sm:text-4xl font-black text-white">{tokens.A}</span>
                            <div className="flex flex-col items-center">
                                <div className="flex gap-0.5">
                                    {[...Array(Math.min(tricks.A, 4))].map((_, i) => (
                                        <div key={i} className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white" />
                                    ))}
                                </div>
                                {tricks.A > 4 && (
                                    <div className="flex gap-0.5 mt-0.5">
                                        {[...Array(Math.min(tricks.A - 4, 4))].map((_, i) => (
                                            <div key={i} className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white" />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Trump suit display */}
                        <div className="flex flex-col items-center relative">
                            {trumpSuit ? (
                                <>
                                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-black/40 flex items-center justify-center border-2 border-white/10 relative shadow-lg">
                                        <span className="text-2xl sm:text-3xl drop-shadow-md" style={{ color: SUITS[trumpSuit]?.color }}>{trumpSuit}</span>
                                        {/* Caller Badge */}
                                        {declarerIndex !== -1 && players[declarerIndex] && (
                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-black/50 overflow-hidden shadow-sm" title={`Called by ${players[declarerIndex].name}`}>
                                                <img src={players[declarerIndex].avatar} alt="Caller" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>
                                    {/* Caller Name */}
                                    {declarerIndex !== -1 && players[declarerIndex] && (
                                        <span className="text-[8px] sm:text-[10px] text-yellow-500/80 font-bold mt-1 max-w-[60px] truncate">
                                            {players[declarerIndex].name.split(' ')[0]}
                                        </span>
                                    )}
                                </>
                            ) : (
                                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-black/30 flex items-center justify-center border-2 border-white/20">
                                    <span className="text-lg sm:text-xl text-white/50 animate-pulse">?</span>
                                </div>
                            )}
                        </div>

                        {/* Team B Score */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="flex flex-col items-center">
                                <div className="flex gap-0.5">
                                    {[...Array(Math.min(tricks.B, 4))].map((_, i) => (
                                        <div key={i} className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white" />
                                    ))}
                                </div>
                                {tricks.B > 4 && (
                                    <div className="flex gap-0.5 mt-0.5">
                                        {[...Array(Math.min(tricks.B - 4, 4))].map((_, i) => (
                                            <div key={i} className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white" />
                                        ))}
                                    </div>
                                )}
                            </div>
                            <span className="text-2xl sm:text-4xl font-black text-white">{tokens.B}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2">
                        <button
                            onClick={toggleBgMusic}
                            className={`p-2 sm:p-3 rounded-xl text-white transition-all ${bgMusicPlaying
                                ? 'bg-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                                : 'bg-white/10 hover:bg-white/20'
                                }`}
                            title={bgMusicPlaying ? 'Stop Music' : 'Play Music'}
                        >
                            <Music2 size={18} className={bgMusicPlaying ? 'animate-pulse' : ''} />
                        </button>
                        <button
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className="p-2 sm:p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all"
                            title={soundEnabled ? 'Mute Sounds' : 'Enable Sounds'}
                        >
                            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                        </button>
                    </div>
                </div>
            </header>


            {/* ═══════════════ ALERT BANNER ═══════════════ */}
            <AnimatePresence>
                {alert && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="absolute top-24 left-1/2 -translate-x-1/2 z-[100]"
                    >
                        <div className="bg-gradient-to-r from-yellow-500/90 to-amber-500/90 backdrop-blur-xl px-8 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-yellow-300/50">
                            <Zap className="text-yellow-900" size={20} />
                            <span className="text-yellow-900 font-bold">{alert}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════════════ GAME TABLE ═══════════════ */}
            <div className="absolute inset-0 flex items-center justify-center pt-20">

                {/* Player seats */}
                <PlayerSeat
                    player={players[rotatedIndices[0]]}
                    position="bottom"
                    isCurrentTurn={turnIndex === rotatedIndices[0]}
                    isDealer={dealerIndex === rotatedIndices[0]}
                    isDeclarer={declarerIndex === rotatedIndices[0]}
                    tricksWon={tricks[getTeam(rotatedIndices[0])]}
                    teamColor={getTeam(rotatedIndices[0])}
                    isMe={true}
                    trumpSuit={trumpSuit}
                />
                <PlayerSeat
                    player={players[rotatedIndices[1]]}
                    position="left"
                    isCurrentTurn={turnIndex === rotatedIndices[1]}
                    isDealer={dealerIndex === rotatedIndices[1]}
                    isDeclarer={declarerIndex === rotatedIndices[1]}
                    tricksWon={tricks[getTeam(rotatedIndices[1])]}
                    teamColor={getTeam(rotatedIndices[1])}
                    isMe={false}
                    trumpSuit={trumpSuit}
                />
                <PlayerSeat
                    player={players[rotatedIndices[2]]}
                    position="top"
                    isCurrentTurn={turnIndex === rotatedIndices[2]}
                    isDealer={dealerIndex === rotatedIndices[2]}
                    isDeclarer={declarerIndex === rotatedIndices[2]}
                    tricksWon={tricks[getTeam(rotatedIndices[2])]}
                    teamColor={getTeam(rotatedIndices[2])}
                    isMe={false}
                    trumpSuit={trumpSuit}
                />
                <PlayerSeat
                    player={players[rotatedIndices[3]]}
                    position="right"
                    isCurrentTurn={turnIndex === rotatedIndices[3]}
                    isDealer={dealerIndex === rotatedIndices[3]}
                    isDeclarer={declarerIndex === rotatedIndices[3]}
                    tricksWon={tricks[getTeam(rotatedIndices[3])]}
                    teamColor={getTeam(rotatedIndices[3])}
                    isMe={false}
                    trumpSuit={trumpSuit}
                />

                {/* Sit buttons for empty seats (if not seated) */}
                {mySeatIndex === -1 && players.map((p, i) => {
                    if (p) return null
                    const positions = [
                        'bottom-48 left-1/2 -translate-x-1/2',
                        'left-28 top-1/2 -translate-y-1/2',
                        'top-28 left-1/2 -translate-x-1/2',
                        'right-28 top-1/2 -translate-y-1/2'
                    ]
                    return (
                        <motion.button
                            key={i}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => sitDown(i)}
                            className={`absolute ${positions[i]} z-20 bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/20 hover:border-green-400/50 rounded-2xl px-6 py-4 flex flex-col items-center gap-2 transition-all`}
                        >
                            <Users className="text-white/40" size={24} />
                            <span className="text-xs text-white/50 font-bold uppercase tracking-wider">Sit Here</span>
                            <span className={`text-[10px] font-bold ${getTeam(i) === 'A' ? 'text-blue-400' : 'text-red-400'}`}>Team {getTeam(i)}</span>
                        </motion.button>
                    )
                })}

                {/* Center table - Wooden design - smaller on mobile */}
                <div className="w-[200px] h-[200px] sm:w-[280px] sm:h-[280px] md:w-[320px] md:h-[320px] rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#d4a05e] via-[#b8843f] to-[#8b5a2b] shadow-[inset_0_4px_20px_rgba(0,0,0,0.3),0_8px_40px_rgba(0,0,0,0.5)] border-4 sm:border-[6px] border-yellow-500 relative">
                    {/* Wood grain texture */}
                    <div className="absolute inset-0 rounded-2xl sm:rounded-3xl opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0id29vZCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMCI+PHBhdGggZD0iTTAgNWgxMDAiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjMiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IGZpbGw9InVybCgjd29vZCkiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiLz48L3N2Zz4=')]" />

                    {/* Trump display in center */}
                    {trumpSuit && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-black/10 flex items-center justify-center">
                                <span className="text-2xl sm:text-4xl opacity-40 select-none">{trumpSuit}</span>
                            </div>
                        </div>
                    )}

                    {/* Cards on table - positioned in cross pattern - well separated */}
                    <AnimatePresence>
                        {tableCards.map((move, i) => {
                            // Position cards based on who played them (relative to current player's view)
                            const relativeIndex = rotatedIndices.indexOf(move.seatIndex)
                            // Spread cards out more so they don't overlap
                            const positions = [
                                { x: 0, y: 55 },   // Bottom (me)
                                { x: -55, y: 0 },  // Left
                                { x: 0, y: -55 },  // Top
                                { x: 55, y: 0 }    // Right
                            ]
                            const pos = positions[relativeIndex] || { x: (i - 1.5) * 40, y: 0 }

                            return (
                                <motion.div
                                    key={`${move.card.id}-${i}`}
                                    initial={{ opacity: 0, scale: 0.5, y: 50 }}
                                    animate={{
                                        opacity: 1,
                                        scale: 1,
                                        x: pos.x,
                                        y: pos.y,
                                        rotate: (relativeIndex - 1.5) * 5
                                    }}
                                    exit={{ opacity: 0, scale: 0.5 }}
                                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                                    style={{ zIndex: i + 10 }}
                                >
                                    {/* Solid white card for table display */}
                                    <div
                                        className="w-14 h-[80px] sm:w-16 sm:h-[92px] rounded-lg relative overflow-hidden flex-shrink-0"
                                        style={{
                                            background: '#ffffff',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
                                            border: '1px solid #e0e0e0'
                                        }}
                                    >
                                        {/* Top left corner */}
                                        <div
                                            className="absolute top-1 left-1.5 flex flex-col items-center leading-none"
                                            style={{ color: move.card.suit === '♥' || move.card.suit === '♦' ? '#c41e3a' : '#1a1a1a' }}
                                        >
                                            <span className="text-sm sm:text-base font-bold" style={{ fontFamily: 'Georgia, serif' }}>{move.card.rank}</span>
                                            <span className="text-base sm:text-lg" style={{ marginTop: '-2px' }}>{move.card.suit}</span>
                                        </div>

                                        {/* Center suit */}
                                        <div
                                            className="absolute inset-0 flex items-center justify-center"
                                            style={{ color: move.card.suit === '♥' || move.card.suit === '♦' ? '#c41e3a' : '#1a1a1a' }}
                                        >
                                            <span className="text-3xl sm:text-4xl">{move.card.suit}</span>
                                        </div>

                                        {/* Bottom right corner */}
                                        <div
                                            className="absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180"
                                            style={{ color: move.card.suit === '♥' || move.card.suit === '♦' ? '#c41e3a' : '#1a1a1a' }}
                                        >
                                            <span className="text-sm sm:text-base font-bold" style={{ fontFamily: 'Georgia, serif' }}>{move.card.rank}</span>
                                            <span className="text-base sm:text-lg" style={{ marginTop: '-2px' }}>{move.card.suit}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>

                    {/* Center actions */}
                    {gamePhase === 'lobby' && mySeatIndex !== -1 && players.some(p => p === null) && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={fillWithBots}
                            className="absolute inset-0 m-auto w-fit h-fit z-50 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500 text-white font-black px-8 py-4 rounded-2xl shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:shadow-[0_0_40px_rgba(139,92,246,0.6)] transition-all flex items-center gap-3"
                        >
                            <Bot size={20} />
                            FILL WITH BOTS
                        </motion.button>
                    )}

                    {gamePhase === 'lobby' && isDealer && players.every(p => p !== null) && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={startGame}
                            className="absolute inset-0 m-auto w-fit h-fit z-50 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-black font-black px-8 py-4 rounded-2xl shadow-[0_0_30px_rgba(251,191,36,0.4)] hover:shadow-[0_0_40px_rgba(251,191,36,0.6)] transition-all flex items-center gap-3"
                        >
                            <Play size={20} fill="currentColor" />
                            DEAL CARDS
                        </motion.button>
                    )}

                    {gamePhase === 'calling_trump' && isDeclarer && (
                        <div className="absolute inset-0 m-auto w-fit h-fit z-50 bg-black/90 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-2xl">
                            <p className="text-yellow-400 font-bold text-sm uppercase tracking-widest mb-4 text-center">Select Trump Suit</p>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.keys(SUITS).map(suit => (
                                    <motion.button
                                        key={suit}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => selectTrump(suit)}
                                        className="w-16 h-16 bg-white rounded-xl text-4xl flex items-center justify-center shadow-xl hover:shadow-2xl transition-all border-2 border-transparent hover:border-yellow-400"
                                        style={{ color: SUITS[suit].color }}
                                    >
                                        {suit}
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    )}

                    {gamePhase === 'game_over' && (() => {
                        const loserTeam = tokens.A <= 0 ? 'A' : 'B'
                        const winnerTeam = loserTeam === 'A' ? 'B' : 'A'
                        const myTeam = mySeatIndex !== -1 ? getTeam(mySeatIndex) : null
                        const isWinner = myTeam === winnerTeam

                        return (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="fixed inset-0 z-[100] flex items-center justify-center"
                                style={{
                                    background: isWinner
                                        ? 'linear-gradient(135deg, rgba(21, 128, 61, 0.95) 0%, rgba(5, 46, 22, 0.98) 100%)'
                                        : 'linear-gradient(135deg, rgba(127, 29, 29, 0.95) 0%, rgba(55, 7, 7, 0.98) 100%)'
                                }}
                            >
                                {/* Confetti/decorations for winner */}
                                {isWinner && (
                                    <>
                                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                            {[...Array(20)].map((_, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ y: -100, x: Math.random() * window.innerWidth, rotate: 0 }}
                                                    animate={{
                                                        y: window.innerHeight + 100,
                                                        rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
                                                        x: Math.random() * window.innerWidth
                                                    }}
                                                    transition={{
                                                        duration: 3 + Math.random() * 2,
                                                        repeat: Infinity,
                                                        delay: Math.random() * 2
                                                    }}
                                                    className="absolute text-2xl"
                                                >
                                                    {['🎉', '🏆', '⭐', '✨', '🎊'][Math.floor(Math.random() * 5)]}
                                                </motion.div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                <motion.div
                                    initial={{ scale: 0.5, y: 50 }}
                                    animate={{ scale: 1, y: 0 }}
                                    transition={{ type: 'spring', damping: 15 }}
                                    className="relative bg-black/60 backdrop-blur-2xl rounded-3xl p-8 sm:p-12 max-w-md mx-4 text-center border-2"
                                    style={{ borderColor: isWinner ? '#22c55e' : '#ef4444' }}
                                >
                                    {/* Icon */}
                                    <motion.div
                                        animate={{ scale: [1, 1.1, 1], rotate: isWinner ? [0, 5, -5, 0] : 0 }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                        className="mb-6"
                                    >
                                        {isWinner ? (
                                            <Crown className="w-20 h-20 sm:w-24 sm:h-24 text-yellow-400 mx-auto drop-shadow-lg" />
                                        ) : (
                                            <div className="text-6xl sm:text-7xl">😢</div>
                                        )}
                                    </motion.div>

                                    {/* Title */}
                                    <h1 className={`text-4xl sm:text-5xl font-black mb-3 ${isWinner ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {isWinner ? '🎉 VICTORY!' : 'GAME OVER'}
                                    </h1>

                                    {/* Subtitle */}
                                    <p className="text-xl sm:text-2xl text-white font-bold mb-2">
                                        Team {winnerTeam} Wins!
                                    </p>

                                    {/* Message */}
                                    <p className={`text-base sm:text-lg mb-6 ${isWinner ? 'text-green-300' : 'text-red-300'}`}>
                                        {isWinner
                                            ? "Congratulations! You've proven your Omi mastery!"
                                            : `Team ${loserTeam} ran out of tokens. Better luck next time!`
                                        }
                                    </p>

                                    {/* Final scores */}
                                    <div className="flex justify-center gap-8 mb-8">
                                        <div className={`px-6 py-3 rounded-xl ${tokens.A <= 0 ? 'bg-red-900/50 border border-red-500' : 'bg-green-900/50 border border-green-500'}`}>
                                            <div className="text-sm text-white/60">Team A</div>
                                            <div className={`text-2xl font-black ${tokens.A <= 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                {tokens.A} 🪙
                                            </div>
                                        </div>
                                        <div className={`px-6 py-3 rounded-xl ${tokens.B <= 0 ? 'bg-red-900/50 border border-red-500' : 'bg-green-900/50 border border-green-500'}`}>
                                            <div className="text-sm text-white/60">Team B</div>
                                            <div className={`text-2xl font-black ${tokens.B <= 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                {tokens.B} 🪙
                                            </div>
                                        </div>
                                    </div>

                                    {/* Play Again button */}
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={resetGame}
                                        className={`
                                            px-8 py-4 rounded-2xl font-black text-lg flex items-center gap-3 mx-auto
                                            ${isWinner
                                                ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-[0_0_30px_rgba(250,204,21,0.4)]'
                                                : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                                            }
                                        `}
                                    >
                                        <RotateCcw size={20} />
                                        Play Again
                                    </motion.button>
                                </motion.div>
                            </motion.div>
                        )
                    })()}
                </div>
            </div>

            {/* ═══════════════ MY HAND ═══════════════ */}
            <div className="absolute bottom-0 left-0 right-0 h-32 sm:h-40 flex items-end justify-center pb-2 sm:pb-4 z-40">
                {myHand.length > 0 ? (
                    <div className="flex items-end justify-center px-2 sm:px-4">
                        {myHand.map((card, i) => {
                            const totalCards = myHand.length
                            const middleIndex = (totalCards - 1) / 2
                            const offset = i - middleIndex
                            const rotation = offset * 2  // Less rotation
                            const yOffset = Math.abs(offset) * 3  // Less arc

                            return (
                                <motion.div
                                    key={card.id}
                                    initial={{ opacity: 0, y: 60 }}
                                    animate={{
                                        opacity: 1,
                                        y: yOffset,
                                        rotate: rotation,
                                        marginLeft: i === 0 ? 0 : -20  // More overlap on mobile
                                    }}
                                    transition={{ delay: i * 0.03 }}
                                    style={{ zIndex: i }}
                                    className="hover:z-50 hover:-translate-y-4 transition-transform duration-150"
                                >
                                    <Card
                                        card={card}
                                        onClick={playCard}
                                        isPlayable={isMyTurn && isValidMove(card, myHand, tableCards, trumpSuit)}
                                        size="normal"
                                    />
                                </motion.div>
                            )
                        })}
                    </div>
                ) : mySeatIndex !== -1 && gamePhase !== 'lobby' ? (
                    <p className="text-white/30 text-xs sm:text-sm animate-pulse mb-4 sm:mb-8">Waiting for cards...</p>
                ) : null}
            </div>

            {/* Instructions for non-seated players */}
            {
                mySeatIndex === -1 && gamePhase === 'lobby' && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40">
                        <div className="bg-black/50 backdrop-blur-xl px-6 py-3 rounded-xl border border-white/10">
                            <p className="text-gray-300 text-sm">Click on an empty seat to join the game</p>
                        </div>
                    </div>
                )
            }
        </main >
    )
}
