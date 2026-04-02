type UserIdentity = {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
};

function normalize(value?: string | null): string {
  return String(value ?? "").trim();
}

function initialsFromText(value: string): string {
  const words = value.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return words
    .map((word) => word.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function initialsFromUsername(username: string): string {
  const parts = username.split(/[._-]+/).filter(Boolean);

  if (parts.length > 1) {
    const initials = parts
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase();

    if (initials) {
      return initials;
    }
  }

  return username.slice(0, 2).toUpperCase();
}

export function getUserDisplayName(
  user?: UserIdentity | null,
  fallback = "Người dùng",
): string {
  const fullName = normalize(user?.fullName);
  if (fullName) {
    return fullName;
  }

  const mergedName = [normalize(user?.lastName), normalize(user?.firstName)]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (mergedName) {
    return mergedName;
  }

  const username = normalize(user?.username);
  if (username) {
    return username;
  }

  return fallback;
}

export function getUserAvatarInitials(
  user?: UserIdentity | null,
  fallback = "NA",
): string {
  const displayName = getUserDisplayName(user, "");
  if (displayName) {
    const initials = initialsFromText(displayName);
    if (initials) {
      return initials;
    }
  }

  const username = normalize(user?.username);
  if (username) {
    const initials = initialsFromUsername(username);
    if (initials) {
      return initials;
    }
  }

  return fallback;
}
