"use client";
import { useEffect, useRef, useId } from "react";
import { X } from "lucide-react";
export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    titleId = useId();
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className="manage-dialog" aria-labelledby={titleId} onCancel={onClose}>
      <header>
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Đóng"
          title="Đóng"
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
