// Função serverless da Vercel: equivalente em produção ao proxy do Vite (vite.config.js).
// A chave vive nas variáveis de ambiente do projecto na Vercel e nunca chega ao browser.

const MAX_BODY = 200_000

export async function POST(request) {
  const key = process.env.GEMINI_API_KEY
  if (!key) return json(500, 'GEMINI_API_KEY não está configurada na Vercel.')

  const raw = await request.text()
  if (raw.length > MAX_BODY) return json(413, 'Pedido demasiado grande.')

  let body
  try {
    body = JSON.parse(raw)
  } catch {
    return json(400, 'JSON inválido.')
  }

  // Só reencaminha os campos que o chat usa.
  const { contents, systemInstruction, generationConfig } = body
  if (!Array.isArray(contents) || contents.length === 0) return json(400, 'Faltam mensagens.')

  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest'
  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents, systemInstruction, generationConfig }),
    },
  )

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
    },
  })
}

function json(status, message) {
  return Response.json({ error: { message } }, { status })
}
