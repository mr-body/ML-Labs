const models = [
  {
    name: "Hand Pose Detection",
    route: "/hand",
    category: "Visão computacional",
    description: "Detecta uma ou duas mãos em tempo real, identifica os pontos das articulações e estima quais dedos estão abertos.",
    technology: "MediaPipe Hands · TensorFlow.js",
  },
  {
    name: "BlazeFace",
    route: "/blazeface",
    category: "Visão computacional",
    description: "Deteta rostos através da câmara e desenha caixas delimitadoras. Também pode mostrar pontos faciais como olhos, nariz, boca e orelhas.",
    technology: "BlazeFace · TensorFlow.js",
  },
  {
    name: "COCO-SSD",
    route: "/coco",
    category: "Visão computacional",
    description: "Identifica e localiza objetos comuns numa imagem ou no vídeo da câmara, apresentando o nome e a confiança de cada deteção.",
    technology: "COCO-SSD · TensorFlow.js",
  },
  {
    name: "DeepLab",
    route: "/deeplab",
    category: "Visão computacional",
    description: "Faz segmentação semântica: classifica os pixels da imagem por categoria, permitindo distinguir regiões como pessoas, animais e objetos.",
    technology: "DeepLab · TensorFlow.js",
  },
  {
    name: "Face Mesh",
    route: "/facelandmarks",
    category: "Visão computacional",
    description: "Deteta a malha facial e estima centenas de pontos de referência no rosto, útil para acompanhar olhos, nariz, lábios e contorno facial.",
    technology: "MediaPipe Face Mesh · TensorFlow.js",
  },
  {
    name: "MobileNet",
    route: "/mobilenet",
    category: "Classificação de imagens",
    description: "Classifica uma imagem selecionada e apresenta as categorias mais prováveis, acompanhadas das respetivas pontuações de confiança.",
    technology: "MobileNet · TensorFlow.js",
  },
  {
    name: "Universal Sentence Encoder",
    route: "/sentence-encoder",
    category: "Processamento de linguagem natural",
    description: "Converte frases em vetores numéricos (embeddings) e calcula a similaridade de cosseno para estimar o quanto dois textos são semanticamente próximos.",
    technology: "Universal Sentence Encoder · TensorFlow.js",
  },
  {
    name: "Toxicity Detection",
    route: "/toxicity",
    category: "Processamento de linguagem natural",
    description: "Analisa um texto e estima a probabilidade de categorias de linguagem tóxica, ajudando a sinalizar conteúdo potencialmente ofensivo.",
    technology: "TensorFlow.js · Toxicity Model",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 px-5 py-12 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
            Laboratório de inteligência artificial
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Modelos de Machine Learning
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Explore demonstrações interativas de visão computacional e processamento de linguagem natural.
            Escolha um modelo para abrir a demonstração e experimentar as suas funcionalidades.
          </p>
        </header>

        <section aria-labelledby="models-heading">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="models-heading" className="text-2xl font-semibold">Modelos disponíveis</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {models.length} demonstrações disponíveis
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {models.map((model) => (
              <article
                key={model.route}
                className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-700"
              >
                <div className="mb-4">
                  <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {model.category}
                  </span>
                </div>
                <h3 className="text-xl font-semibold">{model.name}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {model.description}
                </p>
                <p className="mt-5 border-t border-zinc-100 pt-4 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
                  {model.technology}
                </p>
                <a
                  href={model.route}
                  className="mt-5 inline-flex items-center gap-2 self-start rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
                >
                  Abrir demonstração
                  <span aria-hidden="true">→</span>
                </a>
              </article>
            ))}
          </div>
        </section>

        <footer className="mt-12 border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
          As demonstrações são executadas no navegador. Algumas funcionalidades precisam de acesso à câmara
          e da autorização do utilizador.
        </footer>
      </div>
    </main>
  );
}
