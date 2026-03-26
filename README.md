# Liar's Dice, Baby!

A multiplayer pirate-themed bluffing game with peer-to-peer connection
- Each player holds 5 dice, kept secret from others.
- On your turn, bid how many dice of a face value exist across ALL hands (e.g. "three 4s").
- Each bid must raise the count — or same count with a higher face.
- 1s are wild — they count as any face.
- Call "Liar!" to challenge the last bid.
- If the actual count ≥ the bid → challenger loses a die. Otherwise the bidder loses.
- Lose all your dice and you're out
- Downloadable game logs (text and JSON)
- Mobile-friendly interface

## How to Play
- Each player holds 5 dice, kept secret from others
- On your turn, bid how many dice of a face value exist across ALL hands (e.g. "three 4s")
- Each bid must raise the count — or same count with a higher face
- 1's are wild — they count as any face
- Call "Liar!" to challenge the last bid
- If the actual count ≥ the bid → challenger loses a die. Otherwise the bidder loses
- Lose all your dice and you're out. Last crew standing wins!

![Instructions on how to set up a lobby and join it](/public/images/how-to-join.gif)

## Development Setup

Want to mod it up? Here's how:

1. Clone or download the repo
2. Open a terminal in the project folder
3. Run these commands:

```bash
npm install
npm run dev
```

To build for production:
```bash
npm run build
```

## Tech Stack
- React/ TypeScript + Vite
- PeerJS for WebRTC connections

## License
Apache-2.0
