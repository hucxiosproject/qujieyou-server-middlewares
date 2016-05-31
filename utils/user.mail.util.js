/**
 * Created by lvshun on 16/3/10.
 */

import {Mail,MailDAO} from "../models/mail.model.js";
import {UserMail,UserMailDAO} from "../models/user.mail.model.js";
import {StringUtil} from "../utils/string.util.js";
import mongodb from "mongodb";
var ObjectID = mongodb.ObjectID;

export class UserMailUtil {
  static _log;

  static init(log) {
    this._log = log;
  }

  static * fromatUserMailListToClient(userMailList){
    if(!userMailList){
      return [];
    }else{
      if(userMailList.length>0){
        var result = [];
        for(var i=0;i<userMailList.length;i++){
          var mail = userMailList[i].toClient();
          result.push(mail);
        }
        return result;
      }else{
        return [];
      }
    }
  }

  static * upsertUserMailFromUserMailList(userId){
    userId = parseInt(userId);
    console.log(userId);
    var mailList = yield MailDAO.getList({'user._id':userId,deleted:false,unPublished:false},{'_id':-1},0,9999);
    if(mailList.length == 0){
      this._log.info("mailList 's length ==0");
      return null;
    }
    var userMail = yield UserMailUtil.getUserMailFromMailList(mailList);
    if(userMail){
      var originUserMail = yield UserMailDAO.getUserMailList({'user._id':userId,deleted:false}, {'_id':-1},0,100);
      if(originUserMail.length == 0){
        return yield UserMailDAO.insert(userMail);
      }else if(originUserMail.length > 1){
        yield UserMailDAO.updateByUserId(userId,{deleted:true});
        return yield UserMailDAO.insert(userMail);
      }else{
        yield UserMailDAO.updateByUserId(userId,userMail.toMongo());
        return userMail;
      }
    }else{
      this._log.info("生成userMail失败");
      return null;
    }
  }


  /**
   * 从mailList中提取userMail需要的信息(mailList按照时间倒序排列,不包含deleted的mail)
   * @param mailList
   * @returns {null}
   */
  static * getUserMailFromMailList(mailList) {
    var userMail = null;
    if (mailList == null || mailList == undefined || mailList.length == 0) {

    } else {
      var totalMailCount = 0;
      var totalWordCount = 0;
      var latestUserMailTime = -1;
      var latestAssistantMailTime = -1;

      for (var mail of mailList) {
        totalMailCount++;
        totalWordCount += ( StringUtil.removeHtmlTag(mail.content) ).length;
        if (latestUserMailTime == -1 && mail.fromType == Mail.MAIL_FROM_USER) {
          latestUserMailTime = ObjectID(String(mail._id)).getTimestamp().getTime();
        }
        if (latestAssistantMailTime == -1 && (mail.fromType == Mail.MAIL_FROM_ASSISTANT || mail.fromType == Mail.MAIL_FROM_ADMIN)) {
          latestAssistantMailTime = ObjectID(String(mail._id)).getTimestamp().getTime();
        }
      }
      var user = mailList[0].user;
      var brief = mailList[0].brief;
      if (latestUserMailTime == -1) {
        latestUserMailTime = null;
      }
      if (latestAssistantMailTime == -1) {
        latestAssistantMailTime = null;
      }
      userMail = new UserMail(null,user,brief);
      userMail.character = mailList[0].character;
      userMail.assistant = mailList[0].assistant;
      userMail.handled = mailList[0].handled;
      userMail.noReply = (mailList[0].fromType != Mail.MAIL_FROM_USER);
      userMail.totalMailCount = totalMailCount;
      userMail.totalWordCount = totalWordCount;
      userMail.firstMailTime = ObjectID(String(mailList[mailList.length - 1]._id)).getTimestamp().getTime();
      userMail.latestMailTime = ObjectID(String(mailList[0]._id)).getTimestamp().getTime();
      userMail.latestUserMailTime = latestUserMailTime;
      userMail.latestAssistantMailTime = latestAssistantMailTime;
      userMail.deleted = false;
      userMail.lastModified = new Date().getTime();
    }
  return userMail;
  }
}