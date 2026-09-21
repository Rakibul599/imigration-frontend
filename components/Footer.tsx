'use client';

import Link from 'next/link';
import { Building2, ArrowUpRight } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="site-footer" id="contact">
      <div className="container footer-top">
        <div className="footer-brand">
          <div className="flex flex-col gap-1 mb-2">
            <strong className="text-white text-sm tracking-wider uppercase font-bold">
              Official Digital Portal
            </strong>
            <small className="text-[#90a6c7] text-[10px] tracking-widest uppercase">
              Foreign Workers Management &amp; Employer Gateway
            </small>
          </div>
          <p className="text-[#9fb2cf] text-xs leading-relaxed max-w-[280px]">
            Official digital access and verified employer processing platform.
          </p>
        </div>

        <div className="footer-links">
          <div>
            <h3>Employers</h3>
            <Link href="/companies">All Companies</Link>
            <Link href="/services">Services</Link>
            <Link href="/login">Sign In Portal</Link>
          </div>
          <div>
            <h3>Need help?</h3>
            <a href="/#contact">Contact support</a>
            <a href="/#contact">FAQ</a>
            <a href="/#contact">Privacy policy</a>
          </div>
        </div>

        <div className="jobs-card">
          <div className="jobs-icon">
            <Building2 size={22} />
          </div>
          <div>
            <span>CAREERS</span>
            <h3>Join our team</h3>
            <p>Explore opportunities with us.</p>
          </div>
          <a href="/#contact" aria-label="Apply for a job">
            <ArrowUpRight size={18} />
          </a>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>© 2026 Official Digital Portal. All rights reserved.</span>
        <span>Built for a safer, simpler digital experience.</span>
      </div>
    </footer>
  );
}
