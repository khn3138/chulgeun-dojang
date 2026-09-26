interface Props {
  title: string;
  onBack: () => void;
}

export function ScreenHeader({ title, onBack }: Props) {
  return (
    <header className="screen-header">
      <button type="button" className="back-btn" onClick={onBack}>
        ◀ 처음으로
      </button>
      <h1 className="screen-title">{title}</h1>
    </header>
  );
}
