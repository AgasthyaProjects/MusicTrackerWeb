// ConfirmPopup.jsx
import './ConfirmPopup.css';

export default function ConfirmPopup({ message, onConfirm, onCancel }) {
  return (
    <div className="popup-overlay" onClick={onCancel}>
      <div
        className="popup-content"
        onClick={(e) => e.stopPropagation()}
      >
        <p>{message}</p>
        <div className="popup-actions">
          <button className="yes" onClick={onConfirm}>YES</button>
          <button className="cancel" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
