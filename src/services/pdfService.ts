import { TDocumentDefinitions, TableCell } from 'pdfmake/interfaces';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Payout } from '../types/payout';
import { PaymentSlot } from '../types/paymentSlot';
import { Payment } from '../types/payment';

// Type for unpaid slots with member and group info
interface UnpaidSlot extends PaymentSlot {
  hasPayment: boolean;
}

export interface PaymentRow {
  firstName: string;
  lastName: string;
  group: string;
  slot: string;
  amountDue: string;
  status: string;
}

// Configure fonts for PDFMake
pdfMake.vfs = pdfFonts.vfs;

export const pdfService = {
  async generatePayoutPDF(
    payout: Payout,
    lastSlotPaid: boolean,
    adminFeePaid: boolean,
    settledDeductionAmount: number = 0,
    additionalCost: number = 0,
    payoutDate: string = '',
    paymentInfo?: {
      paymentMethod: 'bank_transfer' | 'cash'
      senderBankName?: string | null
      receiverBankName?: string | null
      notes?: string
    }
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Fetch logo and convert to base64
        let logoBase64 = '';
        try {
          const response = await fetch('https://srkasmoni.vercel.app/logokasmonigr.png');
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          logoBase64 = btoa(String.fromCharCode(...uint8Array));
        } catch (error) {
          console.warn('Could not fetch logo, proceeding without it:', error);
        }

        const content: any[] = [];
        
        // Add logo if available
        if (logoBase64) {
          content.push({
            columns: [
              {
                image: `data:image/png;base64,${logoBase64}`,
                width: 50,
                height: 50
              },
              {
                text: '',
                width: '*'
              }
            ],
            margin: [0, 0, 0, 20]
          });
        }
        
        content.push(
          {
            text: `Payout Details of ${payout.memberName} from ${payout.groupName}`,
            fontSize: 16,
            bold: true,
            margin: [0, 0, 0, 15]
          },
          {
            text: `Payout Date: ${payoutDate ? new Date(payoutDate).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            }) : new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}`,
            fontSize: 12,
            margin: [0, 0, 0, 20]
          },
          {
            text: 'Group Information',
            fontSize: 14,
            bold: true,
            margin: [0, 0, 0, 10]
          },
          {
            table: {
              widths: ['*', '*'],
              body: [
                ['Group Name:', payout.groupName],
                ['Monthly Amount:', `SRD ${payout.monthlyAmount.toLocaleString()}.00`],
                ['Duration:', `${payout.duration} months`],
                ['Administration Fee:', 'SRD 200.00']
              ]
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#cccccc',
              vLineColor: () => '#cccccc'
            },
            margin: [0, 0, 0, 20]
          },
          {
            text: 'Recipient Information',
            fontSize: 14,
            bold: true,
            margin: [0, 0, 0, 10]
          },
          {
            table: {
              widths: ['*', '*'],
              body: [
                ['Recipient Name:', payout.memberName],
                ['National ID:', `AB${payout.memberId.toString().padStart(6, '0')}`],
                ['Bank:', payout.bankName],
                ['Account Number:', payout.accountNumber]
              ]
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#cccccc',
              vLineColor: () => '#cccccc'
            },
            margin: [0, 0, 0, 20]
          }
        );

        // Payment Information Section (if provided)
        if (paymentInfo) {
          const methodLabel = paymentInfo.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'Cash';
          const paymentRows: any[] = [
            ['Payment Method:', methodLabel]
          ];
          if (paymentInfo.paymentMethod === 'bank_transfer') {
            paymentRows.push(
              ["Sranan Kasmoni's Bank:", paymentInfo.senderBankName || '-'],
              ["Recipient's Bank:", paymentInfo.receiverBankName || '-']
            );
          }
          if (paymentInfo.notes && paymentInfo.notes.trim().length > 0) {
            paymentRows.push(['Notes:', paymentInfo.notes]);
          }

          content.push(
            {
              text: 'Payment Information',
              fontSize: 14,
              bold: true,
              margin: [0, 0, 0, 10]
            },
            {
              table: {
                widths: ['*', '*'],
                body: paymentRows
              },
              layout: {
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => '#cccccc',
                vLineColor: () => '#cccccc'
              },
              margin: [0, 0, 0, 20]
            }
          );
        }

        const docDefinition: TDocumentDefinitions = {
          pageSize: 'A4',
          pageMargins: [40, 60, 40, 60],
          header: {
            columns: [
              {
                text: 'Sranan Kasmoni',
                style: 'companyName',
                alignment: 'left',
                width: '*'
              },
              {
                text: 'Payout Details',
                style: 'header',
                alignment: 'right',
                width: 'auto'
              }
            ],
            margin: [40, 10, 40, 10]
          },
          footer: {
            text: 'Generated by Sranan Kasmoni System.©2024. All rights reserved.',
            alignment: 'center',
            margin: [0, 10],
            fontSize: 8
          },
          content,
          styles: {
            header: { fontSize: 14, bold: true, color: '#007000' },
            companyName: { fontSize: 16, bold: true, color: '#007000' }
          }
        };

        const baseAmount = payout.monthlyAmount * payout.duration;
        const lastSlotDeduction = lastSlotPaid ? 0 : payout.monthlyAmount;
        const adminFeeDeduction = adminFeePaid ? 0 : 200;
        const subTotal = baseAmount - settledDeductionAmount - lastSlotDeduction - adminFeeDeduction;
        const totalAmount = subTotal - additionalCost;

        // Add Calculation Breakdown header before the calculation table
        content.push({
          text: 'Calculation Breakdown',
          fontSize: 14,
          bold: true,
          margin: [0, 0, 0, 10]
        });

        const calculationData = [
          [{ text: 'Base Amount:', bold: true }, { text: `SRD ${baseAmount.toLocaleString()}.00`, bold: true, alignment: 'right' }],
          ['Settled Deduction:', { text: `-SRD ${settledDeductionAmount.toLocaleString()}.00`, alignment: 'right' }],
          ['Last Slot Deduction:', { text: lastSlotPaid ? 'SRD 0.00' : `-SRD ${payout.monthlyAmount.toLocaleString()}.00`, alignment: 'right' }],
          ['Administration Fee Deduction:', { text: adminFeePaid ? 'SRD 0.00' : '-SRD 200.00', alignment: 'right' }],
          [{ text: 'Sub-total Amount:', bold: true }, { text: `SRD ${subTotal.toLocaleString()}.00`, bold: true, alignment: 'right' }],
          ['Additional Cost:', { text: additionalCost > 0 ? `-SRD ${additionalCost.toLocaleString()}.00` : 'SRD 0.00', alignment: 'right' }],
          [{ text: 'Total Amount:', bold: true }, { text: `SRD ${totalAmount.toLocaleString()}.00`, bold: true, alignment: 'right' }]
        ];

        content.push({
          table: {
            widths: ['*', '*'],
            body: calculationData
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#cccccc',
            vLineColor: () => '#cccccc',
            fillColor: (rowIndex: number) => {
              if (rowIndex === calculationData.length - 1) return '#e8f5e8';
              return null;
            }
          },
          margin: [0, 0, 0, 20]
        });

        const pdfDoc = pdfMake.createPdf(docDefinition);
        pdfDoc.download(`payout_${payout.memberName.replace(/\s+/g, '_')}_${payout.groupName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },

  generatePaymentsDuePDF(
    slots: UnpaidSlot[], 
    exportType: 'all' | 'paid' | 'unpaid',
    _stats: {
      totalSlots: number
      totalAmount: number
      totalAmountPaid: number
      totalAmountDue: number
    }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Filter slots based on export type
        let filteredSlots = slots;
        if (exportType === 'paid') {
          filteredSlots = slots.filter(slot => slot.hasPayment);
        } else if (exportType === 'unpaid') {
          filteredSlots = slots.filter(slot => !slot.hasPayment);
        }

        // Calculate filtered stats
        const filteredAmount = filteredSlots.reduce((sum, slot) => sum + slot.amount, 0);
        const filteredPaidAmount = filteredSlots.filter(slot => slot.hasPayment)
          .reduce((sum, slot) => sum + slot.amount, 0);
        const filteredDueAmount = filteredSlots.filter(slot => !slot.hasPayment)
          .reduce((sum, slot) => sum + slot.amount, 0);

        // Prepare table data
        const data: PaymentRow[] = filteredSlots.map((slot) => ({
          firstName: slot.member?.first_name || '',
          lastName: slot.member?.last_name || '',
          group: slot.group?.name || '',
          slot: this.formatMonthDate(slot.monthDate),
          amountDue: `SRD ${slot.amount.toLocaleString()}`,
          status: slot.hasPayment ? 'Paid' : 'Unpaid'
        }));

        const header: TableCell[] = [
          { text: '#', bold: true, alignment: 'center', fillColor: '#007000', color: 'white' },
          { text: 'First Name', bold: true, alignment: 'center', fillColor: '#007000', color: 'white' },
          { text: 'Last Name', bold: true, alignment: 'center', fillColor: '#007000', color: 'white' },
          { text: 'Group', bold: true, alignment: 'center', fillColor: '#007000', color: 'white' },
          { text: 'Slot', bold: true, alignment: 'center', fillColor: '#007000', color: 'white' },
          { text: 'Amount Due', bold: true, alignment: 'center', fillColor: '#007000', color: 'white' },
          { text: 'Status', bold: true, alignment: 'center', fillColor: '#007000', color: 'white' }
        ];

        const body: TableCell[][] = [header];

        data.forEach((row, index) => {
          body.push([
            { text: (index + 1).toString(), alignment: 'center' },
            row.firstName,
            row.lastName,
            row.group,
            row.slot,
            { text: row.amountDue, alignment: 'right' },
            { 
              text: row.status, 
              alignment: 'center',
              fillColor: row.status === 'Paid' ? '#d4edda' : '#f8d7da'
            }
          ]);
        });

        const docDefinition: TDocumentDefinitions = {
          pageSize: 'A4',
          pageMargins: [40, 60, 40, 60],
          header: {
            text: 'Sranan Kasmoni - Payments Due Report',
            style: 'header',
            alignment: 'center',
            margin: [0, 10]
          },
          footer: (currentPage, pageCount) => {
            return {
              text: `Page ${currentPage} of ${pageCount}`,
              alignment: 'right',
              margin: [0, 10, 40, 0],
              fontSize: 9
            };
          },
          content: [
            {
              text: `Generated on: ${new Date().toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              })}`,
              fontSize: 9,
              alignment: 'right',
              margin: [0, 0, 0, 10]
            },
            {
              text: `Export Type: ${exportType === 'all' ? 'All Rows' : 
                exportType === 'paid' ? 'Paid Rows Only' : 'Unpaid Rows Only'}`,
              fontSize: 12,
              margin: [0, 0, 0, 15]
            },
            {
              columns: [
                { 
                  text: `Filtered Slots: ${filteredSlots.length}`, 
                  width: '25%',
                  alignment: 'center',
                  fillColor: '#f8f9fa',
                  margin: [0, 0, 0, 5]
                },
                { 
                  text: `Filtered Amount: SRD ${filteredAmount.toLocaleString()}`, 
                  width: '25%',
                  alignment: 'center',
                  fillColor: '#f8f9fa',
                  margin: [0, 0, 0, 5]
                },
                { 
                  text: `Amount Paid: SRD ${filteredPaidAmount.toLocaleString()}`, 
                  width: '25%',
                  alignment: 'center',
                  fillColor: '#d4edda',
                  margin: [0, 0, 0, 5]
                },
                { 
                  text: `Amount Due: SRD ${filteredDueAmount.toLocaleString()}`, 
                  width: '25%',
                  alignment: 'center',
                  fillColor: '#f8d7da',
                  margin: [0, 0, 0, 5]
                }
              ],
              margin: [0, 0, 0, 20],
              fontSize: 10
            },
            {
              table: {
                headerRows: 1,
                widths: [30, '*', '*', '*', 'auto', 80, 60],
                body
              },
              layout: {
                fillColor: (rowIndex: number) => {
                  if (rowIndex === 0) return null; // Header already styled
                  return rowIndex % 2 === 0 ? '#f9f9f9' : null;
                },
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => '#cccccc',
                vLineColor: () => '#cccccc'
              }
            }
          ],
          styles: {
            header: { fontSize: 14, bold: true, color: '#007000' }
          }
        };

        const pdfDoc = pdfMake.createPdf(docDefinition);
        pdfDoc.download(`payments-due-export-${exportType}-${new Date().toISOString().split('T')[0]}.pdf`);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },

  // Generate proof of payment receipt
  async generatePaymentReceiptPDF(payment: Payment): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Fetch logo and convert to base64
        let logoBase64 = '';
        try {
          const response = await fetch('https://srkasmoni.vercel.app/logokasmonigr.png');
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          logoBase64 = btoa(String.fromCharCode(...uint8Array));
        } catch (error) {
          console.warn('Could not fetch logo, proceeding without it:', error);
        }

        const content: any[] = [];
        
        // Add logo if available
        if (logoBase64) {
          content.push({
            columns: [
              {
                image: `data:image/png;base64,${logoBase64}`,
                width: 50,
                height: 50
              },
              {
                text: '',
                width: '*'
              }
            ],
            margin: [0, 0, 0, 20]
          });
        }

        // Title
        content.push({
          text: 'PROOF OF PAYMENT RECEIPT',
          fontSize: 20,
          bold: true,
          alignment: 'center',
          color: '#217346',
          margin: [0, 0, 0, 20]
        });

        // Receipt details
        const receiptDate = new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });

        content.push({
          text: `Receipt Date: ${receiptDate}`,
          fontSize: 10,
          alignment: 'right',
          margin: [0, 0, 0, 10]
        });

        // Payment Information Section
        content.push({
          text: 'Payment Information',
          fontSize: 14,
          bold: true,
          color: '#217346',
          margin: [0, 20, 0, 10]
        });

        const paymentInfo = [
          ['Payment ID:', `#${payment.id}`],
          ['Payment Date:', new Date(payment.paymentDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          })],
          ['Payment Month:', new Date(payment.paymentMonth + '-01').toLocaleDateString('en-GB', {
            month: 'long',
            year: 'numeric'
          })],
          ['Amount:', `SRD ${payment.amount.toLocaleString()}.00`],
          ['Payment Method:', payment.paymentMethod === 'cash' ? 'Cash' : 'Bank Transfer'],
          ['Status:', payment.status.charAt(0).toUpperCase() + payment.status.slice(1).replace('_', ' ')]
        ];

        if (payment.paymentMethod === 'bank_transfer') {
          if (payment.senderBank?.name) {
            paymentInfo.push(['Sender Bank:', payment.senderBank.name]);
          }
          if (payment.receiverBank?.name) {
            paymentInfo.push(['Receiver Bank:', payment.receiverBank.name]);
          }
        }

        if (payment.fineAmount > 0) {
          paymentInfo.push(['Fine Amount:', `SRD ${payment.fineAmount.toLocaleString()}.00`]);
        }

        if (payment.notes) {
          paymentInfo.push(['Notes:', payment.notes]);
        }

        content.push({
          table: {
            widths: ['*', '*'],
            body: paymentInfo.map(row => [
              { text: row[0], bold: true },
              { text: row[1] as string }
            ])
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#cccccc',
            vLineColor: () => '#cccccc'
          },
          margin: [0, 0, 0, 20]
        });

        // Member Information Section
        if (payment.member) {
          content.push({
            text: 'Member Information',
            fontSize: 14,
            bold: true,
            color: '#217346',
            margin: [0, 20, 0, 10]
          });

          const memberInfo = [
            ['Name:', `${payment.member.firstName} ${payment.member.lastName}`]
          ];

          content.push({
            table: {
              widths: ['*', '*'],
              body: memberInfo.map(row => [
                { text: row[0], bold: true },
                { text: row[1] }
              ])
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#cccccc',
              vLineColor: () => '#cccccc'
            },
            margin: [0, 0, 0, 20]
          });
        }

        // Group Information Section
        if (payment.group) {
          content.push({
            text: 'Group Information',
            fontSize: 14,
            bold: true,
            color: '#217346',
            margin: [0, 20, 0, 10]
          });

          const groupInfo = [
            ['Group Name:', payment.group.name],
            ['Monthly Amount:', `SRD ${payment.group.monthlyAmount.toLocaleString()}.00`]
          ];

          content.push({
            table: {
              widths: ['*', '*'],
              body: groupInfo.map(row => [
                { text: row[0], bold: true },
                { text: row[1] }
              ])
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#cccccc',
              vLineColor: () => '#cccccc'
            },
            margin: [0, 0, 0, 20]
          });
        }

        // Footer note
        content.push({
          text: 'This is a computer-generated receipt. No signature is required.',
          fontSize: 9,
          italics: true,
          alignment: 'center',
          color: '#666666',
          margin: [0, 30, 0, 0]
        });

        const docDefinition: TDocumentDefinitions = {
          pageSize: 'A4',
          pageMargins: [40, 60, 40, 60],
          content,
          styles: {
            header: { fontSize: 14, bold: true, color: '#217346' }
          }
        };

        const memberName = payment.member 
          ? `${payment.member.firstName}_${payment.member.lastName}`.replace(/\s+/g, '_')
          : 'Payment';
        const pdfDoc = pdfMake.createPdf(docDefinition);
        pdfDoc.download(`payment_receipt_${memberName}_${payment.id}_${new Date().toISOString().split('T')[0]}.pdf`);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },

  // Helper function to format month date
  formatMonthDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
    } catch {
      return dateString;
    }
  }
};
