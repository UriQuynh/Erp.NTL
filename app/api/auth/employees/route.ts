import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/employees
 * Server-side proxy to fetch employee HRIS data from V1 production.
 * Avoids CORS issues since this is a server-to-server request.
 */
export async function GET() {
    try {
        const res = await fetch('https://erp-ntl.vercel.app/api/sync?module=employees', {
            cache: 'no-store',
        });

        if (!res.ok) {
            return NextResponse.json(
                { success: false, error: `V1 API returned ${res.status}` },
                { status: 502 }
            );
        }

        const json = await res.json();
        
        // V1 returns { status: 'success', data: [...] }
        return NextResponse.json({
            success: true,
            data: json.data || [],
            count: Array.isArray(json.data) ? json.data.length : 0,
            _source: 'v1-proxy',
        });
    } catch (error) {
        console.error('[API/auth/employees] Proxy error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch employee data from HRIS' },
            { status: 500 }
        );
    }
}
