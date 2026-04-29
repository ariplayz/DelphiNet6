import { WidgetWrapper } from './WidgetWrapper';

interface Props {
  widget: { id: string; type: string };
  editMode?: boolean;
}

export function PlaceholderWidget({ widget, editMode }: Props) {
  return (
    <WidgetWrapper title={widget.type} editMode={editMode}>
      <div className="flex items-center justify-center h-full text-text-secondary text-sm">
        Unknown widget: {widget.type}
      </div>
    </WidgetWrapper>
  );
}
