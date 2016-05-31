import mongodb from "mongodb";
var ObjectID = mongodb.ObjectID;

export class Indicator {


  static init() {

  }

  constructor(id, mailRead,secendMail, mailRate, totalFrom, totalTo, totalUser) {
    this.mailRead = mailRead;
    this.secendMail = secendMail;
    this.mailRate = mailRate;
    this.totalFrom = totalFrom;
    this.totalTo = totalTo;
    this.totalUser = totalUser;
  }

  static fromMongo(doc) {
    return new Indicator(doc._id, doc.mailRead,doc.secendMail, doc.mailRate, doc.totalFrom, doc.totalTo , doc.totalUser);
  }

  toMongo() {
    return {
      mailRead:this.mailRead,
      secendMail:this.secendMail,
      mailRate:this.mailRate,
      totalFrom:this.totalFrom,
      totalTo:this.totalTo,
      totalUser:this.totalUser
    };
  }

  toClient() {
    return {
      _id: String(this._id),
      mailRead:this.mailRead,
      secendMail:this.secendMail,
      mailRate:this.mailRate,
      totalFrom:this.totalFrom,
      totalTo:this.totalTo,
      totalUser:this.totalUser
    };
  }
}

export class IndicatorDAO {

  static * init(mongo, log) {
    if (! this._records) {
      this._records = mongo.collection("mailboxs");

      this._log = log;
    }else{
      console.log(2);
    }
  }


  static * getIndicator() {
    var readcount = yield this._records.find({"mails.fromId":2,"mails.handled":true},{mails:{$slice: -1}}).$count();
    var unreadcount = yield this._records.find({"mails.fromId":2,"mails.handled":false},{mails:{$slice: -1}}).$count();
    var totalmailcount = yield this._records.$aggregate(
      [
        {$group: {
          _id: { userId: "$userId" },
          total: { $sum: {'$size': "$mails"}}}},
        {$match:{total:{'$gt':0}}}
      ]
    );
    totalmailcount = totalmailcount.length;
    var secendmailcount = yield this._records.$aggregate(
      [
        {$group: {
          _id: { userId: "$userId" },
          total: { $sum: {'$size': "$mails"}}}},
        {$match:{total:{'$gt':1}}}
      ]
    );
    secendmailcount = secendmailcount.length;

    var defaultmail = yield this._records.$aggregate(
      [
        {$match:{"mails.fromId":2}},
        {$group: { _id: { _id: "$_id" }, total: { $sum: {$size: "$mails"}}}},
        {$match:{total:1}}
      ]
    );
    defaultmail = defaultmail.length;
    var readdefaultmail = yield this._records.$aggregate(
      [
        {$match:{"mails.fromId":2,"mails.handled":true}},
        {$group: { _id: { _id: "$_id" }, total: { $sum: {$size: "$mails"}}}},
        {$match:{total:1}}
      ]
    );
    readdefaultmail = readdefaultmail.length;
    console.log("1");
    var totalto = yield this._records.$aggregate(
      [
        { $unwind : "$mails"},
        {$match: {"mails.fromId":2}}
      ]
    );
    totalto = totalto.length;
    console.log("2",totalto);
    var totalfrom = yield this._records.$aggregate(
      [
        { $unwind : "$mails"},
        {$match: {"mails.fromId":{$ne:2}}}
      ]
    );
    totalfrom = totalfrom.length;
    console.log("3",totalfrom);

    var registercount = 7164;
    var result = {};
    result.mailRead = (readcount-readdefaultmail)/(unreadcount+readcount-defaultmail);
    result.secendMail = secendmailcount/totalmailcount;
    result.mailRate = totalmailcount/registercount;
    result.totalFrom = totalfrom;
    result.totalTo = totalto;
    result.totalUser = registercount;
    return Indicator.fromMongo(result);
  }
}