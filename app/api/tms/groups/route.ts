import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SPREADSHEET_ID = '1QjelpEElXH-0fxYO4puGA4rwcbhvX4Uc7ucuZqWH9UQ';
const GROUP_CSV_GID = 138469474;

// Groups to exclude - ASCII only to avoid encoding issues
// Match on uppercase normalized name
const BLACKLIST_KEYWORDS = [
    'OFF', 'HOP KHACH HANG', 'DE NGHI THANH TOAN', 'TAM UNG',
    'VAN HANH TRUNG TAM', 'HO TRO BUU CUC',
    'HOP KHACH HANG', 'DE NGHI TT',
];

function normalizeUpper(s: string): string {
    return s
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\u0111/g, 'd') // d with stroke
        .replace(/\u0110/g, 'D');
}

function shouldExclude(group: string): boolean {
    if (!group || !group.trim()) return true;
    const n = normalizeUpper(group.trim());
    return BLACKLIST_KEYWORDS.some(b => n === b || n.startsWith(b) || n.includes(b));
}

function parseCSV(csv: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQ = false;
    for (let i = 0; i < csv.length; i++) {
        const c = csv[i];
        const nc = csv[i + 1];
        if (inQ) {
            if (c === '"' && nc === '"') { field += '"'; i++; }
            else if (c === '"') { inQ = false; }
            else { field += c; }
        } else {
            if (c === '"') inQ = true;
            else if (c === ',') { row.push(field.trim()); field = ''; }
            else if (c === '\n' || (c === '\r' && nc === '\n')) {
                row.push(field.trim());
                if (row.some(x => x)) rows.push(row);
                row = []; field = '';
                if (c === '\r') i++;
            } else { field += c; }
        }
    }
    if (field || row.length) {
        row.push(field.trim());
        if (row.some(x => x)) rows.push(row);
    }
    return rows;
}

export async function GET() {
    try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${GROUP_CSV_GID}`;
        const res = await fetch(csvUrl, {
            cache: 'no-store',
            redirect: 'follow',
        });

        if (!res.ok) {
            console.error('[GroupCV] CSV fetch failed:', res.status);
            return NextResponse.json({ success: false, error: 'Fetch failed', data: [] }, { status: 500 });
        }

        const text = await res.text();

        // Guard against HTML redirect
        if (text.trim().startsWith('<')) {
            console.error('[GroupCV] Got HTML response, likely auth redirect');
            return NextResponse.json({ success: false, error: 'Auth redirect', data: [] }, { status: 500 });
        }

        const allRows = parseCSV(text);
        if (allRows.length < 2) {
            return NextResponse.json({ success: true, count: 0, data: [] });
        }

        const hdrs = allRows[0].map(h => h.trim().toLowerCase());
        const ig = hdrs.findIndex(h => h.includes('group'));
        const id = hdrs.findIndex(h => h.includes('dia'));
        const il = hdrs.findIndex(h => h.includes('loai'));
        const ik = hdrs.findIndex(h => h.includes('khoan'));

        const groups = allRows.slice(1)
            .map(row => ({
                group: (row[ig >= 0 ? ig : 0] || '').trim(),
                dia_chi: (row[id >= 0 ? id : 1] || '').trim(),
                loai: (row[il >= 0 ? il : 2] || '').trim(),
                khoan: parseFloat((row[ik >= 0 ? ik : 3] || '').replace(/[^\d.]/g, '')) || 0,
            }))
            .filter(r => r.group && !shouldExclude(r.group));

        groups.sort((a, b) => {
            const an = normalizeUpper(a.group);
            const bn = normalizeUpper(b.group);
            const aDA = an.startsWith('DU AN');
            const bDA = bn.startsWith('DU AN');
            if (aDA && !bDA) return -1;
            if (!aDA && bDA) return 1;
            return a.group.localeCompare(b.group, 'vi');
        });

        return NextResponse.json({ success: true, count: groups.length, data: groups });
    } catch (error) {
        console.error('[GroupCV] Error:', error);
        return NextResponse.json({ success: false, error: 'Internal error', data: [] }, { status: 500 });
    }
}
