import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, BookOpen, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';

interface ChecksheetItem {
  id: string;
  text: string;
  completed: boolean;
}

interface Checksheet {
  id: string;
  stream: string;
  name: string;
  items: ChecksheetItem[];
  completedAt: string | null;
}

interface BookRead {
  id: string;
  title: string;
  author: string | null;
  completedAt: string | null;
  notes: string | null;
}

interface Program {
  id: string;
  form: number;
  notes: string | null;
  checksheets: Checksheet[];
  booksRead: BookRead[];
}

const STREAM_LABELS: Record<string, string> = {
  math: 'Mathematics',
  reading: 'Reading',
  seminar: 'Seminar',
  practical: 'Practical',
};

const STREAM_ORDER = ['math', 'reading', 'seminar', 'practical'];

function ChecksheetCard({
  sheet,
  programId: _programId,
}: {
  sheet: Checksheet;
  programId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const total = sheet.items.length;
  const done = sheet.items.filter((i) => i.completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const isComplete = !!sheet.completedAt;

  const toggleMutation = useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: string; completed: boolean }) => {
      await api.patch(`/programs/checksheets/${sheet.id}/items/${itemId}`, { completed });
    },
    onMutate: async ({ itemId, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['my-program'] });
      const prev = queryClient.getQueryData<Program>(['my-program']);
      if (prev) {
        queryClient.setQueryData<Program>(['my-program'], {
          ...prev,
          checksheets: prev.checksheets.map((s) =>
            s.id === sheet.id
              ? {
                  ...s,
                  items: s.items.map((i) => (i.id === itemId ? { ...i, completed } : i)),
                }
              : s,
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['my-program'], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['my-program'] });
    },
  });

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-4 min-h-[44px] hover:bg-bg-hover transition-colors text-left"
      >
        <span className="flex-1 min-w-0">
          <span className="font-medium text-text-primary">{sheet.name}</span>
        </span>
        <span className="text-xs text-text-secondary whitespace-nowrap">{done}/{total}</span>
        {isComplete ? (
          <Badge variant="success" className="flex items-center gap-1 text-xs">
            <CheckCircle2 size={12} /> Done
          </Badge>
        ) : (
          <span className="text-xs text-text-secondary">{pct}%</span>
        )}
        {expanded ? (
          <ChevronDown size={16} className="text-text-disabled shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-text-disabled shrink-0" />
        )}
      </button>

      {/* Progress bar */}
      <div className="h-1 bg-bg-elevated">
        <div
          className="h-1 bg-brand transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {expanded && (
        <ul className="divide-y divide-border bg-bg-surface">
          {sheet.items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 px-4 py-3 min-h-[44px]">
              <button
                type="button"
                disabled={toggleMutation.isPending}
                onClick={() => toggleMutation.mutate({ itemId: item.id, completed: !item.completed })}
                className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  item.completed
                    ? 'bg-brand border-brand'
                    : 'border-border bg-bg-elevated hover:border-brand'
                }`}
                aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
              >
                {item.completed && (
                  <svg viewBox="0 0 10 8" className="w-3 h-3 text-white fill-current">
                    <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <span className={`text-sm leading-relaxed ${item.completed ? 'line-through text-text-disabled' : 'text-text-primary'}`}>
                {item.text}
              </span>
            </li>
          ))}
          {sheet.items.length === 0 && (
            <li className="px-4 py-3 text-sm text-text-secondary">No items in this checksheet.</li>
          )}
        </ul>
      )}
    </div>
  );
}

interface AddBookFormProps {
  onClose: () => void;
}

function AddBookForm({ onClose }: AddBookFormProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [completedAt, setCompletedAt] = useState('');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/programs/books', {
        title,
        author: author || undefined,
        completedAt: completedAt || undefined,
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-program'] });
      onClose();
    },
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
      className="border border-border rounded-xl p-4 space-y-3 bg-bg-elevated"
    >
      <h4 className="text-sm font-semibold text-text-primary">Add Book Read</h4>
      <div className="space-y-2">
        <input
          className="w-full bg-bg-surface border border-border rounded-lg px-3 py-2 text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand"
          placeholder="Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          className="w-full bg-bg-surface border border-border rounded-lg px-3 py-2 text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand"
          placeholder="Author (optional)"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
        <input
          type="date"
          className="w-full bg-bg-surface border border-border rounded-lg px-3 py-2 text-base text-text-primary focus:outline-none focus:border-brand"
          placeholder="Date completed"
          value={completedAt}
          onChange={(e) => setCompletedAt(e.target.value)}
        />
        <textarea
          className="w-full bg-bg-surface border border-border rounded-lg px-3 py-2 text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand resize-none"
          placeholder="Notes (optional)"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={mutation.isPending} disabled={!title.trim()}>
          Add Book
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function MyProgramPage() {
  const [showAddBook, setShowAddBook] = useState(false);
  const queryClient = useQueryClient();

  const { data: program, isLoading, isError } = useQuery<Program | null>({
    queryKey: ['my-program'],
    queryFn: async () => {
      const res = await api.get<Program | null>('/programs/mine');
      return res.data;
    },
  });

  const deleteBookMutation = useMutation({
    mutationFn: async (bookId: string) => {
      await api.delete(`/programs/books/${bookId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-program'] }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <Card className="p-6 text-center text-danger text-sm">
          Failed to load your program. Please try again.
        </Card>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <header className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">My Program</h1>
        </header>
        <Card className="p-8 text-center space-y-3">
          <BookOpen size={40} className="text-text-disabled mx-auto" />
          <p className="text-text-secondary text-sm">No program assigned yet.</p>
          <p className="text-text-disabled text-xs">Contact your school administrator to get your program set up.</p>
        </Card>
      </div>
    );
  }

  // Group checksheets by stream
  const byStream: Record<string, Checksheet[]> = {};
  for (const sheet of program.checksheets) {
    if (!byStream[sheet.stream]) byStream[sheet.stream] = [];
    byStream[sheet.stream].push(sheet);
  }
  const streamKeys = STREAM_ORDER.filter((s) => byStream[s]?.length > 0);

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <header>
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">
          My Program — Form {program.form}
        </h1>
      </header>

      {program.notes && (
        <Card className="p-4 border-brand/30 bg-brand/5">
          <p className="text-sm text-text-primary whitespace-pre-wrap">{program.notes}</p>
        </Card>
      )}

      {/* Checksheets */}
      {streamKeys.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-text-primary">Checksheets</h2>
          {streamKeys.map((stream) => (
            <div key={stream} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
                {STREAM_LABELS[stream] ?? stream}
              </h3>
              {byStream[stream].map((sheet) => (
                <ChecksheetCard key={sheet.id} sheet={sheet} programId={program.id} />
              ))}
            </div>
          ))}
        </section>
      )}

      {/* Books Read */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Books Read</h2>
          {!showAddBook && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAddBook(true)}
              className="flex items-center gap-1"
            >
              <Plus size={14} /> Add Book
            </Button>
          )}
        </div>

        {showAddBook && (
          <AddBookForm onClose={() => setShowAddBook(false)} />
        )}

        {program.booksRead.length === 0 && !showAddBook ? (
          <Card className="p-6 text-center text-text-secondary text-sm">
            No books recorded yet.
          </Card>
        ) : (
          <div className="space-y-2">
            {program.booksRead.map((book) => (
              <div
                key={book.id}
                className="flex items-start gap-3 p-4 bg-bg-surface border border-border rounded-xl"
              >
                <BookOpen size={18} className="text-brand shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary text-sm">{book.title}</p>
                  {book.author && (
                    <p className="text-xs text-text-secondary">by {book.author}</p>
                  )}
                  {book.completedAt && (
                    <p className="text-xs text-text-disabled mt-0.5">
                      Completed {new Date(book.completedAt).toLocaleDateString()}
                    </p>
                  )}
                  {book.notes && (
                    <p className="text-xs text-text-secondary mt-1 italic">{book.notes}</p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Delete book"
                  disabled={deleteBookMutation.isPending}
                  onClick={() => deleteBookMutation.mutate(book.id)}
                  className="text-text-disabled hover:text-danger transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
