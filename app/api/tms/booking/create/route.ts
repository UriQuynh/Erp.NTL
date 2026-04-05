import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // Basic validation
        if (!body.Du_An || !body.Diem_Nhan || !body.Diem_Giao) {
            return NextResponse.json(
                { success: false, error: 'Thiếu thông tin bắt buộc' },
                { status: 400 }
            );
        }

        // 1. Simulate Google Apps Script Webhook call
        // In a real implementation, you would post to the GAS deployment URL 
        // to record data directly into the '1.Data_Xe_PhieuBK' sheet.
        const WEBHOOK_MOCK_URL = 'https://jsonplaceholder.typicode.com/posts'; // Sample mock URL

        const webhookResponse = await fetch(WEBHOOK_MOCK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!webhookResponse.ok) {
            throw new Error(`Webhook failed. Status: ${webhookResponse.status}`);
        }

        const data = await webhookResponse.json();

        // Simulating artificial delay to show loading state nicely
        await new Promise(resolve => setTimeout(resolve, 800));

        return NextResponse.json({
            success: true,
            message: 'Tạo Booking thành công',
            data: {
                ...body,
                webhookId: data.id // captured from fake mock
            }
        });

    } catch (error) {
        console.error('Create Booking failed:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
