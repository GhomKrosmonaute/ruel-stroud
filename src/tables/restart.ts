import { Table } from "@ghom/orm"

export interface Restart {
  content: string
  last_channel_id: string
  last_message_id: string | null
  created_at: string
}

export default new Table<Restart>({
  name: "restart",
  setup: (table) => {
    table.string("content").notNullable()
    table.string("last_channel_id").notNullable()
    table.string("last_message_id")
  },
})
