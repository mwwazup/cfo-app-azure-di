import { useState } from "react";

/**
 * Sends a few example nodes & edges to the rag-ingest function.
 * You can click this once to have something to test with.
 */
const FUNCTIONS_BASE: string =
  // @ts-ignore
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_FUNCTIONS_URL) ||
  // @ts-ignore
  (typeof window !== "undefined" && (window as any).__SUPABASE_FUNCTIONS_URL__) ||
  "http://localhost:54321/functions/v1";

export default function GraphSeeder() {
  const [msg, setMsg] = useState<string>("");

  async function seed() {
    setMsg("Seeding...");
    try {
      const nodes = [
        { label: "Month", body: "August revenue dipped vs July", props: { month: "2025-08" }, valid_from: "2025-08-31T00:00:00Z" },
        { label: "Note",  body: "Back-to-school reduced weekend bookings", props: { tag: "seasonality" }, valid_from: "2025-08-15T00:00:00Z" },
        { label: "Promo", body: "Labor Day Refresh $169 offer", props: { code: "REFRESH169" }, valid_from: "2025-09-01T00:00:00Z" },
        { label: "Capacity", body: "Only 2 techs in August; 18 jobs/week capacity", props: { techs: 2, capacity_jobs_per_week: 18 }, valid_from: "2025-08-01T00:00:00Z" },
        { label: "Month", body: "September revenue rebounded with promo", props: { month: "2025-09" }, valid_from: "2025-09-30T00:00:00Z" }
      ];

      const res = await fetch(`${FUNCTIONS_BASE}/rag-ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes })
      });

      const text = await res.text();
      if (!res.ok) {
        setMsg("Error: " + text);
        return;
      }

      setMsg("Done! " + text);
    } catch (e: any) {
      setMsg("Network/JS error: " + String(e?.message || e));
    }
  }

  return (
    <div className="p-4 border rounded-xl max-w-md space-y-2">
      <button onClick={seed} className="w-full py-2 rounded-xl bg-gray-800 text-white">Seed demo graph</button>
      <pre className="text-xs whitespace-pre-wrap">{msg}</pre>
    </div>
  );
}
