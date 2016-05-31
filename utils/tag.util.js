import cofyrequest from "cofy-request";
import {ErrorUtil} from "../utils/error.util.js";
export class TagUtil {
	static init(log) {
		this._log = log;
	}

	static * getTagListByCaseId(token,caseId){
		var url = "http://" + process.env.BJJ_TAG_SERVER + "/session/tagrecords?token=" + token + "&caseId=" + caseId + "&type=2";
		var res = yield cofyrequest.$get({
			url: url,
			method: 'GET'
		});
		if (res[0].statusCode == 200) {
			return JSON.parse(res[0].body);
		} else {
			ErrorUtil.throwError(500,"get tagList by caseId fail");
		}
	}

	static * getTagsByMailboxIds(token, ids) {
		var url = "http://" + process.env.BJJ_TAG_SERVER + "/session/tagrecords/ids";
		var param = {
			token: token,
			type: 2,
			ids: ids
		};

		var res = yield cofyrequest.$post({
      url: url,
      method: 'POST',
      headers: { 'Content-Type': "application/json;charset=UTF-8" },
      body: JSON.stringify(param)
    });
    if (res[0].statusCode != 200) {
    	this._log.error("error when get tags from tag server by mailbox ids, url is " + url + ", body is " + JSON.stringify(param) + ", result is " + res[0].body);
			ErrorUtil.throwError(500,"error when get tags from tag server by mailbox ids");
    	return [];
    } else {
    	return JSON.parse(res[0].body);
    }
	}
	static * getTagsByUserIds(token, ids) {
		var url = "http://" + process.env.BJJ_TAG_SERVER + "/session/tagrecords/ids";

		var param = {
			token: token,
			type: 1,
			ids: ids
		};

		var res = yield cofyrequest.$post({
			url: url,
			method: 'POST',
			headers: { 'Content-Type': "application/json;charset=UTF-8" },
			body: JSON.stringify(param)
		});
		if (res[0].statusCode != 200) {
			this._log.error("error when get tags from tag server by user ids, url is " + url + ", body is " + JSON.stringify(param) + ", result is " + res[0].body);
			ErrorUtil.throwError(500,"error when get tags from tag server by user ids");
		} else {
      return JSON.parse(res[0].body);
		}
	}
}