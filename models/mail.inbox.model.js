import mongodb from "mongodb";
var ObjectID = mongodb.ObjectID;
import {ErrorUtil} from "../utils/error.util.js";

/**
 * 用户的一次来信，放入mailInbox中，等待外援抢单
 */
export class MailInbox {


  static init() {

  }

  constructor(id, user, mailList, hidden) {
    this.userId = 0;
    this.user = {};
    this.mailList = [];
    this.hidden = false;
    if (user) {
      this.user = user;
      if (this.user.id) {
        this.user._id = this.user.id;
      }
      this.user._id = parseInt(this.user._id);
      this.userId = parseInt(this.user._id);
    }
    if (mailList !== undefined && mailList !== null && mailList.constructor == Array && mailList.length > 0) {
      this.mailList = mailList;
    }
    if (id) {
      this._id = String(id);
    }
    if (hidden !== undefined && hidden !== null) {
      this.hidden = hidden;
    }
  }

  static fromMongo(doc) {
    var mailInbox = new MailInbox(doc._id, doc.user, doc.mailList, doc.hidden);
    mailInbox.mailboxList = doc.mailboxList; //0.7字段,0.7下线后移除
    return mailInbox;
  }

  toMongo() {
    return {
      userId: this.userId,
      user: this.user,
      mailList: this.mailList,
      hidden: this.hidden
    };
  }

  toClient(mailUrl, token) {
    if (this.mailboxList) {
      //这里是0.7的结构解析,0.7下线后移除
      var mailbox = this.mailboxList[this.mailboxList.length - 1];
      if (mailbox) {
        if (mailbox.mails[0]) {
          return {
            _id: String(this._id),
            user: this.user,
            userId: this.userId,
            mail: {
              brief: mailbox.brief,
              _id: mailbox.mails[0]._id,
              url: mailUrl + "?token=" + token + "#/detail/" + String(this.userId)
            },
            createTime: ObjectID(String(this._id)).getTimestamp().getTime()
          };
        }
      } else {
        ErrorUtil.throwError(500, "mailbox is null");
      }
    } else {
      var mail = this.mailList[this.mailList.length - 1];
      return {
        _id: String(this._id),
        user: this.user,
        userId: this.userId,
        mail: {
          brief: mail.brief,
          _id: mail._id,
          url: mailUrl + "?token=" + token + "#/detail/" + String(this.userId)
        },
        createTime: ObjectID(String(this._id)).getTimestamp().getTime()
      };
    }

  }
}

export class MailInboxDAO {

  static * init(mongo, log,on) {
    if (!this._inbox) {
      if(on){
        this._inbox = mongo.collection("mail_inbox");
      }else{
        this._inbox = mongo.collection("mail_inbox_test");
      }

      this._log = log;
    }
  }

  static * insert(record) {
    var result = yield this._inbox.$insert(record);
    record._id = String(result[0]._id);
    return record;
  }

  static * update(record) {
    return yield this._inbox.$update({_id: ObjectID(String(record._id))}, {
      $set: {
        mailList: record.mailList,
        hidden: record.hidden
      }
    });
  }

  static * deleteByUserId(userId) {
    userId = parseInt(userId);
    return yield this._inbox.$remove({userId: userId});
  }

  static * getList(skip, limit) {
    var docs = yield this._inbox.find({}).skip(skip).limit(limit).$toArray();
    return [for (doc of docs) MailInbox.fromMongo(doc)];
  }

  static * getUnHiddenList(skip, limit) {
    var docs = yield this._inbox.find({hidden: false}).skip(skip).limit(limit).$toArray();
    return [for (doc of docs) MailInbox.fromMongo(doc)];
  }

  static * getListByUserId(userId) {
    userId = parseInt(userId);
    var docs = yield this._inbox.find({userId: userId}).sort({_id: -1}).$toArray();
    return [for (doc of docs) MailInbox.fromMongo(doc)];
  }

}