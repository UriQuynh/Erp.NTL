import { NextRequest, NextResponse } from 'next/server';
import { fetchSheet, SHEET_GIDS } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sheets?sheet=GroupCV
 * Generic sheet reader — fetches any sheet by name and returns as array of objects
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const sheetName = searchParams.get('sheet') || 'GroupCV';

    try {
        const gid = SHEET_GIDS[sheetName];
        if (gid === undefined) {
            return NextResponse.json(
                { success: false, error: `Sheet "${sheetName}" not found. Available: ${Object.keys(SHEET_GIDS).join(', ')}` },
                { status: 404 }
            );
        }

        const data = await fetchSheet(gid);

        return NextResponse.json({
            success: true,
            count: data.length,
            sheet: sheetName,
            data,
        });
    } catch (error) {
        console.error(`Sheet fetch error (${sheetName}):`, error);
        return NextResponse.json(
            { success: false, error: `Failed to fetch sheet "${sheetName}"`, details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
