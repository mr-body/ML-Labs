// Tipos, constantes, geometria e desenho usados por useHandPoseDetection.
// Nada aqui depende de React.

export type Point = number[]; // [x, y, z]
export type Side = "Left" | "Right";

// Índices: 0 = pulso | 1-4 polegar | 5-8 indicador | 9-12 médio | 13-16 anelar | 17-20 mindinho
export const FINGERS = {
  thumb: { name: "Polegar", joints: [1, 2, 3, 4], color: "#FF5252" },
  index: { name: "Indicador", joints: [5, 6, 7, 8], color: "#FFD740" },
  middle: { name: "Médio", joints: [9, 10, 11, 12], color: "#69F0AE" },
  ring: { name: "Anelar", joints: [13, 14, 15, 16], color: "#40C4FF" },
  pinky: { name: "Mindinho", joints: [17, 18, 19, 20], color: "#E040FB" },
} as const;

export type FingerKey = keyof typeof FINGERS;
export type FingerStates = Record<FingerKey, boolean>;

export const SIDE_STYLE: Record<Side, { label: string; color: string }> = {
  Left: { label: "Esquerda", color: "#2979FF" },
  Right: { label: "Direita", color: "#FF9100" },
};

const PALM_CONNECTIONS: [number, number][] = [
  [0, 1],
  [0, 5],
  [0, 17],
  [5, 9],
  [9, 13],
  [13, 17],
];

/** Dados de uma mão detectada, devolvidos pelo hook. */
export type HandData = {
  /** Mão do usuário (já corrigida por `swapHandedness`). */
  side: Side;
  /** "Esquerda" | "Direita". */
  label: string;
  /** Confiança do modelo (0–1). */
  score: number;
  /**
   * 21 pontos em pixels do canvas, já suavizados e espelhados (se `mirror`).
   * Prontos para desenhar por cima do canvas.
   */
  keypoints: Point[];
  /** 21 pontos 3D em metros, relativos à mão (suavizados). */
  keypoints3D: Point[];
  /** Estado aberto/fechado de cada dedo. */
  fingers: FingerStates;
  /** Chaves dos dedos abertos, ex.: ["thumb", "index"]. */
  openFingers: FingerKey[];
  openCount: number;
};

// ---------- geometria (3D) ----------
export const dist = (a: Point, b: Point) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], (a[2] ?? 0) - (b[2] ?? 0));

/** Ângulo (graus) no ponto b formado por a-b-c. */
export const angleAt = (a: Point, b: Point, c: Point) => {
  const v1 = [a[0] - b[0], a[1] - b[1], (a[2] ?? 0) - (b[2] ?? 0)];
  const v2 = [c[0] - b[0], c[1] - b[1], (c[2] ?? 0) - (b[2] ?? 0)];
  const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
  const m1 = Math.hypot(v1[0], v1[1], v1[2]);
  const m2 = Math.hypot(v2[0], v2[1], v2[2]);
  if (m1 === 0 || m2 === 0) return 0;
  return (Math.acos(Math.min(1, Math.max(-1, dot / (m1 * m2)))) * 180) / Math.PI;
};

// Histerese: abre acima de openTh, fecha abaixo de closeTh, no meio mantém o anterior
const decide = (
  ext: number,
  openTh: number,
  closeTh: number,
  extra: boolean,
  prev?: boolean
) => {
  if (!extra || ext < closeTh) return false;
  if (ext > openTh) return true;
  return prev ?? false;
};

/** Estado dos dedos a partir dos landmarks 3D (independe de rotação/distância). */
export const getFingerStates = (lm: Point[], prev?: FingerStates): FingerStates => {
  const wrist = lm[0];

  const thumbExt = (angleAt(lm[1], lm[2], lm[3]) + angleAt(lm[2], lm[3], lm[4])) / 2;
  const thumbAway = dist(lm[4], lm[17]) > dist(lm[3], lm[17]) * 1.05;

  const finger = (mcp: number, pip: number, dip: number, tip: number, p?: boolean) => {
    const ext = (angleAt(lm[mcp], lm[pip], lm[dip]) + angleAt(lm[pip], lm[dip], lm[tip])) / 2;
    const farther = dist(lm[tip], wrist) > dist(lm[pip], wrist);
    return decide(ext, 155, 140, farther, p);
  };

  return {
    thumb: decide(thumbExt, 150, 135, thumbAway, prev?.thumb),
    index: finger(5, 6, 7, 8, prev?.index),
    middle: finger(9, 10, 11, 12, prev?.middle),
    ring: finger(13, 14, 15, 16, prev?.ring),
    pinky: finger(17, 18, 19, 20, prev?.pinky),
  };
};

/** Suavização exponencial entre frames. smoothing: 0 = muito suave, 1 = sem suavização. */
export const ema = (prev: Point[] | undefined, cur: Point[], smoothing: number): Point[] => {
  if (!prev || prev.length !== cur.length) return cur.map((p) => [...p]);
  return cur.map((p, i) => [
    prev[i][0] + smoothing * (p[0] - prev[i][0]),
    prev[i][1] + smoothing * (p[1] - prev[i][1]),
    (prev[i][2] ?? 0) + smoothing * ((p[2] ?? 0) - (prev[i][2] ?? 0)),
  ]);
};

/** Texto descritivo de uma mão, ex.: "Direita: 2 (Polegar, Indicador)". */
export const describeHand = (hand: HandData) =>
  `${hand.label}: ${hand.openCount}${hand.openCount ? " (" + hand.openFingers.map((k) => FINGERS[k].name).join(", ") + ")" : ""
  }`;

// ---------- desenho ----------
/** Desenha a mão no canvas. Usa `hand.keypoints` (já em coordenadas do canvas). */
export const drawHand = (
  ctx: CanvasRenderingContext2D,
  hand: HandData,
  canvasWidth: number,
  canvasHeight: number
) => {
  const lm = hand.keypoints;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Palma
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  PALM_CONNECTIONS.forEach(([a, b]) => {
    ctx.beginPath();
    ctx.moveTo(lm[a][0], lm[a][1]);
    ctx.lineTo(lm[b][0], lm[b][1]);
    ctx.stroke();
  });

  // Dedos (mais grossos quando abertos)
  (Object.keys(FINGERS) as FingerKey[]).forEach((key) => {
    const { joints, color } = FINGERS[key];
    const chain = [0, ...joints];
    ctx.strokeStyle = color;
    ctx.lineWidth = hand.fingers[key] ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(lm[chain[0]][0], lm[chain[0]][1]);
    for (let i = 1; i < chain.length; i++) {
      ctx.lineTo(lm[chain[i]][0], lm[chain[i]][1]);
    }
    ctx.stroke();

    joints.forEach((idx, i) => {
      const isTip = i === joints.length - 1;
      ctx.fillStyle = isTip ? "#FFFFFF" : color;
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(lm[idx][0], lm[idx][1], isTip ? 5 : 3.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    });
  });

  // Pulso
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(lm[0][0], lm[0][1], 6, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();

  // Etiqueta junto ao pulso
  const text = `${hand.label} • ${hand.openCount}`;
  ctx.font = "bold 14px Arial, sans-serif";
  const w = ctx.measureText(text).width + 14;
  const x = Math.min(Math.max(lm[0][0] - w / 2, 4), canvasWidth - w - 4);
  const y = Math.min(lm[0][1] + 14, canvasHeight - 28);
  ctx.fillStyle = SIDE_STYLE[hand.side].color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, 22, 6);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 7, y + 11);
};
