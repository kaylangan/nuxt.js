import consola from 'consola'
import NuxtCommand from './command'
import * as commands from './commands'
import setup from './setup'

const prepareAndRun = async (commandModule) => {
  commandModule = commandModule.default
  const nuxtCmd = NuxtCommand({
    usage: commandModule.usage,
    description: commandModule.description,
    options: commandModule.options
  })
  await commandModule.run(nuxtCmd, consola)
}

export default function run() {
  const defaultCommand = 'dev'

  const cmds = new Set([
    defaultCommand,
    'build',
    'start',
    'generate'
  ])

  let cmd = process.argv[2]

  if (cmds.has(cmd)) {
    process.argv.splice(2, 1)
  } else {
    cmd = defaultCommand
  }

  // Setup runtime
  setup({
    dev: cmd === 'dev'
  })

  return commands[cmd]() // eslint-disable-line import/namespace
    .then(prepareAndRun)
    .catch((error) => {
      consola.fatal(error)
    })
}
