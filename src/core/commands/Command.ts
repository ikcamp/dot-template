import {Application} from '../Application'
import * as fs from 'fs-extra'
import * as path from 'path'

export interface ICommandInitOptions {
  /**
   * 指定过期时间，即如过超过这个时间就无法 execute 或 rollback
   */
  timeout?: number
}

/**
 * 命令组件有效期过了，无法再执行或回滚
 */
export class CommandTimeoutError extends Error {
  constructor(command: Command, expiredSeconds: number) {
    super(`${command.name} 已经过期 ${expiredSeconds}s 了，无法再 ${command.status === CommandStatus.INITED ? '执行' : '回滚'}`)
  }
}

export enum CommandStatus {
  /** 已经完成初始化 */
  INITED,
  /** 已经执行过了，没有 rollback， rollback 即回到了 INITED */
  EXECUTED
}

export abstract class Command {
  /**
   * 当前命令的状态，是刚初始化还是已经执行过了
   */
  public status: CommandStatus

  /**
   * 标识当前命令是否有效
   *
   * 在命令初始化时，可能会有些非法参数，这时可以将 Command 设置成 invalid，
   * 这样就不会被记录到 Commander 中
   *
   * @type {boolean}
   * @memberof Command
   */
  public invalid: boolean = false
  /**
   * 上次运行时间
   */
  private lastRunTimestamp: number

  constructor (public name: string, protected app: Application, private options: ICommandInitOptions) {
    this.status = CommandStatus.INITED
  }

  /**
   * 输出 debug 信息
   */
  protected debug(message: string, ...files: string[]) {
    this.app.debug(`<${this.name}> ${message}`, ...files)
  }

  protected async createFileAsync(file: string, content: string) {
    fs.ensureDirSync(path.dirname(file))
    fs.writeFileSync(file, content)
    this.app.emitCreatedFile(file, content)
  }
  protected async setFileContentAsync(file: string, newContent: string, oldContent: string): Promise<boolean> {
    let {app} = this
    if (await app.editor.setFileContentAsync(file, newContent) === false) {
      app.error(app.format('设置文件 %f 内容失败', file))
      return false
    } else {
      app.emitUpdatedFile(file, newContent, oldContent)
      return true
    }
  }
  protected async unlinkFileAsync(file: string, fileContent: string) {
    try {
      await this.app.editor.closeFileAsync(file)
    } catch (e) {}
    fs.unlinkSync(file)
    this.app.emitDeletedFile(file, fileContent)
  }

  /**
   * 命令是否可运行
   *
   * @readonly
   * @type {boolean}
   */
  get runnable(): boolean {
    let {options: {timeout}, lastRunTimestamp} = this
    let now = Date.now()
    return !(timeout && timeout > 0 && lastRunTimestamp && now - lastRunTimestamp > timeout)
  }

  /**
   * 运行命令
   * @param {boolean} forward true 表示 execute， false 表示 rollback
   */
  async run(forward: boolean): Promise<boolean> {
    let {options: {timeout}, lastRunTimestamp} = this
    let now = Date.now()
    if (timeout && timeout > 0 && lastRunTimestamp && now - lastRunTimestamp > timeout) {
      throw new CommandTimeoutError(this, Math.max(Math.round((now - lastRunTimestamp - timeout) / 100), 1))
    }

    let result: boolean
    if (forward) {
      result = await this.execute()
      if (result) this.status = CommandStatus.EXECUTED
    } else {
      result = await this.rollback()
      if (result) this.status = CommandStatus.INITED
    }

    if (result === true) this.lastRunTimestamp = now
    return result
  }

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
  protected abstract async execute(): Promise<boolean>

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
  protected abstract async rollback(): Promise<boolean>
}
