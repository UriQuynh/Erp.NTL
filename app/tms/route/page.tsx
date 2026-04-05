'use client';
import { useState, useMemo } from 'react';
import { useERPAuth } from '@/lib/auth';
import { Search, Plus, Map, ArrowRight, DollarSign, Edit3, Trash2, RefreshCw, Download, Upload, Filter, MapPin } from 'lucide-react';

const ROUTES = [
  { id: 'R001', tuyen: 'HCM - Bình Dương', diemDi: 'Quận 7, HCM', diemDen: 'KCN VSIP, Bình Dương', khoangCach: 45, thoiGian: '1h30', loaiXe: '10 tấn', donGia: 2500000, ncc: 'NCC Phú Thành', ghiChu: '' },
  { id: 'R002', tuyen: 'HCM - Đồng Nai', diemDi: 'Cảng Cát Lái, HCM', diemDen: 'KCN Biên Hòa, Đồng Nai', khoangCach: 35, thoiGian: '1h15', loaiXe: '15 tấn', donGia: 3200000, ncc: 'NCC Hải Phong Logistics', ghiChu: '' },
  { id: 'R003', tuyen: 'HCM - Long An', diemDi: 'Quận 8, HCM', diemDen: 'KCN Long An', khoangCach: 60, thoiGian: '2h', loaiXe: '5 tấn', donGia: 1800000, ncc: 'NCC Việt Nhật', ghiChu: '' },
  { id: 'R004', tuyen: 'Nội thành HCM', diemDi: 'Hub PEGA - Tân Bình', diemDen: 'Quận 1 - Trung tâm', khoangCach: 8, thoiGian: '30p', loaiXe: '3.5 tấn', donGia: 450000, ncc: 'NCC Đông Á', ghiChu: 'Last mile' },
  { id: 'R005', tuyen: 'HCM - Tây Ninh', diemDi: 'Quận 12, HCM', diemDen: 'KCN Trảng Bàng, Tây Ninh', khoangCach: 85, thoiGian: '2h30', loaiXe: '10 tấn', donGia: 4500000, ncc: 'NCC Phú Thành', ghiChu: '' },
  { id: 'R006', tuyen: 'HCM - Bình Phước', diemDi: 'Thủ Đức, HCM', diemDen: 'Đồng Xoài, Bình Phước', khoangCach: 120, thoiGian: '3h', loaiXe: '15 tấn', donGia: 5800000, ncc: 'NCC Hải Phong Logistics', ghiChu: 'Đường núi' },
  { id: 'R007', tuyen: 'Nội thành HCM', diemDi: 'Hub PEGA - Tân Bình', diemDen: 'Quận 7 - Phú Mỹ Hưng', khoangCach: 15, thoiGian: '45p', loaiXe: '3.5 tấn', donGia: 550000, ncc: 'NCC Đông Á', ghiChu: 'Last mile' },
  { id: 'R008', tuyen: 'HCM - Vũng Tàu', diemDi: 'Cảng Cát Lái, HCM', diemDen: 'KCN Phú Mỹ, Vũng Tàu', khoangCach: 95, thoiGian: '2h15', loaiXe: '15 tấn', donGia: 5200000, ncc: 'NCC Phú Thành', ghiChu: '' },
];

const fmt = (n: number) => n.toLocaleString('vi-VN') + '₫';

export default function RoutePricingPage() {
  const { isAuthenticated } = useERPAuth();
  const [routes] = useState(ROUTES);
  const [search, setSearch] = useState('');
  const [filterNCC, setFilterNCC] = useState('');
  const [filterLoaiXe, setFilterLoaiXe] = useState('');

  const nccs = useMemo(() => [...new Set(routes.map(r => r.ncc))].sort(), [routes]);
  const loaiXes = useMemo(() => [...new Set(routes.map(r => r.loaiXe))].sort(), [routes]);

  const filtered = useMemo(() => routes.filter(r => {
    if (search) { const s = search.toLowerCase(); if (!r.tuyen.toLowerCase().includes(s) && !r.diemDi.toLowerCase().includes(s) && !r.diemDen.toLowerCase().includes(s)) return false; }
    if (filterNCC && r.ncc !== filterNCC) return false;
    if (filterLoaiXe && r.loaiXe !== filterLoaiXe) return false;
    return true;
  }), [routes, search, filterNCC, filterLoaiXe]);

  if (!isAuthenticated) return null;

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2"><Map className="text-violet-500" size={24} /> Tuyến đường & Bảng giá</h1>
          <p className="text-sm text-slate-500 mt-0.5">{routes.length} tuyến đường — {nccs.length} nhà cung cấp</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-3 flex items-center gap-1.5 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50"><Upload size={14} /> Import</button>
          <button className="h-9 px-3 flex items-center gap-1.5 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50"><Download size={14} /> Export</button>
          <button className="h-9 px-4 flex items-center gap-2 text-sm font-semibold text-white rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}><Plus size={14} /> Thêm tuyến</button>
        </div>
      </div>

      <div className="glass-card rounded-2xl">
        <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tuyến đường, điểm đi/đến..." className="w-full h-10 pl-9 pr-4 text-sm bg-slate-50/80 border border-slate-200/80 rounded-xl text-slate-700 placeholder-slate-400 focus:bg-white transition-all" /></div>
          <select value={filterNCC} onChange={e => setFilterNCC(e.target.value)} className="h-10 px-3 text-sm border border-slate-200 rounded-xl bg-white text-slate-600 cursor-pointer"><option value="">Tất cả NCC</option>{nccs.map(n => <option key={n} value={n}>{n}</option>)}</select>
          <select value={filterLoaiXe} onChange={e => setFilterLoaiXe(e.target.value)} className="h-10 px-3 text-sm border border-slate-200 rounded-xl bg-white text-slate-600 cursor-pointer"><option value="">Tất cả loại xe</option>{loaiXes.map(l => <option key={l} value={l}>{l}</option>)}</select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-y border-slate-100 bg-slate-50/50">
              {['Tuyến đường', 'Điểm đi → Điểm đến', 'Loại xe', 'Khoảng cách', 'Thời gian', 'Đơn giá', 'NCC', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-violet-50/30 transition-colors animate-fade-in" style={{ animationDelay: `${i * 20}ms` }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}><Map size={14} color="#fff" /></span><span className="font-semibold text-slate-800">{r.tuyen}</span></div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-xs">
                      <MapPin size={11} className="text-emerald-500" /><span className="text-slate-600 max-w-[130px] truncate">{r.diemDi}</span>
                      <ArrowRight size={10} className="text-slate-400 mx-0.5" />
                      <MapPin size={11} className="text-red-500" /><span className="text-slate-600 max-w-[130px] truncate">{r.diemDen}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{r.loaiXe}</span></td>
                  <td className="px-4 py-3 text-slate-600">{r.khoangCach} km</td>
                  <td className="px-4 py-3 text-slate-500">{r.thoiGian}</td>
                  <td className="px-4 py-3"><span className="font-bold text-violet-700">{fmt(r.donGia)}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-600">{r.ncc}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50"><Edit3 size={14} /></button>
                      <button className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
