import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getPublicCompanyProfile } from "@/lib/company/profile";
import { DEFAULT_COMPANY } from "@/lib/company/constants";

export async function generateMetadata(): Promise<Metadata> {
  const company = await getPublicCompanyProfile();
  const title = `${company.name} — ${company.tagline ?? DEFAULT_COMPANY.tagline}`;

  return {
    title,
    description: company.tagline ?? DEFAULT_COMPANY.tagline,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: company.short_name || company.name,
    },
    formatDetection: {
      telephone: false,
    },
    icons: {
      icon: [
        { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      apple: [
        { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0052CC",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

function ServiceWorkerRegistration() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(registration) {
                  console.log('ServiceWorker registered with scope:', registration.scope);
                })
                .catch(function(err) {
                  console.log('ServiceWorker registration failed:', err);
                });
            });
          }
        `,
      }}
    />
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const company = await getPublicCompanyProfile();

  return (
    <html lang="en" style={{ colorScheme: "light" }}>
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={company.short_name || company.name} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#0052CC" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="color-scheme" content="light" />
      </head>
      <body className="antialiased min-h-screen" style={{ backgroundColor: '#F7F8F9', color: '#172B4D' }}>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
