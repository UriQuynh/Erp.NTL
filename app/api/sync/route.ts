import { NextRequest, NextResponse } from 'next/server';
import { fetchSheetRaw, SHEET_GIDS } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

/**
 * /api/sync — Production-compatible data sync endpoint
 * 
 * Usage:
 *   GET /api/sync?module=all       → counts for employees, tasks, groups, home
 *   GET /api/sync?module=employees → full employee list from Ngan_Hang
 *   GET /api/sync?module=tasks     → full task list from Task_List
 *   GET /api/sync?module=bookings  → bookings from Khoan
 *   GET /api/sync?module=groups    → group CV list
 */
export async function GET(req: NextRequest) {
  try {
    const module = req.nextUrl.searchParams.get('module') || 'all';

    if (module === 'all') {
      // Fetch counts from multiple sheets in parallel
      const [employees, tasks, groups, home] = await Promise.allSettled([
        fetchSheetRaw('Ngan_Hang'),
        fetchSheetRaw('Task_List'),
        fetchSheetRaw('GroupCV'),
        fetchSheetRaw('Home'),
      ]);

      const getCount = (result: PromiseSettledResult<any[]>) =>
        result.status === 'fulfilled' ? result.value.length : 0;

      return NextResponse.json({
        status: 'success',
        ts: new Date().toISOString(),
        data: {
          employees: { count: getCount(employees) },
          tasks: { count: getCount(tasks) },
          groups: { count: getCount(groups) },
          home: { count: getCount(home) },
        },
      });
    }

    // Single module fetch
    const sheetMap: Record<string, string> = {
      employees: 'Ngan_Hang',
      tasks: 'Task_List',
      bookings: 'Khoan',
      groups: 'GroupCV',
      home: 'Home',
      kpi: 'KPI',
      salary: 'FIle_Luong',
      nangSuat: 'Nang_Suat',
    };

    const sheetName = sheetMap[module];
    if (!sheetName) {
      return NextResponse.json(
        { status: 'error', message: `Unknown module: ${module}` },
        { status: 400 }
      );
    }

    const data = await fetchSheetRaw(sheetName);

    return NextResponse.json({
      status: 'success',
      ts: new Date().toISOString(),
      data,
      count: data.length,
    });
  } catch (error: any) {
    console.error('[API/sync] Error:', error);
    return NextResponse.json(
      { status: 'error', message: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}
