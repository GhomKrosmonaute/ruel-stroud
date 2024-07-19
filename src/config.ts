import { Config } from "#src/app/config.ts"
import { Options } from "discord.js"
import { z } from "zod"

export const config = new Config({
  ignoreBots: true,
  envSchema: z.object({
    BOT_CHANNEL: z.string(),
    BANKING_SECRET_ID: z.string(),
    BANKING_SECRET_KEY: z.string(),
    BANKING_ACCOUNT_ID: z.string(),
    BANKING_REDIRECT_PORT: z.coerce.number(),
    BANKING_INSTITUTION_ID: z.string(),
    BANKING_AUTHORIZED_OVERDRAFT: z.coerce.number().positive(),
  }),
  client: {
    intents: [
      "Guilds",
      "GuildMessages",
      "MessageContent",
      "DirectMessages",
      "DirectMessagePolls",
      "DirectMessageTyping",
    ],
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
