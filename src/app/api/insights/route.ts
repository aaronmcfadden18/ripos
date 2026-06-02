import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { streams, sales, inventory } = await req.json()

    const totalRevenue = streams.reduce((a: number, s: any) => a + (s.revenue ?? 0), 0)
    const totalProfit = streams.reduce((a: number, s: any) => a + ((s.revenue ?? 0) - (s.inventory_cost ?? 0)), 0)

    const buyerMap = new Map<string, { count: number; total: number }>()
    for (const s of sales) {
      if (!s.buyer_name) continue
      const existing = buyerMap.get(s.buyer_name) ?? { count: 0, total: 0 }
      buyerMap.set(s.buyer_name, { count: existing.count + 1, total: existing.total + (s.sale_amount ?? 0) })
    }
    const topBuyers = Array.from(buyerMap.entries())
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const streamSummary = streams.slice(-10).map((s: any) => ({
      title: s.title,
      date: s.stream_date,
      revenue: s.revenue,
      cost: s.inventory_cost,
      profit: (s.revenue ?? 0) - (s.inventory_cost ?? 0),
      margin: s.revenue ? (((s.revenue - (s.inventory_cost ?? 0)) / s.revenue) * 100).toFixed(1) + '%' : null,
    }))

    const inventorySummary = inventory.map((i: any) => ({
      product: i.product_name,
      stock: i.quantity,
      costPerUnit: i.cost_per_unit,
      status: i.quantity === 0 ? 'out' : i.quantity <= 2 ? 'low' : 'ok'
    }))

    const prompt = `You are a business advisor for a Whatnot card breaker. Analyse their data and give 2-3 sharp, specific, actionable insights. Be direct — like a smart friend who knows their numbers. No fluff.

STREAMS: ${JSON.stringify(streamSummary)}
TOP BUYERS: ${JSON.stringify(topBuyers)}
INVENTORY: ${JSON.stringify(inventorySummary)}
TOTAL STREAMS: ${streams.length}, TOTAL REVENUE: £${totalRevenue.toFixed(2)}, TOTAL PROFIT: £${totalProfit.toFixed(2)}, TOTAL SALES: ${sales.length}

Return ONLY a raw JSON object, no markdown, no backticks:
{"insights":[{"type":"performance|buyer|inventory|opportunity","headline":"max 8 words","detail":"one specific actionable sentence with their actual numbers"}]}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()
    const text = data.content?.[0]?.text ?? ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Insights error:', error)
    return NextResponse.json({ insights: [] }, { status: 500 })
  }
}
