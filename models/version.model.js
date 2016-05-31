import mongodb from "mongodb";
var ObjectID = mongodb.ObjectID;

export class Version {


  static init() {

  }

  constructor(id, platform, versionCode, message, size, url) {
    this.platform = platform;
    this.versionCode = versionCode;
    this.message = message;
    this.size = size;
    this.url = url;
  }

  static fromMongo(doc) {
    return new Version(doc._id, doc.platform, doc.versionCode, doc.message, doc.size, doc.url);
  }

  toMongo() {
    return {
      platform: this.platform,
      versionCode: this.versionCode,
      message: this.message,
      size: this.size,
      url: this.url
    };
  }

  toClient() {
    return {
      _id: String(this._id),
      platform: this.platform,
      versionCode: this.versionCode,
      message: this.message,
      size: this.size,
      url: this.url
    };
  }
}

export class VersionDAO {

  static * init(mongo, log) {
    if (!this._records) {
      this._records = mongo.collection("versions");

      this._log = log;
    } else {
      console.log(2);
    }
  }

  static * insert(record) {
    var result = yield this._records.$insert(record);
    record._id = String(result[0]._id);
    return record;
  }

  static * update(record) {
    return yield this._inbox.$update({_id: ObjectID(String(record._id))}, {
      $set: {
        platform: record.platform,
        versionCode: record.versionCode,
        message: record.message,
        size: record.size,
        url: record.url
      }
    });
  }

  static * getByPlatform(platform) {
    var result = yield this._records.$findOne({platform: platform});
    if (result) {
      return Version.fromMongo(result);
    } else {
      return null;
    }
  }

}