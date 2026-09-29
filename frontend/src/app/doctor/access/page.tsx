"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  AlertTriangle,
  Stethoscope,
  FileText,
  Lock,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchDoctorAccess } from "@/lib/services/consent";
import { DoctorAccessResponse, ScopedClinicalItem, MedicalDocument } from "@/lib/types";

function DoctorAccessContent() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token") || "";

  const [tokenInput, setTokenInput] = useState(tokenParam);
  const [data, setData] = useState<DoctorAccessResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(tokenParam));
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("timeline");

  const applyResponse = useCallback(
    (res: { data: DoctorAccessResponse | null; error: Error | { message: string } | null }) => {
      setLoading(false);
      if (res.error) {
        setError(res.error.message);
      } else if (res.data) {
        setData(res.data);
        if (res.data.scope.length > 0) {
          if (res.data.scope.includes("timeline")) setActiveTab("timeline");
          else if (res.data.scope.includes("medications")) setActiveTab("medications");
          else if (res.data.scope.includes("investigations")) setActiveTab("investigations");
          else setActiveTab(res.data.scope[0]);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!tokenParam) return;
    let isMounted = true;

    fetchDoctorAccess(tokenParam.trim()).then((res) => {
      if (isMounted) {
        applyResponse(res);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [tokenParam, applyResponse]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    const res = await fetchDoctorAccess(tokenInput.trim());
    applyResponse(res);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Clinical Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight">CarePath Provider Portal</span>
                <Badge variant="outline" className="text-[10px] bg-teal-950 text-teal-300 border-teal-800">
                  Temporary QR Session
                </Badge>
              </div>
              <span className="text-xs text-slate-400">Least-privilege healthcare encounter access</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Cryptographic Capability Token</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Token Input Bar (if no active session or switching token) */}
        {!data && (
          <div className="max-w-xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-xl space-y-4 my-8">
            <div className="text-center space-y-1.5">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 mb-2">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-white">Attending Provider Verification</h2>
              <p className="text-xs text-slate-400">
                Enter or scan the patient-provided QR access token to view authorized clinical records.
              </p>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Temporary Access Token</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Paste access token from QR..."
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <Button
                    type="submit"
                    disabled={loading || !tokenInput.trim()}
                    className="bg-teal-600 hover:bg-teal-500 text-white text-xs h-9.5 px-4 font-semibold shrink-0"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify Access"}
                  </Button>
                </div>
              </div>
            </form>

            {error && (
              <div className="rounded-xl border border-red-900/50 bg-red-950/40 p-3.5 text-xs text-red-300 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-red-200">Access Denied</p>
                  <p className="text-red-300/90">{error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Active Doctor Session View */}
        {data && (
          <div className="space-y-6">
            {/* Session Banner */}
            <div className="rounded-2xl border border-teal-800/60 bg-gradient-to-r from-slate-950 via-teal-950/30 to-slate-950 p-5 shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded-md border border-teal-800">
                      Verified Patient
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400">Recipient: {data.recipient_name}</span>
                  </div>
                  <h1 className="text-2xl font-bold text-white mt-1">{data.patient_name}</h1>
                  {data.profile && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                      {data.profile.date_of_birth && <span>DOB: {data.profile.date_of_birth}</span>}
                      {data.profile.gender && <span className="capitalize">Gender: {data.profile.gender}</span>}
                      {data.profile.phone && <span>Phone: {data.profile.phone}</span>}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 text-right space-y-0.5">
                    <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Session Expiry</div>
                    <div className="text-sm font-mono font-bold text-teal-300">
                      {new Date(data.expires_at).toLocaleTimeString()}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      (~{Math.ceil(data.time_remaining_seconds / 60)} min remaining)
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setData(null);
                      setTokenInput("");
                    }}
                    className="text-xs border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                  >
                    Switch Token
                  </Button>
                </div>
              </div>

              {/* Granted Scopes */}
              <div className="space-y-1 pt-3 border-t border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block">
                  Patient Authorized Data Scope:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {data.scope.map((s) => (
                    <Badge key={s} className="bg-teal-900/60 text-teal-300 border-teal-700 text-[10px] capitalize">
                      <CheckCircle2 className="h-3 w-3 mr-1 text-teal-400" />
                      {s.replace("_", " ")}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Scope Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
              {data.scope.includes("timeline") && (
                <button
                  onClick={() => setActiveTab("timeline")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === "timeline"
                      ? "bg-teal-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  Unified Timeline ({data.timeline?.length || 0})
                </button>
              )}

              {data.scope.includes("medications") && (
                <button
                  onClick={() => setActiveTab("medications")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === "medications"
                      ? "bg-teal-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  Medications ({data.medications?.length || 0})
                </button>
              )}

              {data.scope.includes("investigations") && (
                <button
                  onClick={() => setActiveTab("investigations")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === "investigations"
                      ? "bg-teal-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  Lab Investigations ({data.investigations?.length || 0})
                </button>
              )}

              {data.scope.includes("diagnoses") && (
                <button
                  onClick={() => setActiveTab("diagnoses")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === "diagnoses"
                      ? "bg-teal-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  Diagnoses ({data.diagnoses?.length || 0})
                </button>
              )}

              {data.scope.includes("procedures") && (
                <button
                  onClick={() => setActiveTab("procedures")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === "procedures"
                      ? "bg-teal-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  Procedures ({data.procedures?.length || 0})
                </button>
              )}

              {data.scope.includes("documents") && (
                <button
                  onClick={() => setActiveTab("documents")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === "documents"
                      ? "bg-teal-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  Documents ({data.documents?.length || 0})
                </button>
              )}
            </div>

            {/* Tab Views */}
            <div className="space-y-4">
              {/* Timeline Tab */}
              {activeTab === "timeline" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-200">Chronological Health Journey</h3>
                    <span className="text-xs text-slate-500">Ordered by documented date</span>
                  </div>

                  {!data.timeline || data.timeline.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-8 text-center text-xs text-slate-400">
                      No clinical timeline events recorded.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {data.timeline.map((ev) => (
                        <div
                          key={ev.id}
                          className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-xs space-y-2 hover:border-slate-700 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{ev.title}</span>
                              <Badge className="bg-slate-800 text-slate-300 text-[10px] capitalize">
                                {ev.event_type.replace("_", " ")}
                              </Badge>
                            </div>
                            <span className="text-xs text-teal-400 font-medium">{ev.date_display}</span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-900">
                            <span className="truncate max-w-sm">Source: {ev.document_name}</span>
                            {ev.source_page && <span>Page {ev.source_page}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Medications Tab */}
              {activeTab === "medications" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-200">Prescriptions & Regimens</h3>
                  {!data.medications || data.medications.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-8 text-center text-xs text-slate-400">
                      No medications documented.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data.medications.map((m: ScopedClinicalItem) => (
                        <div key={m.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white">{m.name}</span>
                            <span className="text-xs font-semibold text-teal-400">{m.dose || "Dose unstated"}</span>
                          </div>
                          <p className="text-xs text-slate-400">
                            Route: {m.route || "Oral"} • Freq: {m.frequency || "Unspecified"} • {m.duration || ""}
                          </p>
                          {m.instructions && (
                            <p className="text-[11px] text-slate-500 italic">Instructions: {m.instructions}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Investigations Tab */}
              {activeTab === "investigations" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-200">Laboratory & Diagnostic Results</h3>
                  {!data.investigations || data.investigations.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-8 text-center text-xs text-slate-400">
                      No lab results documented.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data.investigations.map((inv: ScopedClinicalItem) => (
                        <div key={inv.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white">{inv.name}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-teal-300">
                                {inv.result} {inv.unit || ""}
                              </span>
                              {inv.abnormal_flag && (
                                <Badge className="bg-amber-950 text-amber-300 border-amber-800 text-[10px]">
                                  Abnormal
                                </Badge>
                              )}
                            </div>
                          </div>
                          {inv.reference_range && (
                            <p className="text-[11px] text-slate-500">Normal Reference: {inv.reference_range}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Diagnoses Tab */}
              {activeTab === "diagnoses" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-200">Documented Conditions & Diagnoses</h3>
                  {!data.diagnoses || data.diagnoses.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-8 text-center text-xs text-slate-400">
                      No diagnoses documented.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data.diagnoses.map((d: ScopedClinicalItem) => (
                        <div key={d.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white">{d.name}</span>
                            <Badge className="bg-slate-800 text-slate-300 text-[10px] capitalize">
                              {d.status || "Documented"}
                            </Badge>
                          </div>
                          <span className="text-xs text-slate-500">{d.date || "Date unstated"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Documents Tab */}
              {activeTab === "documents" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-200">Patient Document Vault Metadata</h3>
                  {!data.documents || data.documents.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-8 text-center text-xs text-slate-400">
                      No documents in vault.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.documents.map((doc: MedicalDocument) => (
                        <div key={doc.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <FileText className="h-4 w-4 text-teal-400" />
                            <span className="text-white font-medium">{doc.file_name}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                            {doc.document_type || "general"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer watermark */}
      <footer className="border-t border-slate-800 py-4 px-6 text-center text-[11px] text-slate-500">
        CarePath Temporary Doctor Encounter Portal • Prototype Healthcare Information System • Least-privilege data access strictly enforced server-side.
      </footer>
    </div>
  );
}

export default function DoctorAccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
          <div className="flex items-center gap-3 text-teal-400">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm font-medium">Loading clinical portal session...</span>
          </div>
        </div>
      }
    >
      <DoctorAccessContent />
    </Suspense>
  );
}
