// src/utils/omiRules.js

const RANKS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A']

// 1. කාඩ් එකේ වටිනාකම (Power) හොයන එක
export const getCardPower = (rank) => {
  return RANKS.indexOf(rank)
}

// 2. දිනන්නේ කවුද කියලා බලන මැෂින් එක (Trick Winner)
export const determineTrickWinner = (cards, trumpSuit) => {
  // cards = [{ card: {rank, suit}, player: 'Name', playerId: '123' }, ...]
  
  if (cards.length === 0) return null

  const leadCard = cards[0].card
  const leadSuit = leadCard.suit
  
  let winner = cards[0]
  let winningPower = getCardPower(leadCard.rank)
  let isTrumpPlayed = leadSuit === trumpSuit

  // කාඩ් 4ම චෙක් කරනවා
  for (let i = 1; i < cards.length; i++) {
    const current = cards[i]
    const currentSuit = current.card.suit
    const currentPower = getCardPower(current.card.rank)

    if (currentSuit === trumpSuit) {
      // තුරුම්පු ගැහුවොත්
      if (!isTrumpPlayed) {
        // කලින් තුරුම්පු වැටිලා නැත්නම්, මේක තමයි දැනට දිනුම්
        winner = current
        winningPower = currentPower
        isTrumpPlayed = true
      } else {
        // කලින් තුරුම්පු වැටිලා නම්, ලොකු එක බලනවා
        if (currentPower > winningPower) {
          winner = current
          winningPower = currentPower
        }
      }
    } else if (currentSuit === leadSuit && !isTrumpPlayed) {
      // තුරුම්පු වැටිලා නැත්නම්, මුල් පාටේ ලොකු එක බලනවා
      if (currentPower > winningPower) {
        winner = current
        winningPower = currentPower
      }
    }
  }

  return winner // { player, playerId, ... }
}

// 3. නීති චෙක් කිරීම (Valid Move?)
export const isValidMove = (card, hand, tableCards, trumpSuit) => {
  // 1. මේසෙට තාම කාඩ් වැටිලා නැත්නම්, ඕන එකක් ගහන්න පුළුවන්
  if (tableCards.length === 0) return true

  const leadSuit = tableCards[0].card.suit
  
  // 2. අතේ ඒ පාටම (Lead Suit) තියෙනවද බලනවා
  const hasLeadSuit = hand.some(c => c.suit === leadSuit)

  if (hasLeadSuit) {
    // තියෙනවා නම්, ඒකම ගහන්න ඕන
    return card.suit === leadSuit
  } else {
    // නැත්නම්, ඕන එකක් (තුරුම්පු හෝ වෙනත්) ගහන්න පුළුවන්
    return true
  }
}