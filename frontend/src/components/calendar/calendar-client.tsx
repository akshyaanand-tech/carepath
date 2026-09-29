"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { fetchCalendar } from "@/lib/services/intelligence";
import { getPatientDocuments } from "@/lib/services/documents";
import { CalendarEvent, MedicalDocument } from "@/lib/types";
import { CalendarView } from "./calendar-view";
import { SourceLinkingModal } from "@/components/timeline/source-linking-modal";
import { DocumentViewerModal } from "@/components/documents/document-viewer-modal";

interface CalendarClientProps {
  patientId: string;
}

export function CalendarClient({ patientId }: CalendarClientProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [projectedCount, setProjectedCount] = useState(0);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [viewerDocument, setViewerDocument] = useState<MedicalDocument | null>(null);
  const [targetPage, setTargetPage] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    try {
      const [calRes, docRes] = await Promise.all([
        fetchCalendar(supabase),
        getPatientDocuments(supabase, patientId),
      ]);

      if (calRes.error) {
        setError(calRes.error.message);
      } else if (calRes.data) {
        setEvents(calRes.data.events);
        setConfirmedCount(calRes.data.confirmed_count);
        setProjectedCount(calRes.data.projected_count);
      }

      if (docRes.documents) {
        setDocuments(docRes.documents);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load healthcare calendar.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    Promise.all([
      fetchCalendar(supabase),
      getPatientDocuments(supabase, patientId),
    ])
      .then(([calRes, docRes]) => {
        if (!isMounted) return;
        if (calRes.error) {
          setError(calRes.error.message);
        } else if (calRes.data) {
          setEvents(calRes.data.events);
          setConfirmedCount(calRes.data.confirmed_count);
          setProjectedCount(calRes.data.projected_count);
        }
        if (docRes.documents) {
          setDocuments(docRes.documents);
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load healthcare calendar.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [patientId]);

  const handleOpenDocument = (documentId: string, pageNumber?: number | null) => {
    const doc = documents.find((d) => d.id === documentId);
    if (doc) {
      setTargetPage(pageNumber ?? null);
      setViewerDocument(doc);
    } else {
      const supabase = createClient();
      supabase
        .from("documents")
        .select("*")
        .eq("id", documentId)
        .maybeSingle()
        .then((res: { data: unknown }) => {
          if (res.data) {
            setTargetPage(pageNumber ?? null);
            setViewerDocument(res.data as MedicalDocument);
          } else {
            alert("Source document could not be retrieved from vault.");
          }
        });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
              Care Milestones
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-500 font-medium">Healthcare Milestone Calendar</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            AI Health Calendar
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Clear visual distinction between confirmed appointment dates and deterministically projected review intervals.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
          className="text-xs h-9 text-slate-700 self-start sm:self-auto border-slate-300 shadow-2xs"
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin text-teal-600" : ""}`} />
          Refresh Calendar
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Unable to load healthcare calendar</p>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && events.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">
            Synthesizing Healthcare Calendar...
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Resolving confirmed clinic visits and calculating deterministic review intervals.
          </p>
        </div>
      ) : (
        <CalendarView
          events={events}
          confirmedCount={confirmedCount}
          projectedCount={projectedCount}
          onSelectEvent={(ev) => setSelectedEvent(ev)}
          onOpenDocument={handleOpenDocument}
        />
      )}

      {/* Source Linking Modal */}
      {selectedEvent && (
        <SourceLinkingModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onOpenDocument={(docId, page) => {
            setSelectedEvent(null);
            handleOpenDocument(docId, page);
          }}
        />
      )}

      {/* Document Viewer Modal */}
      {viewerDocument && (
        <DocumentViewerModal
          document={viewerDocument}
          initialPage={targetPage}
          onClose={() => {
            setViewerDocument(null);
            setTargetPage(null);
          }}
        />
      )}
    </div>
  );
}
