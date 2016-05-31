import mongodb from "mongodb";
var ObjectID = mongodb.ObjectID;
import rabbit from "rabbit.js";

export class FollowStory {

	constructor(id, userId, storyId, updated, handled, deleted) {
		if (id)
			this._id = String(id);
		this.userId = userId;
		this.storyId = String(storyId);
		this.updated = updated;
		this.handled = handled;
		this.deleted = deleted;
		this.published = true;
	}

	static fromMongo(doc) {
		var follow = new FollowStory(doc._id, doc.userId, doc.storyId, doc.updated, doc.handled, doc.deleted);
		follow.lastModified = doc.lastModified;
		follow.published = doc.published;
		return follow;
	}

	toMongo() {
		var follow = {};
		follow.userId = this.userId;
		follow.storyId = ObjectID(String(this.storyId));
		follow.updated = this.updated;
		follow.handled = this.handled;
		follow.deleted = this.deleted;
		follow.published = this.published;
		follow.lastModified = new Date().getTime();
		return follow;
	}

	toClient() {
		var follow = {};
		follow._id = this._id;
		follow.userId = this.userId;
		follow.storyId = this.storyId;
		follow.updated = this.updated;
		follow.handled = this.handled;
		follow.deleted = this.deleted;
		follow.createDate = ObjectID(String(this._id)).getTimestamp().getTime();
		follow.lastModified = this.lastModified;
		return follow;
	}
}

export class FollowStoryDAO {
	static _followStorysPub;
	static _followStorys;
	static _log;

	static * init(mongo, rabbitUrl, log) {
		if (!this._followStorys) {
			this._followStorys = mongo.collection("followstorys");
			yield this._followStorys.$ensureIndex({'_id': -1, 'userId': 1, 'storyId': 1, 'lastModified': 1});
			this._log = log;
			this._log.info("follow story index ensured!");
		}
		if (!this._followStorysPub) {
			var context = rabbit.createContext(rabbitUrl);
			this._followStorysPub = context.socket('PUB');
			this._followStorysPub.connect('followstory', () => {
				this._log.info("followstory publisher inited");
			});
		}
	}

	// push draft to mq
	static _pushFollowstoryAfterChanged(id) {
		this._followStorys.findOne({'_id': ObjectID(String(id))}, (err, doc) => {
			this._followStorysPub.publish('model.insert', JSON.stringify(doc));
		});
	}

	static * insert(followStory) {
		var result = yield this._followStorys.$insert(followStory.toMongo());
		followStory._id = result[0]._id;
		this._pushFollowstoryAfterChanged(followStory._id);
		return result[0]._id;
	}

	static * updateProperty(id, property) {
		var update = {};
		if (property.updated != undefined && property.updated != null)
			update.updated = property.updated;
		if (property.handled != undefined && property.handled != null)
			update.handled = property.handled;
		if (property.deleted != undefined && property.deleted != null)
			update.deleted = property.deleted;

		update.lastModified = new Date().getTime();
		var result = yield this._followStorys.$update({'_id': ObjectID(String(id))}, {$set: update});
		this._pushFollowstoryAfterChanged(id);
		return result;
	}

	static * updateByStory(storyId, property) {
		var update = {};
		if (property.updated != undefined && property.updated != null)
			update.updated = property.updated;
		if (property.handled != undefined && property.handled != null)
			update.handled = property.handled;
		if (property.published != undefined && property.published != null)
			update.published = property.published;
		// update.updated = true;
		// update.handled = false;
		update.lastModified = new Date().getTime();
		var result = yield this._followStorys.$update({'storyId': ObjectID(String(storyId)), 'deleted': false}, {$set: update}, {multi: true});
		if (result && result[1].ok) {
			this._pushFollowstoryAfterChanged(storyId);
			return true;
		}
		return result;
	}

	static * get(id) {
		var doc = yield this._followStorys.$findOne({'_id': ObjectID(String(id))});
		if (!doc)
			throw { statusCode:'501', message: "cannot find follow" };
		var follow = FollowStory.fromMongo(doc);
		return follow;
	}

	static * getByUserNStory(userId, storyId) {
		var doc = yield this._followStorys.$findOne({'storyId': ObjectID(String(storyId)), 'userId': userId});
		if (!doc)
			return null;
		var follow = FollowStory.fromMongo(doc);
		return follow;
	}

	static * getByStoryId(storyId) {
		var docs = yield this._followStorys.find({'storyId': ObjectID(String(storyId)), 'deleted': false}).$toArray();
		if (!docs)
			docs = [];
		return [for (doc of docs) FollowStory.fromMongo(doc)];
	}

	static getByStoryIdAsync(storyId, next) {
		this._followStorys.find({'storyId': ObjectID(String(storyId)), 'deleted': false}).toArray((err, docs) => {
			if (err) return next(err, null);
			if (!docs) docs = [];
			return next(null, [for (doc of docs) FollowStory.fromMongo(doc)]);
		});
	}

	static * getCountByStoryId(storyId) {
		var count = yield this._followStorys.find({'storyId': ObjectID(String(storyId)), 'deleted': false}).$count();
		return count;
	}

	static * getByStoryIds(userId, storyIds) {
		var docs = yield this._followStorys.find({$and:[ {'userId': userId}, {'storyId': {$in: storyIds}} ]}).$toArray();
		if (!docs)
			docs = [];
		return [for (doc of docs) FollowStory.fromMongo(doc)];
	}

	static * getList(userId, storyId, updated, handled, deleted, published, sortField, skip, limit) {
		var query = {};
		if (userId) query.userId = userId;
		if (storyId) {
			try {
				query.storyId = ObjectID(String(storyId));
			} catch (err) {
				throw { status: 501, message: "story id error, story id is " + storyId};
			}
		}
		if (updated != undefined && updated != null) query.updated = updated;
		if (handled != undefined && handled != null) query.handled = handled;
		if (deleted != undefined && deleted != null) query.deleted = deleted;
		if (published != undefined && published != null) query.published = published;

		var docs;
		if (isNaN(limit) || isNaN(skip)) {
			if (sortField)
				docs = yield this._followStorys.find(query, {sort: {sortField: -1}}).$toArray();
			else
				docs = yield this._followStorys.find(query, {sort: {'_id': -1}}).$toArray();
		} else {
			if (sortField)
				docs = yield this._followStorys.find(query, {sort: {sortField: -1}}).skip(skip).limit(limit).$toArray();
			else
				docs = yield this._followStorys.find(query, {sort: {'_id': -1}}).skip(skip).limit(limit).$toArray();
		}
		if (!docs)
			docs = [];
		return [for (doc of docs) FollowStory.fromMongo(doc)];
	}

	static * getCount(userId, storyId, updated, handled, deleted) {
		var query = {};
		if (userId) query.userId = userId;
		if (storyId) {
			try {
				query.storyId = ObjectID(String(storyId));
			} catch (err) {
				throw { status: 501, message: "story id error, story id is " + storyId};
			}
		}
		if (updated != undefined && updated != null) query.updated = updated;
		if (handled != undefined && handled != null) query.handled = handled;
		if (deleted != undefined && deleted != null) query.deleted = deleted;
		var count = yield this._followStorys.find(query).$count();
		return count;
	}


	/////////////////////////////////
	// method for async
	/////////////////////////////////

	static getFollowCountAsync(userId, handled, deleted, next) {
		var query = {};
		if (userId) query.userId = userId;
		if (handled != undefined && handled != null) query.handled = handled;
		if (deleted != undefined && deleted != null) query.deleted = deleted;

		this._followStorys.find(query).count((err, docs) => {
			if (err) return next(err, null);
			return next(null, docs);
		});
	}
}