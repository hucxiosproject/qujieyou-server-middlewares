import mongodb from "mongodb";
var ObjectID = mongodb.ObjectID;

export class AnalysisStoryRecord{
  constructor(id, storyId, followedCount, commentCount, preView, userView, updated, avgDuration, rangeDurations, dataTime){
    if(id)
      this._id = String(id);
    this.storyId = String(storyId);
    this.followedCount = followedCount;
    this.commentCount = commentCount;
    this.preView = preView;
    this.userView = userView;
    this.updated = updated;
    this.avgDuration = avgDuration;
    this.rangeDurations = rangeDurations;
    this.dataTime = dataTime;
  }

  static fromMongo(doc) {
    var analysis = new AnalysisStoryRecord(doc._id, doc.storyId, doc.followedCount, doc.commentCount, doc.preView, doc.userView, doc.updated, doc.avgDuration, doc.rangeDurations, doc.dataTime);
    return analysis;
  }

  toMongo() {
    var data = {
      storyId: ObjectID(String(this.storyId)),
      followedCount: this.followedCount,
      commentCount: this.commentCount,
      preView: this.preView,
      userView: this.userView,
      updated: this.updated,
      avgDuration: this.avgDuration,
      rangeDurations: this.rangeDurations,
      dataTime: this.dataTime
    };
    return data;
  }
}

export class AnalysisStoryRecordDAO{
  static * init(mongo, log) {
    if (!this._records) {
      this._records = mongo.collection("analysisstory_record");
      yield this._records.$ensureIndex({'storyId': 1});
      this._log = log;
      this._log.info("analysisstory_record index ensured!");
    }
  }

  static * insert(record) {
    var result = yield this._records.$insert(record);
    record._id = String(result[0]._id);
    return record;
  }

  static * insertMany(docs){
    var result = yield this._records.$insert(docs);
    return result;
  }

  static * getList(storyId, skip, limit, startDate, endDate) {
    var query = {};
    if (storyId) query.storyId = String(storyId);

    if(!isNaN(startDate) || !isNaN(startDate)){
      query.dataTime = {'$gte': parseInt(startDate), '$lte': parseInt(endDate)};
    }


    var docs;
    if (isNaN(limit) || isNaN(skip)) {
      docs = yield this._records.find(query, {sort: {'_id': -1}}).$toArray();
    } else {
      docs = yield this._records.find(query, {sort: {'_id': -1}}).skip(skip).limit(limit).$toArray();
    }
    if (!docs)
      docs = [];
    return [for (doc of docs) AnalysisStoryRecord.fromMongo(doc)];
  }
}