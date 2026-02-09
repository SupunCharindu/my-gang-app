// src/utils/omiRules.js
// ═══════════════════════════════════════════════════════════════════════
// 🎴 OMI GAME RULES - Sri Lanka's Traditional Card Game
// ═══════════════════════════════════════════════════════════════════════

const RANKS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A']
const RANK_POWER = { '7': 0, '8': 1, '9': 2, '10': 3, 'J': 4, 'Q': 5, 'K': 6, 'A': 7 }

/**
 * Get the power value of a card rank (higher = stronger)
 * A is highest (7), 7 is lowest (0)
 */
export const getCardPower = (rank) => {
  return RANK_POWER[rank] ?? 0
}

/**
 * Determine the winner of a trick
 * @param {Array} cards - Array of {card: {rank, suit}, playerId, playerName}
 * @param {string} trumpSuit - The trump suit for this round
 * @returns {Object} The winning play {card, playerId, playerName}
 * 
 * Rules:
 * 1. If any trump cards are played, highest trump wins
 * 2. Otherwise, highest card of the lead suit wins
 */
export const determineTrickWinner = (cards, trumpSuit) => {
  if (cards.length === 0) return null

  const leadSuit = cards[0].card.suit
  let winner = cards[0]
  let winningPower = getCardPower(cards[0].card.rank)
  let trumpPlayed = cards[0].card.suit === trumpSuit

  for (let i = 1; i < cards.length; i++) {
    const current = cards[i]
    const currentSuit = current.card.suit
    const currentPower = getCardPower(current.card.rank)

    if (currentSuit === trumpSuit) {
      // Trump card played
      if (!trumpPlayed) {
        // First trump beats everything
        winner = current
        winningPower = currentPower
        trumpPlayed = true
      } else if (currentPower > winningPower) {
        // Higher trump wins
        winner = current
        winningPower = currentPower
      }
    } else if (currentSuit === leadSuit && !trumpPlayed) {
      // Lead suit card, no trump played yet
      if (currentPower > winningPower) {
        winner = current
        winningPower = currentPower
      }
    }
    // Cards of other suits (not trump, not lead) cannot win
  }

  return winner
}

/**
 * Check if a move is valid
 * @param {Object} card - The card to play
 * @param {Array} hand - All cards in player's hand
 * @param {Array} tableCards - Cards already played in this trick
 * @param {string} trumpSuit - The trump suit (not directly used for validation)
 * @returns {boolean} Whether the move is legal
 * 
 * Rules:
 * 1. If first to play, any card is valid
 * 2. Must follow lead suit if possible
 * 3. If no lead suit in hand, can play anything (including trump)
 */
export const isValidMove = (card, hand, tableCards, trumpSuit) => {
  // First player can play anything
  if (tableCards.length === 0) return true

  const leadSuit = tableCards[0].card.suit

  // Check if player has any cards of the lead suit
  const hasLeadSuit = hand.some(c => c.suit === leadSuit)

  if (hasLeadSuit) {
    // Must follow suit
    return card.suit === leadSuit
  } else {
    // Can play anything (trump or other)
    return true
  }
}

/**
 * Calculate tokens won at end of round
 * @param {Object} tricks - { A: number, B: number } - tricks won by each team
 * @param {string} declarerTeam - Which team declared trump ('A' or 'B')
 * @returns {Object} { winner: 'A'|'B'|null, tokens: number }
 * 
 * Scoring Rules:
 * - Declarer's team wins 5-7 tricks: 1 token
 * - Declarer's team wins all 8 tricks (Kapothi): 3 tokens
 * - Non-declarer team wins 5-7 tricks: 2 tokens
 * - Non-declarer team wins all 8 tricks (Kapothi): 3 tokens
 * - 4-4 tie: No tokens exchanged (carry over +1 for next round)
 */
export const calculateRoundScore = (tricks, declarerTeam) => {
  const otherTeam = declarerTeam === 'A' ? 'B' : 'A'

  // Check for tie
  if (tricks.A === tricks.B) {
    return { winner: null, tokens: 0 }
  }

  const declarerTricks = tricks[declarerTeam]
  const otherTricks = tricks[otherTeam]

  if (declarerTricks > otherTricks) {
    // Declarer's team won
    if (declarerTricks === 8) {
      return { winner: declarerTeam, tokens: 3 } // Kapothi!
    }
    return { winner: declarerTeam, tokens: 1 }
  } else {
    // Other team won (beat the declarer)
    if (otherTricks === 8) {
      return { winner: otherTeam, tokens: 3 } // Kapothi!
    }
    return { winner: otherTeam, tokens: 2 } // Bonus for beating declarer
  }
}

/**
 * Check if game is over
 * @param {Object} tokens - { A: number, B: number }
 * @returns {string|null} Winning team or null if game continues
 */
export const checkGameOver = (tokens) => {
  if (tokens.A >= 10) return 'A'
  if (tokens.B >= 10) return 'B'
  return null
}