'use strict';

/* globals Promise */
const util = require('util')
;

const _ = {
  'curEnvConfig': null,
  'uidCounters': {},

  'ANSI_CODES': {
    'off': 0,
    'bold': 1,
    'italic': 3,
    'underline': 4,
    'blink': 5,
    'inverse': 7,
    'hidden': 8,
    'black': 30,
    'red': 31,
    'green': 32,
    'yellow': 33,
    'blue': 34,
    'magenta': 35,
    'cyan': 36,
    'white': 37,
    'black_bg': 40,
    'red_bg': 41,
    'green_bg': 42,
    'yellow_bg': 43,
    'blue_bg': 44,
    'magenta_bg': 45,
    'cyan_bg': 46,
    'white_bg': 47
  },

  'borderColor': 'green+bold',
  'border': function (str, color) {
    return _.format(str, color || _.borderColor);
  },

  'repeat': function (s, n) { return new Array(parseInt(n+1, 10)).join(s); },

  'debugBoxBoundary': function (contentSize, spaceAfter, printfn, borderColor) {
    if (spaceAfter !== true) { printfn(''); }
    let line = '+'+ _.repeat('-', contentSize) +'+';
    printfn(_.border(line, borderColor));
    if (spaceAfter === true) { printfn(''); }
  },
  'debugBoxLine': function (msg, cleanMsg, lineSize, alignment, printfn, borderColor) {
    let paddingLeft = '', paddingRight = '';
    if (lineSize) {
      let n = lineSize -cleanMsg.length;
      if (n > 0) {
        //center
        if (alignment === 1) {
          paddingLeft = _.repeat(' ', Math.floor(n /2));
          paddingRight = _.repeat(' ', Math.ceil(n /2));
        //left
        } else if (alignment === 0 || typeof alignment === 'undefined') {
          paddingRight = _.repeat(' ', n);
        //right
        } else if (alignment === 2) {
          paddingLeft = _.repeat(' ', n);
        } else {
          throw new Error('Invalid alignment value.');
        }
      }
    }
    let line = paddingLeft + msg + paddingRight;
    return printfn(_.border('|', borderColor) + line + _.border('|', borderColor));
  },

  'doPrint': function (level, msg, color) {
    if (level !== null && process.__debugLevel < level) { return false; }

    msg = _.format(msg, color);

    let t = new Date();
    if (msg === undefined) { msg = ''; }

    let h = t.getHours(), m = t.getMinutes(), s = t.getSeconds();
    let ms = String(t.getMilliseconds()); while (ms.length < 3) { ms += '0'; }
    if (h < 10) { h = '0'+ h; } if (m < 10) { m = '0'+ m; }
    if (s < 10) { s = '0'+ s; }
    let time = h +':'+ m +':'+ s +'.'+ ms;

    let Y = t.getFullYear().toString().substr(-2),
      M = t.getMonth() +1, D = t.getDate();
    if (M < 10) { M = '0'+ M; } if (D < 10) { D = '0'+ D; }
    let date = Y +'-'+ M +'-'+ D;
    msg = '['+ date +' '+ time +'] '+ msg;
    return console.log(msg);
  },
  'colorOptsToAnsi': function (colorsStr) {
    let returnStr = '';
    let colors = colorsStr.split('+');
    let i = 0, n = colors.length, color, curColor;
    for (; i < n; i++) {
      color = colors[i];
      curColor = _.ANSI_CODES[color];
      if (!curColor) { continue; }
      returnStr += '\x1B['+ curColor +'m';
    }
    return returnStr;
  },
  'format': function (text, colorsStr, backToColor) {
    if (text && text.replace) {
      text = text.replace(
        new RegExp('\\{\\{([^{}]+)\\|([^}|]+)\\}\\}', 'g'),
        (fullStr, partialStr, partialColor) => {
          return _.format(partialStr, partialColor, colorsStr);
        }
      );
    }
    if (!colorsStr) { return text; }
    let openColor = _.colorOptsToAnsi(colorsStr);
    let closeColor = '\x1B['+ _.ANSI_CODES['off'] +'m';
    let returnStr = openColor + text + closeColor;
    if (backToColor) {
      returnStr += _.colorOptsToAnsi(backToColor);
    }
    return returnStr;
  }
};

const utils = {
  'debugBox': function (msgs, alignments, printfn, borderColor) {
    let cleanMsgs = msgs.map((a) => utils.removeFormat(a));
    let baseLen = cleanMsgs.reduce((a, b) => Math.max(a, b.length), 0);
    _.debugBoxBoundary(baseLen, false, printfn, borderColor);
    msgs.forEach((msg, i) => _.debugBoxLine(
      msg, cleanMsgs[i], baseLen, alignments[i], printfn, borderColor
    ));
    _.debugBoxBoundary(baseLen, true, printfn, borderColor);
  },

  'format': _.format,
  'removeFormat': function (str) {
    let tRE = new RegExp('\\033\\[[0-9]+m', 'g'); return str.replace(tRE, '');
  },
  'setDebugLevel': function (newLevel) { process.__debugLevel = newLevel; },
  'print': {
    'error': function (msg, title) {
      let showTitle = (title) ? ' - '+ title : '';
      _.doPrint(0, _.format('<ERROR'+ showTitle +'>', 'red_bg') +' ');
      _.doPrint(0, msg, 'red_bg');
      _.doPrint(0, _.format('</ERROR>', 'red_bg') +' ');
      return false;
    },
    'force': function (msg, color) {
      return _.doPrint(0, msg, color);
    },
    'warn': function (msg, title) {
      let showTitle = (title) ? ' - '+ title : '';
      _.doPrint(0, _.format('<WARN'+ showTitle +'>', 'yellow_bg+black') +' ');
      _.doPrint(0, msg, 'yellow_bg+black');
      _.doPrint(0, _.format('</WARN>', 'yellow_bg+black') +' ');
      return true;
    },
    'notice': function (msg, color) {
      return _.doPrint(2, msg, color);
    },
    'info': function (msg, color) {
      return _.doPrint(3, msg, color);
    },
    'debug': function (msg, color) {
      return _.doPrint(4, msg, color);
    },
    'verbose': function (msg, color) {
      return _.doPrint(5, msg, color);
    }
  },


  'noop': function () {},

  'createClass': function (prototype) {
    let newClass = prototype.__constructor || function () {};
    if (prototype.__extends) {
      if (utils.isString(prototype.__extends)) {
        prototype.__extends = require(prototype.__extends);
      }
      util.inherits(newClass, prototype.__extends);
    }
    for (let i in prototype) {
      newClass.prototype[i] = prototype[i];
    }
    return newClass;
  },
  'getClassName': function (obj) {
    let classString = (obj).constructor.toString();
    let funcNameRegex = new RegExp('^(function|class) ([^ (]+)', 'i');
    let results = (funcNameRegex).exec(classString);
    return (results && results.length > 2) ? results[2] : '';
  },
  'getClassByName': function (className) {
    return this[className];
  },

  'supermerge': function (o1, o2) {
    if (utils.isString(o1, o2) || utils.isNumber(o1, o2) || Array.isArray(o1, o2)) {
      return o2;
    }

    let r = {}, k, v;
    for (k in o1) { r[k] = o1[k]; }
    for (k in o2) {
      v = o2[k];
      if (o1[k] && o1[k].constructor === Object && v.constructor === Object) {
        r[k] = utils.supermerge(o1[k], v); //obj + obj = merge deep
      } else {
        r[k] = v; //other combination = override
      }
    }
    return r;
  },

  'isString': function (...o) {
    return o.every((cur) => typeof cur === 'string' || cur instanceof String);
  },
  'isNumber': function (...o) {
    return o.every((cur) => typeof cur === 'number' || cur instanceof Number);
  },
  'isNumeric': function (...o) {
    return o.every((cur) => !isNaN(cur));
  },
  'inArray': function (needle, haystack) {
    return !!~haystack.indexOf(needle);
  },

  'pad': function (num, minSize, padder) {
    if (typeof num === 'undefined') { num = ''; }
    if (typeof padder === 'undefined') { padder = '0'; }
    let s = num.toString(), n = minSize -s.length;
    while (n-- > 0) { s = padder + s; }
    return s;
  },

  'delay': function (ms) { return new Promise((res) => setTimeout(res, ms)); },
  'md5': function (str) {
    let crypto = require('crypto');
    return crypto.createHash('md5').update(str).digest('hex');
  },
  'repeat': _.repeat
};

module.exports = utils;
