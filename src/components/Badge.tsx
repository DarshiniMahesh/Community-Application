interface Props { status: string; label?: string; }

export default function Badge({ status, label }: Props) {
  return (
    <span className={`badge badge-${status}`}>{label ?? status}</span>
  );
}
