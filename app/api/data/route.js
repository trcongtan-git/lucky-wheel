// In-memory store (Vercel serverless: không lưu file được, client đã fallback localStorage)
let store = { players: [], results: [] };

export async function GET() {
  return Response.json(store);
}

export async function POST(request) {
  try {
    const body = await request.json();
    store = {
      players: Array.isArray(body.players) ? body.players : store.players,
      results: Array.isArray(body.results) ? body.results : store.results,
    };
    return Response.json(store);
  } catch (e) {
    return Response.json({ error: String(e.message) }, { status: 400 });
  }
}
