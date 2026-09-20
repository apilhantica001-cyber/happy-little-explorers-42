export type Item = { id: string; label: string; emoji?: string; bg?: string; say?: string };

export const COLORS: Item[] = [
  { id: "vermelho", label: "vermelho", bg: "oklch(0.63 0.24 27)" },
  { id: "azul", label: "azul", bg: "oklch(0.62 0.19 250)" },
  { id: "amarelo", label: "amarelo", bg: "oklch(0.87 0.17 95)" },
  { id: "verde", label: "verde", bg: "oklch(0.72 0.19 145)" },
  { id: "roxo", label: "roxo", bg: "oklch(0.58 0.2 300)" },
  { id: "laranja", label: "laranja", bg: "oklch(0.74 0.19 55)" },
];

export const SHAPES: Item[] = [
  { id: "circulo", label: "círculo", emoji: "🔵" },
  { id: "quadrado", label: "quadrado", emoji: "🟥" },
  { id: "triangulo", label: "triângulo", emoji: "🔺" },
  { id: "estrela", label: "estrela", emoji: "⭐" },
  { id: "coracao", label: "coração", emoji: "💚" },
];

export const ANIMALS: Item[] = [
  { id: "cachorro", label: "cachorro", emoji: "🐶", say: "O cachorro faz au au!" },
  { id: "gato", label: "gato", emoji: "🐱", say: "O gato faz miau!" },
  { id: "vaca", label: "vaca", emoji: "🐮", say: "A vaca faz muu!" },
  { id: "pato", label: "pato", emoji: "🦆", say: "O pato faz quá quá!" },
  { id: "leao", label: "leão", emoji: "🦁", say: "O leão faz rááá!" },
  { id: "elefante", label: "elefante", emoji: "🐘", say: "O elefante faz tuuu!" },
  { id: "passarinho", label: "passarinho", emoji: "🐦", say: "O passarinho faz piu piu!" },
  { id: "peixe", label: "peixe", emoji: "🐠", say: "O peixinho faz blub blub!" },
  { id: "ovelha", label: "ovelha", emoji: "🐑", say: "A ovelha faz béé!" },
];

export const FRUITS: Item[] = [
  { id: "banana", label: "banana", emoji: "🍌" },
  { id: "maca", label: "maçã", emoji: "🍎" },
  { id: "uva", label: "uva", emoji: "🍇" },
  { id: "melancia", label: "melancia", emoji: "🍉" },
  { id: "morango", label: "morango", emoji: "🍓" },
  { id: "laranja", label: "laranja", emoji: "🍊" },
];

export const INSTRUMENTS: { item: Item; notes: number[] }[] = [
  { item: { id: "tambor", label: "tambor", emoji: "🥁" }, notes: [110, 90] },
  { item: { id: "piano", label: "piano", emoji: "🎹" }, notes: [523, 659] },
  { item: { id: "violao", label: "violão", emoji: "🎸" }, notes: [330, 392, 494] },
  { item: { id: "trompete", label: "trompete", emoji: "🎺" }, notes: [440, 587] },
  { item: { id: "sino", label: "sininho", emoji: "🔔" }, notes: [988, 1318] },
  { item: { id: "chocalho", label: "chocalho", emoji: "🪇" }, notes: [880, 1046, 880] },
];

export const PAIRS: { a: Item; b: Item }[] = [
  { a: { id: "chave", label: "chave", emoji: "🔑" }, b: { id: "porta", label: "porta", emoji: "🚪" } },
  { a: { id: "sapato", label: "sapato", emoji: "👟" }, b: { id: "meia", label: "meia", emoji: "🧦" } },
  { a: { id: "xicara", label: "xícara", emoji: "☕" }, b: { id: "bule", label: "bule", emoji: "🫖" } },
  { a: { id: "abelha", label: "abelha", emoji: "🐝" }, b: { id: "flor", label: "flor", emoji: "🌻" } },
  { a: { id: "peixe", label: "peixe", emoji: "🐠" }, b: { id: "agua", label: "água", emoji: "🌊" } },
  { a: { id: "colher", label: "colher", emoji: "🥄" }, b: { id: "prato", label: "prato", emoji: "🍽️" } },
];

export const NATURE: Item[] = [
  { id: "sol", label: "sol", emoji: "☀️" },
  { id: "lua", label: "lua", emoji: "🌙" },
  { id: "arvore", label: "árvore", emoji: "🌳" },
  { id: "flor", label: "flor", emoji: "🌷" },
  { id: "nuvem", label: "nuvem", emoji: "☁️" },
  { id: "arcoiris", label: "arco-íris", emoji: "🌈" },
  { id: "chuva", label: "chuva", emoji: "🌧️" },
  { id: "estrela", label: "estrela", emoji: "⭐" },
];

export const OBJECTS: Item[] = [
  { id: "bola", label: "bola", emoji: "⚽" },
  { id: "carro", label: "carrinho", emoji: "🚗" },
  { id: "ursinho", label: "ursinho", emoji: "🧸" },
  { id: "balao", label: "balão", emoji: "🎈" },
  { id: "livro", label: "livrinho", emoji: "📖" },
  { id: "trem", label: "trenzinho", emoji: "🚂" },
  { id: "copo", label: "copo", emoji: "🥤" },
  { id: "colher", label: "colher", emoji: "🥄" },
];

export const BODY: Item[] = [
  { id: "olhos", label: "olhos", emoji: "👀", say: "Os olhinhos!" },
  { id: "nariz", label: "nariz", emoji: "👃", say: "O narizinho!" },
  { id: "boca", label: "boca", emoji: "👄", say: "A boquinha!" },
  { id: "mao", label: "mão", emoji: "✋", say: "A mãozinha!" },
  { id: "pe", label: "pé", emoji: "🦶", say: "O pezinho!" },
  { id: "orelha", label: "orelha", emoji: "👂", say: "A orelhinha!" },
];

export const PRAISE = ["Muito bem!", "Isso mesmo!", "Boa!", "Uau!", "Oba!", "Uhuu!"];
export const praise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)]!;
