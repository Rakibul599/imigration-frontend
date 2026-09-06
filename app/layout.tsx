import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: process.env.VERCEL_URL
    ? new URL(`https://${process.env.VERCEL_URL}`)
    : new URL('http://localhost:3000'),
  title: 'Jabatan Imigresen Malaysia | Official Portal',
  description:
    'Official digital access portal to the Immigration Department of Malaysia (JIM). Services, foreign worker management, and document verification.',
  icons: {
    icon: '/images/special-pass.png',
    apple: '/images/special-pass.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_MY',
    siteName: 'Jabatan Imigresen Malaysia',
    title: 'Jabatan Imigresen Malaysia | Official Portal',
    description:
      'Official digital portal of the Malaysian Immigration Department. Access foreign workers services and information.',
    images: [
      {
        url: '/images/special-pass.png',
        width: 800,
        height: 600,
        alt: 'Jabatan Imigresen Malaysia Official Crest',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jabatan Imigresen Malaysia | Official Portal',
    description:
      'Official digital portal of the Malaysian Immigration Department.',
    images: ['/images/special-pass.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
