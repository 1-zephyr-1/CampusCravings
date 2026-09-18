export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main id="main-content" tabIndex={-1}>
      {children}
    </main>
  );
}
