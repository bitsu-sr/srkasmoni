import { AlertTriangle, Trash2, X } from 'lucide-react'
import './DeleteConfirmModal.css'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  itemName: string
  itemType: string
  isLoading?: boolean
}

const DeleteConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemName, 
  itemType, 
  isLoading = false 
}: DeleteConfirmModalProps) => {
  if (!isOpen) return null

  return (
    <div className="delete-modal-overlay" onClick={onClose}>
      <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-header">
          <div className="delete-modal-icon">
            <AlertTriangle size={24} />
          </div>
          <button className="delete-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="delete-modal-body">
          <h3 className="delete-modal-title">Delete {itemType}</h3>
          <p className="delete-modal-message">
            Are you sure you want to permanently delete <strong>{itemName}</strong>? 
            This action cannot be undone.
          </p>
        </div>

        <div className="delete-modal-actions">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-danger" 
            onClick={onConfirm}
            disabled={isLoading}
          >
            <Trash2 size={16} />
            {isLoading ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteConfirmModal
