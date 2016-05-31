import mongodb from "mongodb";
var ObjectID = mongodb.ObjectID;

export class UserActionStoryRecord {
	constructor(id, storyId, user, duration) {
		if (id)
			this._id = String(id);
		this.storyId = String(storyId);
		this.user = user;
		this.duration = duration;
	}

	static fromMongo(doc) {
		var analysis = new UserActionStoryRecord(doc._id, doc.storyId, doc.user, doc.duration);
		return analysis;
	}

	toMongo() {
		var data = {
			storyId: ObjectID(String(this.storyId)),
			user: this.user,
			duration: this.duration
		};
		return data;
	}

	toClient() {
		var data = {};
		data._id = this._id;
		data.storyId = this.storyId;
		data.user = this.user;
		data.duration = this.duration;
		return data;
	}
} 

export class UserActionStoryRecordDAO {

	static * init(mongo, log) {
		if (!this._records) {
			this._records = mongo.collection("useraction_storys");
			yield this._records.$ensureIndex({'user._id': 1, 'storyId': 1});
			this._log = log;
			this._log.info("useraction_storys index ensured!");
		}
	}

	static * insert(record) {
		var result = yield this._records.$insert(record);
		record._id = String(result[0]._id);
		return record;
	}

	static * getList(user, id, skip, limit, startDate, endDate) {
		var query = {};
		if (id) query.storyId = ObjectID(String(id));
		if (user) query.user = user;

		if (startDate && endDate && !isNaN(startDate) && !isNaN(endDate)) {
      query.createDate = {'$gte': startDate, '$lte': endDate};
    }
    
		var docs;
		if (!limit || !skip || isNaN(limit) || isNaN(skip)) {
			docs = yield this._records.find(query, {sort: {'_id': -1}}).$toArray();
		} else {
			docs = yield this._records.find(query, {sort: {'_id': -1}}).skip(skip).limit(limit).$toArray();
		}



		if (!docs)
			docs = [];
		return [for (doc of docs) UserActionStoryRecord.fromMongo(doc)];
	}
}