import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tms/gas
 * Server-side proxy for Google Apps Script (GAS) Web App.
 * Avoids CORS issues by calling GAS from server with full JSON support.
 * 
 * Supported actions (body.action):
 *   - createPhieuBK : Create new booking header in 1.Data_Xe_PhieuBK
 *   - updatePhieuBK : Update computed fields in existing booking
 *   - createChuyen  : Add trip to 1.Data_Xe_BK
 * 
 * Also supports GET for read actions:
 *   - ?action=ping
 *   - ?action=getBanggia
 *   - ?action=getBienSoByNCC&ncc_id=...
 */

const GAS_URL = (process.env.TMS_GAS_URL || '').trim();

export async function POST(request: NextRequest) {
    try {
        if (!GAS_URL) {
            // DEV MODE: simulate GAS write
            if (process.env.NODE_ENV === 'development') {
                const body = await request.json();
                console.warn('[DEV] GAS proxy: No TMS_GAS_URL. Simulating write for action:', body.action);
                await new Promise(r => setTimeout(r, 500));
                return NextResponse.json({
                    success: true,
                    id: body.ID || body.ID_CODE || 'unknown',
                    row: Math.floor(Math.random() * 900) + 100,
                    message: `[DEV] Simulated ${body.action} success`,
                    source: 'dev_mock',
                });
            }
            return NextResponse.json(
                { success: false, error: 'TMS_GAS_URL not configured' },
                { status: 503 }
            );
        }

        const body = await request.json();
        console.log(`[GAS] Proxying POST action=${body.action} to GAS...`);

        // Call GAS with text/plain to avoid CORS preflight
        const gasRes = await fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(body),
            redirect: 'follow',
        });

        if (!gasRes.ok) {
            const errText = await gasRes.text().catch(() => 'no body');
            console.error(`[GAS] Error ${gasRes.status}:`, errText);
            return NextResponse.json(
                { success: false, error: `GAS returned ${gasRes.status}`, details: errText },
                { status: 502 }
            );
        }

        const gasData = await gasRes.json();
        console.log(`[GAS] Response:`, JSON.stringify(gasData).slice(0, 200));
        return NextResponse.json(gasData);

    } catch (error) {
        console.error('[GAS] Proxy error:', error);
        return NextResponse.json(
            { success: false, error: 'GAS proxy error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action') || '';

        if (!GAS_URL) {
            return NextResponse.json(
                { success: false, error: 'TMS_GAS_URL not configured' },
                { status: 503 }
            );
        }

        const params = new URLSearchParams();
        searchParams.forEach((v, k) => params.set(k, v));

        const url = `${GAS_URL}?${params.toString()}`;
        console.log(`[GAS] Proxying GET action=${action} to GAS...`);

        const gasRes = await fetch(url, { redirect: 'follow' });
        if (!gasRes.ok) {
            return NextResponse.json(
                { success: false, error: `GAS returned ${gasRes.status}` },
                { status: 502 }
            );
        }

        const gasData = await gasRes.json();
        return NextResponse.json(gasData);

    } catch (error) {
        console.error('[GAS GET] Proxy error:', error);
        return NextResponse.json(
            { success: false, error: 'GAS GET proxy error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
