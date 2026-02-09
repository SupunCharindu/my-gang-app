'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Crown, AlertCircle, User, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { isValidMove, determineTrickWinner } from '@/utils/omiRules'

// --- ASSETS ---
// Use standard Suits characters with colors
const SUITS = {
    '♠️': { color: 'text-gray-900', label: 'Spades' },
    '♥️': { color: 'text-red-500', label: 'Hearts' },
    '♣️': { color: 'text-gray-900', label: 'Clubs' },
    '♦️': { color: 'text-red-500', label: 'Diamonds' }
}
const RANKS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A']

// --- DECK GENERATOR ---
const generateDeck = () => {
    let deck = []
    Object.keys(SUITS).forEach(suit => {
        RANKS.forEach(rank => {
            deck.push({ id: `${rank}${suit}`, rank, suit, color: SUITS[suit].color })
        })
    })
    return deck.sort(() => Math.random() - 0.5)
}

// --- COMPONENTS ---

const Card = ({ card, onClick, isPlayable, style, index }) => {
    return (
        <motion.button
            layoutId={card.id}
            whileHover={isPlayable ? { y: -20, scale: 1.1, zIndex: 100 } : {}}
            whileTap={isPlayable ? { scale: 0.95 } : {}}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0, rotate: index * 2 - (4 * 2) }}
            onClick={() => isPlayable && onClick(card)}
            className={`relative w-24 h-36 bg-white rounded-xl shadow-2xl border-2 border-gray-200 flex flex-col items-center justify-between p-2 select-none transition-colors ${!isPlayable ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer hover:border-yellow-400'}`}
            style={style}
        >
            <div className={`text-lg font-black self-start leading-none ${card.color}`}>{card.rank}<br /><span className="text-xl">{card.suit}</span></div>
            <div className={`text-5xl opacity-20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${card.color}`}>{card.suit}</div>
            <div className={`text-lg font-black self-end rotate-180 leading-none ${card.color}`}>{card.rank}<br /><span className="text-xl">{card.suit}</span></div>
        </motion.button>
    )
}

const Seat = ({ player, position, isThinking, isDealer, score }) => {
    // position: 'bottom' (Me), 'left', 'top', 'right'
    const posStyles = {
        bottom: 'bottom-4 left-1/2 -translate-x-1/2',
        left: 'left-4 top-1/2 -translate-y-1/2 flex-col',
        top: 'top-4 left-1/2 -translate-x-1/2 flex-col-reverse',
        right: 'right-4 top-1/2 -translate-y-1/2 flex-col'
    }

    return (
        <div className={`absolute ${posStyles[position]} flex items-center gap-3 p-3 rounded-2xl backdrop-blur-md transition-all ${isThinking ? 'bg-yellow-500/20 border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.2)]' : 'bg-black/40 border-white/10'}`}>
            <div className="relative">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 bg-gray-800">
                    {player ? <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-gray-500" />}
                </div>
                {isDealer && <div className="absolute -top-2 -right-2 bg-yellow-400 text-black p-1 rounded-full shadow-lg"><Crown size={10} /></div>}
                {isThinking && <div className="absolute inset-0 border-2 border-yellow-400 rounded-full animate-ping" />}
            </div>
            <div className="flex flex-col">
                <span className="text-xs font-bold text-white max-w-[80px] truncate">{player ? player.name : 'Empty Seat'}</span>
                {player && <span className="text-[10px] text-gray-400 font-mono">Team {player.team}</span>}
            </div>
        </div>
    )
}

export default function OmiGame() {
    const router = useRouter()
    const supabase = createClient()
    const [user, setUser] = useState(null)

    // Game State
    const [players, setPlayers] = useState([null, null, null, null]) // Fixed 4 slots
    const [dealerIndex, setDealerIndex] = useState(0)
    const [turnIndex, setTurnIndex] = useState(0)
    const [trumpSuit, setTrumpSuit] = useState(null)
    const [gamePhase, setGamePhase] = useState('waiting') // waiting, calling_trump, playing
    const [scores, setScores] = useState({ team1: 0, team2: 0 })
    const [tricks, setTricks] = useState({ team1: 0, team2: 0 })
    const [tableCards, setTableCards] = useState([])
    const [myHand, setMyHand] = useState([])

    const [alertMsg, setAlertMsg] = useState(null)
    const [currentDeck, setCurrentDeck] = useState([]) // Dealer only

    // --- SETUP ---
    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) { router.push('/login'); return }
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
            setUser(profile)

            const channel = supabase.channel('omi-game-v2')
                .on('broadcast', { event: 'sync-state' }, ({ payload }) => {
                    setPlayers(payload.players)
                    setDealerIndex(payload.dealerIndex)
                    setTurnIndex(payload.turnIndex)
                    setTrumpSuit(payload.trumpSuit)
                    setGamePhase(payload.gamePhase)
                    setScores(payload.scores)
                    setTricks(payload.tricks)
                    setTableCards(payload.tableCards || [])
                })
                .on('broadcast', { event: 'deal-cards' }, ({ payload }) => {
                    if (payload.hands[session.user.id]) setMyHand(payload.hands[session.user.id])
                })
                .on('broadcast', { event: 'game-alert' }, ({ payload }) => {
                    setAlertMsg(payload.message)
                    setTimeout(() => setAlertMsg(null), 2000)
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        // Ask for current state
                        await channel.send({ type: 'broadcast', event: 'request-state', payload: {} })
                    }
                })

            // Host Logic: Send state to new joiners
            channel.on('broadcast', { event: 'request-state' }, () => {
                if (players[0]?.id === session.user.id) { // If I am seat 1 (Host)
                    syncGame()
                }
            })

            return () => supabase.removeChannel(channel)
        }
        init()
    }, [])

    const syncGame = async (updates = {}) => {
        // Merge updates
        const newState = {
            players, dealerIndex, turnIndex, trumpSuit, gamePhase, scores, tricks, tableCards,
            ...updates
        }
        await supabase.channel('omi-game-v2').send({ type: 'broadcast', event: 'sync-state', payload: newState })
    }

    // --- ACTIONS ---

    const sit = async (slotIndex) => {
        if (!user) return
        if (players[slotIndex]) return // Occupied
        if (players.some(p => p?.id === user.id)) return // Already sat

        const newPlayers = [...players]
        newPlayers[slotIndex] = {
            id: user.id,
            name: user.full_name,
            avatar: user.avatar_url,
            team: (slotIndex === 0 || slotIndex === 2) ? 'A' : 'B'
        }
        setPlayers(newPlayers)
        await syncGame({ players: newPlayers })
    }

    const startGame = async () => {
        if (players.some(p => p === null)) {
            setAlertMsg("Waiting for 4 players!")
            setTimeout(() => setAlertMsg(null), 2000)
            return
        }
        const deck = generateDeck()
        setCurrentDeck(deck)

        // Deal first 4 to Dealer
        const hands = {}
        players.forEach(p => hands[p.id] = [])
        hands[players[dealerIndex].id] = deck.slice(0, 4)

        await syncGame({
            gamePhase: 'calling_trump',
            trumpSuit: null,
            tricks: { team1: 0, team2: 0 },
            tableCards: [],
            turnIndex: dealerIndex
        })
        await supabase.channel('omi-game-v2').send({ type: 'broadcast', event: 'deal-cards', payload: { hands } })
    }

    const selectTrump = async (suit) => {
        // Deal remaining cards
        const hands = {}
        let deckIdx = 4
        hands[players[dealerIndex].id] = currentDeck.slice(4, 8) // Dealer remaining 4
        deckIdx = 8

        players.forEach((p, i) => {
            if (i !== dealerIndex) {
                hands[p.id] = currentDeck.slice(deckIdx, deckIdx + 8)
                deckIdx += 8
            }
        })

        // Send updates
        await syncGame({
            trumpSuit: suit,
            gamePhase: 'playing',
            turnIndex: dealerIndex
        })
        await supabase.channel('omi-game-v2').send({ type: 'broadcast', event: 'deal-cards', payload: { hands } })
    }

    const playCard = async (card) => {
        // Logic same as before, simplified for read
        const newHand = myHand.filter(c => c.id !== card.id)
        setMyHand(newHand)

        const newTableCards = [...tableCards, { card, player: user.full_name, playerId: user.id }]
        const nextTurn = (turnIndex + 1) % 4

        if (newTableCards.length === 4) {
            // Trick Complete
            await syncGame({ tableCards: newTableCards, turnIndex: -1 }) // Pause

            setTimeout(async () => {
                const winnerData = determineTrickWinner(newTableCards, trumpSuit)
                await supabase.channel('omi-game-v2').send({ type: 'broadcast', event: 'game-alert', payload: { message: `${winnerData.player} wins!` } })

                const winnerIdx = players.findIndex(p => p.id === winnerData.playerId)
                const winningTeam = (winnerIdx === 0 || winnerIdx === 2) ? 'team1' : 'team2'
                const newTricks = { ...tricks, [winningTeam]: tricks[winningTeam] + 1 }

                if (newTricks.team1 + newTricks.team2 === 8) {
                    // Round End
                    const roundWinner = newTricks.team1 > newTricks.team2 ? 'team1' : 'team2'
                    const newScores = { ...scores, [roundWinner]: scores[roundWinner] + 1 }
                    const nextDealer = (dealerIndex + 1) % 4

                    await syncGame({
                        scores: newScores,
                        dealerIndex: nextDealer,
                        gamePhase: 'waiting',
                        tableCards: [],
                        tricks: { team1: 0, team2: 0 },
                        turnIndex: -1
                    })
                } else {
                    // Next Trick
                    await syncGame({
                        tableCards: [],
                        tricks: newTricks,
                        turnIndex: winnerIdx
                    })
                }
            }, 2000)
        } else {
            await syncGame({ tableCards: newTableCards, turnIndex: nextTurn })
        }
    }

    // --- HELPER: GET ROTATED VIEW ---
    // Returns [Bottom(Me), Left, Top, Right]
    const getSeatedPlayers = () => {
        if (!user) return players
        const mySeatIdx = players.findIndex(p => p?.id === user.id)
        if (mySeatIdx === -1) return players // Spectator view (0,1,2,3)

        const rotated = []
        for (let i = 0; i < 4; i++) {
            rotated.push(players[(mySeatIdx + i) % 4])
        }
        return rotated
    }

    const seatedView = getSeatedPlayers()
    const isMyTurn = players[turnIndex]?.id === user?.id
    const isDealer = players[dealerIndex]?.id === user?.id
    const mySeatIdx = players.findIndex(p => p?.id === user?.id)

    return (
        <main className="h-screen bg-[#0a1f13] overflow-hidden relative font-sans select-none flex flex-col">
            {/* BACKGROUND PATTERN */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>

            {/* --- HEADER --- */}
            <header className="flex justify-between items-center p-4 z-50">
                <button onClick={() => router.push('/')} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors">
                    <ArrowLeft size={24} />
                </button>

                <div className="flex items-center gap-8 bg-black/40 px-8 py-2 rounded-2xl backdrop-blur-xl border border-white/5">
                    <div className="text-center">
                        <p className="text-[10px] text-blue-300 font-bold tracking-widest uppercase mb-1">TEAM A</p>
                        <div className="flex items-baseline gap-1 justify-center">
                            <span className="text-3xl font-black text-white">{scores.team1}</span>
                            <span className="text-sm font-medium text-white/50">/ 10</span>
                        </div>
                        <div className="flex gap-1 justify-center mt-1">
                            {[...Array(tricks.team1)].map((_, i) => <div key={i} className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />)}
                        </div>
                    </div>
                    <div className="w-px h-10 bg-white/10" />
                    <div className="text-center">
                        <p className="text-[10px] text-red-300 font-bold tracking-widest uppercase mb-1">TEAM B</p>
                        <div className="flex items-baseline gap-1 justify-center">
                            <span className="text-3xl font-black text-white">{scores.team2}</span>
                            <span className="text-sm font-medium text-white/50">/ 10</span>
                        </div>
                        <div className="flex gap-1 justify-center mt-1">
                            {[...Array(tricks.team2)].map((_, i) => <div key={i} className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />)}
                        </div>
                    </div>
                </div>

                <div className="w-10" /> {/* Spacer */}
            </header>

            {/* --- TABLE --- */}
            <div className="flex-1 relative flex items-center justify-center">
                {alertMsg && (
                    <div className="absolute top-20 z-[100] animate-in slide-in-from-top fade-in duration-300">
                        <div className="bg-black/80 backdrop-blur-md px-6 py-3 rounded-full border border-yellow-500/50 flex items-center gap-3 shadow-2xl">
                            <Zap className="text-yellow-400 fill-yellow-400" size={20} />
                            <span className="text-white font-bold tracking-wide">{alertMsg}</span>
                        </div>
                    </div>
                )}

                {/* SEATS */}
                {/* 0 = Bottom (Me), 1 = Left, 2 = Top, 3 = Right */}
                {/* If spectator, 0 is just Player 1 */}
                <Seat player={seatedView[0]} position="bottom" isThinking={turnIndex === players.indexOf(seatedView[0])} isDealer={dealerIndex === players.indexOf(seatedView[0])} />
                <Seat player={seatedView[1]} position="left" isThinking={turnIndex === players.indexOf(seatedView[1])} isDealer={dealerIndex === players.indexOf(seatedView[1])} />
                <Seat player={seatedView[2]} position="top" isThinking={turnIndex === players.indexOf(seatedView[2])} isDealer={dealerIndex === players.indexOf(seatedView[2])} />
                <Seat player={seatedView[3]} position="right" isThinking={turnIndex === players.indexOf(seatedView[3])} isDealer={dealerIndex === players.indexOf(seatedView[3])} />

                {/* EMPTY SEAT BUTTONS (Only if not sat) */}
                {mySeatIdx === -1 && players.map((p, i) => {
                    if (p) return null
                    // Visual position logic based on index (0=Bottom, 1=Left...)
                    // Since I'm not sat, I see them as fixed absolute positions
                    const posStyles = ['bottom-32 left-1/2 -translate-x-1/2', 'left-32 top-1/2 -translate-y-1/2', 'top-32 left-1/2 -translate-x-1/2', 'right-32 top-1/2 -translate-y-1/2']
                    return <button key={i} onClick={() => sit(i)} className={`absolute ${posStyles[i]} z-20 bg-white/10 hover:bg-white/20 border border-white/20 border-dashed rounded-xl p-4 flex flex-col items-center gap-2 group transition-all`}><User className="text-white/50 group-hover:text-white" /><span className="text-xs text-white/50 font-bold uppercase">Sit Here</span></button>
                })}

                {/* CENTER TABLE */}
                <div className="w-[300px] h-[300px] rounded-full bg-[#143322] border-8 border-[#1f4d33] shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-center relative">
                    {/* TRUMP SUIT */}
                    {trumpSuit && <div className="absolute top-8 right-8 text-4xl opacity-20 pointer-events-none select-none">{trumpSuit}</div>}

                    {/* PLAYED CARDS */}
                    <AnimatePresence>
                        {tableCards.map((move, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.5, y: 50 }}
                                animate={{ opacity: 1, scale: 1, y: 0, rotate: (i - 1) * 10 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="absolute"
                                style={{ zIndex: i }}
                            >
                                <div className={`w-20 h-28 bg-white rounded-lg shadow-xl border border-gray-300 flex flex-col items-center justify-center ${move.card.color}`}>
                                    <span className="text-2xl font-black">{move.card.rank}</span>
                                    <span className="text-2xl">{move.card.suit}</span>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* DEALER START BUTTON */}
                    {isDealer && gamePhase === 'waiting' && players.every(p => p !== null) && (
                        <button onClick={startGame} className="z-50 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-black px-8 py-3 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.5)] hover:scale-105 active:scale-95 transition-all text-sm tracking-wide">
                            DEAL CARDS
                        </button>
                    )}

                    {/* TRUMP SELECTION */}
                    {isDealer && gamePhase === 'calling_trump' && (
                        <div className="z-50 bg-black/90 p-6 rounded-3xl border border-white/10 text-center animate-in zoom-in fade-in">
                            <p className="text-yellow-400 font-bold text-xs uppercase tracking-widest mb-4">Select Trump</p>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.keys(SUITS).map(suit => (
                                    <button key={suit} onClick={() => selectTrump(suit)} className="w-12 h-12 bg-white rounded-xl text-3xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg">{suit}</button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- MY HAND --- */}
            <div className="h-48 w-full flex items-end justify-center pb-6 perspective-1000">
                {myHand.length > 0 ? (
                    <div className="flex -space-x-4 hover:space-x-1 transition-all duration-300 px-10">
                        {myHand.map((card, i) => (
                            <Card
                                key={card.id}
                                card={card}
                                index={i}
                                isPlayable={isMyTurn && isValidMove(card, myHand, tableCards, trumpSuit)}
                                onClick={playCard}
                            />
                        ))}
                    </div>
                ) : (
                    mySeatIdx !== -1 && gamePhase !== 'waiting' && (
                        <p className="text-white/30 font-medium text-sm animate-pulse pb-10">Waiting for next round...</p>
                    )
                )}
            </div>
        </main>
    )
}
