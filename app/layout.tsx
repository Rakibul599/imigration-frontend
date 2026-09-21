import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: process.env.VERCEL_URL
    ? new URL(`https://${process.env.VERCEL_URL}`)
    : new URL('http://localhost:3000'),
  title: 'Official Digital Portal | Employer & Foreign Worker Services',
  description:
    'Official digital access portal for verified employers, foreign worker management, and document verification services.',
  icons: {
    icon: '/images/registration-document.svg',
    apple: '/images/registration-document.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'en_MY',
    siteName: 'Official Digital Portal',
    title: 'Official Digital Portal | Employer & Foreign Worker Services',
    description:
      'Official digital portal for foreign worker services, employer management, and e-Services.',
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
    title: 'Official Digital Portal | Employer & Foreign Worker Services',
    description:
      'Official digital portal for foreign worker services and employer management.',
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
