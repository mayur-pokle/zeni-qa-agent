"use client";

import { useState } from "react";

export default function TestAPIButton() {
  const [result, setResult] = useState("");

  const runTest = async () => {
    setResult("Checking backend...");

    try {
      const res = await fetch("/api/health", {
        cache: "no-store"
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setResult(data?.error ?? `Backend returned HTTP ${res.status}`);
        return;
      }

      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Backend test failed");
    }
  };

  return (
    <div style={{ marginTop: "20px" }}>
      <button onClick={runTest} className="ui-button">
        Run Backend Test
      </button>

      <pre>{result}</pre>
    </div>
  );
}
