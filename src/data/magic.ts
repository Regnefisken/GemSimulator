import type { MagicProperty } from '../types'

export const MAGIC_PROPERTIES: MagicProperty[] = [
  { name: 'Ild', icon: '🔥', color: 'text-red-400 bg-red-900/40 border border-red-500', glow: '#ef4444', rarity: 'common' },
  { name: 'Frost', icon: '❄️', color: 'text-blue-400 bg-blue-900/40 border border-blue-500', glow: '#3b82f6', rarity: 'common' },
  { name: 'Lyn', icon: '⚡', color: 'text-yellow-400 bg-yellow-900/40 border border-yellow-500', glow: '#eab308', rarity: 'common' },
  { name: 'Natur', icon: '🌿', color: 'text-green-400 bg-green-900/40 border border-green-500', glow: '#10b981', rarity: 'common' },
  { name: 'Giftig', icon: '☠️', color: 'text-emerald-400 bg-emerald-900/60 border border-emerald-400', glow: '#059669', rarity: 'uncommon' },
  { name: 'Helbredende', icon: '❤️‍🩹', color: 'text-pink-400 bg-pink-900/50 border border-pink-500', glow: '#ec4899', rarity: 'uncommon' },
  { name: 'Sjælebindende', icon: '🔮', color: 'text-purple-400 bg-purple-900/60 border border-purple-400 shadow-[0_0_10px_purple]', glow: '#a855f7', rarity: 'rare' },
  { name: 'Tidskontrollerende', icon: '⏳', color: 'text-cyan-300 bg-cyan-900/60 border border-cyan-300 shadow-[0_0_10px_cyan]', glow: '#06b6d4', rarity: 'rare' },
  { name: 'Radioaktiv', icon: '☢️', color: 'text-lime-300 bg-lime-900/80 border-2 border-lime-400 shadow-[0_0_15px_lime] animate-pulse', glow: '#84cc16', rarity: 'legendary' },
]
