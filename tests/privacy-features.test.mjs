import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const privacyRuntime = await import(
  `data:text/javascript;base64,${Buffer.from(read("lib/privacy-behavior.js")).toString("base64")}`
);
const {
  applyReadVisibility,
  canDisclosePrivacy,
  createTypingDisclosureController,
  isCurrentPrivacyRequest,
  rollbackPrivacyValue
} = privacyRuntime;

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("privacy defaults are account scoped and excluded from local persistence", () => {
  const source = read("store/use-settings-store.ts");
  assert.match(source, /readReceipts:\s*true/);
  assert.match(source, /typingIndicator:\s*true/);
  assert.match(source, /lastSeen:\s*false/);
  assert.match(source, /profilePhoto:\s*true/);
  assert.match(source, /allowScreenshots:\s*false/);
  assert.match(source, /hydratePrivacy:\s*async \(userId\)/);
  assert.match(source, /resetPrivacy:\s*\(\) =>/);
  assert.match(source, /privacyUserId:\s*null/);
  assert.match(source, /privacyHydrated:\s*false/);
  const partial = source.slice(source.indexOf("partialize:"));
  assert.doesNotMatch(partial, /privacy:\s*state\.privacy/);

  const auth = read("components/auth-listener.tsx");
  assert.match(auth, /hydratePrivacy\(session\.user\.id\)/);
  assert.match(auth, /resetPrivacy\(\)/);
});

test("read receipts keep unread state private while gating published status", () => {
  const source = read("store/use-chat-store.ts");
  const start = source.indexOf("markRead: async");
  const markRead = source.slice(start, source.indexOf("markDelivered:", start));
  assert.match(markRead, /from\("chat_members"\)/);
  assert.match(markRead, /"readReceipts"/);
  assert.match(markRead, /from\("messages"\)/);
  assert.ok(markRead.indexOf('from("chat_members")') < markRead.indexOf('"readReceipts"'));
});

test("read disclosure fails closed during hydration, errors, and account switches", async () => {
  const base = {
    privacy: { readReceipts: true },
    privacyHydrated: false,
    privacyUserId: "account-a",
    privacyStatus: "loading"
  };
  const deniedStates = [
    base,
    { ...base, privacyStatus: "error" },
    { ...base, privacyHydrated: true, privacyStatus: "error" },
    { ...base, privacyHydrated: true, privacyStatus: "ready", privacyUserId: "account-b" },
    { ...base, privacyHydrated: true, privacyStatus: "ready", privacy: { readReceipts: false } }
  ];

  for (const state of deniedStates) {
    let cursorWrites = 0;
    let receiptWrites = 0;
    await applyReadVisibility({
      updatePrivateCursor: async () => { cursorWrites++; },
      publishReadReceipt: async () => { receiptWrites++; },
      mayPublish: () => canDisclosePrivacy(state, "account-a", "readReceipts")
    });
    assert.equal(cursorWrites, 1);
    assert.equal(receiptWrites, 0);
  }

  let receiptWrites = 0;
  await applyReadVisibility({
    updatePrivateCursor: async () => {},
    publishReadReceipt: async () => { receiptWrites++; },
    mayPublish: () => canDisclosePrivacy(
      { ...base, privacyHydrated: true, privacyStatus: "ready" },
      "account-a",
      "readReceipts"
    )
  });
  assert.equal(receiptWrites, 1);

  const cursor = deferred();
  let activeState = { ...base, privacyHydrated: true, privacyStatus: "ready" };
  receiptWrites = 0;
  const pendingRead = applyReadVisibility({
    updatePrivateCursor: async () => { await cursor.promise; },
    publishReadReceipt: async () => { receiptWrites++; },
    mayPublish: () => canDisclosePrivacy(activeState, "account-a", "readReceipts")
  });
  activeState = { ...activeState, privacyUserId: "account-b", privacyStatus: "loading" };
  cursor.resolve();
  await pendingRead;
  assert.equal(receiptWrites, 0);
});

test("typing disable follows an in-flight true packet with final cleanup", async () => {
  let allowed = true;
  const trueSend = deferred();
  const packets = [];
  const controller = createTypingDisclosureController({
    canPublish: () => allowed,
    send: async (_chatId, typing) => {
      packets.push(typing);
      if (typing) await trueSend.promise;
    }
  });

  const pendingTrue = controller.update("chat-1", true);
  await Promise.resolve();
  allowed = false;
  const cleanup = controller.cleanup();
  await Promise.resolve();
  trueSend.resolve();
  await Promise.all([pendingTrue, cleanup]);

  assert.equal(packets[0], true);
  assert.equal(packets.at(-1), false);
  assert.ok(packets.filter((value) => value === false).length >= 1);
});

test("typing true is denied before readiness while false cleanup remains allowed", async () => {
  const packets = [];
  const controller = createTypingDisclosureController({
    canPublish: () => false,
    send: async (_chatId, typing) => { packets.push(typing); }
  });
  await controller.update("chat-1", true);
  assert.deepEqual(packets, []);
  await controller.update("chat-1", false);
  assert.deepEqual(packets, [false]);
});

test("failed optimistic writes roll back without overriding newer choices or accounts", async () => {
  const original = { readReceipts: true };
  assert.deepEqual(
    rollbackPrivacyValue({ readReceipts: false }, "readReceipts", false, true),
    original
  );
  const newerChoice = { readReceipts: true };
  assert.strictEqual(
    rollbackPrivacyValue(newerChoice, "readReceipts", false, true),
    newerChoice
  );

  const pending = deferred();
  let activeUserId = "account-a";
  const result = pending.promise.then(() =>
    isCurrentPrivacyRequest(activeUserId, "account-a")
  );
  activeUserId = "account-b";
  pending.resolve();
  assert.equal(await result, false);
});

test("database schema masks peer photos and last-seen and locks raw profiles", () => {
  const sql = read("supabase/migrations/20261023120000_user_privacy_controls.sql");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.user_privacy_settings/);
  assert.ok(sql.indexOf("ADD COLUMN IF NOT EXISTS created_at") < sql.indexOf("CREATE VIEW public.public_profiles"));
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /auth\.uid\(\) = user_id/g);
  assert.match(sql, /CASE WHEN COALESCE\(s\.profile_photo, true\) THEN p\.avatar ELSE NULL END/);
  assert.match(sql, /CASE WHEN COALESCE\(s\.last_seen, false\) THEN p\.last_seen_at ELSE NULL END/);
  assert.match(sql, /DROP POLICY IF EXISTS "Public profiles are viewable by everyone\."/);
  assert.match(sql, /CREATE POLICY profiles_select_own/);

  const bundle = read("supabase/APPLY_PENDING.sql");
  assert.match(bundle, /19\. Account-scoped privacy controls/);
  assert.match(bundle, /CREATE VIEW public\.public_profiles/);
});

test("peer profile consumers use the masked profile surface", () => {
  const peerConsumers = [
    "store/use-chat-store.ts",
    "store/use-stories-store.ts",
    "store/use-call-store.ts",
    "components/command-palette.tsx",
    "features/whiteboard/access-popover.tsx",
    "features/community/share-community-sheet.tsx",
    "features/community/create-post-dialog.tsx",
    "features/calls/invite-to-call-popup.tsx",
    "features/chat/attachment-dialogs.tsx",
    "features/chat/chat-bubble.tsx",
    "features/chat/chat-details-panel.tsx",
    "features/chat/chat-members-card.tsx",
    "features/chat/new-group-dialog.tsx",
    "features/chat/share-profile-sheet.tsx",
    "features/ai/tools/handlers.ts",
    "app/api/calls/start/route.ts",
    "app/api/calls/invite/route.ts",
    "app/api/livekit/token/route.ts"
  ];
  for (const file of peerConsumers) {
    assert.match(read(file), /\.from\(["']public_profiles["']\)/, file);
  }
  assert.doesNotMatch(read("components/stories/story-layer.tsx"), /cached\.avatar\s*\|\|\s*`https:\/\/api\.dicebear/);
  assert.match(read("store/use-stories-store.ts"), /profileMap\[me\.id\] = \{/);
});

test("last-seen writes are gated and disabling clears the stored timestamp", () => {
  const chat = read("store/use-chat-store.ts");
  assert.match(chat, /canDisclosePrivacy\([\s\S]{0,140}"lastSeen"\)[\s\S]{0,180}last_seen_at: nowIso/);
  assert.match(chat, /canDisclosePrivacy\([\s\S]{0,140}"lastSeen"\)[\s\S]{0,220}last_seen_at: new Date/);
  const settings = read("store/use-settings-store.ts");
  assert.match(settings, /key === "lastSeen" && !v/);
  assert.match(settings, /last_seen_at: null/);
});

test("capture protection is scoped to chat routes on web and Android", () => {
  const web = read("components/privacy/screen-protection.tsx");
  assert.match(web, /\^\\\/chats/);
  assert.match(web, /visibilitychange/);
  assert.match(web, /window\.addEventListener\("blur"/);
  assert.match(web, /privacy-print-protected/);
  assert.match(web, /browser screenshot blocking cannot be guaranteed/i);
  assert.match(web, /NativeScreenProtection\.setSecure/);

  const plugin = read("android/app/src/main/java/com/pratik/obsidia/ScreenProtectionPlugin.java");
  assert.match(plugin, /FLAG_SECURE/);
  assert.match(plugin, /clearFlags/);
  const activity = read("android/app/src/main/java/com/pratik/obsidia/MainActivity.java");
  assert.match(activity, /registerPlugin\(ScreenProtectionPlugin\.class\)/);
  assert.ok(activity.indexOf("registerPlugin") < activity.indexOf("super.onCreate"));
});

test("privacy UI explains sync and browser limitations honestly", () => {
  const settings = read("app/(app)/settings/page.tsx");
  assert.match(settings, /Visible to people you chat with/);
  assert.match(settings, /Protection on · browser limitations apply/);
  assert.match(settings, /Privacy change was not saved|privacyError/);
  const profile = read("app/(app)/profile/page.tsx");
  assert.match(profile, /role=\{privacyStatus === "error" \? "alert" : "status"\}/);
  assert.match(profile, /Saving securely…/);
});
