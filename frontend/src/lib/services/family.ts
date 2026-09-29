import { SupabaseClient } from "@supabase/supabase-js";
import {
  FamilyDashboardResponse,
  FamilyGroupItem,
  FamilyMemberProfile,
  AddFamilyMemberRequest,
  UpdateFamilyMemberRequest,
  FamilyMemberClinicalRecords,
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
 * Fetches family groups and member identities for the authenticated patient.
 */
export async function fetchFamilyDashboard(
  supabase: SupabaseClient
): Promise<{ data: FamilyDashboardResponse | null; error: Error | null }> {
  try {
    const authHeader = await getAuthHeader(supabase);
    if (!authHeader) {
      return { data: null, error: new Error("Authentication required to access Family Dashboard.") };
    }

    const response = await fetch(`${BACKEND_URL}/api/family`, {
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
        error: new Error(errData.detail || `Error (${response.status}) loading family dashboard.`),
      };
    }

    const data: FamilyDashboardResponse = await response.json();
    return { data, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load family dashboard.";
    return { data: null, error: new Error(msg) };
  }
}

/**
 * Creates a new family circle group.
 */
export async function createFamilyGroup(
  supabase: SupabaseClient,
  name: string
): Promise<{ data: FamilyGroupItem | null; error: Error | null }> {
  try {
    const authHeader = await getAuthHeader(supabase);
    if (!authHeader) {
      return { data: null, error: new Error("Authentication required.") };
    }

    const response = await fetch(`${BACKEND_URL}/api/family`, {
      method: "POST",
      headers: {
        ...authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        data: null,
        error: new Error(errData.detail || `Failed to create family group (${response.status}).`),
      };
    }

    const data: FamilyGroupItem = await response.json();
    return { data, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create family group.";
    return { data: null, error: new Error(msg) };
  }
}

/**
 * Registers a family member/dependent with their own independent record isolation.
 */
export async function addFamilyMember(
  supabase: SupabaseClient,
  req: AddFamilyMemberRequest
): Promise<{ data: FamilyMemberProfile | null; error: Error | null }> {
  try {
    const authHeader = await getAuthHeader(supabase);
    if (!authHeader) {
      return { data: null, error: new Error("Authentication required.") };
    }

    const response = await fetch(`${BACKEND_URL}/api/family/members`, {
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
        error: new Error(errData.detail || `Failed to add family member (${response.status}).`),
      };
    }

    const data: FamilyMemberProfile = await response.json();
    return { data, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to add family member.";
    return { data: null, error: new Error(msg) };
  }
}

/**
 * Updates permissions (e.g. can_view_records) or relationship for a member.
 */
export async function updateFamilyMember(
  supabase: SupabaseClient,
  membershipId: string,
  req: UpdateFamilyMemberRequest
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const authHeader = await getAuthHeader(supabase);
    if (!authHeader) {
      return { success: false, error: new Error("Authentication required.") };
    }

    const response = await fetch(`${BACKEND_URL}/api/family/members/${membershipId}`, {
      method: "PATCH",
      headers: {
        ...authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: new Error(errData.detail || `Failed to update member (${response.status}).`),
      };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update member.";
    return { success: false, error: new Error(msg) };
  }
}

/**
 * Retrieves clinical records of an authorized family member.
 * Server returns 403 if can_view_records is not true.
 */
export async function fetchFamilyMemberRecords(
  supabase: SupabaseClient,
  targetPatientId: string
): Promise<{ data: FamilyMemberClinicalRecords | null; error: Error | null }> {
  try {
    const authHeader = await getAuthHeader(supabase);
    if (!authHeader) {
      return { data: null, error: new Error("Authentication required.") };
    }

    const response = await fetch(`${BACKEND_URL}/api/family/members/${targetPatientId}/records`, {
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
        error: new Error(errData.detail || `Access denied (${response.status}).`),
      };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load family member records.";
    return { data: null, error: new Error(msg) };
  }
}
