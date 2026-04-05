'use client';
import { useState, useMemo } from 'react';
import { useERPAuth } from '@/lib/auth';
import { Search, DollarSign, Upload, Download, Plus, ArrowRight, Edit3, Trash2, TrendingUp, Map, Truck } from 'lucide-react';

const PRICING_DATA = [
  { id: 'BG001', ncc: 'NCC Phú Thành', loaiXe: '10 tấn', tuyenDuong: 'HCM - Bình Dương', khoangCach: 45, donGia: 2500000, donGiaKM: 55556, hieuLuc: '01/01/2026 - 31/12/2026', trangThai: 'active' },
  { id: 'BG002', ncc: 'NCC Phú Thành', loaiXe: '15 tấn', tuyenDuong: 'HCM - Đồng Nai', khoangCach: 35, donGia: 3200000, donGiaKM: 91429, hieuLuc: '01/01/2026 - 31/12/2026', trangThai: 'active' },
  { id: 'BG003', ncc: 'NCC Phú Thành', loaiXe: '10 tấn', tuyenDuong: 'HCM - Tây Ninh', khoangCach: 85, donGia: 4500000, donGiaKM: 52941, hieuLuc: '01/01/2026 - 31/12/2026', trangThai: 'active' },
  { id: 'BG004', ncc: 'NCC Phú Thành', loaiXe: '15 tấn', tuyenDuong: 'HCM - Vũng Tàu', khoangCach: 95, donGia: 5200000, donGiaKM: 54737, hieuLuc: '01/01/2026 - 31/12/2026', trangThai: 'active' },
  { id: 'BG005', ncc: 'NCC Việt Nhật', loaiXe: '5 tấn', tuyenDuong: 'HCM - Long An', khoangCach: 60, donGia: 1800000, donGiaKM: 30000, hieuLuc: '01/01/2026 - 30/06/2026', trangThai: 'active' },
  { id: 'BG006', ncc: 'NCC Đông Á', loaiXe: '3.5 tấn', tuyenDuong: 'Nội thành HCM (Q1)', khoangCach: 8, donGia: 450000, donGiaKM: 56250, hieuLuc: '01/04/2026 - 30/09/2026', trangThai: 'active' },
  { id: 'BG007', ncc: 'NCC Đông Á', loaiXe: '3.5 tấn', tuyenDuong: 'Nội thành HCM (Q7)', khoangCach: 15, donGia: 550000, donGiaKM: 36667, hieuLuc: '01/04/2026 - 30/09/2026', trangThai: 'active' },
  { id: 'BG008', ncc: 'NCC Hải Phong Logistics', loaiXe: '15 tấn', tuyenDuong: 'HCM - Bình Phước', khoangCach: 120, donGia: 5800000, donGiaKM: 48333, hieuLuc: '01/01/2026 - 31/12/2026', trangThai: 'active' },
];

const fmt = (n: number) => n.toLocaleString('vi-VN') + '₫';

export default function PricingPage() {
  const { isAuthenticated } = useERPAuth();
  const [data] = useState(PRICING_DATA);
  const [search, setSearch] = useState('');
  const [filterNCC, setFilterNCC] = useState('');

  const nccs = useMemo(() => [...new Set(data.map(d => d.ncc))].sort(), [data]);

  const filtered = useMemo(() => data.filter(d => {
    if (search) { const s = search.toLowerCase(); if (!d.tuyenDuong.toLowerCase().includes(s) && !d.ncc.toLowerCase().includes(s) && !d.loaiXe.toLowerCase().includes(s)) return false; }
    if (filterNCC && d.ncc !== filterNCC) return false;
    return true;
  }), [data, search, filterNCC]);

  const avgPrice = useMemo(() => data.length > 0 ? Math.round(data.reduce((s, d) => s + d.donGiaKM, 0) / data.length) : 0, [data]);

  if (!isAuthenticated) return null;

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2"><DollarSign className="text-violet-500" size={24} /> Bảng giá vận chuyển</h1>
          <p className="text-sm text-slate-500 mt-0.5">{data.length} bảng giá — Trung bình: {fmt(avgPrice)}/km</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-3 flex items-center gap-1.5 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50"><Upload size={14} /> AI Import</button>
          <button className="h-9 px-3 flex items-center gap-1.5 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50"><Download size={14} /> Export</button>
          <button className="h-9 px-4 flex items-center gap-2 text-sm font-semibold text-white rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}><Plus size={14} /> Thêm giá</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {nccs.map(ncc => {
          const nccData = data.filter(d => d.ncc === ncc);
          const avg = Math.round(nccData.reduce((s, d) => s + d.donGia, 0) / nccData.length);
          return (
            <button key={ncc} onClick={() => setFilterNCC(filterNCC === ncc ? '' : ncc)} className={`glass-card rounded-xl p-4 text-left transition-all ${filterNCC === ncc ? 'ring-2 ring-violet-300' : ''}`}>
              <p className="text-xs text-slate-500 font-medium mb-1">{ncc.replace('NCC ', '')}</p>
              <p className="text-lg font-extrabold text-violet-700">{nccData.length} <span className="text-xs font-normal text-slate-400">giá</span></p>
              <p className="text-[11px] text-slate-500 mt-0.5">TB: {fmt(avg)}</p>
            </button>
          );
        })}
      </div>

      <div className="glass-card rounded-2xl">
        <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tuyến, NCC, loại xe..." className="w-full h-10 pl-9 pr-4 text-sm bg-slate-50/80 border border-slate-200/80 rounded-xl text-slate-700 placeholder-slate-400 focus:bg-white transition-all" /></div>
          <select value={filterNCC} onChange={e => setFilterNCC(e.target.value)} className="h-10 px-3 text-sm border border-slate-200 rounded-xl bg-white text-slate-600 cursor-pointer"><option value="">Tất cả NCC</option>{nccs.map(n => <option key={n} value={n}>{n}</option>)}</select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-y border-slate-100 bg-slate-50/50">
              {['Mã', 'NCC', 'Loại xe', 'Tuyến đường', 'KM', 'Đơn giá/chuyến', 'Đơn giá/km', 'Hiệu lực', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((d, i) => (
                <tr key={d.id} className="border-b border-slate-50 hover:bg-violet-50/30 transition-colors animate-fade-in" style={{ animationDelay: `${i * 20}ms` }}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{d.id}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{d.ncc}</td>
                  <td className="px-4 py-3"><span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1 w-fit"><Truck size={10} />{d.loaiXe}</span></td>
                  <td className="px-4 py-3 text-slate-600 flex items-center gap-1"><Map size={12} className="text-violet-400" />{d.tuyenDuong}</td>
                  <td className="px-4 py-3 text-slate-600">{d.khoangCach}</td>
                  <td className="px-4 py-3 font-bold text-violet-700">{fmt(d.donGia)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmt(d.donGiaKM)}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{d.hieuLuc}</td>
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
