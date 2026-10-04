/**
 * storyEditorConstants.js
 * 
 * Shared constants and presets for the Story Editor.
 */

export const STORY_FILTERS = [
  { id: 'none', label: 'Normal', css: '' },
  { id: 'vivid', label: 'Vivid', css: 'contrast-[1.15] saturate-[1.3]' },
  { id: 'cinematic', label: 'Cinema', css: 'contrast-[1.1] brightness-95 saturate-[0.85]' },
  { id: 'warm', label: 'Warm', css: 'sepia-[0.2] saturate-[1.2] hue-rotate-[-10deg]' },
  { id: 'noir', label: 'Noir', css: 'grayscale contrast-[1.2]' },
];

export const DRAWING_COLORS = [
  '#00F5A0', // Zeitnah Mint
  '#00D9F5', // Cyan
  '#F5D900', // Yellow
  '#FF5E7E', // Rose
  '#FFFFFF', // White
  '#070B14', // Noir Black
];

export const STROKE_WIDTHS = [
  { id: 'fine', size: 3, label: 'Fine' },
  { id: 'medium', size: 6, label: 'Medium' },
  { id: 'bold', size: 12, label: 'Bold' },
];

export const TEXT_COLORS = [
  '#FFFFFF',
  '#00F5A0',
  '#00D9F5',
  '#F5D900',
  '#FF5E7E',
  '#070B14',
];

export const CURATED_STICKERS = [
  { id: 'heart', emoji: '❤️', label: 'Heart' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'clap', emoji: '👏', label: 'Clap' },
  { id: 'idea', emoji: '💡', label: 'Idea' },
  { id: 'sparkles', emoji: '✨', label: 'Sparkles' },
  { id: 'laugh', emoji: '😂', label: 'Joy' },
  { id: 'party', emoji: '🎉', label: 'Party' },
  { id: 'rocket', emoji: '🚀', label: 'Rocket' },
  { id: '100', emoji: '💯', label: 'Hundred' },
  { id: 'handshake', emoji: '🤝', label: 'Partnership' },
  { id: 'sunglasses', emoji: '😎', label: 'Cool' },
  { id: 'trophy', emoji: '🏆', label: 'Trophy' },
];
