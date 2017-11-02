import {Project, File} from './inc/'

let pro: Project
async function createDir(name: string, create: boolean, result: boolean): Promise<File> {
  let f = new File(name, pro)
  if (create) f.dir()
  await f.createDirectories(result)
  return f
}

describe('createDirectories init', () => {
  beforeEach(() => pro = new Project('createDirectories', 'js'))
  afterEach(() => pro.destroy())

  it('should return false when filePath is not directory', async () => {
    let f = new File('xx', pro)
    f.write('')
    await f.createDirectories(false)
  })
  it('should return false when directory has files in it', async () => {
    let f = new File('xx/a', pro)
    f.write('')
    await createDir('xx', false, false)
  })
  it('should return false when directory is not in project', async () => {
    await createDir('../xx', false, false)
  })

  it('should return false if directory not exists but not template', async () => {
    await createDir('xx', false, false)
  })
  it('should return false if directory is empty but not template', async () => {
    await createDir('xx', true, false)
  })

  it('should return true if directory not exists and has template', async () => {
    await createDir('dir', false, true)
  })
  it('should return true if directory is empty and has template', async () => {
    await createDir('dir', true, true)
  })
})

describe.only('createDirectories execute and events', () => {

})

// describe('createDirectories rollback and events', () => {})
