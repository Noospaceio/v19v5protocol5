import '../styles/globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Noosphere Protocol',
  description: 'A mycelial protocol for the planetary mind.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
