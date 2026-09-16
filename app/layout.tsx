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
    icon: '/images/registration-document.svg',
    apple: '/images/registration-document.svg',
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
        url: '/images/registration-document.svg',
        width: 800,
        height: 600,
        alt: 'Official Document Portal Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jabatan Imigresen Malaysia | Official Portal',
    description:
      'Official digital portal of the Malaysian Immigration Department.',
    images: ['/images/registration-document.svg'],
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
