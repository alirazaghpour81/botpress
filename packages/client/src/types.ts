import { Client as AutoGeneratedClient } from './gen'
import { UpsertFileInput, UpsertFileResponse } from './gen/operations/upsertFile'

export type {
  Message,
  Conversation,
  User,
  State,
  Event,
  File,
  Bot,
  Integration,
  Interface,
  Issue,
  IssueEvent,
  Account,
  Workspace,
  WorkspaceMember,
  Table,
  Column,
  Row,
  Usage,
} from './gen/models'

type UploadFileInput = Omit<UpsertFileInput, 'size'> & {
  content?: Buffer | string
  url?: string
}
type UploadFileOutput = UpsertFileResponse

type Simplify<T> = T extends (...args: infer A) => infer R
  ? (...args: Simplify<A>) => Simplify<R>
  : T extends Promise<infer R>
  ? Promise<Simplify<R>>
  : T extends Buffer
  ? Buffer
  : T extends object
  ? T extends infer O
    ? { [K in keyof O]: Simplify<O[K]> }
    : never
  : T

type AsyncFunc = (...args: any[]) => Promise<any>

export type IClient = Simplify<
  AutoGeneratedClient & {
    uploadFile: (input: UploadFileInput) => Promise<UploadFileOutput>
  }
>

export type Operation = Simplify<
  | keyof {
      [K in keyof IClient as IClient[K] extends AsyncFunc ? K : never]: IClient[K]
    }
>

/**
 * @deprecated Use ClientInputs instead
 */
export type ClientParams<T extends Operation> = Simplify<Parameters<IClient[T]>[0]>
/**
 * @deprecated Use ClientOutputs instead
 */
export type ClientReturn<T extends Operation> = Simplify<Awaited<ReturnType<IClient[T]>>>

export type ClientInputs = Simplify<{
  [T in Operation]: Parameters<IClient[T]>[0]
}>

export type ClientOutputs = Simplify<{
  [T in Operation]: Awaited<ReturnType<IClient[T]>>
}>

type Headers = Record<string, string | string[]>

export type ClientProps = {
  integrationId?: string
  workspaceId?: string
  botId?: string
  token?: string
  apiUrl?: string
  timeout?: number
  headers?: Headers
}

export type ClientConfig = {
  apiUrl: string
  headers: Headers
  withCredentials: boolean
  timeout: number
}
