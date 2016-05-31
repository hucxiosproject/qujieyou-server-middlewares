export class ErrorUtil {
  static init(log) {
    this._log = log;
  }

  static throwError(status, message) {
    var info = {
      status: status,
      message: message
    };
    //throw new Error(JSON.stringify(info));
    throw info;
  }
}