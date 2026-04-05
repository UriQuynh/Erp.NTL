import { NextResponse } from 'next/server';

// In-memory project store (persists during server session)
// Production uses Google Sheets, this uses local persistence
let projects: any[] = [
    { id: 'proj-1', name: 'Dự Án Loreal', icon: '📦', color: '#2563EB', owner_id: 'admin', created_at: new Date().toISOString() },
    { id: 'proj-2', name: 'Vận Hành Trung Tâm', icon: '🏗️', color: '#059669', owner_id: 'admin', created_at: new Date().toISOString() },
    { id: 'proj-3', name: 'Dự Án FTG', icon: '🚀', color: '#D97706', owner_id: 'admin', created_at: new Date().toISOString() },
    { id: 'proj-4', name: 'NTL Internal', icon: '💼', color: '#7C3AED', owner_id: 'admin', created_at: new Date().toISOString() },
];

export async function GET() {
    return NextResponse.json({ status: 'success', data: projects });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const newProject = {
            id: 'proj-' + Date.now(),
            name: body.name,
            icon: body.icon || '📁',
            color: body.color || '#1D354D',
            owner_id: body.owner_id || 'admin',
            created_at: new Date().toISOString(),
        };
        projects.push(newProject);
        return NextResponse.json({ status: 'success', data: newProject });
    } catch (e) {
        return NextResponse.json({ status: 'error', message: 'Failed to create project' }, { status: 500 });
    }
}
