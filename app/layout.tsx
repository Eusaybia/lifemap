import React from "react";
import './global.css'
import Script from 'next/script'

type RootLayoutProps = {
  children: React.ReactNode;
};

const RootLayout: React.FC<RootLayoutProps> = ({ children }) => (
  <html lang="en">
    <head>
      <script src="https://unpkg.com/react-scan/dist/auto.global.js" async />
    </head>
    <body>{children}</body>
  </html>
);

export default RootLayout;
