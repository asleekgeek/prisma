import type { PrismaConfigInternal } from '@prisma/config'
import Debug from '@prisma/debug'
import {
  arg,
  checkUnsupportedDataProxy,
  Command,
  format,
  HelpError,
  inferDirectoryConfig,
  isError,
  loadEnvFile,
  loadSchemaContext,
  MigrateTypes,
} from '@prisma/internals'
import { bold, dim, green, red } from 'kleur/colors'

import { Migrate } from '../Migrate'
import { ensureDatabaseExists, parseDatasourceInfo } from '../utils/ensureDatabaseExists'
import { printDatasource } from '../utils/printDatasource'
import { printFilesFromMigrationIds } from '../utils/printFiles'

const debug = Debug('prisma:migrate:deploy')

export class MigrateDeploy implements Command {
  public static new(): MigrateDeploy {
    return new MigrateDeploy()
  }

  private static help = format(`
Apply pending migrations to update the database schema in production/staging

${bold('Usage')}

  ${dim('$')} prisma migrate deploy [options]

${bold('Options')}

  -h, --help   Display this help message
    --config   Custom path to your Prisma config file
    --schema   Custom path to your Prisma schema

${bold('Examples')}

  Deploy your pending migrations to your production/staging database
  ${dim('$')} prisma migrate deploy

  Specify a schema
  ${dim('$')} prisma migrate deploy --schema=./schema.prisma

`)

  public async parse(argv: string[], config: PrismaConfigInternal): Promise<string | Error> {
    const args = arg(
      argv,
      {
        '--help': Boolean,
        '-h': '--help',
        '--schema': String,
        '--config': String,
        '--telemetry-information': String,
      },
      false,
    )

    if (isError(args)) {
      return this.help(args.message)
    }

    if (args['--help']) {
      return this.help()
    }

    await loadEnvFile({ schemaPath: args['--schema'], printMessage: true, config })

    const schemaContext = await loadSchemaContext({
      schemaPathFromArg: args['--schema'],
      schemaPathFromConfig: config.schema,
    })
    const { migrationsDirPath } = inferDirectoryConfig(schemaContext, config)

    checkUnsupportedDataProxy({ cmd: 'migrate deploy', schemaContext })

    const adapter = await config.adapter?.()
    printDatasource({ datasourceInfo: parseDatasourceInfo(schemaContext.primaryDatasource), adapter })

    const schemaFilter: MigrateTypes.SchemaFilter = {
      externalTables: config.tables?.external ?? [],
      externalEnums: config.enums?.external ?? [],
    }

    const migrate = await Migrate.setup({ adapter, migrationsDirPath, schemaContext, schemaFilter })

    // `ensureDatabaseExists` is not compatible with WebAssembly.
    if (!adapter) {
      try {
        // Automatically create the database if it doesn't exist
        const wasDbCreated = await ensureDatabaseExists(schemaContext.primaryDatasource)
        if (wasDbCreated) {
          process.stdout.write('\n' + wasDbCreated + '\n')
        }
      } catch (e) {
        process.stdout.write('\n') // empty line
        throw e
      }
    }

    const listMigrationDirectoriesResult = await migrate.listMigrationDirectories()
    debug({ listMigrationDirectoriesResult })

    process.stdout.write('\n') // empty line
    if (listMigrationDirectoriesResult.migrations.length > 0) {
      const migrations = listMigrationDirectoriesResult.migrations
      process.stdout.write(
        `${migrations.length} migration${migrations.length > 1 ? 's' : ''} found in prisma/migrations\n`,
      )
    } else {
      process.stdout.write(`No migration found in prisma/migrations\n`)
    }

    let migrationIds: string[]
    try {
      process.stdout.write('\n') // empty line
      const { appliedMigrationNames } = await migrate.applyMigrations()
      migrationIds = appliedMigrationNames
    } finally {
      // Stop engine
      await migrate.stop()
    }

    process.stdout.write('\n') // empty line
    if (migrationIds.length === 0) {
      return green(`No pending migrations to apply.`)
    } else {
      return `The following migration(s) have been applied:\n\n${printFilesFromMigrationIds(
        'migrations',
        migrationIds,
        {
          'migration.sql': '',
        },
      )}
      
${green('All migrations have been successfully applied.')}`
    }
  }

  public help(error?: string): string | HelpError {
    if (error) {
      return new HelpError(`\n${bold(red(`!`))} ${error}\n${MigrateDeploy.help}`)
    }
    return MigrateDeploy.help
  }
}
