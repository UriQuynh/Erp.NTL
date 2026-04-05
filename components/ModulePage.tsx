'use client';

import { useERPAuth } from '@/lib/auth';
import {
  Truck, Package, Users, UserCircle, FolderKanban, Target,
  ClipboardList, Calendar, CheckSquare, Zap, Wallet, Calculator,
  ScanText, DollarSign, Settings, ShieldCheck, Send, Mail,
  FileText, BarChart3, GraduationCap, MessageCircle, MapPin,
  Car, ArrowRight, Database, Globe, Building2,
} from 'lucide-react';

interface ModulePageProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  tag: string;
  features?: string[];
  comingSoon?: boolean;
}

export function ModulePage({ title, subtitle, icon, color, bgColor, tag, features = [], comingSoon = true }: ModulePageProps) {
  const { user } = useERPAuth();

  return (
    <div className="animate-fade-in" style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '1rem',
        marginBottom: '2rem', flexWrap: 'wrap',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16,
          background: bgColor, color, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 6px 20px ${color}25`,
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h1 style={{
              fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', fontWeight: 800,
              color: '#1E293B', margin: 0, lineHeight: 1.2,
            }}>
              {title}
            </h1>
            <span style={{
              fontSize: '0.625rem', fontWeight: 700, padding: '3px 8px',
              borderRadius: 4, background: bgColor, color,
              letterSpacing: '0.04em',
            }}>
              {tag}
            </span>
            {comingSoon && (
              <span style={{
                fontSize: '0.6rem', fontWeight: 700, padding: '3px 10px',
                borderRadius: 20, background: '#FFF7ED', color: '#EA580C',
                border: '1px solid #FED7AA',
              }}>
                🚧 Đang phát triển
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.875rem', color: '#94A3B8', margin: '4px 0 0' }}>
            {subtitle}
          </p>
        </div>
      </div>

      {/* Content Card */}
      <div className="card-panel" style={{
        padding: '2rem', textAlign: 'center',
        background: '#fff', borderRadius: 16,
        border: '1px solid #E2E8F0',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 20,
          background: `linear-gradient(135deg, ${bgColor}, ${bgColor}dd)`,
          color, display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem',
          boxShadow: `0 8px 32px ${color}15`,
        }}>
          {icon}
        </div>

        {comingSoon ? (
          <>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.5rem' }}>
              Module đang phát triển
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#94A3B8', maxWidth: 400, margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
              Tính năng <strong>{title}</strong> đang được xây dựng và sẽ sớm có mặt trên ERP NTL.
              Dữ liệu sẽ được đồng bộ từ Google Sheets.
            </p>
          </>
        ) : (
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1E293B', marginBottom: '1.5rem' }}>
            {title}
          </h2>
        )}

        {/* Features */}
        {features.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem', maxWidth: 600, margin: '0 auto',
            textAlign: 'left',
          }}>
            {features.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '0.625rem 0.875rem', borderRadius: 10,
                background: '#F8FAFC', border: '1px solid #F1F5F9',
                fontSize: '0.8125rem', color: '#475569', fontWeight: 500,
              }}>
                <ArrowRight size={14} color={color} style={{ flexShrink: 0 }} />
                {f}
              </div>
            ))}
          </div>
        )}

        {/* Logged-in user info */}
        <div style={{
          marginTop: '2rem', paddingTop: '1.5rem',
          borderTop: '1px solid #F1F5F9',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, flexWrap: 'wrap',
        }}>
          <Database size={14} color="#94A3B8" />
          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
            Đăng nhập: <strong style={{ color: '#64748B' }}>{user?.hoTen || 'N/A'}</strong>
          </span>
          <span style={{ fontSize: '0.75rem', color: '#CBD5E1' }}>•</span>
          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
            Quyền: <strong style={{ color: '#64748B' }}>{user?.roles?.join(', ') || 'staft'}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
