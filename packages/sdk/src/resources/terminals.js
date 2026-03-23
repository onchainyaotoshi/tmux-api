export class Terminals {
  constructor(client) {
    this.client = client
    this.windows = new Windows(client)
    this.panes = new Panes(client)
  }

  list() {
    return this.client.get('/api/terminals')
  }

  create(body) {
    return this.client.post('/api/terminals', body)
  }

  update(name, body) {
    return this.client.put(`/api/terminals/${name}`, body)
  }

  delete(name) {
    return this.client.delete(`/api/terminals/${name}`)
  }

  setEnvironment(terminal, body) {
    return this.client.post(`/api/terminals/${terminal}/set-environment`, body)
  }
}

export class Windows {
  constructor(client) {
    this.client = client
  }

  list(terminal) {
    return this.client.get(`/api/terminals/${terminal}/windows`)
  }

  create(terminal, body) {
    return this.client.post(`/api/terminals/${terminal}/windows`, body)
  }

  update(terminal, index, body) {
    return this.client.put(`/api/terminals/${terminal}/windows/${index}`, body)
  }

  delete(terminal, index) {
    return this.client.delete(`/api/terminals/${terminal}/windows/${index}`)
  }
}

export class Panes {
  constructor(client) {
    this.client = client
  }

  list(terminal, window) {
    return this.client.get(`/api/terminals/${terminal}/windows/${window}/panes`)
  }

  split(terminal, window, body) {
    return this.client.post(`/api/terminals/${terminal}/windows/${window}/panes`, body)
  }

  resize(terminal, window, pane, body) {
    return this.client.put(`/api/terminals/${terminal}/windows/${window}/panes/${pane}/resize`, body)
  }

  delete(terminal, window, pane) {
    return this.client.delete(`/api/terminals/${terminal}/windows/${window}/panes/${pane}`)
  }

  sendKeys(terminal, window, pane, body) {
    return this.client.post(`/api/terminals/${terminal}/windows/${window}/panes/${pane}/send-keys`, body)
  }

  capture(terminal, window, pane) {
    return this.client.get(`/api/terminals/${terminal}/windows/${window}/panes/${pane}/capture`)
  }
}
