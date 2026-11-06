"use client";

import { useState } from "react";
import { useToxicityDetection } from "../../hooks/useToxicityDetection";

export default function ToxicityPage() {
  const [inputText, setInputText] = useState("");
  const { status, results, loading, analyzing, checkText } = useToxicityDetection(0.9);

  return (
    <main style={{ fontFamily: "Arial, sans-serif", margin: "40px auto", padding: 20, maxWidth: 600 }}>
      <h1>Verificador de Toxicidade</h1>
      <p>Status: <strong>{status}</strong></p>
      <textarea
        value={inputText}
        onChange={(event) => setInputText(event.target.value)}
        rows={4}
        placeholder="Digite seu comentário aqui..."
        style={{ width: "100%", padding: 8, marginBottom: 10 }}
      />
      <button onClick={() => void checkText(inputText)} disabled={loading || analyzing} style={{ padding: "10px 16px", cursor: "pointer", marginBottom: 20 }}>
        {analyzing ? "Verificando..." : "Verificar"}
      </button>
      {results.length > 0 && (
        <section>
          <h3>Resultados:</h3>
          <ul style={{ paddingLeft: 20 }}>
            {results.map((result) => (
              <li key={result.label} style={{ marginBottom: 6 }}>
                <strong>{result.label}:</strong>{" "}
                <span style={{ color: result.match ? "red" : "green", fontWeight: "bold" }}>
                  {result.match ? "Tóxico" : "Não tóxico"}
                </span>{" "}
                (Probabilidade: {(result.probability * 100).toFixed(2)}%)
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
