import { Config } from "#src/app/config.ts"
import { Options } from "discord.js"
import { z } from "zod"

export const config = new Config({
  ignoreBots: true,
  envSchema: z.object({
    BANKING_SECRET_ID: z.string(),
    BANKING_SECRET_KEY: z.string(),
    BANKING_ACCOUNT_ID: z.string(),
    BANKING_INSTITUTION_ID: z.string(),
    BANKING_REFERENCE: z.string().regex(/^\d+$/).max(7),
  }),
  async getPrefix(): Promise<string> {
    return import("#app").then(({ env }) => env.BOT_PREFIX)
  },
  client: {
    intents: ["Guilds", "GuildMessages", "MessageContent"],
    makeCache: Options.cacheWithLimits({
      ...Options.DefaultMakeCacheSettings,

      // don't cache reactions
      ReactionManager: 0,
    }),
    sweepers: {
      ...Options.DefaultSweeperSettings,
      messages: {
        // every day
        interval: 60 * 60 * 24,

        // 3 days
        lifetime: 60 * 60 * 24 * 3,
      },
    },
  },
})

export default config.options
