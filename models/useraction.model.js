import mongodb from "mongodb";
var ObjectID = mongodb.ObjectID;

export class UserActionRecord {

  static RECORD_TYPE_WRITING_MAIL_PAGE;
  static RECORD_TYPE_STORY_PAGE;
  static RECORD_TYPE_MAILBOX_PAGE;
  static RECORD_TYPE_SHIT_PAGE;

  static init() {
    this.RECORD_TYPE_WRITING_MAIL_PAGE = 10;
    this.RECORD_TYPE_MAILBOX_PAGE = 11;
    this.RECORD_TYPE_STORY_PAGE = 12;
    this.RECORD_TYPE_SHIT_PAGE = 13;
  }

  constructor(id, user, type, caseId, fromTime, endTime, duration) {
    if (id)
      this._id = String(id);
    this.type = type;
    this.caseId = String(caseId);
    this.user = user;
    this.fromTime = fromTime;
    this.endTime = endTime;
    this.duration = duration;
    this.fromOther = false;
  }

  static fromMongo(doc) {
    return new UserActionRecord(doc._id, doc.user, doc.type, doc.caseId, doc.fromTime, doc.endTime, doc.duration);
  }

  toMongo() {
    return {
      type: this.type,
      caseId: ObjectID(String(this.caseId)),
      user: this.user,
      fromTime: this.fromTime,
      endTime: this.endTime,
      duration: this.duration
    };
  }

  toClient() {
    return {
      _id: String(this._id),
      type: this.type,
      caseId: ObjectID(String(this.caseId)),
      user: this.user,
      fromTime: this.fromTime,
      endTime: this.endTime,
      duration: this.duration
    };
  }
}

export class UserActionRecordDAO {

  static * init(mongo, log) {
    if (!this._records) {
      this._records = mongo.collection("user_action");
      yield this._records.$ensureIndex({'user._id': 1, 'caseId': 1});
      this._log = log;
      this._log.info("user_action index ensured!");
    }
  }

  static * insert(record) {
    var result = yield this._records.$insert(record);
    record._id = String(result[0]._id);
    return record;
  }

  static * insertMany(docs) {
    var result = yield this._records.$insert(docs);
    console.log(result);
    return result;
  }

  static * getSpecialList(userId, storyId, recordTypes, startDate, endDate){
    var query = {};
    if(userId){
      query = {"user._id": userId};
    }
    if (startDate && endDate && !isNaN(startDate) && !isNaN(endDate)) {
      query.fromTime = {'$gte': startDate, '$lte': endDate};
    }
    if (recordTypes) {
      query.type = {$in:recordTypes};
    }
    var user = {};

    if(storyId){
      query.caseId = storyId;
    }

    var sort = {};
    sort._id = -1;
    console.log(query);
    var docs = yield this._records.find(query).sort({fromTime: -1}).$toArray();

    if(!docs) return [];
    return [for (doc of docs) UserActionRecord.fromMongo(doc)];
  }

  static * getList(startDate, endDate, recordTypes, skip, limit) {
    var query = {};
    if (recordTypes) {
      query.type = recordTypes;
    }
    if (startDate && endDate && !isNaN(startDate) && !isNaN(endDate)) {
      query.fromTime = {'$gte': startDate, '$lte': endDate};
    }

    var sort = {};
    sort._id = -1;
    var docs = [];
    if (!isNaN(skip) && !isNaN(limit)) {
      docs = yield this._records.find(query).sort({createDate: -1}).skip(skip).limit(limit).$toArray();
    }else{
      docs = yield this._records.find(query).sort({createDate: -1}).$toArray();
    }
    if (!docs) return [];
    return [for (doc of docs) UserActionRecord.fromMongo(doc)];
  }

  static * getRecordByGroup(matchCode, groupCode) {
    if(matchCode && groupCode){
      var docs = yield this._records.$aggregate([
        {$match: matchCode},
        {$group: groupCode}
      ]);
    }else {
      var docs = yield this._records.$aggregate([
        {$match: matchCode}
      ]);
    }

    if(!docs) return [];
    return docs;
  }

}