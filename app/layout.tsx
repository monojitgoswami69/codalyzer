import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Codalyzer // v4.0',
  description:
    "Codalyzer — AI-powered code complexity analysis. Understand your code's time and space complexity in seconds.",
  icons: {
    icon: [
      { url: '/favicons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/favicons/apple-touch-icon.png',
    shortcut: '/favicons/favicon.ico',
  },
  manifest: '/favicons/site.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('codalyzer-v2-theme');var d=t==='light'?'light':'dark';var root=document.documentElement;if(d==='light'){root.classList.remove('dark');root.classList.add('light');}else{root.classList.remove('light');root.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
