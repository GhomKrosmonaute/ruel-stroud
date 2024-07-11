export interface Transaction {
  additionalDataStructured?: object
  additionalInformation?: string
  additionalInformationStructured?: string
  balanceAfterTransaction?: Amount
  bankTransactionCode?: string
  bookingDate?: string // ISODate
  bookingDateTime?: string // ISODate
  checkId?: string
  creditorAccount?: AccountReference
  creditorAgent?: string // BICFI
  creditorId?: string
  creditorName?: string
  currencyExchange?: ReportExchangeRate[]
  debtorAccount?: AccountReference
  debtorAgent?: string // BICFI
  debtorName?: string
  endToEndId?: string
  entryReference?: string
  internalTransactionId?: string
  mandateId?: string
  merchantCategoryCode?: string
  proprietaryBankTransactionCode?: string
  purposeCode?: PurposeCode
  remittanceInformationStructured?: string
  remittanceInformationStructuredArray?: Remittance[]
  remittanceInformationUnstructured?: string
  remittanceInformationUnstructuredArray?: string[]
  transactionAmount: Amount
  transactionId?: string
  ultimateCreditor?: string
  ultimateDebtor?: string
  valueDate?: string // ISODate
  valueDateTime?: string // ISODate
}

export interface AccountReference {
  iban?: string
  bban?: string
  pan?: string
  maskedPan?: string
  msisdn?: string
}

export interface ReportExchangeRate {
  unitCurrency: string
  exchangeRate: number
  rateType: string
  contractIdentification?: string
  quotationDate?: string
  instructedAmount?: Amount
  counterAmount?: Amount
}

export interface PurposeCode {
  code: string
}

export interface Remittance {
  reference: string
}

export interface Amount {
  amount: string
  currency: string
}

export type BalanceType =
  | "closingAvailable"
  | "closingBooked"
  | "expected"
  | "forwardAvailable"
  | "interimAvailable"
  | "information"
  | "interimBooked"
  | "nonInvoiced"
  | "openingBooked"
  | "openingAvailable"
  | "previouslyClosedBooked"

export interface AccountBalance {
  balanceAmount: Amount
  balanceType: BalanceType
  creditLimitIncluded?: boolean
  lastChangeDateTime?: string // ISODateTime
  lastCommittedTransaction?: string // Max35Text
  referenceDate?: string // ISODate
}
