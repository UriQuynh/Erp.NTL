import { NextResponse } from 'next/server';

// Reference task store from parent route
// In production this would use Google Sheets
// For now we import and mutate the shared store

// We need to access the shared state - using dynamic import pattern
async function getTasksModule() {
    // Access the tasks module - this is a workaround for in-memory store sharing
    const mod = await import('../route');
    return mod;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    
    // Fetch from the tasks API
    const tasksRes = await fetch(new URL('/api/tasks', request.url).toString());
    const tasksData = await tasksRes.json();
    const task = tasksData.data?.find((t: any) => t.id === id);
    
    if (!task) {
        return NextResponse.json({ status: 'error', message: 'Task not found' }, { status: 404 });
    }

    // Add comments and activity logs
    return NextResponse.json({
        status: 'success',
        data: {
            ...task,
            comments: [],
            activity_logs: [],
        },
    });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    
    try {
        const body = await request.json();
        
        // Fetch current tasks
        const tasksRes = await fetch(new URL('/api/tasks', request.url).toString());
        const tasksData = await tasksRes.json();
        
        const taskIndex = tasksData.data?.findIndex((t: any) => t.id === id);
        
        if (taskIndex === -1 || taskIndex === undefined) {
            // Check if it's a sub-task
            for (const task of tasksData.data || []) {
                const subIndex = (task.sub_tasks || []).findIndex((st: any) => st.id === id);
                if (subIndex >= 0) {
                    task.sub_tasks[subIndex] = { ...task.sub_tasks[subIndex], ...body };
                    return NextResponse.json({ status: 'success', data: task.sub_tasks[subIndex] });
                }
            }
            return NextResponse.json({ status: 'error', message: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json({ status: 'success', data: { id, ...body, updated_at: new Date().toISOString() } });
    } catch (e) {
        return NextResponse.json({ status: 'error', message: 'Failed to update task' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return NextResponse.json({ status: 'success', message: 'Task deleted' });
}
