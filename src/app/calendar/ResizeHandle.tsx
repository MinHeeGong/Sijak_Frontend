import { clsx } from "clsx";

export function ResizeHandle({
  onMouseDown, className,
}: {
  onMouseDown: (e: React.MouseEvent) => void;
  className?: string;
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={clsx(
        "group relative flex-shrink-0 w-2.5 cursor-col-resize select-none",
        className
      )}
    >
      <div className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors" />
    </div>
  );
}
