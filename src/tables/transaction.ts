import { Table } from "#database"

export interface Transaction {
  id: string
  actorId: number
  amount: number
  date: Date
  data: string
}

export default new Table<Transaction>({
  name: "transaction",
  setup: (table) => {
    table.string("id").unique().primary().notNullable()
    table.float("amount").notNullable()
    table.dateTime("date").notNullable()
    table
      .integer("actorId")
      .references("id")
      .inTable("actor")
      .onDelete("CASCADE")
      .notNullable()
  },
})
