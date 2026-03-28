// api/upsert-pecas.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { pecas } = req.body;

    if (!Array.isArray(pecas) || pecas.length === 0) {
      return res.status(400).json({ error: 'Array de peças vazio ou inválido' });
    }

    // Tenta todas as variações possíveis do Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 
                        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                        process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase não configurado.' });
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/pecas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(pecas)
    });

    if (!response.ok) {
      const errBody = await response.text();
      return res.status(response.status).json({ error: 'Erro no Supabase: ' + errBody });
    }

    return res.status(200).json({
      success: true,
      salvos: pecas.length,
      mensagem: `${pecas.length} peças salvas com sucesso.`
    });

  } catch (err) {
    return res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
}