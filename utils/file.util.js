import cofyrequest from "cofy-request";
import request from "request";

export class FileUtil {

  static init(log) {
    this._log = log;
  }

  static * convertAttachmentToVoiceData(attachments) {
    var ids = "";
    try {
      for (var i = 0; i < attachments.length; i++) {
        var attachment = attachments[i];
        if (i != 0)
          ids += ",";
        ids += attachment;
      }
    } catch (err) {
      this._log.error(err);
    }
    var url = "http://" + process.env.FILE_DOMAIN + "/voices/bengjiujie?ids=" + ids;
    var res = yield request.$get({
      url: url,
      method: 'GET',
      headers: {'Content-Type': "application/json;charset=UTF-8"}
    });
    if (res[0].statusCode == 200) {
      var resultBody = JSON.parse(res[0].body);
      // create voice data map
      var voiceMap = new Map();
      for (var voiceData of resultBody) {
        voiceMap.set(String(voiceData._id), voiceData);
      }

      var voiceAttachments = [];
      for (var i = 0; i < attachments.length; i++) {
        var attachment = attachments[i];
        if (voiceMap.has(String(attachment))) {
          var voice = voiceMap.get(String(attachment));
          var duration = 5000;
          var text = "";
          if (voice && voice.duration) duration = parseInt(voice.duration);
          if (voice && voice.text) text = voice.text;

          var voiceAttachment = {};
          voiceAttachment._id = attachment;
          voiceAttachment.duration = duration;
          voiceAttachment.text = text;
          voiceAttachments.push(voiceAttachment);
        }
      }

      return voiceAttachments;
    } else {
      this._log.error("error when get voice data from file server, url is " + url + ", err is " + res[0].body);
      var voiceAttachments = [];
      for (var i = 0; i < attachments.length; i++) {
        var attachment = attachments[i];
        var voiceAttachment = {};
        voiceAttachment._id = attachment;
        voiceAttachment.duration = 5000;
        voiceAttachments.push(voiceAttachment);
      }
      return voiceAttachments;
    }
  }

}