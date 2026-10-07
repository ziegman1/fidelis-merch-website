export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark min-h-screen bg-black text-cream [&_input]:text-cream [&_input]:placeholder:text-zinc-400 [&_select]:text-cream [&_textarea]:text-cream">
      {children}
    </div>
  );
}
