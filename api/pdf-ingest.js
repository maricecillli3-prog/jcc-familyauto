// api/pdf-ingest.js
// Recebe texto extraído do PDF e usa Gemini para estruturar os dados

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { texto, pagina_atual, total_paginas } = req.body;

    if (!texto) {
      return res.status(400).json({ error: 'Campo texto obrigatório' });
    }

    const prompt = `Você é um extrator de dados de catálogos de autopeças.
Analise o texto abaixo (página ${pagina_atual} de ${total_paginas}) e extraia TODOS os registros de peças encontrados.
Responda APENAS com um array JSON válido, sem markdown, sem texto extra.

Cada item do array deve ter exatamente:
{
  "marca": "marca do veículo",
  "modelo": "modelo do veículo",
  "ano": numero_inteiro,
  "motor": "ex: 1.0, 1.4, 2.0T",
  "codigo_oem": "código da peça",
  "descricao": "descrição da peça",
  "preco_medio": numero_decimal_ou_null
}

Se não encontrar dados estruturados, retorne apenas: []

TEXTO DO CATÁLOGO:
${texto.slice(0, 8000)}`;

    const apiKey = process.env.GOOGLE_GEMINI_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4000
        }
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const clean = text.replace(/```json|```/g, '').trim();

    let pecas = [];
    try {
      pecas = JSON.parse(clean);
      if (!Array.isArray(pecas)) pecas = [];
    } catch {
      pecas = [];
    }

    const validos = pecas.filter(p =>
      p.marca && p.modelo && p.ano && p.motor && p.codigo_oem
    );

    return res.status(200).json({
      success: true,
      extraidos: validos.length,
      descartados: pecas.length - validos.length,
      pecas: validos
    });

  } catch (err) {
    console.error('Erro pdf-ingest:', err);
    return res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
}