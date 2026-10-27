export function AdminGate({
  loading,
  error,
  loadingMessage,
  children,
}: {
  loading: boolean;
  error?: string | null;
  loadingMessage: string;
  children: React.ReactNode;
}) {
  if (loading) {
    return <p className="text-sm text-zinc-500">{loadingMessage}</p>;
  }
  if (error) {
    return <p className="text-sm text-red-300">{error}</p>;
  }
  return children;
}
