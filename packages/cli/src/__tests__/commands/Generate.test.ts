import path from 'node:path'

import { defaultTestConfig } from '@prisma/config'
import { BaseContext, jestConsoleContext, jestContext } from '@prisma/get-platform'
import { ClientEngineType, getClientEngineType } from '@prisma/internals'

import { Generate } from '../../Generate'
import { promotions, renderPromotion } from '../../utils/handlePromotions'

const ctx = jestContext.new().add(jestConsoleContext()).assemble()

describe('using cli', () => {
  // Replace any possible entry in `promotions`'s texts with a fixed string to make the snapshot stable
  function sanitiseStdout(stdout: string): string {
    return Object.values(promotions)
      .map((promotion) => renderPromotion(promotion))
      .reduce((acc, curr) => {
        return acc.replace(curr, 'Tip: MOCKED RANDOM TIP')
      }, stdout)
      .trimEnd()
  }

  it('should work with a custom output dir', async () => {
    ctx.fixture('example-project')
    const data = await ctx.cli('generate')

    const stdout = sanitiseStdout(data.stdout)

    if (typeof data.signal === 'number' && data.signal !== 0) {
      throw new Error(data.stderr + data.stdout)
    }

    const { main } = await import(ctx.fs.path('main.ts'))

    if (getClientEngineType() === ClientEngineType.Binary) {
      expect(stdout).toMatchInlineSnapshot(`
        "Prisma schema loaded from prisma/schema.prisma

        ✔ Generated Prisma Client (v0.0.0, engine=binary) to ./generated/client in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: MOCKED RANDOM TIP"
      `)
    } else {
      expect(stdout).toMatchInlineSnapshot(`
        "Prisma schema loaded from prisma/schema.prisma

        ✔ Generated Prisma Client (v0.0.0) to ./generated/client in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: MOCKED RANDOM TIP"
      `)
    }

    await expect(main()).resolves.toMatchInlineSnapshot(`
      [
        {
          "email": "bob@bob.bob",
          "id": 1,
          "name": "Bobby Brown Sqlite",
        },
      ]
    `)
  }, 60_000) // timeout

  it('should work with prisma schema folder', async () => {
    ctx.fixture('multi-schema-files/valid-custom-output')
    const data = await ctx.cli('generate', '--schema=./prisma/schema')
    const stdout = sanitiseStdout(data.stdout)

    if (getClientEngineType() === ClientEngineType.Binary) {
      expect(stdout).toMatchInlineSnapshot(`
        "Prisma schema loaded from prisma/schema

        ✔ Generated Prisma Client (v0.0.0, engine=binary) to ./prisma/client in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: MOCKED RANDOM TIP"
      `)
    } else {
      expect(stdout).toMatchInlineSnapshot(`
        "Prisma schema loaded from prisma/schema

        ✔ Generated Prisma Client (v0.0.0) to ./prisma/client in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: MOCKED RANDOM TIP"
      `)
    }

    const { main } = await import(ctx.fs.path('main.ts'))
    await expect(main()).resolves.toMatchInlineSnapshot(`
      [
        {
          "id": "123",
        },
      ]
    `)
  })

  it('should display the right yarn command for custom outputs', async () => {
    ctx.fixture('custom-output-yarn')
    const data = await ctx.cli('generate')
    const stdout = sanitiseStdout(data.stdout)

    if (typeof data.signal === 'number' && data.signal !== 0) {
      throw new Error(data.stderr + data.stdout)
    }

    if (getClientEngineType() === ClientEngineType.Library) {
      expect(stdout).toMatchInlineSnapshot(`
        "Prisma schema loaded from prisma/schema.prisma

        ✔ Generated Prisma Client (v0.0.0) to ./generated/client in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: MOCKED RANDOM TIP"
      `)
    }
  })

  it('should display the right npm command for custom outputs', async () => {
    ctx.fixture('custom-output-npm')
    const data = await ctx.cli('generate')
    const stdout = sanitiseStdout(data.stdout)

    if (typeof data.signal === 'number' && data.signal !== 0) {
      throw new Error(data.stderr + data.stdout)
    }

    if (getClientEngineType() === ClientEngineType.Library) {
      expect(stdout).toMatchInlineSnapshot(`
        "Prisma schema loaded from prisma/schema.prisma

        ✔ Generated Prisma Client (v0.0.0) to ./generated/client in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: MOCKED RANDOM TIP"
      `)
    }
  })

  it('should display the right pnpm command for custom outputs', async () => {
    ctx.fixture('custom-output-pnpm')
    const data = await ctx.cli('generate')
    const stdout = sanitiseStdout(data.stdout)

    if (typeof data.signal === 'number' && data.signal !== 0) {
      throw new Error(data.stderr + data.stdout)
    }

    if (getClientEngineType() === ClientEngineType.Library) {
      expect(stdout).toMatchInlineSnapshot(`
        "Prisma schema loaded from prisma/schema.prisma

        ✔ Generated Prisma Client (v0.0.0) to ./generated/client in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: MOCKED RANDOM TIP"
      `)
    }
  })

  it('displays basic instructions in default outputs', async () => {
    ctx.fixture('default-output')
    const data = await ctx.cli('generate')

    if (typeof data.signal === 'number' && data.signal !== 0) {
      throw new Error(data.stderr + data.stdout)
    }

    // use regex to extract the output location below with a dummy location
    const outputLocation = data.stdout.match(/to (.*) in/)?.[1]
    let stdout = sanitiseStdout(data.stdout)
    stdout = stdout.replace(outputLocation!, '<output>')

    if (getClientEngineType() === ClientEngineType.Library) {
      expect(stdout).toMatchInlineSnapshot(`
        "Prisma schema loaded from prisma/schema.prisma

        ✔ Generated Prisma Client (v0.0.0) to <output> in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: MOCKED RANDOM TIP"
      `)
    } else {
      expect(stdout).toMatchInlineSnapshot(`
        "Prisma schema loaded from prisma/schema.prisma

        ✔ Generated Prisma Client (v0.0.0, engine=binary) to <output> in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: MOCKED RANDOM TIP"
      `)
    }
  })

  describe('should work with --allow-no-models', () => {
    const generateWithNoModels = async (ctx: BaseContext) => {
      const data = await ctx.cli('generate', '--allow-no-models')

      if (typeof data.signal === 'number' && data.signal !== 0) {
        throw new Error(data.stderr + data.stdout)
      }

      return data
    }

    test('with sqlite', async () => {
      ctx.fixture('no-models/sqlite')
      await generateWithNoModels(ctx)
    })

    test('with mysql', async () => {
      ctx.fixture('no-models/mysql')
      await generateWithNoModels(ctx)
    })

    test('with postgresql', async () => {
      ctx.fixture('no-models/postgresql')
      await generateWithNoModels(ctx)
    })

    test('with sqlserver', async () => {
      ctx.fixture('no-models/sqlserver')
      await generateWithNoModels(ctx)
    })

    test('with mongo', async () => {
      ctx.fixture('no-models/mongo')
      await generateWithNoModels(ctx)
    })
  })

  it('should work with --no-engine', async () => {
    ctx.fixture('example-project')
    const data = await ctx.cli('generate', '--no-engine')
    const stdout = sanitiseStdout(data.stdout)

    if (typeof data.signal === 'number' && data.signal !== 0) {
      throw new Error(data.stderr + data.stdout)
    }

    if (getClientEngineType() === ClientEngineType.Binary) {
      expect(stdout).toMatchInlineSnapshot(`
        "Prisma schema loaded from prisma/schema.prisma

        ✔ Generated Prisma Client (v0.0.0, engine=none) to ./generated/client in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: MOCKED RANDOM TIP"
      `)
    } else {
      expect(stdout).toMatchInlineSnapshot(`
        "Prisma schema loaded from prisma/schema.prisma

        ✔ Generated Prisma Client (v0.0.0, engine=none) to ./generated/client in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: MOCKED RANDOM TIP"
      `)
    }
  })

  it('should hide hints with --no-hints', async () => {
    ctx.fixture('example-project')
    const data = await ctx.cli('generate', '--no-hints')

    if (typeof data.signal === 'number' && data.signal !== 0) {
      throw new Error(data.stderr + data.stdout)
    }

    const engineType = getClientEngineType()

    if (engineType === ClientEngineType.Binary) {
      expect(data.stdout).toMatchInlineSnapshot(`
        "Prisma schema loaded from prisma/schema.prisma

        ✔ Generated Prisma Client (v0.0.0, engine=binary) to ./generated/client in XXXms
        "
      `)
    } else {
      expect(data.stdout).toMatchInlineSnapshot(`
        "Prisma schema loaded from prisma/schema.prisma

        ✔ Generated Prisma Client (v0.0.0) to ./generated/client in XXXms
        "
      `)
    }
  })

  it('should work and not show hints with --no-hints and --no-engine', async () => {
    ctx.fixture('example-project')
    const data = await ctx.cli('generate', '--no-hints', '--no-engine')

    if (typeof data.signal === 'number' && data.signal !== 0) {
      throw new Error(data.stderr + data.stdout)
    }

    expect(data.stdout).toMatchInlineSnapshot(`
      "Prisma schema loaded from prisma/schema.prisma

      ✔ Generated Prisma Client (v0.0.0, engine=none) to ./generated/client in XXXms
      "
    `)
  })

  it('should call the survey handler when hints are not disabled', async () => {
    ctx.fixture('example-project')
    const handler = jest.fn()
    const generate = new Generate(handler)
    await generate.parse([], defaultTestConfig())
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should not call the survey handler when hints are disabled', async () => {
    ctx.fixture('example-project')
    const handler = jest.fn()
    const generate = new Generate(handler)
    await generate.parse(['--no-hints'], defaultTestConfig())
    expect(handler).not.toHaveBeenCalled()
  })

  it('should warn when `url` is hardcoded', async () => {
    ctx.fixture('hardcoded-url')
    const data = await ctx.cli('generate')
    const stdout = sanitiseStdout(data.stdout)

    if (typeof data.signal === 'number' && data.signal !== 0) {
      throw new Error(data.stderr + data.stdout)
    }

    if (getClientEngineType() === ClientEngineType.Binary) {
      expect(stdout).toMatchInlineSnapshot(`
        "Prisma schema loaded from prisma/schema.prisma

        ✔ Generated Prisma Client (v0.0.0, engine=binary) to ./generated/client in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: MOCKED RANDOM TIP"
      `)
    } else {
      expect(stdout).toMatchInlineSnapshot(`
        "Prisma schema loaded from prisma/schema.prisma

        ✔ Generated Prisma Client (v0.0.0) to ./generated/client in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: MOCKED RANDOM TIP

        🛑 Hardcoding URLs in your schema poses a security risk: https://pris.ly/d/datasource-env"
      `)
    }
  })

  it('should not warn when `url` is not hardcoded', async () => {
    ctx.fixture('env-url')
    const data = await ctx.cli('generate')
    const stdout = sanitiseStdout(data.stdout)

    if (typeof data.signal === 'number' && data.signal !== 0) {
      throw new Error(data.stderr + data.stdout)
    }

    if (getClientEngineType() === ClientEngineType.Binary) {
      expect(stdout).toMatchInlineSnapshot(`
        "Prisma schema loaded from prisma/schema.prisma

        ✔ Generated Prisma Client (v0.0.0, engine=binary) to ./generated/client in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: MOCKED RANDOM TIP"
      `)
    } else {
      expect(stdout).toMatchInlineSnapshot(`
        "Prisma schema loaded from prisma/schema.prisma

        ✔ Generated Prisma Client (v0.0.0) to ./generated/client in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: MOCKED RANDOM TIP"
      `)
    }
  })

  it('should not warn when `directUrl` is not hardcoded', async () => {
    ctx.fixture('env-direct-url')
    const data = await ctx.cli('generate')
    const stdout = sanitiseStdout(data.stdout)

    if (typeof data.signal === 'number' && data.signal !== 0) {
      throw new Error(data.stderr + data.stdout)
    }

    if (getClientEngineType() === ClientEngineType.Binary) {
      expect(stdout).toMatchInlineSnapshot(`
        "Prisma schema loaded from prisma/schema.prisma

        ✔ Generated Prisma Client (v0.0.0, engine=binary) to ./generated/client in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: MOCKED RANDOM TIP"
      `)
    } else {
      expect(stdout).toMatchInlineSnapshot(`
        "Prisma schema loaded from prisma/schema.prisma

        ✔ Generated Prisma Client (v0.0.0) to ./generated/client in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: MOCKED RANDOM TIP"
      `)
    }
  })

  it('should warn when `directUrl` is hardcoded', async () => {
    ctx.fixture('hardcoded-direct-url')
    const data = await ctx.cli('generate')
    const stdout = sanitiseStdout(data.stdout)

    if (typeof data.signal === 'number' && data.signal !== 0) {
      throw new Error(data.stderr + data.stdout)
    }

    if (getClientEngineType() === ClientEngineType.Binary) {
      expect(stdout).toMatchInlineSnapshot(`
        "Prisma schema loaded from prisma/schema.prisma

        ✔ Generated Prisma Client (v0.0.0, engine=binary) to ./generated/client in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: MOCKED RANDOM TIP"
      `)
    } else {
      expect(stdout).toMatchInlineSnapshot(`
        "Prisma schema loaded from prisma/schema.prisma

        ✔ Generated Prisma Client (v0.0.0) to ./generated/client in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: MOCKED RANDOM TIP

        🛑 Hardcoding URLs in your schema poses a security risk: https://pris.ly/d/datasource-env"
      `)
    }
  })

  it('should error with exit code 1 with incorrect schema', async () => {
    ctx.fixture('broken-example-project')
    await expect(ctx.cli('generate').catch((e) => e.exitCode)).resolves.toEqual(1)
  })

  it('should work with a custom generator', async () => {
    ctx.fixture('custom-generator')
    const data = await ctx.cli('generate')

    if (typeof data.signal === 'number' && data.signal !== 0) {
      throw new Error(data.stderr + data.stdout)
    }

    expect(data.stdout).toContain(`I am a minimal generator`)
  }, 75_000) // timeout
})

describe('--schema from project directory', () => {
  beforeEach(() => {
    jest.spyOn(Math, 'random').mockReturnValue(0.1)
  })

  afterEach(() => {
    jest.spyOn(Math, 'random').mockRestore()
  })

  it('--schema relative path: should work', async () => {
    expect.assertions(1)
    ctx.fixture('generate-from-project-dir')
    const result = await Generate.new().parse(['--schema=./schema.prisma'], defaultTestConfig())

    if (getClientEngineType() === ClientEngineType.Binary) {
      expect(result).toMatchInlineSnapshot(`
        "
        ✔ Generated Prisma Client (v0.0.0, engine=binary) to ./@prisma/client in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: Need your database queries to be 1000x faster? Accelerate offers you that and more: https://pris.ly/tip-2-accelerate
        "
      `)
    } else {
      expect(result).toMatchInlineSnapshot(`
        "
        ✔ Generated Prisma Client (v0.0.0) to ./@prisma/client in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: Need your database queries to be 1000x faster? Accelerate offers you that and more: https://pris.ly/tip-2-accelerate
        "
      `)
    }
  })

  it('--schema relative path: should fail - invalid path', async () => {
    ctx.fixture('generate-from-project-dir')
    const result = Generate.new().parse(['--schema=./doesnotexists.prisma'], defaultTestConfig())
    await expect(result).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Could not load \`--schema\` from provided path \`doesnotexists.prisma\`: file or directory not found"`,
    )
  })

  it('--schema absolute path: should work', async () => {
    ctx.fixture('generate-from-project-dir')
    const absoluteSchemaPath = path.resolve('./schema.prisma')
    const output = await Generate.new().parse([`--schema=${absoluteSchemaPath}`], defaultTestConfig())

    if (getClientEngineType() === ClientEngineType.Binary) {
      expect(output).toMatchInlineSnapshot(`
        "
        ✔ Generated Prisma Client (v0.0.0, engine=binary) to ./@prisma/client in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: Need your database queries to be 1000x faster? Accelerate offers you that and more: https://pris.ly/tip-2-accelerate
        "
      `)
    } else {
      expect(output).toMatchInlineSnapshot(`
        "
        ✔ Generated Prisma Client (v0.0.0) to ./@prisma/client in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: Need your database queries to be 1000x faster? Accelerate offers you that and more: https://pris.ly/tip-2-accelerate
        "
      `)
    }
  })

  it('--schema absolute path: should fail - invalid path', async () => {
    ctx.fixture('generate-from-project-dir')
    const absoluteSchemaPath = path.resolve('./doesnotexists.prisma')
    const result = Generate.new().parse([`--schema=${absoluteSchemaPath}`], defaultTestConfig())
    await expect(result).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Could not load \`--schema\` from provided path \`doesnotexists.prisma\`: file or directory not found"`,
    )
  })

  it('should throw errors if schema does not exist at default path', async () => {
    ctx.fixture('empty')
    const output = Generate.new().parse([], defaultTestConfig())
    await expect(output).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Could not find Prisma Schema that is required for this command.
      You can either provide it with \`--schema\` argument,
      set it in your Prisma Config file (e.g., \`prisma.config.ts\`),
      set it as \`prisma.schema\` in your package.json,
      or put it into the default location (\`./prisma/schema.prisma\`, or \`./schema.prisma\`.
      Checked following paths:

      schema.prisma: file not found
      prisma/schema.prisma: file not found

      See also https://pris.ly/d/prisma-schema-location"
    `)
  })
})

describe('in postinstall', () => {
  let oldEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    oldEnv = { ...process.env }
    process.env.PRISMA_GENERATE_IN_POSTINSTALL = 'true'
  })

  afterEach(() => {
    process.env = { ...oldEnv }
  })

  it('should not throw errors if prisma schema not found', async () => {
    ctx.fixture('empty')
    const output = await Generate.new().parse([], defaultTestConfig())
    expect(output).toMatchInlineSnapshot(`""`)
  })
})

describe('--schema from parent directory', () => {
  beforeEach(() => {
    jest.spyOn(Math, 'random').mockReturnValue(0.1)
  })

  afterEach(() => {
    jest.spyOn(Math, 'random').mockRestore()
  })
  it('--schema relative path: should work', async () => {
    expect.assertions(1)
    ctx.fixture('generate-from-parent-dir')
    const result = await Generate.new().parse(['--schema=./subdirectory/schema.prisma'], defaultTestConfig())

    if (getClientEngineType() === ClientEngineType.Binary) {
      expect(result).toMatchInlineSnapshot(`
        "
        ✔ Generated Prisma Client (v0.0.0, engine=binary) to ./subdirectory/@prisma/client in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: Need your database queries to be 1000x faster? Accelerate offers you that and more: https://pris.ly/tip-2-accelerate
        "
      `)
    } else {
      expect(result).toMatchInlineSnapshot(`
        "
        ✔ Generated Prisma Client (v0.0.0) to ./subdirectory/@prisma/client in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: Need your database queries to be 1000x faster? Accelerate offers you that and more: https://pris.ly/tip-2-accelerate
        "
      `)
    }
  })

  it('--schema relative path: should fail - invalid path', async () => {
    ctx.fixture('generate-from-parent-dir')

    const result = Generate.new().parse(['--schema=./subdirectory/doesnotexists.prisma'], defaultTestConfig())
    await expect(result).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Could not load \`--schema\` from provided path \`subdirectory/doesnotexists.prisma\`: file or directory not found"`,
    )
  })

  it('--schema absolute path: should work', async () => {
    expect.assertions(1)
    ctx.fixture('generate-from-parent-dir')
    const absoluteSchemaPath = path.resolve('./subdirectory/schema.prisma')
    const result = await Generate.new().parse([`--schema=${absoluteSchemaPath}`], defaultTestConfig())

    if (getClientEngineType() === ClientEngineType.Binary) {
      expect(result).toMatchInlineSnapshot(`
        "
        ✔ Generated Prisma Client (v0.0.0, engine=binary) to ./subdirectory/@prisma/client in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: Need your database queries to be 1000x faster? Accelerate offers you that and more: https://pris.ly/tip-2-accelerate
        "
      `)
    } else {
      expect(result).toMatchInlineSnapshot(`
        "
        ✔ Generated Prisma Client (v0.0.0) to ./subdirectory/@prisma/client in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: Need your database queries to be 1000x faster? Accelerate offers you that and more: https://pris.ly/tip-2-accelerate
        "
      `)
    }
  })

  it('--schema absolute path: should fail - invalid path', async () => {
    ctx.fixture('generate-from-parent-dir')

    const absoluteSchemaPath = path.resolve('./subdirectory/doesnotexists.prisma')
    const result = Generate.new().parse([`--schema=${absoluteSchemaPath}`], defaultTestConfig())
    await expect(result).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Could not load \`--schema\` from provided path \`subdirectory/doesnotexists.prisma\`: file or directory not found"`,
    )
  })

  it('--generator: should work - valid generator names', async () => {
    ctx.fixture('example-project')
    const result = await Generate.new().parse(
      ['--schema=./prisma/multiple-generator.prisma', '--generator=client', '--generator=client_3'],
      defaultTestConfig(),
    )

    if (getClientEngineType() === ClientEngineType.Binary) {
      expect(result).toMatchInlineSnapshot(`
        "
        ✔ Generated Prisma Client (v0.0.0, engine=binary) to ./generated/client in XXXms

        ✔ Generated Prisma Client (v0.0.0, engine=binary) to ./generated/client_3 in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: Need your database queries to be 1000x faster? Accelerate offers you that and more: https://pris.ly/tip-2-accelerate
        "
      `)
    } else {
      expect(result).toMatchInlineSnapshot(`
        "
        ✔ Generated Prisma Client (v0.0.0) to ./generated/client in XXXms

        ✔ Generated Prisma Client (v0.0.0) to ./generated/client_3 in XXXms

        Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

        Tip: Need your database queries to be 1000x faster? Accelerate offers you that and more: https://pris.ly/tip-2-accelerate
        "
      `)
    }
  })

  it('--generator: should fail - single invalid generator name', async () => {
    ctx.fixture('example-project')

    await expect(
      Generate.new().parse(
        ['--schema=./prisma/multiple-generator.prisma', '--generator=client', '--generator=invalid_client'],
        defaultTestConfig(),
      ),
    ).rejects.toMatchInlineSnapshot(
      `"The generator invalid_client specified via --generator does not exist in your Prisma schema"`,
    )
  })

  it('--generator: should fail - multiple invalid generator names', async () => {
    ctx.fixture('example-project')

    await expect(
      Generate.new().parse(
        [
          '--schema=./prisma/multiple-generator.prisma',
          '--generator=client',
          '--generator=invalid_client',
          '--generator=invalid_client_2',
        ],
        defaultTestConfig(),
      ),
    ).rejects.toMatchInlineSnapshot(
      `"The generators invalid_client, invalid_client_2 specified via --generator do not exist in your Prisma schema"`,
    )
  })
})

describe('with --sql', () => {
  it('should throw error on invalid sql', async () => {
    ctx.fixture('typed-sql-invalid')
    await expect(Generate.new().parse(['--sql'], defaultTestConfig())).rejects.toMatchInlineSnapshot(`
      "Errors while reading sql files:

      In prisma/sql/invalidQuery.sql:
      Error: Error describing the query.
      error returned from database: (code: 1) near "Not": syntax error


      "
    `)
  })

  it('throws error on mssql', async () => {
    ctx.fixture('typed-sql-invalid-mssql')
    await expect(Generate.new().parse(['--sql'], defaultTestConfig())).rejects.toMatchInlineSnapshot(
      `"Typed SQL is supported only for postgresql, cockroachdb, mysql, sqlite providers"`,
    )
  })

  it('throws error on mongo', async () => {
    ctx.fixture('typed-sql-invalid-mongo')
    await expect(Generate.new().parse(['--sql'], defaultTestConfig())).rejects.toMatchInlineSnapshot(
      `"Typed SQL is supported only for postgresql, cockroachdb, mysql, sqlite providers"`,
    )
  })
})
