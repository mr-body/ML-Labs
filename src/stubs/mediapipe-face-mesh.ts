// Stub do @mediapipe/face_mesh: usamos só o runtime "tfjs" do
// face-landmarks-detection, então o pacote real nunca é chamado. Isso evita o erro
// de build do Turbopack ("Export FaceMesh doesn't exist in target module").
export class FaceMesh {}
