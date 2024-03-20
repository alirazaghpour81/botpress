import axios, { Axios } from 'axios'
import { isNode } from 'browser-or-node'
import http from 'http'
import https from 'https'
import { getClientConfig, ClientProps, ClientConfig } from './config'
import { CreateFileResponse } from './gen'
import { ApiClient as AutoGeneratedClient, CreateFileProps } from './gen/client'
import { errorFrom } from './gen/errors'

export { isApiError } from './gen/errors'

export * as axios from 'axios'
export type {
  Message,
  Conversation,
  User,
  State,
  Event,
  ModelFile as File,
  Bot,
  Integration,
  Issue,
  IssueEvent,
  Account,
  Workspace,
  Usage,
} from './gen'
export * from './gen/errors'

const _100mb = 100 * 1024 * 1024
const maxBodyLength = _100mb
const maxContentLength = _100mb

export class Client extends AutoGeneratedClient {
  public readonly config: Readonly<ClientConfig>
  private readonly axiosClient: Axios

  public constructor(clientProps: ClientProps = {}) {
    const clientConfig = getClientConfig(clientProps)
    const axiosClient = createAxiosClient(clientConfig)

    super(undefined, clientConfig.apiUrl, axiosClient)

    this.axiosClient = axiosClient
    this.config = clientConfig
  }

  // The only reason this method is overridden is because
  // the generated client does not support binary payloads.
  public createFile = async (props: CreateFileProps): Promise<CreateFileResponse> => {
    const headers = {
      ...this.config.headers,
      'x-filename': props.xFilename,
      'x-bot-id': props.xBotId ?? this.config.headers['x-bot-id'],
      'x-integration-id': props.xIntegrationId ?? this.config.headers['x-integration-id'],
      'x-user-id': props.xUserId ?? this.config.headers['x-user-id'],
      'x-tags': props.xTags,
      'x-access-policies': props.xAccessPolicies,
      'content-type': props.contentType ?? false, // false ensures that axios does not use application/x-www-form-urlencoded if props.contentType is undefined
      'content-length': props.contentLength,
    }

    const resp = await this.axiosClient
      .post('/v1/files', props.data, { headers, baseURL: this.config.apiUrl })
      .catch((e) => {
        throw getError(e)
      })
    return resp.data as CreateFileResponse
  }
}

function createAxiosClient(config: ClientConfig) {
  const { headers, withCredentials, timeout } = config
  return axios.create({
    headers,
    withCredentials,
    timeout,
    maxBodyLength,
    maxContentLength,
    httpAgent: isNode ? new http.Agent({ keepAlive: true }) : undefined,
    httpsAgent: isNode ? new https.Agent({ keepAlive: true }) : undefined,
  })
}

function getError(err: Error) {
  if (axios.isAxiosError(err) && err.response?.data) {
    return errorFrom(err.response.data)
  }
  return errorFrom(err)
}

type Simplify<T> = { [KeyType in keyof T]: Simplify<T[KeyType]> } & {}

type PickMatching<T, V> = { [K in keyof T as T[K] extends V ? K : never]: T[K] }
type ExtractMethods<T> = PickMatching<T, (...rest: any[]) => any>

type FunctionNames = keyof ExtractMethods<Client>

export type ClientParams<T extends FunctionNames> = Simplify<Parameters<Client[T]>[0]>
export type ClientReturn<T extends FunctionNames> = Simplify<Awaited<ReturnType<Client[T]>>>
