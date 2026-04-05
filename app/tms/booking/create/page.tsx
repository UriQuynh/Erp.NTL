'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useERPAuth } from '@/lib/auth';
import { Truck, ArrowLeft, Save, Plus, Package, Phone, MapPin, Calendar, FileText } from 'lucide-react';

export default function CreateBookingPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useERPAuth();
  const [loading, setLoading] = useState(false);

  // Auto-generate booking ID on client mount
  const [bookingId, setBookingId] = useState('');
  useEffect(() => {
    setBookingId('PXK_' + Math.floor(Math.random() * 900000 + 100000));
  }, []);

  const [form, setForm] = useState({
    khachHang: '',
    soDienThoai: '',
    diemLayHang: '',
    diemGiaoHang: '',
    ngayGiao: '',
    ghiChu: '',
  });

  // Validation
  const phonePattern = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
  
  const isValid = useMemo(() => {
    if (!form.khachHang.trim()) return false;
    if (!form.diemLayHang.trim()) return false;
    if (!form.diemGiaoHang.trim()) return false;
    if (!form.soDienThoai.match(phonePattern)) return false;
    return true;
  }, [form]);

  if (!isAuthenticated && typeof window !== 'undefined') {
    // Basic guard
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    try {
      const res = await fetch('/api/tms/booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ID_PXK: bookingId,
          Du_An: form.khachHang,
          So_Dien_Thoai: form.soDienThoai,
          Diem_Nhan: form.diemLayHang,
          Diem_Giao: form.diemGiaoHang,
          Ngay_Giao: form.ngayGiao,
          Note: form.ghiChu,
          Nguoi_Tao: user?.hoTen || 'User'
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert('Tạo Booking thành công!');
        router.push('/tms/booking');
      } else {
        alert('Lỗi khi tạo Booking: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Đã xảy ra lỗi kết nối, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in relative pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/tms/booking')} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 shadow-sm transition-all">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Plus className="text-amber-500" size={24} /> Tạo Booking Mới
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Mã phiếu: <strong className="text-amber-600">{bookingId}</strong></p>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="glass-card rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Tên khách hàng */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                <Package size={14} className="text-slate-400"/> Tên khách hàng / Dự án <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                required 
                placeholder="Ví dụ: Công ty TNHH ABC"
                value={form.khachHang}
                onChange={e => setForm({...form, khachHang: e.target.value})}
                className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all outline-none"
              />
            </div>

            {/* SĐT */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                <Phone size={14} className="text-slate-400"/> Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input 
                type="tel" 
                required 
                placeholder="09xx xxx xxx"
                value={form.soDienThoai}
                onChange={e => setForm({...form, soDienThoai: e.target.value})}
                className={`w-full h-11 px-3.5 bg-slate-50 border ${form.soDienThoai && !form.soDienThoai.match(phonePattern) ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-amber-400 focus:ring-amber-400/20'} rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 transition-all outline-none`}
              />
              {form.soDienThoai && !form.soDienThoai.match(phonePattern) && (
                <p className="text-xs text-red-500 font-medium mt-1">Số điện thoại không đúng định dạng VN</p>
              )}
            </div>

            {/* Điểm lấy hàng */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                <MapPin size={14} className="text-emerald-500"/> Điểm lấy hàng <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                required 
                placeholder="Nhập địa chỉ nhà kho lấy hàng..."
                value={form.diemLayHang}
                onChange={e => setForm({...form, diemLayHang: e.target.value})}
                className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all outline-none"
              />
            </div>

            {/* Điểm giao hàng */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                <MapPin size={14} className="text-rose-500"/> Điểm giao hàng <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                required 
                placeholder="Nhập địa chỉ điểm giao..."
                value={form.diemGiaoHang}
                onChange={e => setForm({...form, diemGiaoHang: e.target.value})}
                className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 transition-all outline-none"
              />
            </div>

            {/* Ngày giao */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                <Calendar size={14} className="text-slate-400"/> Ngày giao (Dự kiến)
              </label>
              <input 
                type="date" 
                value={form.ngayGiao}
                onChange={e => setForm({...form, ngayGiao: e.target.value})}
                className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all outline-none block"
              />
            </div>
            
            <div className="hidden md:block"></div> {/* Spacer */}

            {/* Ghi chú */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                <FileText size={14} className="text-slate-400"/> Ghi chú
              </label>
              <textarea 
                rows={3}
                placeholder="Thông tin thêm, yêu cầu xe bửng nâng, cấm tải..."
                value={form.ghiChu}
                onChange={e => setForm({...form, ghiChu: e.target.value})}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all outline-none resize-none"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={() => router.push('/tms/booking')} 
            className="h-10 px-6 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Hủy và quay lại
          </button>
          <button 
            type="submit" 
            disabled={!isValid || loading}
            className={`h-10 px-8 text-sm font-semibold flex items-center gap-2 rounded-xl transition-all shadow-md ${!isValid || loading ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'text-white hover:shadow-lg active:scale-95'}`}
            style={isValid && !loading ? { background: 'linear-gradient(135deg, #D97706, #B45309)' } : undefined}
          >
            {loading ? (
              <>Đang xử lý...</>
            ) : (
              <><Save size={16} /> Lưu Booking</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
