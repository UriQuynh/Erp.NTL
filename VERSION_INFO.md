# ERP NTL - Phiên bản 04/2026

## Thông tin phiên bản
- **Ngày lưu trữ**: 04/04/2026 16:45 (GMT+7)
- **Phiên bản production**: Vercel deployment `erp-llulcpjwl` (27/03/2026 13:21)
- **URL Production**: https://erp-ntl.vercel.app/
- **Deployment ID**: `dpl_3AWowoCB86xjsXMfcTf7ACaVJY5a`

## Kiến trúc
- **Frontend**: Next.js 16.2.1 (Turbopack)
- **Backend**: Google Apps Script (GAS)
- **Database**: Google Sheets (Spreadsheet ID: `1QjelpEElXH-0fxYO4puGA4rwcbhvX4Uc7ucuZqWH9UQ`)
- **TMS Spreadsheet**: `13WVfTdZD4lzhoEeFINM3TsRmg0cz1DFpQ9Jut1MYP1U`
- **Hosting**: Vercel (uriquynhs-projects/erp-ntl)

## Các module chính
| Module | Route | Mô tả |
|--------|-------|-------|
| Dashboard | `/` | Tổng quan, biểu đồ, top nhân viên |
| Task Manager | `/task/orders` | Giao việc, quản lý công việc |
| HRM | `/hrm` | Quản lý nhân sự (339 NV, 4 phòng ban) |
| TMS Booking | `/tms/booking` | Điều phối xe & CI/CO |
| TMS Fleet | `/tms/fleet` | Danh sách xe |
| TMS Pricing | `/tms/pricing` | Bảng giá |
| Finance | `/finance` | Tài chính |
| Payroll | `/payroll` | Lương năng suất |
| Permissions | `/permissions` | Phân quyền RBAC |

## Cách chạy
```bash
npm install
npm run dev
# Truy cập http://localhost:3000
```

## Lưu ý
- File `.env.local` chứa các biến môi trường cần thiết
- Cần Google Sheets được share public (Anyone with the link can view)
- Deploy: `npx vercel --prod --yes`
