import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';

interface Stats {
  totalUsers: number;
  totalClasses: number;
  totalRoles: number;
  topPages?: { path: string; views: number }[];
}

export function AdminStatsPage() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['analytics', 'stats'],
    queryFn: async () => (await api.get<Stats>('/analytics/stats')).data,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0 },
    { label: 'Total Classes', value: stats?.totalClasses ?? 0 },
    { label: 'Total Roles', value: stats?.totalRoles ?? 0 },
  ];

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-4 sm:gap-6">
      <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Analytics</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <p className="text-sm text-text-secondary mb-1">{card.label}</p>
            <p className="text-2xl sm:text-3xl font-bold text-text-primary">{card.value}</p>
          </Card>
        ))}
      </div>

      {stats?.topPages && stats.topPages.length > 0 && (
        <Card title="Top Pages (Last 7 Days)" padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Path</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase">Views</th>
                </tr>
              </thead>
              <tbody>
                {stats.topPages.map((page) => (
                  <tr key={page.path} className="border-t border-border hover:bg-bg-hover">
                    <td className="px-4 py-3 text-text-primary font-mono text-xs break-all">{page.path}</td>
                    <td className="px-4 py-3 text-text-secondary text-right whitespace-nowrap">{page.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
