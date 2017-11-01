import {Editor} from '../core/Editor'
import * as inquirer from 'inquirer'

export class CliEditor extends Editor {

  constructor(rootPath: string) {
    super(rootPath)
    this.configuration.debug = true
  }

  async confirm(message: string): Promise<boolean> {
    let answer = await inquirer.prompt({message, type: 'confirm', name: 'chose'})
    return answer.chose
  }

  dispose() {
  }
}
