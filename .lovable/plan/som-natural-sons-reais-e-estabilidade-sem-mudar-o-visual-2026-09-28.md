# Som natural, sons reais e estabilidade (sem mudar o visual)

## 1. Voz da narradora (a maior mudança)
- Gerar **uma única vez** todas as falas com uma voz feminina natural, carinhosa, em português do Brasil, e guardar os arquivos no próprio jogo. Depois disso, não depende de nenhum serviço pago.
- Palavras em inglês geradas com voz de inglês nativo ("Red!", "Dog!", "Ball!", "One, Two, Three").
- Cada frase ganha 2–3 versões com entonação diferente ("Muito bem!", "Isso!", "Oba!", "Você conseguiu!", "Olha!", "Cadê?", "Achou!", "Vamos tentar?", nomes de cores, animais, frutas, objetos, números).
- A voz do navegador só entra se faltar alguma gravação.
- Qualquer arquivo pode ser trocado depois por uma gravação humana real, sem mexer no jogo.

## 2. Sons reais dos animais
- Completar com sons reais de licença livre (CC0/domínio público): leão, elefante, macaco, porco, cavalo, galinha, além dos que já existem.
- Peixe: som de bolhinhas de água, sem inventar som falso.
- Volume nivelado: nenhum rugido ou latido alto demais.

## 3. Efeitos por ação
- Bolha (com pequenas variações), balão, pegar, encaixar, caixa abrindo, descoberta/brilho, estrela, sucesso curto, toque neutro suave para opção errada, virar carta na memória, transição.
- Objetos do dia a dia com som que faz sentido: carro, trem, chuva, água, campainha, porta, telefone.

## 4. Controle do áudio
- Uma fala por vez (falas importantes não são interrompidas por toques).
- Cada som tem intervalo mínimo; 10 toques no cachorro = 1 latido.
- Controles dos pais mantidos: Voz 100%, Efeitos 70%, Música 20%, Silenciar tudo.
- Música de fundo continua opcional e baixinha.

## 5. Toques repetidos — sistema único para todas as brincadeiras
- Fluxo central: pronto → brincando → acerto → comemoração → transição → pronto.
- O acerto é registrado uma vez só; toques durante comemoração e troca de fase são ignorados; a nova fase só aceita toque quando está totalmente pronta.
- Vale para tocar, arrastar, deslizar, encaixar, memória, bolhas e balões.
- Nunca repetir a mesma brincadeira duas vezes seguidas.

## 6. Preparação para Play Store
- Arquivo de créditos com nome, fonte, autor, licença, link e se precisa de atribuição para cada som.
- Nome, ícone e versão do jogo organizados; sem login, sem anúncios, sem dados da criança.

## 7. Testes
- Toques rápidos em cada brincadeira, confirmando que nenhuma fase é pulada; sons sem sobreposição; volume; som desligado; celular e tablet, deitado e em pé.

## Detalhes técnicos
- Pastas `public/audio/{pt,en,animals,effects,environment}`; `voice-manifest.json` mapeia frase → lista de variações.
- Geração de voz via Lovable AI (TTS), script único; custa créditos de IA uma vez.
- Máquina de estados de fase em `routes/index.tsx` + `useLock` compartilhado exposto às atividades via contexto.
- `AUDIO_CREDITS.md` na raiz.
