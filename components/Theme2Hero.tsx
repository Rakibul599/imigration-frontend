'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Monitor,
  ShieldCheck,
  ScanLine,
  ArrowRight,
} from 'lucide-react';
import { Theme2Data } from '@/lib/themeSettings';

interface Theme2HeroProps {
  data: Theme2Data;
}

export default function Theme2Hero({ data }: Theme2HeroProps) {
  const [activeNode, setActiveNode] = useState<number | null>(null);

  const chartNodes = [
    {
      id: 1,
      cx: 110,
      cy: 135,
      color: '#ef4444',
      glow: 'rgba(239, 68, 68, 0.45)',
      title: 'LHDN e-Invoice Compliance',
      metric: '100% Tax Compliant',
    },
    {
      id: 2,
      cx: 265,
      cy: 230,
      color: '#f97316',
      glow: 'rgba(249, 115, 22, 0.45)',
      title: 'Fast Bank Reconciliation',
      metric: '3.5x Faster Match',
    },
    {
      id: 3,
      cx: 425,
      cy: 165,
      color: '#ef4444',
      glow: 'rgba(239, 68, 68, 0.45)',
      title: 'SST & Multi-Currency',
      metric: 'Auto Tax Calculator',
    },
    {
      id: 4,
      cx: 580,
      cy: 205,
      color: '#eab308',
      glow: 'rgba(234, 179, 8, 0.45)',
      title: 'AI SmartScan Capture',
      metric: '99.8% OCR Accuracy',
    },
    {
      id: 5,
      cx: 740,
      cy: 85,
      color: '#22c55e',
      glow: 'rgba(34, 197, 94, 0.55)',
      title: 'Real-Time Financial Core',
      metric: 'RM 124,500 Cashflow',
    },
    {
      id: 6,
      cx: 895,
      cy: 235,
      color: '#3b82f6',
      glow: 'rgba(59, 130, 246, 0.45)',
      title: 'Cloud Data & Reports',
      metric: 'Secure Anytime Access',
    },
  ];

  return (
    <section className="relative overflow-hidden pt-12 md:pt-16 pb-0 select-none bg-radial-theme2">
      {/* Background ambient radial glow spots */}
      <div
        className="absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full pointer-events-none opacity-40 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(34, 197, 94, 0.3) 0%, rgba(16, 185, 129, 0.05) 70%, transparent 100%)',
        }}
      />
      <div
        className="absolute bottom-10 left-10 w-[450px] h-[450px] rounded-full pointer-events-none opacity-30 blur-2xl"
        style={{
          background:
            'radial-gradient(circle, rgba(74, 222, 128, 0.25) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* ============================================================== */}
          {/* Left Column: Rises up from the bottom with animation           */}
          {/* ============================================================== */}
          <div className="lg:col-span-6 space-y-6 pt-4 lg:pt-0 animate-rise-up-text">
            <div className="space-y-1">
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black tracking-tight leading-[1.1] text-[#144723] m-0">
                {data.title_line1}
              </h1>
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black tracking-tight leading-[1.15] text-[#22a447] m-0">
                {data.title_line2}
              </h2>
            </div>

            <p className="text-base sm:text-lg text-slate-700 max-w-xl font-normal leading-relaxed">
              {data.subtitle}
            </p>

            {/* Price Box */}
            <div className="pt-1">
              <div className="text-base sm:text-lg text-slate-800 flex flex-wrap items-baseline gap-1.5 font-medium">
                <span>{data.price_prefix}</span>
                <span className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
                  {data.price_amount}
                </span>
                <span className="text-slate-600">{data.price_suffix}</span>
              </div>
              <p className="text-xs italic text-slate-500 mt-1 font-normal">
                {data.disclaimer}
              </p>
            </div>

            {/* CTA Button */}
            <div className="pt-2">
              <Link
                href={data.btn_link || '/login'}
                className="inline-flex items-center justify-center gap-2 px-9 py-3.5 rounded-lg bg-[#272f3a] hover:bg-[#1a202c] text-white text-base font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 no-underline cursor-pointer"
              >
                <span>{data.btn_text}</span>
                <ArrowRight size={18} className="text-emerald-400" />
              </Link>
            </div>
          </div>

          {/* ============================================================== */}
          {/* Right Column: Laptop Mockup rises up from the bottom           */}
          {/* ============================================================== */}
          <div className="lg:col-span-6 relative pb-8 lg:pb-12 animate-rise-up-laptop">
            <div className="relative mx-auto max-w-[580px]">
              {/* Laptop Screen & Hardware Base */}
              <div className="relative z-10 filter drop-shadow-2xl">
                <img
                  src="/images/autocount-laptop.png"
                  alt="AutoCount Cloud Accounting on Laptop"
                  className="w-full h-auto block select-none transform hover:scale-[1.01] transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/autocount-laptop.jpg';
                  }}
                />
              </div>

              {/* Floating Badge 1 (Top Left): Access anytime */}
              <div className="absolute -top-3 sm:top-2 left-0 sm:-left-4 z-20 animate-theme2-float1">
                <div className="flex items-center gap-2.5 bg-[#124021]/90 backdrop-blur-md text-white border border-[#2fa852]/60 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 shadow-2xl max-w-[240px] sm:max-w-[270px]">
                  <div className="w-8 h-8 rounded-lg bg-[#1a5b30] flex items-center justify-center shrink-0 text-emerald-300">
                    <Monitor size={17} />
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold leading-tight text-white/95">
                    {data.badge1_text}
                  </span>
                </div>
              </div>

              {/* Floating Badge 2 (Center): LHDN e-Invoice Ready */}
              <div className="absolute top-[32%] sm:top-[34%] right-2 sm:right-10 z-20 animate-theme2-pulse">
                <div className="flex items-center gap-2 bg-[#1b8144] text-white border border-emerald-300/50 rounded-xl px-3.5 py-1.5 sm:px-4 sm:py-2 shadow-2xl">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-yellow-300">
                    <ShieldCheck size={16} />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
                    {data.badge2_text}
                  </span>
                </div>
              </div>

              {/* Floating Badge 3 (Bottom Left): AI SmartScan */}
              <div className="absolute bottom-12 sm:bottom-16 left-2 sm:-left-2 z-20 animate-theme2-float2">
                <div className="flex items-center gap-2.5 bg-[#124021]/90 backdrop-blur-md text-white border border-[#2fa852]/60 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 shadow-2xl max-w-[230px] sm:max-w-[260px]">
                  <div className="w-8 h-8 rounded-lg bg-[#1a5b30] flex items-center justify-center shrink-0 text-emerald-300">
                    <ScanLine size={17} />
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold leading-tight text-white/95">
                    {data.badge3_text}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Signature Animated Multi-Color Zigzag Line Chart with Glowing Nodes */}
      <div className="relative w-full overflow-hidden mt-6 lg:-mt-6">
        <svg
          viewBox="0 0 1000 320"
          preserveAspectRatio="none"
          className="w-full h-[180px] sm:h-[220px] md:h-[270px] lg:h-[310px] block"
        >
          <defs>
            {/* Emerald Green Area Gradient below the line */}
            <linearGradient id="chartGreenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#15803d" stopOpacity="0.88" />
              <stop offset="40%" stopColor="#166534" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#0d4220" stopOpacity="1" />
            </linearGradient>

            {/* Zigzag Line Stroke Gradient */}
            <linearGradient id="chartLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="25%" stopColor="#f97316" />
              <stop offset="42%" stopColor="#f87171" />
              <stop offset="58%" stopColor="#eab308" />
              <stop offset="76%" stopColor="#ffffff" />
              <stop offset="90%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
          </defs>

          {/* Polygon Fill below the zigzag graph */}
          <polygon
            points="0,170 110,135 265,230 425,165 580,205 740,85 895,235 1000,165 1000,320 0,320"
            fill="url(#chartGreenGrad)"
          />

          {/* Underlay glow shadow line */}
          <polyline
            points="0,170 110,135 265,230 425,165 580,205 740,85 895,235 1000,165"
            fill="none"
            stroke="rgba(255, 255, 255, 0.45)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Animated Main Colored Zigzag Line */}
          <polyline
            points="0,170 110,135 265,230 425,165 580,205 740,85 895,235 1000,165"
            fill="none"
            stroke="url(#chartLineGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Graph Nodes with Animated Pulsing Halo Rings */}
          {chartNodes.map((node) => {
            const isHovered = activeNode === node.id;
            return (
              <g
                key={node.id}
                className="cursor-pointer group"
                onMouseEnter={() => setActiveNode(node.id)}
                onMouseLeave={() => setActiveNode(null)}
              >
                {/* Outer animated radar ping ring */}
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r="14"
                  fill="none"
                  stroke={node.color}
                  strokeWidth="2"
                  className="animate-ping origin-center"
                  style={{ transformOrigin: `${node.cx}px ${node.cy}px` }}
                  opacity="0.6"
                />

                {/* Soft ambient aura */}
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r="10"
                  fill={node.glow}
                />

                {/* Outer colored border ring */}
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r="7"
                  fill={node.color}
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  className="transition-transform duration-300 group-hover:scale-125"
                  style={{ transformOrigin: `${node.cx}px ${node.cy}px` }}
                />

                {/* Inner white center dot */}
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r="2.5"
                  fill="#ffffff"
                />

                {/* Interactive Tooltip Card */}
                {isHovered && (
                  <foreignObject
                    x={Math.max(10, node.cx - 90)}
                    y={node.cy - 75}
                    width="180"
                    height="70"
                    className="overflow-visible pointer-events-none"
                  >
                    <div className="bg-slate-900/95 backdrop-blur-md text-white border border-white/20 rounded-lg p-2 shadow-2xl text-center transform -translate-y-2 transition-all">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 m-0">
                        {node.title}
                      </p>
                      <p className="text-xs font-semibold text-white m-0 mt-0.5">
                        {node.metric}
                      </p>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
