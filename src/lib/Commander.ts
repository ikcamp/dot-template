export abstract class Command {
  /**
   *
   * 执行当前命令
   *
   * @abstract
   * @returns {Promise<boolean>} 命令是否执行成功
   *
   *  - true：表示执行正常，会将命令打入历史记录
   *  - false: 表示执行不正常，不会将命令打入历史记录
   *
   * @throws 抛出异常的话，命令也不会打入历史记录
   *
   * @memberof Command
   */
  abstract async execute(): Promise<boolean>

  /**
   *
   * 回滚当前命令
   *
   * @abstract
   * @returns {Promise<boolean>}
   *
   *  - true：表示执行正常，会将命令打入历史记录
   *  - false: 表示执行不正常，不会将命令打入历史记录
   *
   * @throws 抛出异常的话，命令也不会打入历史记录
   *
   * @memberof Command
   */
  abstract async rollback(): Promise<boolean>
}

export class Commander {
  history: Command[] = []

  /**
   * 指向 prev 操作要执行的命令的索引
   */
  cursor: number = -1

  constructor(public length: number) {}

  get hasNext() { return this.cursor < this.length - 1 }
  get hasPrev() { return this.cursor > -1 }

  private async wrap<T>(fn: () => Promise<T>, context: Command): Promise<T> {
    try {
      return await fn.apply(context)
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  async add(command: Command): Promise<boolean> {
    if (await this.wrap(command.execute, command)) {
      this.history.push(command)
      if (this.history.length > this.length) {
        this.history.shift() // 将第一个命令删除掉
      } else {
        this.cursor++
      }
      return true
    }
    return false
  }

  /**
   * 执行历史记录中的下一条命令
   *
   * @returns {Promise<boolean>} 如果没有下一条或者命令执行失败，返回 false
   * @memberof Commander
   */
  async next(): Promise<boolean> {
    if (!this.hasNext) return false
    let command = this.history[this.cursor + 1]

    if (true === (await this.wrap(command.execute, command))) {
      this.cursor++
      return true
    }

    return false
  }

  /**
   * 执行历史记录中的上一条命令
   *
   * @returns {Promise<boolean>} 如果没有上一条或者命令执行失败，返回 false
   * @memberof Commander
   */
  async prev(): Promise<boolean> {
    if (!this.hasPrev) return false
    let command = this.history[this.cursor]

    if (true === (await this.wrap(command.rollback, command))) {
      this.cursor--
      return true
    }

    return false
  }
}
