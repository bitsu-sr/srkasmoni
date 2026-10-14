import { TDocumentDefinitions, TableCell } from 'pdfmake/interfaces';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Payout } from '../types/payout';
import { PaymentSlot } from '../types/paymentSlot';
import { Payment } from '../types/payment';
import type { Group, GroupMember } from '../types/member';
import type { GroupWithDetails } from './groupsOptimizedService';
import { formatMemberName } from '../utils/memberName';
import { formatGroupAmount } from '../utils/currency';

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

  /**
   * Generate a PDF report for a group with members and slots (like the GroupDetails page).
   */
  /** Payment status for dot color: received=green, not_paid=red, pending=orange, settled=purple */
  async generateGroupDetailsPDF(
    group: Group,
    members: GroupMember[],
    statusByMemberAndMonth: Record<string, 'received' | 'not_paid' | 'pending' | 'settled'>,
    months: string[]
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Fetch logo and convert to base64 (same as Payments/Payout PDFs)
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

        const formatMonthYear = (dateString: string): string => {
          try {
            const [year, month] = dateString.split('-').map(Number);
            if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return dateString;
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${monthNames[month - 1]} ${year}`;
          } catch {
            return dateString;
          }
        };

        const monthLetters = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
        const formatMonthLetter = (dateString: string): string => {
          try {
            const [_year, month] = dateString.split('-').map(Number);
            if (isNaN(month) || month < 1 || month > 12) return '?';
            return monthLetters[month - 1];
          } catch {
            return '?';
          }
        };

        const calculateDuration = (startDate: string, endDate: string): number => {
          if (!startDate || !endDate) return 0;
          const [startYear, startMonth] = startDate.split('-').map(Number);
          const [endYear, endMonth] = endDate.split('-').map(Number);
          if (isNaN(startYear) || isNaN(startMonth) || isNaN(endYear) || isNaN(endMonth)) return 0;
          return (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
        };

        const groupDuration = group.startDate && group.endDate
          ? calculateDuration(group.startDate, group.endDate)
          : group.duration || 0;

        const membersPerMonth = new Map<string, number>();
        members.forEach((m) => {
          const d = typeof m.assignedMonthDate === 'string'
            ? m.assignedMonthDate
            : `2024-${String(m.assignedMonthDate).padStart(2, '0')}`;
          membersPerMonth.set(d, (membersPerMonth.get(d) || 0) + 1);
        });

        const statusToColor: Record<string, string> = {
          received: '#16a34a',  // Green = Paid
          not_paid: '#dc2626',   // Red = Unpaid
          pending: '#ea580c',    // Orange = Pending
          settled: '#7c3aed'    // Purple = Settled
        };
        const dotCell = (status: 'received' | 'not_paid' | 'pending' | 'settled'): TableCell => ({
          canvas: [
            {
              type: 'ellipse',
              x: 6,
              y: 6,
              r1: 4,
              r2: 4,
              color: statusToColor[status] ?? statusToColor.not_paid
            }
          ],
          margin: [0, 2, 0, 2],
          alignment: 'center'
        });

        const tableFontSize = 9;
        const header: TableCell[] = [
          { text: 'Month', bold: true, alignment: 'center', fillColor: '#007000', color: 'white', fontSize: tableFontSize },
          { text: 'Member', bold: true, alignment: 'center', fillColor: '#007000', color: 'white', fontSize: tableFontSize },
          { text: 'Receives', bold: true, alignment: 'center', fillColor: '#007000', color: 'white', fontSize: tableFontSize },
          ...months.map((m) => ({ text: formatMonthLetter(m), bold: true, alignment: 'center', fillColor: '#007000', color: 'white', fontSize: tableFontSize }))
        ];

        const body: TableCell[][] = [header];
        members.forEach((slot) => {
          const monthDate = typeof slot.assignedMonthDate === 'string'
            ? slot.assignedMonthDate
            : `2024-${String(slot.assignedMonthDate).padStart(2, '0')}`;
          const sharersCount = membersPerMonth.get(monthDate) || 1;
          const slotAmount = ((group.monthlyAmount || 0) / sharersCount) * groupDuration;

          body.push([
            { text: formatMonthYear(monthDate), fontSize: tableFontSize },
            { text: `${slot.member?.firstName || ''} ${slot.member?.lastName || ''}`.trim() || '-', fontSize: tableFontSize },
            { text: formatGroupAmount(slotAmount, group.currency), alignment: 'right', fontSize: tableFontSize },
            ...months.map((m) => dotCell(statusByMemberAndMonth[`${slot.memberId}-${m}`] ?? 'not_paid'))
          ]);
        });

        const uniqueMembers = new Set(members.map((m) => m.memberId)).size;
        const periodLabel = group.startDate && group.endDate
          ? `${formatMonthYear(group.startDate)} - ${formatMonthYear(group.endDate)}`
          : 'N/A';

        const content: any[] = [];

        if (logoBase64) {
          content.push({
            columns: [
              {
                image: `data:image/png;base64,${logoBase64}`,
                width: 50,
                height: 50
              },
              { text: '', width: '*' }
            ],
            margin: [0, 0, 0, 20]
          });
        }

        content.push(
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
          }
        );

        content.push(
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
                [{ text: 'Group Name:', fontSize: 9 }, { text: group.name, fontSize: 9 }],
                [{ text: 'Description:', fontSize: 9 }, { text: group.description || '-', fontSize: 9 }],
                [{ text: 'Monthly Amount:', fontSize: 9 }, { text: formatGroupAmount(group.monthlyAmount, group.currency), fontSize: 9 }],
                [{ text: 'Duration:', fontSize: 9 }, { text: `${groupDuration} months`, fontSize: 9 }],
                [{ text: 'Period:', fontSize: 9 }, { text: periodLabel, fontSize: 9 }],
                [{ text: 'Members / Slots:', fontSize: 9 }, { text: `${uniqueMembers} members, ${members.length} slots / ${group.maxMembers}`, fontSize: 9 }]
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
            text: 'Slots',
            fontSize: 14,
            bold: true,
            margin: [0, 0, 0, 10]
          },
          {
            table: {
              headerRows: 1,
              widths: ['auto', '*', 80, ...months.map(() => 14)],
              body
            },
            layout: {
              fillColor: (rowIndex: number) => {
                if (rowIndex === 0) return null;
                return rowIndex % 2 === 0 ? '#f9f9f9' : null;
              },
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#cccccc',
              vLineColor: () => '#cccccc'
            }
          }
        );

        const docDefinition: TDocumentDefinitions = {
          pageSize: 'A4',
          pageOrientation: 'portrait',
          pageMargins: [40, 60, 40, 60],
          header: {
            text: 'Sranan Kasmoni - Group Details',
            style: 'header',
            alignment: 'center',
            margin: [0, 10]
          },
          footer: (currentPage, pageCount) => ({
            text: `Page ${currentPage} of ${pageCount}`,
            alignment: 'right',
            margin: [0, 10, 40, 0],
            fontSize: 9
          }),
          content,
          styles: {
            header: { fontSize: 14, bold: true, color: '#007000' }
          }
        };

        const pdfDoc = pdfMake.createPdf(docDefinition);
        const safeName = group.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
        pdfDoc.download(`group-details-${safeName}-${new Date().toISOString().split('T')[0]}.pdf`);
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
  },

  // Generate contract PDF for a member and group
  async generateContractPDF(
    member: {
      id: number
      firstName: string
      middleName?: string
      lastName: string
      birthDate: string
      birthplace: string
      address: string
      city: string
      phone: string
      email: string
      nationalId: string
      occupation: string
      bankName: string
      accountNumber: string
    },
    group: {
      id: number
      name: string
      monthlyAmount: number
      startDate: string
      endDate: string
      duration: number
      maxMembers: number
    },
    assignedMonth: string
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const brandGreen = '#1F7A4D'
        const brandGreenDark = '#145A38'
        const brandGreenLight = '#EAF4EE'
        const textColor = '#24312A'
        const mutedTextColor = '#66736C'
        const borderColor = '#D7E2DB'

        // Load the public logo from the current deployment, so this also works
        // locally and on deployments with a different host.
        let logoDataUrl = ''
        try {
          const response = await fetch('/logokasmonigr.png')
          if (!response.ok) throw new Error(`Logo request failed (${response.status})`)
          const blob = await response.blob()
          logoDataUrl = await new Promise<string>((resolveLogo, rejectLogo) => {
            const reader = new FileReader()
            reader.onloadend = () => resolveLogo(String(reader.result || ''))
            reader.onerror = () => rejectLogo(reader.error)
            reader.readAsDataURL(blob)
          })
        } catch (error) {
          console.warn('Could not load contract logo, proceeding without it:', error)
        }

        // Kashouder information (from the PDF template)
        const kashouder = {
          name: 'LEVENS, Anastasio',
          birthDate: '22 juli 1979',
          birthplace: 'Paramaribo',
          address: 'Kasabaholoweg 188',
          city: 'Paramaribo',
          nationalId: 'EX004026',
          phone: '8869341',
          email: 'stasio.levens@gmail.com'
        }

        // Format dates
        const formatDate = (dateString: string): string => {
          try {
            const [year, month] = dateString.split('-')
            const monthNames = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 
                              'juli', 'augustus', 'september', 'oktober', 'november', 'december']
            return `${monthNames[parseInt(month) - 1]} ${year}`
          } catch {
            return dateString
          }
        }

        const formatDateShort = (dateString: string): string => {
          try {
            const [year, month, day] = dateString.split('-')
            return `${day} / ${month} / ${year}`
          } catch {
            return dateString
          }
        }

        const formatMonthName = (monthDate: string): string => {
          try {
            const [_year, month] = monthDate.split('-')
            const monthNames = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 
                              'juli', 'augustus', 'september', 'oktober', 'november', 'december']
            return monthNames[parseInt(month) - 1]
          } catch {
            return monthDate
          }
        }

        // Calculate dates
        const startDateFormatted = formatDate(group.startDate)
        const endDateFormatted = formatDate(group.endDate)
        const assignedMonthFormatted = formatMonthName(assignedMonth)

        // Calculate total amount
        const totalMonthly = group.monthlyAmount * group.duration
        const adminFee = 200
        const totalAmount = totalMonthly + adminFee

        // Format amounts in Dutch words
        const formatAmount = (amount: number): string => {
          // Handle common amounts
          if (amount === 5000) return 'VIJFDUIZEND'
          if (amount === 60000) return 'ZESTIGDUIZEND'
          if (amount === 200) return 'TWEEHONDERD'
          if (amount === 60200) return 'ZESTIGDUIZEND TWEEHONDERD'
          if (amount === 100) return 'HONDERD'
          if (amount === 3000) return 'DRIEDUIZEND'
          
          // For other amounts, use a simple conversion
          const thousands = Math.floor(amount / 1000)
          const remainder = amount % 1000
          
          let result = ''
          if (thousands > 0) {
            result += pdfService.numberToDutchWords(thousands).toUpperCase() + 'DUIZEND'
            if (remainder > 0) result += ' '
          }
          if (remainder > 0) {
            result += pdfService.numberToDutchWords(remainder).toUpperCase()
          }
          return result || 'NUL'
        }

        const content: any[] = []

        // Branded document header
        content.push({
          columns: [
            logoDataUrl
              ? { image: logoDataUrl, fit: [62, 62], width: 72 }
              : { text: 'SK', style: 'logoFallback', width: 72 },
            {
              stack: [
                { text: 'SRANAN KASMONI', style: 'brandName' },
                { text: 'OVEREENKOMST', style: 'documentTitle' },
                { text: `Contractnummer  SK-${group.id}-${member.id}-${assignedMonth}`, style: 'documentMeta' }
              ],
              margin: [10, 2, 0, 0]
            }
          ],
          margin: [0, 0, 0, 14]
        })

        content.push({
          canvas: [
            { type: 'line', x1: 0, y1: 0, x2: 491, y2: 0, lineWidth: 2, lineColor: brandGreen }
          ],
          margin: [0, 0, 0, 18]
        })

        content.push({
          table: {
            widths: ['*', '*', '*'],
            body: [[
              { stack: [{ text: 'KASGROEP', style: 'summaryLabel' }, { text: group.name, style: 'summaryValue' }] },
              { stack: [{ text: 'LOOPTIJD', style: 'summaryLabel' }, { text: `${group.duration} maanden`, style: 'summaryValue' }] },
              { stack: [{ text: 'UITBETALINGSMAAND', style: 'summaryLabel' }, { text: assignedMonthFormatted, style: 'summaryValue' }] }
            ]]
          },
          layout: {
            fillColor: () => brandGreenLight,
            hLineColor: () => borderColor,
            vLineColor: () => borderColor,
            paddingLeft: () => 12,
            paddingRight: () => 12,
            paddingTop: () => 10,
            paddingBottom: () => 10
          },
          margin: [0, 0, 0, 22]
        })

        // Contracting parties
        content.push({ text: 'CONTRACTERENDE PARTIJEN', style: 'sectionTitle' })
        content.push({
          table: {
            widths: [105, '*'],
            body: [
              [{ text: 'Kasdeelnemer', style: 'infoLabel' }, { text: formatMemberName(member), style: 'infoValue' }],
              [{ text: 'Geboortegegevens', style: 'infoLabel' }, { text: `${member.birthplace}, ${formatDateShort(member.birthDate)}`, style: 'infoValue' }],
              [{ text: 'Adres', style: 'infoLabel' }, { text: `${member.address}, ${member.city}`, style: 'infoValue' }],
              [{ text: 'Identiteitsnummer', style: 'infoLabel' }, { text: member.nationalId, style: 'infoValue' }],
              [{ text: 'Werkgever', style: 'infoLabel' }, { text: member.occupation || 'Niet opgegeven', style: 'infoValue' }],
              [{ text: 'Contact', style: 'infoLabel' }, { text: `${member.phone}  •  ${member.email}`, style: 'infoValue' }]
            ]
          },
          layout: {
            fillColor: (rowIndex: number) => rowIndex % 2 === 0 ? '#F7FAF8' : '#FFFFFF',
            hLineColor: () => borderColor,
            vLineColor: () => borderColor,
            paddingLeft: () => 9,
            paddingRight: () => 9,
            paddingTop: () => 6,
            paddingBottom: () => 6
          },
          margin: [0, 0, 0, 14]
        })

        content.push({
          stack: [
            { text: 'KASHOUDER', style: 'cardLabel' },
            {
              text: `${kashouder.name}, geboren te ${kashouder.birthplace} op ${kashouder.birthDate}, wonende aan de ${kashouder.address} te ${kashouder.city}, houder van het Surinaams identiteitsbewijs met nummer ${kashouder.nationalId}. Bereikbaar via ${kashouder.phone} en ${kashouder.email}.`,
              style: 'body'
            }
          ],
          fillColor: '#F7FAF8',
          margin: [10, 9, 10, 9]
        })

        content.push({
          text: 'De hierboven genoemde personen worden hierna gezamenlijk aangeduid als “partijen”.',
          style: 'introText',
          margin: [0, 12, 0, 24]
        })

        // Definitions
        content.push({
          text: 'DEFINITIES',
          style: 'sectionTitle'
        })

        content.push({
          text: 'IN DEZE OVEREENKOMST WORDT VERSTAAN ONDER:',
          style: 'subheading',
          margin: [0, 0, 0, 10]
        })

        content.push({
          ul: [
            {
              text: 'Kasmoni: Het totale bedrag dat maandelijks wordt ingezameld van alle kasdeelnemers, verminderd met de administratiekosten, dat wordt uitgekeerd aan de kasdeelnemer wiens beurt het is om te ontvangen.',
              fontSize: 10
            },
            {
              text: 'Kasgroep: Het geheel van alle deelnemers die deelnemen aan deze Kasmoni, inclusief de kashouder.',
              fontSize: 10
            },
            {
              text: 'Uitbetalingsmaand: De kalendermaand waarin de kasdeelnemer gerechtigd is de Kasmoni te ontvangen.',
              fontSize: 10
            },
            {
              text: 'Maandelijkse bijdrage: Het bedrag dat de kasdeelnemer maandelijks dient te voldoen gedurende de looptijd van deze overeenkomst.',
              fontSize: 10
            }
          ],
          margin: [0, 0, 0, 20]
        })

        // Overwegende dat
        content.push({
          text: 'OVERWEGENDE DAT:',
          style: 'sectionTitle',
          margin: [0, 0, 0, 10]
        })

        content.push({
          ul: [
            {
              text: 'De kashouder een Kasmoni beheert waarbij meerdere deelnemers maandelijks een vast bedrag inleggen;',
              fontSize: 10
            },
            {
              text: 'Elke kasdeelnemer op zijn beurt gerechtigd is tot ontvangst van het totale ingelegde bedrag (de Kasmoni);',
              fontSize: 10
            },
            {
              text: 'De kasdeelnemer zich verplicht tot betaling van de maandelijkse bijdrage gedurende de gehele looptijd;',
              fontSize: 10
            },
            {
              text: 'Partijen de wederzijdse rechten en plichten schriftelijk wensen vast te leggen in deze overeenkomst.',
              fontSize: 10
            }
          ],
          margin: [0, 0, 0, 20]
        })

        // Articles
        content.push({
          text: 'ZIJN ALS VOLGT OVEREENGEKOMEN:',
          style: 'agreementLead',
          margin: [0, 0, 0, 20]
        })

        // Article 1
        content.push({
          text: '1. Artikel 1 – Deelname en samenstelling kasgroep',
          style: 'articleTitle'
        })

        content.push({
          text: `1.1. De kasdeelnemer neemt deel aan een kasgroep bestaande uit in totaal ${group.maxMembers} (${pdfService.numberToDutchWords(group.maxMembers)}) deelnemers, inclusief de kashouder.`,
          fontSize: 10,
          margin: [0, 0, 0, 5]
        })

        content.push({
          text: `1.2. De kasdeelnemer ontvangt de Kasmoni in maand ${assignedMonthFormatted} van de looptijd.`,
          fontSize: 10,
          margin: [0, 0, 0, 20]
        })

        // Article 2
        content.push({
          text: '2. Artikel 2 – Looptijd en maandelijkse bijdrage',
          style: 'articleTitle'
        })

        content.push({
          text: `2.1. De looptijd van deze overeenkomst bedraagt ${group.duration} kalendermaanden, aanvangend op 28 ${startDateFormatted} en eindigend op 28 ${endDateFormatted}.`,
          fontSize: 10,
          margin: [0, 0, 0, 5]
        })

        content.push({
          text: `2.2. De maandelijkse bijdrage die door de kasdeelnemer dient te worden voldaan bedraagt SRD ${group.monthlyAmount.toLocaleString()},- (${formatAmount(group.monthlyAmount)} SURINAAMSE DOLLARS).`,
          fontSize: 10,
          margin: [0, 0, 0, 5]
        })

        content.push({
          text: `2.3. De eerste betaling dient uiterlijk op 28 ${startDateFormatted} te zijn voldaan. De daaropvolgende betalingen dienen telkens uiterlijk op de 28e dag van elke kalendermaand te zijn voldaan.`,
          fontSize: 10,
          margin: [0, 0, 0, 5]
        })

        content.push({
          text: `2.4. Het totaal door de kasdeelnemer verschuldigde bedrag gedurende de looptijd bedraagt SRD ${totalMonthly.toLocaleString()},- (maandelijkse bijdrage) vermeerderd met eenmalige administratiekosten van SRD ${adminFee.toLocaleString()},-, zijnde in totaal SRD ${totalAmount.toLocaleString()},- (${formatAmount(totalAmount)} SURINAAMSE DOLLARS).`,
          fontSize: 10,
          margin: [0, 0, 0, 5]
        })

        content.push({
          text: `2.5. De laatste betaling dient uiterlijk op 28 ${endDateFormatted} te zijn voldaan.`,
          fontSize: 10,
          margin: [0, 0, 0, 20]
        })

        // Article 3
        content.push({
          text: '3. Artikel 3 – Betalingswijze',
          style: 'articleTitle'
        })

        content.push({
          text: '3.1. Betalingen aan de kashouder dienen te geschieden middels bankoverschrijving naar één van de volgende rekeningnummers, onder vermelding van: "Boodschappen [naam kasdeelnemer] [maand]":',
          fontSize: 10,
          margin: [0, 0, 0, 5]
        })

        content.push({
          text: 'a) Rekeningnummer 5327830 bij DSB Bank, ten name van Levens, Anastasio;',
          fontSize: 10,
          margin: [20, 0, 0, 5]
        })

        content.push({
          text: 'b) Rekeningnummer 1001476501 bij Finabank, ten name van Levens, Anastasio.',
          fontSize: 10,
          margin: [20, 0, 0, 5]
        })

        content.push({
          text: `Voorbeeld betalingskenmerk: "Boodschappen ${formatMemberName(member)} ${assignedMonthFormatted}"`,
          fontSize: 10,
          margin: [0, 0, 0, 5]
        })

        content.push({
          text: '3.2. Contante betalingen zijn uitsluitend toegestaan na voorafgaande schriftelijke toestemming van de kashouder en dienen vergezeld te gaan van SRD 100,- aan administratiekosten.',
          fontSize: 10,
          margin: [0, 0, 0, 20]
        })

        // Continue with remaining articles (simplified for space)
        const remainingArticles = [
          {
            title: '4. Artikel 4 – Uitbetaling van de Kasmoni',
            content: [
              '4.1. De kashouder keert de Kasmoni uit aan de kasdeelnemer in diens uitbetalingsmaand, uitsluitend nadat alle kasdeelnemers hun maandelijkse bijdrage voor die maand volledig hebben voldaan.',
              '4.2. De uitbetaling geschiedt uiterlijk op de 5e dag van de maand volgend op de maand waarin alle betalingen zijn ontvangen.',
              `4.3. De Kasmoni wordt voor de kasdeelnemer overgemaakt naar het rekeningnummer bij de bankinstelling ten name van de kasdeelnemer.`,
              '4.4. Indien niet alle kasdeelnemers tijdig hebben betaald, wordt de uitbetalingsdatum automatisch uitgesteld totdat alle betalingen zijn ontvangen. De kashouder informeert de betrokken kasdeelnemer hierover binnen 24 uur na het verstrijken van de betalingstermijn.',
              '4.5. De kasdeelnemer blijft gehouden zijn eigen maandelijkse bijdragen tijdig te voldoen, ook indien uitbetaling van de Kasmoni aan hemzelf vertraagd is door betalingsachterstand van andere kasdeelnemers.'
            ]
          },
          {
            title: '5. Artikel 5 – Boetes en verzuim kasdeelnemer',
            content: [
              '5.1. Indien de kasdeelnemer zijn betalingsverplichting niet tijdig nakomt, is hij van rechtswege in verzuim zonder dat ingebrekestelling is vereist. De in deze overeenkomst genoemde data gelden als fatale termijnen.',
              '5.2. Bij verzuim is de kasdeelnemer een boete verschuldigd van SRD 100,- (HONDERD SURINAAMSE DOLLARS) per dag, met een maximum van SRD 3.000,- (DRIEDUIZEND SURINAAMSE DOLLARS) per kalendermaand.',
              '5.3. De boete is direct opeisbaar en laat onverlet het recht van de kashouder om volledige nakoming van de betalingsverplichting te vorderen.',
              '5.4. Bij het niet voldoen van de betalingsverplichting gedurende twee (2) opeenvolgende maanden heeft de kashouder het recht de kasdeelnemer met onmiddellijke ingang uit de kasgroep te verwijderen. In dat geval:',
              'a) vervalt het recht van de kasdeelnemer op uitbetaling van de Kasmoni;',
              'b) blijft de kasdeelnemer gehouden tot betaling van alle openstaande maandelijkse bijdragen, boetes en kosten;',
              'c) worden reeds door de kasdeelnemer betaalde bedragen niet gerestitueerd.'
            ]
          }
        ]

        remainingArticles.forEach(article => {
          content.push({
            text: article.title,
            style: 'articleTitle',
            margin: [0, 18, 0, 9]
          })

          article.content.forEach((para, index) => {
            const marginLeft = para.startsWith('a)') || para.startsWith('b)') || para.startsWith('c)') ? 20 : 0
            content.push({
              text: para,
              fontSize: 10,
              margin: [marginLeft, 0, 0, index === article.content.length - 1 ? 20 : 5]
            })
          })
        })

        // Signatures section
        content.push({
          text: '14. Ondertekening',
          style: 'articleTitle',
          margin: [0, 14, 0, 10]
        })

        content.push({
          text: 'Aldus opgemaakt en getekend door de Partijen en in tweevoud uitgegeven.',
          style: 'body',
          margin: [0, 0, 0, 20]
        })

        content.push({
          table: {
            widths: ['*', '*'],
            body: [[
              {
                stack: [
                  { text: 'DE KASDEELNEMER', style: 'signatureTitle' },
                  { text: formatMemberName(member), style: 'signatureName' },
                  { text: '\n\n________________________________', color: mutedTextColor },
                  { text: 'Handtekening', style: 'signatureLabel' },
                  { text: '\nDatum: _________________________', style: 'signatureLabel' }
                ]
              },
              {
                stack: [
                  { text: 'DE KASHOUDER', style: 'signatureTitle' },
                  { text: kashouder.name, style: 'signatureName' },
                  { text: '\n\n________________________________', color: mutedTextColor },
                  { text: 'Handtekening', style: 'signatureLabel' },
                  { text: '\nDatum: _________________________', style: 'signatureLabel' }
                ]
              }
            ]]
          },
          layout: {
            fillColor: () => '#F7FAF8',
            hLineColor: () => borderColor,
            vLineColor: () => borderColor,
            paddingLeft: () => 14,
            paddingRight: () => 14,
            paddingTop: () => 14,
            paddingBottom: () => 14
          },
          margin: [0, 0, 0, 20]
        })

        const docDefinition: TDocumentDefinitions = {
          pageSize: 'A4',
          pageMargins: [52, 54, 52, 58],
          defaultStyle: {
            fontSize: 10,
            color: textColor,
            lineHeight: 1.25
          },
          footer: (currentPage, pageCount) => ({
            margin: [52, 12, 52, 0],
            columns: [
              {
                text: 'SRANAN KASMONI  •  OVEREENKOMST',
                color: mutedTextColor,
                fontSize: 8
              },
              {
                text: `Pagina ${currentPage} van ${pageCount}`,
                alignment: 'right',
                color: mutedTextColor,
                fontSize: 8
              }
            ]
          }),
          content,
          styles: {
            logoFallback: {
              fontSize: 22,
              bold: true,
              color: '#FFFFFF',
              fillColor: brandGreen,
              alignment: 'center',
              margin: [0, 14, 0, 14]
            },
            brandName: {
              fontSize: 10,
              bold: true,
              color: brandGreen,
              characterSpacing: 1.5
            },
            documentTitle: {
              fontSize: 23,
              bold: true,
              color: brandGreenDark,
              margin: [0, 3, 0, 3]
            },
            documentMeta: { fontSize: 8.5, color: mutedTextColor },
            summaryLabel: {
              fontSize: 7.5,
              bold: true,
              color: brandGreen,
              characterSpacing: 0.8,
              margin: [0, 0, 0, 3]
            },
            summaryValue: { fontSize: 10.5, bold: true, color: brandGreenDark },
            sectionTitle: {
              fontSize: 10,
              bold: true,
              color: brandGreenDark,
              characterSpacing: 0.8,
              margin: [0, 0, 0, 9]
            },
            subheading: { fontSize: 9, bold: true, color: mutedTextColor },
            agreementLead: {
              fontSize: 10,
              bold: true,
              color: brandGreenDark,
              fillColor: brandGreenLight
            },
            articleTitle: {
              fontSize: 11,
              bold: true,
              color: brandGreenDark,
              margin: [0, 14, 0, 9]
            },
            infoLabel: { fontSize: 8.5, bold: true, color: mutedTextColor },
            infoValue: { fontSize: 9.5, color: textColor },
            cardLabel: {
              fontSize: 8,
              bold: true,
              color: brandGreen,
              characterSpacing: 0.8,
              margin: [0, 0, 0, 4]
            },
            body: { fontSize: 10, color: textColor, lineHeight: 1.25 },
            introText: { fontSize: 9.5, italics: true, color: mutedTextColor },
            signatureTitle: { fontSize: 8, bold: true, color: brandGreen, characterSpacing: 0.8 },
            signatureName: { fontSize: 10, bold: true, color: textColor, margin: [0, 5, 0, 0] },
            signatureLabel: { fontSize: 8.5, color: mutedTextColor, margin: [0, 3, 0, 0] }
          }
        }

        const pdfDoc = pdfMake.createPdf(docDefinition)
        const fileName = `Overeenkomst_${formatMemberName(member).replace(/\s+/g, '_')}_${group.name}_${assignedMonth}.pdf`
        pdfDoc.download(fileName)
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  },

  /**
   * Generate a PDF listing multiple groups with their member slots (Groups page export).
   */
  async generateGroupsListPDF(sectionTitle: string, groups: GroupWithDetails[]): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const formatMonthYear = (dateString: string): string => {
          try {
            const [year, month] = dateString.split('-').map(Number);
            if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return dateString;
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${monthNames[month - 1]} ${year}`;
          } catch {
            return dateString;
          }
        };

        const normalizeMonthDate = (date: string | number): string =>
          typeof date === 'string' ? date : `2024-${String(date).padStart(2, '0')}`;

        const calculateDuration = (startDate: string, endDate: string): number => {
          if (!startDate || !endDate) return 0;
          const [startYear, startMonth] = startDate.split('-').map(Number);
          const [endYear, endMonth] = endDate.split('-').map(Number);
          if ([startYear, startMonth, endYear, endMonth].some(n => isNaN(n))) return 0;
          return (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
        };

        const formatAmount = (amount: number, currency?: string | null): string =>
          formatGroupAmount(amount, currency, {
            locale: 'nl-NL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });

        const tableFontSize = 9;
        const headerFill = '#007000';
        const tableLayout = {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#000000',
          vLineColor: () => '#000000'
        };

        const content: any[] = [
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
            margin: [0, 0, 0, 16]
          }
        ];

        groups.forEach((group, groupIndex) => {
          const groupDuration = group.startDate && group.endDate
            ? calculateDuration(group.startDate, group.endDate)
            : group.duration || 0;
          const periodLabel = group.startDate && group.endDate
            ? `${formatMonthYear(group.startDate)} - ${formatMonthYear(group.endDate)}`
            : 'N/A';
          const members = group.members || [];

          const membersPerMonth = new Map<string, number>();
          members.forEach((m) => {
            const monthDate = normalizeMonthDate(m.assignedMonthDate);
            membersPerMonth.set(monthDate, (membersPerMonth.get(monthDate) || 0) + 1);
          });

          const sortedMembers = [...members].sort((a, b) =>
            normalizeMonthDate(a.assignedMonthDate).localeCompare(normalizeMonthDate(b.assignedMonthDate))
          );

          content.push({
            columns: [
              { text: group.name, bold: true, fontSize: 11 },
              { text: periodLabel, alignment: 'right', fontSize: 11 }
            ],
            margin: [0, groupIndex > 0 ? 24 : 0, 0, 8]
          });

          const tableHeader: TableCell[] = [
            { text: 'Month', bold: true, fillColor: headerFill, color: 'white', fontSize: tableFontSize },
            { text: 'Member', bold: true, fillColor: headerFill, color: 'white', fontSize: tableFontSize },
            { text: 'Monthly', bold: true, fillColor: headerFill, color: 'white', fontSize: tableFontSize },
            { text: 'Duration', bold: true, fillColor: headerFill, color: 'white', fontSize: tableFontSize },
            { text: 'Receives', bold: true, fillColor: headerFill, color: 'white', fontSize: tableFontSize }
          ];

          const tableBody: TableCell[][] = [tableHeader];

          if (sortedMembers.length === 0) {
            tableBody.push([
              { text: '-', fontSize: tableFontSize, colSpan: 5, alignment: 'center' },
              {}, {}, {}, {}
            ]);
          } else {
            sortedMembers.forEach((slot) => {
              const monthDate = normalizeMonthDate(slot.assignedMonthDate);
              const sharersCount = membersPerMonth.get(monthDate) || 1;
              const receivesAmount = ((group.monthlyAmount || 0) / sharersCount) * groupDuration;
              const memberName = `${slot.member?.firstName || ''} ${slot.member?.lastName || ''}`.trim() || '-';

              tableBody.push([
                { text: formatMonthYear(monthDate), fontSize: tableFontSize },
                { text: memberName, fontSize: tableFontSize },
                { text: formatAmount(group.monthlyAmount || 0, group.currency), fontSize: tableFontSize },
                { text: String(groupDuration), fontSize: tableFontSize },
                { text: formatAmount(receivesAmount, group.currency), fontSize: tableFontSize }
              ]);
            });
          }

          content.push({
            table: {
              headerRows: 1,
              widths: ['auto', '*', 'auto', 'auto', 'auto'],
              body: tableBody
            },
            layout: tableLayout,
            margin: [0, 0, 0, 8]
          });
        });

        const docDefinition: TDocumentDefinitions = {
          pageSize: 'A4',
          pageOrientation: 'portrait',
          pageMargins: [40, 60, 40, 60],
          header: {
            text: `Sranan Kasmoni - ${sectionTitle}`,
            style: 'header',
            alignment: 'center',
            margin: [0, 10]
          },
          footer: (currentPage, pageCount) => ({
            text: `Page ${currentPage} of ${pageCount}`,
            alignment: 'right',
            margin: [0, 10, 40, 0],
            fontSize: 9
          }),
          content,
          styles: {
            header: { fontSize: 14, bold: true, color: '#007000' }
          }
        };

        const sectionSlug = sectionTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const pdfDoc = pdfMake.createPdf(docDefinition);
        pdfDoc.download(`groups-${sectionSlug}-${new Date().toISOString().split('T')[0]}.pdf`);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },

  // Helper to convert numbers to Dutch words
  numberToDutchWords(num: number): string {
    const ones = ['', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien',
                  'elf', 'twaalf', 'dertien', 'veertien', 'vijftien', 'zestien', 'zeventien', 'achttien', 'negentien']
    const tens = ['', '', 'twintig', 'dertig', 'veertig', 'vijftig', 'zestig', 'zeventig', 'tachtig', 'negentig']

    if (num < 20) return ones[num]
    if (num < 100) {
      const ten = Math.floor(num / 10)
      const one = num % 10
      return one > 0 ? `${ones[one]}${tens[ten]}` : tens[ten]
    }
    return num.toString()
  }
};
