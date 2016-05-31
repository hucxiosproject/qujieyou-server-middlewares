import mongodb from "mongodb";
var ObjectID = mongodb.ObjectID;

export class AdminAction {

  static ACTION_SYSTEM_ASSIGN_MAIL_TO_MAIL_INBOX;
  static ACTION_SYSTEM_ASSIGN_MAIL_TO_ADMIN;
  static ACTION_SYSTEM_ASSIGN_MAIL;
  static ACTION_USER_CREATE_NEW_MAIL;
  static ACTION_USER_CREATE_UNPUBLISHED_MAIL;
  static ACTION_USER_REPLY_MAIL;
  static ACTION_USER_PUBLISH_MAIL;
  static ACTION_ASSISTANT_CATCH_MAIL;
  static ACTION_ASSISTANT_REPLY_MAIL;
  static ACTION_ADMIN_CATCH_MAIL;
  static ACTION_ADMIN_SEND_MAIL;
  static ACTION_ADMIN_REPLY_MAIL;
  static ACTION_ADMIN_CHECK_MAIL_PASS;
  static ACTION_ADMIN_CHECK_MAIL_UNPASS;
  static ACTION_ADMIN_PUBLISH_MAIL;
  static ACTION_ADMIN_HANDLE_MAIL;
  static ACTION_ADMIN_UPDATE_MAIL;
  static TARGET_MAIL;
  static TARGET_USER;

  static init() {
    this.ACTION_SYSTEM_ASSIGN_MAIL_TO_MAIL_INBOX = 51;
    this.ACTION_SYSTEM_ASSIGN_MAIL_TO_ADMIN = 52;
    this.ACTION_SYSTEM_ASSIGN_MAIL = 53;
    this.ACTION_USER_CREATE_NEW_MAIL = 11;
    this.ACTION_USER_REPLY_MAIL = 12;
    this.ACTION_USER_CREATE_UNPUBLISHED_MAIL = 13;
    this.ACTION_USER_PUBLISH_MAIL = 14;
    this.ACTION_ASSISTANT_CATCH_MAIL = 21;
    this.ACTION_ASSISTANT_REPLY_MAIL = 22;
    this.ACTION_ADMIN_CHECK_MAIL_PASS = 31;
    this.ACTION_ADMIN_CHECK_MAIL_UNPASS = 32;
    this.ACTION_ADMIN_REPLY_MAIL = 33;
    this.ACTION_ADMIN_PUBLISH_MAIL = 41;
    this.ACTION_ADMIN_UPDATE_MAIL = 61;
    this.ACTION_ADMIN_CATCH_MAIL = 62;
    this.ACTION_ADMIN_SEND_MAIL = 63;
    this.ACTION_ADMIN_HANDLE_MAIL = 64;
    this.TARGET_MAIL = 101;
    this.TARGET_USER = 102;
  }

  constructor(id, actionType, mail, admin, assistant, user, message) {
    this.actionType = -1;
    this.mail = null;

    this.admin = null;
    this.assistant = null;
    this.user = null;

    this.message = null;
    this.createTime = new Date().getTime();
    this.lastModified = new Date().getTime();
    if (id) {
      this._id = String(id);
    }
    if (actionType) {
      this.actionType = actionType;
    }
    if (mail) {
      this.mail = mail;
      this.mailId = ObjectID(String(mail._id));
    }
    if (admin) {
      this.admin = admin;
      if (this.admin.id) {
        this.admin._id = this.admin.id;
      }
      this.admin._id = parseInt(this.admin._id);
      this.adminId = this.admin._id;
    }
    if (assistant) {
      this.assistant = assistant;
      if (this.assistant.id) {
        this.assistant._id = this.assistant.id;
      }
      this.assistant._id = parseInt(this.assistant._id);
      this.assistantId = this.assistant._id;
    }
    if (user) {
      this.user = user;
      if (this.user.id) {
        this.user._id = this.user.id;
      }
      this.user._id = parseInt(this.user._id);
      this.userId = this.user._id;
    }
    if (message) {
      this.message = message;
    }
    if (actionType) {
      this.actionType = actionType;
    }
  }

  static fromMongo(doc) {
    var adminAction = new AdminAction(doc.id, doc.actionType, doc.mail, doc.admin, doc.assistant, doc.user, doc.message);
    adminAction.createTime = doc.createTime;
    adminAction.lastModified = doc.lastModified;
    return adminAction;

  }

  toMongo() {
    return {
      actionType: this.actionType,
      mail: this.mail,
      admin: this.admin,
      adminId: this.adminId,
      assistant: this.assistant,
      assistantId: this.assistantId,
      user: this.user,
      userId: this.userId,
      message: this.message,
      createTime: this.createTime,
      lastModified: this.lastModified
    };
  }
}

export class AdminActionDAO {

  static * init(mongo, log, on) {
    if (!this._records) {
      if (on) {
        this._records = mongo.collection("admin_action");
      } else {
        this._records = mongo.collection("admin_action_test");
      }
      this._log = log;
    }
  }

  static * insert(record) {
    var result = yield this._records.$insert(record);
    record._id = String(result[0]._id);
    return record;
  }

  static * getCountByAdminId(adminId, actionType, timeFrom, timeTo) {
    adminId = parseInt(adminId);
    return yield this._records.find({
      adminId: adminId,
      actionType: actionType,
      createTime: {$gt: timeFrom, $lt: timeTo}
    }).$count();
  }

  static * getCountByAssistantId(assistantId, actionType, timeFrom, timeTo) {
    assistantId = parseInt(assistantId);
    return yield this._records.find({
      assistantId: assistantId,
      actionType: actionType,
      createTime: {$gt: timeFrom, $lt: timeTo}
    }).$count();
  }

  static * getList(skip, limit) {
    var docs = yield this._records.find({}).skip(skip).limit(limit).$toArray();
    return [for (doc of docs) AdminAction.fromMongo(doc)];
  }

  static * getListByUser(userId) {
    userId = parseInt(userId);
    var docs = yield this._records.find({userId: userId}).$toArray();
    return [for (doc of docs) AdminAction.fromMongo(doc)];
  }

  static * getListByType(type, skip, limit) {
    type = parseInt(type);
    var docs = yield this._records.find({actionType: type}).sort({_id: -1}).skip(skip).limit(limit).$toArray();
    return [for (doc of docs) AdminAction.fromMongo(doc)];
  }
}