import { Table } from "#database"

export interface Transaction {
  id: number
  amount: number
  date: Date
  data: string
}

export default new Table<Transaction>({
  name: "transaction",
  setup: (table) => {
    table.increments("id").primary()
    table.float("amount").notNullable()
    table.dateTime("date").notNullable()
    table.string("data").notNullable()
  },
})
