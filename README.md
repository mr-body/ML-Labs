# ML-Labs

Laboratório interativo de **Machine Learning executado diretamente no navegador**. O projeto reúne demonstrações de visão computacional e processamento de linguagem natural usando modelos pré-treinados do TensorFlow.js e MediaPipe.

A proposta é transformar modelos de IA em experiências visuais simples de testar: o usuário pode abrir uma rota, fornecer uma imagem, escrever um texto ou autorizar o uso da câmera e observar o resultado em tempo real, sem necessidade de um backend para executar as inferências.

## Demonstrações disponíveis

| Rota | Modelo | O que demonstra | Entrada |
|---|---|---|---|
| `/hand` | MediaPipe Hands + TensorFlow.js | Detecta até duas mãos, os 21 pontos de cada mão e estima quais dedos estão abertos | Câmera |
| `/blazeface` | BlazeFace | Detecta rostos, caixas delimitadoras e pontos faciais básicos | Câmera |
| `/coco` | COCO-SSD | Detecta e classifica objetos comuns, exibindo classe e confiança | Câmera |
| `/deeplab` | DeepLab | Faz segmentação semântica, classificando regiões da imagem por categoria | Imagem |
| `/facelandmarks` | MediaPipe Face Mesh | Detecta a malha facial e centenas de pontos de referência do rosto | Câmera |
| `/mobilenet` | MobileNet | Classifica uma imagem e mostra as categorias mais prováveis | Imagem |
| `/sentence-encoder` | Universal Sentence Encoder | Gera embeddings de duas frases e calcula sua similaridade de cosseno | Texto |
| `/toxicity` | Toxicity Model | Estima probabilidades de categorias de linguagem potencialmente tóxica | Texto |

Na página inicial (`/`), as demonstrações são apresentadas em cards com descrição, tecnologia utilizada e link para cada experimento.

## Principais objetivos

- Explorar modelos de Machine Learning no frontend.
- Demonstrar inferência em tempo real com câmera e canvas.
- Comparar diferentes tarefas de visão computacional.
- Trabalhar com embeddings e classificação de texto.
- Manter a lógica dos modelos reutilizável e separada da interface.
- Servir como base para novos experimentos com TensorFlow.js.

## Stack utilizada

- **Next.js 16** com App Router.
- **React 19** e TypeScript.
- **TensorFlow.js 4** para execução dos modelos no cliente.
- **TensorFlow.js WebGL backend** para acelerar as operações usando a GPU quando disponível.
- **MediaPipe Hands** e **MediaPipe Face Mesh** para rastreamento de mãos e pontos faciais.
- **Tailwind CSS 4** e estilos inline nas páginas demonstrativas.
- **ESLint** para análise estática do código.

Os modelos são carregados sob demanda no navegador. A aplicação não possui API própria nem banco de dados: imagens, textos e frames da câmera são processados localmente pelo dispositivo do usuário.

## Arquitetura

O projeto usa o App Router do Next.js e separa cada responsabilidade em uma camada:

```text
src/
├── app/
│   ├── page.tsx                 # Página inicial com o catálogo
│   ├── layout.tsx               # Layout global e metadados
│   ├── blazeface/page.tsx       # Demonstração de detecção facial
│   ├── coco/page.tsx            # Detecção de objetos
│   ├── deeplab/page.tsx         # Segmentação semântica
│   ├── facelandmarks/page.tsx   # Malha facial
│   ├── hand/page.tsx            # Rastreamento de mãos
│   ├── mobilenet/page.tsx       # Classificação de imagens
│   ├── sentence-encoder/page.tsx # Embeddings de frases
│   └── toxicity/page.tsx        # Classificação de toxicidade
├── hooks/
│   ├── useBlazeFaceDetection.ts
│   ├── useCocoSsdDetection.ts
│   ├── useDeepLabSegmentation.ts
│   ├── useFaceMeshDetection.ts
│   ├── useHandPoseDetection.ts
│   ├── useMobileNetClassification.ts
│   ├── useSentenceEncoder.ts
│   ├── useToxicityDetection.ts
│   └── handPose.utils.ts        # Geometria, suavização e desenho de mãos
└── stubs/
    ├── mediapipe-face-mesh.ts
    └── mediapipe-hands.ts
```

## Uso do Hook Pattern

O projeto utiliza o **Hook Pattern** para encapsular a integração com cada modelo de Machine Learning em hooks customizados. Dessa forma, a página fica responsável principalmente pela apresentação e interação com o usuário, enquanto o hook concentra o estado e os efeitos colaterais da inferência.

Por exemplo, a página de mãos usa:

```tsx
const { status, lines, hands } = useHandPoseDetection({
  videoRef,
  canvasRef,
});
```

O componente não precisa conhecer os detalhes de:

- inicialização do backend WebGL;
- carregamento do modelo;
- solicitação de acesso à câmera;
- criação do detector;
- execução do loop de frames;
- filtragem por confiança;
- suavização dos pontos;
- desenho no canvas;
- limpeza da câmera e do detector.

Essas responsabilidades ficam no hook, que expõe uma API declarativa para a interface.

### O que os hooks encapsulam

Cada hook segue uma estrutura semelhante:

1. **Estado da interface** com `useState`, como `status`, `loading`, `predictions`, `faces` ou `results`.
2. **Referências persistentes** com `useRef`, usadas para armazenar modelos, detectores, streams, opções e identificadores de requisições sem provocar renders desnecessários.
3. **Inicialização assíncrona** dentro de `useEffect`, incluindo `tf.setBackend("webgl")`, `tf.ready()` e o carregamento do modelo.
4. **Funções de domínio** com `useCallback`, como `classify`, `checkText`, `segmentImage` e `encodeAndCompare`.
5. **Cancelamento e cleanup**, interrompendo `requestAnimationFrame`, parando tracks da câmera e liberando detectores/modelos quando o componente é desmontado.
6. **Resultado pronto para a UI**, com tipos TypeScript e mensagens de status em português.

### Hooks de câmera e tempo real

`useHandPoseDetection`, `useBlazeFaceDetection`, `useCocoSsdDetection` e `useFaceMeshDetection` recebem referências para um elemento `<video>` e um `<canvas>`. O fluxo é:

```text
câmera → vídeo oculto → modelo TensorFlow.js → previsões → canvas + estado React
```

O `video` fornece os frames ao modelo. O `canvas` funciona como camada visual para desenhar o vídeo e as marcações, enquanto o estado retornado pelo hook permite mostrar informações textuais na interface.

As opções podem controlar aspectos como:

- ativar ou desativar a detecção;
- número máximo de rostos, mãos ou objetos;
- score mínimo de confiança;
- espelhamento para modo selfie;
- desenho automático no canvas;
- tipo de modelo utilizado;
- suavização dos pontos.

### Processamento de imagens e texto

Os hooks `useMobileNetClassification` e `useDeepLabSegmentation` trabalham com imagens selecionadas pelo usuário. O arquivo é exibido no navegador e enviado diretamente ao modelo, sem upload para um servidor.

Já `useSentenceEncoder` converte frases em vetores numéricos (*embeddings*) e calcula:

```text
similaridade = produto escalar / (norma do vetor A × norma do vetor B)
```

O hook `useToxicityDetection` classifica o texto usando um threshold de `0.9` e retorna, para cada categoria, o rótulo, o resultado booleano e a probabilidade estimada.

## Detalhes dos experimentos

### Detecção de mãos

O experimento de `/hand` usa `MediaPipeHands` com runtime `tfjs`. Além dos pontos 2D e 3D, o projeto possui uma camada própria de interpretação:

- calcula ângulos entre articulações;
- mede distâncias entre landmarks;
- estima se cada dedo está aberto;
- aplica suavização exponencial entre frames;
- usa histerese para reduzir oscilações entre aberto e fechado;
- corrige a lateralidade para o modo selfie;
- desenha palma, dedos, articulações e quantidade de dedos abertos.

Essa lógica foi isolada em `handPose.utils.ts` para não misturar cálculos geométricos e desenho com o ciclo de vida do React.

### Rostos e pontos faciais

O BlazeFace retorna caixas delimitadoras, confiança e landmarks básicos — olhos, nariz, boca e orelhas. O Face Mesh retorna uma malha facial mais detalhada, adequada para acompanhar o contorno do rosto e regiões como olhos e lábios.

### Detecção e segmentação

O COCO-SSD identifica objetos de classes conhecidas e desenha uma caixa com o nome e a confiança da detecção. O DeepLab executa segmentação semântica em imagens e gera uma máscara colorida com uma legenda das categorias encontradas.

### Classificação, embeddings e toxicidade

- **MobileNet** retorna as categorias mais prováveis para uma imagem.
- **Universal Sentence Encoder** permite comparar o significado aproximado de duas frases por meio de embeddings.
- **Toxicity Model** sinaliza categorias de linguagem potencialmente ofensiva conforme a probabilidade calculada pelo modelo.

Esses resultados são demonstrações educacionais e não devem ser tratados como decisões definitivas ou avaliações profissionais.

## Como executar localmente

### Pré-requisitos

- Node.js compatível com o projeto.
- npm.
- Navegador moderno com suporte a WebGL.
- Câmera e permissão do usuário para as demonstrações em tempo real.

### Instalação

```bash
git clone https://github.com/mr-body/ML-Labs.git
cd ML-Labs
npm install
```

### Desenvolvimento

```bash
npm run dev
```

Depois, abra [http://localhost:3000](http://localhost:3000).

### Build de produção

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

## Permissões e privacidade

- As demonstrações que usam câmera solicitam permissão por meio de `navigator.mediaDevices.getUserMedia`.
- O vídeo é utilizado localmente para alimentar o modelo e desenhar o resultado.
- Os textos e imagens também são processados no navegador.
- A aplicação não envia esses dados para uma API própria.
- O acesso à câmera normalmente exige `localhost` ou HTTPS.
- O desempenho depende do navegador, da GPU, da memória disponível e do tamanho da entrada.

## Como adicionar um novo experimento

1. Instale o pacote do modelo TensorFlow.js necessário.
2. Crie um hook em `src/hooks/` para encapsular carregamento, estado, inferência e cleanup.
3. Exponha tipos e funções com uma API simples para a página.
4. Crie uma rota em `src/app/<nome>/page.tsx`.
5. Se o experimento usar câmera, utilize `videoRef` e `canvasRef` e interrompa o stream no cleanup.
6. Adicione a demonstração ao catálogo em `src/app/page.tsx`.
7. Execute o lint e valide a experiência no navegador.

Uma boa regra de separação é:

```text
hook       = modelo, estado, efeitos colaterais e transformação dos dados
página     = inputs, layout, mensagens e apresentação do resultado
utils      = cálculos puros e funções reutilizáveis
```

## Limitações conhecidas

- Os modelos podem demorar para carregar na primeira execução.
- Inferência em tempo real pode consumir bastante CPU/GPU.
- A qualidade das previsões depende da iluminação, enquadramento e qualidade da imagem.
- A classificação de toxicidade pode gerar falsos positivos ou falsos negativos.
- A classificação de imagens e a similaridade textual representam probabilidades ou aproximações do modelo, não interpretações humanas perfeitas.
- A disponibilidade do WebGL e o suporte do navegador influenciam diretamente o desempenho.

## Referências

- [TensorFlow.js](https://www.tensorflow.org/js)
- [TensorFlow.js Models](https://github.com/tensorflow/tfjs-models)
- [MediaPipe](https://developers.google.com/mediapipe)
- [Next.js](https://nextjs.org/)

## Licença

Este repositório é um laboratório de estudos e experimentos. Consulte as licenças dos modelos e dependências utilizados antes de redistribuir ou utilizar qualquer demonstração em um produto.
