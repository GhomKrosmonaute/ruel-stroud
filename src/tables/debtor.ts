import { Table } from "#database"

export interface Debtor {
  id: number
  name: string
}

export default new Table<Debtor>({
  name: "debtor",
  setup: (table) => {
    table.increments("id").primary()
    table.string("name").notNullable()
  },
})
