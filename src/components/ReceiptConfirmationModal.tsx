import { FileText, X, Check, XCircle } from 'lucide-react'
import './ReceiptConfirmationModal.css'

interface ReceiptConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
}

const ReceiptConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  isLoading = false 
}: ReceiptConfirmationModalProps) => {
  if (!isOpen) return null

  return (
    <div className="receipt-modal-overlay" onClick={onClose}>
      <div className="receipt-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="receipt-modal-header">
          <div className="receipt-modal-icon">
            <FileText size={24} />
          </div>
          <button className="receipt-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="receipt-modal-body">
          <h3 className="receipt-modal-title">Generate Proof of Payment Receipt?</h3>
          <p className="receipt-modal-message">
            Would you like to generate a proof of payment receipt for this payment?
          </p>
        </div>

        <div className="receipt-modal-actions">
          <button 
            type="button" 
            className="btn btn-secondary receipt-modal-btn-no" 
            onClick={onClose}
            disabled={isLoading}
            autoFocus
          >
            <XCircle size={16} />
            No
          </button>
          <button 
            type="button" 
            className="btn btn-primary receipt-modal-btn-yes" 
            onClick={onConfirm}
            disabled={isLoading}
          >
            <Check size={16} />
            {isLoading ? 'Generating...' : 'Yes, Generate Receipt'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReceiptConfirmationModal
