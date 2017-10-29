import {Command, IMatchedDtpl} from '../lib/'
// import * as _ from '../inc'
import * as fs from 'fs-extra'
import * as path from 'path'

export class CreateFolderCommand extends Command {
  private fromDir: string
  private toDir: string
  constructor(private dtpl: IMatchedDtpl) {
    super()
    this.fromDir = this.dtpl.templatePath
    this.toDir = this.dtpl.src.filePath
  }

  async execute(): Promise<boolean> {
    let {fromDir, toDir} = this
    fs.readdirSync(fromDir)
      .forEach(f => fs.copySync(path.join(fromDir, f), path.join(toDir, f)))
    return true
  }
  async rollback(): Promise<boolean> {
    let {toDir} = this
    fs.readdirSync(toDir).forEach(f => fs.unlinkSync(path.join(toDir, f)))
    return true
  }
}
