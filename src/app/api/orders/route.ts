import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { OrderSubmissionPayload } from '@/types'

// ------------------------------------------------------------------
// POST /api/orders
// Public endpoint — authenticated by landing_page_api_key
// Called by external landing pages to submit COD orders
// ------------------------------------------------------------------

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status, headers: corsHeaders })
}

function jsonSuccess(data: Record<string, unknown>) {
  return NextResponse.json({ success: true, ...data }, { status: 200, headers: corsHeaders })
}

// Optional Telegram notification (non-blocking)
async function sendTelegramNotification(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    })
  } catch (err) {
    // Non-blocking — never fail the order because of Telegram
    console.error('[Telegram] Failed to send notification:', err)
  }
}

export async function POST(request: NextRequest) {
  console.log('[OrderAPI] Request received')
  let body: Partial<OrderSubmissionPayload>

  // 1. Parse request body
  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid JSON body.')
  }

  // 2. Validate required fields
  const required: (keyof OrderSubmissionPayload)[] = [
    'landing_page_api_key',
    'customer_name',
    'phone',
    'city',
    'address',
    'quantity',
    'order_value',
    'currency',
  ]

  for (const field of required) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return jsonError(`Missing required field: ${field}`)
    }
  }

  console.log(`[OrderAPI] landing_page_api_key received: ${!!body.landing_page_api_key}`)

  // Numeric validation
  const quantity = Number(body.quantity)
  const orderValue = Number(body.order_value)

  if (!Number.isInteger(quantity) || quantity < 1) {
    return jsonError('quantity must be a positive integer.')
  }
  if (isNaN(orderValue) || orderValue <= 0) {
    return jsonError('order_value must be a positive number.')
  }

  // 3. Validate the API key → find active landing page
  const supabase = createAdminClient()

  const { data: landingPage, error: lpError } = await supabase
    .from('landing_pages')
    .select('id, product_id, status, page_name')
    .eq('api_key', body.landing_page_api_key)
    .single()

  console.log(`[OrderAPI] Landing page found: ${!!landingPage}`)
  if (landingPage) {
    console.log(`[OrderAPI] Product ID found: ${!!landingPage.product_id}`)
  }

  if (lpError || !landingPage) {
    console.error('[OrderAPI] Invalid API key:', body.landing_page_api_key, lpError?.message)
    return jsonError('Invalid API key. Order not saved.', 401)
  }

  if (landingPage.status !== 'Active') {
    return jsonError(`Landing page is ${landingPage.status}. Orders are not accepted.`, 403)
  }

  // 4. Get client IP
  const ip =
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    null

  // 5. Insert order
  const { data: newOrder, error: insertError } = await supabase
    .from('orders')
    .insert({
      product_id: landingPage.product_id,
      landing_page_id: landingPage.id,
      customer_name: String(body.customer_name).trim(),
      phone: String(body.phone).trim(),
      city: String(body.city).trim(),
      address: String(body.address).trim(),
      package_name: body.package_name?.toString().trim() || null,
      quantity,
      order_value: orderValue,
      currency: String(body.currency).trim().toUpperCase(),
      status: 'New',
      // UTM & tracking (all optional)
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      utm_content: body.utm_content || null,
      utm_term: body.utm_term || null,
      campaign_id: body.campaign_id || null,
      adset_id: body.adset_id || null,
      ad_id: body.ad_id || null,
      platform: body.platform || null,
      device: body.device || null,
      browser: body.browser || null,
      user_agent: body.user_agent || null,
      ip_address: ip,
    })
    .select('id, order_number')
    .single()

  console.log(`[OrderAPI] Insert success: ${!!newOrder}`)
  if (insertError) {
    console.error('[OrderAPI] Supabase insert error:', insertError.message, insertError.details)
  }

  if (insertError || !newOrder) {
    console.error('[OrderAPI] Failed to insert order:', insertError?.message)
    return jsonError('Failed to save order. Please try again.', 500)
  }

  console.info(`[OrderAPI] New order ${newOrder.order_number} from landing page: ${landingPage.page_name}`)

  // 6. Send Telegram notification (non-blocking)
  const telegramMsg = [
    `🛒 <b>New Order: ${newOrder.order_number}</b>`,
    `👤 ${body.customer_name} · ${body.phone}`,
    `📍 ${body.city}`,
    `💰 ${orderValue} ${body.currency}`,
    `🌐 Landing Page: ${landingPage.page_name}`,
    body.utm_campaign ? `📢 Campaign: ${body.utm_campaign}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  sendTelegramNotification(telegramMsg) // fire-and-forget

  // 7. Return success
  return jsonSuccess({
    order_id: newOrder.id,
    order_number: newOrder.order_number,
  })
}

// Method not allowed for GET, etc.
export async function GET() {
  return jsonError('Method not allowed. Use POST.', 405)
}
