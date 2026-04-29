import { WidgetWrapper } from './WidgetWrapper';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  editMode?: boolean;
}

export function WelcomeWidget({ editMode }: Props) {
  const { user } = useAuth();
  const now = new Date();
  const day = now.toLocaleDateString(undefined, { weekday: 'long' });
  const date = now.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <WidgetWrapper editMode={editMode}>
      <div className="flex flex-col justify-center h-full">
        <h2 className="text-xl sm:text-2xl font-semibold text-text-primary">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ''}
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          It's {day}, {date}
        </p>
      </div>
    </WidgetWrapper>
  );
}
