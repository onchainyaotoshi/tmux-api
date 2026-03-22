export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export class ValidationError extends ApiError {
  constructor(message) {
    super(400, message)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends ApiError {
  constructor(message) {
    super(401, message)
    this.name = 'AuthenticationError'
  }
}

export class NotFoundError extends ApiError {
  constructor(message) {
    super(404, message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends ApiError {
  constructor(message) {
    super(409, message)
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends ApiError {
  constructor(message, retryAfter = null) {
    super(429, message)
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

export class ServerError extends ApiError {
  constructor(message) {
    super(500, message)
    this.name = 'ServerError'
  }
}
