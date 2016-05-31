import mongodb from "mongodb";
var ObjectID = mongodb.ObjectID;

export class UserActionShitRecord {
	constructor(id, shitId, user, duration) {
		if (id)
			this._id = String(id);
		this.shitId = String(shitId);
		this.user = user;
		this.duration = duration;
	}

	static fromMongo(doc) {
		var analysis = new UserActionShitRecord(doc._id, doc.shitId, doc.user, doc.duration);
		return analysis;
	}

	toMongo() {
		var data = {
			shitId: ObjectID(String(this.shitId)),
			user: this.user,
			duration: this.duration
		};
		return data;
	}

	toClient() {
		var data = {};
		data._id = this._id;
		data.shitId = this.shitId;
		data.user = this.user;
		data.duration = this.duration;
		return data;
	}
} 

export class UserActionShitRecordDAO {

	static * init(mongo, log) {
		if (!this._records) {
			this._records = mongo.collection("useraction_shits");
			yield this._records.$ensureIndex({'user._id': 1, 'shitId': 1});
			this._log = log;
			this._log.info("useraction_shits index ensured!");
		}
	}

	static * insert(record) {
		var result = yield this._records.$insert(record);
		record._id = String(result[0]._id);
		return record;
	}

	static * getList(user, id, skip, limit) {
		var query = {};
		if (id) query.shitId = ObjectID(String(id));
		if (user) query.user = user;

		var docs;
		if (isNaN(limit) || isNaN(skip)) {
			docs = yield this._records.find(query, {sort: {'_id': -1}}).$toArray();
		} else {
			docs = yield this._records.find(query, {sort: {'_id': -1}}).skip(skip).limit(limit).$toArray();
		}
		if (!docs)
			docs = [];
		return [for (doc of docs) UserActionMailboxRecord.fromMongo(doc)];
	}
}