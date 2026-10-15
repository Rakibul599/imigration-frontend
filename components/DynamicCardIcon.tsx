'use client';

import React from 'react';
import {
  Building2,
  Users,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  Briefcase,
  Coins,
  Globe2,
  TrendingUp,
  FileText,
  FileCheck,
  FileCheck2,
  FolderOpen,
  Layers,
  Lock,
  KeyRound,
  Wallet,
  Clock,
  Sparkles,
  Receipt,
  UserX,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
} from 'lucide-react';

export function DynamicCardIcon({
  icon,
  size = 16,
  className = '',
}: {
  icon?: string;
  size?: number;
  className?: string;
}) {
  if (!icon) return <Coins size={size} className={className} />;

  if (icon.startsWith('/') || icon.startsWith('data:') || icon.startsWith('http')) {
    return (
      <img
        src={icon}
        alt="icon"
        style={{ width: size, height: size }}
        className={`object-contain ${className}`}
        onError={(e) => {
          (e.target as HTMLElement).style.display = 'none';
        }}
      />
    );
  }

  const props = { size, className };
  switch (icon) {
    case 'Building2': return <Building2 {...props} />;
    case 'Users': return <Users {...props} />;
    case 'UserCheck': return <UserCheck {...props} />;
    case 'ShieldCheck': return <ShieldCheck {...props} />;
    case 'ShieldAlert': return <ShieldAlert {...props} />;
    case 'Briefcase': return <Briefcase {...props} />;
    case 'Coins': return <Coins {...props} />;
    case 'Globe2': return <Globe2 {...props} />;
    case 'TrendingUp': return <TrendingUp {...props} />;
    case 'FileText': return <FileText {...props} />;
    case 'FileCheck': return <FileCheck {...props} />;
    case 'FileCheck2': return <FileCheck2 {...props} />;
    case 'FolderOpen': return <FolderOpen {...props} />;
    case 'Layers': return <Layers {...props} />;
    case 'Lock': return <Lock {...props} />;
    case 'KeyRound': return <KeyRound {...props} />;
    case 'Wallet': return <Wallet {...props} />;
    case 'Clock': return <Clock {...props} />;
    case 'Sparkles': return <Sparkles {...props} />;
    case 'Receipt': return <Receipt {...props} />;
    case 'UserX': return <UserX {...props} />;
    case 'ArrowUpRight': return <ArrowUpRight {...props} />;
    case 'ArrowDownRight': return <ArrowDownRight {...props} />;
    case 'DollarSign': return <DollarSign {...props} />;
    default: return <Coins {...props} />;
  }
}
