import mongodb from "mongodb";
var ObjectID = mongodb.ObjectID;
import rabbit from "rabbit.js";
import co from "co";

export class Mailbox {

  static Mailbox_Type_Story;
  static Mailbox_Type_Shit;
  static CHECK_STATUS_UNCHECK;
  static CHECK_STATUS_UNPASS;
  static CHECK_STATUS_PASS;

  static init() {
    this.Mailbox_Type_Story = 1;
    this.Mailbox_Type_Shit = 2;
    this.CHECK_STATUS_UNCHECK = 0;
    this.CHECK_STATUS_UNPASS = -1;
    this.CHECK_STATUS_PASS = 1;
  }

  constructor(id, userId, user, characterId, character, brief, deleted, handled, mails, tags, type, noReply, remark) {
    if (id)
      this._id = String(id);
    this.userId = userId;
    this.user = user;
    this.characterId = characterId;
    this.character = character;
    this.brief = brief;
    this.deleted = deleted;
    this.handled = handled;
    this.mails = [];
    for (var docMail of mails) {
      var mail = Mail.fromMongo(docMail);
      this.mails.push(mail);
    }

    if (tags) this.tags = tags;
    else this.tags = [];
    this.type = type;
    this.remark = remark;
    this.noReply = noReply;
    this.readCount = 0;
    if (!noReply)
      this.noReply = false;
    this.lastMailDate = new Date().getTime();
  }

  static fromMongo(doc) {
    var mailbox = new Mailbox(doc._id, doc.userId, doc.user, doc.characterId, doc.character, doc.brief,
      doc.deleted, doc.handled, doc.mails, doc.tags, doc.type, doc.noReply, doc.remark);
    mailbox.lastModified = doc.lastModified;
    mailbox.readCount = doc.readCount;
    mailbox.storyId = doc.storyId;
    mailbox.shitId = doc.shitId;
    mailbox.lastMailDate = doc.lastMailDate;
    return mailbox;
  }

  toMongo() {
    var mailbox = {};
    mailbox.userId = parseInt(this.userId);
    mailbox.user = this.user;
    mailbox.characterId = parseInt(this.characterId);
    mailbox.character = this.character;
    mailbox.brief = this.brief;
    mailbox.deleted = this.deleted;
    mailbox.handled = this.handled;
    mailbox.lastModified = new Date().getTime();
    mailbox.mails = [];

    for (var mail of this.mails) {
      var doc = mail.toMongo();
      mailbox.mails.push(doc);
    }

    mailbox.lastMailDate = this.lastMailDate;
    if (!mailbox.lastMailDate) mailbox.lastMailDate = new Date().getTime();
    mailbox.storyId = this.storyId;
    mailbox.shitId = this.shitId;
    mailbox.tags = this.tags;
    mailbox.type = this.type;
    mailbox.remark = this.remark;
    mailbox.noReply = this.noReply;
    mailbox.readCount = this.readCount;
    return mailbox;
  }

  toClient() {
    var mailbox = {};
    mailbox._id = this._id;
    mailbox.userId = this.userId;
    mailbox.user = this.user;
    mailbox.user._id = this.userId;
    mailbox.characterId = this.characterId;
    mailbox.character = this.character;
    mailbox.character._id = this.characterId;
    mailbox.brief = this.brief;
    mailbox.count = 0;
    mailbox.unread = 0;

    if (this._id) {
      mailbox.createDate = ObjectID(String(this._id)).getTimestamp().getTime();
    }

    mailbox.mails = [];

    for (var i = 0; i < this.mails.length; i++) {
      var mail = this.mails[i];
      var clientMail = mail.toClient();
      if (mail.fromType == Mail.MAIL_FROM_ASSISTANT && mail.checkStatus == Mailbox.CHECK_STATUS_UNCHECK) {

      } else {
        mailbox.mails.push(clientMail);
        mailbox.count++;
        if (mailbox.userId == clientMail.toId && !clientMail.handled) {
          mailbox.unread++;
        }
        mailbox.mailType = mail.type;
      }
    }

    mailbox.lastModified = this.lastModified;
    return mailbox;
  }

  toAdmin() {
    var mailbox = {};
    mailbox._id = this._id;
    mailbox.userId = this.userId;
    mailbox.user = this.user;
    mailbox.user._id = this.userId;
    mailbox.characterId = this.characterId;
    mailbox.character = this.character;
    mailbox.character._id = this.characterId;
    mailbox.brief = this.brief;
    mailbox.count = 0;
    mailbox.unread = 0;
    mailbox.handled = this.handled ? this.handled : false;
    mailbox.deleted = this.deleted ? this.deleted : false;

    mailbox.lastMailDate = this.lastMailDate;
    mailbox.storyId = this.storyId;
    mailbox.shitId = this.shitId;
    mailbox.tags = this.tags ? this.tags : [];
    mailbox.userTags = this.userTags ? this.userTags : [];
    mailbox.type = this.type;
    mailbox.remark = this.remark ? this.remark : "";
    mailbox.noReply = this.noReply ? this.noReply : false;
    mailbox.wordCount = this.wordCount ? this.wordCount : 0;
    mailbox.readCount = this.readCount ? this.readCount : 0;
    mailbox.createDate = ObjectID(String(this._id)).getTimestamp().getTime();

    mailbox.mails = [];
    mailbox.userWordCount = 0;
    mailbox.adminWordCount = 0;
    for (var i = 0; i < this.mails.length; i++) {
      var mail = this.mails[i];
      var clientMail = mail.toClient();
      if (mailbox.userId == mail.fromId) {
        mailbox.userWordCount += clientMail.wordCount;
      } else
        mailbox.adminWordCount += clientMail.wordCount;

      mailbox.mails.push(clientMail);
      mailbox.count++;
      if (mailbox.userId == clientMail.toId && !clientMail.handled) {
        mailbox.unread++;
      }
      mailbox.mailType = mail.type;
    }

    mailbox.lastModified = this.lastModified;
    return mailbox;
  }
}

export class Mail {

  static MailType_Text;
  static MailType_Voice;

  static MAIL_FROM_USER;
  static MAIL_FROM_ASSISTANT;
  static MAIL_FROM_ADMIN;

  static init() {
    Mail.MailType_Text = 1;
    Mail.MailType_Voice = 2;

    Mail.MAIL_FROM_USER = 1;
    Mail.MAIL_FROM_ASSISTANT = 2;
    Mail.MAIL_FROM_ADMIN = 3;
  }

  constructor(id, fromId, toId, type, content, attachment, deleted, handled) {
    if (id)
      this._id = String(id);
    this.fromId = fromId;
    this.toId = toId;
    this.type = type;
    this.content = content;
    this.attachment = attachment;
    this.deleted = deleted;
    this.handled = handled;
    if (!handled)
      this.handled = false;
  }

  static fromMongo(doc) {
    let mail = new Mail(doc._id, doc.fromId, doc.toId, doc.type, doc.content, doc.attachment, doc.deleted, doc.handled);
    mail.unPublish = doc.unPublish;
    mail.checkStatus = doc.checkStatus;
    mail.assistantId = doc.assistantId;
    mail.fromType = doc.fromType;
    return mail;
  }

  toMongo() {
    var mail = {};
    if (!this._id) {
      mail._id = ObjectID();	// cannot insert mail, mail can only in mailbox
      this._id = mail._id;
    } else
      mail._id = ObjectID(String(this._id));
    mail.fromId = parseInt(this.fromId);
    mail.toId = parseInt(this.toId);
    mail.type = this.type;
    mail.content = this.content;
    mail.attachment = this.attachment;
    mail.deleted = this.deleted;
    mail.lastModified = new Date().getTime();
    mail.handled = this.handled;
    mail.unPublish = this.unPublish;
    mail.checkStatus = this.checkStatus;
    mail.assistantId = this.assistantId;
    mail.fromType = this.fromType;
    return mail;
  }

  toClient() {
    var mail = {};
    mail._id = this._id;
    mail.fromId = this.fromId;
    mail.toId = this.toId;
    mail.type = this.type;
    mail.content = this.content;
    mail.attachment = this.attachment;
    mail.deleted = this.deleted;
    mail.createDate = ObjectID(String(this._id)).getTimestamp().getTime();
    mail.handled = this.handled;
    if (mail.content) {
      mail.wordCount = mail.content.length;
    } else {
      mail.wordCount = 0;
    }
    mail.unPublish = this.unPublish;
    mail.checkStatus = this.checkStatus;
    mail.assistantId = this.assistantId;
    mail.fromType = this.fromType;
    return mail;
  }
}

export class MailboxDAO {
  static _mailboxs;
  static _mailboxPub;
  static _userSub;
  static _log;

  static * init(mongo, rabbitUrl, log) {
    if (!this._mailboxs) {
      this._mailboxs = mongo.collection("mailboxs");
      yield this._mailboxs.$ensureIndex({
        '_id': -1,
        'user._id': 1,
        'characterId': 1,
        'lastModified': 1,
        'lastMailDate': -1
      });
      this._log = log;
      this._log.info("mailbox index ensured!");
    }
    var context = rabbit.createContext(rabbitUrl);
    if (!this._mailboxPub) {
      this._mailboxPub = context.socket('PUB');
      this._mailboxPub.connect('mailbox', () => {
        this._log.info("mailbox publisher inited");
      });
    }
    if (!this._userSub) {
      this._userSub = context.socket('SUB');
      this._userSub.connect('user', 'model.update', function () {
        this._userSub.setEncoding('utf8');
        this._log.info('user history subscriber inited');
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
              yield MailboxDAO.updateUserInfo(newUser);
            } catch (err) {
              this._log.error(err);
            }
          }.bind(this));
        }.bind(this));
      }.bind(this));
    }
  }

  // push mailbox to mq
  static _pushMailboxAfterChanged(id) {
    this._mailboxs.findOne({'_id': ObjectID(String(id))}, (err, doc) => {
      this._mailboxPub.publish('model.insert', JSON.stringify(doc));
    });
  }

  static * insert(mailbox) {
    var result = yield this._mailboxs.$insert(mailbox.toMongo());
    mailbox._id = result[0]._id;
    this._pushMailboxAfterChanged(mailbox._id);
    return mailbox;
  }

  static * updatePropertyWithoutSendMailbox(id, property) {
    var update = {};
    if (property.deleted != undefined && property.deleted != null) update.deleted = property.deleted;
    if (property.handled != undefined && property.handled != null) update.handled = property.handled;
    if (property.type != undefined && property.type != null) update.type = property.type;
    if (property.brief != undefined && property.brief != null) update.brief = property.brief;
    if (property.remark != undefined && property.remark != null) update.remark = property.remark;
    if (property.noReply != undefined && property.noReply != null) update.noReply = property.noReply;
    if (property.tags) update.tags = property.tags;
    if (property.storyId) update.storyId = ObjectID(String(property.storyId));
    if (property.shitId) update.shitId = ObjectID(String(property.shitId));
    if (property.lastMailDate) update.lastMailDate = property.lastMailDate;
    if (property.mails) {
      update.mails = [];
      for (var mail of property.mails) {
        var maildoc = mail.toMongo();
        update.mails.push(maildoc);
      }
    }

    update.lastModified = new Date().getTime();
    var result = yield this._mailboxs.$update({'_id': ObjectID(String(id))}, {$set: update});
    return true;
  }

  static * updateProperty(id, property) {
    var update = {};
    if (property.deleted != undefined && property.deleted != null) update.deleted = property.deleted;
    if (property.handled != undefined && property.handled != null) update.handled = property.handled;
    if (property.type != undefined && property.type != null) update.type = property.type;
    if (property.brief != undefined && property.brief != null) update.brief = property.brief;
    if (property.remark != undefined && property.remark != null) update.remark = property.remark;
    if (property.noReply != undefined && property.noReply != null) update.noReply = property.noReply;
    if (property.tags) update.tags = property.tags;
    if (property.storyId) update.storyId = ObjectID(String(property.storyId));
    if (property.shitId) update.shitId = ObjectID(String(property.shitId));
    if (property.lastMailDate) update.lastMailDate = property.lastMailDate;
    if (property.mails) {
      update.mails = [];
      for (var mail of property.mails) {
        var maildoc = mail.toMongo();
        update.mails.push(maildoc);
      }
    }

    update.lastModified = new Date().getTime();
    var result = yield this._mailboxs.$update({'_id': ObjectID(String(id))}, {$set: update});
    if (result && result[1].ok) {
      this._pushMailboxAfterChanged(id);
      return true;
    }
    return result;
  }

  static * updateUserInfo(user) {
    var update = {
      user: user
    };
    var result = yield this._mailboxs.$update({'user._id': user._id}, {$set: update}, {multi: true});
  }

  static * updateCharacter(character) {
    var result = yield this._mailboxs.$update({'character._id': character._id}, {$set: character}, {multi: true});
    if (result && result[1].ok)
      return true;
    return result;
  }

  static * getById(id) {
    var doc = yield this._mailboxs.$findOne({'_id': ObjectID(String(id))});
    if (!doc) {
      return null;
    } else {
      return Mailbox.fromMongo(doc);
    }
  }

  static * updateMail(mailboxId, mailId, mail) {
    var mailbox = yield this._mailboxs.$findOne({"_id": ObjectID(String(mailboxId))});
    if (mailbox == null) {
      return false;
    } else {
      var mails = mailbox.mails;
      for (var i = 0; i < mails.length; i++) {

        if (String(mails[i]._id) == (String(mailId))) {
          mail._id = mails[i]._id;
          mailbox.mails.splice(i, 1, mail);
        }
      }
      yield this._mailboxs.$update({"_id": ObjectID(String(mailboxId))}, {$set: {mails: mailbox.mails}});
      return true;
    }
  }

  static * passMail(mailboxId, mailId, pass) {
    var mailbox = yield this._mailboxs.$findOne({"_id": ObjectID(String(mailboxId))});
    if (mailbox == null) {
      return false;
    } else {

      for (var i = 0; i < mailbox.mails.length; i++) {
        if (mailbox.mails[i]._id == ObjectID(String(mailId))) {
          mailbox.mails[i].unPass = !pass;
        }
      }
      yield this._mailboxs.$update({"_id": ObjectID(String(mailboxId))}, {$set: {mails: mailbox.mails}});
      return mailbox;
    }
  }

  static * checkAllMailStatusByUserId(userId) {
    var result = Mailbox.CHECK_STATUS_PASS;
    var mailboxList = yield this._mailboxs.find({"userId": userId}).$toArray();
    if (mailboxList == null) {
      return -10;
    } else {
      for (var i = 0; i < mailboxList.length; i++) {
        for (var j = 0; j < mailboxList[i].mails.length; j++) {
          if (mailboxList[i].mails[j].fromId == userId) {
            continue;
          }
          if (mailboxList[i].mails[j].checkStatus == Mailbox.CHECK_STATUS_UNCHECK) {
            result = Mailbox.CHECK_STATUS_UNCHECK;
          }
          if (mailboxList[i].mails[j].checkStatus == Mailbox.CHECK_STATUS_UNPASS) {
            result = Mailbox.CHECK_STATUS_UNPASS;
          }
        }
      }
      return result;
    }
  }

  static * get(id) {
    var mailboxid;
    try {
      mailboxid = ObjectID(String(id));
    } catch (err) {
      this._log.error(err.stack);
      throw {status: 501, message: "mailbox id error, id is " + id};
    }
    var doc = yield this._mailboxs.$findOne({'_id': mailboxid});
    if (!doc)
      throw {status: 501, message: "cannot find mailbox"};
    return Mailbox.fromMongo(doc);
  }

  static * incReadCount(id, inc) {
    var result = yield this._mailboxs.$update({'_id': ObjectID(String(id))}, {$inc: {'readCount': inc}});
    if (result && result[1].ok)
      return true;
    return result;
  }

  static * delSpecifycMailbox() {
    var result = yield this._mailboxs.$remove({'userId': -999});
    return result;
  }

  static * getSpecificMailbox() {
    var docs = yield this._mailboxs.find({'userId': -999}).$toArray();
    if (!docs)
      docs = [];
    return [for (doc of docs) Mailbox.fromMongo(doc)];
  }

  static * getMailboxList(skip, limit) {
    //var docs = yield this._mailboxs.find({}).sort({_id: -1}).skip(skip).limit(limit).$toArray();
    var docs = yield this._mailboxs.find({}).skip(skip).limit(limit).$toArray();
    return [for (doc of docs) Mailbox.fromMongo(doc)];
  }

  static * getMailboxListByUserId(userId, skip, limit) {

    var docs = yield this._mailboxs.find({userId: userId}).sort({"_id": -1}).skip(skip).limit(limit).$toArray();
    return [for (doc of docs) Mailbox.fromMongo(doc)];
  }

  static * getList(userId, characterId, deleted, handled, type, sortField, nickName, skip, limit) {
    var query = {};
    if (userId) query.userId = userId;
    if (nickName) query["user.nickName"] = nickName;
    if (characterId) query.characterId = characterId;
    if (deleted != undefined && deleted != null) query.deleted = deleted;
    if (handled != undefined && handled != null) query.handled = handled;
    if (type != undefined && type != null && !isNaN(type)) query.type = type;

    var sort = {};
    if (sortField) sort[sortField] = -1;
    else sort._id = -1;

    var docs;
    if (isNaN(limit) || isNaN(skip) || limit == undefined || limit == null || skip == undefined || skip == null) {
      docs = yield this._mailboxs.find(query, {sort: sort}).$toArray();
    } else {
      console.log(query);
      docs = yield this._mailboxs.find(query, {sort: sort}).skip(skip).limit(limit).$toArray();
    }

    if (!docs)
      docs = [];
    return [for (doc of docs) Mailbox.fromMongo(doc)];
  }

  static * getCount(userId, characterId, deleted, handled, type, nickName) {
    var query = {};
    if (userId) query.userId = userId;
    if (nickName) query.user = {nickName: nickName};
    if (characterId) query.characterId = characterId;
    if (deleted != undefined && deleted != null) query.deleted = deleted;
    if (handled != undefined && handled != null) query.handled = handled;
    if (type != undefined && type != null && !isNaN(type)) query.type = type;

    var count = yield this._mailboxs.find(query).$count();
    return count;
  }

  static getUnreadCountAsync(userId, next) {
    var query = {
      'mails.fromId': parseInt(userId),
      'mails.handled': false
    };
    this._mailboxs.find(query).toArray((err, docs) => {
      if (err) return next(err, null);
      if (!docs) docs = [];
      try {
        return next(null, [for (doc of docs) Mailbox.fromMongo(doc)]);
      } catch (err) {
        return next(err, null);
      }
    });
  }

  static * getUnHandledMails(userId) {
    var query = {
      'mails.fromId': parseInt(userId),
      'mails.handled': false
    };
    var docs = yield this._mailboxs.find(query).$toArray();
    if (!docs) {
      return [];
    } else {
      return [for (doc of docs) Mailbox.fromMongo(doc)];
    }
  }

  /////////////////////////////////
  // method for async
  /////////////////////////////////

  static getMailboxsAsync(userId, deleted, next) {
    var query = {
      userId: userId
    };
    if (deleted != undefined && deleted != null) query.deleted = deleted;
    this._mailboxs.find(query).toArray((err, docs) => {
      if (!err) {
        if (!docs)
          docs = [];
        next(null, docs);
      } else {
        next(err, null);
      }
    });
  }
}