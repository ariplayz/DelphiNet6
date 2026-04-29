import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import { Pencil, Check } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import {
  WelcomeWidget,
  AttendanceSummaryWidget,
  QuickLinksWidget,
  TodayClassesWidget,
  PlaceholderWidget,
} from '../components/widgets';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface Widget {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  config?: Record<string, unknown>;
}

interface LayoutResponse {
  widgets: Widget[];
}

const widgetMap: Record<string, React.ComponentType<{ editMode?: boolean }>> = {
  welcome: WelcomeWidget,
  'attendance-summary': AttendanceSummaryWidget,
  'quick-links': QuickLinksWidget,
  'today-classes': TodayClassesWidget,
};

export function DashboardPage() {
  const qc = useQueryClient();
  const [editMode, setEditMode] = useState(false);

  const { data, isLoading } = useQuery<LayoutResponse>({
    queryKey: ['dashboard', 'layout'],
    queryFn: async () => (await api.get<LayoutResponse>('/dashboard/layout')).data,
  });

  const saveLayout = useMutation({
    mutationFn: (widgets: Widget[]) => api.put('/dashboard/layout', { widgets }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard', 'layout'] }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const widgets = data?.widgets ?? [];

  const layouts = {
    lg: widgets.map((w) => ({ i: w.id, x: w.x, y: w.y, w: w.w, h: w.h })),
  };

  const handleLayoutChange = (newLayout: Layout) => {
    if (!editMode) return;
    const updated = widgets.map((w) => {
      const found = newLayout.find((l) => l.i === w.id);
      return found ? { ...w, x: found.x, y: found.y, w: found.w, h: found.h } : w;
    });
    const changed = updated.some((u, i) => {
      const o = widgets[i];
      return o.x !== u.x || o.y !== u.y || o.w !== u.w || o.h !== u.h;
    });
    if (changed) saveLayout.mutate(updated);
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Dashboard</h1>
        <Button
          size="sm"
          variant={editMode ? 'primary' : 'secondary'}
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? (
            <>
              <Check size={14} /> Done
            </>
          ) : (
            <>
              <Pencil size={14} /> Edit
            </>
          )}
        </Button>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={60}
        margin={[12, 12]}
        isDraggable={editMode}
        isResizable={editMode}
        onLayoutChange={handleLayoutChange}
        draggableCancel=".no-drag"
      >
        {widgets.map((widget) => {
          const Component = widgetMap[widget.type];
          return (
            <div
              key={widget.id}
              className={
                editMode ? 'ring-2 ring-brand/40 ring-offset-2 ring-offset-bg-base rounded-xl' : ''
              }
            >
              {Component ? (
                <Component editMode={editMode} />
              ) : (
                <PlaceholderWidget widget={widget} editMode={editMode} />
              )}
            </div>
          );
        })}
      </ResponsiveGridLayout>
    </div>
  );
}
