export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { marca, modelo, ano, motor, peca } = req.body;
    if (!marca || !modelo || !ano || !motor || !peca) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
    }

    const prompt = `Você é especialista em autopeças do mercado brasileiro. Responda APENAS em JSON válido, sem markdown.

Veículo: ${marca} ${modelo} ${ano} motor ${motor}
Peça: ${peca}

JSON:
{
  "nome_peca": "nome técnico completo",
  "codigo_oem": "código OEM do fabricante",
  "aplicacao": "${marca} ${modelo} ${ano}",
  "motor": "${motor}",
  "preco_medio": "R$ XX,00 — R$ XX,00",
  "descricao": "descrição técnica em 2 linhas",
  "marcas_recomendadas": ["marca1", "marca2", "marca3"],
  "intervalo_troca": "intervalo recomendado"
}`;

    const apiKey = process.env.GOOGLE_GEMINI_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1000 }
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const resultado = JSON.parse(clean);

    return res.status(200).json({ success: true, data: resultado });

  } catch (err) {
    return res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
}
