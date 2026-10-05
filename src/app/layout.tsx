import type { Metadata, Viewport } from 'next';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import './globals.css';
export const metadata: Metadata = {
  title: 'Daily — eat well, rest easy',
  description: 'Your colorful little space for meals, sleep, and everyday rhythms.',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Daily' },
  icons:{icon:'/favicon.svg',apple:'/icons/apple-touch-icon.png'},
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#612be9' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
