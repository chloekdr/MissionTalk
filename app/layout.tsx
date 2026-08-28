import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '미션톡',
  description: '서초예수사랑교회 제1여전도회의 쉬운 선교 영어 챗봇',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
