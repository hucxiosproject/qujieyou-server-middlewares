import mongodb from "mongodb";
var ObjectID = mongodb.ObjectID;
import rabbit from "rabbit.js";
import co from "co";

export class Story {

  constructor(id, userId, mailboxId, title, brief, content, thumbnailId, published, deleted) {
    if (id)
      this._id = String(id);
    this.userId = userId;
    if (mailboxId) this.mailboxId = String(mailboxId);
    this.title = title;
    this.brief = brief;
    this.thumbnailId = thumbnailId;
    this.content = content;

    this.deleted = deleted;
    if (!deleted) this.deleted = false;

    this.published = published;
    if (!published) this.published = false;

    this.content = content;
    this.htmlIds = [];
    this.tags = [];
    this.comments = [];

    this.pushed = false;	// push to notify that we have updated
    this.readCount = 0;
    this.priority = 0;
    this.followedCount = 0;
  }

  static fromMongo(doc) {
    var story = new Story(doc._id, doc.userId, doc.mailboxId, doc.title, doc.brief, doc.content, doc.thumbnailId, doc.published, doc.deleted);
    story.comments = [];
    if (!doc.comments) doc.comments = [];
    for (var commentdoc of doc.comments) {
      var comment = StoryComment.fromMongo(commentdoc);
      story.comments.push(comment);
    }

    story.tags = doc.tags;
    story.htmlIds = doc.htmlIds;
    story.lastModified = doc.lastModified;
    story.pushed = doc.pushed;
    story.followedCount = doc.followedCount;
    story.readCount = doc.readCount;
    story.priority = doc.priority;

    story.attachUser = doc.attachUser;
    story.attachCsr = doc.attachCsr;
    story.template = doc.template;
    story.mailId = doc.mailId;
    return story;
  }

  toMongo() {
    var story = {};
    if (this.userId) story.userId = parseInt(this.userId);
    if (this.mailboxId) story.mailboxId = ObjectID(String(this.mailboxId));
    if (this.mailId) story.mailId = ObjectID(String(this.mailId));
    story.title = this.title;
    story.brief = this.brief;
    story.content = this.content;
    story.published = this.published;
    story.deleted = this.deleted;
    story.pushed = this.pushed ? true : false;
    story.thumbnailId = this.thumbnailId;
    story.followedCount = this.followedCount;
    story.tags = this.tags;
    story.htmlIds = this.htmlIds;
    story.comments = this.comments;
    story.readCount = this.readCount;
    story.priority = this.priority;
    story.lastModified = new Date().getTime();
    if (this.attachUser) story.attachUser = this.attachUser;
    if (this.attachCsr) story.attachCsr = this.attachCsr;
    if (this.template) story.template = this.template;
    return story;
  }

  toClient() {
    var story = {};
    story._id = this._id;
    story.userId = this.userId;
    if (this.mailboxId) story.mailboxId = this.mailboxId;
    if (this.mailId) story.mailId = this.mailId;
    story.title = this.title;
    story.brief = this.brief;
    // story.content = this.content;
    story.thumbnailId = this.thumbnailId;
    story.htmlIds = this.htmlIds;
    if (story.htmlIds && story.htmlIds.length) {
      story.htmlId = story.htmlIds[story.htmlIds.length - 1];
    } else {
      story.htmlId = "";
    }

    story.comments = [];
    for (var comment of this.comments) {
      story.comments.push(comment.toClient());
    }

    story.createDate = ObjectID(String(this._id)).getTimestamp().getTime();
    story.lastModified = this.lastModified;
    story.readCount = this.readCount;
    story.followed = false;
    return story;
  }

  toAdmin() {
    var story = {};
    story._id = this._id;
    story.userId = this.userId;
    if (this.mailboxId)
      story.mailboxId = ObjectID(String(this.mailboxId));
    if (this.mailId)
      story.mailId = ObjectID(String(this.mailId));
    story.title = this.title;
    story.brief = this.brief;
    story.content = this.content;
    story.thumbnailId = this.thumbnailId;
    story.htmlIds = this.htmlIds;
    story.published = this.published ? true : false;
    story.deleted = this.deleted;
    story.priority = this.priority ? this.priority : 0;
    story.tags = this.tags;

    story.comments = [];
    if (!this.comments) this.comments = [];
    for (var comment of this.comments) {
      story.comments.push(comment.toClient());
    }

    if (story.htmlIds && story.htmlIds.length) {
      story.htmlId = story.htmlIds[story.htmlIds.length - 1];
    } else {
      story.htmlId = "";
    }

    story.followedCount = this.followedCount;
    story.pushed = !!this.pushed;
    story.handled = true;
    story.updated = this.update ? true : false;
    story.followed = this.followed;
    if (!story.followed)
      story.followed = false;

    story.attachUser = this.attachUser;
    story.attachCsr = this.attachCsr;
    story.template = this.template;

    story.createDate = ObjectID(String(this._id)).getTimestamp().getTime();
    story.lastModified = this.lastModified;
    story.readCount = this.readCount;
    return story;
  }
}

export class StoryComment {

  constructor(id, user, content, htmlId, storyId, isRecommended) {
    if (id)
      this._id = String(id);
    this.user = user;
    this.content = content;
    this.htmlId = String(htmlId);
    this.storyId = storyId;
    this.deleted = false;
    if(isRecommended != null && isRecommended != undefined){
      this.isRecommended = isRecommended;
    }
  }

  static fromMongo(doc) {
    var comment = new StoryComment(doc._id, doc.user, doc.content, doc.htmlId, null,doc.isRecommended);
    comment.deleted = doc.deleted;
    comment.lastModified = doc.lastModified;
    comment.credit = doc.credit;
    if (doc.storyId) comment.storyId = String(doc.storyId);
    return comment;
  }

  static toMongo(comment) {
    var doc = {};
    //doc._id = ObjectID(String(comment._id));
    doc.user = comment.user;
    doc.content = comment.content;
    if (comment.storyId) doc.storyId = ObjectID(String(comment.storyId));
    doc.htmlId = ObjectID(String(comment.htmlId));
    doc.deleted = comment.deleted;
    doc.isRecommended = comment.isRecommended;
    doc.lastModified = new Date().getTime();
    doc.accepted = false;
    doc.credit = {};
    return doc;
  }

  toMongo() {
    return StoryComment.toMongo(this);
  }

  static toClient(comment) {
    var clientComment = {};
    clientComment._id = comment._id;
    clientComment.user = comment.user;
    clientComment.content = comment.content;
    clientComment.storyId = comment.storyId;
    clientComment.htmlId = String(comment.htmlId);
    clientComment.deleted = comment.deleted;
    clientComment.accepted = comment.accepted;
    clientComment.credit = comment.credit;
    clientComment.isRecommended = comment.isRecommended;
    clientComment.createDate = ObjectID(String(comment._id)).getTimestamp().getTime();
    return clientComment;
  }

  toClient() {
    return StoryComment.toClient(this);
  }
}

export class StoryDAO {
  static _storysPub;
  static _storys;
  static _storyComments;
  static _userSub;
  static _log;

  static * init(mongo, rabbitUrl, log) {
    if (!this._storys) {
      this._storys = mongo.collection("storys");
      yield this._storys.$ensureIndex({'userId': 1, 'priority': -1});
      this._log = log;
      this._log.info("story index ensured!");
    }
    if (!this._storyComments) {
      this._storyComments = mongo.collection("storyComments");
      yield this._storyComments.$ensureIndex({'user._id': 1, 'storyId': -1});
      this._log = log;
      this._log.info("story comments index ensured!");
    }
    if(rabbitUrl){
      if (!this._storysPub) {
        var context = rabbit.createContext(rabbitUrl);
        this._storysPub = context.socket('PUB');
        this._storysPub.connect('story', () => {
          this._log.info("story publisher inited");
        });
      }
      if (!this._userSub) {
        this._userSub = context.socket('SUB');
        this._userSub.connect('user', 'model.update', function () {
          this._userSub.setEncoding('utf8');
          this._log.info('user history subscriber inited');
          this._userSub.on('data', function (user) {
            co(function *() {
              try {
                var originUser = JSON.parse(user);
                var newUser = {
                  _id: parseInt(originUser.id),
                  nickName: originUser.nickName,
                  avatar: originUser.avatar,
                  userType: originUser.userType,
                  guestId: originUser.guestId,
                  platform: originUser.platform,
                  phoneType: originUser.phoneType,
                  message: originUser.message
                };
                yield StoryDAO.updateUserInfo(newUser);
              } catch (err) {
                this._log.error(err);
              }
            }.bind(this));
          }.bind(this));
        }.bind(this));
      }
    }
  }

  // push draft to mq
  static _pushStoryAfterChanged(id) {
    this._storys.findOne({'_id': ObjectID(String(id))}, (err, doc) => {
      if (err) {
        this._log.error("error when get story, story id is " + id + ",err is " + err);
        return;
      }
      this._storysPub.publish('model.insert', JSON.stringify(doc));
    });
  }

  static * insert(story) {

    var comments = story.comments.slice();
    story.comments = [];
    var result = yield this._storys.$insert(story.toMongo());
    var storyId = ObjectID(String(result[0]._id));
    for (var comment of comments) {
      comment.storyId = storyId;
    }

    this._pushStoryAfterChanged(result[0]._id);
    return result[0]._id;
  }

  static * updateProperty(id, property) {
    var update = {};
    if (property.mailId != undefined && property.mailId != null)
      update.mailId = property.mailId;
    if (property.mailboxId != undefined && property.mailboxId != null)
      update.mailboxId = property.mailboxId;
    if (property.deleted != undefined && property.deleted != null)
      update.deleted = property.deleted;
    if (property.published != undefined && property.published != null)
      update.published = property.published;
    if (property.pushed != undefined && property.pushed != null)
      update.pushed = property.pushed;
    if (property.followedCount != undefined && property.followedCount != null)
      update.followedCount = property.followedCount;
    if (property.tags) {
      update.tags = property.tags;
    }
    if (property.type) {
      update.type = property.type;
    }
    if (property.storyId) {
      update.storyId = ObjectID(String(property.storyId));
    }
    if (property.shitId) {
      update.shitId = ObjectID(String(property.shitId));
    }
    if (property.htmlIds) {
      update.htmlIds = property.htmlIds;
    }
    if (property.content) {
      update.content = property.content;
    }
    if (property.thumbnailId) {
      update.thumbnailId = property.thumbnailId;
    }
    if (property.brief) {
      update.brief = property.brief;
    }
    if (property.title) {
      update.title = property.title;
    }

    if (property.priority != undefined && property.priority != null)
      update.priority = property.priority;

    if (property.attachUser) {
      update.attachUser = property.attachUser;
    }
    if (property.attachCsr) {
      update.attachCsr = property.attachCsr;
    }
    if (property.template) {
      update.template = property.template;
    }

    update.lastModified = new Date().getTime();
    var result = yield this._storys.$update({'_id': ObjectID(String(id))}, {$set: update});
    if (result && result[1].ok) {
      this._pushStoryAfterChanged(id);
      return true;
    }
    return result;
  }

  static * get(id) {
    var doc = yield this._storys.$findOne({'_id': ObjectID(String(id))});
    if (!doc){
      return null;
    }else{
      doc.comments = yield this.getCommentByStoryId(id);
      return Story.fromMongo(doc);
    }
  }

  static * incReadCount(id, inc) {
    var result = yield this._storys.$update({'_id': ObjectID(String(id))}, {$inc: {'readCount': inc}});
    if (result && result[1].ok)
      return true;
    return result;
  }

  static * getList(userId, deleted, published, skip, limit, sortFields) {
    var query = {};
    if (userId) query.userId = userId;
    if (deleted != undefined && deleted != null) query.deleted = deleted;
    if (published != undefined && published != null) query.published = published;

    var sortField = {};
    if (sortFields) {
      for (var key in sortFields) {
        var value = sortFields[key];
        sortField[value] = -1;
      }
    }
    sortField._id = -1;

    var docs;
    if (isNaN(limit) || isNaN(skip)) {
      docs = yield this._storys.find(query, {sort: sortField}).$toArray();
    } else {
      docs = yield this._storys.find(query, {sort: sortField}).skip(skip).limit(limit).$toArray();
    }

    if (!docs)
      docs = [];
    yield this._fillCommentToStory(docs);
    return [for (doc of docs) Story.fromMongo(doc)];
  }

  static * getCount(userId, deleted, published) {
    var query = {};
    if (userId) query.userId = userId;
    if (deleted != undefined && deleted != null) query.deleted = deleted;
    if (published != undefined && published != null) query.published = published;
    var count = yield this._storys.find(query).$count();
    return count;
  }

  static * getStorysByIds(Ids) {
    var docs = yield this._storys.find({'_id': {$in: Ids}}).$toArray();
    if (!docs)
      docs = [];
    yield this._fillCommentToStory(docs);
    return [for (doc of docs) Story.fromMongo(doc)];
  }

  static * _fillCommentToStory(storydocs) {
    var storyIdMap = new Map();
    var storyIds = [];
    for (var storydoc of storydocs) {
      storyIds.push(storydoc._id);
      storyIdMap.set(String(storydoc._id), storydoc);
    }

    var commentdocs = yield this.getByStoryIds(storyIds);
    for (var comment of commentdocs) {
      var storyId = String(comment.storyId);
      if (storyIdMap.has(storyId)) {
        var story = storyIdMap.get(storyId);
        if (!story.comments) story.comments = [];
        story.comments.push(comment);
      }
    }
  }

  /////////////////////////////////
  // method for comments
  /////////////////////////////////

  static * insertComment(comment) {
    var result = yield this._storyComments.$insert(StoryComment.toMongo(comment));
    return result[0]._id;
  }

  static * insertComments(comments) {
    if (!comments || comments.length == 0) return true;
    var insertedComments = [for (comment of comments) StoryComment.toMongo(comment)];
    var result = yield this._storyComments.$insert(insertedComments);
    return true;
  }

  static * getComment(id) {
    var comentId;
    try {
      comentId = ObjectID(String(id));
    } catch (err) {
      throw {status: 501, message: "comment id error, id is " + id};
    }
    var result = yield this._storyComments.$findOne({'_id': comentId});
    if (!result)
      return null;
    return StoryComment.fromMongo(result);
  }

  static * getCommentByStoryId(storyId) {
    var objstoryId;
    try {
      objstoryId = ObjectID(String(storyId));
    } catch (err) {
      throw {status: 501, message: "story id error, id is " + storyId};
    }
    var docs = yield this._storyComments.find({"storyId": objstoryId}).$toArray();
    if (!docs)
      docs = [];
    return docs;
  }

  static * getByStoryIds(ids) {
    var objstoryIds = [];
    try {
      for (var id of ids) {
        objstoryIds.push(ObjectID(String(id)));
      }
    } catch (err) {
      throw {status: 501, message: "story id error, id is " + storyId};
    }
    var docs = yield this._storyComments.find({"storyId": {$in: objstoryIds}}).$toArray();
    if (!docs)
      docs = [];
    return docs;
  }

  static * delComment(id) {
    var comentId;
    try {
      comentId = ObjectID(String(id));
    } catch (err) {
      throw {status: 501, message: "comment id error, id is " + id};
    }
    var result = yield this._storyComments.$update({'_id': comentId}, {$set: {'deleted': true}});
    return true;
  }

  static * updateComment(id, accepted, credit,isRecommended) {
    var comentId;
    try {
      comentId = ObjectID(String(id));
    } catch (err) {
      throw {status: 501, message: "comment id error, id is " + id};
    }
    var update = {};
    if(accepted !== undefined && accepted !== null){
      update.accepted = accepted;
    }
    if(credit){
      update.credit = credit;
    }
    if(isRecommended !== undefined && isRecommended !== null){
      update.isRecommended = isRecommended;
    }
    console.log(update);
    yield this._storyComments.$update({'_id': comentId}, {$set: update});
    return true;
  }

  static * updateUserInfo(user) {
    var update = {
      user: user
    };
    var result = yield this._storyComments.$update({'user._id': user._id}, {$set: update}, {multi: true});
  }

  static * getComments(userId, storyId, deleted, skip, limit) {
    var query = {};
    if (userId != null && userId != undefined)
      query.userId = userId;
    if (deleted != null && deleted != undefined)
      query.deleted = Boolean(deleted);
    if (storyId != null && storyId != undefined)
      query.storyId = ObjectID(String(storyId));

    var sortField = {};
    sortField._id = -1;

    var docs;
    if (isNaN(limit) || isNaN(skip)) {
      docs = yield this._storyComments.find(query, {sort: sortField}).$toArray();
    } else {
      docs = yield this._storyComments.find(query, {sort: sortField}).skip(skip).limit(limit).$toArray();
    }

    if (!docs)
      docs = [];
    return [for (doc of docs) StoryComment.fromMongo(doc)];
  }

  static * getCommentsCount(userId, storyId, deleted) {
    var query = {};
    if (userId != null && userId != undefined)
      query.userId = userId;
    if (deleted != null && deleted != undefined)
      query.deleted = Boolean(deleted);
    if (storyId != null && storyId != undefined)
      query.storyId = ObjectID(String(storyId));

    var count = yield this._storyComments.find(query).$count();
    return count;
  }

  /////////////////////////////////
  // method for async
  /////////////////////////////////

  static getStoryByCommentUserIdAsync(userId, next) {
    var query = {
      'comments': {$elemMatch: {'user._id': userId}}
    };
    var sortField = {};
    sortField._id = -1;

    this._storys.find(query, {sort: sortField}).toArray((err, docs) => {
      if (err) return next(err, null);
      if (!docs) docs = [];
      return next(null, docs);
    });
  }

  static * getStoryByCommentUserId(userId, skip, limit) {
    var query = {};
    if (userId) {
      query.comments = {$elemMatch: {'user._id': userId}};
    }
    var sortField = {};
    sortField._id = -1;

    var docs = yield this._storys.find(query, {sort: sortField}).$toArray();
    if (!docs) docs = [];
    return [for (doc of docs) Story.fromMongo(doc)];
  }
}