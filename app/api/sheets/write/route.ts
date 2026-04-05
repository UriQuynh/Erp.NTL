import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Google Apps Script Web App URL — handles write operations
 * This is the GAS backend deployed as web app that handles:
 * - addTask: Add new task row
 * - updateTask: Update existing task by ID
 * - deleteTask: Delete task by ID
 * - confirmTask: Confirm a task
 * - checkin / checkout: Time and location tracking
 */
const GAS_WEBAPP_URL = process.env.GAS_WEBAPP_URL || 'https://script.google.com/macros/s/AKfycbx3v5X4F5M3K2I9Q8w7R6t1Y0p_jL8m4n5o6q/exec';

/**
 * POST /api/sheets/write
 * Proxies write operations to the Google Apps Script backend.
 * Uses GET-with-payload (CORS-safe strategy for GAS).
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, ...payload } = body;

        if (!action) {
            return NextResponse.json({ success: false, error: 'Missing "action" parameter' }, { status: 400 });
        }

        // Encode payload as URL params (GAS doGet strategy for CORS compliance)
        const params = new URLSearchParams();
        params.set('action', action);
        params.set('payload', JSON.stringify(payload));

        const gasUrl = `${GAS_WEBAPP_URL}?${params.toString()}`;

        const gasRes = await fetch(gasUrl, {
            method: 'GET',
            redirect: 'follow',
        });

        // GAS may return HTML on redirect — try to parse JSON
        const text = await gasRes.text();
        try {
            const json = JSON.parse(text);
            return NextResponse.json({ success: true, ...json });
        } catch {
            // If GAS returned non-JSON (likely redirect page), consider it success
            // since GAS doGet typically processes the action before redirect
            if (gasRes.ok || gasRes.status === 302 || gasRes.redirected) {
                return NextResponse.json({
                    success: true,
                    message: `Action "${action}" được gửi thành công`,
                    _raw: text.substring(0, 200),
                });
            }
            return NextResponse.json(
                { success: false, error: 'GAS returned unexpected response', _raw: text.substring(0, 200) },
                { status: 502 }
            );
        }
    } catch (error) {
        console.error('Write API error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to write to Google Sheets', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
