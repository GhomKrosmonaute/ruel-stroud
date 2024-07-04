import { Table } from "#database"

export interface Banking {
  ACCESS: string
  AGREEMENT_ID: string
  REQUISITION_ID: string
}

export default new Table<Banking>({
  name: "banking",
  setup: (table) => {
    table.string("ACCESS").nullable()
    table.string("AGREEMENT_ID").nullable()
    table.string("REQUISITION_ID").nullable()
  },
})
