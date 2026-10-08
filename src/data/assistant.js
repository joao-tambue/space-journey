import { FAULTS, PHASES, SITES, SYSTEMS } from './catalog'

const PROJECT = `
Projecto: "Missão Origem" (CAF) — demonstração web interactiva de uma viagem Terra–Marte.
Tese: se a energia da nave falhar, a sonda autónoma "Origem" decide.

Stack: React 19 + Vite, estado global com Zustand (src/store/missionStore.js),
cena 3D com three.js via @react-three/fiber e drei (src/components/SpaceScene.jsx),
gráficos com Recharts (EnergyChart), animações com framer-motion, ícones lucide-react.
Assistente: Google Gemini através de um proxy do Vite (a chave nunca vai ao browser).

Motor da missão (tick a cada 280 ms, dt = 0.35 × velocidade ×1/×2/×4):
- Geração solar base 46 kW (52 em superfície) × eficiência solar. Consumo = soma dos sistemas ligados.
- Energia += ((solar − consumo) × 0.045 − fuga × 0.15) × dt.
- Com tudo ligado o consumo é 71 kW > 46, por isso a energia cai. Só os essenciais somam 40 kW,
  logo cortar carga é o que permite à nave recuperar.
- Progresso avança enquanto a propulsão está ligada e a energia > 2%; empuxo = 0.55 + 0.45 × energia.
  Em modo sobrevivência o avanço é ×0.8. A viagem dura ~2 min a ×1.
- Energia < 55%: a sonda activa-se (análise). < 40%: modo económico (desliga não essenciais excepto comms).
  < 22%: modo sobrevivência (só essenciais). Reserva > 70% sem falhas recuperáveis: religa a ligação Terra.
- Falhas de software são corrigidas pela sonda após ~6 s de simulação; falhas de energia após ~4 s
  (isolando carga). Falhas de hardware ("além da sonda") geram alertas à tripulação e à Terra (DSN).
- Falhas guionadas por progresso: 28% painéis solares, 44% sobrecarga do barramento,
  62% overflow de telemetria, 76% fuga de refrigeração. 88% aproximação, 100% aterragem.
- Na superfície: rover e exploração de locais com amostras.

Cena 3D: Sol ao centro, órbitas da Terra (1 UA) e de Marte (1.52 UA) à escala,
transferência de Hohmann com o Sol no foco e posição resolvida pela equação de Kepler
(a nave abranda perto do afélio). Transferência de 259 dias; a Terra varre ~255° e Marte ~136°,
Marte parte ~44° à frente. HUD com dia/distância (≈225 M km) e botão "Seguir nave".
`

const fmt = (list, map) => list.map(map).join('\n')

const CATALOG = `
Fases: ${PHASES.map((p) => p.label).join(' → ')}

Sistemas da nave (consumo em kW):
${fmt(SYSTEMS, (s) => `- ${s.name} (${s.draw} kW, ${s.essential ? 'essencial' : 'não essencial'}): ${s.role}`)}

Anomalias:
${fmt(
  Object.values(FAULTS),
  (f) => `- ${f.title} [${f.domain}${f.beyond ? ', além da sonda' : ''}]: ${f.analysis} Correcção: ${f.patch}`,
)}

Locais de exploração em Marte:
${fmt(SITES, (s) => `- ${s.name}: ${s.blurb}`)}
`

const MODE = {
  standby: 'espera',
  analyze: 'análise',
  eco: 'económico',
  survival: 'sobrevivência',
  limit: 'limite da sonda',
  explore: 'exploração',
}

export function liveSnapshot(s) {
  if (s.phase === 'briefing') return 'Estado actual: missão ainda não iniciada (ecrã de briefing).'
  const phase = PHASES.find((p) => p.id === s.phase)?.label ?? s.phase
  const off = s.systems.filter((x) => !x.on).map((x) => x.name)
  const open = s.faults.filter((f) => !f.resolved).map((f) => f.title)
  const fixed = s.faults.filter((f) => f.resolved).map((f) => f.title)
  return [
    'Estado actual da missão (ao vivo):',
    `- Fase: ${phase}; progresso ${s.progress.toFixed(0)}%; energia ${s.energy.toFixed(0)}%`,
    `- Sonda: ${s.probe.active ? 'activa' : 'passiva'}, modo ${MODE[s.probe.mode] ?? s.probe.mode}. Última acção: ${s.probe.lastAction}`,
    `- Velocidade ×${s.speed}${s.paused ? ' (em pausa)' : ''}; fuga residual ${s.leak.toFixed(2)}; eficiência solar ${(s.solarEfficiency * 100).toFixed(0)}%`,
    `- Sistemas desligados: ${off.length ? off.join(', ') : 'nenhum'}`,
    `- Anomalias abertas: ${open.length ? open.join(', ') : 'nenhuma'}; resolvidas: ${fixed.length ? fixed.join(', ') : 'nenhuma'}`,
    s.surface.landed ? `- Em Marte. Rover ${s.surface.rover ? 'libertado' : 'a bordo'}; amostras: ${s.surface.samples.length}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function systemPrompt(state) {
  return `És o "Origem", o assistente de bordo da demonstração Missão Origem.
Respondes em português europeu, com tom calmo, técnico e conciso (normalmente 2–6 frases ou uma lista curta).
Responde a perguntas sobre a missão, a sonda, a energia, a cena 3D, o código e a arquitectura do projecto,
e sobre astronáutica e Marte em geral. Usa os dados abaixo como fonte de verdade; quando algo não estiver lá,
diz que é uma inferência. Se a pergunta for sobre o estado actual, usa o bloco "ao vivo".
Podes usar **negrito**, listas com "-", \`código\` e blocos \`\`\`. Não inventes ficheiros ou funcionalidades;
se mostrares código que não esteja descrito abaixo, diz que é ilustrativo.
${PROJECT}
${CATALOG}
${liveSnapshot(state)}`
}

export const SUGGESTIONS = [
  'O que faz a sonda Origem quando a energia cai?',
  'Como está a missão agora?',
  'Explica a transferência de Hohmann na cena 3D',
  'Que falhas a sonda não consegue resolver?',
]
