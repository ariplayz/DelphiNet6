import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { WidgetWrapper } from './WidgetWrapper';
import { Spinner } from '../ui/Spinner';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { api } from '../../lib/api';

interface QuickLink {
  id: string;
  label: string;
  url: string;
  sortOrder: number;
}

interface Props {
  editMode?: boolean;
}

export function QuickLinksWidget({ editMode }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [icon, setIcon] = useState('');

  const { data: links = [], isLoading } = useQuery<QuickLink[]>({
    queryKey: ['dashboard', 'quick-links'],
    queryFn: async () => (await api.get<QuickLink[]>('/dashboard/quick-links')).data,
  });

  const addMutation = useMutation({
    mutationFn: (body: { label: string; url: string; icon?: string }) =>
      api.post('/dashboard/quick-links', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard', 'quick-links'] });
      setOpen(false);
      setLabel('');
      setUrl('');
      setIcon('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/dashboard/quick-links/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard', 'quick-links'] }),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !url.trim()) return;
    addMutation.mutate({
      label: label.trim(),
      url: url.trim(),
      icon: icon.trim() || undefined,
    });
  };

  return (
    <WidgetWrapper
      title="Quick Links"
      editMode={editMode}
      action={
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          <Plus size={14} /> Add
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Spinner size="md" />
        </div>
      ) : links.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center gap-3">
          <p className="text-text-secondary text-sm">No quick links yet</p>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus size={14} /> Add link
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto">
          {links.map((link) => (
            <div
              key={link.id}
              className="group relative bg-bg-elevated border border-border rounded-lg p-3 hover:border-brand transition-colors"
            >
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center text-center gap-1 text-text-primary"
              >
                <span className="text-xl"><ExternalLink size={18} /></span>
                <span className="text-xs font-medium truncate w-full">{link.label}</span>
              </a>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(link.id)}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-400 transition-opacity"
                aria-label="Delete link"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Quick Link"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={addMutation.isPending}>
              Add
            </Button>
          </div>
        }
      >
        <form onSubmit={submit} className="space-y-3">
          <Input
            label="Label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="My link"
            required
          />
          <Input
            label="URL"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            required
          />
          <Input
            label="Icon (emoji, optional)"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="🔗"
          />
        </form>
      </Modal>
    </WidgetWrapper>
  );
}
