import { SupabaseClient } from "@supabase/supabase-js";
import { TimelineResponse, CalendarResponse, MismatchResponse } from "@/lib/types";

// Centralized backend URL configuration
const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8000";

/**
 * Retrieves authenticated session token from Supabase client.
 */
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
 * Fetches the unified chronological health timeline for the authenticated patient.
 */
export async function fetchTimeline(
  supabase: SupabaseClient
): Promise<{ data: TimelineResponse | null; error: Error | null }> {
  try {
    const authHeader = await getAuthHeader(supabase);
    if (!authHeader) {
      return { data: null, error: new Error("Authentication required to access timeline.") };
    }

    const response = await fetch(`${BACKEND_URL}/api/timeline`, {
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
        error: new Error(errData.detail || `Server error (${response.status}) fetching timeline`),
      };
    }

    const data: TimelineResponse = await response.json();
    return { data, error: null };
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : "Failed to connect to backend intelligence service. Please verify the service is running.";
    return { data: null, error: new Error(msg) };
  }
}

/**
 * Fetches the healthcare calendar with confirmed and projected dates.
 */
export async function fetchCalendar(
  supabase: SupabaseClient
): Promise<{ data: CalendarResponse | null; error: Error | null }> {
  try {
    const authHeader = await getAuthHeader(supabase);
    if (!authHeader) {
      return { data: null, error: new Error("Authentication required to access calendar.") };
    }

    const response = await fetch(`${BACKEND_URL}/api/calendar`, {
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
        error: new Error(errData.detail || `Server error (${response.status}) fetching calendar`),
      };
    }

    const data: CalendarResponse = await response.json();
    return { data, error: null };
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : "Failed to connect to backend intelligence service. Please verify the service is running.";
    return { data: null, error: new Error(msg) };
  }
}

/**
 * Fetches cross-document information mismatches with bidirectional provenance.
 */
export async function fetchMismatches(
  supabase: SupabaseClient
): Promise<{ data: MismatchResponse | null; error: Error | null }> {
  try {
    const authHeader = await getAuthHeader(supabase);
    if (!authHeader) {
      return { data: null, error: new Error("Authentication required to access mismatches.") };
    }

    const response = await fetch(`${BACKEND_URL}/api/mismatches`, {
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
        error: new Error(errData.detail || `Server error (${response.status}) fetching mismatches`),
      };
    }

    const data: MismatchResponse = await response.json();
    return { data, error: null };
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : "Failed to connect to backend intelligence service. Please verify the service is running.";
    return { data: null, error: new Error(msg) };
  }
}
