import type { Config } from "#app"
import { Options } from "discord.js"

const config: Config = {
  ignoreBots: true,
  async getPrefix() {
    return import("#env").then(({ default: env }) => env.BOT_PREFIX)
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
}

export default config
