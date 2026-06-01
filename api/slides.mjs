// GET /api/slides — live manifest of Slides_Datasets, scanned on every request.
import { scanSlides } from '../lib/scan.mjs';

export default async function handler(req, res) {
  try {
    const { slides } = await scanSlides();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        ok: true,
        count: slides.length,
        generatedAt: new Date().toISOString(),
        slides,
      })
    );
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: String((e && e.message) || e), slides: [] }));
  }
}
