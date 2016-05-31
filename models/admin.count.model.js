import mongodb from "mongodb";
var ObjectID = mongodb.ObjectID;

export class AdminCount {


  static init() {

  }

  constructor(id, adminId, dateString, date, taskCount, finishCount, successCount, secondMailCount, checkCount) {
    this.dateString = "";
    this.date = new Date().getTime();
    this.taskCount = 0;
    this.finishCount = 0;
    this.successCount = 0;
    this.secondMailCount = 0;
    this.checkCount = 0;

    if (id)
      this._id = String(id);
    if (adminId) {
      adminId = parseInt(adminId);
      if (! isNaN(adminId)) {
        this.adminId = adminId;
      }
    }
    if (typeof dateString == "string" && dateString.length > 0) {
      this.dateString = dateString;
    }
    if (date) {
      this.date = date
    }
    if (typeof taskCount == "number") {
      this.taskCount = taskCount;
    }
    if (typeof finishCount == "number") {
      this.finishCount = finishCount;
    }
    if (typeof successCount == "number") {
      this.successCount = successCount;
    }
    if (typeof secondMailCount == "number") {
      this.secondMailCount = secondMailCount;
    }
    if (typeof checkCount == "number") {
      this.checkCount = checkCount;
    }
  }
  static fromMongo(doc) {
    return new AdminCount(doc._id, doc.adminId, doc.dateString, doc.date, doc.taskCount, doc.finishCount, doc.successCount, doc.secondMailCount, doc.checkCount)
  }

  toMongo() {
    return {
      adminId:this.adminId,
      dateString:this.dateString,
      date:this.date,
      taskCount:this.taskCount,
      finishCount:this.finishCount,
      successCount:this.successCount,
      secondMailCount:this.secondMailCount,
      checkCount:this.checkCount
    };
  }
  toClient() {

    return {
      adminId:this.adminId,
      date:this.date.getTime(),
      taskCount:this.taskCount,
      finishCount:this.finishCount,
      successCount:this.successCount,
      secondMailCount:this.secondMailCount,
      checkCount:this.checkCount,
      createTime: ObjectID(String(this._id)).getTimestamp().getTime()
    };
  }
}

export class AdminCountDAO {

  static * init(mongo, log,on) {
    if (! this._inbox) {
      if(on){
        this._inbox = mongo.collection("admin_count");
      }else{
        this._inbox = mongo.collection("admin_count_test");
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
        adminId:record.adminId,
        dateString:record.dateString,
        date:record.date,
        taskCount:record.taskCount,
        finishCount:record.finishCount,
        successCount:record.successCount,
        secondMailCount:record.secondMailCount,
        checkCount:record.checkCount
      }
    });
  }


  static * getCountByDateStringAndAdminId(dateString,adminId){
    adminId = parseInt(adminId);
    var result = yield this._inbox.$findOne({adminId: adminId, dateString: dateString});
    if (! result) {
      return null;
    } else {
      return AdminCount.fromMongo(result);
    }
  }

  static * getCountByAdminId(adminId,skip,limit){
    adminId = parseInt(adminId);
    var result = yield this._inbox.find({adminId: adminId}).sort({date:-1}).skip(skip).limit(limit).$toArray();
    return [for (doc of result) (AdminCount.fromMongo(doc)).toClient()];
  }
  static * getCountByAdminIdList(adminIdList,fromDate,endDate,skip,limit){

    fromDate = new Date(fromDate);
    endDate = new Date(endDate);
    console.log(fromDate,endDate,adminIdList,skip,limit);
    var result = yield this._inbox.find({adminId: {$in:adminIdList},date:{$gt:fromDate,$lt:endDate}}).sort({date:-1}).skip(skip).limit(limit).$toArray();
    return [for (doc of result) AdminCount.fromMongo(doc)];
  }

  static * getList(skip, limit) {
    var docs = yield this._inbox.find({}).sort({date:-1}).skip(skip).limit(limit).$toArray();
    return [for (doc of docs) AdminCount.fromMongo(doc)];
  }

}