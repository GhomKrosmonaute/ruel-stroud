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
      aliases: ["list"],
      description: "List the transactions",
      channelType: "all",
      botOwnerOnly: true,
      middlewares: [app.bankingMiddleware],
      async run(message) {
        const { transactions } = await app.fetchTransactions()

        new app.StaticPaginator({
          channel: message.channel,
          placeHolder: await app.getSystemMessage("error", {
            title: "Transactions done",
            description: "No transactions found",
          }),
          idleTime: 600_000,
          pages: await app.divider(
            transactions.booked,
            10,
            (page, index, pages) => {
              const maxPriceLength = Math.max(
                ...page.map(
                  (t) => app.formatPrice(t.transactionAmount).length - 2,
                ),
              )

              return app.getSystemMessage("default", {
                title: "Transactions done",
                description: page
                  .map(
                    (transaction) =>
                      `${app.formatPrice(transaction.transactionAmount, {
                        padStart: maxPriceLength,
                      })} ${transaction.transactionAmount.amount.startsWith("-") ? "🔻" : "🔺"} <t:${app
                        .dayjs(
                          transaction.bookingDateTime ??
                            transaction.valueDateTime ??
                            transaction.bookingDate ??
                            transaction.valueDate,
                        )
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

        // new app.StaticPaginator({
        //   channel: message.channel,
        //   placeHolder: await app.getSystemMessage("error", {
        //     title: "Transactions en attente",
        //     description: "No transactions found",
        //   }),
        //   pages: await app.divider(
        //     transactions.pending,
        //     10,
        //     (page, index, pages) => {
        //       return app.getSystemMessage("default", {
        //         title: "Transactions en attente",
        //         description: page
        //           .map(
        //             (transaction) =>
        //               `<t:${app.dayjs(transaction.valueDate, "YYYY-MM-DD").unix()}:D> \`${
        //                 transaction.transactionAmount.amount
        //               } €\` ${app.getBestRemittanceInformation(
        //                 transaction.remittanceInformationUnstructuredArray,
        //               )}`,
        //           )
        //           .join("\n"),
        //         footer: { text: `Page: ${index + 1} / ${pages.length}` },
        //       })
        //     },
        //   ),
        // })
      },
    }),
  ],
})
