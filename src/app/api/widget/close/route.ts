/**
 * POST /api/widget/close
 *
 * Beacon API endpoint — fires when a visitor closes the chat widget or leaves the page.
 * navigator.sendBeacon() sends this — it survives page unload.
 *
 * Payload: { sessionId, embedToken, conversationId, reason: 'close' | 'unload' }
 *
 * Marks conversation as completed, triggers completed report (idempotent).
 * Returns 204 (Beacon API ignores the response body anyway).
 */

import { NextRequest } from 'next/server';
import { markConversationCompleted } from '@/lib/conversation';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    let body: {
      conversationId?: string;
      embedToken?: string;
      sessionId?: string;
      reason?: string;
    };

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      body = await req.json();
    } else {
      // Beacon API sends text/plain or application/x-www-form-urlencoded
      const text = await req.text();
      try {
        body = JSON.parse(text);
      } catch {
        body = Object.fromEntries(new URLSearchParams(text));
      }
    }

    const { conversationId, reason } = body;

    if (!conversationId) {
      return new Response(null, { status: 204 });
    }

    const validReason = reason === 'unload' ? 'unload' : 'close';

    // Fire-and-forget: Beacon doesn't wait for response
    markConversationCompleted(conversationId, validReason).catch((err) => {
      console.error('[widget/close] Failed to mark conversation completed:', err);
    });
  } catch (err) {
    // Beacon API — never error, just log
    console.error('[widget/close] Error processing beacon:', err);
  }

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
