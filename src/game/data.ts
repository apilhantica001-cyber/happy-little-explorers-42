export type Item = { id: string; label: string; emoji?: string; bg?: string; say?: string; en?: string };

export const COLORS: Item[] = [
  { id: "vermelho", label: "vermelho", bg: "oklch(0.63 0.24 27)" },
  { id: "azul", label: "azul", bg: "oklch(0.62 0.19 250)" },
  { id: "amarelo", label: "amarelo", bg: "oklch(0.87 0.17 95)" },
  { id: "verde", label: "verde", bg: "oklch(0.72 0.19 145)" },
  { id: "roxo", label: "roxo", bg: "oklch(0.58 0.2 300)" },
  { id: "laranja", label: "laranja", bg: "oklch(0.74 0.19 55)" },
  { id: "rosa", label: "rosa", bg: "oklch(0.78 0.14 350)" },
  { id: "azulclaro", label: "azul-claro", bg: "oklch(0.84 0.1 225)" },
  { id: "marrom", label: "marrom", bg: "oklch(0.48 0.09 55)" },
  { id: "cinza", label: "cinza", bg: "oklch(0.68 0.01 250)" },
  { id: "preto", label: "preto", bg: "oklch(0.2 0 0)" },
  { id: "branco", label: "branco", bg: "oklch(0.99 0 0)" },
];

/** Gradually unlock more colors as rounds pass. */
export const colorPool = (round: number) => COLORS.slice(0, Math.min(COLORS.length, 4 + round * 3));

export const COLOR_EN: Record<string, string> = {
  vermelho: "Red", azul: "Blue", amarelo: "Yellow", verde: "Green", roxo: "Purple", laranja: "Orange",
  rosa: "Pink", azulclaro: "Light blue", marrom: "Brown", cinza: "Gray", preto: "Black", branco: "White",
};

/** Objects that are clearly one color (for "find the blue object"). */
export const COLORED: Record<string, string[]> = {
  vermelho: ["🍎", "🍓", "🚒"],
  azul: ["🐳", "🫐", "🧢"],
  amarelo: ["🍌", "🐤", "🌻"],
  verde: ["🐸", "🥦", "🍀"],
  roxo: ["🍇", "🍆", "🔮"],
  laranja: ["🍊", "🥕", "🎃"],
  rosa: ["🐷", "🌸", "🦩"],
  azulclaro: ["🧊", "💧", "🩵"],
  marrom: ["🐻", "🍫", "🪵"],
  cinza: ["🐘", "🐭", "🪨"],
  preto: ["🎩", "🎱", "🐈‍⬛"],
  branco: ["🥚", "🐑", "🤍"],
};

export const SHAPES: Item[] = [
  { id: "circulo", label: "círculo", emoji: "🔵" },
  { id: "quadrado", label: "quadrado", emoji: "🟥" },
  { id: "triangulo", label: "triângulo", emoji: "🔺" },
  { id: "estrela", label: "estrela", emoji: "⭐" },
  { id: "coracao", label: "coração", emoji: "💚" },
];

export const ANIMALS: Item[] = [
  { id: "cachorro", label: "cachorro", emoji: "🐶", say: "Olha o cachorrinho!" },
  { id: "gato", label: "gato", emoji: "🐱", say: "Olha o gatinho!" },
  { id: "vaca", label: "vaca", emoji: "🐮", say: "Olha a vaquinha!" },
  { id: "pato", label: "pato", emoji: "🦆", say: "Olha o patinho!" },
  { id: "sapo", label: "sapo", emoji: "🐸", say: "Olha o sapinho!" },
  { id: "leao", label: "leão", emoji: "🦁", say: "Olha o leão!" },
  { id: "elefante", label: "elefante", emoji: "🐘", say: "Olha o elefante!" },
  { id: "passarinho", label: "passarinho", emoji: "🐦", say: "Olha o passarinho!" },
  { id: "peixe", label: "peixe", emoji: "🐠", say: "Olha o peixinho!" },
  { id: "ovelha", label: "ovelha", emoji: "🐑", say: "Olha a ovelhinha!" },
  { id: "macaco", label: "macaco", emoji: "🐵", say: "Olha o macaquinho!" },
];

const FEM = new Set([
  "vaca", "ovelha", "bola", "boneca", "banana", "maçã", "uva", "melancia", "laranja", "estrela", "chave",
  "porta", "meia", "xícara", "abelha", "flor", "água", "colher", "lua", "árvore", "nuvem", "chuva", "boca",
  "mão", "orelha",
]);
/** "Cadê o gato?" / "Cadê a bola?" */
export const cade = (label: string) => `Cadê ${FEM.has(label) ? "a" : "o"} ${label}?`;

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

export const TRANSPORT: Item[] = [
  { id: "carro", label: "carro", emoji: "🚗", say: "O carro faz bi bi!", en: "Car" },
  { id: "onibus", label: "ônibus", emoji: "🚌", say: "O ônibus!", en: "Bus" },
  { id: "aviao", label: "avião", emoji: "✈️", say: "O avião voa!", en: "Plane" },
  { id: "barco", label: "barco", emoji: "⛵", say: "O barco!", en: "Boat" },
  { id: "trem", label: "trem", emoji: "🚂", say: "O trem faz piuí!", en: "Train" },
];

export const TOYS: Item[] = [
  { id: "bola", label: "bola", emoji: "⚽", en: "Ball" },
  { id: "boneca", label: "boneca", emoji: "🪆", en: "Doll" },
  { id: "carrinho", label: "carrinho", emoji: "🏎️", en: "Car" },
  { id: "ursinho", label: "ursinho", emoji: "🧸", en: "Teddy" },
  { id: "blocos", label: "blocos", emoji: "🧱", en: "Blocks" },
];

export const EN_ANIMALS: Item[] = [
  { id: "cachorro", label: "Dog", emoji: "🐶", en: "Dog" },
  { id: "gato", label: "Cat", emoji: "🐱", en: "Cat" },
  { id: "vaca", label: "Cow", emoji: "🐮", en: "Cow" },
  { id: "peixe", label: "Fish", emoji: "🐟", en: "Fish" },
  { id: "passarinho", label: "Bird", emoji: "🐦", en: "Bird" },
  { id: "pato", label: "Duck", emoji: "🦆", en: "Duck" },
  { id: "leao", label: "Lion", emoji: "🦁", en: "Lion" },
];

export const EN_OBJECTS: Item[] = [
  { id: "bola", label: "Ball", emoji: "⚽", en: "Ball" },
  { id: "maca", label: "Apple", emoji: "🍎", en: "Apple" },
  { id: "carro", label: "Car", emoji: "🚗", en: "Car" },
  { id: "estrela", label: "Star", emoji: "⭐", en: "Star" },
  { id: "banana", label: "Banana", emoji: "🍌", en: "Banana" },
  { id: "sol", label: "Sun", emoji: "☀️", en: "Sun" },
];

export const EN_NUMBERS = ["One", "Two", "Three"];

export const ENCOURAGE = ["Olha!", "Vamos tentar!", "Quase!", "Olha aqui!"];
export const encourage = () => ENCOURAGE[Math.floor(Math.random() * ENCOURAGE.length)]!;
