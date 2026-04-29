import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function ChangePasswordPage() {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();
  const forced = !!user?.mustChangePassword;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(anyErr.response?.data?.message ?? anyErr.message ?? 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-bg-base flex items-center justify-center px-4 py-8">
      <div className="w-full sm:max-w-sm">
        <div className="bg-bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <h1 className="text-xl font-semibold text-text-primary">Change your password</h1>
            {forced && (
              <p className="text-sm text-text-secondary mt-2 text-center">
                You're using the default password. Please set a new one to continue.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <Input
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <Input
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />

            {error && (
              <p className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" loading={loading} className="w-full mt-2">
              Update password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
