export interface Bank {
  id: number
  name: string
  shortName: string
  address: string
  createdAt: string
  updatedAt: string
}

export interface BankFormData {
  name: string
  shortName: string
  address: string
}
