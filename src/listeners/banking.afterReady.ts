import * as app from "#app"

import bankingTable from "#tables/banking.ts"
import chalk from "chalk"

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
        await app.fetchTransactions()

        return app.bankingLogger.success("session data successfully loaded")
      } catch (error) {}
    }

    try {
      const link = await app.reconnectBanking()

      app.bankingLogger.warn(`needs to be reconnected via ${link}`)
    } catch (error) {}

    app.bankingLogger.error(
      `${chalk.yellow("once")} ${chalk.blueBright("afterReady")} no session data found and failed to reconnect`,
    )

    process.exit(1)
  },
}

export default listener
