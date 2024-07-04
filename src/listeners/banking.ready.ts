import * as app from "#app"

import bankingTable from "#tables/banking.ts"

const listener: app.Listener<"ready"> = {
  event: "ready",
  description: "Read the banking session data from the database",
  async run() {
    const banking = await bankingTable.query.first()

    if (banking) {
      app.bankingCache.ACCESS = banking.ACCESS
      app.bankingCache.AGREEMENT_ID = banking.AGREEMENT_ID
      app.bankingCache.REQUISITION_ID = banking.REQUISITION_ID
    } else {
      console.log(await app.reconnectBanking())
    }
  },
}

export default listener
