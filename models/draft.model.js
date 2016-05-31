import mongodb from "mongodb";
var ObjectID = mongodb.ObjectID;
import rabbit from "rabbit.js";

export class Draft {

	constructor(id, userId, type, content, brief, attachment, deleted, createDate, user) {
		if (id)
			this._id = String(id);
		this.userId = userId;
		this.type = type;
		this.content = content;
		this.brief = brief;
		this.attachment = attachment;
		this.deleted = deleted;
		this.published = false;
		this.user = user;
		this.createDate = new Date().getTime();
		if (createDate) {
			this.createDate = createDate;
		}
		if (!this.attachment)
			this.attachment = [];
	}

	static fromMongo(doc) {
		var draft = new Draft(doc._id, doc.userId, doc.type, doc.content, doc.brief, doc.attachment, doc.deleted, doc.createDate, doc.user);
		draft.lastModified = doc.lastModified;
		draft.published = doc.published;
		draft.user = doc.user;
		return draft;
	}

	toMongo() {
		var draft = {};
		draft.userId = parseInt(this.userId);
		draft.type = this.type;
		draft.content = this.content;
		draft.brief = this.brief;
		draft.attachment = this.attachment;
		draft.deleted = this.deleted;
		draft.published = this.published;
		draft.createDate = this.createDate;
		draft.lastModified = new Date().getTime();
		draft.user = this.user;
		return draft;
	}

	toClient() {
		var draft = {};
		draft._id = this._id;
		draft.userId = this.userId;
		draft.type = this.type;
		draft.content = this.content;
		draft.brief = this.brief;
		draft.attachment = this.attachment;
		if (draft.attachment) {
			for (var i = 0; i < draft.attachment.length; i++) {
				draft.attachment[i].duration = parseInt(draft.attachment[i].duration);
			}
		}
		draft.user = this.user;
		draft.deleted = this.deleted;
		draft.published = this.published;
		draft.createDate = ObjectID(String(this._id)).getTimestamp().getTime();
		draft.lastModified = this.lastModified;
		return draft;
	}

	toAdmin() {
		var draft = {};
		draft._id = this._id;
		draft.userId = this.userId;
		draft.content = this.content;
		draft.brief = this.brief;
		if (this.user) {
			draft.userPhoneType = this.user.phoneType;
			draft.userNickName = this.user.nickName;
		}
		draft.createDate = ObjectID(String(this._id)).getTimestamp().getTime();
		draft.lastModified = this.lastModified;
		return draft;
	}

}

export class DraftDAO {
	static _draftsPub;
	static _drafts;
	static _log;

	static * init(mongo, rabbitUrl, log) {
		if (!this._drafts) {
			this._drafts = mongo.collection("drafts");
			yield this._drafts.$ensureIndex({'userId': 1, '_id': -1, 'lastModified': 1});
			this._log = log;
			this._log.info("draft index ensured!");
		}
		if (!this._draftsPub) {
			var context = rabbit.createContext(rabbitUrl);
			this._draftsPub = context.socket('PUB');
			this._draftsPub.connect('draft', () => {
				this._log.info("draft publisher inited");
			});
		}
	}

	// push draft to mq
	static _pushDraftAfterChanged(id) {
		this._drafts.findOne({'_id': ObjectID(String(id))}, (err, doc) => {
			this._draftsPub.publish('model.insert', JSON.stringify(doc));
		});
	}

	static * insert(draft) {
		var result = yield this._drafts.$insert(draft.toMongo());
		draft._id = String(result[0]._id);
		this._pushDraftAfterChanged(draft._id);
		return draft;
	}

	static * updateProperty(id, property) {
		var draftIdObject = null;
		try {
			draftIdObject = ObjectID(String(id));
		} catch (err) {
			throw {status: 501, message: "draft id error! the id is " + id};
		}
		var update = {};
		if (property.deleted != undefined) {
			update.deleted = property.deleted;
		}
		if (property.published != undefined) {
			update.published = property.published;
		}
		update.lastModified = new Date().getTime();
		var result = yield this._drafts.$update({'_id': draftIdObject}, {$set: update});
		this._pushDraftAfterChanged(id);
		return result;
	}

	static * update(id, draft) {
		var update = draft.toMongo();
		update.lastModified = new Date().getTime();
		var result = yield this._drafts.$update({'_id': ObjectID(String(id))}, {$set: draft.toMongo()});
		this._pushDraftAfterChanged(draft._id);
		return result;
	}

	static * get(id) {
		var primaryKey;
		try {
			primaryKey = ObjectID(String(id));
		} catch (err) {
			throw {status: 501, message: "id error!!! wrong id is " + id};
		}
		var doc = yield this._drafts.$findOne({'_id': primaryKey});
		if (!doc)
			throw {status: 501, message: "cannot find draft"};
		return Draft.fromMongo(doc);
	}

	static * getList(userId, type, deleted, published, skip, limit, sortField) {
		var query = {};
		if (userId) query.userId = userId;
		if (type) query.type = type;
		if (deleted != undefined && deleted != null) query.deleted = deleted;
		if (published != undefined && published != null) query.published = published;

		var sort = {};
		if (sortField) sort[sortField] = -1;
		else sort._id = -1;

		var docs;
		if (isNaN(limit) || isNaN(skip)) {
			docs = yield this._drafts.find(query, {sort: sort}).$toArray();
		} else {
			docs = yield this._drafts.find(query, {sort: sort}).skip(skip).limit(limit).$toArray();
		}
		if (!docs)
			docs = [];
		return [for (doc of docs) Draft.fromMongo(doc)];
	}

	static * getCount(userId, type, deleted) {
		var query = {};
		if (userId) query.userId = userId;
		if (type) query.type = type;
		if (deleted != undefined && deleted != null) query.deleted = deleted;

		return yield this._drafts.find(query).$count();
	}
}