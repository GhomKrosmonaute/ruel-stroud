import { Table } from "#database"

export interface Subscription {
  interval: `${number} ${"year" | "month" | "week" | "day"}`
  lastPaymentDate: Date
  actorId: number
  doubts: boolean
}

export default new Table<Subscription>({
  name: "subscription",
  setup: (table) => {
    table.string("interval").defaultTo("1 month")
    table.dateTime("lastPaymentDate").notNullable()
    table
      .integer("actorId")
      .references("id")
      .inTable("actor")
      .onDelete("CASCADE")
      .notNullable()
    table.boolean("doubts").defaultTo(false)
  },
})
