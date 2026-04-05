import { NextResponse } from 'next/server';

// In-memory task store
let tasks: any[] = [
    {
        id: 'task-1', title: 'Kiểm tra hàng tồn kho Loreal', status: 'in_progress', priority: 'high',
        creator_id: '5001190', assignee_id: '5001190,5002851', due_date: new Date(Date.now() + 86400000).toISOString(),
        start_date: new Date().toISOString(), project_id: 'proj-1', description: 'Kiểm kê lại toàn bộ hàng tồn kho tại Kho Shopee Củ Chi',
        tags: 'urgent,inventory', attachments: '', sort_order: 0,
        created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: new Date().toISOString(),
        sub_tasks: [
            { id: 'st-1', title: 'Đếm hàng Zone A', status: 'done', assignee_id: '5001190', due_date: '' },
            { id: 'st-2', title: 'Đếm hàng Zone B', status: 'todo', assignee_id: '5002851', due_date: '' },
            { id: 'st-3', title: 'Báo cáo chênh lệch', status: 'todo', assignee_id: '', due_date: '' },
        ],
    },
    {
        id: 'task-2', title: 'Lập kế hoạch vận chuyển tuần 15', status: 'todo', priority: 'urgent',
        creator_id: '5001190', assignee_id: '5003957', due_date: new Date(Date.now() + 172800000).toISOString(),
        start_date: '', project_id: 'proj-2', description: '',
        tags: '', attachments: '', sort_order: 1,
        created_at: new Date(Date.now() - 7200000).toISOString(), updated_at: new Date().toISOString(),
        sub_tasks: [],
    },
    {
        id: 'task-3', title: 'Cập nhật báo giá NCC mới', status: 'review', priority: 'medium',
        creator_id: '5001190', assignee_id: '5003632', due_date: new Date(Date.now() + 432000000).toISOString(),
        start_date: new Date(Date.now() - 86400000).toISOString(), project_id: 'proj-3', description: 'Liên hệ NCC và cập nhật bảng giá vận chuyển mới cho Q2/2026',
        tags: 'pricing', attachments: '', sort_order: 2,
        created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date().toISOString(),
        sub_tasks: [],
    },
    {
        id: 'task-4', title: 'Setup quy trình CI/CO cho dự án Samsung', status: 'done', priority: 'high',
        creator_id: '5001190', assignee_id: '5001190', due_date: new Date(Date.now() - 86400000).toISOString(),
        start_date: new Date(Date.now() - 259200000).toISOString(), project_id: 'proj-4', description: '',
        tags: '', attachments: '', sort_order: 3,
        created_at: new Date(Date.now() - 259200000).toISOString(), updated_at: new Date().toISOString(),
        sub_tasks: [],
    },
    {
        id: 'task-5', title: 'Đào tạo nhân viên mới về quy trình an toàn', status: 'todo', priority: 'low',
        creator_id: '5001190', assignee_id: '', due_date: '',
        start_date: '', project_id: 'proj-4', description: 'Tổ chức buổi đào tạo về an toàn lao động cho batch nhân viên mới',
        tags: 'training', attachments: '', sort_order: 4,
        created_at: new Date(Date.now() - 172800000).toISOString(), updated_at: new Date().toISOString(),
        sub_tasks: [],
    },
    {
        id: 'task-6', title: 'Xây dựng dashboard báo cáo tháng 3', status: 'in_progress', priority: 'medium',
        creator_id: '5001190', assignee_id: '5003812', due_date: new Date(Date.now() + 604800000).toISOString(),
        start_date: new Date().toISOString(), project_id: 'proj-4', description: '',
        tags: 'report', attachments: '', sort_order: 5,
        created_at: new Date(Date.now() - 43200000).toISOString(), updated_at: new Date().toISOString(),
        sub_tasks: [
            { id: 'st-4', title: 'Thu thập dữ liệu vận chuyển', status: 'done', assignee_id: '5003812', due_date: '' },
            { id: 'st-5', title: 'Tạo biểu đồ KPI', status: 'in_progress', assignee_id: '5003812', due_date: '' },
        ],
    },
];

let comments: Record<string, any[]> = {
    'task-1': [
        { id: 'cmt-1', task_id: 'task-1', user_id: '5001190', content: 'Đã bắt đầu kiểm kê Zone A, dự kiến xong trước 15h', created_at: new Date(Date.now() - 1800000).toISOString() },
        { id: 'cmt-2', task_id: 'task-1', user_id: '5002851', content: 'OK, tôi sẽ bắt đầu Zone B sau khi Zone A xong', created_at: new Date(Date.now() - 900000).toISOString() },
    ],
};

let activityLogs: Record<string, any[]> = {
    'task-1': [
        { id: 'log-1', task_id: 'task-1', user_id: '5001190', action: 'created', field_name: '', old_value: '', new_value: '', created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 'log-2', task_id: 'task-1', user_id: '5001190', action: 'status_changed', field_name: 'status', old_value: 'todo', new_value: 'in_progress', created_at: new Date(Date.now() - 1800000).toISOString() },
    ],
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get('project');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let filtered = [...tasks];
    if (project) filtered = filtered.filter(t => t.project_id === project);
    if (status) filtered = filtered.filter(t => t.status === status);
    if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(t => t.title.toLowerCase().includes(s));
    }

    return NextResponse.json({ status: 'success', data: filtered });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const newTask = {
            id: 'task-' + Date.now(),
            title: body.title,
            status: 'todo',
            priority: body.priority || 'medium',
            creator_id: body.creator_id || 'admin',
            assignee_id: body.assignee_id || '',
            due_date: body.due_date || '',
            start_date: body.start_date || '',
            project_id: body.project_id || '',
            description: body.description || '',
            tags: body.tags || '',
            attachments: '',
            sort_order: tasks.length,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sub_tasks: [],
        };

        // Handle parent_id for sub-tasks
        if (body.parent_id) {
            const parent = tasks.find(t => t.id === body.parent_id);
            if (parent) {
                const subTask = {
                    id: 'st-' + Date.now(),
                    title: body.title,
                    status: 'todo',
                    assignee_id: body.assignee_id || '',
                    due_date: body.due_date || '',
                };
                parent.sub_tasks = [...(parent.sub_tasks || []), subTask];
                parent.updated_at = new Date().toISOString();
                return NextResponse.json({ status: 'success', data: subTask });
            }
        }

        tasks.unshift(newTask);

        // Add activity log
        activityLogs[newTask.id] = [{
            id: 'log-' + Date.now(),
            task_id: newTask.id,
            user_id: body.creator_id || 'admin',
            action: 'created',
            field_name: '',
            old_value: '',
            new_value: '',
            created_at: new Date().toISOString(),
        }];

        return NextResponse.json({ status: 'success', data: newTask });
    } catch (e) {
        return NextResponse.json({ status: 'error', message: 'Failed to create task' }, { status: 500 });
    }
}
