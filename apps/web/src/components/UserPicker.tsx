import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Search, X } from 'lucide-react';
import { api } from '../lib/api';

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  form?: number | null;
}

interface BaseProps {
  placeholder?: string;
  className?: string;
  excludeIds?: string[];
}

type SingleProps = BaseProps & {
  multiple?: false;
  value: string | null;
  onChange: (id: string | null) => void;
};

type MultiProps = BaseProps & {
  multiple: true;
  value: string[];
  onChange: (ids: string[]) => void;
};

type Props = SingleProps | MultiProps;

export function UserPicker(props: Props) {
  const { placeholder = 'Search users…', className, excludeIds = [] } = props;
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const { data: users = [] } = useQuery<UserOption[]>({
    queryKey: ['users', 'all'],
    queryFn: async () => (await api.get<UserOption[]>('/users')).data,
    staleTime: 60_000,
  });

  const userById = useMemo(() => {
    const m = new Map<string, UserOption>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  const selectedIds: string[] = props.multiple
    ? props.value
    : props.value
    ? [props.value]
    : [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => !excludeIds.includes(u.id))
      .filter((u) => (props.multiple ? !selectedIds.includes(u.id) : true))
      .filter((u) => {
        if (!q) return true;
        return (
          u.firstName.toLowerCase().includes(q) ||
          u.lastName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
        );
      })
      .slice(0, 20);
  }, [users, search, excludeIds, selectedIds, props.multiple]);

  const removeOne = (id: string) => {
    if (props.multiple) {
      props.onChange(props.value.filter((x) => x !== id));
    } else {
      props.onChange(null);
    }
  };

  const addOne = (id: string) => {
    if (props.multiple) {
      if (!props.value.includes(id)) props.onChange([...props.value, id]);
    } else {
      props.onChange(id);
      setOpen(false);
    }
    setSearch('');
  };

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      {/* Selected chips (multi) or selected display (single) */}
      {props.multiple && selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedIds.map((id) => {
            const u = userById.get(id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-brand-muted border border-brand/30 text-brand text-xs font-medium min-h-[32px]"
              >
                {u ? `${u.firstName} ${u.lastName}` : id.slice(0, 8)}
                <button
                  type="button"
                  onClick={() => removeOne(id)}
                  className="hover:text-danger touch-manipulation"
                  aria-label="Remove"
                >
                  <X size={14} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {!props.multiple && props.value && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-elevated border border-border min-h-[44px]">
          <span className="text-sm text-text-primary truncate">
            {(() => {
              const u = userById.get(props.value);
              return u ? `${u.firstName} ${u.lastName} — ${u.email}` : props.value;
            })()}
          </span>
          <button
            type="button"
            onClick={() => removeOne(props.value as string)}
            className="text-text-secondary hover:text-danger touch-manipulation"
            aria-label="Clear"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search
            size={16}
            className="absolute left-3 text-text-disabled pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className="w-full rounded-lg pl-9 pr-3 py-2 text-base sm:text-sm min-h-[44px] bg-bg-elevated border border-border text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
        {open && filtered.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-bg-elevated border border-border rounded-lg shadow-xl">
            {filtered.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addOne(u.id);
                  }}
                  className="w-full text-left px-3 py-2.5 hover:bg-bg-hover text-sm min-h-[44px] flex flex-col"
                >
                  <span className="text-text-primary font-medium">
                    {u.firstName} {u.lastName}
                  </span>
                  <span className="text-text-secondary text-xs">{u.email}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
