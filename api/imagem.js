// api/imagem.js
// Busca imagem real da peça via Google Custom Search API

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { peca, marca, modelo, oem } = req.query;

    if (!peca) {
      return res.status(400).json({ error: 'Parâmetro peca obrigatório' });
    }

    // Monta query otimizada para encontrar foto real da peça
    const query = oem
      ? `${oem} ${peca} autopeça foto produto`
      : `${peca} ${marca} ${modelo} autopeça original foto`;

    const apiKey = process.env.GOOGLE_API_KEY;
    const cx = process.env.GOOGLE_CX;

    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&searchType=image&num=3&imgType=photo&safe=active&gl=br&hl=pt-BR`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('Google API error:', data.error);
      return res.status(200).json({ success: false, imagens: [] });
    }

    const imagens = (data.items || []).map(item => ({
      url: item.link,
      thumb: item.image?.thumbnailLink || item.link,
      titulo: item.title,
      fonte: item.displayLink
    }));

    return res.status(200).json({ success: true, imagens, query });

  } catch (err) {
    console.error('Erro imagem:', err);
    return res.status(500).json({ error: 'Erro ao buscar imagem', imagens: [] });
  }
}
