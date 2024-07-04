![Bot avatar](https://cdn.discordapp.com/avatars/1257663003650686986/3b2fea5ac35a7567be509fa7ef02b585.webp?size=128&fit=cover&mask=circle)

# ruel-stroud

> Made with [bot.ts](https://ghom.gitbook.io/bot-ts/) by **ghom**  
> CLI version: `>=8.0.3`  
> Bot.ts version: `v8.0.0-Capi`  
> Licence: `ISC`

## Description

Bot Discord de gestion budgétaire créé avec [bot.ts](https://ghom.gitbook.io/bot-ts/)

## Specifications

You can find the documentation of bot.ts [here](https://ghom.gitbook.io/bot-ts/).  
Below you will find the specifications for **ruel-stroud**.  

## Configuration file

```ts
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
    BANKING_REFERENCE: z.string(),
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

```

## Commands

### Slash commands

- `/help` - Show slash command details or list all slash commands  
- `/ping` - Get the bot ping

### Textual commands

- `banking` - Use the banking API  
- `database` - Run SQL query on database  
- `eval` - JS code evaluator  
- `help` - Help menu  
- `info` - Get information about bot  
- `terminal` - Run shell command from Discord  
- `turn` - Turn on/off command handling

## Listeners

### Banking  

- `ready` - Read the banking session data from the database  
### Command  

- `messageCreate` - Handle messages for commands  
### Log  

- `afterReady` - Just log that bot is ready  
### Pagination  

- `interactionCreate` - Handle interactions for pagination  
- `messageDelete` - Remove existing paginator  
- `messageReactionAdd` - Handle reactions for pagination  
### Slash  

- `guildCreate` - Deploy slash commands to the new guild  
- `interactionCreate` - Handle interactions of slash commands  
- `ready` - Deploy slash commands everywhere

## Database

Using **sqlite3@latest** as database.  
Below you will find a list of all the tables used by **ruel-stroud**.

- banking

## Information

This readme.md is dynamic, it will update itself with the latest information.  
If you see a mistake, please report it and an update will be made as soon as possible.

- Used by: **1** Discord guild
- Last update date: **7/4/2024**
