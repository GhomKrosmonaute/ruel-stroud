import type { Config } from "#app"
import { Options } from "discord.js"

const config: Config = {
  ignoreBots: true,
  async getPrefix() {
    return import("#env").then(({ default: env }) => env.BOT_PREFIX)
  },
  client: {
    intents: [
      "GuildMessages",
      "MessageContent",
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
        interval: 1000 * 60 * 60 * 24,

        // 3 days
        lifetime: 1000 * 60 * 60 * 24 * 3,
      },
    },
  },
}

export default config
