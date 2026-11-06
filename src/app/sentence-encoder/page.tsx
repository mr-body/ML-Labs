"use client";

import { useState } from "react";
import { useSentenceEncoder } from "../../hooks/useSentenceEncoder";

export default function SentenceEncoderPage() {
  const [sentence1, setSentence1] = useState("");
  const [sentence2, setSentence2] = useState("");
  const [similarity, setSimilarity] = useState("---");
  const [processing, setProcessing] = useState(false);
  const { status, loading, output, encodeAndCompare } = useSentenceEncoder();

  const handleCompare = async () => {
    setProcessing(true);
    try {
      const score = await encodeAndCompare(sentence1, sentence2);
      if (score !== null) setSimilarity(score.toFixed(4));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main style={{ fontFamily: "Arial, sans-serif", margin: "40px auto", padding: 20, maxWidth: 800 }}>
      <h1>Codificador de Sentenças</h1>
      <p>Status: <strong>{status}</strong></p>
      <p>Digite duas sentenças para comparar:</p>
      <textarea
        value={sentence1}
        onChange={(event) => setSentence1(event.target.value)}
        placeholder="Ex: Eu adoro programação."
        style={{ width: "100%", height: 60, marginBottom: 10, padding: 8 }}
      />
      <textarea
        value={sentence2}
        onChange={(event) => setSentence2(event.target.value)}
        placeholder="Ex: Programar é uma das minhas paixões."
        style={{ width: "100%", height: 60, marginBottom: 10, padding: 8 }}
      />
      <button onClick={handleCompare} disabled={loading || processing} style={{ padding: "10px 16px", cursor: "pointer", marginBottom: 20 }}>
        {processing ? "A comparar..." : "Codificar e Calcular Similaridade"}
      </button>
      <h3>Similaridade (cosseno):</h3>
      <div style={{ fontSize: 18, fontWeight: "bold", marginBottom: 20 }}>{similarity}</div>
      <h3>Vetores (embedding):</h3>
      <pre style={{ background: "#f2f2f2", padding: 10, borderRadius: 5, overflowX: "auto", color: "#333", whiteSpace: "pre-wrap" }}>
        {output}
      </pre>
    </main>
  );
}
