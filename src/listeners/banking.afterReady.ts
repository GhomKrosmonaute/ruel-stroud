import * as app from "#app"
import fs from "fs/promises"

import bankingTable from "#tables/banking.ts"
import chalk from "chalk"
import { bankingLogger } from "#app"

const listener: app.Listener<"afterReady"> = {
  event: "afterReady",
  description: "Read the banking session data from the database",
  once: true,
  async run() {
    const banking = await bankingTable.query.first()

    if (banking) {
      app.bankingCache.ACCESS = banking.ACCESS
      app.bankingCache.AGREEMENT_ID = banking.AGREEMENT_ID
      app.bankingCache.REQUISITION_ID = banking.REQUISITION_ID

      try {
        await app.fetchTransactions({
          from: app.dayjs().subtract(1, "day").toDate(),
          to: new Date(),
        })

        app.bankingLogger.success("session data successfully loaded")

        app.launchBankingCron()
      } catch (error: any) {
        if (error.message.includes("401")) {
          try {
            await app.bankingNeedsToBeReconnected()

            app.launchBankingCron()
          } catch (error) {
            bankingLogger.error(
              `${chalk.yellow("once")} ${chalk.blueBright("afterReady")} no session data found and failed to reconnect`,
            )

            process.exit(1)
          }
        } else {
          bankingLogger.error(
            `${chalk.yellow("once")} ${chalk.blueBright("afterReady")} no session data found and failed to fetch transactions`,
          )

          console.error(error)

          process.exit(1)
        }
      }
    }
  },
}

export default listener
