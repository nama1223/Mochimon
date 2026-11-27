import './ConfirmModal.css';

interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export default function ConfirmModal({ message, onConfirm, onCancel, busy = false }: Props) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-sheet" onClick={event => event.stopPropagation()}>
        <div className="confirm-handle" />
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="confirm-cancel" onClick={onCancel} disabled={busy}>キャンセル</button>
          <button className="confirm-delete" onClick={onConfirm} disabled={busy}>削除</button>
        </div>
      </div>
    </div>
  );
}
