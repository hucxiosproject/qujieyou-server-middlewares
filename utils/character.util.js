/**
 * Created by lvshun on 16/3/9.
 */
import cofyrequest from "cofy-request";
import {ErrorUtil} from "../utils/error.util.js";
export class CharacterUtil {
  static init(log) {
    this._log = log;
  }

  static * getCharacter(characterId) {
    var character;
    var url;
    if (characterId)
      url = "http://" + process.env.BJJ_USER_SERVER + "/vocinno/server/character/" + characterId + "?token=" + process.env.SERVER_TOKEN;
    else {
      url = "http://" + process.env.BJJ_USER_SERVER + "/vocinno/server/character?token=" + process.env.SERVER_TOKEN;
    }
    var res = yield cofyrequest.$get({
      url: url,
      method: 'GET'
    });
    if (res[0].statusCode == 200) {
      character = JSON.parse(res[0].body);
      character._id = character.id;
      character._id = parseInt(character._id);
      character.nickName = character.name;
      return character;
    } else {
      this._log.error("error when get credit info from event server, url is " + url + ", result is " + res[0].body);
      ErrorUtil.throwError(500, "error when get credit info ");
    }
  }
}