'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Crown, AlertCircle } from 'lucide-react'
import { isValidMove, determineTrickWinner } from '@/utils/omiRules' // අපි හදපු නීති පොත

// Constants
const SUITS = ['♠️', '♥️', '♣️', '♦️']
const RANKS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A']

const generateDeck = () => {
  let deck = []
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push({ id: `${rank}${suit}`, rank, suit, color: (suit === '♥️' || suit === '♦️') ? 'text-red-500' : 'text-black' })
    })
  })
  return deck.sort(() => Math.random() - 0.5)
}

export default function OmiGame() {
  const [user, setUser] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  // --- GAME STATE (Synced) ---
  const [players, setPlayers] = useState([]) 
  const [dealerIndex, setDealerIndex] = useState(0)
  const [turnIndex, setTurnIndex] = useState(0) // කාගෙ වාරේද?
  const [trumpSuit, setTrumpSuit] = useState(null)
  const [gamePhase, setGamePhase] = useState('waiting') // waiting, calling_trump, playing
  
  const [scores, setScores] = useState({ team1: 0, team2: 0 }) // Overall Game Points (0-10)
  const [tricks, setTricks] = useState({ team1: 0, team2: 0 }) // Current Round Tokens
  
  const [tableCards, setTableCards] = useState([])
  const [myHand, setMyHand] = useState([])
  
  // Local only
  const [alertMsg, setAlertMsg] = useState(null)
  const [currentDeck, setCurrentDeck] = useState([])

  // --- 1. SETUP & REALTIME ---
  useEffect(() => {
    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setUser(profile)

      const channel = supabase.channel('omi-logic-room')
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
        .on('broadcast', { event: 'receive-cards' }, ({ payload }) => {
             if (payload.hands[session.user.id]) setMyHand(payload.hands[session.user.id])
        })
        .on('broadcast', { event: 'trick-winner' }, ({ payload }) => {
             // වටේ දිනපු කෙනා පෙන්නන්න (Animation එකක් දාන්න පුළුවන් පස්සේ)
             setAlertMsg(`${payload.winnerName} won the trick!`)
             setTimeout(() => setAlertMsg(null), 2000)
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED' && profile) {
                await channel.send({ type: 'broadcast', event: 'join-req', payload: profile })
            }
        })

        // Host handles joins
        channel.on('broadcast', { event: 'join-req' }, ({ payload }) => {
            setPlayers(prev => {
                if (prev.find(p => p.id === payload.id)) return prev
                return [...prev, { id: payload.id, name: payload.full_name, avatar: payload.avatar_url }]
            })
        })

        return () => supabase.removeChannel(channel)
    }
    setup()
  }, [])

  // --- 2. GAME LOGIC (Run by Active Player) ---

  const syncGame = async (updates) => {
      await supabase.channel('omi-logic-room').send({
          type: 'broadcast',
          event: 'sync-state',
          payload: {
              players, dealerIndex, turnIndex, trumpSuit, gamePhase, scores, tricks, tableCards,
              ...updates
          }
      })
  }

  // A. START ROUND
  const startRound = async () => {
      const deck = generateDeck()
      setCurrentDeck(deck)
      
      const hands = {}
      hands[players[dealerIndex].id] = deck.slice(0, 4) // Dealer gets 4

      await syncGame({ 
          gamePhase: 'calling_trump', 
          trumpSuit: null, 
          tricks: { team1: 0, team2: 0 },
          tableCards: [],
          turnIndex: dealerIndex // Dealer ගෙන් පටන් ගන්නේ
      })
      await supabase.channel('omi-logic-room').send({ type: 'broadcast', event: 'receive-cards', payload: { hands } })
  }

  // B. SELECT TRUMP
  const selectTrump = async (suit) => {
      const hands = {}
      let cardIdx = 4
      
      // Dealer 2nd batch (4)
      hands[players[dealerIndex].id] = currentDeck.slice(4, 8)
      cardIdx = 8

      // Others get 8
      players.forEach((p, i) => {
          if (i !== dealerIndex) {
              hands[p.id] = currentDeck.slice(cardIdx, cardIdx + 8)
              cardIdx += 8
          }
      })

      await syncGame({ 
          trumpSuit: suit, 
          gamePhase: 'playing',
          turnIndex: dealerIndex // Dealer ම මුලින් ගහනවා (Trump කැල්ල)
      })
      await supabase.channel('omi-logic-room').send({ type: 'broadcast', event: 'receive-cards', payload: { hands } })
  }

  // C. PLAY CARD (The Main Logic)
  const handleCardClick = async (card) => {
      // 1. Is it my turn?
      if (players[turnIndex]?.id !== user.id) {
          setAlertMsg("Not your turn!"); setTimeout(() => setAlertMsg(null), 1000); return
      }

      // 2. Is it a valid move? (Rule Book Check)
      if (!isValidMove(card, myHand, tableCards, trumpSuit)) {
          setAlertMsg("You must follow the suit!"); setTimeout(() => setAlertMsg(null), 1000); return
      }

      // 3. Remove from hand & Add to table
      const newHand = myHand.filter(c => c.id !== card.id)
      setMyHand(newHand)
      
      const newTableCards = [...tableCards, { card, player: user.full_name, playerId: user.id }]
      const nextTurn = (turnIndex + 1) % players.length

      // 4. Check if Trick Ended (4 Cards)
      if (newTableCards.length === players.length) {
          // Broadcast the move first so everyone sees the 4th card
          await syncGame({ tableCards: newTableCards, turnIndex: -1 }) // -1 to pause turns

          // Wait 2 seconds, then calculate winner
          setTimeout(async () => {
              const winnerData = determineTrickWinner(newTableCards, trumpSuit)
              
              // Calculate Points
              // Team 1 = Index 0 & 2 | Team 2 = Index 1 & 3
              const winnerIndex = players.findIndex(p => p.id === winnerData.playerId)
              const winningTeam = (winnerIndex === 0 || winnerIndex === 2) ? 'team1' : 'team2'
              
              const newTricks = { ...tricks, [winningTeam]: tricks[winningTeam] + 1 }

              // Broadcast Winner
              await supabase.channel('omi-logic-room').send({ 
                  type: 'broadcast', 
                  event: 'trick-winner', 
                  payload: { winnerName: winnerData.player } 
              })

              // Check if Round Ended (8 Tricks total? Or 32 cards gone?)
              // For simplicity, we check if total tokens = 8 (assuming 4 players)
              // Actually Omi has 8 tricks.
              if (newTricks.team1 + newTricks.team2 === 8) {
                  endRound(newTricks)
              } else {
                  // Next Trick starts with Winner
                  await syncGame({ 
                      tableCards: [], 
                      tricks: newTricks, 
                      turnIndex: winnerIndex 
                  })
              }
          }, 2000)

      } else {
          // Just next player
          await syncGame({ 
              tableCards: newTableCards, 
              turnIndex: nextTurn 
          })
      }
  }

  // D. END ROUND (Scoring)
  const endRound = async (finalTricks) => {
      let newScores = { ...scores }
      // Simple Scoring: Majority wins (This is basic Omi)
      // Real Omi is complex (Kapothi etc.), let's allow Dealer to override if needed
      // For now: Winner gets 1 point
      if (finalTricks.team1 > finalTricks.team2) newScores.team1 += 1
      else newScores.team2 += 1

      const nextDealer = (dealerIndex + 1) % players.length

      await syncGame({
          gamePhase: 'waiting',
          scores: newScores,
          dealerIndex: nextDealer,
          tableCards: [],
          turnIndex: -1
      })
  }

  // UI Helpers
  const isMyTurn = players[turnIndex]?.id === user?.id
  const isDealer = players[dealerIndex]?.id === user?.id

  return (
    <div className="min-h-screen bg-green-900 text-white flex flex-col relative overflow-hidden font-sans select-none">
      
      {/* ALERT OVERLAY */}
      {alertMsg && <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-black/80 px-6 py-2 rounded-full border border-red-500 z-[100] animate-in slide-in-from-top"><p className="text-white font-bold flex items-center gap-2"><AlertCircle size={16}/> {alertMsg}</p></div>}

      {/* TOP BAR */}
      <div className="bg-black/40 backdrop-blur-md p-3 flex justify-between items-center z-50">
         <div onClick={() => router.push('/')} className="p-2 bg-white/10 rounded-full"><ArrowLeft size={20}/></div>
         <div className="flex items-center gap-6">
             <div className="text-center"><p className="text-[9px] text-gray-400 font-bold">TEAM A</p><p className="text-xl font-black text-blue-400">{scores.team1} <span className="text-xs text-white">({tricks.team1})</span></p></div>
             <div className="text-center"><p className="text-[9px] text-gray-400 font-bold">TEAM B</p><p className="text-xl font-black text-red-400">{scores.team2} <span className="text-xs text-white">({tricks.team2})</span></p></div>
         </div>
         <div className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full"><Crown size={14} className="text-yellow-400"/> <span className="text-xs font-bold text-yellow-400">{players[dealerIndex]?.name.split(' ')[0]}</span></div>
      </div>

      {/* TABLE AREA */}
      <div className="flex-1 relative flex flex-col items-center justify-center">
          
          {/* TRUMP INDICATOR */}
          {trumpSuit && (
              <div className="absolute top-4 left-4 bg-white text-black p-2 rounded-xl shadow-xl border-4 border-yellow-500">
                  <p className="text-[8px] font-black uppercase">Trump</p>
                  <p className={`text-2xl leading-none ${trumpSuit === '♥️' || trumpSuit === '♦️' ? 'text-red-600' : 'text-black'}`}>{trumpSuit}</p>
              </div>
          )}

          {/* TURN INDICATOR */}
          <div className="absolute top-4 bg-black/50 px-4 py-1 rounded-full border border-white/20">
             <p className="text-xs font-bold text-white">Turn: <span className="text-green-400">{players[turnIndex]?.name || 'Waiting...'}</span></p>
          </div>

          {/* CARDS ON TABLE */}
          <div className="w-72 h-72 rounded-full border-[8px] border-yellow-600/30 bg-green-800/50 flex items-center justify-center relative">
              {tableCards.map((move, i) => (
                  <div key={i} className="absolute animate-in zoom-in" style={{ transform: `rotate(${i * 20 - 20}deg) translate(${i * 10}px, ${i * -10}px)`, zIndex: i }}>
                      <div className={`w-16 h-24 bg-white rounded shadow-md border border-gray-300 flex flex-col items-center justify-center ${move.card.color}`}>
                          <span className="text-xl font-bold">{move.card.rank}</span><span className="text-xl">{move.card.suit}</span>
                      </div>
                      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] bg-black text-white px-1 rounded">{move.player.split(' ')[0]}</span>
                  </div>
              ))}

              {/* DEALER START BTN */}
              {isDealer && gamePhase === 'waiting' && players.length > 0 && (
                  <button onClick={startRound} className="absolute z-50 bg-yellow-500 text-black font-black px-6 py-2 rounded-full shadow-lg hover:scale-110 transition-transform animate-pulse">START GAME</button>
              )}

              {/* TRUMP SELECTOR */}
              {isDealer && gamePhase === 'calling_trump' && (
                  <div className="absolute inset-0 bg-black/90 rounded-full flex flex-col items-center justify-center z-50">
                      <p className="text-yellow-400 text-xs font-bold mb-2">PICK TRUMP</p>
                      <div className="grid grid-cols-2 gap-2">
                          {SUITS.map(suit => (
                              <button key={suit} onClick={() => selectTrump(suit)} className="w-10 h-10 bg-white rounded text-2xl hover:scale-110">{suit}</button>
                          ))}
                      </div>
                  </div>
              )}
          </div>
      </div>

      {/* MY HAND */}
      <div className={`h-40 bg-gradient-to-t from-black to-transparent p-2 flex items-end justify-center w-full transition-opacity ${isMyTurn ? 'opacity-100' : 'opacity-60 grayscale'}`}>
          <div className="flex -space-x-2">
              {myHand.map((card) => (
                  <button 
                    key={card.id} 
                    onClick={() => handleCardClick(card)} 
                    disabled={!isMyTurn}
                    className={`w-20 h-32 bg-white rounded-lg shadow-2xl border flex flex-col items-center justify-between p-1 hover:-translate-y-4 transition-transform ${card.color} ${!isMyTurn ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                      <div className="text-sm font-bold self-start leading-none">{card.rank}<br/>{card.suit}</div>
                      <div className="text-3xl opacity-20">{card.suit}</div>
                      <div className="text-sm font-bold self-end rotate-180 leading-none">{card.rank}<br/>{card.suit}</div>
                  </button>
              ))}
          </div>
      </div>
      {isMyTurn && <div className="absolute bottom-40 w-full text-center pointer-events-none"><span className="bg-green-500 text-black text-xs font-bold px-3 py-1 rounded-full animate-bounce">YOUR TURN!</span></div>}

    </div>
  )
}