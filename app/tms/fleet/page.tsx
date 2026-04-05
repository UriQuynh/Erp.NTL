'use client';
import { useState, useMemo } from 'react';
import { useERPAuth } from '@/lib/auth';
import { Search, Plus, Truck, MapPin, Fuel, Calendar, Shield, Eye, Edit3, RefreshCw, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Đang hoạt động', color: '#059669', bg: '#ECFDF5', dot: '🟢' },
  { value: 'maintenance', label: 'Đang bảo trì', color: '#D97706', bg: '#FFFBEB', dot: '🟡' },
  { value: 'inactive', label: 'Ngưng hoạt động', color: '#DC2626', bg: '#FEF2F2', dot: '🔴' },
];

const VEHICLES = [
  { id: 'V001', bienSo: '51H-331.05', loaiXe: '10 tấn', kichThuoc: '9.45m x 2.35m x 2.4m', taiXe: 'Nguyễn Văn A', sdt: '0901234567', ncc: 'NCC Phú Thành', trangThai: 'active', nhieuLieu: 'Diesel', kmHienTai: 125400, baoTriTiep: '15/04/2026', bhBD: '30/06/2026', dangKy: '30/09/2026', kmCuoi: '01/04/2026', viTri: 'KCN VSIP, Bình Dương' },
  { id: 'V002', bienSo: '60H-987.12', loaiXe: '15 tấn', kichThuoc: '9.6m x 2.4m x 2.5m', taiXe: 'Trần Văn B', sdt: '0912345678', ncc: 'NCC Phú Thành', trangThai: 'active', nhieuLieu: 'Diesel', kmHienTai: 98200, baoTriTiep: '20/04/2026', bhBD: '31/07/2026', dangKy: '31/12/2026', kmCuoi: '31/03/2026', viTri: 'Cảng Cát Lái, HCM' },
  { id: 'V003', bienSo: '62H-123.45', loaiXe: '5 tấn', kichThuoc: '6m x 2.1m x 2m', taiXe: 'Lê Văn C', sdt: '0923456789', ncc: 'NCC Việt Nhật', trangThai: 'maintenance', nhieuLieu: 'Diesel', kmHienTai: 78300, baoTriTiep: '05/04/2026', bhBD: '28/05/2026', dangKy: '31/08/2026', kmCuoi: '30/03/2026', viTri: 'Garage NCC VN - Q.12' },
  { id: 'V004', bienSo: '51C-222.33', loaiXe: '3.5 tấn', kichThuoc: '4.3m x 1.8m x 1.8m', taiXe: 'Hoàng Văn E', sdt: '0934567890', ncc: 'NCC Đông Á', trangThai: 'active', nhieuLieu: 'Diesel', kmHienTai: 45600, baoTriTiep: '25/04/2026', bhBD: '15/08/2026', dangKy: '30/11/2026', kmCuoi: '01/04/2026', viTri: 'Hub PEGA - Tân Bình' },
  { id: 'V005', bienSo: '60H-456.78', loaiXe: '15 tấn', kichThuoc: '9.6m x 2.4m x 2.5m', taiXe: 'Phạm Văn D', sdt: '0945678901', ncc: 'NCC Hải Phong Logistics', trangThai: 'active', nhieuLieu: 'Diesel', kmHienTai: 156800, baoTriTiep: '10/04/2026', bhBD: '30/04/2026', dangKy: '30/06/2026', kmCuoi: '31/03/2026', viTri: 'KCN Đồng Nai' },
  { id: 'V006', bienSo: '51D-888.99', loaiXe: '1.5 tấn', kichThuoc: '3.1m x 1.6m x 1.7m', taiXe: 'Đỗ Văn F', sdt: '0956789012', ncc: 'NCC Đông Á', trangThai: 'inactive', nhieuLieu: 'Xăng', kmHienTai: 210500, baoTriTiep:'N/A', bhBD: 'Hết hạn', dangKy: 'Hết hạn', kmCuoi: '15/02/2026', viTri: 'Bãi xe Bình Chánh' },
];

export default function FleetPage() {
  const { isAuthenticated } = useERPAuth();
  const [vehicles] = useState(VEHICLES);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  const filtered = useMemo(() => vehicles.filter(v => {
    if (search) {
      const s = search.toLowerCase();
      if (!v.bienSo.toLowerCase().includes(s) && !v.taiXe.toLowerCase().includes(s) && !v.ncc.toLowerCase().includes(s) && !v.loaiXe.toLowerCase().includes(s)) return false;
    }
    if (statusFilter && v.trangThai !== statusFilter) return false;
    return true;
  }), [vehicles, search, statusFilter]);

  const stats = useMemo(() => ({
    total: vehicles.length,
    active: vehicles.filter(v => v.trangThai === 'active').length,
    maintenance: vehicles.filter(v => v.trangThai === 'maintenance').length,
    inactive: vehicles.filter(v => v.trangThai === 'inactive').length,
  }), [vehicles]);

  if (!isAuthenticated) return null;

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2"><Truck className="text-red-500" size={24} /> Quản lý Đội xe</h1>
          <p className="text-sm text-slate-500 mt-0.5">{stats.total} xe • {stats.active} đang hoạt động</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-3 flex items-center gap-1.5 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50"><RefreshCw size={14} /> <span className="hidden sm:inline">Sync</span></button>
          <button className="h-9 px-4 flex items-center gap-2 text-sm font-semibold text-white rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #DC2626, #991B1B)' }}><Plus size={14} /> Thêm xe</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {STATUS_OPTIONS.map(s => (
          <button key={s.value} onClick={() => setStatusFilter(statusFilter === s.value ? '' : s.value)} className={`glass-card rounded-xl p-4 text-left transition-all ${statusFilter === s.value ? 'ring-2' : ''}`} style={statusFilter === s.value ? { borderColor: s.color, ['--tw-ring-color' as string]: s.color + '40' } : {}}>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1">{s.dot} {s.label}</p>
            <p className="text-2xl font-extrabold mt-1" style={{ color: s.color }}>{vehicles.filter(v => v.trangThai === s.value).length}</p>
          </button>
        ))}
      </div>

      <div className="glass-card rounded-2xl">
        <div className="p-3 sm:p-4">
          <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm biển số, tài xế, NCC..." className="w-full h-10 pl-9 pr-4 text-sm bg-slate-50/80 border border-slate-200/80 rounded-xl text-slate-700 placeholder-slate-400 focus:bg-white transition-all" /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-y border-slate-100 bg-slate-50/50">
              {['Biển số', 'Loại xe', 'Tài xế', 'NCC', 'Trạng thái', 'KM hiện tại', 'Bảo trì tiếp', 'Vị trí cuối', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((v, i) => {
                const st = STATUS_OPTIONS.find(s => s.value === v.trangThai) || STATUS_OPTIONS[0];
                const isNearMaintenance = v.baoTriTiep !== 'N/A' && (() => { const p = v.baoTriTiep.split('/'); const d = new Date(+p[2], +p[1]-1, +p[0]); return d.getTime() - Date.now() < 7 * 86400000; })();
                return (
                  <tr key={v.id} className="border-b border-slate-50 hover:bg-sky-50/30 transition-colors animate-fade-in" style={{ animationDelay: `${i * 20}ms` }}>
                    <td className="px-4 py-3"><span className="font-mono text-sm font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{v.bienSo}</span></td>
                    <td className="px-4 py-3"><div><span className="text-slate-700 font-medium">{v.loaiXe}</span><p className="text-[11px] text-slate-400">{v.kichThuoc}</p></div></td>
                    <td className="px-4 py-3"><div><span className="text-slate-700">{v.taiXe}</span><p className="text-[11px] text-slate-400">{v.sdt}</p></div></td>
                    <td className="px-4 py-3 text-slate-600">{v.ncc}</td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold" style={{ color: st.color, background: st.bg }}>{st.dot} {st.label}</span></td>
                    <td className="px-4 py-3 text-slate-600 font-mono">{v.kmHienTai.toLocaleString('vi-VN')} km</td>
                    <td className="px-4 py-3"><span className={`text-xs ${isNearMaintenance ? 'text-amber-600 font-semibold' : 'text-slate-500'}`}>{isNearMaintenance && <AlertTriangle size={12} className="inline mr-1" />}{v.baoTriTiep}</span></td>
                    <td className="px-4 py-3"><span className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={11} />{v.viTri}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelectedVehicle(v)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50"><Eye size={14} /></button>
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-sky-700 hover:bg-sky-50"><Edit3 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vehicle Detail Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedVehicle(null)}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-red-50 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #DC2626, #991B1B)' }}><Truck size={20} color="#fff" /></div>
                <div><h2 className="text-lg font-bold text-slate-800">{selectedVehicle.bienSo}</h2><p className="text-xs text-slate-500">{selectedVehicle.loaiXe} — {selectedVehicle.kichThuoc}</p></div>
              </div>
              <button onClick={() => setSelectedVehicle(null)} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:text-red-500"><XCircle size={16} /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              {[
                { label: 'Tài xế', value: selectedVehicle.taiXe, sub: selectedVehicle.sdt },
                { label: 'NCC', value: selectedVehicle.ncc },
                { label: 'Nhiên liệu', value: selectedVehicle.nhieuLieu, icon: <Fuel size={14} /> },
                { label: 'KM hiện tại', value: `${selectedVehicle.kmHienTai.toLocaleString('vi-VN')} km` },
                { label: 'Bảo trì tiếp theo', value: selectedVehicle.baoTriTiep, icon: <Calendar size={14} /> },
                { label: 'BH Bắt Đầu', value: selectedVehicle.bhBD, icon: <Shield size={14} /> },
                { label: 'Đăng ký', value: selectedVehicle.dangKy },
                { label: 'Vị trí cuối', value: selectedVehicle.viTri, icon: <MapPin size={14} /> },
              ].map((f, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">{f.icon}{f.label}</p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">{f.value}</p>
                  {f.sub && <p className="text-[11px] text-slate-400">{f.sub}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
