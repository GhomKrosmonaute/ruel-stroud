/* Endpoints: https://developer.gocardless.com/bank-account-data/endpoints */

import chalk from "chalk"
import cron from "node-cron"
import http from "http"
import querystring from "node:querystring"

import env from "#env"
import client from "#client"
import { Logger } from "#logger"

import bankingTable, { Banking } from "#tables/banking.ts"
import transactionTable from "#tables/transaction.ts"
import actorTable from "#tables/actor.ts"
import type { Middleware } from "#src/app/command.ts"
import { dayjs, getSystemMessage } from "#src/app/util.ts"

import * as types from "./banking.types.ts"
import discord from "discord.js"

const currencies: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
}

export const bankingLogger = new Logger({ section: "banking" })

export const bankingCache: Banking = {
  ACCESS: "",
  AGREEMENT_ID: "",
  REQUISITION_ID: "",
}

export const bankingMiddleware: Middleware<"all"> = async (message, data) => {
  return {
    data,
    result:
      message.channel.isDMBased() ||
      message.channelId === env.BOT_CHANNEL ||
      "This command is not available in this channel",
  }
}

export interface FormatPriceOptions {
  padStart?: number
  padEnd?: number
}

export function formatPrice(
  amount: types.Amount | string | number,
  options?: FormatPriceOptions,
) {
  let price: string

  switch (typeof amount) {
    case "string":
      price = amount
      break
    case "number":
      price = amount.toFixed(2)
      break
    default:
      price = amount.amount
  }

  price += typeof amount === "object" ? ` ${currencies[amount.currency]}` : " €"

  if (options?.padStart) {
    price = price.padStart(options.padStart)
  }

  if (options?.padEnd) {
    price = price.padEnd(options.padEnd)
  }

  return `\`${price}\``
}

export function formatActorName(transaction: types.Transaction) {
  return transaction.remittanceInformationUnstructuredArray
    ? getBestRemittanceInformation(
        transaction.remittanceInformationUnstructuredArray,
      )
    : transaction.remittanceInformationStructured ??
        transaction.remittanceInformationUnstructured ??
        "unknown"
}

function errorHandler(action: string) {
  return (response: Response) => {
    if (!response.ok) {
      bankingLogger.error(
        `${chalk.blueBright(action)} - ${response.status} ${response.statusText}`,
      )
      throw new Error(
        "Failed to perform banking request: Error " + response.status,
      )
    }
    return response
  }
}

export async function bankingNeedsToBeReconnected() {
  const link = await reconnectBanking()

  bankingLogger.warn(`needs to be reconnected via ${link}`)

  const channel = client.channels.cache.get(env.BOT_CHANNEL)

  let message: discord.Message | undefined

  if (channel?.isTextBased()) {
    message = await channel.send(
      await getSystemMessage("error", {
        content: `<@${env.BOT_OWNER}>`,
        title: "Banking reconnection needed",
        description: `You need to [reconnect](${link}) to the banking API.`,
        url: link,
      }),
    )
  }

  // launch a server endpoint to receive the connection confirmation

  const endpoint = http.createServer()

  return new Promise((resolve) => {
    endpoint.on("request", (request, response) => {
      response.writeHead(200)
      response.end("Connection confirmed")
      resolve(null)
    })
    endpoint.listen(env.BANKING_REDIRECT_PORT)
  }).then(async () => {
    endpoint.close()

    bankingLogger.success("successfully reconnected")

    message?.edit(
      await getSystemMessage("success", {
        title: "Banking reconnection",
        description: "Successfully reconnected",
      }),
    )
  })
}

export function launchBankingCron() {
  // every 3 hours
  cron.schedule("0 */3 * * *", async () => {
    try {
      // fetch last transactions and push new one to the database
      await recordTransactions({
        from: dayjs().subtract(3, "hours").toDate(),
        to: new Date(),
      })

      bankingLogger.success("transactions successfully updated")
    } catch (error) {
      bankingLogger.error("transactions failed to update")
    }
  })
}

export async function recordTransactions(options?: FetchTransactionsOptions) {
  const { transactions } = await fetchTransactions(options)

  const actorNames = transactions.booked.map((transaction) =>
    formatActorName(transaction),
  )

  await actorTable.query
    .insert(actorNames.map((name) => ({ name })))
    .onConflict("name")
    .ignore()

  const actors = await actorTable.query.whereIn("name", actorNames)

  await transactionTable.query
    .insert(
      transactions.booked.map((transaction) => ({
        actorId: actors.find(
          (actor) => actor.name === formatActorName(transaction),
        )!.id,
        date: resolveDate(transaction),
        amount: +transaction.transactionAmount.amount,
        id: resolveId(transaction),
      })),
    )
    .onConflict("id")
    .ignore()
}

export function resolveDate(transaction: types.Transaction) {
  return dayjs(
    transaction.bookingDateTime ??
      transaction.valueDateTime ??
      transaction.bookingDate ??
      transaction.valueDate,
  ).toDate()
}

export function resolveId(transaction: types.Transaction) {
  return (
    transaction.transactionId ??
    transaction.internalTransactionId ??
    JSON.stringify({
      actor: formatActorName(transaction),
      date: resolveDate(transaction),
      amount: +transaction.transactionAmount.amount,
    })
  )
}

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
  if (!bankingCache.ACCESS) {
    const accessToken = await createBankingAccessToken()

    bankingCache.ACCESS = accessToken.access
  }

  if (!bankingCache.AGREEMENT_ID) {
    try {
      const agreement = await createBankingAgreement()

      bankingCache.AGREEMENT_ID = agreement.id
    } catch (error) {
      const accessToken = await createBankingAccessToken()

      bankingCache.ACCESS = accessToken.access

      const agreement = await createBankingAgreement()

      bankingCache.AGREEMENT_ID = agreement.id
    }
  }

  let link: string

  try {
    const requisition = await createBankingRequisition()

    bankingCache.REQUISITION_ID = requisition.id

    link = requisition.link
  } catch (error) {
    const accessToken = await createBankingAccessToken()

    bankingCache.ACCESS = accessToken.access

    const agreement = await createBankingAgreement()

    bankingCache.AGREEMENT_ID = agreement.id

    const requisition = await createBankingRequisition()

    bankingCache.REQUISITION_ID = requisition.id

    link = requisition.link
  }

  await bankingTable.query.delete()
  await bankingTable.query.insert(bankingCache)

  return link
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

  const url = "https://bankaccountdata.gocardless.com/api/v2/token/new/"

  bankingLogger.log(`POST ${url}`)

  return fetch(url, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      secret_id: env.BANKING_SECRET_ID,
      secret_key: env.BANKING_SECRET_KEY,
    }),
  })
    .then(errorHandler("createBankingAccessToken"))
    .then((response) => response.json() as any)
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

  const url =
    "https://bankaccountdata.gocardless.com/api/v2/agreements/enduser/"

  bankingLogger.log(`POST ${url}`)

  return fetch(url, {
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
  })
    .then(errorHandler("createBankingAgreement"))
    .then((response) => response.json() as any)
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

  const url = "https://bankaccountdata.gocardless.com/api/v2/requisitions/"

  bankingLogger.log(`POST ${url}`)

  return fetch(url, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${bankingCache.ACCESS}`,
    },
    body: JSON.stringify({
      redirect: `http://localhost:${env.BANKING_REDIRECT_PORT}`,
      institution_id: env.BANKING_INSTITUTION_ID,
      agreement: bankingCache.AGREEMENT_ID,
      user_language: "FR",
    }),
  })
    .then(errorHandler("createBankingRequisition"))
    .then((response) => response.json() as any)
}

export interface FetchTransactionsOptions {
  from?: Date
  to?: Date
}

export async function fetchTransactions(
  options?: FetchTransactionsOptions,
): Promise<{
  transactions: {
    booked: types.Transaction[]
    pending: types.Transaction[]
  }
}> {
  // curl -X GET "https://bankaccountdata.gocardless.com/api/v2/accounts/065da497-e6af-4950-88ed-2edbc0577d20/transactions/" \
  //   -H  "accept: application/json" \
  //   -H  "Authorization: Bearer ACCESS_TOKEN"

  const url = `https://bankaccountdata.gocardless.com/api/v2/accounts/${env.BANKING_ACCOUNT_ID}/transactions?${
    options
      ? querystring.stringify({
          date_from: options.from?.toISOString().slice(0, 10),
          date_to: options.to?.toISOString().slice(0, 10),
        })
      : ""
  }`

  bankingLogger.log(`GET ${url}`)

  return fetch(url, {
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${bankingCache.ACCESS}`,
    },
  })
    .then(errorHandler("fetchTransactions"))
    .then((response) => response.json() as any)
}

export async function fetchBalance(): Promise<
  types.AccountBalance | undefined
> {
  // curl -X GET "https://bankaccountdata.gocardless.com/api/v2/accounts/065da497-e6af-4950-88ed-2edbc0577d20/balances/" \
  //   -H  "accept: application/json" \
  //   -H  "Authorization: Bearer ACCESS_TOKEN"

  const url = `https://bankaccountdata.gocardless.com/api/v2/accounts/${env.BANKING_ACCOUNT_ID}/balances/`

  bankingLogger.log(`GET ${url}`)

  return fetch(url, {
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${bankingCache.ACCESS}`,
    },
  })
    .then(errorHandler("fetchBalances"))
    .then(
      (response) =>
        response.json() as unknown as { balances: types.AccountBalance[] },
    )
    .then(({ balances }) =>
      balances.find((balance) => balance.balanceType === "information"),
    )
}
