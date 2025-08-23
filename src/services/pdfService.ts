import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { Payout } from '../types/payout'

// Import the logo image
import logoSrc from '../../public/logokasmonigr.png'

export const pdfService = {
  generatePayoutPDF(payout: Payout, lastSlotPaid: boolean, adminFeePaid: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
    const doc = new jsPDF()
    
    // Set A4 dimensions
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    const margin = 18
    const contentWidth = pageWidth - (2 * margin)
    
    let yPosition = margin
    
    // Add actual logo image
    try {
      doc.addImage(logoSrc, 'PNG', margin, yPosition, 40, 20)
    } catch (error) {
      // Fallback to placeholder if image fails to load
      doc.setFillColor(59, 130, 246)
      doc.rect(margin, yPosition, 40, 20, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(12)
      doc.text('LOGO', margin + 20, yPosition + 12, { align: 'center' })
    }
    
    // Company name
    doc.setTextColor(0, 112, 0) // Excel Green color
    doc.setFontSize(28)
    doc.setFont('helvetica', 'bold')
    doc.text('Sranan Kasmoni', margin + 50, yPosition + 15)
    
    yPosition += 30
    
    // Title
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(`Payout Details of ${payout.memberName} from ${payout.groupName}`, margin, yPosition)
    
    yPosition += 15
    
    // Payout date
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    const today = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
    doc.text(`Payout Date: ${today}`, margin, yPosition)
    
    yPosition += 20
    
    // Group Information Section
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Group Information', margin, yPosition)
    yPosition += 12
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    const groupInfo = [
      ['Group Name:', payout.groupName],
      ['Monthly Amount:', `SRD ${payout.monthlyAmount.toLocaleString()}.00`],
      ['Duration:', `${payout.duration} months`],
      ['Administration Fee:', 'SRD 200.00']
    ]
    
    groupInfo.forEach(([label, value]) => {
      doc.text(label, margin, yPosition)
      doc.text(value, margin + 80, yPosition)
      yPosition += 7
    })
    
    yPosition += 15
    
    // Recipient Information Section
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Recipient Information', margin, yPosition)
    yPosition += 12
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    const recipientInfo = [
      ['Recipient Name:', payout.memberName],
      ['National ID:', `AB${payout.memberId.toString().padStart(6, '0')}`],
      ['Bank:', payout.bankName],
      ['Account Number:', payout.accountNumber]
    ]
    
    recipientInfo.forEach(([label, value]) => {
      doc.text(label, margin, yPosition)
      doc.text(value, margin + 80, yPosition)
      yPosition += 7
    })
    
    yPosition += 15
    
    // Calculation Breakdown Section
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Calculation Breakdown', margin, yPosition)
    yPosition += 12
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    const baseAmount = payout.monthlyAmount * payout.duration
    const lastSlotDeduction = lastSlotPaid ? 0 : payout.monthlyAmount
    const adminFeeDeduction = adminFeePaid ? 0 : 200
    const totalAmount = baseAmount - lastSlotDeduction - adminFeeDeduction
    
    const calculationData = [
      ['Base Amount:', `SRD ${baseAmount.toLocaleString()}.00`],
      ['Last Slot Deduction:', lastSlotPaid ? 'SRD 0.00' : `-SRD ${payout.monthlyAmount.toLocaleString()}.00`],
      ['Administration Fee Deduction:', adminFeePaid ? 'SRD 0.00' : '-SRD 200.00'],
      ['Total Amount:', `SRD ${totalAmount.toLocaleString()}.00`]
    ]
    
    calculationData.forEach(([label, value], index) => {
      const isTotal = index === calculationData.length - 1
      const isDeduction = index === 1 || index === 2
      
      if (isTotal) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
      }
      
      if (isDeduction && !lastSlotPaid && !adminFeePaid) {
        doc.setTextColor(220, 38, 38) // Red for deductions
      } else if (isTotal) {
        doc.setTextColor(5, 150, 105) // Green for total
      } else {
        doc.setTextColor(0, 0, 0) // Black for normal text
      }
      
      doc.text(label, margin, yPosition)
      doc.text(value, margin + 80, yPosition)
      yPosition += 7
      
      // Reset text color and font
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
    })
    
    // Add footer
    yPosition = pageHeight - 25
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text('Generated by Sranan Kasmoni System', margin, yPosition)
    
    // Format timestamp with DD-MMM-YYYY and 24-hour time
    const timestamp = new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    doc.text(`Generated on: ${timestamp}`, margin, yPosition + 5)
    
    // Save the PDF
    const fileName = `payout_${payout.memberName.replace(/\s+/g, '_')}_${payout.groupName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
    
    resolve()
  } catch (error) {
    reject(error)
  }
})
  }
}
