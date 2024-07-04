import * as app from "#app"

export default new app.Command({
  name: "banking",
  description: "The banking command",
  channelType: "all",
  botOwnerOnly: true,
  async run(message) {
    return app.sendCommandDetails(message, this)
  },
  subs: [
    new app.Command({
      name: "reconnect",
      aliases: ["login", "connect"],
      description: "Reconnect to the banking API",
      channelType: "all",
      botOwnerOnly: true,
      async run(message) {
        return message.channel.send(
          await app.getSystemMessage("default", {
            title: "Banking reconnection",
            description: await app.reconnectBanking(),
          }),
        )
      },
    }),
    new app.Command({
      name: "transactions",
      aliases: ["list"],
      description: "List the transactions",
      channelType: "all",
      botOwnerOnly: true,
      async run(message) {
        const { transactions } = await app.banking.fetchTransactions()

        new app.StaticPaginator({
          channel: message.channel,
          pages: await app.divider(transactions.booked, 10, (items) => {
            return app.getSystemMessage("default", {
              description: items
                .map(
                  (transaction) =>
                    `${transaction.debtorName} - ${transaction.transactionAmount.amount}${transaction.transactionAmount.currency}`,
                )
                .join("\n"),
            })
          }),
        })
      },
    }),
  ],
})
