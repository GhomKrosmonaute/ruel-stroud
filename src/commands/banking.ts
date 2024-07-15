import * as app from "#app"

export default new app.Command({
  name: "banking",
  aliases: ["bank", "money", "bk", "$"],
  description: "Use the banking API",
  channelType: "all",
  botOwnerOnly: true,
  middlewares: [app.bankingMiddleware],
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
      middlewares: [app.bankingMiddleware],
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
      name: "account",
      aliases: ["solde", "balance", "view", "status"],
      description: "View the account balances",
      channelType: "all",
      botOwnerOnly: true,
      middlewares: [app.bankingMiddleware],
      async run(message) {
        const balance = await app.fetchBalance()

        if (!balance) {
          return message.channel.send(
            await app.getSystemMessage("error", {
              title: "Account balance",
              description: "No account found",
            }),
          )
        }

        return message.channel.send(
          await app.getSystemMessage("default", {
            title: "Account balance",
            description: [
              `Amount: ${app.formatPrice(balance.balanceAmount)}`,
              `Remaining: ${app.formatPrice(
                app.env.BANKING_AUTHORIZED_OVERDRAFT +
                  +balance.balanceAmount.amount,
              )}`,
              `Remaining after subscriptions: \`? €\``,
            ].join("\n"),
          }),
        )
      },
    }),
    new app.Command({
      name: "transactions",
      aliases: ["list", "trx"],
      description: "List the transactions",
      channelType: "all",
      botOwnerOnly: true,
      middlewares: [app.bankingMiddleware],
      flags: [
        {
          flag: "p",
          name: "pending",
          aliases: ["waiting", "future", "next"],
          description: "List the pending transactions",
        },
        {
          flag: "t",
          name: "today",
          aliases: ["day", "date"],
          description: "List the transactions of today",
        },
      ],
      async run(message) {
        const { pending, today } = message.args
        const { transactions } = await app.fetchTransactions(
          today
            ? {
                from: new Date(),
                to: new Date(),
              }
            : undefined,
        )

        new app.StaticPaginator({
          channel: message.channel,
          placeHolder: await app.getSystemMessage("error", {
            title: `Transactions ${pending ? "pending" : "done"}`,
            description: "No transactions found",
          }),
          idleTime: 600_000,
          pages: await app.divider(
            transactions[pending ? "pending" : "booked"],
            10,
            (page, index, pages) => {
              const maxPriceLength = Math.max(
                ...page.map(
                  (t) => app.formatPrice(t.transactionAmount).length - 2,
                ),
              )

              return app.getSystemMessage("default", {
                title: `Transactions ${pending ? "pending" : "done"}`,
                description: page
                  .map(
                    (transaction) =>
                      `${app.formatPrice(transaction.transactionAmount, {
                        padStart: maxPriceLength,
                      })} ${transaction.transactionAmount.amount.startsWith("-") ? "🔻" : "🔺"} <t:${app
                        .dayjs(app.resolveDate(transaction))
                        .unix()}:${
                        transaction.bookingDateTime || transaction.valueDateTime
                          ? "f"
                          : "D"
                      }> ${
                        transaction.remittanceInformationUnstructuredArray
                          ? app.getBestRemittanceInformation(
                              transaction.remittanceInformationUnstructuredArray,
                            )
                          : transaction.remittanceInformationStructured ??
                            transaction.remittanceInformationUnstructured ??
                            "unknown"
                      }`,
                  )
                  .join("\n"),
                footer: { text: `Page: ${index + 1} / ${pages.length}` },
              })
            },
          ),
        })
      },
      subs: [
        new app.Command({
          name: "record",
          aliases: ["fetch", "load", "save"],
          description: "Bulk fetch the transactions and save them",
          channelType: "all",
          botOwnerOnly: true,
          middlewares: [app.bankingMiddleware],
          async run(message) {
            await app.recordTransactions()

            return message.channel.send(
              await app.getSystemMessage("default", {
                title: "Transactions recording",
                description: "Transactions recorded",
              }),
            )
          },
        }),
      ],
    }),
  ],
})
