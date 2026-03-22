export class Sessions {
  constructor(client) {
    this.client = client
  }

  list() {
    return this.client.get('/api/sessions')
  }

  create(body) {
    return this.client.post('/api/sessions', body)
  }

  get(name) {
    return this.client.get(`/api/sessions/${name}`)
  }

  health(name) {
    return this.client.get(`/api/sessions/${name}/health`)
  }

  task(name, body) {
    return this.client.post(`/api/sessions/${name}/task`, body)
  }

  delete(name) {
    return this.client.delete(`/api/sessions/${name}`)
  }
}
