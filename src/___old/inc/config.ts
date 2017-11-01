import {workspace} from 'vscode'
import * as minimatch from 'minimatch'
const c = () => workspace.getConfiguration('dot-template')

export const config = {
  get dtplFolderName(): string {
    return c().get('dtplFolderName') || '.dtpl'
  },

  get minimatchOptions(): minimatch.IOptions {
    return c().get('minimatchOptions') || {
      matchBase: true,
      nocomment: true,
      dot: true
    }
  },

  get renderExtensions(): {ejs: string, dtpl: string, njk: string} {
    let config = c()
    return {
      ejs: config.get('ejsExtension') || '.ejs',
      dtpl: config.get('dtplExtension') || '.dtpl',
      njk: config.get('njkExtension') || '.njk'
    }
  }
}
