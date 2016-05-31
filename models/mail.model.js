import mongodb from "mongodb";
var ObjectID = mongodb.ObjectID;
import rabbit from "rabbit.js";
import co from "co";
/**
 * 用户的来信
 * 为了和之前的mail作区分,使用Mail类型
 * 数据库collection任然为mail
 * 0.8-0.9时,将Mail转为Mail,移除Mailbox类
 */
export class Mail {

  static CHECK_STATUS_UNCHECK;
  static CHECK_STATUS_UNPASS;
  static CHECK_STATUS_PASS;
  static MAIL_TYPE_TEXT;
  static MAIL_TYPE_VOICE;

  static MAIL_FROM_USER;
  static MAIL_FROM_ASSISTANT;
  static MAIL_FROM_ADMIN;

  static MAIL_FOR_STORY;
  static MAIL_FOR_SHIT;

  static init() {

    this.MAIL_FOR_STORY = 1;
    this.MAIL_FOR_SHIT = 2;

    this.CHECK_STATUS_UNCHECK = 0;
    this.CHECK_STATUS_UNPASS = -1;
    this.CHECK_STATUS_PASS = 1;

    this.MAIL_TYPE_TEXT = 1;
    this.MAIL_TYPE_VOICE = 2;

    this.MAIL_FROM_USER = 1;
    this.MAIL_FROM_ASSISTANT = 2;
    this.MAIL_FROM_ADMIN = 3;

  }

  constructor(_id, from, to, brief, content, user) {
    this._id = String(ObjectID());
    this.from = null;
    this.fromId = 0;
    this.to = null;
    this.toId = 0;
    this.brief = null;
    this.type = Mail.MAIL_TYPE_TEXT;
    this.content = null;
    this.attachment = [];
    this.wordCount = 0;
    this.tags = [];
    this.story = null;
    this.user = null;
    this.userId = 0;
    this.character = null;
    this.assistant = null;
    this.assistantId = 0;
    this.fromType = Mail.MAIL_FROM_USER;
    this.unPublished = false;
    this.checkStatus = Mail.CHECK_STATUS_UNCHECK;
    this.deleted = false;
    this.handled = false;
    this.lastModified = new Date().getTime();

    if (_id) {
      this._id = String(_id);
    }
    if (from) {
      this.from = from;
      this.fromId = from._id;
    }
    if (to) {
      this.to = to;
      this.toId = to._id;
    }
    if (brief) {
      this.brief = brief;
    }
    if (content) {
      this.content = content;
    }
    if (user) {
      this.user = user;
      this.userId = user._id;
    }

  }

  static fromMongo(doc) {
    if (!doc) {
      return null;
    }
    let mail = new Mail(doc._id, doc.from, doc.to, doc.brief, doc.content, doc.user);
    mail.type = doc.type;
    mail.attachment = doc.attachment;
    mail.wordCount = doc.wordCount;
    mail.tags = doc.tags;
    mail.story = doc.story;
    mail.character = doc.character;
    mail.assistant = doc.assistant;
    mail.fromType = doc.fromType;
    mail.unPublished = doc.unPublished;
    mail.checkStatus = doc.checkStatus;
    mail.deleted = doc.deleted;
    mail.handled = doc.handled;
    mail.lastModified = doc.lastModified;
    return mail;
  }

  toMongo() {
    return {
      from: this.from,
      fromId: this.fromId,
      to: this.to,
      toId: this.toId,
      brief: this.brief,
      type: this.type,
      content: this.content,
      attachment: this.attachment,
      user: this.user,
      userId: this.userId,
      wordCount: this.wordCount,
      tags: this.tags,
      story: this.story,
      character: this.character,
      assistant: this.assistant,
      assistantId: this.assistantId,
      fromType: this.fromType,
      unPublished: this.unPublished,
      checkStatus: this.checkStatus,
      deleted: this.deleted,
      handled: this.handled,
      lastModified: this.lastModified
    };
  }

  toClient() {
    if (this.fromType == undefined || this.fromType == null) {
      this.fromType = Mail.MAIL_FROM_USER;
    }
    return {
      _id: String(this._id),
      from: this.from,
      to: this.to,
      brief: this.brief,
      type: this.type,
      content: this.content,
      wordCount: this.wordCount,
      handled: this.handled,
      unPublished: this.unPublished,
      fromType: this.fromType,
      attachment: this.attachment,
      createDate: ObjectID(String(this._id)).getTimestamp().getTime()
    };
  }
}

export class MailDAO {

  static * init(mongo, rabbitUrl, log) {
    if (!this._inbox) {
      this._inbox = mongo.collection("mail");
      this._log = log;
    }
    var context = rabbit.createContext(rabbitUrl);
    if (!this._mailboxPub) {
      this._mailboxPub = context.socket('PUB');
      this._mailboxPub.connect('mail', () => {
        this._log.info("mail publisher inited");
      });
    }
    if (!this._userSub) {
      this._userSub = context.socket('SUB');
      this._userSub.connect('user', 'model.update', function () {
        this._userSub.setEncoding('utf8');
        this._log.info('user model inited in mail');
        this._userSub.on('data', function (user) {
          co(function *() {
            try {
              var originUser = JSON.parse(user);
              var newUser = {
                _id: parseInt(originUser.id),
                nickName: originUser.nickName,
                avatar: originUser.avatar,
                userType: originUser.userType,
                guestId: originUser.guestId,
                platform: originUser.platform,
                phoneType: originUser.phoneType,
                message: originUser.message,
                assistantId: originUser.assistantId,
                assistantName: originUser.assistantName
              };
              yield MailDAO.updateUserInfo(newUser);
            } catch (err) {
              this._log.error(err);
            }
          }.bind(this));
        }.bind(this));
      }.bind(this));
    }
  }

  static * updateUserInfo(user) {
    var update = {
      user: user
    };
    yield this._inbox.$update({'user._id': user._id}, {$set: update}, {multi: true});
  }

  static * getById(id) {
    id = ObjectID(String(id));
    var doc = yield this._inbox.$findOne({_id: id});
    if (!doc) {
      return null;
    } else {
      return Mail.fromMongo(doc);
    }

  }

  static * insert(record) {
    var result = yield this._inbox.$insert(record.toMongo());
    record._id = String(result[0]._id);
    return record;
  }

  /**
   * 带id新增,0.7一旦下线即可移除
   * @param record
   * @returns {*}
   */
  static * insertIncludingId(record) {
    record._id = ObjectID(String(record._id));
    var result = yield this._inbox.$insert(record);
    return record;
  }

  static * updateById(id, record) {
    id = ObjectID(String(id));
    return yield this._inbox.$update({_id: id}, {
      $set: record
    });
  }

  static * getListByUserId(userId, skip, limit) {
    userId = parseInt(userId);
    var docs = yield this._inbox.find({
      'user._id': userId,
      deleted: false
    }).sort({_id: -1}).skip(skip).limit(limit).$toArray();
    return [for (doc of docs) Mail.fromMongo(doc)];
  }

  static * getUnpublishedMailList(skip, limit) {
    var docs = yield this._inbox.find({
      deleted: false,
      unPublished: true
    }).sort({_id: -1}).skip(skip).limit(limit).$toArray();
    return [for (doc of docs) Mail.fromMongo(doc)];
  }

  static * getUnpublishedMailCount() {
    return yield this._inbox.find({
      deleted: false,
      unPublished: true
    }).$count();
  }

  static * getList(query, sort, skip, limit) {
    var docs = yield this._inbox.find(query).sort(sort).skip(skip).limit(limit).$toArray();
    return [for (doc of docs) Mail.fromMongo(doc)];
  }

  static * getUnreadMailCount(userId) {
    userId = parseInt(userId);
    return yield this._inbox.find({'user._id': userId, handled: false}).$count();
  }

  static * getCountByUserId(userId) {
    userId = parseInt(userId);
    return yield this._inbox.find({'user._id': userId, deleted: false}).$count();
  }

  static * deleteByUserId(userId, deleted) {
    userId = parseInt(userId);
    return yield this._inbox.$update({'user._id': userId}, {$set: {deleted: deleted}}, {multi: true});
  }

}