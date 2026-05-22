/**
 * Mock content powering the ExpressionsPicker — emoji categories, GIFs,
 * stickers, and memes. The emoji set is curated rather than exhaustive so
 * the picker stays fast.
 */

export interface EmojiCategory {
  id: string;
  name: string;
  icon: string; // emoji used as the tab pill icon
  items: string[];
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "recent",
    name: "Recent",
    icon: "🕘",
    items: ["✨", "❤️", "🔥", "😂", "🥲", "🙌", "👀", "🤝", "💜", "🎉", "🤯", "🥹"]
  },
  {
    id: "smileys",
    name: "Smileys & People",
    icon: "😀",
    items: [
      "😀","😃","😄","😁","😆","🥹","😅","😂","🤣","🥲","🙂","🙃","😉","😊","😇",
      "🥰","😍","🤩","😘","😗","☺️","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑",
      "🤗","🤭","🫢","🫣","🤫","🤔","🫡","🤐","🤨","😐","😑","😶","🫥","😏","😒",
      "🙄","😬","😮‍💨","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧",
      "🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐","😕","🫤","😟","🙁",
      "☹️","😮","😯","😲","😳","🥺","🥹","😦","😧","😨","😰","😥","😢","😭","😱",
      "👋","🤚","🖐","✋","🖖","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","🫵",
      "👍","👎","👊","✊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","💪","🦾"
    ]
  },
  {
    id: "animals",
    name: "Animals & Nature",
    icon: "🐶",
    items: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐻‍❄️","🐨","🐯","🦁","🐮","🐷","🐽",
      "🐸","🐵","🙈","🙉","🙊","🐒","🐔","🐧","🐦","🐤","🐣","🐥","🦆","🦅","🦉",
      "🦇","🐺","🐗","🐴","🦄","🐝","🪱","🐛","🦋","🐌","🐞","🐜","🪰","🪲","🪳",
      "🦟","🦗","🕷","🕸","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀",
      "🐡","🐠","🐟","🐬","🐳","🐋","🦈","🦭","🐊","🐅","🐆","🦓","🦍","🦧","🐘"
    ]
  },
  {
    id: "food",
    name: "Food & Drink",
    icon: "🍕",
    items: [
      "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍",
      "🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶","🫑","🌽","🥕","🫒","🧄","🧅",
      "🥔","🍠","🥐","🥯","🍞","🥖","🥨","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🥩",
      "🍗","🍖","🦴","🌭","🍔","🍟","🍕","🥪","🌮","🌯","🫔","🥙","🧆","🥘","🍝",
      "🍣","🍱","🥟","🍤","🍙","🍚","🍘","🍥","🥠","🥮","🍢","🍡","🍧","🍨","🍦",
      "🍰","🎂","🧁","🥧","🍮","🍭","🍬","🍫","🍿","🍩","🍪","🌰","🥜","🍯","🥛",
      "🍼","☕️","🍵","🧃","🥤","🧋","🍶","🍺","🍻","🥂","🍷","🥃","🍸","🍹","🧉"
    ]
  },
  {
    id: "activities",
    name: "Activities",
    icon: "⚽️",
    items: [
      "⚽️","🏀","🏈","⚾️","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸","🥅","⛳️",
      "🪁","🏹","🎣","🤿","🥊","🥋","🎽","🛹","🛼","🛷","⛸","🥌","🎿","⛷","🏂",
      "🪂","🏋️","🤼","🤸","⛹️","🤺","🤾","🏌️","🏇","🧘","🏄","🏊","🚴","🚵","🪃",
      "🥇","🥈","🥉","🏆","🏅","🎖","🏵","🎗","🎫","🎟","🎪","🤹","🎭","🩰","🎨"
    ]
  },
  {
    id: "travel",
    name: "Travel & Places",
    icon: "✈️",
    items: [
      "🚗","🚕","🚙","🚌","🚎","🏎","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🛵",
      "🏍","🛺","🚲","🛴","🛹","🛼","🚂","🚝","🚄","🚅","🚞","✈️","🛫","🛬","🛩",
      "🚀","🛸","🚁","🛶","⛵️","🚤","🛥","🛳","⛴","🚢","⚓️","🪝","⛽️","🚧","🚦"
    ]
  },
  {
    id: "objects",
    name: "Objects",
    icon: "💡",
    items: [
      "⌚️","📱","💻","⌨️","🖥","🖨","🖱","🖲","🕹","🗜","💽","💾","💿","📀","📼",
      "📷","📸","📹","🎥","📽","🎞","📞","☎️","📟","📠","📺","📻","🎙","🎚","🎛",
      "🧭","⏱","⏲","⏰","🕰","⌛️","⏳","📡","🔋","🪫","🔌","💡","🔦","🕯","🪔",
      "🧯","🛢","💸","💵","💴","💶","💷","🪙","💰","💳","🪪","💎","⚖️","🪜","🧰"
    ]
  },
  {
    id: "symbols",
    name: "Symbols",
    icon: "💜",
    items: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗",
      "💖","💘","💝","💟","✨","⭐","🌟","💫","⚡","🔥","💧","🌈","☀️","🌙","⛅",
      "❄️","🎵","🎶","🔔","💯","✅","❌","⭕","❗","❓","💢","💥","💦","💨","🕳"
    ]
  },
  {
    id: "flags",
    name: "Flags",
    icon: "🏁",
    // Simple flags only — regional-indicator pairs (🇺🇸 etc.) and ZWJ flag
    // sequences (🏳️‍🌈) render as letter pairs on many Windows builds.
    items: ["🏳️","🏴","🏁","🚩","🎌"]
  }
];

export interface GifItem {
  id: string;
  src: string;
  alt: string;
  tags: string[];
}

// Visual stand-ins for GIFs (Unsplash stills with hinted "GIF" labels in UI).
export const GIFS: GifItem[] = [
  { id: "g1", src: "https://images.unsplash.com/photo-1493612276216-ee3925520721?w=400&q=80", alt: "celebration", tags: ["yes","party","celebrate"] },
  { id: "g2", src: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400&q=80", alt: "dance", tags: ["dance","mood","happy"] },
  { id: "g3", src: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=400&q=80", alt: "wave", tags: ["hi","wave","hello"] },
  { id: "g4", src: "https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=400&q=80", alt: "mind blown", tags: ["wow","mind blown"] },
  { id: "g5", src: "https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?w=400&q=80", alt: "applause", tags: ["clap","yes","applause"] },
  { id: "g6", src: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&q=80", alt: "love", tags: ["love","heart","like"] },
  { id: "g7", src: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&q=80", alt: "laugh", tags: ["lol","laugh","funny"] },
  { id: "g8", src: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80", alt: "music", tags: ["dance","music"] },
  { id: "g9", src: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&q=80", alt: "thinking", tags: ["thinking","hmm"] },
  { id: "g10", src: "https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=400&q=80", alt: "cool", tags: ["cool","calm"] },
  { id: "g11", src: "https://images.unsplash.com/photo-1503602642458-232111445657?w=400&q=80", alt: "sunrise", tags: ["morning","new day"] },
  { id: "g12", src: "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=400&q=80", alt: "starry", tags: ["space","cosmic","night"] }
];

export interface StickerPack {
  id: string;
  name: string;
  stickers: { id: string; emoji: string; gradient: string }[];
}

export const STICKER_PACKS: StickerPack[] = [
  {
    id: "mood",
    name: "Mood",
    stickers: [
      { id: "s-mood-1", emoji: "✨", gradient: "linear-gradient(135deg,#8B5CF6,#EC4899)" },
      { id: "s-mood-2", emoji: "💜", gradient: "linear-gradient(135deg,#A78BFA,#F472B6)" },
      { id: "s-mood-3", emoji: "🔥", gradient: "linear-gradient(135deg,#F97316,#EF4444)" },
      { id: "s-mood-4", emoji: "🥲", gradient: "linear-gradient(135deg,#22D3EE,#3B82F6)" },
      { id: "s-mood-5", emoji: "🌙", gradient: "linear-gradient(135deg,#1F2937,#6366F1)" },
      { id: "s-mood-6", emoji: "☀️", gradient: "linear-gradient(135deg,#FBBF24,#F97316)" },
      { id: "s-mood-7", emoji: "🌈", gradient: "linear-gradient(135deg,#F472B6,#A78BFA,#22D3EE)" },
      { id: "s-mood-8", emoji: "🪩", gradient: "linear-gradient(135deg,#EC4899,#22D3EE)" }
    ]
  },
  {
    id: "reactions",
    name: "Reactions",
    stickers: [
      { id: "s-r-1", emoji: "😂", gradient: "linear-gradient(135deg,#FBBF24,#FB923C)" },
      { id: "s-r-2", emoji: "😎", gradient: "linear-gradient(135deg,#1F2937,#60A5FA)" },
      { id: "s-r-3", emoji: "🥹", gradient: "linear-gradient(135deg,#F472B6,#A78BFA)" },
      { id: "s-r-4", emoji: "🤯", gradient: "linear-gradient(135deg,#EC4899,#F97316)" },
      { id: "s-r-5", emoji: "🥲", gradient: "linear-gradient(135deg,#22D3EE,#A3E635)" },
      { id: "s-r-6", emoji: "😴", gradient: "linear-gradient(135deg,#6366F1,#1F2937)" },
      { id: "s-r-7", emoji: "🫶", gradient: "linear-gradient(135deg,#FB7185,#F472B6)" },
      { id: "s-r-8", emoji: "👀", gradient: "linear-gradient(135deg,#0EA5E9,#8B5CF6)" }
    ]
  },
  {
    id: "music",
    name: "Music",
    stickers: [
      { id: "s-m-1", emoji: "🎧", gradient: "linear-gradient(135deg,#8B5CF6,#22D3EE)" },
      { id: "s-m-2", emoji: "🎶", gradient: "linear-gradient(135deg,#EC4899,#FBBF24)" },
      { id: "s-m-3", emoji: "🎹", gradient: "linear-gradient(135deg,#0EA5E9,#A78BFA)" },
      { id: "s-m-4", emoji: "🎤", gradient: "linear-gradient(135deg,#F97316,#EC4899)" },
      { id: "s-m-5", emoji: "🥁", gradient: "linear-gradient(135deg,#10B981,#22D3EE)" },
      { id: "s-m-6", emoji: "🎚️", gradient: "linear-gradient(135deg,#1F2937,#A78BFA)" }
    ]
  },
  {
    id: "travel",
    name: "Travel",
    stickers: [
      { id: "s-t-1", emoji: "✈️", gradient: "linear-gradient(135deg,#60A5FA,#A78BFA)" },
      { id: "s-t-2", emoji: "🌍", gradient: "linear-gradient(135deg,#22D3EE,#A3E635)" },
      { id: "s-t-3", emoji: "🏝️", gradient: "linear-gradient(135deg,#FBBF24,#22D3EE)" },
      { id: "s-t-4", emoji: "🏔️", gradient: "linear-gradient(135deg,#94A3B8,#0EA5E9)" },
      { id: "s-t-5", emoji: "🚀", gradient: "linear-gradient(135deg,#EC4899,#8B5CF6)" },
      { id: "s-t-6", emoji: "🌌", gradient: "linear-gradient(135deg,#1F2937,#8B5CF6)" }
    ]
  }
];

export interface MemeItem {
  id: string;
  src: string;
  caption: string;
  tag: string;
}

export const MEMES: MemeItem[] = [
  { id: "m1", src: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=600&q=80", caption: "Me staring at the deploy logs", tag: "shipping" },
  { id: "m2", src: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&q=80", caption: "When the code finally compiles", tag: "wins" },
  { id: "m3", src: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=600&q=80", caption: "Friday 5pm energy", tag: "weekend" },
  { id: "m4", src: "https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=600&q=80", caption: "Designer vs. last-minute change", tag: "design" },
  { id: "m5", src: "https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?w=600&q=80", caption: "POV: you opened Figma 'real quick'", tag: "design" },
  { id: "m6", src: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600&q=80", caption: "Standup but it's 9:01am", tag: "standup" },
  { id: "m7", src: "https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=600&q=80", caption: "Me explaining the spec for the 4th time", tag: "specs" },
  { id: "m8", src: "https://images.unsplash.com/photo-1493612276216-ee3925520721?w=600&q=80", caption: "When PR finally gets approved", tag: "merge" },
  { id: "m9", src: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80", caption: "First coffee of the morning", tag: "morning" }
];
