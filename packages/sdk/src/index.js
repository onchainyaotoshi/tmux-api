import { BaseClient } from './client.js'
import { Terminals } from './resources/terminals.js'
import { Sessions } from './resources/sessions.js'

export {
  ApiError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
} from './errors.js'

export default class TmuxApi {
  constructor(opts) {
    const client = new BaseClient(opts)
    this.terminals = new Terminals(client)
    this.sessions = new Sessions(client)
  }
}
