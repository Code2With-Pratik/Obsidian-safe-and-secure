/**
 * Fail-closed disclosure policy shared by chat presence/read behavior.
 * Account-scoped privacy may publish only after the matching account loaded
 * successfully and no hydration/save error is active.
 */
export function canDisclosePrivacy(state, userId, key) {
  return Boolean(
    userId &&
      state.privacyHydrated === true &&
      state.privacyUserId === userId &&
      state.privacyStatus === "ready" &&
      state.privacy?.[key] === true
  );
}

/** Ignore responses belonging to an account that is no longer active. */
export function isCurrentPrivacyRequest(activeUserId, requestUserId) {
  return Boolean(activeUserId && activeUserId === requestUserId);
}

/**
 * Roll back only when the optimistic value is still current. A newer user
 * choice must win over an older failed request.
 */
export function rollbackPrivacyValue(privacy, key, attempted, previous) {
  if (privacy[key] !== attempted) return privacy;
  return { ...privacy, [key]: previous };
}

/** Keep the private unread cursor correct while independently gating the
 * irreversible peer-facing read acknowledgement. */
export async function applyReadVisibility({
  updatePrivateCursor,
  publishReadReceipt,
  mayPublish
}) {
  await updatePrivateCursor();
  if (mayPublish()) await publishReadReceipt();
}

/**
 * Coordinates typing packets so an in-flight `true` can never land after a
 * privacy-disable cleanup without a final `false` following it.
 */
export function createTypingDisclosureController({ canPublish, send }) {
  const desired = new Map();
  const generations = new Map();

  const nextGeneration = (chatId) => {
    const value = (generations.get(chatId) ?? 0) + 1;
    generations.set(chatId, value);
    return value;
  };

  const update = async (chatId, isTyping) => {
    if (isTyping && !canPublish()) return;

    const generation = nextGeneration(chatId);
    desired.set(chatId, isTyping);
    try {
      await send(chatId, isTyping);
    } catch {
      // Typing is ephemeral. Realtime reconnect/heartbeat paths recover, and
      // a failed packet must never break the composer.
      return;
    }

    if (!isTyping) {
      if (generations.get(chatId) === generation) desired.delete(chatId);
      return;
    }

    const currentGeneration = generations.get(chatId);
    const currentDesired = desired.get(chatId);
    if (currentGeneration !== generation) {
      // A newer positive intent owns the final state. A newer cleanup needs
      // one more false after this delayed true has actually completed.
      if (currentDesired === false || currentDesired === undefined) {
        try {
          await send(chatId, false);
        } catch {}
      }
      return;
    }

    if (!canPublish()) {
      desired.delete(chatId);
      nextGeneration(chatId);
      try {
        await send(chatId, false);
      } catch {}
    }
  };

  const cleanup = async () => {
    const chats = Array.from(desired.entries())
      .filter(([, value]) => value === true)
      .map(([chatId]) => chatId);
    await Promise.all(chats.map((chatId) => update(chatId, false)));
  };

  const reset = () => {
    desired.clear();
    generations.clear();
  };

  return { update, cleanup, reset };
}
