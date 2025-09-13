import React, { useState } from "react";

const FUNCTIONS_BASE: string =
  // @ts-ignore
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_FUNCTIONS_URL) ||
  // @ts-ignore
  (typeof window !== "undefined" && (window as any).__SUPABASE_FUNCTIONS_URL__) ||
  "http://localhost:54321/functions/v1";

export default function CoachPanel() {
  const [q, setQ] = useState<string>("Why did August drop?");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [actions, setActions] = useState<{title:string; due?:string}[]>([]);
  const [used, setUsed] = useState<any[]>([]);

  async function ask() {
    setLoading(true);
    setAnswer("");
    setActions([]);
    setUsed([]);

    try {
      const res = await fetch(`${FUNCTIONS_BASE}/coach-agent`, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ question: q, monthsBack: 6, hops: 1, k: 8 })
      });

      if (!res.ok) {
        throw new Error(`Error: ${res.statusText}`);
      }

      const json = await res.json();
      setAnswer(json.answer || "");
      setActions(Array.isArray(json.actions) ? json.actions : []);
      setUsed(Array.isArray(json.used_nodes) ? json.used_nodes : []);
    } catch (error) {
      console.error("Error in CoachPanel:", error);
      setAnswer("Sorry, there was an error processing your request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 border rounded-xl max-w-2xl space-y-3">
      <h3 className="font-semibold">WaveRider Coach</h3>
      <div className="flex gap-2">
        <input 
          value={q} 
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && ask()}
          className="flex-1 border rounded px-3 py-2 text-black" 
          placeholder="Ask about your months, promos, capacity…" 
          disabled={loading}
        />
        <button 
          onClick={ask} 
          className="px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700 transition-colors" 
          disabled={loading}
        >
          {loading ? "Thinking…" : "Ask"}
        </button>
      </div>

      {answer && (
        <div className="p-3 bg-gray-50 rounded">
          <div className="whitespace-pre-wrap">{answer}</div>
        </div>
      )}

      {actions.length > 0 && (
        <div>
          <div className="font-medium mb-1">Do this next:</div>
          <ul className="list-disc ml-6">
            {actions.map((a, i) => (
              <li key={i} className="mb-1">
                {a.title}
                {a.due && <span className="text-sm text-gray-600"> (due {a.due})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {used.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-600">Why this? (evidence)</summary>
          <ul className="list-disc ml-6 mt-2 space-y-1">
            {used.map((u: any) => (
              <li key={u.id} className="text-gray-700">
                <span className="font-medium">{u.label}</span>
                {u.props?.month && ` — ${u.props.month}`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
