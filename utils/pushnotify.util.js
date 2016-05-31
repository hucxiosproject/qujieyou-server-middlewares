import cofyrequest from "cofy-request";
import request from "request";

import {ChineseStringUtil} from "./string.chinese.util";

export class PushNotifyUtil {

  static init(log){
    this._log = log;
  }

  static * pushStoryUpdatedNotify(userIds, storyId, storyUrl, message) {
    return yield this._pushMessage(userIds, 53, storyId, storyUrl, ChineseStringUtil.getStoryUpdate());
  }

  static * pushNewMailNotify(userId, mailId) {
    return yield this._pushMessage([userId], 11, mailId, "", ChineseStringUtil.getNewMail());
  }

  static * _pushMessage(userId, type, id, storyUrl, message) {
    var url = "http://" + process.env.BJJ_EVENT_SERVER + "/vocinno/server/push";
    var param = {
      type: type,
      url: storyUrl,
      userId: userId,
      id: id,
      message: message,
      token: process.env.SERVER_TOKEN
    };
    console.log(param);
    var res = yield cofyrequest.$post({
      url: url,
      method: 'POST',
      headers: {'Content-Type': "application/json;charset=UTF-8"},
      body: JSON.stringify(param)
    });
    if (res[0].statusCode != 200) {
      this._log.error("error when sync comment info to main server, url is " + url + ", body is " + JSON.stringify(param) + ", result is " + res[0].body);
      throw {status: 500, message: "error when sync comment info "};
    } else {
      var body = JSON.parse(res[0].body);
      return body;
    }
  }
}