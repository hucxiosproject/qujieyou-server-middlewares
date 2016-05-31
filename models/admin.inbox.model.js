import mongodb from "mongodb";
var ObjectID = mongodb.ObjectID;
import rabbit from "rabbit.js";
import co from "co";
import {ErrorUtil} from "../utils/error.util.js";
/**
 * 外援，运营看到的自己的任务（一次，二次，完成）
 */
export class AdminInbox {

  static CHECK_STATUS_UNCHECK;
  static CHECK_STATUS_UNPASS;
  static CHECK_STATUS_PASS;

  static REPLY_STATUS_UNREPLY;
  static REPLY_STATUS_REPLYED;

  static HANDLE_STATUS_UNDELIVERD;
  static HANDLE_STATUS_DELIVERD;

  static ADMIN_TYPE_ADMIN;
  static ADMIN_TYPE_ASSISTANT;

  static init() {
    this.CHECK_STATUS_UNCHECK = 0;
    this.CHECK_STATUS_UNPASS = -1;
    this.CHECK_STATUS_PASS = 1;

    this.REPLY_STATUS_UNREPLY = 0;
    this.REPLY_STATUS_REPLYED = 1;

    this.HANDLE_STATUS_UNDELIVERD = 0;
    this.HANDLE_STATUS_DELIVERD = 1;

    this.ADMIN_TYPE_ADMIN = 1;
    this.ADMIN_TYPE_ASSISTANT = 2;
  }

  constructor(id, admin, user, mail) {

    this.userId = 0; //用户id
    this.user = user; //用户数据
    this.adminId = 0;
    this.adminType = AdminInbox.ADMIN_TYPE_ASSISTANT;
    this.admin = null; //运营或者外援数据
    this.mail = null; //最新的一条mail
    this.firstUserMailTime = new Date().getTime(); //用户第一次发信时间
    this.latestUserMailTime = new Date().getTime(); //用户最后一次发信时间
    this.latestAdminMailTime = new Date().getTime(); //运营或者外援最后一次回复时间
    this.totalMailCount = 0; //总信数
    this.latestMailWordCount = 0; //最新一封信的字数
    this.isFirstTime = false; //用户是否处在一次来信状态
    this.replyStatus = AdminInbox.REPLY_STATUS_UNREPLY; //是否已回复
    this.replyTime = null;
    this.checkStatus = AdminInbox.CHECK_STATUS_UNCHECK; //外援的回复是否审核(未审核，未通过，通过)
    this.checkTime = null;
    this.handleStatus = AdminInbox.HANDLE_STATUS_UNDELIVERD; //任务是否分发,第二天9点之前运营看不到二次信
    this.close = false; //运营是否已经关闭此项目

    if (id) {
      this._id = String(id);
    }
    if (user) {
      this.user = user;
      if (this.user.id) {
        this.user._id = this.user.id;
      }
      this.user._id = parseInt(this.user._id);
      this.userId = this.user._id;
    }
    if (admin) {
      this.admin = admin;
      if (this.admin.id) {
        this.admin._id = this.admin.id;
      }
      this.admin._id = parseInt(this.admin._id);
      this.adminId = this.admin._id;
      if (this.admin.userType == 7) {
        this.adminType = AdminInbox.ADMIN_TYPE_ASSISTANT;
      } else if (this.admin.userType == 10) {
        this.adminType = AdminInbox.ADMIN_TYPE_ADMIN;
      } else {
        ErrorUtil.throwError(500, "admin 的userType不合法,admin is " + JSON.stringify(this.admin));
      }
    }
    if (mail) {
      this.mail = mail;
    }
  }

  static fromMongo(doc) {
    var adminInboxFile = new AdminInbox(doc._id, doc.admin, doc.user, doc.mail);
    adminInboxFile.firstUserMailTime = doc.firstUserMailTime;
    adminInboxFile.latestUserMailTime = doc.latestUserMailTime;
    adminInboxFile.latestAdminMailTime = doc.latestAdminMailTime;
    adminInboxFile.totalMailCount = doc.totalMailCount;
    adminInboxFile.latestMailWordCount = doc.latestMailWordCount;
    adminInboxFile.isFirstTime = doc.isFirstTime;
    adminInboxFile.replyStatus = doc.replyStatus;
    adminInboxFile.replyTime = doc.replyTime;
    adminInboxFile.checkStatus = doc.checkStatus;
    adminInboxFile.checkTime = doc.checkTime;
    adminInboxFile.handleStatus = doc.handleStatus;
    adminInboxFile.close = doc.close;

    //这里是0.7字段,0.7下线后移除,0.8不再记录
    adminInboxFile.mailboxList = doc.mailboxList;
    adminInboxFile.userPhoneType = doc.userPhoneType;
    adminInboxFile.tags = doc.tags;

    return adminInboxFile;
  }

  toMongo() {
    return {
      userId: this.userId,
      user: this.user,
      adminId: this.adminId,
      adminType: this.adminType,
      admin: this.admin,
      mail: this.mail,
      firstUserMailTime: this.firstUserMailTime,
      latestUserMailTime: this.latestUserMailTime,
      latestAdminMailTime: this.latestAdminMailTime,
      totalMailCount: this.totalMailCount,
      latestMailWordCount: this.latestMailWordCount,
      isFirstTime: this.isFirstTime,
      replyStatus: this.replyStatus,
      replyTime: this.replyTime,
      checkStatus: this.checkStatus,
      checkTime: this.checkTime,
      handleStatus: this.handleStatus,
      close: this.close
    };
  }

  toClient(mailUrl, token) {
    var nickName = null;
    if(this.mailboxList){
      //0.7的toClient方法,0.7下线后移除
      var mailbox = {};
      if (this.mailboxList.length > 0) {
        mailbox = this.mailboxList[this.mailboxList.length - 1];
      }

      if (this.admin) {
        nickName = this.admin.nickName;
      }
      return {
        _id: String(this._id),
        adminId: this.adminId,
        adminNickName: nickName,
        userId: this.userId,
        user: this.user,
        mail: {
          brief: mailbox.brief,
          _id: mailbox.mails[mailbox.mails.length-1]._id,
          url: mailUrl + "?token=" + token + "#/detail/" + String(mailbox._id),
          handled: mailbox.handled
        },
        tags: this.tags,
        firstUserMailTime: this.firstUserMailTime,
        latestUserMailTime: this.latestUserMailTime,
        latestAdminMailTime: this.latestAdminMailTime,
        totalMailCount: this.totalMailCount,
        latestMailWordCount: this.latestMailWordCount,
        replyStatus: this.replyStatus,
        checkStatus: this.checkStatus,
        createTime: ObjectID(String(this._id)).getTimestamp().getTime(),
        checkTime: this.checkTime,
        replyTime: this.replyTime
      };
    }else{
      var mail = {};
      if (this.mail) {
        mail = this.mail;
      }
      if (this.admin) {
        nickName = this.admin.nickName;
      }
      return {
        _id: String(this._id),
        adminId: this.adminId,
        adminNickName: nickName,
        userId: this.userId,
        user: this.user,
        mail: {
          brief: mail.brief,
          _id: mail._id,
          url: mailUrl + "?token=" + token + "#/detail/" + String(mail._id),
          handled: mail.handled
        },
        tags: this.tags,
        firstUserMailTime: this.firstUserMailTime,
        latestUserMailTime: this.latestUserMailTime,
        latestAdminMailTime: this.latestAdminMailTime,
        totalMailCount: this.totalMailCount,
        latestMailWordCount: this.latestMailWordCount,
        replyStatus: this.replyStatus,
        checkStatus: this.checkStatus,
        createTime: ObjectID(String(this._id)).getTimestamp().getTime(),
        checkTime: this.checkTime,
        replyTime: this.replyTime
      };
    }

  }
}

export class AdminInboxDAO {

  static * init(mongo, rabbitUrl, log,on) {
    if (!this._inbox) {
      if(on){
        this._inbox = mongo.collection("admin_inbox");
      }else{
        this._inbox = mongo.collection("admin_inbox_test");
      }

      this._log = log;
      this._log.info("admin_inbox index ensured!");
    }
    var context = rabbit.createContext(rabbitUrl);
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
                assistantName: originUser.assistantName,
                assistantType: originUser.assistantType
              };
              console.log("update user in admin_inbox list");
              yield AdminInboxDAO.updateUserInfo(newUser);
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
    return yield this._inbox.$update({'user._id': user._id}, {$set: update}, {multi: true});
  }

  static * insert(record) {
    var result = yield this._inbox.$insert(record);
    record._id = String(result[0]._id);
    return record;
  }

  static * update(record) {
    var newAdminInboxFile = {};

    if (record.user) {
      newAdminInboxFile.user = record.user;
      if (newAdminInboxFile.user.id) {
        newAdminInboxFile.user._id = newAdminInboxFile.user.id;
      }
      newAdminInboxFile.user._id = parseInt(newAdminInboxFile.user._id);
      newAdminInboxFile.userId = newAdminInboxFile.user._id;
    }

    if (record.admin) {
      newAdminInboxFile.admin = record.admin;
      if (newAdminInboxFile.admin.id) {
        newAdminInboxFile.admin._id = newAdminInboxFile.admin.id;
      }
      newAdminInboxFile.admin._id = parseInt(newAdminInboxFile.admin._id);
      newAdminInboxFile.adminId = newAdminInboxFile.admin._id;
      if (newAdminInboxFile.admin.userType == 7) {
        newAdminInboxFile.adminType = AdminInbox.ADMIN_TYPE_ASSISTANT;
      } else if (newAdminInboxFile.admin.userType == 10) {
        newAdminInboxFile.adminType = AdminInbox.ADMIN_TYPE_ADMIN;
      } else {
        ErrorUtil.throwError(500, "admin 的userType不合法,admin is " + JSON.stringify(newAdminInboxFile.admin));
      }
    }

    if(record.mail){
      newAdminInboxFile.mail = record.mail;
    }
    if(record.firstUserMailTime){
      newAdminInboxFile.firstUserMailTime = record.firstUserMailTime;
    }
    if(record.latestUserMailTime){
      newAdminInboxFile.latestUserMailTime = record.latestUserMailTime;
    }
    if(record.latestAdminMailTime){
      newAdminInboxFile.latestAdminMailTime = record.latestAdminMailTime;
    }
    if(record.totalMailCount !== null && record.totalMailCount !== undefined){
      newAdminInboxFile.totalMailCount = record.totalMailCount;
    }
    if(record.latestMailWordCount !== null && record.latestMailWordCount !== undefined){
      newAdminInboxFile.latestMailWordCount = record.latestMailWordCount;
    }

    if(record.isFirstTime !== null && record.isFirstTime !== undefined){
      newAdminInboxFile.isFirstTime = record.isFirstTime;
    }
    if(record.replyStatus !== null && record.replyStatus !== undefined){
      newAdminInboxFile.replyStatus = record.replyStatus;
    }
    if(record.replyTime !== null && record.replyTime !== undefined){
      newAdminInboxFile.replyTime = record.replyTime;
    }
    if(record.checkStatus !== null && record.checkStatus !== undefined){
      newAdminInboxFile.checkStatus = record.checkStatus;
    }

    if(record.checkTime !== null && record.checkTime !== undefined){
      newAdminInboxFile.checkTime = record.checkTime;
    }
    if(record.handleStatus !== null && record.handleStatus !== undefined){
      newAdminInboxFile.handleStatus = record.handleStatus;
    }
    if(record.close !== null && record.close !== undefined){
      newAdminInboxFile.close = record.close;
    }
    console.log("update record : ", newAdminInboxFile.replyStatus)
    return yield this._inbox.$update({_id: ObjectID(String(record._id))}, {
      $set: newAdminInboxFile
    });
  }

  static * getList(skip, limit) {
    var docs = yield this._inbox.find({}).skip(skip).limit(limit).sort({latestUserMailTime: -1}).$toArray();
    return [for (doc of docs) AdminInbox.fromMongo(doc)];
  }

  static * getById(id) {
    id = ObjectID(String(id));
    var result = yield this._inbox.$findOne({_id: id});
    return AdminInbox.fromMongo(result);
  }

  static * getByUserIdAndAdminId(userId, adminId) {
    userId = parseInt(userId);
    adminId = parseInt(adminId);
    var docs = yield this._inbox.find({userId: userId, adminId: adminId, close: false}).$toArray();
    return [for (doc of docs) AdminInbox.fromMongo(doc)];
  }

  static * closeAdminInboxFile(userId, close) {
    userId = parseInt(userId);
    yield this._inbox.$update({userId: userId}, {$set: {close: close}}, {multi: true});
    return true;
  }

  static * getAdminInboxFileList(query, sort, skip, limit) {
    var docs = yield this._inbox.find(query).skip(skip).limit(limit).sort(sort).$toArray();
    return [for (doc of docs) AdminInbox.fromMongo(doc)];
  }


  static * deliveredAdminInboxList(adminId){
    var query = {
      close: false,
      handleStatus: AdminInbox.HANDLE_STATUS_UNDELIVERD,
      adminId: adminId
    };
    var result = yield this._inbox.$update(query,{
      $set: {
        handleStatus: AdminInbox.HANDLE_STATUS_DELIVERD
      }
    },{multi: true});
    return result[0]; //需要获得更新的个数
  }
}