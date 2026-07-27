export const metadata = {
  title: "Census Job Portal",
  description: "Company job posting and recruitment platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "'Segoe UI', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}