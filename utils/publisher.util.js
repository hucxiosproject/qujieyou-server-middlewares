import rabbit from "rabbit.js";

export class RabbitPublisherUtil {

  static _requestPub;
  static _log;

  static * init(rabbitUrl, log) {
    this._log = log;

    if (!this._requestPub) {
      var context = rabbit.createContext(rabbitUrl);
      this._requestPub = context.socket('PUB');
      this._requestPub.connect('request', () => {
        this._log.info("request publisher inited");
      });
    }
  }

  static publishRequest(user, type, method, url, params) {
    var data = {
      user: user,
      type: type,
      url: url,
      method: method,
      params: params
    };
    this._requestPub.publish(type, JSON.stringify(data));
  }
}	