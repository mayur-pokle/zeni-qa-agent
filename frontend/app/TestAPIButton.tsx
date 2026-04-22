"use client";

import { useState } from "react";

export default function TestAPIButton() {
  const [result, setResult] = useState("");

  const runTest = async () => {
    const API = process.env.NEXT_PUBLIC_API_URL;

    const res = await fetch(`${API}/api/run-tests`);
    const data = await res.json();

    setResult(JSON.stringify(data));
  };

  return (
    <div style={{ marginTop: "20px" }}>
      <button onClick={runTest} className="ui-button">
        Run Backend Test
      </button>

      <pre style={{ marginTop: "10px" }}>{result}</pre>
    </div>
  );
}