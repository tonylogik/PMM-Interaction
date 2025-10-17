import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '../context/Providers';

export const metadata: Metadata = {
  title: 'PMM Interaction Explorer',
  description: 'Next.js port of the reinforced concrete PMM interaction engine'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
