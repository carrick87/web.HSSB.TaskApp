import type { Metadata, Viewport } from "next";
import "./globals.css";
import {
  PRODUCT_ICON_PATHS,
  PRODUCT_NAME,
  PRODUCT_SHORT_NAME,
  PRODUCT_TAGLINE,
  PRODUCT_THEME_COLOR,
  productPageTitle,
} from "@/src/config/product";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: productPageTitle(PRODUCT_TAGLINE),
    description: PRODUCT_TAGLINE,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: PRODUCT_SHORT_NAME,
    },
    formatDetection: {
      telephone: false,
    },
    icons: {
      icon: [
        { url: PRODUCT_ICON_PATHS.favicon32, sizes: "32x32", type: "image/png" },
        { url: PRODUCT_ICON_PATHS.favicon16, sizes: "16x16", type: "image/png" },
      ],
      apple: [{ url: PRODUCT_ICON_PATHS.appleTouch, sizes: "180x180", type: "image/png" }],
    },
  };
}

export const viewport: Viewport = {
  themeColor: PRODUCT_THEME_COLOR,
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ colorScheme: "light" }}>
      <head>
        <link rel="apple-touch-icon" href={PRODUCT_ICON_PATHS.appleTouch} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={PRODUCT_SHORT_NAME} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content={PRODUCT_THEME_COLOR} />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="color-scheme" content="light" />
      </head>
      <body className="antialiased min-h-screen">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
