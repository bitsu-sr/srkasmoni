import type { Payment } from '../types/payment'

export const getDefaultPaymentNote = (status: Payment['status']): string => {
  switch (status) {
    case 'pending':
      return 'Your payment has been made, but not yet received.'
    case 'received':
      return 'Your payment has been made and received.'
    case 'settled':
      return 'Your payment has been settled with your Kasmoni'
    case 'not_paid':
      return 'You have not yet paid.'
    default:
      return 'Your payment has been made, but not yet received.'
  }
}
