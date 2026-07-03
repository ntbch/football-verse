export const LoadingBlock = ({ label = "Loading" }: { label?: string }) => (
  <div className="panel p-5 font-bold">{label}...</div>
);

export const ErrorBlock = ({ message }: { message: string }) => (
  <div className="border border-red-900 bg-red-50 p-4 font-bold text-red-900">{message}</div>
);
