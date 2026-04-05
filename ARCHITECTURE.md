================================================================================
ERP NTL v2 — COMPLETE ARCHITECTURE & CODEBASE GUIDE
================================================================================
Version   : 04.2026
Repo      : https://github.com/UriQuynh/Erp.NTL.git
Deploy    : https://erp-ntlv2.vercel.app
Local     : http://localhost:3000
Updated   : 2026-04-05

================================================================================
I. TECH STACK & FRAMEWORK
================================================================================

Framework     : Next.js 16.2.1 (App Router, Turbopack dev)
Language      : TypeScript 5+
React         : 19.2.4
Styling       : TailwindCSS 4 + Vanilla CSS (globals.css)
State Mgmt    : Zustand 5.0.12 (auth store)
Icons         : lucide-react 0.577.0
Excel Export  : xlsx 0.18.5
Font          : Inter (Google Fonts, loaded in layout.tsx)
Hosting       : Vercel (vercel.json present)
Data Backend  : Google Sheets (Gviz API read) + Google Apps Script (GAS write)
Package Mgr   : npm

## Key Commands
```
npm run dev    # Start local dev server (Turbopack)  
npm run build  # Production build  
npm run start  # Start production server  
```

================================================================================
II. PROJECT FILE STRUCTURE
================================================================================

```
C:\Users\Windows\.gemini\antigravity\scratch\4.4.2026\
│
├── app/                          # Next.js App Router (pages + API routes)
│   ├── layout.tsx                # Root layout: Inter font, metadata, <ClientLayout>
│   ├── client-layout.tsx         # Client-side shell: auth guard, sidebar, 403 page
│   ├── globals.css               # 827 lines — full design system (see §IV)
│   ├── page.tsx                  # Dashboard (34KB) — charts, stats, quick links
│   ├── login/page.tsx            # Login form (authenticates via /api/auth/employees)
│   │
│   ├── tms/                      # ═══ TMS MODULE (Transport Management) ═══
│   │   ├── page.tsx              # TMS hub — module cards for sub-modules
│   │   ├── booking/
│   │   │   ├── page.tsx          # Booking LIST — date sidebar, data table, filters
│   │   │   ├── create/page.tsx   # Create Booking form — project dropdown, auto-fill
│   │   │   └── [id]/page.tsx     # Booking DETAIL — header form, computed finance,
│   │   │                         #   trip table, "+ Thêm Chuyến" modal
│   │   ├── fleet/page.tsx        # Fleet management (xe + tài xế)
│   │   ├── pricing/page.tsx      # Pricing tables (NCC pricing)
│   │   ├── billing/page.tsx      # Billing & reconciliation
│   │   ├── route/page.tsx        # Route management
│   │   ├── bill-do/page.tsx      # Bill DO (placeholder)
│   │   ├── print-labels/page.tsx # Print labels (placeholder)
│   │   ├── telegram/page.tsx     # Telegram bot config (placeholder)
│   │   └── zalo/page.tsx         # Zalo OA config (placeholder)
│   │
│   ├── hrm/                      # ═══ HRM MODULE (Human Resources) ═══
│   │   ├── page.tsx              # Employee list, search, detail view (29KB)
│   │   └── training/page.tsx     # Training (placeholder)
│   │
│   ├── tasks/page.tsx            # ═══ TASK MANAGER (49KB) — project boards ═══
│   ├── orders/page.tsx           # ═══ ORDERS/GIAO VIỆC (135KB) — full CRUD ═══
│   ├── my-tasks/page.tsx         # Personal task view
│   ├── calendar/page.tsx         # Work calendar (33KB)
│   │
│   ├── payment/page.tsx          # Payment management (placeholder)
│   ├── payroll/page.tsx          # Payroll (placeholder)
│   ├── finance/page.tsx          # Finance (placeholder)
│   ├── documents/page.tsx        # Document management (placeholder)
│   ├── workflow/page.tsx         # Workflow (placeholder)
│   ├── kpi/page.tsx              # KPI (placeholder)
│   ├── permissions/              # Permission management (placeholder)
│   │   ├── page.tsx
│   │   └── active-users/page.tsx
│   └── task/                     # Legacy task routes → redirect stubs
│       ├── orders/page.tsx
│       ├── my-tasks/page.tsx
│       ├── work-calendar/page.tsx
│       └── settings/
│           ├── page.tsx
│           └── email/page.tsx
│
│   ├── api/                      # ═══ API ROUTES (Server-side) ═══
│   │   ├── auth/employees/route.ts   # Proxy → V1 erp-ntl.vercel.app/api/sync
│   │   ├── hris/route.ts            # HRIS employee data fetch
│   │   ├── orders/route.ts          # Orders CRUD (13KB)
│   │   ├── projects/route.ts        # Projects list
│   │   ├── sheets/
│   │   │   ├── route.ts             # Generic sheet reader (Gviz)
│   │   │   └── write/route.ts       # Generic sheet writer (GAS webhook)
│   │   ├── sync/route.ts            # Cross-version sync endpoint
│   │   ├── tasks/
│   │   │   ├── route.ts             # Tasks CRUD (7.5KB)
│   │   │   └── [id]/
│   │   │       ├── route.ts         # Single task CRUD
│   │   │       └── comments/route.ts # Task comments
│   │   ├── tms/
│   │   │   ├── booking/
│   │   │   │   ├── route.ts         # GET: fetch & aggregate PhieuBK + BK trips
│   │   │   │   └── create/route.ts  # POST: create booking (GAS + Sheets fallback)
│   │   │   └── groups/route.ts      # GET: fetch GroupCV project list
│   │   └── upload-image/            # (placeholder)
│
├── components/
│   ├── Sidebar.tsx               # Collapsible sidebar — nav tree, RBAC filtering
│   ├── ModulePage.tsx            # Reusable module page wrapper
│   └── tasks/
│       └── TaskDetail.tsx        # Task detail modal (54KB)
│
├── lib/
│   ├── auth.ts                   # Auth store (Zustand), RBAC path/module checks
│   ├── google-sheets.ts          # Gviz + CSV fetch utilities, type defs
│   ├── rbac.ts                   # Role-Based Access Control logic
│   └── mock-data.ts              # Mock/seed data for dev
│
├── public/
│   └── favicon.ico
│
├── .env.local                    # Vercel OIDC token (auto-generated)
├── package.json
├── tsconfig.json
├── next.config.ts                # Empty (no custom config)
├── vercel.json                   # Vercel deployment config
└── README.md
```

================================================================================
III. DATA LAYER — GOOGLE SHEETS (Gviz + GAS)
================================================================================

### A. Read Path (Gviz API — No Auth Required for Public Sheets)

Core library: `lib/google-sheets.ts`

SPREADSHEET IDs:
  - Main (Tasks/HR)   : 1QjelpEElXH-0fxYO4puGA4rwcbhvX4Uc7ucuZqWH9UQ
  - TMS (Booking/BK)  : 13WVfTdZD4lzhoEeFINM3TsRmg0cz1DFpQ9Jut1MYP1U

Key functions:
```
fetchViaGviz(sheetName, query?, spreadsheetId?)   → Record<string,string>[]
fetchSheetRaw(sheetNameOrGid, spreadsheetId?)      → string[][]  (header+data)
fetchSheet<T>(sheetNameOrGid, spreadsheetId?)       → T[]          (typed objects)
```

Strategy:
  1. Try Gviz first (uses SQL-like queries, works with "viewable" sheets)
  2. Fallback to CSV export (/export?format=csv&gid=...)
  3. Parse response: strip Google JSONP wrapper → extract cols/rows → map to objects

Known GID mappings (SHEET_GIDS constant):
  FIle_Luong:722934013, Fillter_Task:823153237, Ngan_Hang:1143977570,
  Task_List:1948162682, Khoan:580487256, GroupCV:138469474,
  Home:1879779896, Home_HR:1163308007, Home_FN:886398907,
  Home_TRUCK:1486624865, issue:1322821574, BANGLUONG:441566009,
  Khoan_2:106835407, KPI:1670239221, Nang_Suat:1317019271,
  Khoan_OT:1902869033

### B. Write Path (GAS Webhook)

Pattern: POST to GAS URL with Content-Type: text/plain (bypasses CORS preflight)

API route: `app/api/sheets/write/route.ts`
  - Receives JSON body from frontend
  - Forwards as text/plain POST to GAS_WEBHOOK_URL env variable
  - GAS script decodes JSON → appends row to target sheet

TMS-specific write: `app/api/tms/booking/create/route.ts`
  - Sends to TMS_GAS_URL env variable
  - Fallback: Google Sheets API v4 (requires GOOGLE_SHEETS_API_KEY)

### C. Sheet Schemas (TypeScript Interfaces in google-sheets.ts)

**1.Data_Xe_PhieuBK** (Booking Header — Parent):
  ID, Ngay, Du_An, Diem_Nhan, Tai_Tong, Don_Gia_KH, Don_Gia_NCC,
  Loi_Nhuan, Note, NV_Update, Trong_Luong

**1.Data_Xe_BK** (Trip Detail — Child, FK=ID_PXK):
  ID_PXK(FK), ID, Ngay, Du_AnBC, Dia_Chi_Nhan, Dia_Chi_Giao,
  Nguoi_YC, Thoi_Gian_BK, Thoi_Gian_Den, Thoi_Gian_Xuat,
  Thoi_Gian_DenKho, Thoi_Gian_HoanThanh, Loai_Hang, Thong_Tin,
  So_Bill, Bien_So, Loai_Xe, Loai_xe_YC, Hinh_Anh1-4,
  Trang_Thai, Tai_Xe, Trong_Luong, Leadtime,
  NCC, Don_Gia, Phi_Khac, Cuoc_Thu_KH, Cuoc_Khac_Thu_KH,
  Code, Tuyen, Map

**Task_List** (Task/Work Log):
  ID_Date_Task, Ngay_Lam_Viec, Nhan_Vien, Group_CV, Cong_Viec,
  Chi_Tiet, Dia_Chi, Time_YeuCau, Time_in, Time_Out, Local_in,
  Local_out, HA_IN, HA_OUT, Phi, Phi_Khac, Confirm_Task,
  Cham_Cong, Nguoi_Tao, Tinh_Trang_TT, QR_Code, QR_IMAGE

**Ngan_Hang** (Employee Master):
  Avatar, M_NV, H_tn, MSNVHo_Tn, Gii_tnh, Chc_Danh,
  B_phn, Phng_ban, Chi_Nhnh, Bu_Cc, Trang_Thi, in_Thoi, Email

**GroupCV** (Project/Work Group Definitions):
  GROUP, Dia_Chi, Loai_Khai_Thac, Khoan

### D. TMS API Aggregation Logic

GET /api/tms/booking — Booking list with computed fields:
  1. Fetch PhieuBK + BK concurrently
  2. Group trips by ID_PXK → tripsByBooking map
  3. For each PhieuBK:
     - Parse VND amounts: Cuoc_Thu_KH, Cuoc_Khac_Thu_KH, Don_Gia, Phi_Khac
     - Compute: Tong_Thu = Σ(Cuoc_Thu_KH + Cuoc_Khac_Thu_KH)
     - Compute: Tong_Tra_NCC = Σ(Don_Gia + Phi_Khac)
     - Compute: Profit = Tong_Thu - Tong_Tra_NCC
     - Compute: NCCs = unique NCC list (stripped "NCC_" prefix)
     - Parse NV_Update: "MaNV - HoTen" → { maNV, hoTen }
     - Deduplicate by ID_CODE via Map

================================================================================
IV. DESIGN SYSTEM (globals.css + inline tokens)
================================================================================

### A. CSS Variables (:root)
```css
--primary:        #1D354D     /* Navy — sidebar, active states */
--primary-light:  #2A4A6B
--primary-dark:   #142536
--accent:         #FFC500     /* Yellow/Gold — NTL brand */
--accent-light:   #FFD740
--link-color:     #1677FF     /* Links */
--gradient-primary: linear-gradient(135deg, #1D354D → #2A4A6B → #1D354D)
--gradient-warm:    linear-gradient(135deg, #FFC500 → #FFB300)
```

### B. TMS-Specific Design Tokens (inline in TMS pages)
```
Primary Blue   : #1E3A5F   (header, sidebar active, button primary)
Accent Gold    : #F5A623   (section labels, badges, icon highlights)
Accent Yellow  : #F5C518   (CTA buttons like "+ Thêm Chuyến")
Success Green  : #27AE60 / #16A34A
Danger Red     : #E74C3C / #DC2626
Warning Orange : #E67E22
Background     : #F0F2F5
Card           : #FFFFFF
Border         : #E8ECF0
Text           : #1A1A2E
Muted          : #9CA3AF
```

### C. CSS Utility Classes
```
.glass-card        — White card with subtle shadow (#fff, border #e2e8f0)
.glass-card-hover  — Card with hover lift animation
.animate-fade-in   — Fade in + translate up (0.5s)
.animate-scale-up  — Scale modal appearance
.animate-shimmer   — Skeleton loading gradient
.animate-gradient  — Background gradient rotation
.btn-primary       — Navy button with glow shadow
.table-row-hover   — Gradient highlight on table row hover
.auto-container    — Responsive max-width container
.mobile-card-table — Transform table to card layout on mobile
```

### D. Dark Mode
Full dark mode support via `html.dark` class with overrides for .glass-card,
text colors, input fields, table styling, etc.

================================================================================
V. AUTHENTICATION & AUTHORIZATION
================================================================================

### A. Auth Store (lib/auth.ts — Zustand)

Store: `useERPAuth` (aliased as `useAuth`)
State: { user: TaskUser | null, isAuthenticated: boolean }
Methods: login(user), logout(), canAccess(moduleId), canAccessPath(path)

Storage keys (localStorage, synced for backward compat):
  - erp_auth    (primary, V2)
  - task_auth   (legacy V1)
  - crm_auth    (legacy CRM format)

### B. Login Flow
1. User enters MaNV + password on /login
2. Frontend calls GET /api/auth/employees (proxy)
3. Proxy fetches from https://erp-ntl.vercel.app/api/sync?module=employees
4. Frontend matches maNV + password → stores user in localStorage
5. Redirect to getFirstAccessiblePath(user)

### C. Role-Based Access Control (lib/rbac.ts + lib/auth.ts)

Roles: Admin, Host, HRM, TMS, AQ, CTV, staft, Manager, Điều Phối

Module → Role mapping (MODULE_ROLE_MAP):
  'dashboard'    → Admin, Host, manager, AQ
  'tms'          → Admin, Host, tms, TMS, manager, AQ
  'tms-booking'  → Admin, Host, tms, TMS, AQ
  'hrm'          → Admin, Host, hrm, HRM, manager
  'task'         → Admin, Host, task, staft, CTV, manager, AQ
  'finance'      → Admin, Host, finance
  'permissions'  → Admin, Host
  ...

Path → Module → canAccess() flow in client-layout.tsx:
  1. Check if path is public (/login) → allow
  2. Check if authenticated → redirect to /login
  3. Map path → moduleId → check canAccessModule(user, moduleId)
  4. If forbidden → show 403 page with user info + "Đăng xuất" button
  5. CTV/staft at root → auto-redirect to /task/orders

### D. RBAC Task Filtering (lib/rbac.ts)
  - Admin/Host: see ALL tasks
  - Nguoi_Tao (creator): see tasks they created
  - Điều Phối: see tasks of employees in same Bưu Cục
  - Employee: see only their own assigned tasks

================================================================================
VI. APP SHELL & NAVIGATION
================================================================================

### Layout Chain
```
RootLayout (app/layout.tsx) — <html lang="vi">, Inter font, metadata
  └── ClientLayout (app/client-layout.tsx) — auth guard, sidebar
        ├── Sidebar (components/Sidebar.tsx) — collapsible, RBAC-filtered nav
        └── <main> — page content with marginLeft=sidebar width
```

### Sidebar Navigation Tree (components/Sidebar.tsx, SIDEBAR_NAV array)
```
📊 Bảng điều khiển        /
🚛 TMS
   ├── Điều phối & CI/CO  /tms/booking
   └── Tuyến đường         /tms/route
📦 Vận hành
   ├── Trung tâm Đơn hàng /tms
   ├── Cước phí            /tms/billing
   ├── Bảng giá            /tms/pricing
   ├── Danh sách xe        /tms/fleet
   ├── Tạo Bill DO         /tms/bill-do
   └── In Tem Kiện         /tms/print-labels
👥 Nhân sự (HRM)
   ├── Quản Lý Nhân Sự    /hrm
   ├── KPI & Năng suất    /kpi
   └── Đào tạo            /hrm/training
📋 Quản lý dự án
   ├── Task Manager        /tasks
   ├── Giao việc           /task/orders
   ├── Nhiệm vụ của tôi   /task/my-tasks
   └── Lịch Công tác      /task/work-calendar
⚡ Workflow               /workflow
💰 Thanh Toán Chi Phí    /payment
🧮 Lương Năng Suất       /payroll
📄 Quản lý Chứng từ      /documents
💵 Tài chính              /finance
⚙️ Cấu hình
   ├── Phân quyền         /permissions
   ├── Người dùng Online  /permissions/active-users
   ├── Thông báo Zalo     /tms/zalo
   ├── Thông báo Telegram /tms/telegram
   ├── Email              /task/settings/email
   └── Cài đặt            /task/settings
```

Sidebar CSS: white bg (#fff), border-right #e2e8f0, collapsed=72px / expanded=260px.
Active state: bg-[#0A1D37] text-white. Logo: Yellow circle + "ERP.NTL".

================================================================================
VII. TMS MODULE — DETAILED ARCHITECTURE
================================================================================

### A. Booking List (app/tms/booking/page.tsx — 27KB)

Layout: 2-Panel
  Left Sidebar (188px): Date list with counts, sorted desc by date
  Main Area:
    Toolbar: Day-filter pills (Hôm nay / 3 ngày / 7 ngày / 30 ngày / Tháng này / Tất cả)
             + Refresh, Excel, Bảng Kê, "+ Tạo Booking" buttons
    Stat Bar: Tổng Phiếu, Chưa Có Xe, Hoàn Tất, Tổng Thu, Lợi Nhuận
              + Status filter pills (Tất cả / Chưa Có Xe / Chưa Hoàn Tất / Hoàn Tất)
    Search:   Input field "Tìm ID, Dự án, NV..."
    Table:    Ngày | Dự Án | Lợi Nhuận | Điểm Nhận | Chuyến | Đơn Giá KH |
              Đơn Giá NCC | Trạng Thái | Note | NV Update | Thao Tác
    Actions:  Copy ID, Delete, row click → navigate to /tms/booking/[id]

Status badges:
  Chưa Có Xe   → red (#DC2626) pill
  Chưa Hoàn Tất → blue (#2563EB) pill
  Hoàn Tất      → green (#16A34A) pill

### B. Booking Detail (app/tms/booking/[id]/page.tsx — 38KB)

Page header: ← Quay lại + BANGKE_XXXXXXXX + status badge + 💾 Lưu button

Card 1 — Thông Tin Phiếu Booking:
  Row 1: Mã ID (readonly) | Dự Án (readonly) | Ngày (readonly)
  Row 2: 4 computed tiles:
    ┌─────────────┬─────────────┬─────────────┬──────────────┐
    │ ĐƠN GIÁ KH  │ ĐƠN GIÁ NCC │ LỢI NHUẬN   │ PHÁT SINH NCC│
    │ = Tong_Thu   │ = Σ Don_Gia │ = KH − NCC  │ = Σ Phi_Khac │
    └─────────────┴─────────────┴─────────────┴──────────────┘
  Row 3: Điểm Nhận | Trọng Lượng | NV Update
  Row 4: Ghi Chú (editable textarea)

Card 2 — Danh Sách Chuyến:
  Header: count + "Báo Cáo CI/CO" + "+ Thêm Chuyến" (yellow CTA)
  Table: # | ID | Biển Số | Tài Xế | Loại Xe | Điểm Nhận → Giao |
         Thu KH | Trả NCC | PS NCC | Lãi/Lỗ | NCC | Trạng Thái | 🗑
  Footer: Tổng cộng (X chuyến) with sum columns

Empty state: truck emoji + "Chưa có chuyến nào" + CTA button

### C. Add Trip Modal (embedded in [id]/page.tsx — AddTripModal component)

Sticky header: BANGKE_ID pill + Ngày date input + ⏱ BK datetime input + ✕ close
Sections:
  1. ĐỊA CHỈ & KM (BẮT BUỘC): A🔵 Điểm Nhận + B🟠 Điểm Giao (2-col grid)
  2. THÔNG TIN XE: NCC | Biển Số | Loại Xe YC (3-col grid)
  3. TÀI XẾ: Tài Xế | SĐT | Trạng Thái (auto="Chờ cập nhật") (3-col grid)
  4. NGƯỜI YÊU CẦU: auto-filled from logged-in user
  5. IMPORT DANH SÁCH VẬN ĐƠN: monospace textarea
  6. HÌNH ẢNH CHUYẾN: 4-photo upload grid (dashed borders)
  7. GHI CHÚ CHUYẾN: textarea
Sticky footer: Hủy (outline) + Lưu Chuyến (primary blue)

### D. Create Booking (app/tms/booking/create/page.tsx — 28KB)

Features:
  - Auto-generated ID: PXK_XXXXXXXX (display) / BANGKE_XXXXXXXX (backend)
  - Searchable project dropdown (GroupCV sheet)
  - Vietnamese diacritic-normalized fuzzy search
  - Auto-fill Diem_Nhan address from selected project
  - Service type + pricing badges from GroupCV data
  - Phone number validation (VN format)
  - Form validation with field-level error messages
  - Submit → POST /api/tms/booking/create

### E. TMS API Routes

GET /api/tms/booking
  - Fetches 1.Data_Xe_PhieuBK + 1.Data_Xe_BK from TMS spreadsheet
  - Joins trips by ID_PXK FK relationship
  - Computes aggregated financial fields
  - Deduplicates by ID_CODE
  - Returns { success: true, data: BookingData[] }

POST /api/tms/booking/create
  - Validates required fields (Du_An, Diem_Nhan, Diem_Giao, NV_Update)
  - Generates BANGKE_XXXXXXXX ID
  - Write strategy:
    a. POST to TMS_GAS_URL (text/plain, JSON payload)
    b. Fallback: PUT to Google Sheets API v4 (appends row)
  - Maps form fields to A-Z columns

GET /api/tms/groups
  - Fetches GroupCV sheet (project/customer definitions)
  - Uses CSV export (not Gviz) because GroupCV has no header row in row 1
  - ASCII-safe filtering to handle Windows encoding issues
  - Returns { success: true, data: GroupOption[] }

================================================================================
VIII. OTHER MODULES — STATUS
================================================================================

### Fully Implemented (Production-grade):
| Module               | Path            | Size   | Data Source                |
|----------------------|-----------------|--------|---------------------------|
| Dashboard            | /               | 34KB   | All sheets aggregated     |
| Orders / Giao Việc   | /orders         | 135KB  | Task_List + Ngan_Hang     |
| Task Manager         | /tasks          | 50KB   | Fillter_Task              |
| HRM                  | /hrm            | 29KB   | Ngan_Hang (employee list) |
| Calendar             | /calendar       | 33KB   | Task_List                 |
| Login                | /login          | 17KB   | V1 API proxy              |
| TMS Booking          | /tms/booking/*  | 93KB   | PhieuBK + BK (TMS sheet)  |
| TMS Pricing          | /tms/pricing    | 8KB    | BangGia_NCC               |
| TMS Fleet            | /tms/fleet      | 12KB   | Static + sheet data       |
| TMS Billing          | /tms/billing    | 8KB    | Computed from trips       |
| TMS Route            | /tms/route      | 8KB    | Static data               |

### Placeholder (UI only, no data integration):
  /tms/bill-do, /tms/print-labels, /tms/telegram, /tms/zalo,
  /payment, /payroll, /finance, /documents, /workflow, /kpi,
  /permissions, /permissions/active-users

================================================================================
IX. ENVIRONMENT VARIABLES
================================================================================

### Required for Production:
```
TMS_GAS_URL           # Google Apps Script webhook URL for TMS writes
GOOGLE_SHEETS_API_KEY  # Google Sheets API v4 key (write fallback)
```

### Auto-generated:
```
VERCEL_OIDC_TOKEN      # Vercel deployment token (in .env.local)
```

### Used in Code (hardcoded — no env var needed):
- Main Spreadsheet ID: 1QjelpEElXH-0fxYO4puGA4rwcbhvX4Uc7ucuZqWH9UQ
- TMS Spreadsheet ID:  13WVfTdZD4lzhoEeFINM3TsRmg0cz1DFpQ9Jut1MYP1U
- V1 Sync API:         https://erp-ntl.vercel.app/api/sync

================================================================================
X. KNOWN ISSUES & BLOCKERS
================================================================================

1. **Write Operations (TMS)**:
   In dev mode, booking create simulates success. Requires TMS_GAS_URL env
   variable in production to actually write to Google Sheets.

2. **GroupCV Sheet Structure**:
   The GroupCV sheet has NO header row in row 1 (headers are in row 0).
   This breaks Gviz API which expects row 1 headers. The /api/tms/groups
   route works around this by using raw CSV export + manual row 0 parsing.

3. **Large Dataset Truncation**:
   Gviz API truncates responses for sheets with >6,600 rows. For large
   datasets, use server-side SQL filtering in the query parameter:
   `fetchViaGviz(sheet, "SELECT * WHERE A != '' LIMIT 500")`

4. **Vercel Environment Variable Newlines**:
   GAS URLs pasted into Vercel dashboard may contain hidden newline chars.
   Always trim environment variables: `process.env.TMS_GAS_URL?.trim()`

5. **Windows Encoding**:
   Vietnamese characters in string comparisons may fail on Windows due
   to file encoding. Use ASCII-safe normalization (no diacritics in
   blacklist/filter arrays) or `.normalize('NFD').replace(...)` patterns.

6. **Caching**:
   All API routes use `export const dynamic = 'force-dynamic'` to prevent
   Turbopack/Next.js from caching stale sheet data. If data appears stale,
   add cache-busting query params: `fetch('/api/tms/booking?t=' + Date.now())`

================================================================================
XI. GIT HISTORY
================================================================================

```
ff6010b  feat(tms): complete UX/UI redesign per enterprise design system spec
cc7fc92  fix: deduplicate booking entries to prevent duplicate React keys
6731b15  ERP NTL v04.2026 - Full source code
```

Remote: https://github.com/UriQuynh/Erp.NTL.git (branch: main)

================================================================================
XII. DEVELOPMENT PATTERNS & CONVENTIONS
================================================================================

### Page Pattern
```tsx
'use client';
import { useERPAuth } from '@/lib/auth';

export default function SomePage() {
  const { isAuthenticated, user } = useERPAuth();
  if (!isAuthenticated) return null; // guard

  return ( <div className="space-y-5 max-w-[1400px] mx-auto animate-fade-in">
    {/* page content */}
  </div> );
}
```

### API Route Pattern
```ts
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await fetchSheet('SheetName', SPREADSHEET_ID);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
```

### GAS Write Pattern
```ts
const res = await fetch(GAS_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' }, // bypass CORS preflight
  body: JSON.stringify({ action: 'addPhieuBK', payload: { ... } }),
});
```

### VND Formatting
```ts
function fmtVND(n: number) { return n.toLocaleString('vi-VN'); }
function fmtCompact(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n/1_000).toFixed(0)}K`;
  return n.toLocaleString('vi-VN');
}
```

### Date Handling (GMT+7)
```ts
function getTodayVN(): string {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}
// Google Sheets uses dd/mm/yyyy format
function formatDateVN(dateStr: string): string { /* yyyy-mm-dd → dd/mm/yyyy */ }
```

================================================================================
END OF DOCUMENT
================================================================================
