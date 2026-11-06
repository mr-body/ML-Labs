// Stub do @mediapipe/hands: usamos só o runtime "tfjs" do hand-pose-detection,
// então o pacote real nunca é chamado. Isso evita o erro de build do Turbopack
// ("Export Hands doesn't exist in target module").
export class Hands {}
