export class StringUtil {

  static substr(str, len, hasDot) {
    if (!str || !len) {
      return '';
    }

    str = str.replace(/<\/?[^>]*>/g, '');
    str = str.replace(/[ | ]*\n/g, '\n');
    str = str.replace(/&nbsp;/ig, '');

    var newLength = 0;
    var newStr = "";
    var chineseRegex = /[^\x00-\xff]/g;
    var singleChar = "";
    var strLength = str.replace(chineseRegex, "**").length;

    for (var i = 0; i < strLength; i++) {
      singleChar = str.charAt(i).toString();
      if (singleChar.match(chineseRegex) != null) {
        newLength += 2;
      } else {
        newLength++;
      }
      if (newLength > len) {
        break;
      }
      newStr += singleChar;
    }

    if (hasDot && strLength > len) {
      newStr += "...";
    }
    return newStr;
  }

  static removeHtmlTag(str) {
    if (!str) {
      return '';
    }

    str = str.replace(/<\/?[^>]*>/g, '');
    str = str.replace(/[ | ]*\n/g, '\n');
    str = str.replace(/&nbsp;/ig, '');
    return str;
  }
}