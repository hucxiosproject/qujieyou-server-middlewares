import mongodb from "mongodb";
var ObjectID = mongodb.ObjectID;
import rabbit from "rabbit.js";
import co from "co";

/**
 * 用于统计每个用户的信件信息
 */
export class UserMail {

  static init() {

  }

  constructor(id, user, brief) {

    this.user = null;
    this.character = null;
    this.assistant = null;
    this.brief = brief;
    this.handled = false;
    this.noReply = false;
    this.totalMailCount = 0;
    this.totalWordCount = 0;
    this.firstMailTime = new Date().getTime();
    this.latestMailTime = new Date().getTime();
    this.latestUserMailTime = new Date().getTime();
    this.latestAssistantMailTime = new Date().getTime();
    this.deleted = false;
    this.lastModified = new Date().getTime();
    if (id)
      this._id = String(id);
    if (user) {
      this.user = user;
    }
    if (brief) {
      this.brief = brief;
    }
  }

  static fromMongo(doc) {
    var userMail = new UserMail(doc._id, doc.user, doc.brief);
    userMail.character = doc.character;
    userMail.assistant = doc.assistant;
    userMail.handled = doc.handled;
    userMail.noReply = doc.noReply;
    userMail.totalMailCount = doc.totalMailCount;
    userMail.totalWordCount = doc.totalWordCount;
    userMail.firstMailTime = doc.firstMailTime;
    userMail.latestMailTime = doc.latestMailTime;
    userMail.latestUserMailTime = doc.latestUserMailTime;
    userMail.latestAssistantMailTime = doc.latestAssistantMailTime;
    userMail.deleted = doc.deleted;
    userMail.lastModified = doc.lastModified;
    return userMail;
  }

  toMongo() {
    return {
      user: this.user,
      character: this.character,
      assistant: this.assistant,
      brief: this.brief,
      handled: this.handled,
      noReply: this.noReply,
      totalMailCount: this.totalMailCount,
      totalWordCount: this.totalWordCount,
      firstMailTime: this.firstMailTime,
      latestMailTime: this.latestMailTime,
      latestUserMailTime: this.latestUserMailTime,
      latestAssistantMailTime: this.latestAssistantMailTime,
      deleted: this.deleted,
      lastModified: this.lastModified
    };
  }

  toClient() {
    return {
      _id:String(this._id),
      user: {
        _id:this.user._id,
        nickName:this.user.nickName
      },
      assistant: {
        _id:this.user.assistantId,
        nickName:this.user.assistantName
      },
      userTags:[],
      brief: this.brief,
      handled: this.handled,
      noReply: this.noReply,
      totalMailCount: this.totalMailCount,
      totalWordCount: this.totalWordCount,
      firstMailTime: this.firstMailTime,
      latestMailTime: this.latestMailTime,
      latestUserMailTime: this.latestUserMailTime,
      latestAssistantMailTime: this.latestAssistantMailTime,
      deleted: this.deleted,
      lastModified: this.lastModified
    };
  }
}


export class UserMailDAO {
  static _index;
  static _userMailSub;
  static _log;

  static * init(mongo, rabbitUrl, log) {
    if (!this._index) {
      this._index = mongo.collection("user_mail");
      yield this._index.$ensureIndex({
        '_id': -1,
        'user._id': 1
      });
      this._log = log;
      this._log.info("user_mail index ensured!");
    }
    var context = rabbit.createContext(rabbitUrl);
    if (!this._userMailSub) {
      this._userMailSub = context.socket('SUB');
      this._userMailSub.connect('user', 'model.update', function () {
        this._userMailSub.setEncoding('utf8');
        this._log.info('user history subscriber inited');
        this._userMailSub.on('data', function (user) {
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
              yield UserMailDAO.updateUserInfo(newUser);
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
    yield this._index.$update({'user._id': user._id}, {$set: update}, {multi: true});
  }

  static * getUserMailList(query,sort,skip,limit){
    var docs = yield this._index.find(query).sort(sort).skip(skip).limit(limit).$toArray();
    if(docs){
      return [for (doc of docs) UserMail.fromMongo(doc)];
    }else{
      return [];
    }

  }

  static * getCount(query) {
    return yield this._index.find(query).$count();
  }

  static * insert(record) {
    var result = yield this._index.$insert(record.toMongo());
    record._id = String(result[0]._id);
    return record;
  }

  static * updateById(id, record) {
    id = ObjectID(String(id));
    return yield this._index.$update({_id: id}, {
      $set: record
    },{multi: true});
  }

  static * updateByUserId(userId, record) {
    userId = parseInt(userId);
    return yield this._index.$update({'user._id': userId}, {
      $set: record
    },{multi: true});
  }

}