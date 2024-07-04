import env from "#env"

import bankingTable, { Banking } from "#tables/banking.ts"

export const bankingCache: Banking = {
  ACCESS: "",
  AGREEMENT_ID: "",
  REQUISITION_ID: "",
}

/* Endpoints: https://developer.gocardless.com/bank-account-data/endpoints */

export function getBestRemittanceInformation(info: string[]) {
  // le string avec le plus de lettre est le plus intéressant
  return info
    .sort(
      (a, b) =>
        b.split("").filter((l) => /[a-z]/i.test(l)).length -
        a.split("").filter((l) => /[a-z]/i.test(l)).length,
    )[0]
    .replace(/\s+/g, " ")
}

/**
 * Reconnect to the banking API and return the confirmation link
 */
export async function reconnectBanking(): Promise<string> {
  const accessToken = await createBankingAccessToken()

  bankingCache.ACCESS = accessToken.access

  const agreement = await createBankingAgreement()

  bankingCache.AGREEMENT_ID = agreement.id

  const requisition = await createBankingRequisition()

  bankingCache.REQUISITION_ID = requisition.id

  await bankingTable.query.delete()
  await bankingTable.query.insert(bankingCache)

  return requisition.link
}

async function createBankingAccessToken(): Promise<{
  access: string
  access_expires: number
  refresh: string
  refresh_expires: number
}> {
  // curl -X POST "https://bankaccountdata.gocardless.com/api/v2/token/new/" \
  //   -H "accept: application/json" \
  //   -H  "Content-Type: application/json" \
  //   -d "{\"secret_id\":\"string\", \"secret_key\":\"string\"}"

  return fetch("https://bankaccountdata.gocardless.com/api/v2/token/new/", {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      secret_id: env.BANKING_SECRET_ID,
      secret_key: env.BANKING_SECRET_KEY,
    }),
  }).then((response) => {
    if (!response.ok) {
      console.error(response.status, response.statusText)
      throw new Error("Failed to create banking access token")
    }
    return response.json() as any
  })
}

async function createBankingAgreement(): Promise<{
  id: string
  created: string
  max_historical_days: number
  access_valid_for_days: number
  access_scope: string[]
  accepted: string
  institution_id: string
}> {
  // curl -X POST "https://bankaccountdata.gocardless.com/api/v2/agreements/enduser/" \
  //   -H  "accept: application/json" \
  //   -H  "Content-Type: application/json" \
  //   -H  "Authorization: Bearer ACCESS_TOKEN" \
  //   -d "{\"institution_id\": \"REVOLUT_REVOGB21\",
  //        \"max_historical_days\": \"90\",
  //        \"access_valid_for_days\": \"30\",
  //        \"access_scope\": [\"balances\", \"details\", \"transactions\"] }"

  return fetch(
    "https://bankaccountdata.gocardless.com/api/v2/agreements/enduser/",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${bankingCache.ACCESS}`,
      },
      body: JSON.stringify({
        institution_id: env.BANKING_INSTITUTION_ID,
        max_historical_days: 90,
        access_valid_for_days: 30,
        access_scope: ["balances", "details", "transactions"],
      }),
    },
  ).then((response) => {
    if (!response.ok) {
      console.error(response.status, response.statusText)
      throw new Error("Failed to create banking agreement")
    }
    return response.json() as any
  })
}

async function createBankingRequisition(): Promise<{
  id: string
  redirect: string
  status: {
    short: string
    long: string
    description: string
  }
  agreement: string
  accounts: string[]
  reference: string
  user_language: string
  link: string
}> {
  // curl -X POST "https://bankaccountdata.gocardless.com/api/v2/requisitions/" \
  //   -H  "accept: application/json" -H  "Content-Type: application/json" \
  //   -H  "Authorization: Bearer ACCESS_TOKEN" \
  //   -d "{\"redirect\": \"http://www.yourwebpage.com\",
  //        \"institution_id\": \"REVOLUT_REVOGB21\",
  //        \"reference\": \"124151\",
  //        \"agreement\": \"2dea1b84-97b0-4cb4-8805-302c227587c8\",
  //        \"user_language\":\"EN\" }"

  return fetch("https://bankaccountdata.gocardless.com/api/v2/requisitions/", {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${bankingCache.ACCESS}`,
    },
    body: JSON.stringify({
      redirect:
        "https://discord.com/developers/applications/1257663003650686986/information",
      institution_id: env.BANKING_INSTITUTION_ID,
      reference: env.BANKING_REFERENCE,
      agreement: bankingCache.AGREEMENT_ID,
      user_language: "FR",
    }),
  }).then((response) => {
    if (!response.ok) {
      console.error(response.status, response.statusText)
      throw new Error("Failed to create banking requisition")
    }
    return response.json() as any
  })
}

export type BankingTransaction<Booked extends boolean> = {
  transactionId: Booked extends true ? string : null
  debtorName: Booked extends true ? string : null
  debtorAccount: Booked extends true
    ? {
        iban: string
      }
    : null
  transactionAmount: {
    currency: "EUR"
    amount: string
  }
  bookingDate: Booked extends true ? string : null
  valueDate: string
  remittanceInformationUnstructured?: string
  remittanceInformationUnstructuredArray: string[]
}

export async function fetchTransactions(): Promise<{
  transactions: {
    booked: BankingTransaction<true>[]
    pending: BankingTransaction<false>[]
  }
}> {
  // curl -X GET "https://bankaccountdata.gocardless.com/api/v2/accounts/065da497-e6af-4950-88ed-2edbc0577d20/transactions/" \
  //   -H  "accept: application/json" \
  //   -H  "Authorization: Bearer ACCESS_TOKEN"

  return fetch(
    `https://bankaccountdata.gocardless.com/api/v2/accounts/${env.BANKING_ACCOUNT_ID}/transactions/`,
    {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${bankingCache.ACCESS}`,
      },
    },
  ).then((response) => {
    if (!response.ok) {
      console.error(response.status, response.statusText)
      throw new Error("Failed to fetch banking transactions")
    }
    return response.json() as any
  })
}
