interface ToastProps {
  message: string;
  show: boolean;
}

export function Toast({ message, show }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-[60] max-w-[320px] -translate-x-1/2 rounded-xl bg-text px-5 py-3 text-center text-sm font-medium text-bg shadow-soft transition-all duration-300"
      style={{
        opacity: show ? 1 : 0,
        transform: `translateX(-50%) translateY(${show ? "0" : "20px"})`,
        pointerEvents: "none",
      }}
    >
      {message}
    </div>
  );
}
