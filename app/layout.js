// app/layout.js
import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "PhishGuard",
  description: "AI-based phishing URL checker",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
