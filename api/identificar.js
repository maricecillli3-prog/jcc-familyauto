// api/identificar.js
// Edge Function — Proxy seguro para Claude API
// Protege a chave ANTHROPIC_API_KEY do frontend

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { marca, modelo, ano, motor, peca } = req.body;

    if (!marca || !modelo || !ano || !motor || !peca) {
      return res.status(400).json({ error: 'Campos obrigatórios: marca, modelo, ano, motor, peca' });
    }

    const prompt = `Você é um especialista técnico em autopeças com 20 anos de experiência no mercado brasileiro.
Responda APENAS em JSON válido, sem markdown, sem comentários, sem texto extra.

Veículo: ${marca} ${modelo} ${ano} motor ${motor}
Peça solicitada: ${peca}

Retorne exatamente este JSON:
{
  "nome_peca": "nome técnico completo da peça em português",
  "codigo_oem": "código OEM original do fabricante (ex: 71736098, 0 451 103 082)",
  "aplicacao": "${marca} ${modelo} ${ano}",
  "motor": "${motor}",
  "preco_medio": "R$ XX,00 — R$ XX,00",
  "descricao": "descrição técnica de 2 linhas: função, material e dica de instalação",
  "marcas_recomendadas": ["marca1", "marca2", "marca3"],
  "intervalo_troca": "intervalo recomendado de troca em km ou meses",
  "compatibilidades": ["${marca} ${modelo} ${parseInt(ano)-1}", "${marca} ${modelo} ${parseInt(ano)+1}"]
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Anthropic error:', data.error);
      return res.status(500).json({ error: data.error.message });
    }

    const text = data.content.map(i => i.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const resultado = JSON.parse(clean);

    return res.status(200).json({ success: true, data: resultado });

  } catch (err) {
    console.error('Erro identificar:', err);
    return res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
}