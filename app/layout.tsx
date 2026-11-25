import type { Metadata, Viewport } from 'next';
import { Rubik } from 'next/font/google';
import './globals.css';

const rubik = Rubik({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-rubik',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RateRoast. Brutal pitch audits for freelancers',
  description:
    'Our auditor reads your pitch the way a skeptical, high-paying client does. Get a score, brutal critique, rewrite, and join the Co-Builder Directory.',
  openGraph: {
    title: 'RateRoast. Brutal pitch audits for freelancers',
    description:
      'Our auditor reads your pitch the way a skeptical, high-paying client does. Get a score, brutal critique, rewrite, and join the Co-Builder Directory.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RateRoast. Brutal pitch audits for freelancers',
    description:
      'Our auditor reads your pitch the way a skeptical, high-paying client does. Get a score, brutal critique, rewrite, and join the Co-Builder Directory.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={rubik.variable}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
