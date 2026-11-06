"use client";

import { useRef, useState } from "react";
import { useMobileNetClassification } from "../../hooks/useMobileNetClassification";

export default function MobileNetPage() {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageSrc, setImageSrc] = useState("");
  const { status, predictions, loading, classify, reset } = useMobileNetClassification();

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    reset();
    setImageSrc(URL.createObjectURL(file));
  };

  return (
    <main style={{ fontFamily: "Arial, sans-serif", textAlign: "center", padding: 20 }}>
      <h1>Classificação de Imagem com MobileNet</h1>
      <input type="file" accept="image/*" onChange={handleImageChange} disabled={loading} />
      <div role="status" style={{ marginTop: 15, fontWeight: "bold" }}>{status}</div>
      {imageSrc && (
        <img
          ref={imageRef}
          src={imageSrc}
          alt="Imagem selecionada"
          onLoad={() => imageRef.current && void classify(imageRef.current)}
          onError={() => setImageSrc("")}
          style={{ maxWidth: 300, maxHeight: 400, objectFit: "contain", margin: "20px auto", display: "block" }}
        />
      )}
      <ul style={{ margin: "20px auto", padding: 0, listStyle: "none", width: "min(100%, 300px)" }}>
        {predictions.map((prediction, index) => (
          <li key={index} style={{ textAlign: "left", padding: 8, background: "#f0f0f0", marginBottom: 4, borderRadius: 4, color: "#333" }}>
            {prediction.className} — {(prediction.probability * 100).toFixed(2)}%
          </li>
        ))}
      </ul>
    </main>
  );
}
