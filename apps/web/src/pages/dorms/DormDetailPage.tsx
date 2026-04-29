import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Crown,
  Edit2,
  Plus,
  Trash2,
  Users,
  Clock,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { DormFormModal } from '../../components/dorms/DormFormModal';
import { RoomFormModal } from '../../components/dorms/RoomFormModal';
import { RoomResidentsModal } from '../../components/dorms/RoomResidentsModal';
import { ScheduleSlotModal } from '../../components/dorms/ScheduleSlotModal';
import {
  DAY_LABELS,
  DormDetail,
  DormRoom,
  DormScheduleSlot,
  dormsApi,
} from '../../lib/api/dorms';

export function DormDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { can } = useAuth();
  const canManage = can('reslife.manage');

  const [editOpen, setEditOpen] = useState(false);
  const [roomFormOpen, setRoomFormOpen] = useState(false);
  const [roomEditing, setRoomEditing] = useState<DormRoom | null>(null);
  const [residentsRoom, setResidentsRoom] = useState<DormRoom | null>(null);
  const [slotOpen, setSlotOpen] = useState(false);
  const [slotEditing, setSlotEditing] = useState<DormScheduleSlot | null>(null);

  const { data: dorm, isLoading } = useQuery<DormDetail>({
    queryKey: ['dorm', id],
    queryFn: () => dormsApi.get(id),
    enabled: !!id,
  });

  const removeDorm = useMutation({
    mutationFn: () => dormsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dorms'] });
      navigate('/dorms');
    },
  });

  const removeRoom = useMutation({
    mutationFn: (roomId: string) => dormsApi.deleteRoom(roomId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dorm', id] }),
  });

  const removeSlot = useMutation({
    mutationFn: (slotId: string) => dormsApi.removeScheduleSlot(slotId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dorm', id] }),
  });

  if (isLoading || !dorm) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <button
        onClick={() => navigate('/dorms')}
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-3 min-h-[40px] touch-manipulation"
      >
        <ArrowLeft size={16} /> Dorms
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary truncate">
            {dorm.name}
          </h1>
          {dorm.notes && (
            <p className="text-sm text-text-secondary mt-1">{dorm.notes}</p>
          )}
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Edit2 size={14} /> Edit
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm(`Delete ${dorm.name}? This cannot be undone.`)) {
                  removeDorm.mutate();
                }
              }}
            >
              <Trash2 size={14} /> Delete
            </Button>
          </div>
        )}
      </div>

      {/* Captain */}
      <Card title="Captain" className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-brand-muted border border-brand/30 flex items-center justify-center flex-shrink-0">
              <Crown size={18} className="text-brand" />
            </div>
            <div className="min-w-0">
              {dorm.captain ? (
                <>
                  <p className="font-medium text-text-primary text-sm">
                    {dorm.captain.firstName} {dorm.captain.lastName}
                  </p>
                  <p className="text-xs text-text-secondary truncate">
                    {dorm.captain.email}
                  </p>
                </>
              ) : (
                <p className="text-sm text-text-secondary">No captain assigned.</p>
              )}
            </div>
          </div>
          {canManage && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              {dorm.captain ? 'Change' : 'Assign'} captain
            </Button>
          )}
        </div>
      </Card>

      {/* Rooms */}
      <Card
        title={`Rooms (${dorm.rooms.length})`}
        action={
          canManage && (
            <Button
              size="sm"
              onClick={() => {
                setRoomEditing(null);
                setRoomFormOpen(true);
              }}
            >
              <Plus size={14} /> Add room
            </Button>
          )
        }
        className="mb-4"
      >
        {dorm.rooms.length === 0 ? (
          <p className="text-sm text-text-secondary py-4">No rooms yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {dorm.rooms.map((room) => (
              <div
                key={room.id}
                className="border border-border rounded-lg p-3 bg-bg-base"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-text-primary text-sm">
                      {room.name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {room.assignments.length} / {room.capacity} residents
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex gap-1 flex-wrap justify-end">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setRoomEditing(room);
                          setRoomFormOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setResidentsRoom(room)}
                      >
                        <Users size={12} /> Residents
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Delete ${room.name}?`)) removeRoom.mutate(room.id);
                        }}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  )}
                </div>
                {room.assignments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {room.assignments.map((a) => (
                      <span
                        key={a.id}
                        className="inline-flex items-center px-2 py-1 rounded-full bg-bg-elevated border border-border text-xs text-text-primary"
                      >
                        {a.student.firstName} {a.student.lastName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Schedule */}
      <Card
        title="Roll Call Schedule"
        action={
          canManage && (
            <Button
              size="sm"
              onClick={() => {
                setSlotEditing(null);
                setSlotOpen(true);
              }}
            >
              <Plus size={14} /> Add slot
            </Button>
          )
        }
      >
        {dorm.schedules.length === 0 ? (
          <p className="text-sm text-text-secondary py-4">No roll call slots.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {dorm.schedules.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 border border-border rounded-lg p-3 bg-bg-base"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant={s.slot === 'morning' ? 'warning' : 'brand'}>
                    {s.slot}
                  </Badge>
                  <span className="inline-flex items-center gap-1 text-sm text-text-primary">
                    <Clock size={14} /> {s.timeOfDay}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                    <Calendar size={12} />
                    {s.daysOfWeek.map((d) => DAY_LABELS[d]).join(', ')}
                  </span>
                  {s.allowsMessyRoomPoints && (
                    <Badge variant="danger">Messy +1</Badge>
                  )}
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSlotEditing(s);
                        setSlotOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Delete this slot?')) removeSlot.mutate(s.id);
                      }}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <DormFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={dorm}
      />
      <RoomFormModal
        open={roomFormOpen}
        onClose={() => setRoomFormOpen(false)}
        dormId={dorm.id}
        initial={roomEditing}
      />
      <RoomResidentsModal
        open={!!residentsRoom}
        onClose={() => setResidentsRoom(null)}
        dormId={dorm.id}
        room={residentsRoom}
      />
      <ScheduleSlotModal
        open={slotOpen}
        onClose={() => setSlotOpen(false)}
        dormId={dorm.id}
        initial={slotEditing}
      />
    </div>
  );
}
