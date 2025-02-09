import { ChakraProvider } from '@chakra-ui/react';
import { type Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Meetiness',
  description: 'Google Meet Add-on for supporting smooth meeting',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <ChakraProvider>{children}</ChakraProvider>
      </body>
    </html>
  );
}
