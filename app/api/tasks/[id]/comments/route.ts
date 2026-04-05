import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const body = await request.json();
        const comment = {
            id: 'cmt-' + Date.now(),
            task_id: id,
            user_id: body.user_id || 'admin',
            content: body.content,
            created_at: new Date().toISOString(),
        };
        return NextResponse.json({ status: 'success', data: comment });
    } catch (e) {
        return NextResponse.json({ status: 'error', message: 'Failed to add comment' }, { status: 500 });
    }
}
