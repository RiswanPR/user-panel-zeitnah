/**
 * ZEITNAH MESSAGING IDENTITY RESOLUTION UTILITY
 * Authoritative helper for participant identity, conversation display names,
 * professional context, and avatar fallbacks.
 *
 * Rule: The logged-in user must NEVER be resolved as the direct conversation recipient.
 * Fallback: "Zeitnah Member" instead of generic "User".
 * Group Fallback: Deterministic "Name1, Name2 + N others" instead of generic "Group".
 */

/**
 * Extracts normalized string ID from any user/participant representation.
 */
export function getUserId(userOrId) {
  if (!userOrId) return '';
  if (typeof userOrId === 'string') return userOrId;
  return String(userOrId._id || userOrId.id || userOrId.userId || '');
}

/**
 * Resolves the other participant in a direct conversation.
 * Handles:
 * - Pre-resolved conv.otherParticipant / conv.partner
 * - Populated participant objects in conv.participants
 * - Raw string / ObjectId arrays
 * - Current user appearing first, second, or multiple times
 * - Reversed participant order
 * - Deleted or deactivated users
 */
export function getOtherParticipant(conversation, currentUserId) {
  if (!conversation) return null;
  const currentIdStr = getUserId(currentUserId);

  // 1. If backend already identified the partner / otherParticipant
  if (conversation.otherParticipant && typeof conversation.otherParticipant === 'object') {
    const partnerId = getUserId(conversation.otherParticipant);
    if (partnerId && partnerId !== currentIdStr) {
      return conversation.otherParticipant;
    }
  }

  if (conversation.partner && typeof conversation.partner === 'object') {
    const partnerId = getUserId(conversation.partner);
    if (partnerId && partnerId !== currentIdStr) {
      return conversation.partner;
    }
  }

  // 2. Scan participants array
  const participants = Array.isArray(conversation.participants)
    ? conversation.participants
    : [];

  const other = participants.find((p) => {
    const pid = getUserId(p);
    return pid && pid !== currentIdStr;
  });

  if (other && typeof other === 'object') {
    return other;
  }

  if (other && typeof other === 'string') {
    return {
      _id: other,
      id: other,
      name: '',
      username: '',
      avatar: '',
      avatarUrl: '',
    };
  }

  // 3. Scan members array as fallback
  const members = Array.isArray(conversation.members) ? conversation.members : [];
  const otherMember = members.find((m) => {
    const mid = getUserId(m.userId || m);
    return mid && mid !== currentIdStr;
  });

  if (otherMember?.userId && typeof otherMember.userId === 'object') {
    return otherMember.userId;
  }

  if (otherMember) {
    const mid = getUserId(otherMember.userId || otherMember);
    return {
      _id: mid,
      id: mid,
      name: '',
      username: '',
      avatar: '',
      avatarUrl: '',
    };
  }

  return null;
}

/**
 * Resolves full display name of a single user.
 * Controlled fallback: "Zeitnah Member" instead of generic "User".
 */
export function getUserDisplayName(user) {
  if (!user) return 'Zeitnah Member';
  if (user.name && user.name.trim()) return user.name.trim();
  if (user.username && user.username.trim()) {
    const u = user.username.trim();
    return u.startsWith('@') ? u : `@${u}`;
  }
  return 'Zeitnah Member';
}

/**
 * Resolves conversational display name.
 * - Direct: Other participant's real name, @username, or "Zeitnah Member".
 * - Group: Explicit group name, or deterministic summary ("Ahmed, Sarah + 4 others").
 */
export function getConversationDisplayName(conversation, currentUserId) {
  if (!conversation) return 'Conversation';
  const isDirect =
    conversation.type === 'DIRECT' ||
    conversation.type === 'MESSAGE_REQUEST';

  if (isDirect) {
    const other = getOtherParticipant(conversation, currentUserId);
    if (other?.name && other.name.trim()) {
      return other.name.trim();
    }
    if (other?.username && other.username.trim()) {
      const u = other.username.trim();
      return u.startsWith('@') ? u : `@${u}`;
    }
    if (
      conversation.name &&
      conversation.name.trim() &&
      conversation.name !== 'Direct Message'
    ) {
      return conversation.name.trim();
    }
    if (
      conversation.title &&
      conversation.title.trim() &&
      conversation.title !== 'Direct Message'
    ) {
      return conversation.title.trim();
    }
    return 'Zeitnah Member';
  }

  // Group Conversation
  if (conversation.name && conversation.name.trim()) {
    return conversation.name.trim();
  }
  if (conversation.title && conversation.title.trim()) {
    return conversation.title.trim();
  }

  // Deterministic summary from participants
  const currentIdStr = getUserId(currentUserId);
  const participants = Array.isArray(conversation.participants)
    ? conversation.participants
    : [];

  const others = participants.filter((p) => getUserId(p) !== currentIdStr);
  const names = others
    .map((p) => {
      if (typeof p === 'object' && p?.name && p.name.trim()) {
        return p.name.trim().split(' ')[0]; // First name for compact presentation
      }
      if (typeof p === 'object' && p?.username && p.username.trim()) {
        return `@${p.username.trim()}`;
      }
      return null;
    })
    .filter(Boolean);

  if (names.length === 1) {
    return names[0];
  }
  if (names.length === 2) {
    return `${names[0]}, ${names[1]}`;
  }
  if (names.length > 2) {
    return `${names[0]}, ${names[1]} + ${others.length - 2} others`;
  }

  return 'Infrastructure Group';
}

/**
 * Resolves avatar image path or URL.
 */
export function getConversationAvatar(conversation, currentUserId) {
  if (!conversation) return '';
  const isDirect =
    conversation.type === 'DIRECT' ||
    conversation.type === 'MESSAGE_REQUEST';

  if (isDirect) {
    const other = getOtherParticipant(conversation, currentUserId);
    return (
      other?.avatar ||
      other?.avatarUrl ||
      conversation.avatar ||
      conversation.avatarUrl ||
      ''
    );
  }

  return conversation.avatar || conversation.avatarUrl || '';
}

/**
 * Extracts lightweight professional context for chat list rows or headers.
 * E.g. "Senior Structural Engineer" or "Civil Engineering • Highways".
 */
export function getProfessionalContext(participant) {
  if (!participant || typeof participant !== 'object') return null;

  if (participant.currentRole && participant.currentRole.trim()) {
    return participant.currentRole.trim();
  }
  if (participant.headline && participant.headline.trim()) {
    return participant.headline.trim();
  }

  const parts = [];
  if (participant.primaryRole && participant.primaryRole !== 'STUDENT') {
    parts.push(participant.primaryRole.charAt(0) + participant.primaryRole.slice(1).toLowerCase());
  }
  if (participant.primaryDiscipline) {
    parts.push(participant.primaryDiscipline);
  }

  return parts.length > 0 ? parts.join(' • ') : null;
}

/**
 * Formats 1-2 uppercase initials for avatar presentation.
 */
export function getInitials(name) {
  if (!name || typeof name !== 'string') return 'Z';
  const clean = name.replace(/^@/, '').trim();
  if (!clean) return 'Z';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}
