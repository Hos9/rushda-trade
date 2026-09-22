import "./globals.css";

export const metadata = {
  title: "Rushda Trade | AR / AP Manager",
  description: "Customer receivables and supplier payables tracker",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
