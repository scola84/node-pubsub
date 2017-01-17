import EventEmitter from 'events';

export default class PubSub extends EventEmitter {
  constructor() {
    super();

    this._connection = null;
    this._router = null;
    this._path = null;
    this._connections = new Set();

    this._handleClose = (event) => this.delete(event.connection);
    this._handleSubscribe = (rq, rs, n) => this._subscribe(rq, rs, n);
    this._handlePublish = (rq, rs, n) => this._publish(rq, rs, n);
  }

  destroy() {
    this._unbind();
    this.clear();
  }

  connection(value = null) {
    if (value === null) {
      return this._connection;
    }

    this._connection = value;
    return this;
  }

  router(value = null) {
    if (value === null) {
      return this._router;
    }

    this._router = value;
    this._bind();

    return this;
  }

  path(value = null) {
    if (value === null) {
      return this._path;
    }

    this._path = value;
    return this;
  }

  add(connection) {
    this._connections.add(connection);
    connection.once('close', this._handleClose);

    return this;
  }

  delete(connection) {
    this._connections.delete(connection);
    connection.removeListener('close', this._handleClose);

    return this;
  }

  clear() {
    this._connections.forEach((connection) => {
      connection.removeListener('close', this._handleClose);
    });

    this._connections.clear();
    return this;
  }

  subscribe(action = true) {
    this._connection
      .request()
      .method('SUB')
      .path(this._path)
      .header('x-sub', action)
      .end();

    return this;
  }

  up(data) {
    this._connections.forEach((connection) => {
      this._send(connection, data);
    });

    return this;
  }

  down(data) {
    this._send(this._connection, data);
    return this;
  }

  _bind() {
    if (this._router) {
      this._router.sub(this._path, this._handleSubscribe);
      this._router.pub(this._path, this._handlePublish);
    }
  }

  _unbind() {
    if (this._router) {
      this._router.pub(this._path, this._handleSubscribe, false);
      this._router.sub(this._path, this._handlePublish, false);
    }
  }

  _send(connection, data = null) {
    connection
      .request()
      .method('PUB')
      .path(this._path)
      .end(data);
  }

  _subscribe(request) {
    const subscribe = request.header('x-sub');

    if (subscribe === true) {
      this.add(request.connection());
    } else if (subscribe === false) {
      this.delete(request.connection());
    }

    return this;
  }

  _publish(request, response, next) {
    request.once('error', () => {});
    request.once('data', (data) => this.emit('data', data));
    next();
  }
}
