import cofyrequest from "cofy-request";
import {ErrorUtil} from "../utils/error.util.js";
export class CreditUtil {
  static init(log) {
    this._log = log;
  }

  static * getCredit(creditType) {
    var url = "http://" + process.env.BJJ_EVENT_SERVER + "/vocinno/server/credit/type/" + creditType + "?token=" + process.env.SERVER_TOKEN;
    var res = yield cofyrequest.$get({
      url: url,
      method: 'GET',
      headers: {'Content-Type': "application/json;charset=UTF-8"}
    });
    if (res[0].statusCode != 200) {
      this._log.error("error when get credit info from event server, url is " + url + ", result is " + res[0].body);
      ErrorUtil.throwError(500, "error when get credit info ");
    } else {
      return JSON.parse(res[0].body);
    }
  }
}