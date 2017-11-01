import * as findup from 'mora-scripts/libs/fs/findup'
import * as path from 'path'
import * as assert from 'assert'
import * as fs from 'fs-extra'

export const rootPath = path.dirname(findup.pkg())
export const fixturesPath = path.resolve(rootPath, 'src/test/core/fixtures')

export {path, assert, fs}

export * from '../../../core/common'
export * from '../../../core/Application'
export * from '../../../adapter/TestEditor'
