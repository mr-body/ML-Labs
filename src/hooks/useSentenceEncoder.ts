"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import "@tensorflow/tfjs-converter";
import * as use from "@tensorflow-models/universal-sentence-encoder";

export function useSentenceEncoder() {
  const modelRef = useRef<use.UniversalSentenceEncoder | null>(null);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState("Carregando modelo...");
  const [loading, setLoading] = useState(true);
  const [output, setOutput] = useState("");

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    async function loadModel() {
      try {
        await tf.setBackend("webgl");
        await tf.ready();
        const model = await use.load();
        if (cancelled) return;
        modelRef.current = model;
        setStatus("Modelo carregado!");
        setOutput("Modelo carregado com sucesso.");
      } catch (error) {
        console.error("Erro ao carregar modelo USE:", error);
        if (!cancelled) {
          setStatus("Erro ao carregar o modelo.");
          setOutput("Não foi possível carregar o modelo.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadModel();
    return () => {
      cancelled = true;
      mountedRef.current = false;
      modelRef.current = null;
    };
  }, []);

  const encodeAndCompare = useCallback(async (sentence1: string, sentence2: string) => {
    if (!sentence1.trim() || !sentence2.trim()) {
      setOutput("Por favor, preencha as duas sentenças.");
      return null;
    }
    const model = modelRef.current;
    if (!model) {
      setOutput("O modelo ainda não terminou de carregar.");
      return null;
    }
    setStatus("Processando sentenças...");
    setOutput("Calculando embeddings...");
    try {
      const embeddings = await model.embed([sentence1, sentence2]);
      try {
        const vectors = await embeddings.array() as number[][];
        const preview1 = vectors[0].slice(0, 5).map((n) => n.toFixed(4)).join(", ");
        const preview2 = vectors[1].slice(0, 5).map((n) => n.toFixed(4)).join(", ");
        const a = vectors[0];
        const b = vectors[1];
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < a.length; i++) {
          dot += a[i] * b[i];
          normA += a[i] * a[i];
          normB += b[i] * b[i];
        }
        const similarity = normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
        if (!mountedRef.current) return null;
        setOutput(
          `Sentença 1 (primeiros 5 valores): ${preview1}...\n\n` +
          `Sentença 2 (primeiros 5 valores): ${preview2}...`
        );
        setStatus("Comparação concluída.");
        return similarity;
      } finally {
        embeddings.dispose();
      }
    } catch (error) {
      console.error("Erro na codificação:", error);
      if (mountedRef.current) {
        setStatus("Erro ao processar as sentenças.");
        setOutput("Não foi possível calcular os embeddings.");
      }
      return null;
    }
  }, []);

  return { status, loading, output, setOutput, encodeAndCompare, ready: !!modelRef.current };
}
