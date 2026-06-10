import type { Metadata } from 'next';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { RouteProgress } from '@/components/RouteProgress';

export const metadata: Metadata = {
  title: { default: 'MMT Care Connect', template: '%s | MMT Care Connect' },
  description: 'Real-time NDIS placement and coordination platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RouteProgress />
        {children}
      </body>
    </html>
  );
}
