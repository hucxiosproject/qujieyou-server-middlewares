
import {Mailbox, Mail, MailboxDAO} from "../models/mailbox.model";
import {FollowStory, FollowStoryDAO} from "../models/followstory.model";
import {Story, StoryMail, StoryDAO} from "../models/story.model";
import {StringUtil} from "./string.util";
import rabbit from "rabbit.js";

export class StatisticsUtil {
  static _statisticsPub;
  static _log;

  static * init(rabbitUrl, log) {
    this._log = log;
    if (!this._statisticsPub) {
      var context = rabbit.createContext(rabbitUrl);
      this._statisticsPub = context.socket('PUB');
      this._statisticsPub.connect('statistics', () => {
        this._log.info("statistics publisher inited");
      });
    }
  }

  static syncMailboxCount(userId) {
    MailboxDAO.getMailboxsAsync(userId, false, (err, docs) => {
      if (!err) {
        try {
          var mailboxCount = 0;
          var mailCount = 0;
          var wordCount = 0;
          for (var doc of docs) {
            mailboxCount++;
            for (var mail of doc.mails) {
              if (String(mail.fromId) == String(userId)) {
                mailCount++;
                var str = StringUtil.removeHtmlTag(mail.content);
                wordCount += parseInt(str.length / 2);
              }
            }
          }
          var data = {
            userId: userId,
            mailboxCount: mailboxCount,
            mailCount: mailCount,
            wordCount: wordCount
          };
          this._statisticsPub.publish('user', JSON.stringify(data));
        } catch (err) {
          this._log.error(err)
        }
      } else {
        this._log.error(err);
      }
    });
  }

  static syncFollowCount(userId) {
    FollowStoryDAO.getFollowCountAsync(userId, null, false, (err, count) => {
      if (err) return this._log.error(err);
      try {
        var data = {
          userId: userId,
          followCount: count
        };
        this._statisticsPub.publish('user', JSON.stringify(data));
      } catch (err) {
        this._log.error(err);
      }
    });
  }

  static syncCommentCount(userId) {
    StoryDAO.getStoryByCommentUserIdAsync(userId, (err, docs) => {
      if (err) return this._log.error(err);
      try {
        var commentCount = 0;
        for (var doc of docs) {
          if (doc.mails) {
            for (var mail of doc.mails) {
              for (var comment of mail.comments) {
                if (String(comment.userId) == String(userId) && !comment.deleted) {
                  commentCount++;
                }
              }
            }
          }
        }
        var data = {
          userId: userId,
          commentCount: commentCount
        };
        this._statisticsPub.publish('user', JSON.stringify(data));
      } catch (err) {
        this._log.error(err);
      }
    });
  }
}