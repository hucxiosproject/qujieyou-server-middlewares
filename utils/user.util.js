import cofyrequest from "cofy-request";
import {ErrorUtil} from "../utils/error.util.js";
export class UserUtil {
  static init(log) {
    this._log = log;
  }

  static * getUserInfo(ids) {
    try{
      var url = "http://" + process.env.BJJ_USER_SERVER + "/vocinno/server/user";
      var param = {
        idList: ids,
        token: process.env.SERVER_TOKEN
      };
      var res = yield cofyrequest.$post({
        url: url,
        method: 'POST',
        headers: {'Content-Type': "application/json;charset=UTF-8"},
        body: JSON.stringify(param)
      });
      if (res[0].statusCode != 200) {
        this._log.error("error when get user info from user server, url is " + url + ", body is " + JSON.stringify(param) + ", result is " + res[0].body);
        return [];
      } else {
        var userList = JSON.parse(res[0].body);
        if (userList.length == 0) {
          return [];
        } else {
          for (var i = 0; i < userList.length; i++) {
            if (userList[i].id) {
              userList[i]._id = userList[i].id;
            }
            userList[i]._id = parseInt(userList[i]._id);
          }
          return userList;
        }
      }
    }catch (err){
      return [];
    }

  }

  static * getUserListByUserType(userType, skip, limit) {
    var url = "http://" + process.env.BJJ_USER_SERVER + "/vocinno/server/user/type?token=" + process.env.SERVER_TOKEN + "&userType=" + userType + "&skip=" + skip + "&limit=" + limit;
    var res = yield cofyrequest.$get({
      url: url,
      method: 'GET',
      headers: {'Content-Type': "application/json;charset=UTF-8"}
    });
    if (res[0].statusCode != 200) {
      this._log.error("error when get user list from user server, url is " + url);
      ErrorUtil.throwError(500, "error when get user list ");
    } else {
      var userList = JSON.parse(res[0].body);
      if (userList.length == 0) {
        return [];
      } else {
        for (var i = 0; i < userList.length; i++) {
          if (userList[i].id) {
            userList[i]._id = userList[i].id;
          }
          userList[i]._id = parseInt(userList[i]._id);
        }
        return userList;
      }
    }
  }
}