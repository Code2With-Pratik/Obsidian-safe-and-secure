/**
 *  OpenAI tool (function-calling) definitions for Obsidian AI.
 *
 *  Each entry mirrors the OpenAI `chat.completions.create({ tools: [...] })`
 *  shape so we can ship the whole array straight to the API. The client
 *  side keeps a parallel handler map keyed by `function.name` — see
 *  `./handlers.ts`.
 *
 *  When adding a tool:
 *    1. Add the schema here.
 *    2. Add a handler in `./handlers.ts` whose key matches `function.name`.
 *    3. The model picks it up on the next request — no other wiring.
 */
export const AI_TOOL_DEFINITIONS = [
  // ─── Notifications ─────────────────────────────────────────────────
  {
    type: "function" as const,
    function: {
      name: "readNotifications",
      description:
        "Fetch the user's recent in-app notifications (messages, missed calls, community invites, login alerts). Returns up to `limit` items, newest first, optionally filtered to unread only.",
      parameters: {
        type: "object",
        properties: {
          unreadOnly: { type: "boolean", description: "If true, only return notifications the user hasn't seen." },
          limit: { type: "number", description: "Max number of notifications to return (default 20, max 50)." }
        },
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "summarizeNotifications",
      description:
        "Return a short natural-language summary of the user's recent notifications — useful for 'what did I miss' / 'catch me up' queries.",
      parameters: {
        type: "object",
        properties: {
          unreadOnly: { type: "boolean" }
        },
        required: []
      }
    }
  },

  // ─── Chats + messages ──────────────────────────────────────────────
  {
    type: "function" as const,
    function: {
      name: "searchChats",
      description:
        "Search the user's chat list by name (DM contact name or group name). Returns up to 8 matching chats with their id, name, and whether they're a group.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Substring of the chat or contact name to match (case-insensitive)." }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "searchMessages",
      description:
        "Search the content of messages across all of the user's chats. Use for queries like 'find the message about the invoice' or 'where did Rahul mention the meeting'.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Text to search for inside message content." },
          chatId: { type: "string", description: "Optional: restrict to a single chat by id." },
          authorId: { type: "string", description: "Optional: restrict to a specific user's messages by their user id." }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "openChat",
      description:
        "Navigate the app to a specific chat thread and focus it. Use after searchChats or searchUsers when the user says 'open X' or 'show me my chat with X'.",
      parameters: {
        type: "object",
        properties: {
          chatId: { type: "string", description: "The chat's id (UUID)." }
        },
        required: ["chatId"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "summarizeChat",
      description:
        "Generate a short summary of the recent messages in a specific chat thread. If `chatId` is omitted, summarizes the chat the user is currently viewing.",
      parameters: {
        type: "object",
        properties: {
          chatId: { type: "string" },
          messageCount: { type: "number", description: "How many recent messages to consider (default 30, max 100)." }
        },
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "summarizeGroup",
      description:
        "Same as summarizeChat but explicitly for group chats — returns who's been active, what topics dominated, and any decisions or action items mentioned.",
      parameters: {
        type: "object",
        properties: {
          chatId: { type: "string" }
        },
        required: []
      }
    }
  },

  // ─── Users + profiles ──────────────────────────────────────────────
  {
    type: "function" as const,
    function: {
      name: "searchUsers",
      description:
        "Search the platform's user directory by name or username. Returns up to 8 profiles with id, name, username, avatar, and online status.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Name or @username fragment (case-insensitive)." }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "openUserProfile",
      description: "Navigate to the user's own profile page, or to another user's profile if `userId` is provided.",
      parameters: {
        type: "object",
        properties: {
          userId: { type: "string", description: "Omit to open the current user's own profile." }
        },
        required: []
      }
    }
  },

  // ─── Communities ───────────────────────────────────────────────────
  {
    type: "function" as const,
    function: {
      name: "searchCommunities",
      description: "Search communities the user can join, by name or topic.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "getTrendingCommunities",
      description: "Return the currently trending communities — most active recently. Up to 10.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "joinCommunity",
      description: "Join a community by id. Call searchCommunities first if you only have a name.",
      parameters: {
        type: "object",
        properties: { communityId: { type: "string" } },
        required: ["communityId"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "summarizeCommunity",
      description:
        "Summarize recent posts and activity in a community. Omit `communityId` to summarize the community the user is currently viewing.",
      parameters: {
        type: "object",
        properties: { communityId: { type: "string" } },
        required: []
      }
    }
  },

  // ─── Files / vault ─────────────────────────────────────────────────
  {
    type: "function" as const,
    function: {
      name: "searchFiles",
      description:
        "Search across files attached to messages (any kind: documents, images, audio, video). Returns up to 20 results.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Filename or substring." },
          kind: {
            type: "string",
            enum: ["any", "pdf", "image", "audio", "video", "document"],
            description: "Optional filter by file kind. Default 'any'."
          },
          since: {
            type: "string",
            description: "Optional ISO 8601 date — only return files created on or after this date."
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "searchPDFs",
      description: "Convenience wrapper for searchFiles({ kind: 'pdf', query }).",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "searchImages",
      description: "Convenience wrapper for searchFiles({ kind: 'image', query }).",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "openVault",
      description: "Open the user's private encrypted vault page.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "searchVault",
      description: "Search the user's private vault for a file by name. Returns up to 20 matching vault nodes.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"]
      }
    }
  },

  // ─── Whiteboards ───────────────────────────────────────────────────
  {
    type: "function" as const,
    function: {
      name: "searchWhiteboards",
      description: "Search the user's whiteboards by title. Returns up to 10 results.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "openWhiteboard",
      description:
        "Navigate to the whiteboard page and activate a specific board. If `boardId` is omitted, opens the most recent board.",
      parameters: {
        type: "object",
        properties: { boardId: { type: "string" } },
        required: []
      }
    }
  },

  // ─── Calls ─────────────────────────────────────────────────────────
  {
    type: "function" as const,
    function: {
      name: "startVoiceCall",
      description:
        "Start a 1-on-1 voice call to a user. The user must already exist as a DM contact OR be searchable via searchUsers.",
      parameters: {
        type: "object",
        properties: {
          userId: { type: "string", description: "The callee's user id." }
        },
        required: ["userId"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "startVideoCall",
      description: "Start a 1-on-1 video call to a user.",
      parameters: {
        type: "object",
        properties: { userId: { type: "string" } },
        required: ["userId"]
      }
    }
  },

  // ─── Navigation + context ──────────────────────────────────────────
  {
    type: "function" as const,
    function: {
      name: "navigateTo",
      description:
        "Generic navigation. Use for screens that don't have a dedicated open* tool. Accepts one of the canonical screen names below.",
      parameters: {
        type: "object",
        properties: {
          screen: {
            type: "string",
            enum: [
              "chats",
              "calls",
              "communities",
              "ghost-rooms",
              "stories",
              "whiteboard",
              "files",
              "vault",
              "profile",
              "settings",
              "notifications",
              "spotlight",
              "discover"
            ]
          }
        },
        required: ["screen"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "getCurrentScreen",
      description:
        "Return the user's current screen (route + descriptive label). Useful when the user says 'what am I looking at' or you need to disambiguate 'this chat'.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "getCurrentContext",
      description:
        "Return the full context snapshot — current user, screen, chat, community, whiteboard, and active call (if any).",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },

  // ─── Appearance / settings ─────────────────────────────────────────
  {
    type: "function" as const,
    function: {
      name: "setTheme",
      description:
        "Switch the app's color theme between light, dark, or system (follow OS). Use for 'dark mode', 'switch to light', 'use system theme'.",
      parameters: {
        type: "object",
        properties: {
          theme: { type: "string", enum: ["light", "dark", "system"] }
        },
        required: ["theme"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "setAccent",
      description:
        "Change the app's accent color. Valid ids: violet, cyan, pink, lime, amber. Use for 'change accent to pink', 'I want a green accent' (→ lime).",
      parameters: {
        type: "object",
        properties: {
          accent: { type: "string", enum: ["violet", "cyan", "pink", "lime", "amber"] }
        },
        required: ["accent"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "setFont",
      description:
        "Change the app's display font. Valid ids: default (Inter), arima, poppins, montserrat-alt, lora, doto, grape-nuts, satisfy.",
      parameters: {
        type: "object",
        properties: {
          font: {
            type: "string",
            enum: [
              "default",
              "arima",
              "poppins",
              "montserrat-alt",
              "lora",
              "doto",
              "grape-nuts",
              "satisfy"
            ]
          }
        },
        required: ["font"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "setLanguage",
      description:
        "Change the app's UI language. Valid codes: en, hi, mr, ar, ru, tr, pt, zh, ja.",
      parameters: {
        type: "object",
        properties: {
          language: {
            type: "string",
            enum: ["en", "hi", "mr", "ar", "ru", "tr", "pt", "zh", "ja"]
          }
        },
        required: ["language"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "setGlassIntensity",
      description:
        "Adjust the glass-blur intensity used across all surfaces (0 = flat, 100 = max blur). Default is 80.",
      parameters: {
        type: "object",
        properties: { value: { type: "number", minimum: 0, maximum: 100 } },
        required: ["value"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "setReduceMotion",
      description: "Toggle the reduce-motion accessibility preference.",
      parameters: {
        type: "object",
        properties: { enabled: { type: "boolean" } },
        required: ["enabled"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "toggleNotificationPref",
      description:
        "Toggle a notification preference. Keys: directMessages, groupChats, ghostRooms, callInvites, sounds.",
      parameters: {
        type: "object",
        properties: {
          key: {
            type: "string",
            enum: ["directMessages", "groupChats", "ghostRooms", "callInvites", "sounds"]
          },
          enabled: { type: "boolean" }
        },
        required: ["key", "enabled"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "togglePrivacyPref",
      description:
        "Toggle a privacy preference. Keys: readReceipts, typingIndicator, lastSeen, profilePhoto, allowScreenshots.",
      parameters: {
        type: "object",
        properties: {
          key: {
            type: "string",
            enum: ["readReceipts", "typingIndicator", "lastSeen", "profilePhoto", "allowScreenshots"]
          },
          enabled: { type: "boolean" }
        },
        required: ["key", "enabled"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "toggleSecurityPref",
      description:
        "Toggle a security preference. Keys: twoFactor, biometric, loginAlerts, autoLockVault.",
      parameters: {
        type: "object",
        properties: {
          key: {
            type: "string",
            enum: ["twoFactor", "biometric", "loginAlerts", "autoLockVault"]
          },
          enabled: { type: "boolean" }
        },
        required: ["key", "enabled"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "setUserStatus",
      description:
        "Change the signed-in user's presence status (shown to other users on their chat avatar).",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["online", "away", "busy", "offline"] }
        },
        required: ["status"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "signOut",
      description:
        "Sign the user out of the application. Use only when the user explicitly says 'sign me out' or 'log out'.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },

  // ─── Cross-cutting summaries ───────────────────────────────────────
  {
    type: "function" as const,
    function: {
      name: "catchMeUp",
      description:
        "Aggregate unread notifications, unread chats, missed calls, and recent community activity into a single 'what did I miss' summary. Use for 'what's new', 'catch me up', 'what happened while I was offline'.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  }
];

/** Convenience export — every tool's `function.name` as a string union. */
export type AIToolName = (typeof AI_TOOL_DEFINITIONS)[number]["function"]["name"];
