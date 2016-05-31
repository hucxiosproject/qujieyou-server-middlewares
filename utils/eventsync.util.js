import cofyrequest from "cofy-request";
import request from "request";
import rabbit from "rabbit.js";

import {StatisticsUtil} from "./statistics.util";

export class EventSyncUtil {

  static _eventPub;
  static _log;

  static * init(rabbitUrl, log) {
    this._log = log;
    if (!this._eventPub) {
      var context = rabbit.createContext(rabbitUrl);
      this._requestPub = context.socket('PUB');
      this._requestPub.connect('event', () => {
        this._log.info("event publisher inited");
      });
    }
  }

  static syncFollowUpdated(userId, followStoryUpdated) {
    var data = {
      userId: String(userId),
      followStoryUpdated: followStoryUpdated
    };
    this._requestPub.publish("follow", JSON.stringify(data));
  }

  static * syncMailReplyCount(userId, newMailReply) {
    var data = {
      userId: userId,
      newMailReply: newMailReply
    };
    this._requestPub.publish("mail", JSON.stringify(data));
  }

  static syncStorycommentAccepted(userId, creditType, storyId, commentId) {
    var data = {
      storyId: storyId,
      commentId: commentId,
      creditType: creditType,
      userId: userId
    };
    this._requestPub.publish("credit", JSON.stringify(data));
  }

  static * syncCommentContent(userId, storyId) {
    var url = "http://" + process.env.BJJ_EVENT_SERVER + "/vocinno/server/event";
    var param = {
      type: 61,
      userId: [userId],
      id: storyId,
      token: process.env.SERVER_TOKEN
    };
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

      // sync comment count to user server
      StatisticsUtil.syncCommentCount(userId);

      return body;
    }
  }

  static * syncPushStoryNotify(storyId, userIds, url) {
    var param = {
      id: storyId,
      url: url,
      userId: userIds,
      eventType: 53,
      token: process.env.SERVER_TOKEN
    };
    var res = yield cofyrequest.$post(
      "http://" + process.env.BJJ_EVENT_SERVER + "/vocinno/server/event",
      {form: param}
    );
    if (res[0].statusCode == 200) {
      return true;
    } else {
      throw {status: 500, message: "event server error, msg is " + res[0].body + ", and url is " + url};
    }
  }

  static * syncFollowInfo(userId, storyId) {
    var url = "http://" + process.env.BJJ_EVENT_SERVER + "/vocinno/server/event";
    var param = {
      type: 51,
      userId: [userId],
      id: storyId,
      token: process.env.SERVER_TOKEN
    };
    var res = yield cofyrequest.$post({
      url: url,
      method: 'POST',
      headers: {'Content-Type': "application/json;charset=UTF-8"},
      body: JSON.stringify(param)
    });
    if (res[0].statusCode == 200) {
      return JSON.parse(res[0].body);
    }
    this._log.error("error when sync follow info to event server, url is " + url);
    this._log.error(res[0].body);
    return false;
  }

  static * syncMailboxTags(mailboxId, userToken, tagIds) {
    var url = "http://" + process.env.BJJ_TAG_SERVER + "/session/tagrecords";
    var param = {
      type: 2,
      caseId: mailboxId,
      tagIds: tagIds,
      token: userToken
    };
    var res = yield cofyrequest.$post({
      url: url,
      method: 'POST',
      headers: {'Content-Type': "application/json;charset=UTF-8"},
      body: JSON.stringify(param)
    });
    if (res[0].statusCode == 200) {
      return JSON.parse(res[0].body);
    }
    this._log.error("error when sync mailbox tags, url is " + url + ", status code is " + res[0].statusCode + ", body is " + res[0].body);
    return false;
  }
}