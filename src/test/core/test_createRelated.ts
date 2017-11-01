
import {Project, File} from './inc/'

let pro: Project
async function createFile(name: string, content: string, result: boolean): Promise<File> {
  let f = new File(name, pro)
  f.write(content)
  await f.related(result)
  return f
}

describe('createRelated init', () => {
  beforeEach(() => pro = new Project('createRelated', 'related', false))
  afterEach(() => pro.destroy())

  it('should return false when file is not exists or file is not text file', async () => {
    let f = new File('xxx', pro)
    await f.related(false)

    f.dir()
    await f.related(false)
  })

  it('should return false when no related source', async () => {
    await createFile('xxx', '', false)
  })

  it('should return false when has related source but file not exists', async () => {
    let f = new File('no-inject', pro)
    await f.related(false)
  })

  it('should return true when file exists and has related source', async () => {
    await createFile('no-inject', 'any', true)
  })
})


describe('createRelated execute & event', () => {
  beforeEach(() => pro = new Project('createRelated', 'related', true))
  afterEach(() => pro.destroy())

  it('related files should be created and rendered', async () => {
    await createFile('a/no-inject', '', true)
    let f1 = new File('a/relative/no-inject', pro)
    let f2 = new File('absolute/other', pro)
    f1.shouldExists()
    f2.shouldExists()

    f1.shouldMatch('no-inject content')
    f2.shouldMatch('')

    pro.matchListens(3, [{type: 'createdFile'}, {type: 'updatedFile'}, {type: 'createdFile'}])
  })

  // it('inject-start', async )

})
