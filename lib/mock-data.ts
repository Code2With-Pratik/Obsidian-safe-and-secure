import type {
  Chat,
  Community,
  CommunityPost,
  FileItem,
  GhostRoom,
  Message,
  Story,
  User,
  CallParticipant,
  Tab
} from "@/types";

const avatar = (seed: string) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear&backgroundColor=8b5cf6,ec4899,22d3ee,a3e635,fbbf24,fb923c,60a5fa,f472b6&radius=18`;

export const currentUser: User = {
  id: "me",
  name: "Aria Vance",
  username: "aria.vance",
  avatar: avatar("aria"),
  status: "online",
  bio: "Designing the future, one pixel at a time.",
  pronouns: "she/her"
};

export const users: User[] = [
  currentUser,
  { id: "u1", name: "Kai Nakamura", username: "kai", avatar: avatar("kai"), status: "online", bio: "Music producer" },
  { id: "u2", name: "Obsidian Patel", username: "nova", avatar: avatar("nova"), status: "online", bio: "AI researcher" },
  { id: "u3", name: "Zane Ortega", username: "zane", avatar: avatar("zane"), status: "away", bio: "Cinematographer" },
  { id: "u4", name: "Lyra Chen", username: "lyra", avatar: avatar("lyra"), status: "busy", bio: "Creative dev" },
  { id: "u5", name: "Orion West", username: "orion", avatar: avatar("orion"), status: "offline", bio: "Spaceflight engineer" },
  { id: "u6", name: "Iris Park", username: "iris", avatar: avatar("iris"), status: "online", bio: "Product designer" },
  { id: "u7", name: "Atlas Vega", username: "atlas", avatar: avatar("atlas"), status: "online", bio: "Game director" }
];

export const chats: Chat[] = [
  {
    id: "c1",
    type: "dm",
    name: "Kai Nakamura",
    avatar: avatar("kai"),
    lastMessage: "Just dropped the new track — listen to it after lunch?",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    unread: 2,
    online: true,
    pinned: true,
    favorite: true,
    color: "#8B5CF6",
    hint: { kind: "typing" }
  },
  {
    id: "c2",
    type: "group",
    name: "Aurora Design Lab",
    avatar: avatar("aurora-design"),
    lastMessage: "Iris: pushed the new motion specs",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    unread: 7,
    membersCount: 12,
    pinned: true,
    color: "#22D3EE"
  },
  {
    id: "c3",
    type: "secret",
    name: "Obsidian Patel",
    avatar: avatar("nova"),
    lastMessage: "message hidden",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    encrypted: true,
    online: true,
    color: "#EC4899",
    hint: { kind: "photo", label: "Photo" }
  },
  {
    id: "c4",
    type: "ghost",
    name: "Ghost · Midnight Lounge",
    avatar: avatar("ghost"),
    lastMessage: "anonymous: this is a vibe",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    membersCount: 42,
    color: "#A3E635"
  },
  {
    id: "c5",
    type: "channel",
    name: "Project Helios",
    avatar: avatar("helios"),
    lastMessage: "Atlas pinned a message",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    membersCount: 248,
    color: "#FBBF24",
    hint: { kind: "file", label: "Document" }
  },
  {
    id: "c6",
    type: "dm",
    name: "Iris Park",
    avatar: avatar("iris"),
    lastMessage: "wireframes look incredible 🤍",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    online: true,
    favorite: true,
    color: "#F472B6"
  },
  {
    id: "c7",
    type: "group",
    name: "Weekend Crew",
    avatar: avatar("weekend"),
    lastMessage: "Zane: I got the snacks",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    membersCount: 6,
    muted: true,
    color: "#60A5FA",
    hint: { kind: "voice", label: "Voice message" }
  },
  {
    id: "c8",
    type: "dm",
    name: "Orion West",
    avatar: avatar("orion"),
    lastMessage: "see you at the launch",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    color: "#FB923C"
  }
];

// Deterministic pseudo-random waveform — SSR and the client must produce the
// same array, otherwise React reports a hydration mismatch on the voice bars.
const wf = (n = 28) =>
  Array.from({ length: n }, (_, i) => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return 0.2 + (x - Math.floor(x)) * 0.8;
  });

export const messagesByChat: Record<string, Message[]> = {
  c1: [
    {
      id: "m1",
      chatId: "c1",
      authorId: "u1",
      kind: "text",
      content: "Yo! Drop everything — new track is bonkers.",
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
    },
    {
      id: "m2",
      chatId: "c1",
      authorId: "me",
      kind: "text",
      content: "Sending it. Need a fresh beat. Synth-heavy?",
      createdAt: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
      status: "read"
    },
    {
      id: "m3",
      chatId: "c1",
      authorId: "u1",
      kind: "voice",
      content: "",
      createdAt: new Date(Date.now() - 1000 * 60 * 26).toISOString(),
      voice: { durationSec: 32, waveform: wf(36) }
    },
    {
      id: "m4",
      chatId: "c1",
      authorId: "u1",
      kind: "image",
      content: "studio session",
      createdAt: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
      media: [
        { url: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=900&q=80", w: 900, h: 600, alt: "synth" }
      ],
      reactions: [
        { emoji: "🔥", count: 3 },
        { emoji: "🎧", count: 1, byMe: true }
      ]
    },
    {
      id: "m5",
      chatId: "c1",
      authorId: "me",
      kind: "text",
      content: "This is unreal. The pad sits perfectly under the bass.",
      createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      status: "read",
      reactions: [{ emoji: "💜", count: 1 }]
    },
    {
      id: "m6",
      chatId: "c1",
      authorId: "u1",
      kind: "link",
      content: "Reference I'm chasing",
      createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      link: {
        url: "https://nova.fm/glass-cathedrals",
        title: "Glass Cathedrals — visualizing soundscapes",
        description: "An immersive WebGL listening experience for synth-wave producers.",
        image: "https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=600&q=80"
      }
    },
    {
      id: "m7",
      chatId: "c1",
      authorId: "u1",
      kind: "text",
      content: "Listen after lunch?",
      createdAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
      threadCount: 3
    }
  ],
  c2: [
    {
      id: "g1",
      chatId: "c2",
      authorId: "u6",
      kind: "text",
      content: "Pushed the new motion specs to Notion. Take a look when you can.",
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      pinned: true
    },
    {
      id: "g2",
      chatId: "c2",
      authorId: "u4",
      kind: "text",
      content: "@aria can you sanity check the easing curves?",
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString()
    },
    {
      id: "g3",
      chatId: "c2",
      authorId: "me",
      kind: "text",
      content: "On it. Switching to spring(stiffness: 220, damping: 24) feels closer to Arc.",
      createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
      status: "delivered"
    },
    {
      id: "g4",
      chatId: "c2",
      authorId: "u6",
      kind: "image",
      content: "",
      createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      media: [
        { url: "https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?w=900&q=80", w: 900, h: 600 }
      ]
    },
    {
      id: "g5",
      chatId: "c2",
      authorId: "u6",
      kind: "text",
      content: "pushed the new motion specs",
      createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString()
    }
  ]
};

export const ghostRooms: GhostRoom[] = [
  {
    id: "gr1",
    name: "Midnight Lounge",
    topic: "Drop in. Be no one. Talk about anything.",
    pin: "492801",
    members: 42,
    capacity: 100,
    isLocked: false,
    aura: "linear-gradient(135deg,#8B5CF6,#EC4899)",
    hot: true
  },
  {
    id: "gr2",
    name: "Confess Anonymously",
    topic: "Safe room. No identities. No screenshots.",
    pin: "110125",
    members: 18,
    capacity: 50,
    isLocked: true,
    aura: "linear-gradient(135deg,#22D3EE,#3B82F6)"
  },
  {
    id: "gr3",
    name: "Founders After Dark",
    topic: "Raw startup talk, no investors allowed.",
    pin: "823104",
    members: 27,
    capacity: 40,
    isLocked: false,
    aura: "linear-gradient(135deg,#A3E635,#22D3EE)",
    hot: true
  },
  {
    id: "gr4",
    name: "Designers Unfiltered",
    topic: "What you'd never say in your design crit.",
    pin: "555512",
    members: 33,
    capacity: 60,
    isLocked: true,
    aura: "linear-gradient(135deg,#FBBF24,#EC4899)"
  },
  {
    id: "gr5",
    name: "3AM Thoughts",
    topic: "Late night feelings. No judgment.",
    pin: "030307",
    members: 88,
    capacity: 120,
    isLocked: false,
    aura: "linear-gradient(135deg,#A78BFA,#60A5FA)"
  },
  {
    id: "gr6",
    name: "Music Producers Lounge",
    topic: "Drop links, drop ideas, drop loops.",
    pin: "777088",
    members: 14,
    capacity: 30,
    isLocked: false,
    aura: "linear-gradient(135deg,#F472B6,#A78BFA)"
  }
];

export const stories: Story[] = [
  { id: "s1", authorId: "u1", type: "image", preview: "https://images.unsplash.com/photo-1493612276216-ee3925520721?w=400&q=80", postedAt: new Date().toISOString() },
  { id: "s2", authorId: "u2", type: "image", preview: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400&q=80", postedAt: new Date().toISOString(), viewed: true },
  { id: "s3", authorId: "u6", type: "text", preview: "", text: "shipping motion specs tonight ✨", bg: "linear-gradient(135deg,#8B5CF6,#EC4899)", postedAt: new Date().toISOString() },
  { id: "s4", authorId: "u4", type: "image", preview: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=400&q=80", postedAt: new Date().toISOString() },
  { id: "s5", authorId: "u3", type: "image", preview: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&q=80", postedAt: new Date().toISOString(), viewed: true },
  { id: "s6", authorId: "u7", type: "text", preview: "", text: "Helios soft launch next week 🚀", bg: "linear-gradient(135deg,#22D3EE,#A3E635)", postedAt: new Date().toISOString() }
];

export const callParticipants: CallParticipant[] = [
  { id: "me", name: "Aria", avatar: avatar("aria"), muted: false, cameraOn: true, isMe: true, speaking: true, isHost: true },
  { id: "u1", name: "Kai", avatar: avatar("kai"), muted: false, cameraOn: true },
  { id: "u2", name: "Obsidian", avatar: avatar("nova"), muted: true, cameraOn: true, speaking: false },
  { id: "u4", name: "Lyra", avatar: avatar("lyra"), muted: false, cameraOn: false },
  { id: "u6", name: "Iris", avatar: avatar("iris"), muted: false, cameraOn: true, speaking: true },
  { id: "u7", name: "Atlas", avatar: avatar("atlas"), muted: true, cameraOn: false }
];

export const browserTabs: Tab[] = [
  { id: "t1", title: "Linear — Q1 Planning", url: "https://linear.app/nova/q1", favicon: "🟣", active: true, secure: true },
  { id: "t2", title: "Figma — Helios UI", url: "https://figma.com/file/helios-ui", favicon: "🎨", secure: true },
  { id: "t3", title: "GitHub — pull #482", url: "https://github.com/nova/app/pull/482", favicon: "🐙", secure: true },
  { id: "t4", title: "Notion — Specs", url: "https://notion.so/specs", favicon: "📓", secure: true }
];

export const files: FileItem[] = [
  { id: "f1", name: "helios-launch-deck.pdf", size: 4_800_000, type: "doc", updatedAt: new Date().toISOString(), preview: "📄" },
  { id: "f2", name: "synth-master-v3.wav", size: 38_400_000, type: "audio", updatedAt: new Date().toISOString(), preview: "🎵" },
  { id: "f3", name: "concept-render.png", size: 2_100_000, type: "image", updatedAt: new Date().toISOString(), preview: "https://images.unsplash.com/photo-1634986666676-ec8fd927c23d?w=300&q=80" },
  { id: "f4", name: "vault-passport.zip", size: 12_900_000, type: "archive", updatedAt: new Date().toISOString(), vault: true, preview: "🔒" },
  { id: "f5", name: "motion-tokens.json", size: 18_200, type: "code", updatedAt: new Date().toISOString(), preview: "{ }" },
  { id: "f6", name: "trailer-cut.mp4", size: 134_000_000, type: "video", updatedAt: new Date().toISOString(), preview: "🎬" }
];

export const communities: Community[] = [
  {
    id: "co1",
    name: "Design Mornings",
    cover: "https://images.unsplash.com/photo-1503602642458-232111445657?w=600&q=80",
    members: 18_200,
    online: 412,
    category: "Design",
    verified: true,
    trending: true,
    hostId: "u3",
    description:
      "Slow-coffee critiques, glass UI exploration and tomorrow's interfaces — drop in before standup.",
    interests: ["design", "ui", "ux", "glassmorphism", "typography"]
  },
  {
    id: "co2",
    name: "Synth Citizens",
    cover: "https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=600&q=80",
    members: 24_900,
    online: 882,
    category: "Music",
    trending: true,
    hostId: "u4",
    description: "Synthwave producers and night-drive heads. Drop loops, drop links.",
    interests: ["music", "synthwave", "producers", "late-night", "audio"]
  },
  {
    id: "co3",
    name: "Indie Game Dev",
    cover: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
    members: 51_300,
    online: 1320,
    category: "Gaming",
    hostId: "u5",
    description: "Devlogs, postmortems and 'finished a game today' threads. Be kind, be specific.",
    interests: ["gamedev", "indie", "unity", "godot", "gaming"]
  },
  {
    id: "co4",
    name: "AI Frontiers",
    cover: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&q=80",
    members: 73_100,
    online: 2240,
    category: "AI",
    verified: true,
    trending: true,
    hostId: "u6",
    description: "Frontier papers, agents and the weird wonderful stuff happening this week.",
    interests: ["ai", "ml", "agents", "llm", "research"]
  },
  {
    id: "co5",
    name: "Astrofolk",
    cover: "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&q=80",
    members: 9_400,
    online: 211,
    category: "Space",
    hostId: "u7",
    description: "Telescope photos, launch parties, and stargazing meetups.",
    interests: ["space", "astronomy", "stars", "telescope", "cosmos"]
  },
  {
    id: "co6",
    name: "Solo Founders",
    cover: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&q=80",
    members: 12_600,
    online: 290,
    category: "Startups",
    hostId: "u8",
    description: "Raw startup talk, candid revenue posts, no investors allowed.",
    interests: ["startups", "indiehackers", "saas", "bootstrapped", "founders"]
  }
];

export const communityPosts: Record<string, CommunityPost[]> = {
  co1: [
    {
      id: "cp1-1",
      communityId: "co1",
      authorId: "u3",
      kind: "text",
      content:
        "Sunday challenge: redesign a dashboard you hate using only glass surfaces and one accent color. Drop your before/after below 👇",
      reactions: [
        { emoji: "🔥", count: 142, byMe: false },
        { emoji: "💜", count: 88, byMe: false },
        { emoji: "🧊", count: 36, byMe: false }
      ],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString()
    },
    {
      id: "cp1-2",
      communityId: "co1",
      authorId: "u3",
      kind: "image",
      content: "New iOS app spec just hit. Notice how the chrome dissolves into the wallpaper — that's the whole trick.",
      media: [
        {
          url: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=900&q=80",
          alt: "Glass UI mockup",
          kind: "image"
        }
      ],
      reactions: [
        { emoji: "🤩", count: 211, byMe: false },
        { emoji: "💡", count: 47, byMe: false }
      ],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString()
    },
    {
      id: "cp1-3",
      communityId: "co1",
      authorId: "u3",
      kind: "poll",
      content: "Real talk — which is the most overused trend right now?",
      poll: {
        question: "Most overused design trend?",
        options: [
          { id: "o1", label: "Bento grids", votes: 412 },
          { id: "o2", label: "Tilted card stacks", votes: 198 },
          { id: "o3", label: "Aurora gradients", votes: 624 },
          { id: "o4", label: "Wide cyan accents", votes: 87 }
        ]
      },
      reactions: [{ emoji: "😅", count: 92, byMe: false }],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
    }
  ],
  co2: [
    {
      id: "cp2-1",
      communityId: "co2",
      authorId: "u4",
      kind: "song",
      content: "On loop all morning. The pad in the chorus is unreal.",
      song: {
        title: "Ylang Ylang",
        artist: "FKJ",
        cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80",
        durationSec: 264
      },
      reactions: [
        { emoji: "🎧", count: 318, byMe: false },
        { emoji: "💜", count: 122, byMe: false }
      ],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString()
    },
    {
      id: "cp2-2",
      communityId: "co2",
      authorId: "u4",
      kind: "text",
      content: "Open mic Friday — drop your unreleased loops in the thread, we'll vote. Top 3 get featured on the next compilation.",
      reactions: [
        { emoji: "🔥", count: 256, byMe: false },
        { emoji: "🙌", count: 84, byMe: false }
      ],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString()
    }
  ],
  co4: [
    {
      id: "cp4-1",
      communityId: "co4",
      authorId: "u6",
      kind: "text",
      content:
        "Quiet milestone but worth marking — a single open-weights 32B is now matching GPT-4-class on multi-hop reasoning. Inference moved to laptops faster than anyone predicted.",
      reactions: [
        { emoji: "🤯", count: 612, byMe: false },
        { emoji: "💯", count: 188, byMe: false }
      ],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
    },
    {
      id: "cp4-2",
      communityId: "co4",
      authorId: "u6",
      kind: "poll",
      content: "Where are you spending the most time this quarter?",
      poll: {
        question: "Your focus area?",
        options: [
          { id: "o1", label: "Agents / tool use", votes: 542 },
          { id: "o2", label: "Retrieval + grounding", votes: 318 },
          { id: "o3", label: "Eval + safety", votes: 196 },
          { id: "o4", label: "Local + on-device", votes: 401 }
        ]
      },
      reactions: [{ emoji: "🧠", count: 144, byMe: false }],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString()
    }
  ]
};
