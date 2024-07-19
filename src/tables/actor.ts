import { Table } from "#database"

export interface Actor {
  id: number
  name: string
}

export default new Table<Actor>({
  name: "actor",
  setup: (table) => {
    table.increments("id").primary()
    table.string("name").unique().notNullable()
  },
})
