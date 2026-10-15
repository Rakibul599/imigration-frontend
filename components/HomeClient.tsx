'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Accessibility,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Theme2Hero from '@/components/Theme2Hero';
import {
  ThemeSettings,
  getStoredThemeSettings,
  fetchThemeSettings,
  subscribeToThemeChanges,
  saveThemeSettingsToLocal,
} from '@/lib/themeSettings';

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

interface HomeClientProps {
  initialTheme: ThemeSettings;
}

export default function HomeClient({ initialTheme }: HomeClientProps) {
  // Use initialTheme from server as default state to prevent any theme flash on reload
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(initialTheme);

  useEffect(() => {
    // Keep local storage synced with server initialTheme
    saveThemeSettingsToLocal(initialTheme);

    // Subscribe to live theme updates (from admin panel / another tab)
    const unsub = subscribeToThemeChanges((newSettings) => {
      setThemeSettings(newSettings);
    });

    return unsub;
  }, [initialTheme]);

  const isTheme2 = themeSettings.active_theme === 'theme2';
  const t1 = themeSettings.theme1_data;

  return (
    <main className="portal-shell">
      <div className="accessibility-tab" aria-label="Accessibility options">
        <Accessibility size={21} />
      </div>
      <Navbar />

      {/* Dynamic Homepage Hero based on active theme */}
      {isTheme2 ? (
        <Theme2Hero data={themeSettings.theme2_data} />
      ) : (
        <section className="hero" id="home">
          <div className="hero-grid" />
          <div className="hero-orbit hero-orbit--one" />
          <div className="hero-orbit hero-orbit--two" />
          <Constellation />
          <div className="container hero-inner">
            <div className="hero-copy">
              <p className="eyebrow">
                <span className="eyebrow-line" /> {t1.eyebrow}
              </p>
              <h1>
                {t1.title_line1}
                <br />
                <em>{t1.title_line2}</em>
              </h1>
              <p className="hero-subtitle">{t1.subtitle}</p>
              <div className="hero-actions">
                <Link href={t1.primary_btn_link || '/login'} className="button button--yellow">
                  {t1.primary_btn_text} <ArrowUpRight size={18} />
                </Link>
                <a href={t1.secondary_btn_link || '#information'} className="text-link">
                  {t1.secondary_btn_text} <ArrowUpRight size={16} />
                </a>
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="hero-visual-stack">
                <div className="hero-glow-backdrop" />

                {/* Main Laptop Mockup Card */}
                <div className="hero-laptop-card">
                  <div className="laptop-badge">
                    <span className="live-dot" /> {t1.laptop_badge_text}
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
                    <strong>{t1.metric_percentage}</strong>
                    <small>{t1.metric_label}</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="intro-section" id="information">
        <div className="container intro-content">
          <div className="section-kicker">ENTERPRISE DIRECTORY & LEDGER</div>
          <h2>
            Verified Employers & Corporate Accounts.
            <br />
            <span>Direct Workforce & Payroll Access.</span>
          </h2>
          <p>
            Sign in to your registered Malaysian corporate account to manage ledger books, workforce allocation, foreign worker permits, and medical records.
          </p>
        </div>
        <div className="intro-stat">
          <strong>7+</strong>
          <span>registered employers</span>
        </div>
      </section>

      <section className="trust-section">
        <div className="container trust-inner">
          <div className="trust-icon">
            <span className="text-2xl font-bold">🛡️</span>
          </div>
          <div>
            <p className="section-kicker">OFFICIAL AND SECURE</p>
            <h2>Your company records are protected.</h2>
            <p>
              Direct integration with official regulatory departments for verified employer & foreign worker processing.
            </p>
          </div>
          <a href="#contact" className="button button--outline">
            Security information <ArrowUpRight size={17} />
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
