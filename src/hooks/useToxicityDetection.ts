"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import "@tensorflow/tfjs-converter";
import * as toxicity from "@tensorflow-models/toxicity";

export type ToxicityPrediction = {
  label: string;
  match: boolean;
  probability: number;
};

export function useToxicityDetection(threshold = 0.9) {
  const modelRef = useRef<toxicity.ToxicityClassifier | null>(null);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState("Carregando modelo de toxicidade...");
  const [results, setResults] = useState<ToxicityPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    async function loadModel() {
      try {
        await tf.setBackend("webgl");
        await tf.ready();
        const model = await toxicity.load(threshold, []);
        if (cancelled) return;
        modelRef.current = model;
        setStatus("Modelo carregado. Pronto para verificar!");
      } catch (error) {
        console.error("Erro ao carregar modelo de toxicidade:", error);
        if (!cancelled) setStatus("Erro ao carregar o modelo.");
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
  }, [threshold]);

  const checkText = useCallback(async (text: string) => {
    if (!text.trim()) {
      setStatus("Por favor, digite um texto para verificar.");
      return;
    }
    const model = modelRef.current;
    if (!model) {
      setStatus("O modelo ainda está carregando. Aguarde um instante.");
      return;
    }
    setAnalyzing(true);
    setStatus("Analisando texto...");
    try {
      const predictions = await model.classify([text]);
      const formatted = predictions.map((prediction) => ({
        label: prediction.label,
        match: prediction.results[0].match ?? false,
        probability: prediction.results[0].probabilities[1] ?? 0,
      }));
      if (!mountedRef.current) return;
      setResults(formatted);
      setStatus("Análise concluída.");
    } catch (error) {
      console.error("Erro na verificação:", error);
      if (mountedRef.current) setStatus("Erro ao processar a verificação.");
    } finally {
      if (mountedRef.current) setAnalyzing(false);
    }
  }, []);

  return { status, results, loading, analyzing, checkText, ready: !!modelRef.current };
}
