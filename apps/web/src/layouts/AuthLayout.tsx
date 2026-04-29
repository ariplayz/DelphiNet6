import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-[100dvh] bg-bg-base flex items-center justify-center p-4 pb-safe pt-safe">
      <Outlet />
    </div>
  );
}
