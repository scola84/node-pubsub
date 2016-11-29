export default class PubSub {
  constructor() {
    this._path = null;
    this._connection = null;
    this._router = null;
    this._type = null;

    this._connections = new Set();

    this._handleClose = (event) => this.delete(event.connection);
    this._handleSubscribe = (rq, rs, n) => this._subscribe(rq, rs, n);
    this._handlePublish = (rq, rs, n) => this._publish(rq, rs, n);
  }

  destroy() {
    this._unbind();
    this.clear();
  }

  path(value) {
    this._path = value;
    return this;
  }

  connection(value) {
    this._connection = value;
    return this;
  }

  router(value) {
    this._router = value;
    return this._bind();
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
  }

  subscribe(action) {
    this._connection
      .request()
      .method('SUB')
      .path(this._path)
      .header('x-sub', action)
      .end();
  }

  publish(data) {
    console.log('publish', data);

    this._connections.forEach((connection) => {
      this._send(connection, data);
    });

    return this;
  }

  fan(data) {
    this._send(this._connection, data);
    return this;
  }

  _bind() {
    this._router.sub(this._path, this._handleSubscribe);
    this._router.pub(this._path, this._handlePublish);

    return this;
  }

  _unbind() {
    this._router.pub(this._path, this._handleSubscribe, false);
    this._router.sub(this._path, this._handlePublish, false);

    return this;
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
    request.once('data', (data) => this.publish(data));
    next();
  }
}
