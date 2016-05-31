import mongodb from "mongodb";
var ObjectID = mongodb.ObjectID;
import rabbit from "rabbit.js";

export class Shit{

	constructor(id, userId, mailboxId, content, published, deleted) {
		if (id)
			this._id = id;
		this.userId = userId;
		this.mailboxId = mailboxId;
		this.content = content;
		this.published = published;
		this.deleted = deleted;
		if (!deleted)
			this.deleted = false;
		if (!published)
			this.published = false;

		this.readCount = 0;
		this.htmlIds = [];
	}

	static fromMongo(doc) {
		var shit = new Shit(doc._id, doc.userId, doc.mailboxId, doc.content, doc.published, doc.deleted);
		shit.lastModified = doc.lastModified;
		shit.readCount = doc.readCount;
		shit.htmlIds = doc.htmlIds;
		return shit;
	}

	toMongo() {
		var shit = {};
		if (this.userId) shit.userId = this.userId;
		if (this.mailboxId) shit.mailboxId = ObjectID(String(this.mailboxId));
		shit.deleted = this.deleted;
		shit.content = this.content;
		shit.published = this.published;
		shit.lastModified = new Date().getTime();
		shit.readCount = this.readCount;
		shit.htmlIds = this.htmlIds;
		return shit;
	}

	toClient() {
		var shit = {};
		shit._id = this._id;
		shit.userId = this.userId;
		shit.mailboxId = this.mailboxId;
		shit.content = this.content;
		shit.published = this.published;
		shit.htmlIds = this.htmlIds;
		if (shit.htmlIds && shit.htmlIds.length) {
			shit.htmlId = shit.htmlIds[shit.htmlIds.length - 1];
		} else {
			shit.htmlId = "";
		}
		shit.createDate = ObjectID(String(this._id)).getTimestamp().getTime();
		shit.lastModified = this.lastModified;

		shit.readCount = this.readCount;
		return shit;
	}
}

export class ShitDAO {
	static _shitsPub;
	static _shits;
	static _log;

	static * init(mongo, rabbitUrl, log) {
		if (!this._shits) {
			this._shits = mongo.collection("shits");
			yield this._shits.$ensureIndex({'_id': -1, 'userId': 1});
			this._log = log;
			this._log.info("shit index ensured!");
		}
		if (!this._shitsPub) {
			var context = rabbit.createContext(rabbitUrl);
			this._shitsPub = context.socket('PUB');
			this._shitsPub.connect('shit', () => {
				this._log.info("shit publisher inited");
			});
		}
	}

	// push draft to mq
	static _pushShitAfterChanged(id) {
		this._shits.findOne({'_id': ObjectID(String(id))}, (err, doc) => {
			if (err) {
				this._log.error("error when get shit, shit id is " + id + ", err is " + err);
				return;
			}
			this._shitsPub.publish('model.insert', JSON.stringify(doc));
		});
	}

	static * insert(shit) {
		var result = yield this._shits.$insert(shit.toMongo());
		this._pushShitAfterChanged(result[0]._id);
		return result[0]._id;
	}

	static * updateProperty(id, property) {
		var update = {};
		if (property.deleted != undefined && property.deleted != null) {
			update.deleted = property.deleted;
		}
		if (property.htmlIds)
			update.htmlIds = property.htmlIds;
		if (property.content != undefined && property.content != null) {
			update.content = property.content;
		}
		if (property.published != undefined && property.published != null) {
			update.published = property.published;
		}
		
		update.lastModified = new Date().getTime();
		var result = yield this._shits.$update({'_id': ObjectID(String(id))}, {$set: update});
		if (result && result[1].ok) {
			this._pushShitAfterChanged(id);
			return true;
		}
		return result;
	}

	static * get(id) {
		var doc = yield this._shits.$findOne({'_id': ObjectID(String(id))});
		if (!doc)
			throw { status: 501, message: "cannot find shit" };
		var shit = Shit.fromMongo(doc);
		return shit;
	}

	static * incReadCount(id, inc) {
		var result = yield this._storys.$update({'_id': ObjectID(String(id))}, {$inc: {'readCount': inc}});
		if (result && result[1].ok)
			return true;
		return result;
	}

	static * getList(userId, deleted, published, skip, limit) {
		var query = {};
		if (userId) query.userId = userId;
		if (deleted != undefined && deleted != null) query.deleted = deleted;
		if (published != undefined && published != null) query.published = published;

		var docs;
		if (isNaN(limit) || isNaN(skip)) {
			docs = yield this._shits.find(query, {sort: {'_id': -1}}).$toArray();
		} else {
			docs = yield this._shits.find(query, {sort: {'_id': -1}}).skip(skip).limit(limit).$toArray();
		}

		if (!docs)
			docs = [];
		return [for (doc of docs) Shit.fromMongo(doc)];
	}

	static * getCount(userId, deleted) {
		var query = {};
		if (userId) query.userId = userId;
		if (deleted != undefined && deleted != null) query.deleted = deleted;
		var count = yield this._shits.find(query).$count();
		return count;
	}
}