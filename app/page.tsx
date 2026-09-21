'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Accessibility,
  ArrowUpRight,
  BarChart3,
  Building2,
  FileLock2,
  Fingerprint,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

type Node = { x: number; y: number; vx: number; vy: number };

function Constellation() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    let nodes: Node[] = [];
    const MAX_DIST = 120;

    const resize = () => {
      width = canvas.width = canvas.parentElement?.clientWidth || 300;
      height = canvas.height = canvas.parentElement?.clientHeight || 300;
    };

    const initNodes = () => {
      const count = Math.floor((width * height) / 16000);
      nodes = Array.from({ length: Math.max(count, 18) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.35;
            ctx.strokeStyle = `rgba(140, 200, 255, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(170, 215, 255, 0.75)';
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    initNodes();
    draw();
    window.addEventListener('resize', () => { resize(); initNodes(); });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', () => { resize(); initNodes(); });
    };
  }, []);

  return <canvas ref={canvasRef} className="constellation" aria-hidden="true" />;
}

export default function Home() {
  return (
    <main className="portal-shell">
      <div className="accessibility-tab" aria-label="Accessibility options"><Accessibility size={21} /></div>
      <Navbar />

      <section className="hero" id="home">
        <div className="hero-grid" />
        <div className="hero-orbit hero-orbit--one" /><div className="hero-orbit hero-orbit--two" />
        <Constellation />
        <div className="container hero-inner">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-line" /> SMART FINANCIAL & CORPORATE ACCOUNTING SUITE</p>
            <h1>Corporate Accounting &<br /><em>Financial Ledger</em></h1>
            <p className="hero-subtitle">Real-time ledger reconciliation, multi-entity bookkeeping, audit compliance, and revenue analytics in one unified portal.</p>
            <div className="hero-actions">
              <Link href="/login" className="button button--yellow">
                Explore Accounts <ArrowUpRight size={18} />
              </Link>
              <a href="#information" className="text-link">
                Financial Reports <ArrowUpRight size={16} />
              </a>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-visual-stack">
              <div className="hero-glow-backdrop" />

              {/* Main Laptop Mockup Card */}
              <div className="hero-laptop-card">
                <div className="laptop-badge">
                  <span className="live-dot" /> Live Financial Core
                </div>
                <img
                  src="/images/laptop-accounting.jpg"
                  alt="Accounting Software Dashboard on Laptop"
                  className="hero-laptop-img"
                />
              </div>

              {/* Accounting Chart (Below/Foreground) */}
              <div className="hero-chart-card">
                <img
                  src="/images/accounting-chart.jpg"
                  alt="Monthly Revenue and Profit Overview Chart"
                  className="hero-chart-img"
                />
              </div>

              {/* Floating Accounting Metric Badge */}
              <div className="floating-metric">
                <div className="metric-icon">
                  <TrendingUp size={20} />
                </div>
                <div className="metric-text">
                  <strong>+32.5%</strong>
                  <small>Profit Increase</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="intro-section" id="information">
        <div className="container intro-content">
          <div className="section-kicker">ENTERPRISE DIRECTORY & LEDGER</div>
          <h2>Verified Employers & Corporate Accounts.<br /><span>Direct Quota & Payroll Access.</span></h2>
          <p>Sign in to your registered Malaysian corporate account to manage ledger books, quotas, foreign worker permits, and medical records.</p>
        </div>
        <div className="intro-stat">
          <strong>7+</strong>
          <span>registered employers</span>
        </div>
      </section>

      <section className="trust-section">
        <div className="container trust-inner">
          <div className="trust-icon"><FileLock2 size={28} /></div>
          <div>
            <p className="section-kicker">OFFICIAL AND SECURE</p>
            <h2>Your company records are protected.</h2>
            <p>Direct integration with official regulatory departments for verified employer quota & foreign worker processing.</p>
          </div>
          <a href="#contact" className="button button--outline">Security information <ArrowUpRight size={17} /></a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
