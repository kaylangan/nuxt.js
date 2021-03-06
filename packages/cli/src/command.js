import parseArgs from 'minimist'
import { name, version } from '../package.json'
import { loadNuxtConfig, indent, foldLines } from './utils'
import * as imports from './imports'

const startSpaces = 2
const optionSpaces = 2
const maxCharsPerLine = 80

export default class NuxtCommand {
  constructor({ name, description, usage, options, run } = {}) {
    this.name = name || ''
    this.description = description || ''
    this.usage = usage || ''
    this.options = Object.assign({}, options)
    this._run = run
  }

  static from(options) {
    if (options instanceof NuxtCommand) {
      return options
    }
    return new NuxtCommand(options)
  }

  _getMinimistOptions() {
    const minimistOptions = {
      alias: {},
      boolean: [],
      string: [],
      default: {}
    }

    for (const name of Object.keys(this.options)) {
      const option = this.options[name]

      if (option.alias) {
        minimistOptions.alias[option.alias] = name
      }
      if (option.type) {
        minimistOptions[option.type].push(option.alias || name)
      }
      if (option.default) {
        minimistOptions.default[option.alias || name] = option.default
      }
    }

    return minimistOptions
  }

  getArgv(args) {
    const minimistOptions = this._getMinimistOptions()
    const argv = parseArgs(args || process.argv.slice(2), minimistOptions)

    if (argv.version) {
      this.showVersion()
    } else if (argv.help) {
      this.showHelp()
    }

    return argv
  }

  run() {
    return this._run(this)
  }

  async getNuxtConfig(argv, extraOptions) {
    const config = await loadNuxtConfig(argv)
    const options = Object.assign(config, extraOptions || {})

    for (const name of Object.keys(this.options)) {
      if (this.options[name].prepare) {
        this.options[name].prepare(this, options, argv)
      }
    }

    return options
  }

  async getNuxt(options) {
    const { Nuxt } = await imports.core()
    return new Nuxt(options)
  }

  async getBuilder(nuxt) {
    const { Builder } = await imports.builder()
    const { BundleBuilder } = await imports.webpack()
    return new Builder(nuxt, BundleBuilder)
  }

  async getGenerator(nuxt) {
    const { Generator } = await imports.generator()
    const builder = await this.getBuilder(nuxt)
    return new Generator(nuxt, builder)
  }

  _getHelp() {
    const options = []
    let maxOptionLength = 0

    for (const name in this.options) {
      const option = this.options[name]

      let optionHelp = '--'
      optionHelp += option.type === 'boolean' && option.default ? 'no-' : ''
      optionHelp += name
      if (option.alias) {
        optionHelp += `, -${option.alias}`
      }

      maxOptionLength = Math.max(maxOptionLength, optionHelp.length)
      options.push([ optionHelp, option.description ])
    }

    const _opts = options.map(([option, description]) => {
      const i = indent(maxOptionLength + optionSpaces - option.length)
      return foldLines(
        option + i + description,
        maxCharsPerLine,
        startSpaces + maxOptionLength + optionSpaces * 2,
        startSpaces + optionSpaces
      )
    }).join('\n')

    const usage = foldLines(`Usage: nuxt ${this.usage} [options]`, maxCharsPerLine, startSpaces)
    const description = foldLines(this.description, maxCharsPerLine, startSpaces)
    const opts = foldLines(`Options:`, maxCharsPerLine, startSpaces) + '\n\n' + _opts

    return `${usage}\n\n${description}\n\n${opts}\n\n`
  }

  showVersion() {
    process.stdout.write(`${name} v${version}\n`)
    process.exit(0)
  }

  showHelp() {
    process.stdout.write(this._getHelp())
    process.exit(0)
  }
}
