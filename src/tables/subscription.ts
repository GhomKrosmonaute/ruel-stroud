import { Table } from "#database"

export interface Subscription {
  interval: `${number} ${"year" | "month" | "week" | "day"}`
  lastPaymentDate: Date
  debtorId: number
}

export default new Table<Subscription>({
  name: "subscription",
  setup: (table) => {
    table.string("interval").defaultTo("1 month")
    table.dateTime("lastPaymentDate").notNullable()
    table.integer("debtorId").notNullable().references("id").inTable("debtor")
  },
})
