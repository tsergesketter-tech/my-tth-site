// client/src/utils/auth.ts
// Authentication utilities for member session management

export interface Member {
  membershipNumber: string;
  memberId?: string;
  program: string;
}

/**
 * Create a mock member session for development
 */
export async function createMockSession(
  membershipNumber: string = "DL12345",
  memberId: string = "0lMKY000000LbUW2A0"
): Promise<Member> {
  const response = await fetch("/api/auth/mock-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // Important: include cookies
    body: JSON.stringify({ membershipNumber, memberId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || "Failed to create session");
  }

  const data = await response.json();
  return data.member;
}

/**
 * Get current member session
 */
export async function getCurrentMember(): Promise<Member | null> {
  try {
    const response = await fetch("/api/auth/me", {
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.member || null;
  } catch (error) {
    console.error("Failed to get current member:", error);
    return null;
  }
}

/**
 * Ensure member session exists, create one if needed
 */
export async function ensureSession(): Promise<Member> {
  let member = await getCurrentMember();
  
  if (!member) {
    console.log("[auth] No session found, creating mock session...");
    member = await createMockSession();
    console.log("[auth] Mock session created:", member);
  } else {
    console.log("[auth] Existing session found:", member);
  }

  return member;
}

/**
 * Logout current member
 */
export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}