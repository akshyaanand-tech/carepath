import { SupabaseClient } from "@supabase/supabase-js";
import {
  CreateConsentRequest,
  ConsentSessionItem,
  ConsentSessionListResponse,
  RevokeConsentResponse,
  AuditLogResponse,
  DoctorAccessResponse,
} from "@/lib/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

async function getAuthHeader(supabase: SupabaseClient): Promise<{ Authorization: string } | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return null;
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

/**
 * Creates a time-bound doctor access session with opaque cryptographic token.
 */
export async function createConsentSession(
  supabase: SupabaseClient,
  req: CreateConsentRequest
): Promise<{ data: ConsentSessionItem | null; error: Error | null }> {
  try {
    const authHeader = await getAuthHeader(supabase);
    if (!authHeader) {
      return { data: null, error: new Error("Authentication required.") };
    }

    const response = await fetch(`${BACKEND_URL}/api/consent`, {
      method: "POST",
      headers: {
        ...authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        data: null,
        error: new Error(errData.detail || `Failed to create consent session (${response.status}).`),
      };
    }

    const data: ConsentSessionItem = await response.json();
    return { data, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create consent session.";
    return { data: null, error: new Error(msg) };
  }
}

/**
 * Fetches all active, expired, and revoked consent sessions for the patient.
 */
export async function fetchConsentSessions(
  supabase: SupabaseClient
): Promise<{ data: ConsentSessionListResponse | null; error: Error | null }> {
  try {
    const authHeader = await getAuthHeader(supabase);
    if (!authHeader) {
      return { data: null, error: new Error("Authentication required.") };
    }

    const response = await fetch(`${BACKEND_URL}/api/consent`, {
      method: "GET",
      headers: {
        ...authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        data: null,
        error: new Error(errData.detail || `Failed to load consent sessions (${response.status}).`),
      };
    }

    const data: ConsentSessionListResponse = await response.json();
    return { data, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load consent sessions.";
    return { data: null, error: new Error(msg) };
  }
}

/**
 * Revokes an active consent session immediately.
 */
export async function revokeConsentSession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<{ data: RevokeConsentResponse | null; error: Error | null }> {
  try {
    const authHeader = await getAuthHeader(supabase);
    if (!authHeader) {
      return { data: null, error: new Error("Authentication required.") };
    }

    const response = await fetch(`${BACKEND_URL}/api/consent/${sessionId}/revoke`, {
      method: "POST",
      headers: {
        ...authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        data: null,
        error: new Error(errData.detail || `Failed to revoke session (${response.status}).`),
      };
    }

    const data: RevokeConsentResponse = await response.json();
    return { data, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to revoke session.";
    return { data: null, error: new Error(msg) };
  }
}

/**
 * Retrieves the append-only access audit log for the patient.
 */
export async function fetchAccessAuditLogs(
  supabase: SupabaseClient
): Promise<{ data: AuditLogResponse | null; error: Error | null }> {
  try {
    const authHeader = await getAuthHeader(supabase);
    if (!authHeader) {
      return { data: null, error: new Error("Authentication required.") };
    }

    const response = await fetch(`${BACKEND_URL}/api/consent/audit`, {
      method: "GET",
      headers: {
        ...authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        data: null,
        error: new Error(errData.detail || `Failed to fetch audit log (${response.status}).`),
      };
    }

    const data: AuditLogResponse = await response.json();
    return { data, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load audit log.";
    return { data: null, error: new Error(msg) };
  }
}

/**
 * Validates doctor access token and returns consented clinical data.
 * Unauthenticated endpoint: capability token is the authorization.
 */
export async function fetchDoctorAccess(
  token: string
): Promise<{ data: DoctorAccessResponse | null; error: Error | null }> {
  try {
    const cleanToken = token.trim();
    if (!cleanToken) {
      return { data: null, error: new Error("Doctor access token is required.") };
    }

    const response = await fetch(`${BACKEND_URL}/api/doctor/access/${encodeURIComponent(cleanToken)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        data: null,
        error: new Error(errData.detail || `Access denied (${response.status}).`),
      };
    }

    const data: DoctorAccessResponse = await response.json();
    return { data, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to validate doctor access token.";
    return { data: null, error: new Error(msg) };
  }
}
