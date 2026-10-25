import "./globals.css";

export const metadata = {
  title: "POLYTECH Robotique Lab | ERICC · NAO",
  description:
    "Laboratoire virtuel premium — Étude pratique de robotique Polytech Marseille GII-4A. Mondes ERICC et NAO.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <div className="noise" aria-hidden />
        {children}
      </body>
    </html>
  );
}
