'use strict';
const util = require('util')
;

const _utils = {
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
  'border': function (str) {
    return _utils.format(str, _utils.borderColor);
  },

  'repeat': function (s, n) { return new Array(parseInt(n+1, 10)).join(s); },

  'debugBoxBoundary': function (contentSize, spaceAfter, printfn) {
    if (spaceAfter !== true) { printfn(''); }
    let line = '+'+ _utils.repeat('-', contentSize) +'+';
    printfn(_utils.border(line));
    if (spaceAfter === true) { printfn(''); }
  },
  'debugBoxLine': function (msg, cleanMsg, lineSize, alignment, printfn) {
    let paddingLeft = '', paddingRight = '';
    if (lineSize) { let n = lineSize -cleanMsg.length;
      if (n > 0) {
        if (alignment === 1) { //center
          paddingLeft = _utils.repeat(' ', Math.floor(n /2));
          paddingRight = _utils.repeat(' ', Math.ceil(n /2));
        }
        //left
        else if (alignment === 0) { paddingRight = _utils.repeat(' ', n); }
        //right
        else if (alignment === 2) { paddingLeft = _utils.repeat(' ', n); }
        else { throw new Error('Invalid alignment value.'); }
      }
    }
    let line = paddingLeft + msg + paddingRight;
    return printfn(_utils.border('|') + line + _utils.border('|'));
  },

  'doPrint': function (level, msg, color) {
    if (level !== null && process.__debugLevel < level) { return false; }

    msg = _utils.format(msg, color);

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
    for (; i < n; i++) { color = colors[i];
      curColor = _utils.ANSI_CODES[color];
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
          return _utils.format(partialStr, partialColor, colorsStr);
        }
      );
    }
    if (!colorsStr) { return text; }
    let openColor = _utils.colorOptsToAnsi(colorsStr);
    let closeColor = '\x1B['+ _utils.ANSI_CODES['off'] +'m';
    let returnStr = openColor + text + closeColor;
    if (backToColor) {
      returnStr += _utils.colorOptsToAnsi(backToColor);
    }
    return returnStr;
  }
};

const utils = {
  'debugBox': function (msgs, alignments, printfn) {
    let cleanMsgs = msgs.map(function (a) {
      return utils.removeFormat(a);
    });
    let baseLen = cleanMsgs.reduce(function (a, b) {
      return (typeof(a) == 'number') ?
        Math.max(a, b.length) : Math.max(a.length, b.length);
    });
    _utils.debugBoxBoundary(baseLen, false, printfn);
    msgs.forEach(function (a, b) {
      _utils.debugBoxLine(a, cleanMsgs[b], baseLen, alignments[b], printfn);
    });
    _utils.debugBoxBoundary(baseLen, true, printfn);
  },

  'format': _utils.format,
  'removeFormat': function (str) {
    let tRE = new RegExp('\\033\\[[0-9]+m', 'g'); return str.replace(tRE, '');
  },
  'setDebugLevel': function (newLevel) { process.__debugLevel = newLevel; },
  'print': {
    'error': function (msg, title) {
      let showTitle = (title) ? ' - '+ title : '';
      _utils.doPrint(0, _utils.format('<ERROR'+ showTitle +'>', 'red_bg') +' ');
      _utils.doPrint(0, msg, 'red_bg');
      _utils.doPrint(0, _utils.format('</ERROR>', 'red_bg') +' ');
      return false;
    },
    'force': function (msg, color) {
      return _utils.doPrint(0, msg, color);
    },
    'warn': function (msg, title) {
      let showTitle = (title) ? ' - '+ title : '';
      _utils.doPrint(0, _utils.format('<WARN'+ showTitle +'>', 'yellow_bg+black') +' ');
      _utils.doPrint(0, msg, 'yellow_bg+black');
      _utils.doPrint(0, _utils.format('</WARN>', 'yellow_bg+black') +' ');
      return true;
    },
    'notice': function (msg, color) {
      return _utils.doPrint(2, msg, color);
    },
    'info': function (msg, color) {
      return _utils.doPrint(3, msg, color);
    },
    'debug': function (msg, color) {
      return _utils.doPrint(4, msg, color);
    },
    'verbose': function (msg, color) {
      return _utils.doPrint(5, msg, color);
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
    let funcNameRegex = new RegExp('^(function|class) ([^ \(]+)', 'i');
    let results = (funcNameRegex).exec(classString);
    return (results && results.length > 2) ? results[2] : '';
  },
  'getClassByName': function (className) {
    return this[className];
  },

  'supermerge': function (o1, o2) {
    if (utils.isString(o1, o2) || utils.isNumber(o1, o2) || utils.isArray(o1, o2)) {
      return o2;
    }

    let r = {}, k, v;
    for (k in o1) { r[k] = o1[k]; }
    for (k in o2) { v = o2[k];
      //array + array = merge
      if (o1[k] && o1[k].constructor === Object && v.constructor === Object) {
        r[k] = utils.supermerge(o1[k], v);
      } else { //other combination = override
        r[k] = v;
      }
    }
    return r;
  },

  'isString': function (...o) {
    return o.every((cur) => typeof(cur) === 'string' || cur instanceof String);
  },
  'isNumber': function (...o) {
    return o.every((cur) => typeof(cur) === 'number' || cur instanceof Number);
  },
  'isArray': function (...o) {
    return o.every((cur) => cur.constructor === Array);
  },
  'isNumeric': function (...o) {
    return o.every((cur) => !isNaN(cur));
  },
  'inArray': function (needle, haystack) {
    return !!~haystack.indexOf(needle);
  },

  'delay': function (ms) {
    return new Promise(
      (res) => setTimeout(res, ms)
    );
  },

  'repeat': _utils.repeat
};

module.exports = utils;
